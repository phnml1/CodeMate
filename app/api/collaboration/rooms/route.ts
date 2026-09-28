import { auth } from "@/lib/auth"
import {
  COLLABORATION_ROOM_DEFAULT_CAPACITY,
  collaborationRoomInclude,
  createCollaborationRoomSchema,
  findAccessiblePullRequest,
  serializeCollaborationRoom,
} from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { buildAccessiblePullRequestWhere } from "@/lib/repository-access"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pullRequestId = searchParams.get("pullRequestId") ?? undefined
    const status = searchParams.get("status") ?? "ACTIVE"

    if (status !== "ACTIVE" && status !== "ENDED" && status !== "ALL") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const accessiblePullRequestWhere = await buildAccessiblePullRequestWhere(
      session.user.id
    )

    const rooms = await prisma.collaborationRoom.findMany({
      where: {
        ...(status !== "ALL" ? { status } : {}),
        ...(pullRequestId ? { pullRequestId } : {}),
        pullRequest: accessiblePullRequestWhere,
      },
      include: collaborationRoomInclude,
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    return NextResponse.json({
      rooms: rooms.map(serializeCollaborationRoom),
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = createCollaborationRoomSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const pullRequest = await findAccessiblePullRequest(
      session.user.id,
      parsed.data.pullRequestId
    )

    if (!pullRequest) {
      return NextResponse.json(
        { error: "Pull request not found" },
        { status: 404 }
      )
    }

    const room = await prisma.$transaction(async (tx) => {
      const createdRoom = await tx.collaborationRoom.create({
        data: {
          pullRequestId: pullRequest.id,
          ownerId: session.user.id,
          name:
            parsed.data.name ??
            `PR #${pullRequest.number} 협업방`,
          capacity:
            parsed.data.capacity ?? COLLABORATION_ROOM_DEFAULT_CAPACITY,
          members: {
            create: {
              userId: session.user.id,
              role: "OWNER",
            },
          },
        },
        include: collaborationRoomInclude,
      })

      return createdRoom
    })

    return NextResponse.json(
      { room: serializeCollaborationRoom(room) },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
