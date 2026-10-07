import type { Metadata } from "next"
import { notFound } from "next/navigation"
import CollaborationWorkspaceClient from "@/components/collaboration/CollaborationWorkspaceClient"
import { createCollaborationServerTimer } from "@/lib/collaboration/server-performance"
import { requireCurrentUser } from "@/lib/dal/session"
import {
  findAccessibleCollaborationRoom,
  serializeCollaborationRoom,
} from "@/lib/collaboration/rooms"

export const metadata: Metadata = { title: "협업방" }

export default async function CollaborationRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const timer = createCollaborationServerTimer("collaboration.room.rsc")
  const user = await requireCurrentUser()
  timer.checkpoint("auth")
  const { roomId } = await params
  timer.checkpoint("params")
  const room = await findAccessibleCollaborationRoom(user.id, roomId)
  timer.checkpoint("roomLookup")
  if (!room) {
    timer.finish("not_found", roomId)
    notFound()
  }
  timer.finish("ok", roomId)

  return (
    <CollaborationWorkspaceClient
      room={serializeCollaborationRoom(room)}
      currentUserId={user.id}
    />
  )
}
