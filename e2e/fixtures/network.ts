import type { Page } from "@playwright/test"
import { E2E_AI_REVIEW } from "./test-data"

const FILES_FIXTURE = {
  files: [
    {
      filename: "app/api/example/route.ts",
      status: "modified",
      additions: 12,
      deletions: 3,
      changes: 15,
      patch: "@@ -1,2 +1,3 @@\n export function GET() {\n+  return Response.json({ ok: true })\n }",
    },
  ],
}

export async function mockPullRequestFiles(page: Page, prId: string) {
  await page.route(`**/api/pulls/${prId}/files`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback()
      return
    }

    await route.fulfill({ status: 200, json: FILES_FIXTURE })
  })
}

export async function mockAIReviewFlow(page: Page, prId: string) {
  let reviewRequested = false
  let analyzeRequestCount = 0

  await page.route(`**/api/pulls/${prId}/review`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      json: reviewRequested ? E2E_AI_REVIEW : null,
    })
  })

  await page.route("**/api/review/analyze", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback()
      return
    }

    const body = route.request().postDataJSON() as { pullRequestId?: string }
    if (body.pullRequestId !== prId) {
      await route.fallback()
      return
    }

    analyzeRequestCount += 1
    reviewRequested = true
    await route.fulfill({ status: 200, json: { status: "PENDING" } })
  })

  return {
    getAnalyzeRequestCount: () => analyzeRequestCount,
  }
}
