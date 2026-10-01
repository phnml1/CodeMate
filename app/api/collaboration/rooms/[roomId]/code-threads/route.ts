import { auth } from "@/lib/auth"
import {
  collaborationMessageInclude,
  findAccessibleCollaborationRoom,
  serializeCollaborationMessage,
} from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const querySchema = z.object({
  filePath: z.string().min(1).max(500),
  baseSha: z.string().regex(/^[a-f0-9]{40}$/i),
  headSha: z.string().regex(/^[a-f0-9]{40}$/i),
  side: z.enum(["LEFT", "RIGHT"]).optional(),
  startLine: z.coerce.number().int().positive().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine((value) => Boolean(value.side) === Boolean(value.startLine), {
  message: "side and startLine must be provided together",
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { roomId } = await params
    const room = await findAccessibleCollaborationRoom(session.user.id, roomId)
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 })
    }

    const { filePath, baseSha, headSha, side, startLine, cursor, limit } = parsed.data
    const revisionWhere = {
      filePath,
      OR: [
        { baseSha, headSha },
        { baseSha: null, headSha: null },
      ],
    }

    if (!side || !startLine) {
      const groups = await prisma.collaborationCodeReference.groupBy({
        by: ["side", "startLine"],
        where: { ...revisionWhere, message: { roomId } },
        _count: { _all: true },
      })
      return NextResponse.json({
        threads: groups.map((group) => ({
          side: group.side,
          startLine: group.startLine,
          count: group._count._all,
        })),
      })
    }

    const messages = await prisma.collaborationMessage.findMany({
      where: {
        roomId,
        codeReference: { is: { ...revisionWhere, side, startLine } },
      },
      include: collaborationMessageInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    return NextResponse.json({
      messages: messages.slice().reverse().map(serializeCollaborationMessage),
      nextCursor: messages.length === limit ? messages.at(-1)?.id ?? null : null,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
