import { expect, test } from "@playwright/test"
import { mockPullRequestFiles } from "./fixtures/network"
import { E2E_PULL_REQUESTS } from "./fixtures/test-data"

test("global search and page filters expose accessible names", async ({ page }) => {
  await page.goto("/pulls")

  const globalSearchButton = page.getByRole("button", {
    name: "전체 검색 열기",
  })
  await expect(globalSearchButton).toBeVisible()

  await globalSearchButton.click()
  await expect(page.getByRole("dialog", { name: "전체 검색" })).toBeVisible()
  await expect(page.getByLabel("전체 검색어")).toBeFocused()

  await page.keyboard.press("Escape")
  await expect(
    page.getByRole("textbox", { name: "Pull Request 검색" })
  ).toBeVisible()

  await page.goto("/repositories")
  await expect(page.getByRole("textbox", { name: "저장소 검색" })).toBeVisible()
})

test("PR detail comments expose keyboard and screen reader targets", async ({
  page,
}) => {
  const pullRequest = E2E_PULL_REQUESTS.comment
  await mockPullRequestFiles(page, pullRequest.id)

  await page.goto(`/pulls/${pullRequest.id}`)
  await expect(
    page.getByRole("heading", { level: 1, name: pullRequest.title })
  ).toBeVisible()

  const commentsToggle = page.getByRole("button", { name: /Comments/ })
  await expect(commentsToggle).toHaveAttribute("aria-expanded", "true")

  const commentInput = page.getByRole("textbox", { name: "일반 댓글 입력" })
  const sendButton = page.getByRole("button", { name: "댓글 전송" })

  await expect(commentInput).toBeVisible()
  await expect(sendButton).toBeDisabled()

  await commentInput.fill("접근성 회귀 테스트 댓글")
  await expect(sendButton).toBeEnabled()
})
