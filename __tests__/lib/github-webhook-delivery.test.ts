import { Prisma } from "@/lib/generated/prisma/client";
import { claimWebhookDelivery, finishWebhookDelivery } from "@/lib/github-webhook-delivery";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/generated/prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, options: { code: string }) {
        super(message);
        this.code = options.code;
      }
    },
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    gitHubWebhookDelivery: {
      create: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const delivery = prisma.gitHubWebhookDelivery as unknown as {
  create: jest.Mock;
  updateMany: jest.Mock;
  update: jest.Mock;
};
const id = "00000000-0000-4000-8000-000000000001";

describe("GitHub webhook delivery claims", () => {
  beforeEach(() => jest.clearAllMocks());

  it("claims the first delivery", async () => {
    delivery.create.mockResolvedValue({ id });
    expect(await claimWebhookDelivery(id)).toBe(true);
    expect(delivery.updateMany).not.toHaveBeenCalled();
  });

  it("ignores a completed or currently processing duplicate", async () => {
    delivery.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7.3.0" })
    );
    delivery.updateMany.mockResolvedValue({ count: 0 });
    expect(await claimWebhookDelivery(id)).toBe(false);
    expect(delivery.updateMany).toHaveBeenCalledWith({
      where: {
        id,
        OR: [
          { status: "FAILED" },
          { status: "PROCESSING", updatedAt: { lt: expect.any(Date) } },
        ],
      },
      data: { status: "PROCESSING" },
    });
  });

  it("reclaims a failed or stale delivery once", async () => {
    delivery.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7.3.0" })
    );
    delivery.updateMany.mockResolvedValue({ count: 1 });
    expect(await claimWebhookDelivery(id)).toBe(true);
    await finishWebhookDelivery(id, "COMPLETED");
    expect(delivery.update).toHaveBeenCalledWith({ where: { id }, data: { status: "COMPLETED" } });
  });
});
