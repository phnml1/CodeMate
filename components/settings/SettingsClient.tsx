"use client"

import { Settings } from "lucide-react"
import ProfileSection from "@/components/settings/ProfileSection"
import GitHubConnectionSection from "@/components/settings/GitHubConnectionSection"
import AIReviewSection from "@/components/settings/AIReviewSection"
import NotificationSection from "@/components/settings/NotificationSection"
import DangerZoneSection from "@/components/settings/DangerZoneSection"

interface SettingsClientProps {
  user: {
    name: string | null
    email: string | null
    image: string | null
    githubId: number | null
  }
  githubConnected: boolean
  githubScope: string | null
}

export default function SettingsClient({ user, githubConnected, githubScope }: SettingsClientProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-slate-700" />
        <h1 className="text-xl font-bold text-slate-900">설정</h1>
      </div>

      <div className="space-y-4">
        <ProfileSection name={user.name} email={user.email} image={user.image} />
        <GitHubConnectionSection isConnected={githubConnected} githubId={user.githubId} scope={githubScope} />
        <AIReviewSection />
        <NotificationSection />
        <DangerZoneSection />
      </div>
    </div>
  )
}
