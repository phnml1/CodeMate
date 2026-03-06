import { prisma } from "@/lib/prisma"
import { verifyWebhookSignature } from "@/lib/webhook-validator"
import { analyzeReview } from "@/lib/ai/analyze"
import { NextResponse } from "next/server"

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

    if (action !== "opened" && action !== "synchronize") {
      return NextResponse.json({ message: "Action ignored" })
    }

    const repository = await prisma.repository.findFirst({
      where: { githubId: BigInt(repo.id) },
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
        repoId: repository.id,
      },
    })

    // Create PENDING review record and trigger analysis in background
    await prisma.review.create({
      data: {
        pullRequestId: pullRequest.id,
        status: "PENDING",
        aiSuggestions: {},
        qualityScore: 0,
        severity: "LOW",
        issueCount: 0,
      },
    })

    // Fire-and-forget: respond immediately, analyze in background
    analyzeReview(pullRequest.id).catch((err) =>
      console.error("[webhook] analyzeReview failed:", err)
    )

    return NextResponse.json({ message: "PR processed" })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
