import Page from "@/app/(protected)/dashboard/page"
import { requireCurrentUser } from "@/lib/dal/session"
import {
  getCachedDashboardStats,
  getCachedDashboardQualityTrend,
  getCachedDashboardIssueSeverity,
  getCachedDashboardRecentPRs,
} from "@/lib/dashboard"

jest.mock("@/lib/dal/session", () => ({ requireCurrentUser: jest.fn() }))
jest.mock("@/lib/dashboard", () => ({
  getCachedDashboardStats: jest.fn(),
  getCachedDashboardQualityTrend: jest.fn(),
  getCachedDashboardIssueSeverity: jest.fn(),
  getCachedDashboardRecentPRs: jest.fn(),
}))
jest.mock("@/components/dashboard/stat-cards/StatCards", () => jest.fn())
jest.mock("@/components/dashboard/charts/ChartsSection", () => jest.fn())
jest.mock("@/components/dashboard/recent-prs/RecentPRSection", () => jest.fn())

describe("DashboardPage streaming sections", () => {
  afterEach(() => jest.clearAllMocks())

  it("starts each data group inside its own Suspense boundary", async () => {
    ;(requireCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" })
    ;(getCachedDashboardStats as jest.Mock).mockResolvedValue({ openPRs: 1 })
    ;(getCachedDashboardQualityTrend as jest.Mock).mockResolvedValue([])
    ;(getCachedDashboardIssueSeverity as jest.Mock).mockResolvedValue([])
    ;(getCachedDashboardRecentPRs as jest.Mock).mockResolvedValue([])

    const page = await Page()
    const boundaries = page.props.children

    expect(boundaries).toHaveLength(3)
    expect(getCachedDashboardStats).not.toHaveBeenCalled()

    await Promise.all(
      boundaries.map((boundary: {
        props: {
          children: {
            type: (props: { userId: string }) => Promise<unknown>
            props: { userId: string }
          }
        }
      }) =>
        boundary.props.children.type(boundary.props.children.props)
      )
    )

    expect(getCachedDashboardStats).toHaveBeenCalledWith("user-1")
    expect(getCachedDashboardQualityTrend).toHaveBeenCalledWith("user-1")
    expect(getCachedDashboardIssueSeverity).toHaveBeenCalledWith("user-1")
    expect(getCachedDashboardRecentPRs).toHaveBeenCalledWith("user-1")
  })
})
