"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  GitPullRequest,
  FolderGit2,
  MessageSquare,
  Bell,
  BarChart2,
  Settings,
  Search,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

interface PR {
  id: string
  title: string
}

interface Repo {
  id: string
  name: string
  fullName: string
}

const NAV_ITEMS = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "저장소", href: "/repositories", icon: FolderGit2 },
  { label: "Pull Requests", href: "/pulls", icon: GitPullRequest },
  { label: "댓글", href: "/comments", icon: MessageSquare },
  { label: "알림", href: "/notifications", icon: Bell },
  { label: "통계", href: "/stats", icon: BarChart2 },
  { label: "설정", href: "/settings", icon: Settings },
]

export default function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [prs, setPrs] = useState<PR[]>([])
  const [repos, setRepos] = useState<Repo[]>([])
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (!open) return

    Promise.all([
      fetch("/api/pulls?limit=50")
        .then((r) => r.json())
        .catch(() => ({ pullRequests: [] })),
      fetch("/api/repositories")
        .then((r) => r.json())
        .catch(() => ({ repositories: [] })),
    ]).then(([pullsData, reposData]) => {
      setPrs(pullsData.pullRequests ?? [])
      setRepos(reposData.repositories ?? [])
    })
  }, [open])

  const q = query.toLowerCase()

  const filteredPrs = query
    ? prs.filter((pr) => pr.title.toLowerCase().includes(q))
    : prs.slice(0, 5)

  const filteredRepos = query
    ? repos.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q)
      )
    : repos.slice(0, 5)

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(q)
  )

  const handleSelect = (href: string) => {
    router.push(href)
    setOpen(false)
    setQuery("")
  }

  return (
    <>
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="검색... (Ctrl+K)"
          readOnly
          onClick={() => setOpen(true)}
          className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none cursor-pointer hover:bg-slate-100 transition-all"
        />
      </div>
      <button
        className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
        onClick={() => setOpen(true)}
      >
        <Search className="w-5 h-5 text-slate-600" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="검색..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>

          {filteredNav.length > 0 && (
            <CommandGroup heading="페이지">
              {filteredNav.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.href}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {filteredRepos.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="연동된 저장소">
                {filteredRepos.map((repo) => (
                  <CommandItem
                    key={repo.id}
                    onSelect={() => handleSelect("/repositories")}
                  >
                    <FolderGit2 className="mr-2 h-4 w-4" />
                    {repo.fullName}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {filteredPrs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pull Requests">
                {filteredPrs.map((pr) => (
                  <CommandItem
                    key={pr.id}
                    onSelect={() => handleSelect(`/pulls/${pr.id}`)}
                  >
                    <GitPullRequest className="mr-2 h-4 w-4" />
                    {pr.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
