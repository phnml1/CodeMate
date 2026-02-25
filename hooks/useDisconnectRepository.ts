import { useMutation, useQueryClient } from "@tanstack/react-query"

async function disconnectRepository(repositoryId: string) {
  const res = await fetch(`/api/repositories/${repositoryId}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? "저장소 연동 해제에 실패했습니다.")
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
