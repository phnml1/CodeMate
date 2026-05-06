"use client";

import dynamic from "next/dynamic";
import type { ReviewIssue } from "@/types/review";

const IssueDetailModal = dynamic(
  () => import("@/components/review/IssueDetailModal"),
  { ssr: false }
);

interface IssueModalHostProps {
  issue: ReviewIssue | null;
  onClose: () => void;
}

export default function IssueModalHost({ issue, onClose }: IssueModalHostProps) {
  if (!issue) return null;

  return (
    <IssueDetailModal
      issue={issue}
      onClose={onClose}
    />
  );
}
