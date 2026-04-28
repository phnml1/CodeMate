"use client";

import PRDetailHeader from "./PRDetailHeader";
import InlineTypingBanner from "./InlineTypingBanner";
import MobileFileDropdown from "./MobileFileDropdown";

interface PRDetailStickyHeaderProps {
  prId: string;
  scrolled: boolean;
}

export default function PRDetailStickyHeader({
  prId,
  scrolled,
}: PRDetailStickyHeaderProps) {
  return (
    <div className="sticky top-0 z-20">
      <PRDetailHeader prId={prId} scrolled={scrolled} />
      <InlineTypingBanner prId={prId} />
      <MobileFileDropdown prId={prId} />
    </div>
  );
}
