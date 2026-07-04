import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createClientApiError,
  handleUnauthorizedAutoLogout,
} from "@/lib/client-auth"

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
    const error = await createClientApiError(
      res,
      "저장소 동기화에 실패했습니다."
    )

    if (error.status === 401) {
      handleUnauthorizedAutoLogout(error.message)
    }

    throw error
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
