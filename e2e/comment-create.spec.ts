import { expect, test } from "@playwright/test"
import { mockPullRequestFiles } from "./fixtures/network"
import { E2E_PULL_REQUESTS } from "./fixtures/test-data"

test("PR 상세에서 리뷰를 작성하면 화면에 반영된다", async ({ page }, testInfo) => {
  const pullRequest = E2E_PULL_REQUESTS.comment
  const comment = `E2E 리뷰 ${testInfo.workerIndex}-${Date.now()}`
  await mockPullRequestFiles(page, pullRequest.id)

  await page.goto(`/pulls/${pullRequest.id}`)
  await expect(
    page.getByRole("heading", { level: 1, name: pullRequest.title })
  ).toBeVisible()

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/pulls/${pullRequest.id}/comments`) &&
      response.request().method() === "POST"
  )

  const commentInput = page.getByRole("textbox", { name: "일반 리뷰 입력" })
  await commentInput.fill(comment)
  await commentInput.press("Enter")

  const response = await responsePromise
  expect(response.status()).toBe(201)
  await expect(page.getByText(comment, { exact: true })).toBeVisible()
})
