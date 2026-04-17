import type { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

type MembershipTableRow = {
  exists: boolean
}

const REPOSITORY_MEMBERSHIP_MIGRATION_ERROR =
  'Database migration required: "UserRepository" table is missing.'

export interface RepositoryUser {
  id: string
  name: string | null
  image: string | null
  githubToken: string | null
}

let membershipTableReadyPromise: Promise<void> | null = null

async function ensureRepositoryMembershipTable(): Promise<void> {
  if (!membershipTableReadyPromise) {
    membershipTableReadyPromise = prisma
      .$queryRaw<MembershipTableRow[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'UserRepository'
        ) AS "exists"
      `
      .then((rows) => {
        if (!rows[0]?.exists) {
          throw new Error(REPOSITORY_MEMBERSHIP_MIGRATION_ERROR)
        }
      })
      .catch((error) => {
        membershipTableReadyPromise = null
        throw error
      })
  }

  await membershipTableReadyPromise
}

export async function getAccessibleRepositoryIds(
  userId: string,
  repositoryId?: string
): Promise<string[]> {
  await ensureRepositoryMembershipTable()

  const memberships = await prisma.userRepository.findMany({
    where: {
      userId,
      ...(repositoryId ? { repositoryId } : {}),
    },
    select: {
      repositoryId: true,
    },
  })

  return memberships.map((membership) => membership.repositoryId)
}

export async function buildAccessibleRepositoryWhere(
  userId: string,
  repositoryId?: string
): Promise<Prisma.RepositoryWhereInput> {
  const ids = await getAccessibleRepositoryIds(userId, repositoryId)

  return {
    id: {
      in: ids,
    },
  }
}

export async function buildAccessiblePullRequestWhere(
  userId: string,
  repositoryId?: string
): Promise<Prisma.PullRequestWhereInput> {
  const ids = await getAccessibleRepositoryIds(userId, repositoryId)

  return {
    repoId: {
      in: ids,
    },
  }
}

export async function isRepositoryAccessibleToUser(
  userId: string,
  repositoryId: string
): Promise<boolean> {
  await ensureRepositoryMembershipTable()

  const membership = await prisma.userRepository.findUnique({
    where: {
      userId_repositoryId: {
        userId,
        repositoryId,
      },
    },
    select: {
      id: true,
    },
  })

  return Boolean(membership)
}

export async function getRepositoryMemberIds(
  repositoryId: string
): Promise<string[]> {
  await ensureRepositoryMembershipTable()

  const memberships = await prisma.userRepository.findMany({
    where: {
      repositoryId,
    },
    select: {
      userId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return memberships.map((membership) => membership.userId)
}

export async function getRepositoryMemberCount(
  repositoryId: string
): Promise<number> {
  await ensureRepositoryMembershipTable()

  return prisma.userRepository.count({
    where: {
      repositoryId,
    },
  })
}

export async function getRepositoryPrimaryUser(
  repositoryId: string,
  options: { requireGithubToken?: boolean } = {}
): Promise<RepositoryUser | null> {
  await ensureRepositoryMembershipTable()

  const membership = await prisma.userRepository.findFirst({
    where: {
      repositoryId,
      ...(options.requireGithubToken
        ? {
            user: {
              githubToken: {
                not: null,
              },
            },
          }
        : {}),
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          githubToken: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  return membership?.user ?? null
}

export async function connectRepositoryToUser(
  userId: string,
  repositoryId: string
): Promise<"created" | "existing"> {
  await ensureRepositoryMembershipTable()

  const existingMembership = await prisma.userRepository.findUnique({
    where: {
      userId_repositoryId: {
        userId,
        repositoryId,
      },
    },
    select: {
      id: true,
    },
  })

  if (existingMembership) {
    return "existing"
  }

  await prisma.userRepository.create({
    data: {
      userId,
      repositoryId,
    },
  })

  return "created"
}

export async function detachRepositoryFromUser(
  userId: string,
  repositoryId: string
): Promise<void> {
  await ensureRepositoryMembershipTable()

  await prisma.userRepository.delete({
    where: {
      userId_repositoryId: {
        userId,
        repositoryId,
      },
    },
  })
}

export function isRepositoryMembershipMigrationError(
  error: unknown
): boolean {
  return (
    error instanceof Error &&
    error.message === REPOSITORY_MEMBERSHIP_MIGRATION_ERROR
  )
}
