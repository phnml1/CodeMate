import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import type {
  CollaborationCodeAnchor,
  CollaborationCodeThreadSummaryResponse,
  CollaborationMessagesResponse,
} from "@/types/collaboration"

export const collaborationCodeThreadsQueryKey = (roomId: string) =>
  ["collaborationCodeThreads", roomId] as const

export const collaborationCodeThreadQueryKey = (roomId: string, anchor: CollaborationCodeAnchor) =>
  [...collaborationCodeThreadsQueryKey(roomId), anchor.filePath, anchor.baseSha, anchor.headSha, anchor.side, anchor.startLine] as const

function getParams(anchor: Pick<CollaborationCodeAnchor, "filePath" | "baseSha" | "headSha">) {
  return new URLSearchParams({
    filePath: anchor.filePath,
    baseSha: anchor.baseSha,
    headSha: anchor.headSha,
  })
}

export function useCollaborationCodeThreads(
  roomId: string,
  anchor: Pick<CollaborationCodeAnchor, "filePath" | "baseSha" | "headSha"> | null
) {
  return useQuery({
    queryKey: [...collaborationCodeThreadsQueryKey(roomId), anchor?.filePath, anchor?.baseSha, anchor?.headSha],
    queryFn: async (): Promise<CollaborationCodeThreadSummaryResponse> => {
      const response = await fetch(`/api/collaboration/rooms/${roomId}/code-threads?${getParams(anchor!)}`)
      if (!response.ok) throw new Error("코드 대화를 불러오지 못했습니다.")
      return response.json()
    },
    enabled: Boolean(anchor),
    refetchInterval: anchor ? 20_000 : false,
  })
}

export function useCollaborationCodeThread(roomId: string, anchor: CollaborationCodeAnchor | null) {
  return useInfiniteQuery({
    queryKey: anchor ? collaborationCodeThreadQueryKey(roomId, anchor) : [...collaborationCodeThreadsQueryKey(roomId), null],
    queryFn: async ({ pageParam }): Promise<CollaborationMessagesResponse> => {
      const params = getParams(anchor!)
      params.set("side", anchor!.side)
      params.set("startLine", String(anchor!.startLine))
      params.set("limit", "50")
      if (pageParam) params.set("cursor", pageParam)
      const response = await fetch(`/api/collaboration/rooms/${roomId}/code-threads?${params}`)
      if (!response.ok) throw new Error("코드 대화를 불러오지 못했습니다.")
      return response.json()
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(anchor),
    refetchInterval: anchor ? 20_000 : false,
  })
}
