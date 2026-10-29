import { parsePatch } from "@/lib/diff"
import { getOctokit, GitHubReconnectRequiredError } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { isRepositoryAccessibleToUser } from "@/lib/repository-access"

export class GitHubReviewPublicationError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = "GitHubReviewPublicationError"
  }
}

function getStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error &&
    typeof error.status === "number" ? error.status : null
}

function getMessage(error: unknown) {
  if (error instanceof GitHubReviewPublicationError) return error.message
  if (error instanceof GitHubReconnectRequiredError) return "GitHub 계정을 다시 연결해 주세요."
  if (getStatus(error) === 401) return "GitHub 계정을 다시 연결해 주세요."
  if (getStatus(error) === 403) {
    const response = typeof error === "object" && error !== null && "response" in error ? error.response : null
    const data = typeof response === "object" && response !== null && "data" in response ? response.data : null
    const githubMessage = typeof data === "object" && data !== null && "message" in data ? data.message : null
    if (githubMessage === "Resource not accessible by integration") {
      return "GitHub App을 이 저장소에 설치하고 Pull requests 권한을 Read and write로 승인해 주세요."
    }
    return "GitHub가 PR 리뷰를 거부했습니다. PR 상태와 GitHub 계정 권한을 확인해 주세요."
  }
  if (getStatus(error) === 422) return "GitHub가 코드 위치를 받지 못했습니다. 최신 diff에서 줄을 다시 선택해 주세요."
  return "GitHub 리뷰 전송에 실패했습니다. 잠시 후 다시 시도해 주세요."
}

export async function publishCommentToGitHub(commentId: string, userId: string) {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, authorId: userId },
    include: {
      pullRequest: { include: { repo: true } },
      collaborationMessage: { include: { codeReference: true, reviewReference: true } },
    },
  })
  if (!comment) throw new GitHubReviewPublicationError("리뷰를 찾을 수 없습니다.", 404)
  if (!await isRepositoryAccessibleToUser(userId, comment.pullRequest.repoId)) {
    throw new GitHubReviewPublicationError("저장소에 접근할 수 없습니다.", 403)
  }
  if (comment.githubStatus === "PUBLISHED") {
    return { status: comment.githubStatus, url: comment.githubReviewUrl }
  }

  const staleAttempt = new Date(Date.now() - 120_000)
  const claimed = await prisma.comment.updateMany({
    where: {
      id: comment.id,
      authorId: userId,
      OR: [
        { githubStatus: { in: ["NOT_REQUESTED", "FAILED"] } },
        { githubStatus: "PUBLISHING", updatedAt: { lt: staleAttempt } },
      ],
    },
    data: { githubStatus: "PUBLISHING", githubError: null },
  })
  if (claimed.count === 0) {
    throw new GitHubReviewPublicationError("GitHub 리뷰를 전송 중입니다.", 409)
  }

  try {
    const reference = comment.collaborationMessage?.codeReference
    const reviewReference = comment.collaborationMessage?.reviewReference
    let issueLocation: { filePath: string; lineNumber: number | null } | null = null
    if (reviewReference?.issueIndex != null) {
      const review = await prisma.review.findFirst({
        where: { id: reviewReference.reviewId, pullRequestId: comment.pullRequestId },
        select: { aiSuggestions: true },
      })
      const suggestions = review?.aiSuggestions as { issues?: Array<{ filePath?: string; lineNumber?: number | null }> } | null
      const issue = suggestions?.issues?.[reviewReference.issueIndex]
      if (issue?.filePath && issue.lineNumber) issueLocation = { filePath: issue.filePath, lineNumber: issue.lineNumber }
    }
    const filePath = reference?.filePath ?? issueLocation?.filePath ?? comment.filePath
    const side = reference?.side ?? "RIGHT"
    const startLine = reference?.startLine ?? issueLocation?.lineNumber ?? comment.lineNumber
    const endLine = reference?.endLine ?? issueLocation?.lineNumber ?? comment.lineNumber
    if ((filePath || startLine || endLine) && (!filePath || !startLine || !endLine)) {
      throw new GitHubReviewPublicationError("코드 위치가 불완전합니다. 최신 diff에서 줄을 다시 선택해 주세요.", 422)
    }

    const [owner, repo] = comment.pullRequest.repo.fullName.split("/")
    if (!owner || !repo) throw new GitHubReviewPublicationError("저장소 정보가 올바르지 않습니다.", 422)
    const octokit = await getOctokit(userId)
    const pullNumber = comment.pullRequest.number
    const marker = `<!-- codemate-review:${comment.id} -->`

    // A previous request may have reached GitHub before the local status update failed.
    const existing = comment.githubStatus === "NOT_REQUESTED" ? undefined :
      (await octokit.paginate(octokit.rest.pulls.listReviews, {
        owner, repo, pull_number: pullNumber, per_page: 100,
      })).find((review) => review.body?.includes(marker))
    if (existing) {
      const url = existing.html_url ?? null
      const reviewComments = await octokit.rest.pulls.listCommentsForReview({
        owner, repo, pull_number: pullNumber, review_id: existing.id,
      })
      await prisma.comment.update({
        where: { id: comment.id },
        data: { githubStatus: "PUBLISHED", githubReviewId: String(existing.id), githubReviewCommentId: reviewComments.data[0] ? String(reviewComments.data[0].id) : null, githubReviewUrl: url, githubError: null },
      })
      return { status: "PUBLISHED" as const, url }
    }

    let inlineComment: { path: string; line: number; side: "LEFT" | "RIGHT"; start_line?: number; start_side?: "LEFT" | "RIGHT"; body: string } | null = null
    let commitId: string | undefined
    if (filePath && startLine && endLine) {
      const pull = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber })
      if (reference?.headSha && reference.headSha !== pull.data.head.sha) {
        throw new GitHubReviewPublicationError("PR 코드가 변경되었습니다. 최신 diff에서 줄을 다시 선택해 주세요.", 422)
      }
      const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner, repo, pull_number: pullNumber, per_page: 100,
      })
      const file = files.find((item) => item.filename === filePath)
      if (!file?.patch) throw new GitHubReviewPublicationError("현재 PR diff에서 파일을 찾을 수 없습니다.", 422)
      const matchingLines = parsePatch(file.patch).filter((line) => {
        const number = side === "LEFT" ? line.oldNum : line.newNum
        return number != null && number >= startLine && number <= endLine &&
          (side === "LEFT" ? line.type !== "added" : line.type !== "removed")
      })
      if (matchingLines.length !== endLine - startLine + 1) {
        throw new GitHubReviewPublicationError("현재 PR diff에서 선택한 줄을 찾을 수 없습니다.", 422)
      }
      commitId = pull.data.head.sha
      inlineComment = {
        path: filePath,
        line: endLine,
        side,
        ...(startLine !== endLine ? { start_line: startLine, start_side: side } : {}),
        body: comment.content,
      }
    }

    const review = await octokit.rest.pulls.createReview({
      owner, repo, pull_number: pullNumber,
      ...(commitId ? { commit_id: commitId } : {}),
      event: "COMMENT",
      body: inlineComment
        ? `CodeMate에서 등록한 코드 리뷰\n\n${marker}`
        : `${comment.content}\n\n${marker}`,
      ...(inlineComment ? { comments: [inlineComment] } : {}),
    })
    const url = review.data.html_url ?? null
    const reviewComments = await octokit.rest.pulls.listCommentsForReview({
      owner, repo, pull_number: pullNumber, review_id: review.data.id,
    })
    await prisma.comment.update({
      where: { id: comment.id },
      data: { githubStatus: "PUBLISHED", githubReviewId: String(review.data.id), githubReviewCommentId: reviewComments.data[0] ? String(reviewComments.data[0].id) : null, githubReviewUrl: url, githubError: null },
    })
    return { status: "PUBLISHED" as const, url }
  } catch (error) {
    const message = getMessage(error)
    try {
      await prisma.comment.update({
        where: { id: comment.id },
        data: { githubStatus: "FAILED", githubError: message },
      })
    } catch (updateError) {
      console.error("[github review] Failed to store publication error:", updateError)
    }
    throw new GitHubReviewPublicationError(message, getStatus(error) ?? 503)
  }
}
