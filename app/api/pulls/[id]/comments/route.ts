import { auth } from "@/lib/auth"
import { getEnabledUserIds } from "@/lib/notification-settings"
import {
  notificationCompatSelect,
  toBaseNotification,
} from "@/lib/notifications/compat"
import { prisma } from "@/lib/prisma"
import {
  buildAccessiblePullRequestWhere,
  getRepositoryMemberIds,
} from "@/lib/repository-access"
import { emitCommentNew, emitNotification } from "@/lib/socket/emitter"
import { NextResponse } from "next/server"

async function createNotificationsForUsers(params: {
  userIds: string[]
  type: "MENTION" | "COMMENT_REPLY"
  title: string
  message: string
  prId: string
  commentId: string
}) {
  await Promise.all(
    params.userIds.map(async (userId) => {
      const notification = await prisma.notification.create({
        data: {
          type: params.type,
          title: params.title,
          message: params.message,
          userId,
          prId: params.prId,
          commentId: params.commentId,
        },
        select: notificationCompatSelect,
      })

      emitNotification(userId, toBaseNotification(notification))
    })
  )
}

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
    const pullRequestWhere = await buildAccessiblePullRequestWhere(
      session.user.id
    )

    const pr = await prisma.pullRequest.findFirst({
      where: {
        id,
        ...pullRequestWhere,
      },
      select: { id: true },
    })
    if (!pr) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 })
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
    const pullRequestWhere = await buildAccessiblePullRequestWhere(
      session.user.id
    )

    const pr = await prisma.pullRequest.findFirst({
      where: {
        id,
        ...pullRequestWhere,
      },
      select: {
        id: true,
        title: true,
        repoId: true,
      },
    })
    if (!pr) {
      return NextResponse.json({ error: "Pull request not found" }, { status: 404 })
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
      return NextResponse.json({ error: "Content is required." }, { status: 400 })
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

    emitCommentNew(id, { ...comment, replies: [] })

    if (mentions && mentions.length > 0) {
      const uniqueMentions = [...new Set(mentions)].filter(
        (userId) => userId !== session.user.id
      )

      const enabledMentionRecipients = await getEnabledUserIds(
        uniqueMentions,
        "MENTION"
      )

      if (enabledMentionRecipients.length > 0) {
        const mentionMessage = `${
          session.user.name ?? "A teammate"
        } mentioned you in a comment.`

        await createNotificationsForUsers({
          userIds: enabledMentionRecipients,
          type: "MENTION",
          title: "You were mentioned in a comment",
          message: mentionMessage,
          prId: id,
          commentId: comment.id,
        })
      }
    }

    const connectedUserIds = (await getRepositoryMemberIds(pr.repoId)).filter(
      (userId) => userId !== session.user.id
    )

    const enabledCommentRecipients = await getEnabledUserIds(
      connectedUserIds,
      "COMMENT_REPLY"
    )

    if (enabledCommentRecipients.length > 0) {
      await createNotificationsForUsers({
        userIds: enabledCommentRecipients,
        type: "COMMENT_REPLY",
        title: "A new comment was added",
        message: `${
          session.user.name ?? "A teammate"
        } commented on "${pr.title}".`,
        prId: id,
        commentId: comment.id,
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
