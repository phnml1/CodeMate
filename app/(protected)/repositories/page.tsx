"use client"

import { useState } from "react"
import RepositoriesPageHeader from "@/components/github/RepositoriesPageHeader"
import RepoSearchBar from "@/components/github/RepoSearchBar"
import RepoList from "@/components/github/RepoList"

const DUMMY_REPOS = [
  { id: 1, name: "awesome-app", fullName: "codemate/awesome-app", language: "TypeScript", isConnected: true, repositoryId: "repo-db-1" },
  { id: 2, name: "backend-api", fullName: "codemate/backend-api", language: "Go", isConnected: true, repositoryId: "repo-db-2" },
  { id: 3, name: "data-pipeline", fullName: "codemate/data-pipeline", language: "Python", isConnected: false },
  { id: 4, name: "mobile-client", fullName: "codemate/mobile-client", language: "JavaScript", isConnected: false },
  { id: 5, name: "infra-tools", fullName: "codemate/infra-tools", language: "Rust", isConnected: false },
  { id: 6, name: "legacy-service", fullName: "codemate/legacy-service", language: "Java", isConnected: false },
]

export default function Page() {
  const [search, setSearch] = useState("")

  const filtered = DUMMY_REPOS.filter((repo) =>
    repo.name.toLowerCase().includes(search.toLowerCase())
  )

  const connectedCount = DUMMY_REPOS.filter((r) => r.isConnected).length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <RepositoriesPageHeader connectedCount={connectedCount} />
      <RepoSearchBar value={search} onChange={setSearch} />
      <RepoList
        repos={filtered}
        onConnect={(repo) => console.log("connect", repo)}
        onDisconnect={(repo) => console.log("disconnect", repo)}
      />
    </div>
  )
}
