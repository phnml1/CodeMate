import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationCodeLink from "@/components/collaboration/CollaborationCodeLink"
import type { PRFile } from "@/types/pulls"

const files = [{
  filename: "src/app.ts",
  patch: "@@ -4,2 +4,2 @@\n-oldValue\n+newValue\n unchanged",
}] as PRFile[]

it("links the exact new-side line with its code preview", () => {
  const html = renderToStaticMarkup(React.createElement(CollaborationCodeLink, {
    reference: { filePath: "src/app.ts", side: "RIGHT", startLine: 4, endLine: 4 },
    files,
    onClick: jest.fn(),
  }))
  expect(html).toContain("src/app.ts · 변경 4")
  expect(html).toContain("newValue")
  expect(html).not.toContain("oldValue")
  expect(html).toContain("대화 열기")
})

it("uses the old-side code and keeps a location link without a patch", () => {
  const reference = { filePath: "src/app.ts", side: "LEFT" as const, startLine: 4, endLine: 5 }
  const html = renderToStaticMarkup(React.createElement(CollaborationCodeLink, {
    reference,
    files,
    onClick: jest.fn(),
  }))
  expect(html).toContain("src/app.ts · 이전 4-5")
  expect(html).toContain("oldValue")

  const withoutPatch = renderToStaticMarkup(React.createElement(CollaborationCodeLink, {
    reference,
    files: [],
    onClick: jest.fn(),
  }))
  expect(withoutPatch).toContain("src/app.ts · 이전 4-5")
  expect(withoutPatch).not.toContain("oldValue")
})
