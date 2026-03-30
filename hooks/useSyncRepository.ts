import { useMutation } from "@tanstack/react-query"

interface SyncResult {
  updated: number
  total: number
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
  return useMutation({
    mutationFn: syncRepository,
  })
}
