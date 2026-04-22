import { GET } from "@/app/api/notifications/route";
import { prisma } from "@/lib/prisma";
import * as authModule from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pullRequest: {
      findMany: jest.fn(),
    },
  },
}));

const mockedAuth = authModule.auth as jest.Mock;
const mockedFindMany = prisma.notification.findMany as jest.Mock;
const mockedCount = prisma.notification.count as jest.Mock;
const mockedPRFindMany = prisma.pullRequest.findMany as jest.Mock;

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/notifications");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe("GET /api/notifications", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns 401 for unauthenticated users", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns notifications enriched with PR details", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindMany.mockResolvedValue([
      {
        id: "notif-1",
        type: "NEW_REVIEW",
        reviewStatus: "COMPLETED",
        title: "AI review is ready",
        message: null,
        isRead: false,
        userId: "user-1",
        prId: "pr-1",
        commentId: null,
        createdAt: new Date("2026-01-01"),
      },
    ]);
    mockedCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockedPRFindMany.mockResolvedValue([
      {
        id: "pr-1",
        title: "Fix bug",
        number: 42,
        repo: { fullName: "user/repo" },
      },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].reviewStatus).toBe("COMPLETED");
    expect(body.notifications[0].prTitle).toBe("Fix bug");
    expect(body.notifications[0].prNumber).toBe(42);
    expect(body.notifications[0].repoFullName).toBe("user/repo");
    expect(body.unreadCount).toBe(1);
  });

  it("applies the type filter", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindMany.mockResolvedValue([]);
    mockedCount.mockResolvedValue(0);
    mockedPRFindMany.mockResolvedValue([]);

    await GET(makeRequest({ type: "MENTION" }));

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "MENTION" }),
      })
    );
  });

  it("applies the read filter", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockedFindMany.mockResolvedValue([]);
    mockedCount.mockResolvedValue(0);
    mockedPRFindMany.mockResolvedValue([]);

    await GET(makeRequest({ read: "false" }));

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isRead: false }),
      })
    );
  });
});
