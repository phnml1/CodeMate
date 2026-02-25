"use client";

import { useSearchParams } from "next/navigation";

import { InfiniteScrollTrigger } from "@/components/ui/InfiniteScrollTrigger";
import { FILTER_TAB_TO_STATUS, type PRFilterTab } from "@/constants";
import { usePullRequests } from "@/hooks/usePullRequests";
import PRCard from "./PRCard";
import PRCardSkeleton from "./PRCardSkeleton";
import PREmptyState from "./PREmptyState";
import PRListFooter from "./PRListFooter";

export default function PRList() {
  const searchParams = useSearchParams();
  const statusTab = (searchParams.get("status") as PRFilterTab) ?? "All";
  const apiStatus = FILTER_TAB_TO_STATUS[statusTab];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = usePullRequests(apiStatus);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PRCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-20 text-center text-sm text-slate-400 font-medium">
        PR 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </div>
    );
  }

  const pullRequests = data?.pages.flatMap((page) => page.pullRequests) ?? [];

  if (pullRequests.length === 0) {
    return <PREmptyState />;
  }

  return (
    <div className="space-y-4">
      {pullRequests.map((pr, index) => (
        <PRCard key={pr.id} {...pr} animationDelay={index * 75} />
      ))}

      <InfiniteScrollTrigger
        onLoadMore={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadingFallback={
          <div className="space-y-4">
            <PRCardSkeleton />
            <PRCardSkeleton />
          </div>
        }
      />

      {!hasNextPage && <PRListFooter />}
    </div>
  );
}
