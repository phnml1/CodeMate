import { expect, test, type Page } from "@playwright/test"
import { E2E_PULL_REQUESTS } from "./fixtures/test-data"

const prId = E2E_PULL_REQUESTS.navigation.id
const fileNames = [
  "src/first.ts",
  "src/middle.ts",
  "src/last.ts",
] as const

function makePatch(fileName: string) {
  return [
    "@@ -0,0 +1,100 @@",
    ...Array.from(
      { length: 100 },
      (_, index) => `+export const ${fileName.split("/")[1].replace(".ts", "")}${index + 1} = ${index + 1}`
    ),
  ].join("\n")
}

async function mockDiffFiles(page: Page) {
  await page.route(`**/api/pulls/${prId}/files`, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        files: fileNames.map((filename) => ({
          filename,
          status: "added",
          additions: 100,
          deletions: 0,
          changes: 100,
          patch: makePatch(filename),
        })),
      },
    })
  })
}

async function getDiffScrollTop(page: Page) {
  return page.locator("#general-comments").evaluate((element) => {
    const scrollRoot = element.closest<HTMLElement>(".overflow-y-auto")
    if (!scrollRoot) throw new Error("PR detail scroll root not found")
    return scrollRoot.scrollTop
  })
}

function fileDiff(page: Page, filename: string) {
  return page.locator(`[id="diff-${filename}"]`)
}

function diffLine(page: Page, filename: string, line: number) {
  return page.locator(`[id="diff-line-${filename}-${line}"]`)
}

test.beforeEach(async ({ page }) => {
  await mockDiffFiles(page)
})

test("먼 파일을 선택해 코드로 이동한다", async ({ page }) => {
  await page.goto(`/pulls/${prId}`)
  await expect(fileDiff(page, fileNames[2])).toBeVisible()
  await expect(diffLine(page, fileNames[0], 1)).toBeVisible()
  await expect(diffLine(page, fileNames[2], 1)).toHaveCount(0)

  await page.getByRole("button", { name: `${fileNames[2]} 파일로 이동` }).click()

  await expect(fileDiff(page, fileNames[2])).toBeInViewport()
  await expect(diffLine(page, fileNames[2], 1)).toBeVisible()
  await expect(diffLine(page, fileNames[0], 1)).toHaveCount(0)
  await expect.poll(() => getDiffScrollTop(page)).toBeGreaterThan(0)
})

test("스크롤로 가까워진 파일은 렌더링하고 헤더는 모두 유지한다", async ({ page }) => {
  await page.goto(`/pulls/${prId}`)
  for (const filename of fileNames) {
    await expect(fileDiff(page, filename)).toBeVisible()
  }
  await expect(diffLine(page, fileNames[2], 1)).toHaveCount(0)

  await fileDiff(page, fileNames[2]).scrollIntoViewIfNeeded()
  await expect(diffLine(page, fileNames[2], 1)).toBeVisible()
})

test("코드 댓글 링크로 들어오면 대상 줄로 이동한다", async ({ page }) => {
  const params = new URLSearchParams({ filePath: fileNames[2], lineNumber: "75" })
  await page.goto(`/pulls/${prId}?${params}`)

  await expect(diffLine(page, fileNames[2], 75)).toBeInViewport()
})

test("같은 PR에서 다른 댓글 링크를 열면 새 줄로 이동한다", async ({ page }) => {
  const first = new URLSearchParams({ filePath: fileNames[0], lineNumber: "20" })
  await page.goto(`/pulls/${prId}?${first}`)
  await expect(diffLine(page, fileNames[0], 20)).toBeInViewport()

  const second = new URLSearchParams({ filePath: fileNames[2], lineNumber: "75" })
  await page.evaluate((url) => window.history.pushState(null, "", url), `/pulls/${prId}?${second}`)
  await expect(diffLine(page, fileNames[2], 75)).toBeInViewport()
})

test("연속 파일 이동에서는 마지막 선택만 적용한다", async ({ page }) => {
  await page.goto(`/pulls/${prId}`)
  await expect(diffLine(page, fileNames[0], 1)).toBeVisible()

  for (const filename of [fileNames[2], fileNames[1], fileNames[0]]) {
    await page.getByRole("button", { name: `${filename} 파일로 이동` }).click()
  }

  await expect(page.getByRole("button", { name: `${fileNames[0]} 파일로 이동` })).toHaveAttribute("aria-current", "true")
  await expect(fileDiff(page, fileNames[0])).toBeInViewport()
  await page.waitForTimeout(200)
  await expect(fileDiff(page, fileNames[0])).toBeInViewport()
})

test("모바일 파일 선택 후 대상 코드가 열린다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`/pulls/${prId}`)
  await expect(diffLine(page, fileNames[0], 1)).toBeVisible()

  await page.getByRole("button", { name: "변경 파일 목록 보기" }).click()
  await page.getByRole("button", { name: `${fileNames[2]} 파일로 이동` }).click()

  await expect(fileDiff(page, fileNames[2])).toBeInViewport()
  await expect(diffLine(page, fileNames[2], 1)).toBeVisible()
})

test("다른 파일을 보고 돌아와도 작성 중인 인라인 댓글이 남는다", async ({ page }) => {
  await page.goto(`/pulls/${prId}`)
  const firstLine = diffLine(page, fileNames[0], 1)
  await firstLine.hover()
  await page.getByRole("button", { name: "1번 줄에 인라인 댓글 추가" }).click()

  const draft = "점진 렌더링 중에도 유지할 댓글 초안"
  await page.getByLabel(`${fileNames[0]} 1번 줄 인라인 댓글 입력`).fill(draft)
  await page.getByRole("button", { name: `${fileNames[2]} 파일로 이동` }).click()
  await expect(fileDiff(page, fileNames[2])).toBeInViewport()
  await page.getByRole("button", { name: `${fileNames[0]} 파일로 이동` }).click()

  await expect(page.getByLabel(`${fileNames[0]} 1번 줄 인라인 댓글 입력`)).toHaveValue(draft)
})

test("PR 목록을 거쳐 돌아온 뒤에도 파일 이동이 동작한다", async ({ page }) => {
  await page.goto(`/pulls/${prId}`)
  await expect(fileDiff(page, fileNames[2])).toBeVisible()

  await page.getByRole("button", { name: `${fileNames[2]} 파일로 이동` }).click()
  await expect(diffLine(page, fileNames[2], 100)).toBeVisible()
  await expect.poll(() => getDiffScrollTop(page)).toBeGreaterThan(0)
  await page.goto("/pulls")
  await page.goBack()

  await expect(fileDiff(page, fileNames[2])).toBeVisible()
  await page.getByRole("button", { name: `${fileNames[2]} 파일로 이동` }).click()
  await expect(fileDiff(page, fileNames[2])).toBeInViewport()
})

test("브라우저 뒤로가기로 PR에 돌아오면 스크롤 위치가 복원된다", async ({ page }) => {
  test.fixme(true, "Existing PR navigation resets the detail scroll root to the top")
  await page.goto(`/pulls/${prId}`)
  await expect(diffLine(page, fileNames[2], 100)).toBeVisible()
  await page.getByRole("button", { name: `${fileNames[2]} 파일로 이동` }).click()
  const previousScrollTop = await getDiffScrollTop(page)
  expect(previousScrollTop).toBeGreaterThan(0)

  await page.goto("/pulls")
  await page.goBack()
  await expect.poll(() => getDiffScrollTop(page)).toBeGreaterThan(0)
})
