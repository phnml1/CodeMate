import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getCurrentUser, requireCurrentUser } from "@/lib/dal/session"

jest.mock("server-only", () => ({}), { virtual: true })
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }))
jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT")
  }),
}))

const mockedAuth = auth as jest.Mock
const mockedRedirect = redirect as unknown as jest.Mock

describe("server session DAL", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns only the user fields needed by server pages", async () => {
    mockedAuth.mockResolvedValue({
      user: {
        id: "user-1",
        name: "Tester",
        email: "tester@example.com",
        image: null,
        githubToken: "secret",
      },
    })

    await expect(getCurrentUser()).resolves.toEqual({
      id: "user-1",
      name: "Tester",
      email: "tester@example.com",
      image: null,
    })
  })

  it("redirects unauthenticated page requests to the configured login page", async () => {
    mockedAuth.mockResolvedValue(null)

    await expect(requireCurrentUser()).rejects.toThrow("NEXT_REDIRECT")
    expect(mockedRedirect).toHaveBeenCalledWith("/auth/login")
  })
})
