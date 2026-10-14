import { getCollaborationPresenceScope } from "@/lib/collaboration/presence-scope"

export class CollaborationMessageRateLimitUnavailableError extends Error {
  constructor() {
    super("Collaboration message rate limit unavailable")
  }
}

export async function checkCollaborationMessageRateLimit(roomId: string, userId: string, clientMessageId?: string) {
  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) throw new CollaborationMessageRateLimitUnavailableError()

  const socketUrl = process.env.SOCKET_SERVER_URL ?? process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000"
  try {
    const response = await fetch(new URL("/internal/collaboration/message-rate-limit", socketUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-socket-secret": secret,
        "x-collaboration-scope": getCollaborationPresenceScope(),
      },
      body: JSON.stringify({ roomId, userId, clientMessageId }),
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    })
    if (response.status !== 200 && response.status !== 429) throw new Error("Rate limiter unavailable")
    const result: unknown = await response.json()
    if (typeof result !== "object" || result === null ||
        !("allowed" in result) || typeof result.allowed !== "boolean" ||
        !("retryAfterMs" in result) || typeof result.retryAfterMs !== "number" ||
        result.allowed !== (response.status === 200) || !Number.isFinite(result.retryAfterMs) || result.retryAfterMs < 0) {
      throw new Error("Invalid rate limiter response")
    }
    return { allowed: result.allowed, retryAfterMs: result.retryAfterMs }
  } catch {
    throw new CollaborationMessageRateLimitUnavailableError()
  }
}
