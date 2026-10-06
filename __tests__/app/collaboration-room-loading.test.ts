import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import CollaborationRoomLoading from "@/app/(workspace)/collaboration/rooms/[roomId]/loading"

it("renders a distinguishable workspace shell without implying code or socket readiness", () => {
  const html = renderToStaticMarkup(React.createElement(CollaborationRoomLoading))
  expect(html).toContain('data-collaboration-loading="true"')
  expect(html).toContain('aria-label="PR 코드 준비 중"')
  expect(html).not.toContain("연결됨")
})
