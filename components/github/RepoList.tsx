import RepoCard from "@/components/github/RepoCard"

interface Repo {
  id: number
  name: string
  fullName: string
  language: string | null
  isConnected: boolean
  repositoryId?: string
}

interface RepoListProps {
  repos: Repo[]
  onConnect: (repo: Repo) => void
  onDisconnect: (repo: Repo) => void
}

export default function RepoList({ repos, onConnect, onDisconnect }: RepoListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-bold text-slate-900">저장소 목록</h2>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {repos.length} Repositories Found
        </span>
      </div>
      <div className="space-y-4">
        {repos.map((repo) => (
          <RepoCard
            key={repo.id}
            githubId={repo.id}
            name={repo.name}
            fullName={repo.fullName}
            language={repo.language}
            isConnected={repo.isConnected}
            repositoryId={repo.repositoryId}
            onConnect={() => onConnect(repo)}
            onDisconnect={() => onDisconnect(repo)}
          />
        ))}
      </div>
    </div>
  )
}