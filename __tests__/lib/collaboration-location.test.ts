import { collaborationLocationSchema, collaborationTypingSchema } from "@/lib/collaboration/location"

const location = {
  roomId: "room-1",
  filePath: "src/app.ts",
  baseSha: "a".repeat(40),
  headSha: "b".repeat(40),
  side: "RIGHT" as const,
  line: 42,
  selection: { side: "RIGHT" as const, startLine: 42, endLine: 44 },
}

describe("collaborationLocationSchema", () => {
  it("accepts a file position and code selection", () => {
    expect(collaborationLocationSchema.safeParse(location).success).toBe(true)
    expect(collaborationLocationSchema.safeParse({ ...location, line: null, selection: null }).success).toBe(true)
    expect(collaborationLocationSchema.safeParse({
      ...location,
      textSelection: { side: "RIGHT", startLine: 42, endLine: 42, startOffset: 3, endOffset: 9 },
      viewport: { top: 0.45, left: 0.2, lineOffset: 18 },
    }).success).toBe(true)
  })

  it("rejects malformed selections and forged sender data", () => {
    expect(collaborationLocationSchema.safeParse({ ...location, line: -1 }).success).toBe(false)
    expect(collaborationLocationSchema.safeParse({ ...location, headSha: "old" }).success).toBe(false)
    expect(collaborationLocationSchema.safeParse({ ...location, selection: { side: "RIGHT", startLine: 44, endLine: 42 } }).success).toBe(false)
    expect(collaborationLocationSchema.safeParse({ ...location, userId: "forged" }).success).toBe(false)
    expect(collaborationLocationSchema.safeParse({ ...location, textSelection: { side: "RIGHT", startLine: 42, endLine: 42, startOffset: 9, endOffset: 3 } }).success).toBe(false)
    expect(collaborationLocationSchema.safeParse({ ...location, viewport: { top: 1.1, left: 0 } }).success).toBe(false)
  })
})

describe("collaborationTypingSchema", () => {
  const typing = {
    roomId: "room-1",
    anchor: { filePath: "src/app.ts", side: "RIGHT", startLine: 42, baseSha: "a".repeat(40), headSha: "b".repeat(40) },
    isTyping: true,
  }

  it("accepts room and code typing but rejects forged fields", () => {
    expect(collaborationTypingSchema.safeParse(typing).success).toBe(true)
    expect(collaborationTypingSchema.safeParse({ ...typing, anchor: null }).success).toBe(true)
    expect(collaborationTypingSchema.safeParse({ ...typing, userId: "forged" }).success).toBe(false)
    expect(collaborationTypingSchema.safeParse({ ...typing, anchor: { ...typing.anchor, startLine: -1 } }).success).toBe(false)
  })
})
