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
import { CollaborationPresenceUnavailableError, getCollaborationPresence } from "@/lib/socket/presence"
import { NextResponse } from "next/server"

const ROOM_JOIN_GRACE_MS = 45_000

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

    const activeRooms = rooms.filter((room) => room.status === "ACTIVE")
    const presence = activeRooms.length > 0
      ? await getCollaborationPresence(activeRooms.map((room) => room.id))
      : null
    const presenceByRoom = new Map(presence?.rooms.map((snapshot) => [snapshot.roomId, snapshot]))
    const now = Date.now()

    return NextResponse.json({
      rooms: rooms.flatMap((room) => {
        const serialized = serializeCollaborationRoom(room)
        if (room.status !== "ACTIVE") return [serialized]

        const users = presenceByRoom.get(room.id)?.users ?? []
        const isRecentlyCreated = now - room.createdAt.getTime() < ROOM_JOIN_GRACE_MS
        const onlineCount = users.filter((user) => user.status === "online").length
        if (status === "ACTIVE" && onlineCount === 0 && !isRecentlyCreated) return []

        const presentIds = new Set(users.map((user) => user.userId))
        return [{
          ...serialized,
          members: serialized.members.filter((member) => presentIds.has(member.userId)),
          memberCount: onlineCount,
          occupiedCount: presentIds.size,
        }]
      }),
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof CollaborationPresenceUnavailableError) {
      return NextResponse.json({ error: "Collaboration presence unavailable" }, { status: 503 })
    }
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
