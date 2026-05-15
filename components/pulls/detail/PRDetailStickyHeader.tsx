"use client";

import PRDetailHeader from "./PRDetailHeader";
import InlineTypingBanner from "./InlineTypingBanner";
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
    <div className="sticky top-0 z-20">
      <PRDetailHeader
        prId={prId}
        scrolled={scrolled}
        initialPullRequest={initialPullRequest}
      />
      <InlineTypingBanner prId={prId} />
      <MobileFileDropdown prId={prId} />
    </div>
  );
}
