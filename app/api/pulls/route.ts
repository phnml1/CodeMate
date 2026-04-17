import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import { NextResponse } from "next/server"

const VALID_STATUSES = ["OPEN", "CLOSED", "MERGED", "DRAFT"] as const
type PRStatus = (typeof VALID_STATUSES)[number]
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const repoId = searchParams.get("repoId") ?? undefined
    const statusParam = searchParams.get("status") ?? undefined
    const pageParam = parseInt(searchParams.get("page") ?? "1", 10)
    const limitParam = parseInt(
      searchParams.get("limit") ?? String(DEFAULT_LIMIT),
      10
    )

    if (statusParam && !VALID_STATUSES.includes(statusParam as PRStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }

    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
    const limit =
      isNaN(limitParam) || limitParam < 1
        ? DEFAULT_LIMIT
        : Math.min(limitParam, MAX_LIMIT)
    const accessiblePullRequestWhere = await buildAccessiblePullRequestWhere(
      session.user.id,
      repoId
    )

    const where = {
      ...accessiblePullRequestWhere,
      ...(statusParam && { status: statusParam as PRStatus }),
    }

    const [total, pullRequests] = await Promise.all([
      prisma.pullRequest.count({ where }),
      prisma.pullRequest.findMany({
        where,
        include: {
          repo: {
            select: { id: true, name: true, fullName: true },
          },
        },
        orderBy: [
          { githubCreatedAt: { sort: "desc", nulls: "last" } },
          { number: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      pullRequests: pullRequests.map(({ githubId, ...pr }) => ({
        ...pr,
        githubId: Number(githubId),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
