import { expect, test } from "@playwright/test"
import { mockAIReviewFlow, mockPullRequestFiles } from "./fixtures/network"
import { E2E_AI_REVIEW, E2E_PULL_REQUESTS } from "./fixtures/test-data"

test("AI 리뷰를 요청하면 분석 결과가 표시된다", async ({ page }) => {
  const pullRequest = E2E_PULL_REQUESTS.aiReview
  await mockPullRequestFiles(page, pullRequest.id)
  const reviewMock = await mockAIReviewFlow(page, pullRequest.id)

  await page.goto(`/pulls/${pullRequest.id}`)
  await page.getByRole("button", { name: /AI 코드 리뷰/ }).click()
  await page.getByRole("button", { name: "AI 리뷰 요청" }).click()

  await expect(
    page.getByText(E2E_AI_REVIEW.aiSuggestions.summary, { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText(E2E_AI_REVIEW.aiSuggestions.issues[0].title, { exact: true })
  ).toBeVisible()
  expect(reviewMock.getAnalyzeRequestCount()).toBe(1)
})
