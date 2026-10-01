import type { CollaborationMessage } from "@/types/collaboration"
import type { InternalSocketEmitPayload } from "@/lib/socket/types"

export async function emitCollaborationMessage(message: CollaborationMessage) {
  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) {
    throw new Error("SOCKET_INTERNAL_SECRET is not set")
  }

  const socketUrl =
    process.env.SOCKET_SERVER_URL ??
    process.env.NEXT_PUBLIC_SOCKET_URL ??
    "http://localhost:4000"
  const payload: InternalSocketEmitPayload = {
    room: `collaboration:${message.roomId}`,
    event: "collaboration:message",
    data: message,
  }
  const response = await fetch(new URL("/internal/emit", socketUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-socket-secret": secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3_000),
  })

  if (!response.ok) {
    throw new Error(`Socket emit failed: ${response.status}`)
  }
}
