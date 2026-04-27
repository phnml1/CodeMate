import type { DiffLine } from "@/lib/diff";

export function getDiffLineId(filePath: string, lineNumber: number) {
  return `diff-line-${filePath}-${lineNumber}`;
}

export function getDiffFileId(filePath: string) {
  return `diff-${filePath}`;
}

export function scrollToElementById(
  targetId: string,
  options: ScrollIntoViewOptions = { behavior: "smooth", block: "center" }
) {
  let attempts = 0;

  const tryScroll = () => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView(options);
    } else if (attempts++ < 20) {
      requestAnimationFrame(tryScroll);
    }
  };

  requestAnimationFrame(tryScroll);
}

export function getLineCommentsKey(filePath: string, lineNumber: number) {
  return `${filePath}:${lineNumber}`;
}

export function canRenderInlineAction(line: DiffLine) {
  return line.newNum != null;
}
