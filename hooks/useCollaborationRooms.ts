import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CollaborationRoomResponse,
  CollaborationRoomsResponse,
} from "@/types/collaboration"

export const collaborationRoomsQueryKey = (pullRequestId: string) =>
  ["collaborationRooms", pullRequestId] as const

async function fetchCollaborationRooms(pullRequestId: string) {
  const params = new URLSearchParams({
    pullRequestId,
    status: "ACTIVE",
  })
  const response = await fetch(`/api/collaboration/rooms?${params}`)

  if (!response.ok) {
    throw new Error("협업방 목록을 불러오지 못했습니다.")
  }

  const data = (await response.json()) as CollaborationRoomsResponse
  return data.rooms
}

async function createCollaborationRoom(pullRequestId: string) {
  const response = await fetch("/api/collaboration/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pullRequestId }),
  })

  if (!response.ok) {
    throw new Error("협업방을 만들지 못했습니다.")
  }

  const data = (await response.json()) as CollaborationRoomResponse
  return data.room
}

export function useCollaborationRooms(pullRequestId: string) {
  return useQuery({
    queryKey: collaborationRoomsQueryKey(pullRequestId),
    queryFn: () => fetchCollaborationRooms(pullRequestId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 5_000,
  })
}

export function useCreateCollaborationRoom(pullRequestId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => createCollaborationRoom(pullRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: collaborationRoomsQueryKey(pullRequestId),
      })
    },
  })
}
