import { parsePatch } from "@/lib/diff"

describe("parsePatch", () => {
  it("uses actual old and new line numbers across hunks", () => {
    expect(parsePatch("@@ -10,3 +20,3 @@ context\n first\n-old\n+new\n last\n@@ -40 +50,2 @@\n+inserted\n tail")).toEqual([
      { type: "hunk", content: "@@ -10,3 +20,3 @@ context" },
      { type: "context", content: "first", oldNum: 10, newNum: 20 },
      { type: "removed", content: "old", oldNum: 11 },
      { type: "added", content: "new", newNum: 21 },
      { type: "context", content: "last", oldNum: 12, newNum: 22 },
      { type: "hunk", content: "@@ -40 +50,2 @@" },
      { type: "added", content: "inserted", newNum: 50 },
      { type: "context", content: "tail", oldNum: 40, newNum: 51 },
    ])
  })

  it("does not assign a line number to the no-newline marker", () => {
    expect(parsePatch("@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new\n")).toEqual([
      { type: "hunk", content: "@@ -1 +1 @@" },
      { type: "removed", content: "old", oldNum: 1 },
      { type: "context", content: "\\ No newline at end of file" },
      { type: "added", content: "new", newNum: 1 },
    ])
  })
})
