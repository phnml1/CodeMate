export async function publishGitHubReview(commentId: string) {
  const response = await fetch(`/api/comments/${commentId}/github`, { method: "POST" })
  const body = await response.json().catch(() => ({})) as { error?: string; status?: string; url?: string | null }
  if (!response.ok) throw new Error(body.error ?? "GitHub 리뷰 전송에 실패했습니다.")
  return body
}
