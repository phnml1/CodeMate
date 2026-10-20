import { z } from "zod"

export const COLLABORATION_VOICE_MAX_PARTICIPANTS = 4
export const COLLABORATION_VOICE_LEASE_MS = 45_000
export const COLLABORATION_VOICE_HEARTBEAT_MS = 20_000

export const voiceSignalSchema = z.discriminatedUnion("kind", [
  z.object({
    roomId: z.string().min(1).max(128),
    toSocketId: z.string().min(1).max(128),
    kind: z.literal("offer"),
    sdp: z.string().min(1).max(64_000),
  }),
  z.object({
    roomId: z.string().min(1).max(128),
    toSocketId: z.string().min(1).max(128),
    kind: z.literal("answer"),
    sdp: z.string().min(1).max(64_000),
  }),
  z.object({
    roomId: z.string().min(1).max(128),
    toSocketId: z.string().min(1).max(128),
    kind: z.literal("ice"),
    candidate: z.object({
      candidate: z.string().max(4_000),
      sdpMid: z.string().max(128).nullable(),
      sdpMLineIndex: z.number().int().min(0).max(100).nullable(),
      usernameFragment: z.string().max(256).nullable().optional(),
    }),
  }),
])

export type CollaborationVoiceSignal = z.infer<typeof voiceSignalSchema>
