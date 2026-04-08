import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/webhook-validator"
import { analyzeReview } from "@/lib/ai/analyze"
import { emitNotification } from "@/lib/socket/emitter"
import { isNotificationEnabled } from "@/lib/notification-settings"
import { NextResponse, after } from "next/server"

// after() 블록이 완료될 때까지 인스턴스를 유지하려면 maxDuration 명시 필요
// 미설정 시 Vercel 기본값(Hobby 10초, Pro 15초)이 적용되어 after()가 중간에 잘림
export const maxDuration = 300

function getPRStatus(pr: {
  state: string
  draft: boolean
  merged: boolean
}): "OPEN" | "CLOSED" | "MERGED" | "DRAFT" {
  if (pr.draft) return "DRAFT"
  if (pr.state === "closed") return pr.merged ? "MERGED" : "CLOSED"
  return "OPEN"
}

export async function POST(request: Request) {
  try {
    const payload = await request.text()
    const signature = request.headers.get("x-hub-signature-256") ?? ""
    const event = request.headers.get("x-github-event") ?? ""

    const isValid = await verifyWebhookSignature(payload, signature)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      )
    }

    if (event !== "pull_request") {
      return NextResponse.json({ message: "Event ignored" })
    }

    const body = JSON.parse(payload)
    const { action, pull_request: pr, repository: repo } = body

    const isStatusChange = action === "closed"
    if (action !== "opened" && action !== "synchronize" && !isStatusChange) {
      return NextResponse.json({ message: "Action ignored" })
    }

    const repository = await prisma.repository.findFirst({
      where: { githubId: BigInt(repo.id) },
      select: { id: true, userId: true },
    })

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      )
    }

    const pullRequest = await prisma.pullRequest.upsert({
      where: { githubId: BigInt(pr.id) },
      update: {
        title: pr.title,
        description: pr.body ?? null,
        status: getPRStatus({ state: pr.state, draft: pr.draft, merged: pr.merged }),
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        githubCreatedAt: pr.created_at ? new Date(pr.created_at) : null,
        githubUpdatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
      },
      create: {
        githubId: BigInt(pr.id),
        number: pr.number,
        title: pr.title,
        description: pr.body ?? null,
        status: getPRStatus({ state: pr.state, draft: pr.draft, merged: pr.merged }),
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        githubCreatedAt: pr.created_at ? new Date(pr.created_at) : null,
        githubUpdatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
        repoId: repository.id,
      },
    })

    // PR_STATUS 알림 - closed/merged 시 소유자에게
    if (isStatusChange) {
      const newStatus = getPRStatus({ state: pr.state, draft: pr.draft, merged: pr.merged })
      const isMerged = newStatus === "MERGED"

      if (await isNotificationEnabled(repository.userId, "PR_MERGED")) {
        const statusNotification = await prisma.notification.create({
          data: {
            type: "PR_MERGED",
            title: isMerged ? "PR이 병합되었습니다" : "PR이 닫혔습니다",
            message: `"${pr.title}" PR이 ${isMerged ? "병합" : "닫"}혔습니다.`,
            userId: repository.userId,
            prId: pullRequest.id,
          },
        })
        emitNotification(repository.userId, {
          ...statusNotification,
          createdAt: statusNotification.createdAt.toISOString(),
        })
      }
      return NextResponse.json({ message: "PR status processed" })
    }

    // after(): 응답 반환 후에도 런타임이 이 블록이 완료될 때까지 인스턴스를 유지함
    // PENDING 레코드 생성은 analyzeReview 내부에서 단독으로 관리
    after(async () => {
      try {
        await analyzeReview(pullRequest.id)

        if (!(await isNotificationEnabled(repository.userId, "NEW_REVIEW"))) return

        const notification = await prisma.notification.create({
          data: {
            type: "NEW_REVIEW",
            title: "AI 코드 리뷰가 완료되었습니다",
            message: `"${pr.title}" PR의 AI 코드 리뷰가 완료되었습니다.`,
            userId: repository.userId,
            prId: pullRequest.id,
          },
        })
        emitNotification(repository.userId, {
          ...notification,
          createdAt: notification.createdAt.toISOString(),
        })
      } catch (err) {
        console.error("[webhook] analyzeReview failed:", err)

        try {
          const failureNotification = await prisma.notification.create({
            data: {
              type: "REVIEW_FAILED",
              title: "AI 코드 리뷰에 실패했습니다",
              message: `"${pr.title}" PR의 AI 코드 리뷰를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
              userId: repository.userId,
              prId: pullRequest.id,
            },
          })
          emitNotification(repository.userId, {
            ...failureNotification,
            createdAt: failureNotification.createdAt.toISOString(),
          })
        } catch (notifyErr) {
          console.error("[webhook] failed to send failure notification:", notifyErr)
        }
      }
    })

    return NextResponse.json({ message: "PR processed" })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
