"use client"

import { Settings } from "lucide-react"
import ProfileSection from "@/components/settings/ProfileSection"
import GitHubConnectionSection from "@/components/settings/GitHubConnectionSection"
import AIReviewSection from "@/components/settings/AIReviewSection"
import NotificationSection from "@/components/settings/NotificationSection"
import DangerZoneSection from "@/components/settings/DangerZoneSection"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { layoutStyles } from "@/lib/styles"

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
    <PageContainer>
      <PageHeader
        title="설정"
        description="계정 정보와 GitHub 연동 상태를 관리하세요."
        icon={<Settings className="size-5" aria-hidden />}
      />

      <div className={layoutStyles.listStack}>
        <ProfileSection name={user.name} email={user.email} image={user.image} />
        <GitHubConnectionSection isConnected={githubConnected} githubId={user.githubId} scope={githubScope} />
        <AIReviewSection />
        <NotificationSection />
        <DangerZoneSection />
      </div>
    </PageContainer>
  )
}
