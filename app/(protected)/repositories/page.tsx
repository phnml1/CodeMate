"use client"

import { useState } from "react"

import { useRepositories } from "@/hooks/useRepositories"
import RepositoriesPageHeader from "@/components/github/RepositoriesPageHeader"
import RepoSearchBar from "@/components/github/RepoSearchBar"
import RepoList from "@/components/github/RepoList"

export default function Page() {
  const [search, setSearch] = useState("")
  const { data } = useRepositories()

  const connectedCount =
    data?.pages.flatMap((p) => p.repos).filter((r) => r.isConnected).length ?? 0

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <RepositoriesPageHeader connectedCount={connectedCount} />
      <RepoSearchBar value={search} onChange={setSearch} />
      <RepoList search={search} />
    </div>
  )
}
