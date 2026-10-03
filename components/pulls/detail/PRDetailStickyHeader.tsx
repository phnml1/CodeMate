"use client";

import PRDetailHeader from "./PRDetailHeader";
import MobileFileDropdown from "./MobileFileDropdown";
import type { PullRequest } from "@/types/pulls";

interface PRDetailStickyHeaderProps {
  prId: string;
  scrolled: boolean;
  initialPullRequest: PullRequest;
}

export default function PRDetailStickyHeader({
  prId,
  scrolled,
  initialPullRequest,
}: PRDetailStickyHeaderProps) {
  return (
    <>
      <div className="sticky top-0 z-20 h-0 overflow-visible">
        <div
          inert={!scrolled}
          className={`transition-all duration-200 ${
            scrolled
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <PRDetailHeader
            prId={prId}
            scrolled
            initialPullRequest={initialPullRequest}
          />
          <MobileFileDropdown prId={prId} />
        </div>
      </div>
      <PRDetailHeader
        prId={prId}
        initialPullRequest={initialPullRequest}
      />
      <MobileFileDropdown prId={prId} />
    </>
  );
}
