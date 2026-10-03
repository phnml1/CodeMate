import type { Metadata } from "next"
import { notFound } from "next/navigation"
import CollaborationWorkspaceClient from "@/components/collaboration/CollaborationWorkspaceClient"
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
  const user = await requireCurrentUser()
  const { roomId } = await params
  const room = await findAccessibleCollaborationRoom(user.id, roomId)
  if (!room) notFound()

  return (
    <CollaborationWorkspaceClient
      room={serializeCollaborationRoom(room)}
      currentUserId={user.id}
    />
  )
}
