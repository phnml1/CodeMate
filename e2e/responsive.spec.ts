import { expect, test, type Page } from "@playwright/test"
import { mockAIReviewFlow, mockPullRequestFiles } from "./fixtures/network"
import { E2E_AI_REVIEW, E2E_PULL_REQUESTS, E2E_REPOSITORY } from "./fixtures/test-data"

const RESPONSIVE_VIEWPORTS = [
  {
    name: "mobile",
    size: { width: 390, height: 844 },
    expectsMobileFilePicker: true,
  },
  {
    name: "tablet",
    size: { width: 768, height: 1024 },
    expectsMobileFilePicker: true,
  },
  {
    name: "desktop",
    size: { width: 1440, height: 900 },
    expectsMobileFilePicker: false,
  },
] as const

async function expectNoPageHorizontalOverflow(page: Page) {
  const overflowWidth = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )

  expect(overflowWidth).toBeLessThanOrEqual(2)
}

async function expectResponsiveFileNavigation(
  page: Page,
  expectsMobileFilePicker: boolean
) {
  const mobileFilePicker = page.getByRole("button", { name: "변경 파일 목록 보기" })
  const desktopFileNavigation = page.getByRole("navigation", {
    name: "변경된 파일 목록",
  })

  if (expectsMobileFilePicker) {
    await expect(mobileFilePicker).toBeVisible()
    await expect(mobileFilePicker).toContainText("app/api/example/route.ts")
    await expect(desktopFileNavigation).toBeHidden()
    return
  }

  await expect(desktopFileNavigation).toBeVisible()
  await expect(mobileFilePicker).toBeHidden()
  await expect(
    desktopFileNavigation.getByRole("button", {
      name: /app\/api\/example\/route\.ts 파일로 이동/,
    })
  ).toBeVisible()
}

test.describe("responsive PR workflows", () => {
  test.describe.configure({ mode: "serial" })

  for (const viewport of RESPONSIVE_VIEWPORTS) {
    test(`${viewport.name} viewport supports PR list, detail, comments, and AI review`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(60_000)
      await page.setViewportSize(viewport.size)

      const navigationPR = E2E_PULL_REQUESTS.navigation
      const commentPR = E2E_PULL_REQUESTS.comment
      const aiReviewPR = E2E_PULL_REQUESTS.aiReview

      await mockPullRequestFiles(page, navigationPR.id)
      await mockPullRequestFiles(page, commentPR.id)
      await mockPullRequestFiles(page, aiReviewPR.id)
      const reviewMock = await mockAIReviewFlow(page, aiReviewPR.id)

      await page.goto("/pulls")
      await expectNoPageHorizontalOverflow(page)
      const navigationLink = page.getByRole("link", {
        name: navigationPR.title,
        exact: true,
      })
      await expect(navigationLink).toBeVisible()
      await expect(navigationLink).toHaveAttribute(
        "href",
        `/pulls/${navigationPR.id}`
      )
      await page.goto(`/pulls/${navigationPR.id}`, {
        waitUntil: "domcontentloaded",
      })

      await expect(page).toHaveURL(`/pulls/${navigationPR.id}`)
      await expect(
        page.getByRole("heading", { level: 1, name: navigationPR.title })
      ).toBeVisible()
      await expect(
        page.getByText(E2E_REPOSITORY.name, { exact: true }).first()
      ).toBeVisible()
      await expect(page.getByText(`#${navigationPR.number}`, { exact: true })).toBeVisible()
      await expectResponsiveFileNavigation(
        page,
        viewport.expectsMobileFilePicker
      )
      await expectNoPageHorizontalOverflow(page)

      await page.goto(`/pulls/${commentPR.id}`, { waitUntil: "domcontentloaded" })
      await expect(
        page.getByRole("heading", { level: 1, name: commentPR.title })
      ).toBeVisible()
      await expectResponsiveFileNavigation(
        page,
        viewport.expectsMobileFilePicker
      )

      const comment = `반응형 ${viewport.name} 댓글 ${testInfo.workerIndex}-${Date.now()}`
      const commentResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/pulls/${commentPR.id}/comments`) &&
          response.request().method() === "POST"
      )

      await page.getByLabel("일반 댓글 입력").fill(comment)
      await page.getByRole("button", { name: "댓글 전송" }).click()

      expect((await commentResponse).status()).toBe(201)
      await expect(page.getByText(comment, { exact: true })).toBeVisible()
      await expectNoPageHorizontalOverflow(page)

      await page.goto(`/pulls/${aiReviewPR.id}`, { waitUntil: "domcontentloaded" })
      await expect(
        page.getByRole("heading", { level: 1, name: aiReviewPR.title })
      ).toBeVisible()
      await page.getByRole("button", { name: /AI 코드 리뷰/ }).click()
      await page.getByRole("button", { name: "AI 리뷰 요청" }).click()

      await expect(
        page.getByText(E2E_AI_REVIEW.aiSuggestions.summary, { exact: true })
      ).toBeVisible()
      await expect(
        page.getByText(E2E_AI_REVIEW.aiSuggestions.issues[0].title, {
          exact: true,
        })
      ).toBeVisible()
      expect(reviewMock.getAnalyzeRequestCount()).toBe(1)
      await expectNoPageHorizontalOverflow(page)
    })
  }
})
