"use client"

import { usePathname } from "next/navigation"

const sectionTitles: Record<string, string> = {
  dashboard: "대시보드",
  repositories: "저장소",
  pulls: "Pull Requests",
  comments: "리뷰",
  notifications: "알림",
  stats: "통계",
  settings: "설정",
}

export function getHeaderPageTitle(pathname: string) {
  if (pathname.startsWith("/pulls/")) return "PR 상세"
  if (pathname.startsWith("/measurements/comments/latency")) return "리뷰 지연 측정"
  if (pathname.startsWith("/measurements/comments")) return "리뷰 캐시 측정"
  const section = pathname.split("/")[1]
  return sectionTitles[section] ?? "CodeMate"
}

export default function HeaderPageTitle() {
  const pathname = usePathname()
  return <span className="block truncate font-bold text-slate-900">{getHeaderPageTitle(pathname)}</span>
}
