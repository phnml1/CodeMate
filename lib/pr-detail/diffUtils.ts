import type { DiffLine } from "@/lib/diff";

export function getDiffLineId(filePath: string, lineNumber: number) {
  return `diff-line-${filePath}-${lineNumber}`;
}

export function getLineCommentsKey(filePath: string, lineNumber: number) {
  return `${filePath}:${lineNumber}`;
}

export function canRenderInlineAction(line: DiffLine) {
  return line.newNum != null;
}
