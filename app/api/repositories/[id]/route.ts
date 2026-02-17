import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const repository = await prisma.repository.findUnique({
      where: { id },
    })

    if (!repository) {
      return NextResponse.json(
        { error: "Repository를 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    if (repository.userId !== session.user.id) {
      return NextResponse.json(
        { error: "해당 Repository에 대한 권한이 없습니다" },
        { status: 403 }
      )
    }

    await prisma.repository.delete({ where: { id } })

    return NextResponse.json({
      message: "Repository 연동이 해제되었습니다",
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
