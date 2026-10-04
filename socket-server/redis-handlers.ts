import {
  COLLABORATION_HEARTBEAT_INTERVAL_MS,
  COLLABORATION_RECONNECT_GRACE_MS,
  verifyCollaborationRoomSocketToken,
} from "../lib/collaboration/socket-token"
import { collaborationLocationSchema, collaborationTypingSchema } from "../lib/collaboration/location"
import type {
  CollaborationAckErrorCode,
  CollaborationJoinAck,
  CollaborationLeaveAck,
  CollaborationLocationAck,
  ServerToClientEventName,
  ServerToClientPayload,
  TypedServer,
  TypedServerSocket,
} from "../lib/socket/types"
import {
  recordBroadcast,
  recordJoinAccepted,
  recordJoinAttempt,
  recordJoinRejected,
  recordRedisError,
} from "./observability"
import { RedisPresenceStore, type RedisPresenceResult } from "./redis-presence"

const roomsBySocket = new Map<string, Set<string>>()

function roomName(roomId: string) {
  return `collaboration:${roomId}`
}

function errorAck(code: CollaborationAckErrorCode, message: string) {
  return { ok: false as const, error: { code, message } }
}

function emitToRoom<Event extends ServerToClientEventName>(
  io: TypedServer,
  roomId: string,
  event: Event,
  payload: ServerToClientPayload<Event>
) {
  const startedAt = Date.now()
  try {
    const target = io.to(roomName(roomId)) as ReturnType<TypedServer["to"]> & {
      emit: (
      eventName: Event,
      eventPayload: ServerToClientPayload<Event>
      ) => boolean
    }
    target.emit(event, payload)
    recordBroadcast(event, roomId, startedAt, true)
  } catch (error) {
    recordBroadcast(event, roomId, startedAt, false, error)
    throw error
  }
}

function emitChanges(io: TypedServer, result: RedisPresenceResult) {
  for (const userId of result.clearedUserIds) {
    emitToRoom(io, result.presence.roomId, "collaboration:location:clear", {
      roomId: result.presence.roomId,
      userId,
    })
  }
  if (result.changed) {
    emitToRoom(io, result.presence.roomId, "collaboration:presence", result.presence)
  }
}

export async function reconcileRedisPresence(io: TypedServer, store: RedisPresenceStore) {
  await store.reconcileExpired((result) => emitChanges(io, result))
}

export async function getRedisPresenceSnapshots(
  io: TypedServer,
  store: RedisPresenceStore,
  roomIds: string[]
) {
  const results = await Promise.all(roomIds.map((roomId) => store.run(roomId, "snapshot")))
  results.forEach((result) => emitChanges(io, result))
  return results.map((result) => result.presence)
}

export async function leaveRedisRoomFromUnload(
  io: TypedServer,
  store: RedisPresenceStore,
  roomId: string,
  userId: string,
  socketId: string
) {
  const result = await store.run(roomId, "unload", { userId, socketId })
  emitChanges(io, result)
  if (result.ok) {
    roomsBySocket.get(socketId)?.delete(roomId)
    io.in(socketId).disconnectSockets(true)
  }
  return result.presence
}

export function registerRedisCollaborationRoomHandlers(
  io: TypedServer,
  socket: TypedServerSocket,
  store: RedisPresenceStore,
  canJoin: () => boolean = () => true
) {
  const joinedRooms = new Set<string>()
  roomsBySocket.set(socket.id, joinedRooms)

  socket.on("collaboration:join", async ({ token }, ack) => {
    const startedAt = Date.now()
    const payload = verifyCollaborationRoomSocketToken(token)
    recordJoinAttempt(payload?.roomId)
    if (!canJoin()) {
      recordJoinRejected(payload?.roomId, "SERVICE_UNAVAILABLE", Date.now() - startedAt)
      return ack(errorAck("SERVICE_UNAVAILABLE", "Collaboration presence is unavailable"))
    }
    if (!payload) {
      recordJoinRejected(undefined, "INVALID_TOKEN", Date.now() - startedAt)
      return ack(errorAck("INVALID_TOKEN", "Invalid collaboration room token"))
    }
    if (payload.userId !== socket.data.userId) {
      recordJoinRejected(payload.roomId, "FORBIDDEN", Date.now() - startedAt)
      return ack(errorAck("FORBIDDEN", "Token user does not match socket user"))
    }

    try {
      const result = await store.run(payload.roomId, "join", {
        userId: payload.userId,
        socketId: socket.id,
        memberId: payload.memberId,
        userName: payload.userName,
        capacity: payload.capacity,
      })
      if (!result.ok) {
        emitChanges(io, result)
        recordJoinRejected(payload.roomId, "ROOM_FULL", Date.now() - startedAt)
        return ack(errorAck("ROOM_FULL", "Room is full"))
      }
      if (!socket.connected || !canJoin()) {
        const rollback = await store.run(payload.roomId, "disconnect", {
          userId: payload.userId,
          socketId: socket.id,
        })
        emitChanges(io, rollback)
        recordJoinRejected(payload.roomId, "SERVICE_UNAVAILABLE", Date.now() - startedAt)
        return
      }
      socket.join(roomName(payload.roomId))
      joinedRooms.add(payload.roomId)
      const response: CollaborationJoinAck = {
        ok: true,
        roomId: payload.roomId,
        heartbeatIntervalMs: COLLABORATION_HEARTBEAT_INTERVAL_MS,
        reconnectGraceMs: COLLABORATION_RECONNECT_GRACE_MS,
        presence: result.presence,
        locations: result.locations,
      }
      ack(response)
      emitChanges(io, result)
      recordJoinAccepted(payload.roomId, Date.now() - startedAt)
    } catch (error) {
      recordRedisError("join", payload.roomId, error)
      recordJoinRejected(payload.roomId, "SERVICE_UNAVAILABLE", Date.now() - startedAt)
      ack(errorAck("SERVICE_UNAVAILABLE", "Collaboration presence is unavailable"))
    }
  })

  socket.on("collaboration:leave", async ({ roomId }, ack) => {
    if (!joinedRooms.has(roomId)) {
      return ack?.(errorAck("NOT_JOINED", "Socket has not joined this room"))
    }
    try {
      const result = await store.run(roomId, "leave", { userId: socket.data.userId, socketId: socket.id })
      socket.leave(roomName(roomId))
      joinedRooms.delete(roomId)
      emitChanges(io, result)
      if (!result.ok) return ack?.(errorAck("NOT_JOINED", "Socket has not joined this room"))
      const response: CollaborationLeaveAck = { ok: true, roomId }
      ack?.(response)
    } catch (error) {
      recordRedisError("leave", roomId, error)
      ack?.(errorAck("SERVICE_UNAVAILABLE", "Collaboration presence is unavailable"))
    }
  })

  socket.on("collaboration:heartbeat", async ({ roomId }, ack) => {
    if (!joinedRooms.has(roomId)) {
      return ack(errorAck("NOT_JOINED", "Socket has not joined this room"))
    }
    try {
      const result = await store.run(roomId, "heartbeat", { userId: socket.data.userId, socketId: socket.id })
      emitChanges(io, result)
      if (!result.ok) {
        joinedRooms.delete(roomId)
        socket.leave(roomName(roomId))
        return ack(errorAck("NOT_JOINED", "Socket lease expired"))
      }
      if (!result.changed) emitToRoom(io, roomId, "collaboration:presence", result.presence)
      ack({ ok: true, roomId, serverTime: result.serverTime })
    } catch (error) {
      recordRedisError("heartbeat", roomId, error)
      ack(errorAck("SERVICE_UNAVAILABLE", "Collaboration presence is unavailable"))
    }
  })

  socket.on("collaboration:location", async (input, ack) => {
    if (typeof ack !== "function") return
    const parsed = collaborationLocationSchema.safeParse(input)
    if (!parsed.success) return ack(errorAck("INVALID_LOCATION", "Invalid code location"))
    const { roomId } = parsed.data
    if (!joinedRooms.has(roomId)) return ack(errorAck("NOT_JOINED", "Socket has not joined this room"))
    try {
      const result = await store.run(roomId, "location", {
        userId: socket.data.userId,
        socketId: socket.id,
        location: { ...parsed.data, userId: socket.data.userId },
      })
      emitChanges(io, result)
      if (!result.ok) return ack(errorAck("NOT_JOINED", "Socket lease expired"))
      const location = result.locations.find((item) => item.userId === socket.data.userId)
      if (location) {
        const startedAt = Date.now()
        socket.to(roomName(roomId)).emit("collaboration:location", location)
        recordBroadcast("collaboration:location", roomId, startedAt, true)
      }
      const response: CollaborationLocationAck = { ok: true, roomId }
      ack(response)
    } catch (error) {
      recordRedisError("location", roomId, error)
      ack(errorAck("SERVICE_UNAVAILABLE", "Collaboration presence is unavailable"))
    }
  })

  socket.on("collaboration:location:stop", async (input, ack) => {
    if (typeof ack !== "function") return
    const roomId = input?.roomId
    if (typeof roomId !== "string" || !roomId) return ack(errorAck("INVALID_LOCATION", "Invalid room"))
    if (!joinedRooms.has(roomId)) return ack(errorAck("NOT_JOINED", "Socket has not joined this room"))
    try {
      const result = await store.run(roomId, "clear", { userId: socket.data.userId, socketId: socket.id })
      emitChanges(io, result)
      if (!result.ok) return ack(errorAck("NOT_JOINED", "Socket lease expired"))
      ack({ ok: true, roomId })
    } catch (error) {
      recordRedisError("location.stop", roomId, error)
      ack(errorAck("SERVICE_UNAVAILABLE", "Collaboration presence is unavailable"))
    }
  })

  socket.on("collaboration:typing", async (input, ack) => {
    if (typeof ack !== "function") return
    const parsed = collaborationTypingSchema.safeParse(input)
    if (!parsed.success) return ack(errorAck("INVALID_LOCATION", "Invalid typing state"))
    const { roomId } = parsed.data
    if (!joinedRooms.has(roomId)) return ack(errorAck("NOT_JOINED", "Socket has not joined this room"))
    try {
      const result = await store.run(roomId, "check", { userId: socket.data.userId, socketId: socket.id })
      emitChanges(io, result)
      if (!result.ok) return ack(errorAck("NOT_JOINED", "Socket lease expired"))
      const startedAt = Date.now()
      socket.to(roomName(roomId)).emit("collaboration:typing", {
        ...parsed.data,
        userId: socket.data.userId,
        userName: socket.data.userName,
      })
      recordBroadcast("collaboration:typing", roomId, startedAt, true)
      ack({ ok: true, roomId })
    } catch (error) {
      recordRedisError("typing", roomId, error)
      ack(errorAck("SERVICE_UNAVAILABLE", "Collaboration presence is unavailable"))
    }
  })

  socket.on("disconnect", () => {
    roomsBySocket.delete(socket.id)
    for (const roomId of joinedRooms) {
      void store.run(roomId, "disconnect", { userId: socket.data.userId, socketId: socket.id })
        .then((result) => emitChanges(io, result))
        .catch((error) => recordRedisError("disconnect", roomId, error))
    }
  })
}

export async function drainRedisCollaborationConnections(io: TypedServer, store: RedisPresenceStore) {
  await Promise.all([...io.sockets.sockets.values()].map(async (socket) => {
    const joinedRooms = roomsBySocket.get(socket.id)
    for (const roomId of joinedRooms ?? []) {
      try {
        emitChanges(io, await store.run(roomId, "disconnect", {
          userId: socket.data.userId,
          socketId: socket.id,
        }))
      } catch (error) {
        recordRedisError("shutdown.disconnect", roomId, error)
      }
    }
    joinedRooms?.clear()
    socket.disconnect(true)
  }))
}
