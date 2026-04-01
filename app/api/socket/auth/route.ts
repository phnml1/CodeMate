import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Called by the Socket.io server to verify a client's session
// The socket server forwards the client's Cookie header here
export async function GET(req: Request) {
  const secret = req.headers.get("x-socket-secret")
  if (!secret || secret !== process.env.SOCKET_INTERNAL_SECRET) {
    return NextResponse.json(null, { status: 401 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(null, { status: 401 })
  }

  return NextResponse.json({
    userId: session.user.id,
    userName: session.user.name ?? "Unknown",
  })
}
