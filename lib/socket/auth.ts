import { prisma } from "@/lib/prisma"
import type { TypedServerSocket, SocketData } from "./types"

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=")
    if (key) cookies[key] = decodeURIComponent(rest.join("="))
  }
  return cookies
}

function extractSessionToken(cookies: Record<string, string>): string | null {
  return (
    cookies["__Secure-authjs.session-token"] ??
    cookies["authjs.session-token"] ??
    null
  )
}

export async function authenticateSocket(
  socket: TypedServerSocket
): Promise<Pick<SocketData, "userId" | "userName"> | null> {
  const cookieHeader = socket.handshake.headers.cookie
  if (!cookieHeader) return null

  const cookies = parseCookies(cookieHeader)
  const token = extractSessionToken(cookies)
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: { select: { id: true, name: true } } },
  })

  if (!session || session.expires < new Date()) return null

  return {
    userId: session.user.id,
    userName: session.user.name || "Unknown",
  }
}
