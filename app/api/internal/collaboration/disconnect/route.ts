import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getCollaborationPresenceScope } from "@/lib/collaboration/presence-scope"

export async function POST(request: Request) {
  const secret = process.env.SOCKET_INTERNAL_SECRET
  const supplied = request.headers.get("x-socket-secret")
  const expected = Buffer.from(secret ?? "")
  const actual = Buffer.from(supplied ?? "")
  if (!secret || !supplied || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const presenceScope = getCollaborationPresenceScope()
  if (request.headers.get("x-collaboration-scope") !== presenceScope) {
    return NextResponse.json({ error: "Collaboration scope mismatch" }, { status: 409 })
  }
  const body = await request.json().catch(() => null)
  const { roomId, memberId, userId, disconnectedAt } = body ?? {}
  const disconnectedTime = typeof disconnectedAt === "string" ? Date.parse(disconnectedAt) : NaN
  if (![roomId, memberId, userId].every((value) => typeof value === "string" && value.length > 0 && value.length <= 128) || !Number.isFinite(disconnectedTime)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  await prisma.collaborationRoomMember.updateMany({
    where: {
      id: memberId,
      roomId,
      userId,
      leftAt: null,
      updatedAt: { lte: new Date(disconnectedTime) },
      room: { presenceScope },
    },
    data: { leftAt: new Date(disconnectedTime) },
  })
  return new Response(null, { status: 204 })
}
