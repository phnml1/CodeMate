import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  createClientApiError,
  handleUnauthorizedAutoLogout,
} from "@/lib/client-auth"

interface ConnectRepositoryInput {
  githubId: number
  name: string
  fullName: string
  language: string | null
  canAdminister: boolean
}

async function connectRepository(input: ConnectRepositoryInput) {
  const res = await fetch("/api/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const error = await createClientApiError(
      res,
      "저장소 연결에 실패했습니다."
    )

    if (error.status === 401) {
      handleUnauthorizedAutoLogout(error.message)
    }

    throw error
  }

  return res.json()
}

export function useConnectRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: connectRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
      queryClient.invalidateQueries({ queryKey: ["githubRepos"] })
      queryClient.invalidateQueries({ queryKey: ["pullRequests"] })
    },
  })
}
