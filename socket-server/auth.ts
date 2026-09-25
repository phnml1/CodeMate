import { createHmac, timingSafeEqual } from "crypto"
import type { TypedServerSocket, SocketData } from "../lib/socket/types"

function safeEqualHex(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "hex")
  const expectedBuffer = Buffer.from(expected, "hex")

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}

export function authenticateSocket(
  socket: TypedServerSocket
): Pick<SocketData, "userId" | "userName"> | null {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) {
    console.error("[Socket Auth] No token provided")
    return null
  }

  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) {
    console.error("[Socket Auth] SOCKET_INTERNAL_SECRET is not set")
    return null
  }

  const [payload, signature] = token.split(".")
  if (!payload || !signature) {
    console.error("[Socket Auth] Malformed token")
    return null
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex")
  if (!safeEqualHex(signature, expected)) {
    console.error("[Socket Auth] Invalid signature")
    return null
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString())

    if (data.exp < Math.floor(Date.now() / 1000)) {
      console.error("[Socket Auth] Token expired")
      return null
    }

    return { userId: data.userId, userName: data.userName }
  } catch {
    console.error("[Socket Auth] Failed to parse token payload")
    return null
  }
}
