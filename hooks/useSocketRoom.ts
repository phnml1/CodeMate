"use client"

import { useEffect } from "react"
import { useSocket } from "./useSocket"
import { recordRoomJoin, recordRoomLeave } from "@/lib/measurements/socketMetrics"

export function useSocketRoom(prId: string) {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket || !prId) return

    recordRoomJoin(prId)
    socket.emit("room:join", prId)

    return () => {
      recordRoomLeave(prId)
      socket.emit("room:leave", prId)
    }
  }, [socket, prId])

  return socket
}
