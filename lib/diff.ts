export type LineType = "hunk" | "added" | "removed" | "context";

export interface DiffLine {
  type: LineType;
  content: string;
  oldNum?: number;
  newNum?: number;
}

export function parsePatch(patch: string): DiffLine[] {
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of patch.split("\n")) {
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      result.push({ type: "hunk", content: line });
    } else if (line.startsWith("+") && result.length > 0) {
      result.push({ type: "added", content: line.slice(1), newNum: newLine++ });
    } else if (line.startsWith("-") && result.length > 0) {
      result.push({ type: "removed", content: line.slice(1), oldNum: oldLine++ });
    } else if (line.startsWith(" ") && result.length > 0) {
      result.push({ type: "context", content: line.slice(1), oldNum: oldLine++, newNum: newLine++ });
    } else if (line.startsWith("\\ No newline at end of file") && result.length > 0) {
      result.push({ type: "context", content: line });
    }
  }
  return result;
}
