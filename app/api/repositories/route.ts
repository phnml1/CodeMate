import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { githubId, name, fullName, description, language } = body

    if (!githubId || !name || !fullName) {
      return NextResponse.json(
        { error: "githubId, name, fullName은 필수 항목입니다" },
        { status: 400 }
      )
    }

    const existing = await prisma.repository.findFirst({
      where: { githubId, userId: session.user.id },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 연동된 Repository입니다" },
        { status: 409 }
      )
    }

    const repository = await prisma.repository.create({
      data: {
        githubId,
        name,
        fullName,
        description: description ?? null,
        language: language ?? null,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ repository }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
