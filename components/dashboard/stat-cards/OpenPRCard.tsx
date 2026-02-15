import { GitPullRequest } from "lucide-react"
import StatCard from "./StatCard"

export default function OpenPRCard() {
  return (
    <StatCard
      icon={GitPullRequest}
      value="12개"
      label="오픈 PR"
      badge={
        <span className="text-orange-600 text-xs font-semibold">5개 리뷰 대기중</span>
      }
    />
  )
}
