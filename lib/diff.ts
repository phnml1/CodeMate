export type LineType = "hunk" | "added" | "removed" | "context";

export interface DiffLine {
  type: LineType;
  content: string;
  oldNum?: number;
  newNum?: number;
}

export function parsePatch(patch: string): DiffLine[] {
  const result: DiffLine[] = [];
  let row = 0;

  for (const line of patch.split("\n")) {
    row++;
    if (line.startsWith("@@")) {
      result.push({ type: "hunk",    content: line,         oldNum: row, newNum: row });
    } else if (line.startsWith("+")) {
      result.push({ type: "added",   content: line.slice(1),             newNum: row });
    } else if (line.startsWith("-")) {
      result.push({ type: "removed", content: line.slice(1), oldNum: row              });
    } else {
      result.push({ type: "context", content: line.slice(1), oldNum: row, newNum: row });
    }
  }
  return result;
}
