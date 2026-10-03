"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { useConnectedRepositories } from "@/hooks/useConnectedRepositories"
import { syncRepository } from "@/hooks/useSyncRepository"

export default function PRAutoSync() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const selectedRepoId = searchParams.get("repoId") ?? undefined
  const { data, isSuccess } = useConnectedRepositories()
  const syncedKeyRef = useRef<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const repositoryIds = useMemo(() => {
    if (!isSuccess) return []

    const connectedRepositoryIds =
      data?.repositories.map((repository) => repository.id) ?? []

    if (selectedRepoId) {
      return connectedRepositoryIds.includes(selectedRepoId) ? [selectedRepoId] : []
    }

    return connectedRepositoryIds
  }, [data?.repositories, isSuccess, selectedRepoId])

  useEffect(() => {
    if (repositoryIds.length === 0) return

    const syncKey = repositoryIds.join("|")

    if (syncedKeyRef.current === syncKey) return
    syncedKeyRef.current = syncKey

    let isCancelled = false
    setIsSyncing(true)

    async function syncConnectedRepositories() {
      let hasSuccessfulSync = false

      try {
        for (const repositoryId of repositoryIds) {
          try {
            await syncRepository(repositoryId)
            hasSuccessfulSync = true
          } catch (error) {
            console.error("[PRAutoSync] repository sync failed:", error)
          }
        }

        if (isCancelled || !hasSuccessfulSync) return

        await queryClient.invalidateQueries({ queryKey: ["pullRequests"] })
        await queryClient.invalidateQueries({ queryKey: ["pullRequest"] })
      } finally {
        if (!isCancelled) {
          setIsSyncing(false)
        }
      }
    }

    void syncConnectedRepositories()

    return () => {
      isCancelled = true
    }
  }, [queryClient, repositoryIds])

  if (!isSyncing) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 dark:border-blue-950 dark:bg-blue-950/40 dark:text-blue-200"
    >
      <Loader2 size={16} className="animate-spin" aria-hidden />
      최신 PR 목록을 동기화하고 있어요.
    </div>
  )
}
