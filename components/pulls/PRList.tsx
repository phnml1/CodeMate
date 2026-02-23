"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_TAB_TO_STATUS, type PRFilterTab } from "@/constants";
import { usePullRequests } from "@/hooks/usePullRequests";
import PRCard from "./PRCard";
import PREmptyState from "./PREmptyState";
import PRListFooter from "./PRListFooter";

function PRCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-[24px] p-6 md:p-8 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-4 w-8" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

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

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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

      {/* 무한스크롤 감지 센티넬 */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="space-y-4">
          <PRCardSkeleton />
          <PRCardSkeleton />
        </div>
      )}

      {!hasNextPage && <PRListFooter />}
    </div>
  );
}
