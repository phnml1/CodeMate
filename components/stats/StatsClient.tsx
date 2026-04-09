"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  StatsRange,
  StatsOverview,
  PRTrendItem,
  QualityTrendItem,
  IssueDistribution,
  CodeChangesItem,
} from "@/lib/stats"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import StatsHeader from "./StatsHeader"
import StatsSummaryCards from "./StatsSummaryCards"

const ChartSkeleton = () => <Skeleton className="h-64 w-full rounded-lg" />

const PRTrendChart       = dynamic(() => import("./charts/PRTrendChart"),       { ssr: false, loading: ChartSkeleton })
const PRStatusChart      = dynamic(() => import("./charts/PRStatusChart"),      { ssr: false, loading: ChartSkeleton })
const QualityTrendChart  = dynamic(() => import("./charts/QualityTrendChart"),  { ssr: false, loading: ChartSkeleton })
const IssueSeverityChart = dynamic(() => import("./charts/IssueSeverityChart"), { ssr: false, loading: ChartSkeleton })
const CodeChangesChart   = dynamic(() => import("./charts/CodeChangesChart"),   { ssr: false, loading: ChartSkeleton })
const IssueCategoryChart = dynamic(() => import("./charts/IssueCategoryChart"), { ssr: false, loading: ChartSkeleton })

interface Repo {
  id: string
  name: string
  fullName: string
}

interface StatsClientProps {
  initialOverview: StatsOverview
  repos: Repo[]
}

export default function StatsClient({
  initialOverview,
  repos,
}: StatsClientProps) {
  const [range, setRange] = useState<StatsRange>("30d")
  const [repoId, setRepoId] = useState("")
  const [overview, setOverview] = useState(initialOverview)
  const [prTrend, setPRTrend] = useState<PRTrendItem[]>([])
  const [qualityTrend, setQualityTrend] = useState<QualityTrendItem[]>([])
  const [issueDistribution, setIssueDistribution] =
    useState<IssueDistribution>({ bySeverity: [], byCategory: [] })
  const [codeChanges, setCodeChanges] = useState<CodeChangesItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ range })
    if (repoId) params.set("repoId", repoId)

    try {
      const [overviewRes, prTrendRes, qualityRes, issueRes, codeRes] =
        await Promise.all([
          fetch(`/api/stats?type=overview&${params}`).then((r) => r.json()),
          fetch(`/api/stats?type=pr-trend&${params}`).then((r) => r.json()),
          fetch(`/api/stats?type=quality-trend&${params}`).then((r) =>
            r.json()
          ),
          fetch(`/api/stats?type=issue-distribution&${params}`).then((r) =>
            r.json()
          ),
          fetch(`/api/stats?type=code-changes&${params}`).then((r) =>
            r.json()
          ),
        ])

      setOverview(overviewRes)
      setPRTrend(prTrendRes.data ?? [])
      setQualityTrend(qualityRes.data ?? [])
      setIssueDistribution(issueRes)
      setCodeChanges(codeRes.data ?? [])
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    } finally {
      setLoading(false)
    }
  }, [range, repoId])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  return (
    <div className="max-w-350 mx-auto space-y-4 sm:space-y-6">
      <StatsHeader
        range={range}
        onRangeChange={setRange}
        repoId={repoId}
        onRepoIdChange={setRepoId}
        repos={repos}
      />

      <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <StatsSummaryCards overview={overview} />
      </div>

      {/* PR 활동 추이 + PR 상태 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <PRTrendChart data={prTrend} loading={loading} />
        <PRStatusChart data={prTrend} loading={loading} />
      </div>

      {/* 코드 품질 추이 + 이슈 심각도 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <QualityTrendChart data={qualityTrend} loading={loading} />
        <IssueSeverityChart
          data={issueDistribution.bySeverity}
          loading={loading}
        />
      </div>

      {/* 코드 변경량 추이 */}
      <CodeChangesChart data={codeChanges} loading={loading} />

      {/* 이슈 카테고리 분포 */}
      <IssueCategoryChart
        data={issueDistribution.byCategory}
        loading={loading}
      />
    </div>
  )
}
