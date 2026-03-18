import type { CommentWithAuthor } from "@/types/comment"
import type { NotificationPayload } from "./types"
import { getSocketServer } from "./server"

// Prisma에서 반환된 Date 객체를 JSON 직렬화 (string으로 변환)
function serialize<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data))
}

export function emitCommentNew(prId: string, comment: unknown) {
  getSocketServer()
    ?.to(`pr:${prId}`)
    .emit("comment:new", serialize<CommentWithAuthor>(comment))
}

export function emitCommentUpdated(prId: string, comment: unknown) {
  getSocketServer()
    ?.to(`pr:${prId}`)
    .emit("comment:updated", serialize<CommentWithAuthor>(comment))
}

export function emitCommentDeleted(prId: string, commentId: string) {
  getSocketServer()
    ?.to(`pr:${prId}`)
    .emit("comment:deleted", { commentId, prId })
}

export function emitNotification(
  userId: string,
  notification: NotificationPayload
) {
  getSocketServer()?.to(`user:${userId}`).emit("notification:new", notification)
}
