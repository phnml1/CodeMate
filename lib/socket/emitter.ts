import type { CommentWithAuthor, Reactions } from "@/types/comment"
import type { BaseNotification } from "@/types/notification"

function serialize<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data))
}

async function emitToSocket(room: string, event: string, data: unknown): Promise<void> {
  const socketUrl = process.env.SOCKET_SERVER_URL
  if (!socketUrl) {
    console.warn("[Socket Emitter] SOCKET_SERVER_URL not set, skipping emit")
    return
  }

  try {
    await fetch(`${socketUrl}/internal/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-socket-secret": process.env.SOCKET_INTERNAL_SECRET ?? "",
      },
      body: JSON.stringify({ event, room, data }),
    })
  } catch (err) {
    console.error("[Socket Emitter] Failed to emit event:", err)
  }
}

export function emitCommentNew(prId: string, comment: unknown) {
  emitToSocket(`pr:${prId}`, "comment:new", serialize<CommentWithAuthor>(comment))
}

export function emitCommentUpdated(prId: string, comment: unknown) {
  emitToSocket(`pr:${prId}`, "comment:updated", serialize<CommentWithAuthor>(comment))
}

export function emitCommentDeleted(prId: string, commentId: string) {
  emitToSocket(`pr:${prId}`, "comment:deleted", { commentId, prId })
}

export function emitCommentReactionUpdated(
  prId: string,
  commentId: string,
  reactions: Reactions
) {
  emitToSocket(`pr:${prId}`, "comment:reaction-updated", {
    commentId,
    prId,
    reactions: serialize<Reactions>(reactions),
  })
}

export function emitNotification(userId: string, notification: BaseNotification) {
  emitToSocket(`user:${userId}`, "notification:new", notification)
}
