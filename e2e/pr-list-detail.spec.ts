import { expect, test } from "@playwright/test"
import { mockPullRequestFiles } from "./fixtures/network"
import { E2E_PULL_REQUESTS, E2E_REPOSITORY } from "./fixtures/test-data"

test("PR 목록에서 선택한 PR 상세로 진입한다", async ({ page }) => {
  const pullRequest = E2E_PULL_REQUESTS.navigation
  await mockPullRequestFiles(page, pullRequest.id)

  await page.goto("/pulls")
  await page.getByRole("link", { name: pullRequest.title, exact: true }).click()

  await expect(page).toHaveURL(`/pulls/${pullRequest.id}`)
  await expect(
    page.getByRole("heading", { level: 1, name: pullRequest.title })
  ).toBeVisible()
  await expect(page.getByText(E2E_REPOSITORY.name, { exact: true })).toBeVisible()
  await expect(page.getByText(`#${pullRequest.number}`, { exact: true })).toBeVisible()
  await expect(page.getByText("main", { exact: true })).toBeVisible()
})
