import { createHmac } from "crypto"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const TOKEN_TTL_SEC = 60

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(null, { status: 401 })
  }

  const secret = process.env.SOCKET_INTERNAL_SECRET
  if (!secret) {
    return NextResponse.json(null, { status: 500 })
  }

  const payload = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
    })
  ).toString("base64url")

  const signature = createHmac("sha256", secret).update(payload).digest("hex")

  return NextResponse.json({ token: `${payload}.${signature}` })
}
