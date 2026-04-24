"use client";

import { useSearchParams } from "next/navigation";

import { InfiniteScrollTrigger } from "@/components/ui/InfiniteScrollTrigger";
import { FILTER_TAB_TO_STATUS, type PRFilterTab } from "@/constants";
import { usePullRequests } from "@/hooks/usePullRequests";
import { layoutStyles, surfaceStyles } from "@/lib/styles";
import PRCard from "./PRCard";
import PRCardSkeleton from "./PRCardSkeleton";
import PREmptyState from "./PREmptyState";
import PRListFooter from "./PRListFooter";

export default function PRList() {
  const searchParams = useSearchParams();
  const statusTab = (searchParams.get("status") as PRFilterTab) ?? "All";
  const search = searchParams.get("search") ?? undefined;
  const apiStatus = FILTER_TAB_TO_STATUS[statusTab];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = usePullRequests({ status: apiStatus, search });

  if (isLoading) {
    return (
      <div className={layoutStyles.listStack}>
        {Array.from({ length: 3 }).map((_, i) => (
          <PRCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={surfaceStyles.emptyState}>
        PR 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  const pullRequests = data?.pages.flatMap((page) => page.pullRequests) ?? [];

  if (pullRequests.length === 0) {
    return <PREmptyState />;
  }

  return (
    <div className={layoutStyles.listStack}>
      {pullRequests.map((pr, index) => (
        <PRCard key={pr.id} {...pr} animationDelay={index * 75} />
      ))}

      <InfiniteScrollTrigger
        onLoadMore={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadingFallback={
          <div className={layoutStyles.listStack}>
            <PRCardSkeleton />
            <PRCardSkeleton />
          </div>
        }
      />

      {!hasNextPage && <PRListFooter />}
    </div>
  );
}
