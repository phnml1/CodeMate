"use client";

import { MessageSquare } from "lucide-react";
import { usePRCommentGroups } from "@/hooks/pr-detail/usePRCommentGroups";

interface FloatingCommentsButtonProps {
  prId: string;
  visible: boolean;
  onClick: () => void;
}

export default function FloatingCommentsButton({
  prId,
  visible,
  onClick,
}: FloatingCommentsButtonProps) {
  const { generalCommentCount } = usePRCommentGroups(prId);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700"
    >
      <MessageSquare size={15} />
      댓글
      {generalCommentCount > 0 && (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-blue-600">
          {generalCommentCount}
        </span>
      )}
    </button>
  );
}
