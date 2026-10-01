import type { CollaborationPresenceSnapshot } from "@/lib/socket/types"

type PresenceResponse = {
  startedAt: string
  rooms: CollaborationPresenceSnapshot[]
}

export async function getCollaborationPresence(roomIds: string[]): Promise<PresenceResponse> {
  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) throw new Error("Socket unavailable")

  const socketUrl = process.env.SOCKET_SERVER_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000"
  const response = await fetch(new URL("/internal/collaboration/presence", socketUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-socket-secret": secret },
    body: JSON.stringify({ roomIds }),
    signal: AbortSignal.timeout(3_000),
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Socket presence failed: ${response.status}`)

  const data = (await response.json()) as PresenceResponse
  if (!Array.isArray(data.rooms) || data.rooms.length !== roomIds.length ||
      data.rooms.some((room, index) => room.roomId !== roomIds[index] || !Array.isArray(room.users))) {
    throw new Error("Invalid socket presence response")
  }
  return data
}
