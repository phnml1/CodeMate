import type { CollaborationPresenceSnapshot } from "@/lib/socket/types"
import { getCollaborationPresenceScope } from "@/lib/collaboration/presence-scope"

type PresenceResponse = {
  presenceScope: string
  startedAt: string
  rooms: CollaborationPresenceSnapshot[]
}

export class CollaborationPresenceUnavailableError extends Error {
  constructor() {
    super("Collaboration presence unavailable")
  }
}

export async function getCollaborationPresence(roomIds: string[]): Promise<PresenceResponse> {
  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) throw new CollaborationPresenceUnavailableError()

  const socketUrl = process.env.SOCKET_SERVER_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000"
  try {
    const presenceScope = getCollaborationPresenceScope()
    const response = await fetch(new URL("/internal/collaboration/presence", socketUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-socket-secret": secret, "x-collaboration-scope": presenceScope },
      body: JSON.stringify({ roomIds }),
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    })
    if (!response.ok) throw new CollaborationPresenceUnavailableError()

    const data = (await response.json()) as PresenceResponse
    if (data.presenceScope !== presenceScope || !Array.isArray(data.rooms) || data.rooms.length !== roomIds.length ||
        data.rooms.some((room, index) => room.roomId !== roomIds[index] || !Array.isArray(room.users))) {
      throw new CollaborationPresenceUnavailableError()
    }
    return data
  } catch {
    throw new CollaborationPresenceUnavailableError()
  }
}
