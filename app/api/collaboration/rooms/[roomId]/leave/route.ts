import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { CollaborationPresenceSnapshot } from "@/lib/socket/types"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { roomId } = await params
  const body = await request.json().catch(() => null)
  const socketId = body?.socketId
  if (typeof socketId !== "string" || !socketId || socketId.length > 128) {
    return NextResponse.json({ error: "Invalid socket" }, { status: 400 })
  }

  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) return NextResponse.json({ error: "Socket unavailable" }, { status: 503 })

  try {
    const socketUrl = process.env.SOCKET_SERVER_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000"
    const response = await fetch(new URL("/internal/collaboration/leave", socketUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-socket-secret": secret },
      body: JSON.stringify({ roomId, userId: session.user.id, socketId }),
      signal: AbortSignal.timeout(3_000),
    })
    if (!response.ok) throw new Error(`Socket leave failed: ${response.status}`)
    const { presence } = (await response.json()) as { presence: CollaborationPresenceSnapshot }
    if (presence.roomId !== roomId || !Array.isArray(presence.users)) {
      throw new Error("Invalid socket leave response")
    }

    if (!presence.users.some((user) => user.userId === session.user.id)) {
      await prisma.collaborationRoomMember.updateMany({
        where: { roomId, userId: session.user.id, leftAt: null },
        data: { leftAt: new Date() },
      })
    }
    return new Response(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Socket unavailable" }, { status: 503 })
  }
}
