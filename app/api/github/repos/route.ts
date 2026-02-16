import { auth } from "@/lib/auth"
import { getAuthenticatedOctokit } from "@/lib/github"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const octokit = await getAuthenticatedOctokit()

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    })

    const connectedRepos = await prisma.repository.findMany({
      where: { userId: session.user.id },
      select: { githubId: true },
    })
    const connectedIds = new Set(connectedRepos.map((r) => r.githubId))

    const repos = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      language: repo.language,
      isConnected: connectedIds.has(repo.id),
    }))

    return NextResponse.json({ repos })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
