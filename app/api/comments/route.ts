import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repoId = searchParams.get("repoId") ?? undefined
    const prId = searchParams.get("prId") ?? undefined
    const authorId = searchParams.get("authorId") ?? undefined
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
    const repositoryWhere = await buildAccessibleRepositoryWhere(
      session.user.id,
      repoId
    )

    const where = {
      parentId: null,
      pullRequest: {
        repo: repositoryWhere,
      },
      ...(prId && { pullRequestId: prId }),
      ...(authorId && { authorId }),
    }

    const [comments, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, image: true } },
          pullRequest: {
            select: {
              id: true,
              title: true,
              number: true,
              repoId: true,
              repo: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ])

    return NextResponse.json({
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
