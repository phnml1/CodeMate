"use client"

import { useMemo } from "react"
import { ArrowUpRight, FileCode2 } from "lucide-react"
import { parsePatch } from "@/lib/diff"
import type { CollaborationCodeReference } from "@/types/collaboration"
import type { PRFile } from "@/types/pulls"

export default function CollaborationCodeLink({
  reference,
  files,
  onClick,
}: {
  reference: CollaborationCodeReference
  files: PRFile[]
  onClick: () => void
}) {
  const patch = files.find((file) => file.filename === reference.filePath)?.patch
  const preview = useMemo(() => {
    if (!patch) return null
    const line = parsePatch(patch).find((item) =>
      (reference.side === "LEFT" ? item.oldNum : item.newNum) === reference.startLine
    )
    return line ? line.content || "(빈 줄)" : null
  }, [patch, reference.side, reference.startLine])
  const location = `${reference.filePath} · ${reference.side === "LEFT" ? "이전" : "변경"} ${reference.startLine}${reference.endLine !== reference.startLine ? `-${reference.endLine}` : ""}`

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${location} 대화 열기`}
      className="block min-w-0 max-w-full text-left text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
    >
      <span className="flex min-w-0 items-center gap-1 font-medium underline underline-offset-2">
        <FileCode2 className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{location}</span>
        <ArrowUpRight className="size-3.5 shrink-0" />
      </span>
      {preview !== null && (
        <code className="mt-1 block max-w-full truncate font-mono text-[11px] text-slate-600 dark:text-slate-300" title={preview}>
          {preview}
        </code>
      )}
    </button>
  )
}
