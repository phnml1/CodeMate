import {
  COLLABORATION_HEARTBEAT_INTERVAL_MS,
  COLLABORATION_RECONNECT_GRACE_MS,
  verifyCollaborationRoomSocketToken,
} from "../lib/collaboration/socket-token"
import { collaborationLocationSchema, collaborationTypingSchema } from "../lib/collaboration/location"
import type {
  CollaborationAckErrorCode,
  CollaborationHeartbeatAck,
  CollaborationJoinAck,
  CollaborationLeaveAck,
  CollaborationLocation,
  CollaborationLocationAck,
  CollaborationPresenceSnapshot,
  CollaborationPresenceUser,
  TypedServer,
  TypedServerSocket,
} from "../lib/socket/types"
import { authenticateSocket } from "./auth"
import { syncCollaborationDisconnect } from "./disconnect-sync"

type PresenceEntry = {
  memberId: string
  userId: string
  userName: string
  socketIds: Set<string>
  lastSeenAt: number
  disconnectedAt: number | null
  lastDisconnectedSocketId: string | null
  removalTimer: NodeJS.Timeout | null
}

const presenceByRoom = new Map<string, Map<string, PresenceEntry>>()
const roomsBySocket = new Map<string, Set<string>>()
const locationsByRoom = new Map<string, Map<string, CollaborationLocation>>()

function collaborationRoomName(roomId: string) {
  return `collaboration:${roomId}`
}

function createErrorAck(
  code: CollaborationAckErrorCode,
  message: string
): { ok: false; error: { code: CollaborationAckErrorCode; message: string } } {
  return {
    ok: false,
    error: { code, message },
  }
}

function getRoomPresence(roomId: string) {
  let roomPresence = presenceByRoom.get(roomId)

  if (!roomPresence) {
    roomPresence = new Map()
    presenceByRoom.set(roomId, roomPresence)
  }

  return roomPresence
}

function getSocketRooms(socketId: string) {
  let roomIds = roomsBySocket.get(socketId)

  if (!roomIds) {
    roomIds = new Set()
    roomsBySocket.set(socketId, roomIds)
  }

  return roomIds
}

function isSeatHeld(entry: PresenceEntry) {
  return Boolean(entry.socketIds.size || entry.disconnectedAt)
}

function countHeldSeats(roomPresence: Map<string, PresenceEntry>) {
  return [...roomPresence.values()].filter(isSeatHeld).length
}

function toPresenceUser(entry: PresenceEntry): CollaborationPresenceUser {
  return {
    memberId: entry.memberId,
    userId: entry.userId,
    userName: entry.userName,
    status: entry.socketIds.size > 0 ? "online" : "reconnecting",
    lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
    socketCount: entry.socketIds.size,
  }
}

function createPresenceSnapshot(roomId: string): CollaborationPresenceSnapshot {
  const roomPresence = presenceByRoom.get(roomId)

  return {
    roomId,
    generatedAt: new Date().toISOString(),
    users: [...(roomPresence?.values() ?? [])]
      .filter(isSeatHeld)
      .map(toPresenceUser)
      .sort((a, b) => a.userName.localeCompare(b.userName)),
  }
}

export function getCollaborationPresenceSnapshots(roomIds: string[]) {
  return roomIds.map(createPresenceSnapshot)
}

function emitPresence(io: TypedServer, roomId: string) {
  io.to(collaborationRoomName(roomId)).emit(
    "collaboration:presence",
    createPresenceSnapshot(roomId)
  )
}

function clearLocation(io: TypedServer, roomId: string, userId: string) {
  const locations = locationsByRoom.get(roomId)
  if (!locations?.delete(userId)) return
  if (locations.size === 0) locationsByRoom.delete(roomId)
  io.to(collaborationRoomName(roomId)).emit("collaboration:location:clear", {
    roomId,
    userId,
  })
}

function registerRoomHandlers(socket: TypedServerSocket) {
  socket.on("room:join", (prId) => {
    socket.join(`pr:${prId}`)
  })

  socket.on("room:leave", (prId) => {
    socket.leave(`pr:${prId}`)
  })
}

function removeSocketFromCollaborationRoom(
  io: TypedServer,
  socket: TypedServerSocket,
  roomId: string,
  options: { holdReconnectSeat: boolean }
) {
  const roomPresence = presenceByRoom.get(roomId)
  const entry = roomPresence?.get(socket.data.userId)

  socket.leave(collaborationRoomName(roomId))
  roomsBySocket.get(socket.id)?.delete(roomId)

  if (!roomPresence || !entry) {
    return
  }

  entry.socketIds.delete(socket.id)
  entry.lastSeenAt = Date.now()

  if (entry.socketIds.size === 0) {
    entry.lastDisconnectedSocketId = socket.id
    if (entry.removalTimer) {
      clearTimeout(entry.removalTimer)
      entry.removalTimer = null
    }

    if (options.holdReconnectSeat) {
      entry.disconnectedAt = Date.now()
      entry.removalTimer = setTimeout(() => {
        const latestRoomPresence = presenceByRoom.get(roomId)
        const latestEntry = latestRoomPresence?.get(entry.userId)

        if (!latestRoomPresence || !latestEntry || latestEntry.socketIds.size > 0) {
          return
        }

        latestRoomPresence.delete(entry.userId)
        clearLocation(io, roomId, entry.userId)
        if (latestRoomPresence.size === 0) {
          presenceByRoom.delete(roomId)
        }
        emitPresence(io, roomId)
        void syncCollaborationDisconnect({
          roomId,
          memberId: entry.memberId,
          userId: entry.userId,
          disconnectedAt: entry.disconnectedAt!,
        }).catch((error) => console.error("Collaboration disconnect sync failed", error))
      }, COLLABORATION_RECONNECT_GRACE_MS)
    } else {
      roomPresence.delete(entry.userId)
      clearLocation(io, roomId, entry.userId)
      if (roomPresence.size === 0) {
        presenceByRoom.delete(roomId)
      }
    }
  }

  emitPresence(io, roomId)
}

export function leaveCollaborationRoomFromUnload(
  io: TypedServer,
  roomId: string,
  userId: string,
  socketId: string
) {
  const socket = io.sockets.sockets.get(socketId)
  if (socket && socket.data.userId === userId && roomsBySocket.get(socketId)?.has(roomId)) {
    removeSocketFromCollaborationRoom(io, socket, roomId, { holdReconnectSeat: false })
    return createPresenceSnapshot(roomId)
  }

  const roomPresence = presenceByRoom.get(roomId)
  const entry = roomPresence?.get(userId)
  if (!roomPresence || !entry || entry.socketIds.size > 0 || entry.lastDisconnectedSocketId !== socketId) return createPresenceSnapshot(roomId)
  if (entry.removalTimer) clearTimeout(entry.removalTimer)
  roomPresence.delete(userId)
  clearLocation(io, roomId, userId)
  if (roomPresence.size === 0) presenceByRoom.delete(roomId)
  emitPresence(io, roomId)
  return createPresenceSnapshot(roomId)
}

function registerCollaborationRoomHandlers(
  io: TypedServer,
  socket: TypedServerSocket
) {
  socket.on("collaboration:join", ({ token }, ack) => {
    const payload = verifyCollaborationRoomSocketToken(token)

    if (!payload) {
      ack(createErrorAck("INVALID_TOKEN", "Invalid collaboration room token"))
      return
    }

    if (payload.userId !== socket.data.userId) {
      ack(createErrorAck("FORBIDDEN", "Token user does not match socket user"))
      return
    }

    const roomPresence = getRoomPresence(payload.roomId)
    const existingEntry = roomPresence.get(payload.userId)
    const heldSeats = countHeldSeats(roomPresence)

    if (!existingEntry && heldSeats >= payload.capacity) {
      ack(createErrorAck("ROOM_FULL", "Room is full"))
      return
    }

    if (existingEntry?.removalTimer) {
      clearTimeout(existingEntry.removalTimer)
      existingEntry.removalTimer = null
    }

    const entry =
      existingEntry ??
      ({
        memberId: payload.memberId,
        userId: payload.userId,
        userName: payload.userName,
        socketIds: new Set<string>(),
        lastSeenAt: Date.now(),
        disconnectedAt: null,
        lastDisconnectedSocketId: null,
        removalTimer: null,
      } satisfies PresenceEntry)

    entry.memberId = payload.memberId
    entry.userName = payload.userName
    entry.socketIds.add(socket.id)
    entry.lastSeenAt = Date.now()
    entry.disconnectedAt = null
    entry.lastDisconnectedSocketId = null
    roomPresence.set(payload.userId, entry)

    socket.join(collaborationRoomName(payload.roomId))
    getSocketRooms(socket.id).add(payload.roomId)

    const presence = createPresenceSnapshot(payload.roomId)
    const response: CollaborationJoinAck = {
      ok: true,
      roomId: payload.roomId,
      heartbeatIntervalMs: COLLABORATION_HEARTBEAT_INTERVAL_MS,
      reconnectGraceMs: COLLABORATION_RECONNECT_GRACE_MS,
      presence,
      locations: [...(locationsByRoom.get(payload.roomId)?.values() ?? [])],
    }

    ack(response)
    emitPresence(io, payload.roomId)
  })

  socket.on("collaboration:leave", ({ roomId }, ack) => {
    const joinedRoomIds = roomsBySocket.get(socket.id)
    if (!joinedRoomIds?.has(roomId)) {
      ack?.(createErrorAck("NOT_JOINED", "Socket has not joined this room"))
      return
    }

    removeSocketFromCollaborationRoom(io, socket, roomId, {
      holdReconnectSeat: false,
    })

    const response: CollaborationLeaveAck = { ok: true, roomId }
    ack?.(response)
  })

  socket.on("collaboration:heartbeat", ({ roomId }, ack) => {
    const joinedRoomIds = roomsBySocket.get(socket.id)
    if (!joinedRoomIds?.has(roomId)) {
      ack(createErrorAck("NOT_JOINED", "Socket has not joined this room"))
      return
    }

    const entry = presenceByRoom.get(roomId)?.get(socket.data.userId)
    if (!entry || !entry.socketIds.has(socket.id)) {
      ack(createErrorAck("NOT_JOINED", "Socket has not joined this room"))
      return
    }

    entry.lastSeenAt = Date.now()

    const response: CollaborationHeartbeatAck = {
      ok: true,
      roomId,
      serverTime: new Date().toISOString(),
    }
    ack(response)
  })

  socket.on("collaboration:location", (input, ack) => {
    if (typeof ack !== "function") return
    const parsed = collaborationLocationSchema.safeParse(input)
    if (!parsed.success) {
      ack(createErrorAck("INVALID_LOCATION", "Invalid code location"))
      return
    }

    const { roomId } = parsed.data
    const joined = roomsBySocket.get(socket.id)?.has(roomId)
    const entry = presenceByRoom.get(roomId)?.get(socket.data.userId)
    if (!joined || !entry?.socketIds.has(socket.id)) {
      ack(createErrorAck("NOT_JOINED", "Socket has not joined this room"))
      return
    }

    const location: CollaborationLocation = {
      ...parsed.data,
      userId: socket.data.userId,
      updatedAt: new Date().toISOString(),
    }
    let locations = locationsByRoom.get(roomId)
    if (!locations) {
      locations = new Map()
      locationsByRoom.set(roomId, locations)
    }
    locations.set(socket.data.userId, location)
    socket.to(collaborationRoomName(roomId)).emit("collaboration:location", location)
    const response: CollaborationLocationAck = { ok: true, roomId }
    ack(response)
  })

  socket.on("collaboration:location:stop", (input, ack) => {
    if (typeof ack !== "function") return
    const roomId = input?.roomId
    if (typeof roomId !== "string" || !roomId) {
      ack(createErrorAck("INVALID_LOCATION", "Invalid room"))
      return
    }
    if (!roomsBySocket.get(socket.id)?.has(roomId)) {
      ack(createErrorAck("NOT_JOINED", "Socket has not joined this room"))
      return
    }
    clearLocation(io, roomId, socket.data.userId)
    ack({ ok: true, roomId })
  })

  socket.on("collaboration:typing", (input, ack) => {
    if (typeof ack !== "function") return
    const parsed = collaborationTypingSchema.safeParse(input)
    if (!parsed.success) {
      ack(createErrorAck("INVALID_LOCATION", "Invalid typing state"))
      return
    }
    const { roomId } = parsed.data
    const joined = roomsBySocket.get(socket.id)?.has(roomId)
    const entry = presenceByRoom.get(roomId)?.get(socket.data.userId)
    if (!joined || !entry?.socketIds.has(socket.id)) {
      ack(createErrorAck("NOT_JOINED", "Socket has not joined this room"))
      return
    }
    socket.to(collaborationRoomName(roomId)).emit("collaboration:typing", {
      ...parsed.data,
      userId: socket.data.userId,
      userName: socket.data.userName,
    })
    ack({ ok: true, roomId })
  })

  socket.on("disconnect", () => {
    const roomIds = [...(roomsBySocket.get(socket.id) ?? [])]
    roomsBySocket.delete(socket.id)

    for (const roomId of roomIds) {
      removeSocketFromCollaborationRoom(io, socket, roomId, {
        holdReconnectSeat: true,
      })
    }
  })
}

function registerTypingHandlers(socket: TypedServerSocket) {
  const { userId, userName } = socket.data

  socket.on("typing:start", (prId) => {
    socket.to(`pr:${prId}`).emit("typing:start", { userId, userName })
  })

  socket.on("typing:stop", (prId) => {
    socket.to(`pr:${prId}`).emit("typing:stop", { userId })
  })

  socket.on("inline:typing:start", ({ prId, filePath, lineNumber }) => {
    socket.to(`pr:${prId}`).emit("inline:typing:start", { userId, userName, filePath, lineNumber })
  })

  socket.on("inline:typing:stop", (prId) => {
    socket.to(`pr:${prId}`).emit("inline:typing:stop", { userId })
  })
}

export function setupSocketHandlers(io: TypedServer) {
  io.on("connection", (socket) => {
    const userData = authenticateSocket(socket)

    if (!userData) {
      socket.disconnect(true)
      return
    }

    socket.data.userId = userData.userId
    socket.data.userName = userData.userName

    socket.join(`user:${userData.userId}`)

    registerRoomHandlers(socket)
    registerCollaborationRoomHandlers(io, socket)
    registerTypingHandlers(socket)
  })
}
