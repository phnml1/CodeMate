"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { PageContainer } from "@/components/layout/PageContainer"
import { layoutStyles } from "@/lib/styles"
import type {
  CodeChangesItem,
  IssueDistribution,
  PRTrendItem,
  QualityTrendItem,
  StatsOverview,
  StatsRange,
} from "@/lib/stats"
import StatsHeader from "./StatsHeader"
import StatsSummaryCards from "./StatsSummaryCards"

const PRTrendChart = dynamic(() => import("./charts/PRTrendChart"), {
  ssr: false,
})
const PRStatusChart = dynamic(() => import("./charts/PRStatusChart"), {
  ssr: false,
})
const QualityTrendChart = dynamic(() => import("./charts/QualityTrendChart"), {
  ssr: false,
})
const IssueSeverityChart = dynamic(() => import("./charts/IssueSeverityChart"), {
  ssr: false,
})
const CodeChangesChart = dynamic(() => import("./charts/CodeChangesChart"), {
  ssr: false,
})
const IssueCategoryChart = dynamic(() => import("./charts/IssueCategoryChart"), {
  ssr: false,
})

interface Repo {
  id: string
  name: string
  fullName: string
}

interface StatsClientProps {
  initialOverview: StatsOverview
  initialOverviewError?: string | null
  repos: Repo[]
}

type StatsSectionKey =
  | "overview"
  | "prTrend"
  | "qualityTrend"
  | "issueDistribution"
  | "codeChanges"

interface StatsSectionState<T> {
  data: T
  loading: boolean
  error: string | null
}

interface StatsSectionsState {
  overview: StatsSectionState<StatsOverview>
  prTrend: StatsSectionState<PRTrendItem[]>
  qualityTrend: StatsSectionState<QualityTrendItem[]>
  issueDistribution: StatsSectionState<IssueDistribution>
  codeChanges: StatsSectionState<CodeChangesItem[]>
}

const ALL_SECTION_KEYS: StatsSectionKey[] = [
  "overview",
  "prTrend",
  "qualityTrend",
  "issueDistribution",
  "codeChanges",
]

const INITIAL_LOAD_KEYS: StatsSectionKey[] = [
  "prTrend",
  "qualityTrend",
  "issueDistribution",
  "codeChanges",
]

const SECTION_ERROR_LABELS: Record<StatsSectionKey, string> = {
  overview: "overview metrics",
  prTrend: "PR trend",
  qualityTrend: "quality trend",
  issueDistribution: "issue distribution",
  codeChanges: "code changes",
}

function setSectionLoadingState(
  previous: StatsSectionsState,
  key: StatsSectionKey
): StatsSectionsState {
  switch (key) {
    case "overview":
      return {
        ...previous,
        overview: {
          ...previous.overview,
          loading: true,
          error: null,
        },
      }
    case "prTrend":
      return {
        ...previous,
        prTrend: {
          ...previous.prTrend,
          loading: true,
          error: null,
        },
      }
    case "qualityTrend":
      return {
        ...previous,
        qualityTrend: {
          ...previous.qualityTrend,
          loading: true,
          error: null,
        },
      }
    case "issueDistribution":
      return {
        ...previous,
        issueDistribution: {
          ...previous.issueDistribution,
          loading: true,
          error: null,
        },
      }
    case "codeChanges":
      return {
        ...previous,
        codeChanges: {
          ...previous.codeChanges,
          loading: true,
          error: null,
        },
      }
  }
}

function setSectionSuccessState(
  previous: StatsSectionsState,
  key: "overview",
  data: StatsOverview
): StatsSectionsState
function setSectionSuccessState(
  previous: StatsSectionsState,
  key: "prTrend",
  data: PRTrendItem[]
): StatsSectionsState
function setSectionSuccessState(
  previous: StatsSectionsState,
  key: "qualityTrend",
  data: QualityTrendItem[]
): StatsSectionsState
function setSectionSuccessState(
  previous: StatsSectionsState,
  key: "issueDistribution",
  data: IssueDistribution
): StatsSectionsState
function setSectionSuccessState(
  previous: StatsSectionsState,
  key: "codeChanges",
  data: CodeChangesItem[]
): StatsSectionsState
function setSectionSuccessState(
  previous: StatsSectionsState,
  key: StatsSectionKey,
  data:
    | StatsOverview
    | PRTrendItem[]
    | QualityTrendItem[]
    | IssueDistribution
    | CodeChangesItem[]
): StatsSectionsState {
  switch (key) {
    case "overview":
      return {
        ...previous,
        overview: {
          data: data as StatsOverview,
          loading: false,
          error: null,
        },
      }
    case "prTrend":
      return {
        ...previous,
        prTrend: {
          data: data as PRTrendItem[],
          loading: false,
          error: null,
        },
      }
    case "qualityTrend":
      return {
        ...previous,
        qualityTrend: {
          data: data as QualityTrendItem[],
          loading: false,
          error: null,
        },
      }
    case "issueDistribution":
      return {
        ...previous,
        issueDistribution: {
          data: data as IssueDistribution,
          loading: false,
          error: null,
        },
      }
    case "codeChanges":
      return {
        ...previous,
        codeChanges: {
          data: data as CodeChangesItem[],
          loading: false,
          error: null,
        },
      }
  }
}

function setSectionErrorState(
  previous: StatsSectionsState,
  key: StatsSectionKey,
  error: string
): StatsSectionsState {
  switch (key) {
    case "overview":
      return {
        ...previous,
        overview: {
          ...previous.overview,
          loading: false,
          error,
        },
      }
    case "prTrend":
      return {
        ...previous,
        prTrend: {
          ...previous.prTrend,
          loading: false,
          error,
        },
      }
    case "qualityTrend":
      return {
        ...previous,
        qualityTrend: {
          ...previous.qualityTrend,
          loading: false,
          error,
        },
      }
    case "issueDistribution":
      return {
        ...previous,
        issueDistribution: {
          ...previous.issueDistribution,
          loading: false,
          error,
        },
      }
    case "codeChanges":
      return {
        ...previous,
        codeChanges: {
          ...previous.codeChanges,
          loading: false,
          error,
        },
      }
  }
}

function createInitialState(
  initialOverview: StatsOverview,
  initialOverviewError: string | null
): StatsSectionsState {
  return {
    overview: {
      data: initialOverview,
      loading: false,
      error: initialOverviewError,
    },
    prTrend: {
      data: [],
      loading: true,
      error: null,
    },
    qualityTrend: {
      data: [],
      loading: true,
      error: null,
    },
    issueDistribution: {
      data: { bySeverity: [], byCategory: [] },
      loading: true,
      error: null,
    },
    codeChanges: {
      data: [],
      loading: true,
      error: null,
    },
  }
}

function getSectionErrorMessage(
  key: StatsSectionKey,
  error: unknown
): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return `Failed to load ${SECTION_ERROR_LABELS[key]}.`
}

async function fetchSectionData<T>(
  queryString: string,
  type: string,
  select: (payload: unknown) => T
): Promise<T> {
  const response = await fetch(`/api/stats?type=${type}&${queryString}`)
  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Failed to load ${type}.`
    throw new Error(message)
  }

  return select(payload)
}

export default function StatsClient({
  initialOverview,
  initialOverviewError = null,
  repos,
}: StatsClientProps) {
  const [range, setRange] = useState<StatsRange>("30d")
  const [repoId, setRepoId] = useState("")
  const [sections, setSections] = useState<StatsSectionsState>(
    createInitialState(initialOverview, initialOverviewError)
  )
  const initialLoadRef = useRef(true)

  const fetchSections = useCallback(
    async (targetKeys: StatsSectionKey[]) => {
      const params = new URLSearchParams({ range })
      if (repoId) params.set("repoId", repoId)
      const queryString = params.toString()

      setSections((previous) => {
        return targetKeys.reduce(
          (current, key) => setSectionLoadingState(current, key),
          previous
        )
      })

      const requests: Record<StatsSectionKey, () => Promise<unknown>> = {
        overview: () =>
          fetchSectionData(queryString, "overview", (payload) => payload as StatsOverview),
        prTrend: () =>
          fetchSectionData(queryString, "pr-trend", (payload) => {
            const body = payload as { data?: PRTrendItem[] }
            return body.data ?? []
          }),
        qualityTrend: () =>
          fetchSectionData(queryString, "quality-trend", (payload) => {
            const body = payload as { data?: QualityTrendItem[] }
            return body.data ?? []
          }),
        issueDistribution: () =>
          fetchSectionData(queryString, "issue-distribution", (payload) => {
            return payload as IssueDistribution
          }),
        codeChanges: () =>
          fetchSectionData(queryString, "code-changes", (payload) => {
            const body = payload as { data?: CodeChangesItem[] }
            return body.data ?? []
          }),
      }

      const results = await Promise.allSettled(
        targetKeys.map((key) => requests[key]())
      )

      setSections((previous) => {
        return targetKeys.reduce((current, key, index) => {
          const result = results[index]

          if (result.status === "fulfilled") {
            switch (key) {
              case "overview":
                return setSectionSuccessState(
                  current,
                  "overview",
                  result.value as StatsOverview
                )
              case "prTrend":
                return setSectionSuccessState(
                  current,
                  "prTrend",
                  result.value as PRTrendItem[]
                )
              case "qualityTrend":
                return setSectionSuccessState(
                  current,
                  "qualityTrend",
                  result.value as QualityTrendItem[]
                )
              case "issueDistribution":
                return setSectionSuccessState(
                  current,
                  "issueDistribution",
                  result.value as IssueDistribution
                )
              case "codeChanges":
                return setSectionSuccessState(
                  current,
                  "codeChanges",
                  result.value as CodeChangesItem[]
                )
            }
          }

          return setSectionErrorState(
            current,
            key,
            getSectionErrorMessage(key, result.reason)
          )
        }, previous)
      })
    },
    [range, repoId]
  )

  useEffect(() => {
    const keys = initialLoadRef.current ? INITIAL_LOAD_KEYS : ALL_SECTION_KEYS
    initialLoadRef.current = false

    const timeoutId = window.setTimeout(() => {
      void fetchSections(keys)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [fetchSections])

  const retrySection = useCallback(
    (key: StatsSectionKey) => {
      void fetchSections([key])
    },
    [fetchSections]
  )

  return (
    <PageContainer size="wide">
      <StatsHeader
        range={range}
        onRangeChange={setRange}
        repoId={repoId}
        onRepoIdChange={setRepoId}
        repos={repos}
      />

      <StatsSummaryCards
        overview={sections.overview.data}
        loading={sections.overview.loading}
        error={sections.overview.error}
        onRetry={() => retrySection("overview")}
      />

      <div
        className={`grid grid-cols-1 lg:grid-cols-5 ${layoutStyles.gridGap}`}
      >
        <PRTrendChart
          data={sections.prTrend.data}
          loading={sections.prTrend.loading}
          error={sections.prTrend.error}
          onRetry={() => retrySection("prTrend")}
        />
        <PRStatusChart
          data={sections.prTrend.data}
          loading={sections.prTrend.loading}
          error={sections.prTrend.error}
          onRetry={() => retrySection("prTrend")}
        />
      </div>

      <div
        className={`grid grid-cols-1 lg:grid-cols-5 ${layoutStyles.gridGap}`}
      >
        <QualityTrendChart
          data={sections.qualityTrend.data}
          loading={sections.qualityTrend.loading}
          error={sections.qualityTrend.error}
          onRetry={() => retrySection("qualityTrend")}
        />
        <IssueSeverityChart
          data={sections.issueDistribution.data.bySeverity}
          loading={sections.issueDistribution.loading}
          error={sections.issueDistribution.error}
          onRetry={() => retrySection("issueDistribution")}
        />
      </div>

      <CodeChangesChart
        data={sections.codeChanges.data}
        loading={sections.codeChanges.loading}
        error={sections.codeChanges.error}
        onRetry={() => retrySection("codeChanges")}
      />

      <IssueCategoryChart
        data={sections.issueDistribution.data.byCategory}
        loading={sections.issueDistribution.loading}
        error={sections.issueDistribution.error}
        onRetry={() => retrySection("issueDistribution")}
      />
    </PageContainer>
  )
}
