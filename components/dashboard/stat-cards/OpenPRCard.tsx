import { GitPullRequest } from "lucide-react"
import StatCard from "./StatCard"

interface OpenPRCardProps {
  openPRs: number
  pendingReviewPRs: number
}

export default function OpenPRCard({ openPRs, pendingReviewPRs }: OpenPRCardProps) {
  return (
    <StatCard
      icon={GitPullRequest}
      value={`${openPRs}개`}
      label="오픈 PR"
      badge={
        <span className="text-orange-600 text-xs font-semibold">
          {pendingReviewPRs}개 리뷰 대기중
        </span>
      }
    />
  )
}
