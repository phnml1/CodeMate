import { createHmac } from "crypto"
import { auth } from "@/lib/auth"
import { findAccessibleCollaborationRoom } from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type RouteContext = { params: Promise<{ roomId: string }> }

function configuredUrls(value: string | undefined, prefix: "stun:" | "turn:") {
  return value?.split(",").map((url) => url.trim()).filter((url) =>
    url.startsWith(prefix) || url.startsWith(prefix === "turn:" ? "turns:" : "stuns:")) ?? []
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (process.env.COLLABORATION_VOICE_ENABLED !== "1") {
    return NextResponse.json({ error: "Voice is disabled" }, { status: 404 })
  }
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { roomId } = await params
    const room = await findAccessibleCollaborationRoom(session.user.id, roomId)
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })
    if (room.status !== "ACTIVE") return NextResponse.json({ error: "Room has ended" }, { status: 409 })
    const member = await prisma.collaborationRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId: session.user.id } },
      select: { leftAt: true },
    })
    if (!member || member.leftAt) return NextResponse.json({ error: "Join room first" }, { status: 403 })

    const stunUrls = configuredUrls(process.env.COLLABORATION_VOICE_STUN_URLS, "stun:")
    const iceServers: RTCIceServer[] = [{ urls: stunUrls.length ? stunUrls : ["stun:stun.l.google.com:19302"] }]
    const turnUrls = configuredUrls(process.env.COLLABORATION_TURN_URLS, "turn:")
    if (turnUrls.length) {
      const secret = process.env.COLLABORATION_TURN_SECRET
      if (!secret) return NextResponse.json({ error: "TURN is not configured" }, { status: 503 })
      const expiresAt = Math.floor(Date.now() / 1000) + 3600
      const username = `${expiresAt}:${session.user.id}`
      iceServers.push({
        urls: turnUrls,
        username,
        credential: createHmac("sha1", secret).update(username).digest("base64"),
      })
    }
    return NextResponse.json({ iceServers }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
