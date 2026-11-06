import { isProtectedPath } from "@/lib/protected-path"

describe("isProtectedPath", () => {
  it.each(["/", "/auth/login", "/api-docs"])(
    "does not poll notifications on public path %s",
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false)
    }
  )

  it.each(["/dashboard", "/notifications", "/collaboration/rooms/room-1"])(
    "polls notifications on protected path %s",
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(true)
    }
  )
})
