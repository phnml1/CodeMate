import { auth } from "@/lib/auth"
import { getOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { syncRepositoryPullRequests } from "@/lib/pull-request-sync"
import { buildAccessibleRepositoryWhere } from "@/lib/repository-access"
import { NextResponse } from "next/server"

function getSyncErrorResponse(error: unknown) {
  if (
    error instanceof Error &&
    error.message.includes("GitHub") &&
    error.message.includes("다시")
  ) {
    return NextResponse.json(
      { error: "GitHub 연동이 만료되었습니다. GitHub를 다시 연결해 주세요." },
      { status: 401 }
    )
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    if (error.status === 401) {
      return NextResponse.json(
        { error: "GitHub 인증이 만료되었습니다. GitHub를 다시 연결해 주세요." },
        { status: 401 }
      )
    }

    if (error.status === 403) {
      return NextResponse.json(
        {
          error:
            "GitHub 저장소 접근 권한이 없거나 API 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
        },
        { status: 403 }
      )
    }

    if (error.status === 404) {
      return NextResponse.json(
        { error: "GitHub에서 해당 저장소를 찾지 못했습니다." },
        { status: 404 }
      )
    }
  }

  return NextResponse.json(
    { error: "저장소 동기화 중 서버 오류가 발생했습니다." },
    { status: 500 }
  )
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const repositoryWhere = await buildAccessibleRepositoryWhere(session.user.id, id)

    const repository = await prisma.repository.findFirst({
      where: repositoryWhere,
      select: { id: true, fullName: true },
    })

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 })
    }

    const [owner, repo] = repository.fullName.split("/")
    const octokit = await getOctokit(session.user.id)

    const result = await syncRepositoryPullRequests({
      octokit,
      owner,
      repo,
      repositoryId: repository.id,
    })

    return NextResponse.json({
      updated: result.syncedCount,
      total: result.syncedCount,
      detailHydrated: result.detailHydratedCount,
    })
  } catch (error) {
    console.error("[POST /api/repositories/[id]/sync] failed:", error)
    return getSyncErrorResponse(error)
  }
}
