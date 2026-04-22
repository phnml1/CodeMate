import { useMutation, useQueryClient } from "@tanstack/react-query"

interface SyncResult {
  updated: number
  total: number
  detailHydrated?: number
}

async function syncRepository(repositoryId: string): Promise<SyncResult> {
  const res = await fetch(`/api/repositories/${repositoryId}/sync`, {
    method: "POST",
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "동기화에 실패했습니다.")
  }
  return res.json()
}

export function useSyncRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] })
    },
  })
}
