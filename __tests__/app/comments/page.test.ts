import CommentsPage from "@/app/(protected)/comments/page"
import { getConnectedRepositoriesForUser } from "@/lib/dal/repositories"
import { requireCurrentUser } from "@/lib/dal/session"

jest.mock("@/components/comment/CommentsClient", () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock("@/lib/dal/repositories", () => ({
  getConnectedRepositoriesForUser: jest.fn(),
}))

jest.mock("@/lib/dal/session", () => ({
  requireCurrentUser: jest.fn(),
}))

const mockedGetConnectedRepositoriesForUser =
  getConnectedRepositoriesForUser as jest.Mock
const mockedRequireCurrentUser = requireCurrentUser as jest.Mock

describe("CommentsPage", () => {
  afterEach(() => jest.clearAllMocks())

  it("passes the current user's repositories directly to the client view", async () => {
    const repositories = [
      { id: "repo-1", name: "repo", fullName: "owner/repo" },
    ]
    mockedRequireCurrentUser.mockResolvedValue({ id: "user-1" })
    mockedGetConnectedRepositoriesForUser.mockResolvedValue(repositories)

    const page = await CommentsPage()

    expect(mockedGetConnectedRepositoriesForUser).toHaveBeenCalledWith("user-1")
    expect(page.props).toEqual({ repos: repositories, userId: "user-1" })
  })
})
