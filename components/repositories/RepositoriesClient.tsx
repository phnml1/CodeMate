"use client"

import { useState } from "react"
import { useRepositories } from "@/hooks/useRepositories"
import RepositoriesPageHeader from "@/components/github/RepositoriesPageHeader"
import RepoSearchBar from "@/components/github/RepoSearchBar"
import RepoList from "@/components/github/RepoList"
import { PageContainer } from "@/components/layout/PageContainer"

export default function RepositoriesClient() {
  const [search, setSearch] = useState("")
  const repositoriesQuery = useRepositories()
  const { data } = repositoriesQuery

  const connectedCount =
    data?.pages.flatMap((page) => page.repos).filter((repo) => repo.isConnected)
      .length ?? 0

  return (
    <PageContainer>
      <RepositoriesPageHeader connectedCount={connectedCount} />
      <RepoSearchBar value={search} onChange={setSearch} />
      <RepoList search={search} repositoriesQuery={repositoriesQuery} />
    </PageContainer>
  )
}
