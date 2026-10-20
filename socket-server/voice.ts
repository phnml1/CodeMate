import { getCollaborationPresenceScope } from "../lib/collaboration/presence-scope"
import { voiceSignalSchema } from "../lib/collaboration/voice-protocol"
import type { CollaborationVoiceAck, CollaborationVoiceParticipant, TypedServer, TypedServerSocket } from "../lib/socket/types"
import { MemoryVoiceSeatStore, type VoiceSeatStore } from "./voice-seats"
import { logCollaborationEvent } from "./observability"

const memorySeats = new MemoryVoiceSeatStore()
const scope = getCollaborationPresenceScope()
const SIGNAL_WINDOW_MS = 10_000
const SIGNAL_LIMIT = 60

function voiceRoomName(roomId: string) {
  return `collaboration:voice:${scope}:${roomId}`
}

function fail(code: Extract<CollaborationVoiceAck, { ok: false }>["error"]["code"], message: string): CollaborationVoiceAck {
  return { ok: false, error: { code, message } }
}

function toParticipant(socket: { id: string; data: { userId: string; userName: string } }): CollaborationVoiceParticipant {
  return { socketId: socket.id, userId: socket.data.userId, userName: socket.data.userName }
}

export function registerVoiceHandlers(
  io: TypedServer,
  socket: TypedServerSocket,
  canAcceptConnection: () => boolean,
  store: VoiceSeatStore = memorySeats,
  enabled = process.env.COLLABORATION_VOICE_ENABLED === "1"
) {
  const joinedRooms = new Set<string>()
  let signalTimes: number[] = []

  const leave = async (roomId: string) => {
    if (!joinedRooms.delete(roomId)) return false
    const voiceRoom = voiceRoomName(roomId)
    socket.to(voiceRoom).emit("collaboration:voice:participant-left", { roomId, socketId: socket.id })
    socket.leave(voiceRoom)
    try {
      await store.run(scope, roomId, "leave", socket.data.userId, socket.id)
    } catch (error) {
      logCollaborationEvent("collaboration.voice.leave.failed", { roomId }, "error", error)
    }
    return true
  }

  socket.on("collaboration:voice:join", async (data, ack) => {
    if (typeof ack !== "function") return
    const roomId = data?.roomId
    if (!enabled) return ack(fail("VOICE_DISABLED", "Voice is disabled"))
    if (!canAcceptConnection()) return ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
    if (typeof roomId !== "string" || !roomId || roomId.length > 128 || !socket.rooms.has(`collaboration:${roomId}`)) {
      return ack(fail("VOICE_NOT_JOINED", "Join the collaboration room first"))
    }
    const voiceRoom = voiceRoomName(roomId)
    try {
      const seat = await store.run(scope, roomId, "join", socket.data.userId, socket.id)
      if (seat === "full") return ack(fail("VOICE_FULL", "Voice is limited to four people"))
      if (seat === "duplicate") return ack(fail("VOICE_ALREADY_JOINED", "Voice is already open in another tab"))
      if (!socket.connected || !canAcceptConnection() || !socket.rooms.has(`collaboration:${roomId}`)) {
        await store.run(scope, roomId, "leave", socket.data.userId, socket.id)
        return ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
      }
      const peers = await io.in(voiceRoom).fetchSockets()
      if (!socket.connected || !canAcceptConnection() || !socket.rooms.has(`collaboration:${roomId}`)) {
        await store.run(scope, roomId, "leave", socket.data.userId, socket.id)
        return ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
      }
      const participants = peers.filter((peer) => peer.id !== socket.id).map(toParticipant)
      socket.join(voiceRoom)
      joinedRooms.add(roomId)
      ack({ ok: true, roomId, participants })
      if (seat === "joined") {
        socket.to(voiceRoom).emit("collaboration:voice:participant-joined", { roomId, participant: toParticipant(socket) })
      }
    } catch (error) {
      await store.run(scope, roomId, "leave", socket.data.userId, socket.id).catch(() => {})
      logCollaborationEvent("collaboration.voice.join.failed", { roomId }, "error", error)
      ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
    }
  })

  socket.on("collaboration:voice:leave", async (data, ack) => {
    const roomId = data?.roomId
    const respond = typeof ack === "function" ? ack : undefined
    if (typeof roomId !== "string" || !await leave(roomId)) return respond?.(fail("VOICE_NOT_JOINED", "Not in voice"))
    respond?.({ ok: true, roomId })
  })

  socket.on("collaboration:voice:heartbeat", async (data, ack) => {
    if (typeof ack !== "function") return
    const roomId = data?.roomId
    if (!canAcceptConnection()) return ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
    if (typeof roomId !== "string" || !joinedRooms.has(roomId)) return ack(fail("VOICE_NOT_JOINED", "Not in voice"))
    try {
      const seat = await store.run(scope, roomId, "refresh", socket.data.userId, socket.id)
      if (seat === "missing") {
        await leave(roomId)
        return ack(fail("VOICE_NOT_JOINED", "Voice session expired"))
      }
      ack({ ok: true, roomId })
    } catch (error) {
      logCollaborationEvent("collaboration.voice.heartbeat.failed", { roomId }, "error", error)
      ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
    }
  })

  socket.on("collaboration:voice:signal", async (input, ack) => {
    if (typeof ack !== "function") return
    if (!enabled || !canAcceptConnection()) return ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
    const parsed = voiceSignalSchema.safeParse(input)
    if (!parsed.success) return ack(fail("VOICE_INVALID_SIGNAL", "Invalid voice signal"))
    const signal = parsed.data
    if (!joinedRooms.has(signal.roomId) || !socket.rooms.has(`collaboration:${signal.roomId}`)) {
      return ack(fail("VOICE_NOT_JOINED", "Not in voice"))
    }
    const now = Date.now()
    signalTimes = signalTimes.filter((time) => time > now - SIGNAL_WINDOW_MS)
    if (signalTimes.length >= SIGNAL_LIMIT) return ack(fail("VOICE_INVALID_SIGNAL", "Too many voice signals"))
    signalTimes.push(now)
    try {
      const targets = await io.in(voiceRoomName(signal.roomId)).fetchSockets()
      if (signal.toSocketId === socket.id || !targets.some((target) => target.id === signal.toSocketId)) {
        return ack(fail("VOICE_TARGET_UNAVAILABLE", "Voice participant is unavailable"))
      }
      io.to(signal.toSocketId).emit("collaboration:voice:signal", {
        ...signal,
        fromSocketId: socket.id,
        fromUserId: socket.data.userId,
      })
      ack({ ok: true, roomId: signal.roomId })
    } catch (error) {
      logCollaborationEvent("collaboration.voice.signal.failed", { roomId: signal.roomId }, "error", error)
      ack(fail("VOICE_UNAVAILABLE", "Voice is unavailable"))
    }
  })

  socket.on("collaboration:leave", (data) => {
    const roomId = data?.roomId
    if (typeof roomId === "string") void leave(roomId)
  })
  socket.on("disconnecting", () => {
    for (const roomId of [...joinedRooms]) void leave(roomId)
  })
}
