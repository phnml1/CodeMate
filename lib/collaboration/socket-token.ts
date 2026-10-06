import { createHmac, randomUUID, timingSafeEqual } from "crypto"
import { getCollaborationPresenceScope } from "./presence-scope"

export const COLLABORATION_SOCKET_TOKEN_TTL_SECONDS = 60
export const COLLABORATION_HEARTBEAT_INTERVAL_MS = 25_000
export const COLLABORATION_RECONNECT_GRACE_MS = 30_000
export const COLLABORATION_SOCKET_LEASE_MS = COLLABORATION_HEARTBEAT_INTERVAL_MS * 2
export const COLLABORATION_CRASH_CONVERGENCE_MS =
  COLLABORATION_SOCKET_LEASE_MS + COLLABORATION_RECONNECT_GRACE_MS
export const COLLABORATION_PRESENCE_CONVERGENCE_MS =
  COLLABORATION_CRASH_CONVERGENCE_MS + COLLABORATION_HEARTBEAT_INTERVAL_MS

export type CollaborationRoomTokenPayload = {
  presenceScope: string
  typ: "collaboration-room"
  roomId: string
  memberId: string
  userId: string
  userName: string
  capacity: number
  iat: number
  exp: number
  nonce: string
}

export type CreateCollaborationRoomTokenInput = Omit<
  CollaborationRoomTokenPayload,
  "typ" | "iat" | "exp" | "nonce" | "presenceScope"
> & {
  ttlSeconds?: number
}

function getSocketSecret() {
  return process.env.SOCKET_INTERNAL_SECRET
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

function safeEqualHex(actual: string, expected: string) {
  if (!/^[a-f0-9]+$/i.test(actual)) return false

  const actualBuffer = Buffer.from(actual, "hex")
  const expectedBuffer = Buffer.from(expected, "hex")

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

function isCollaborationRoomTokenPayload(
  value: unknown
): value is CollaborationRoomTokenPayload {
  if (typeof value !== "object" || value === null) return false

  const candidate = value as Partial<CollaborationRoomTokenPayload>

  return (
    candidate.typ === "collaboration-room" &&
    typeof candidate.presenceScope === "string" &&
    typeof candidate.roomId === "string" &&
    typeof candidate.memberId === "string" &&
    typeof candidate.userId === "string" &&
    typeof candidate.userName === "string" &&
    typeof candidate.capacity === "number" &&
    Number.isInteger(candidate.capacity) &&
    typeof candidate.iat === "number" &&
    typeof candidate.exp === "number" &&
    typeof candidate.nonce === "string"
  )
}

export function createCollaborationRoomSocketToken(
  input: CreateCollaborationRoomTokenInput,
  secret = getSocketSecret()
) {
  if (!secret) {
    throw new Error("SOCKET_INTERNAL_SECRET is not set")
  }

  const issuedAt = Math.floor(Date.now() / 1000)
  const payload: CollaborationRoomTokenPayload = {
    presenceScope: getCollaborationPresenceScope(),
    typ: "collaboration-room",
    roomId: input.roomId,
    memberId: input.memberId,
    userId: input.userId,
    userName: input.userName,
    capacity: input.capacity,
    iat: issuedAt,
    exp: issuedAt + (input.ttlSeconds ?? COLLABORATION_SOCKET_TOKEN_TTL_SECONDS),
    nonce: randomUUID(),
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = signPayload(encodedPayload, secret)

  return {
    token: `${encodedPayload}.${signature}`,
    payload,
  }
}

export function verifyCollaborationRoomSocketToken(
  token: string,
  secret = getSocketSecret()
) {
  if (!secret) return null

  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) return null

  const expectedSignature = signPayload(encodedPayload, secret)
  if (!safeEqualHex(signature, expectedSignature)) return null

  try {
    const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString())
    if (!isCollaborationRoomTokenPayload(decoded)) return null
    if (decoded.presenceScope !== getCollaborationPresenceScope()) return null

    if (decoded.exp < Math.floor(Date.now() / 1000)) return null

    return decoded
  } catch {
    return null
  }
}
