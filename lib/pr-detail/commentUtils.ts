import type { CommentWithAuthor } from "@/types/comment";

export type InlineCommentsByFile = Record<string, CommentWithAuthor[]>;

export function groupInlineCommentsByFile(
  comments: CommentWithAuthor[]
): InlineCommentsByFile {
  const map: InlineCommentsByFile = {};

  for (const comment of comments) {
    if (comment.filePath && comment.lineNumber != null) {
      map[comment.filePath] = map[comment.filePath] ?? [];
      map[comment.filePath].push(comment);
    }
  }

  return map;
}

export function getCommentCountsByFile(
  inlineCommentsByFile: InlineCommentsByFile
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const [filename, comments] of Object.entries(inlineCommentsByFile)) {
    counts[filename] = comments.length;
  }

  return counts;
}

export function getGeneralCommentCount(comments: CommentWithAuthor[]) {
  return comments.filter((comment) => comment.filePath == null).length;
}

export function groupCommentsByLine(comments: CommentWithAuthor[]) {
  const map = new Map<number, CommentWithAuthor[]>();

  for (const comment of comments) {
    if (comment.lineNumber != null) {
      const list = map.get(comment.lineNumber) ?? [];
      list.push(comment);
      map.set(comment.lineNumber, list);
    }
  }

  return map;
}
