import type { TypedServerSocket, SocketData } from "./types"

export async function authenticateSocket(
  socket: TypedServerSocket
): Promise<Pick<SocketData, "userId" | "userName"> | null> {
  const cookieHeader = socket.handshake.headers.cookie
  if (!cookieHeader) return null

  const nextjsUrl = process.env.NEXTJS_URL
  if (!nextjsUrl) {
    console.error("[Socket Auth] NEXTJS_URL is not set")
    return null
  }

  try {
    const res = await fetch(`${nextjsUrl}/api/socket/auth`, {
      headers: {
        cookie: cookieHeader,
        "x-socket-secret": process.env.SOCKET_INTERNAL_SECRET ?? "",
      },
    })

    if (!res.ok) return null
    return res.json()
  } catch (err) {
    console.error("[Socket Auth] Failed to verify session:", err)
    return null
  }
}
