import { getCollaborationPresenceScope } from "../lib/collaboration/presence-scope"

export async function syncCollaborationDisconnect(input: {
  roomId: string
  memberId: string
  userId: string
  disconnectedAt: number
}) {
  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) throw new Error("Socket internal secret is missing")

  const response = await fetch(new URL("/api/internal/collaboration/disconnect", process.env.NEXTJS_URL ?? "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-socket-secret": secret, "x-collaboration-scope": getCollaborationPresenceScope() },
    body: JSON.stringify({ ...input, disconnectedAt: new Date(input.disconnectedAt).toISOString() }),
    signal: AbortSignal.timeout(3_000),
  })
  if (!response.ok) throw new Error(`Collaboration disconnect sync failed: ${response.status}`)
}
