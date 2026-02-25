import { useMutation, useQueryClient } from "@tanstack/react-query"

interface ConnectRepositoryInput {
  githubId: number
  name: string
  fullName: string
  language: string | null
}

async function connectRepository(input: ConnectRepositoryInput) {
  const res = await fetch("/api/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "저장소 연동에 실패했습니다.")
  }
  return res.json()
}

export function useConnectRepository() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: connectRepository,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] })
    },
  })
}
