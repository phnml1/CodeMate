import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PROCESSING_LEASE_MS = 10 * 60 * 1000;

export async function claimWebhookDelivery(id: string): Promise<boolean> {
  try {
    await prisma.gitHubWebhookDelivery.create({ data: { id } });
    return true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const staleBefore = new Date(Date.now() - PROCESSING_LEASE_MS);
  const claimed = await prisma.gitHubWebhookDelivery.updateMany({
    where: {
      id,
      OR: [
        { status: "FAILED" },
        { status: "PROCESSING", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: "PROCESSING" },
  });
  return claimed.count === 1;
}

export async function finishWebhookDelivery(id: string, status: "COMPLETED" | "FAILED") {
  await prisma.gitHubWebhookDelivery.update({ where: { id }, data: { status } });
}
