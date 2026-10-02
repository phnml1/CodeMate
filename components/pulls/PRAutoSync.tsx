"use client"

import { useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { useConnectedRepositories } from "@/hooks/useConnectedRepositories"
import { syncRepository } from "@/hooks/useSyncRepository"

export default function PRAutoSync() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const selectedRepoId = searchParams.get("repoId") ?? undefined
  const { data, isSuccess } = useConnectedRepositories()
  const syncedKeyRef = useRef<string | null>(null)

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

    async function syncConnectedRepositories() {
      let hasSuccessfulSync = false

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
    }

    void syncConnectedRepositories()

    return () => {
      isCancelled = true
    }
  }, [queryClient, repositoryIds])

  return null
}
