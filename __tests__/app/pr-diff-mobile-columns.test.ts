import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import DiffTable from "@/components/pulls/detail/PRDiffViewer/DiffTable"

it("uses one mobile line-number column, keeps removed numbers, and scrolls long code", () => {
  const html = renderToStaticMarkup(React.createElement(DiffTable, {
    lines: [
      { type: "added", newNum: 2, content: "new line" },
      { type: "removed", oldNum: 3, content: "old line" },
    ],
  }))

  expect(html).toContain('class="w-max min-w-full table-auto')
  expect(html).toContain('<col class="w-0 sm:w-10"/>')
  expect(html).toMatch(/<td class="w-0[^\"]*"><span class="hidden sm:inline">3<\/span><\/td><td[^>]*><span class="sm:hidden">3<\/span><\/td>/)
  expect(html).toContain('>2</td>')
})
