"use client"

import { useEffect } from "react"
import { useSocket } from "./useSocket"

export function useSocketRoom(prId: string) {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket || !prId) return

    socket.emit("room:join", prId)

    return () => {
      socket.emit("room:leave", prId)
    }
  }, [socket, prId])

  return socket
}
