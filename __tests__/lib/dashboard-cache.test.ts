import { revalidateTag } from "next/cache"
import { invalidateDashboardForUsers } from "@/lib/dashboard-cache"

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))

const mockedRevalidateTag = revalidateTag as jest.Mock

describe("invalidateDashboardForUsers", () => {
  afterEach(() => jest.clearAllMocks())

  it("expires each user's dashboard once without a global invalidation", () => {
    invalidateDashboardForUsers(["user-1", "user-2", "user-1"])

    expect(mockedRevalidateTag.mock.calls).toEqual([
      ["dashboard-user-1", { expire: 0 }],
      ["dashboard-user-2", { expire: 0 }],
    ])
  })

  it("ignores a missing generation store in unit tests", () => {
    mockedRevalidateTag.mockImplementation(() => {
      throw new Error("static generation store missing")
    })

    expect(() => invalidateDashboardForUsers(["user-1"])).not.toThrow()
  })

  it("does not hide unexpected invalidation errors", () => {
    mockedRevalidateTag.mockImplementation(() => {
      throw new Error("cache unavailable")
    })

    expect(() => invalidateDashboardForUsers(["user-1"])).toThrow(
      "cache unavailable"
    )
  })
})
