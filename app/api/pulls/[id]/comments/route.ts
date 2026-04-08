import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { emitCommentNew, emitNotification } from "@/lib/socket/emitter"
import { isNotificationEnabled, getEnabledUserIds } from "@/lib/notification-settings"

/**
 * @swagger
 * /api/pulls/{id}/comments:
 *   get:
 *     summary: 댓글 목록 조회
 *     description: PR의 루트 댓글 목록을 replies 중첩 포함하여 반환합니다.
 *     tags:
 *       - Comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 댓글 목록 조회 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       404:
 *         description: PR을 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const pr = await prisma.pullRequest.findFirst({
      where: { id, repo: { userId: session.user.id } },
      select: { id: true },
    })
    if (!pr) {
      return NextResponse.json({ error: "PR을 찾을 수 없습니다." }, { status: 404 })
    }

    const comments = await prisma.comment.findMany({
      where: { pullRequestId: id, parentId: null },
      include: {
        author: { select: { id: true, name: true, image: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, image: true } },
            replies: false,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ comments })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/pulls/{id}/comments:
 *   post:
 *     summary: 댓글 작성
 *     description: PR에 댓글을 작성합니다. 멘션 포함 시 Notification을 생성합니다.
 *     tags:
 *       - Comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: 댓글 작성 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       404:
 *         description: PR을 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const pr = await prisma.pullRequest.findFirst({
      where: { id, repo: { userId: session.user.id } },
      select: { id: true, title: true, repo: { select: { userId: true } } },
    })
    if (!pr) {
      return NextResponse.json({ error: "PR을 찾을 수 없습니다." }, { status: 404 })
    }

    const body = await request.json()
    const { content, parentId, lineNumber, filePath, mentions } = body as {
      content: string
      parentId?: string
      lineNumber?: number
      filePath?: string
      mentions?: string[]
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: "댓글 내용을 입력해주세요." }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        pullRequestId: id,
        authorId: session.user.id,
        parentId: parentId ?? null,
        lineNumber: lineNumber ?? null,
        filePath: filePath ?? null,
        mentions: mentions ?? [],
        reactions: {},
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        replies: false,
      },
    })

    // 소켓 실시간 브로드캐스트
    emitCommentNew(id, { ...comment, replies: [] })

    // 멘션 알림 생성
    if (mentions && mentions.length > 0) {
      const uniqueMentions = [...new Set(mentions)].filter((uid) => uid !== session.user.id)
      if (uniqueMentions.length > 0) {
        const mentionMessage = `${session.user.name ?? "누군가"}님이 댓글에서 회원님을 멘션했습니다.`

        // 구독 설정 확인 후 알림 생성 — 배치 조회로 N+1 방지
        const enabledMentions = await getEnabledUserIds(uniqueMentions, "MENTION")

        if (enabledMentions.length > 0) {
          await prisma.notification.createMany({
            data: enabledMentions.map((userId) => ({
              type: "MENTION" as const,
              title: "댓글에서 멘션되었습니다",
              message: mentionMessage,
              userId,
              prId: id,
              commentId: comment.id,
            })),
            skipDuplicates: true,
          })

          for (const userId of enabledMentions) {
            emitNotification(userId, {
              id: comment.id,
              type: "MENTION",
              title: "댓글에서 멘션되었습니다",
              message: mentionMessage,
              isRead: false,
              userId,
              prId: id,
              commentId: comment.id,
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
    }

    // COMMENT 알림 - 댓글 작성자가 PR 소유자가 아닐 때
    const prOwnerId = pr.repo.userId
    if (prOwnerId !== session.user.id && await isNotificationEnabled(prOwnerId, "COMMENT_REPLY")) {
      const commentNotification = await prisma.notification.create({
        data: {
          type: "COMMENT_REPLY",
          title: "새 댓글이 달렸습니다",
          message: `${session.user.name ?? "누군가"}님이 "${pr.title}"에 댓글을 남겼습니다.`,
          userId: prOwnerId,
          prId: id,
          commentId: comment.id,
        },
      })
      emitNotification(prOwnerId, {
        ...commentNotification,
        createdAt: commentNotification.createdAt.toISOString(),
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
