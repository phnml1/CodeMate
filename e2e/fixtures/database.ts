import { prisma } from "../../lib/prisma"
import { assertSafeE2EDatabase } from "./safety"
import {
  E2E_PULL_REQUESTS,
  E2E_REPOSITORY,
  E2E_USER,
} from "./test-data"

export async function cleanE2EData() {
  assertSafeE2EDatabase()

  await prisma.$transaction([
    prisma.repository.deleteMany({ where: { id: E2E_REPOSITORY.id } }),
    prisma.user.deleteMany({ where: { id: E2E_USER.id } }),
  ])
}

export async function seedE2EData(sessionToken: string) {
  assertSafeE2EDatabase()
  await cleanE2EData()

  const timestamp = new Date("2026-01-01T00:00:00.000Z")

  await prisma.user.create({
    data: {
      id: E2E_USER.id,
      email: E2E_USER.email,
      name: E2E_USER.name,
      githubId: BigInt("9000000001"),
      sessions: {
        create: {
          sessionToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
    },
  })

  await prisma.repository.create({
    data: {
      id: E2E_REPOSITORY.id,
      githubId: E2E_REPOSITORY.githubId,
      name: E2E_REPOSITORY.name,
      fullName: E2E_REPOSITORY.fullName,
      description: "Playwright 전용 로컬 테스트 저장소",
      language: "TypeScript",
      userRepositories: {
        create: {
          id: "membership-e2e",
          userId: E2E_USER.id,
        },
      },
      pullRequests: {
        create: Object.values(E2E_PULL_REQUESTS).map((pullRequest) => ({
          ...pullRequest,
          description: "외부 API 없이 검증하는 E2E fixture",
          status: "OPEN",
          baseBranch: "main",
          headBranch: `e2e/${pullRequest.number}`,
          additions: 12,
          deletions: 3,
          changedFiles: 1,
          githubCreatedAt: timestamp,
          githubUpdatedAt: timestamp,
        })),
      },
    },
  })

}

export async function disconnectE2EDatabase() {
  await prisma.$disconnect()
}
