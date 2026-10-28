import { auth } from "@/lib/auth"
import {
  collaborationMessageInclude,
  createCollaborationMessageSchema,
  findAccessibleCollaborationRoom,
  isUniqueConstraintError,
  serializeCollaborationMessage,
} from "@/lib/collaboration/rooms"
import { prisma } from "@/lib/prisma"
import { emitCollaborationMessage } from "@/lib/socket/emitter"
import { checkCollaborationMessageRateLimit, CollaborationMessageRateLimitUnavailableError } from "@/lib/socket/message-rate-limit"
import {
  createCollaborationServerTimer,
  timeCollaborationAuth,
} from "@/lib/collaboration/server-performance"
import { NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ roomId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10))
    )
    const cursor = searchParams.get("cursor") ?? undefined

    const messages = await prisma.collaborationMessage.findMany({
      where: { roomId: room.id },
      include: collaborationMessageInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    return NextResponse.json({
      messages: messages.slice().reverse().map(serializeCollaborationMessage),
      nextCursor:
        messages.length === limit
          ? messages[messages.length - 1]?.id ?? null
          : null,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const timer = createCollaborationServerTimer("collaboration.message.post")
  let roomId: string | undefined
  let messageId: string | undefined
  const respond = (body: Record<string, unknown>, status: number, outcome = String(status)) => {
    const serverTiming = timer.finish(outcome, roomId, messageId)
    const response = NextResponse.json(body, { status })
    if (serverTiming) response.headers.set("Server-Timing", serverTiming)
    return response
  }

  try {
    const session = await timeCollaborationAuth(timer, () => auth())
    timer.checkpoint("auth")
    if (!session?.user?.id) {
      return respond({ error: "Unauthorized" }, 401)
    }

    const resolvedRoomId = (await params).roomId
    roomId = resolvedRoomId
    timer.checkpoint("params")
    const room = await timer.measure("roomLookupTotal", () =>
      findAccessibleCollaborationRoom(
        session.user.id,
        resolvedRoomId,
        () => timer.checkpoint("repoMembership"),
        () => timer.checkpoint("membershipTable")
      )
    )
    timer.checkpoint("roomQuery")

    if (!room) {
      return respond({ error: "Room not found" }, 404)
    }

    if (room.status === "ENDED") {
      return respond({ error: "Room has ended" }, 409)
    }

    const member = await prisma.collaborationRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: session.user.id,
        },
      },
      select: { id: true, leftAt: true },
    })
    timer.checkpoint("memberLookup")

    if (!member || member.leftAt) {
      return respond({ error: "Join room before sending messages" }, 403)
    }

    const json = await request.json().catch(() => null)
    const parsed = createCollaborationMessageSchema.safeParse(json)
    timer.checkpoint("validate")
    if (!parsed.success) {
      return respond({ error: "Invalid request body", issues: parsed.error.flatten() }, 400)
    }

    if (parsed.data.reviewReference) {
      const review = await prisma.review.findFirst({
        where: {
          id: parsed.data.reviewReference.reviewId,
          pullRequestId: room.pullRequestId,
        },
        select: { aiSuggestions: true },
      })
      if (!review) {
        return respond({ error: "Review not found" }, 404)
      }

      const issueIndex = parsed.data.reviewReference.issueIndex
      if (issueIndex != null) {
        const suggestions = review.aiSuggestions as { issues?: unknown[] } | null
        if (!Array.isArray(suggestions?.issues) || !suggestions.issues[issueIndex]) {
          return respond({ error: "Review issue not found" }, 404)
        }
      }
    }

    let rateLimit
    try {
      rateLimit = await checkCollaborationMessageRateLimit(room.id, session.user.id, parsed.data.clientMessageId)
    } catch (error) {
      if (error instanceof CollaborationMessageRateLimitUnavailableError) {
        return respond({ error: "Message service temporarily unavailable" }, 503)
      }
      throw error
    }
    timer.checkpoint("rateLimit")
    if (!rateLimit.allowed) {
      const response = respond({ error: "Too many messages" }, 429)
      response.headers.set("Retry-After", String(Math.ceil(rateLimit.retryAfterMs / 1000)))
      return response
    }

    try {
      const message = await prisma.collaborationMessage.create({
        data: {
          roomId: room.id,
          authorId: session.user.id,
          content: parsed.data.content,
          clientMessageId: parsed.data.clientMessageId,
          ...(parsed.data.codeReference
            ? {
                codeReference: {
                  create: parsed.data.codeReference,
                },
              }
            : {}),
          ...(parsed.data.reviewReference
            ? {
                reviewReference: {
                  create: {
                    reviewId: parsed.data.reviewReference.reviewId,
                    issueIndex: parsed.data.reviewReference.issueIndex ?? null,
                  },
                },
              }
            : {}),
          ...(parsed.data.codeReference || parsed.data.reviewReference
            ? {
                reviewComment: {
                  create: {
                    pullRequestId: room.pullRequestId,
                    authorId: session.user.id,
                    content: parsed.data.content,
                    mentions: [],
                    reactions: {},
                  },
                },
              }
            : {}),
        },
        include: collaborationMessageInclude,
      })
      timer.checkpoint("dbCreate")

      const serializedMessage = serializeCollaborationMessage(message)
      messageId = serializedMessage.id
      timer.checkpoint("serialize")
      let broadcastFailed = false
      try {
        await emitCollaborationMessage(serializedMessage)
      } catch (error) {
        broadcastFailed = true
        console.error("[collaboration messages] Socket broadcast failed:", error)
      }
      timer.checkpoint("socketEmit")

      return respond(
        { message: serializedMessage },
        201,
        broadcastFailed ? "201:socket_emit_failed" : "201"
      )
    } catch (error) {
      timer.checkpoint("messagePathError")
      if (parsed.data.clientMessageId && isUniqueConstraintError(error)) {
        const existingMessage = await prisma.collaborationMessage.findUnique({
          where: {
            roomId_authorId_clientMessageId: {
              roomId: room.id,
              authorId: session.user.id,
              clientMessageId: parsed.data.clientMessageId,
            },
          },
          include: collaborationMessageInclude,
        })
        timer.checkpoint("dedupeLookup")

        if (existingMessage) {
          return respond({
            message: serializeCollaborationMessage(existingMessage),
          }, 200)
        }
      }

      throw error
    }
  } catch {
    return respond({ error: "Internal server error" }, 500)
  }
}
