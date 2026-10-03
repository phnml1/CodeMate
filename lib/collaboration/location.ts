import { z } from "zod"

const lineNumber = z.number().int().positive().max(10_000_000)
const commitSha = z.string().regex(/^[a-f0-9]{40}$/i)

export const collaborationLocationSchema = z.object({
  roomId: z.string().min(1).max(120),
  filePath: z.string().min(1).max(500),
  baseSha: commitSha,
  headSha: commitSha,
  side: z.enum(["LEFT", "RIGHT"]),
  line: lineNumber.nullable(),
  selection: z.object({
    side: z.enum(["LEFT", "RIGHT"]),
    startLine: lineNumber,
    endLine: lineNumber,
  }).refine((selection) => selection.endLine >= selection.startLine).nullable(),
  textSelection: z.object({
    side: z.enum(["LEFT", "RIGHT"]),
    startLine: lineNumber,
    endLine: lineNumber,
    startOffset: z.number().int().min(0).max(100_000),
    endOffset: z.number().int().min(0).max(100_000),
  }).refine((selection) =>
    selection.endLine > selection.startLine ||
    (selection.endLine === selection.startLine && selection.endOffset > selection.startOffset)
  ).nullable().optional(),
  viewport: z.object({
    top: z.number().min(0).max(1),
    left: z.number().min(0).max(1),
    lineOffset: z.number().min(-10_000).max(10_000).optional(),
  }).strict().optional(),
}).strict()

export const collaborationTypingSchema = z.object({
  roomId: z.string().min(1).max(120),
  anchor: z.object({
    filePath: z.string().min(1).max(500),
    side: z.enum(["LEFT", "RIGHT"]),
    startLine: lineNumber,
    baseSha: commitSha,
    headSha: commitSha,
  }).strict().nullable(),
  isTyping: z.boolean(),
}).strict()
