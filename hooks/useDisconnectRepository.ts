import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createClientApiError,
  handleUnauthorizedAutoLogout,
} from "@/lib/client-auth"

async function disconnectRepository(repositoryId: string) {
  const res = await fetch(`/api/repositories/${repositoryId}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    const error = await createClientApiError(
      res,
      "저장소 연결 해제에 실패했습니다."
    )

    if (error.status === 401) {
      handleUnauthorizedAutoLogout(error.message)
    }

    throw error
  }

  return res.json()
}

export function useDisconnectRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disconnectRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
    },
  })
}
