import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { usePathname } from "next/navigation"
import HeaderPageTitle, { getHeaderPageTitle } from "@/components/layout/HeaderPageTitle"

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }))

it.each([
  ["/dashboard", "대시보드"],
  ["/pulls", "Pull Requests"],
  ["/pulls/pr-1", "PR 상세"],
  ["/repositories", "저장소"],
  ["/comments", "리뷰"],
  ["/notifications", "알림"],
  ["/stats", "통계"],
  ["/settings", "설정"],
  ["/measurements/comments/latency", "리뷰 지연 측정"],
])("uses %s as %s in the shared header", (pathname, title) => {
  ;(usePathname as jest.Mock).mockReturnValue(pathname)
  expect(getHeaderPageTitle(pathname)).toBe(title)
  expect(renderToStaticMarkup(React.createElement(HeaderPageTitle))).toContain(title)
})
