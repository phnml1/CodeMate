import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import { useCollaborationRoomSocket } from "@/hooks/useCollaborationRoomSocket"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useState: jest.fn(),
  useEffect: jest.fn(),
}))
jest.mock("socket.io-client", () => ({ io: jest.fn() }))
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn().mockResolvedValue(undefined) }),
}))

type Listener = (...args: unknown[]) => void

function createSocket(id: string) {
  const listeners = new Map<string, Set<Listener>>()
  const socket = {
    id: id as string | undefined,
    connected: false,
    auth: {},
    on: jest.fn((event: string, callback: Listener): void => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(callback)
    }),
    once: jest.fn((event: string, callback: Listener): void => {
      const once: Listener = (...args) => {
        socket.off(event, once)
        callback(...args)
      }
      socket.on(event, once)
    }),
    off: jest.fn((event: string, callback: Listener): void => {
      listeners.get(event)?.delete(callback)
    }),
    fire(event: string, ...args: unknown[]): void {
      for (const callback of [...(listeners.get(event) ?? [])]) callback(...args)
    },
    connect: jest.fn((): void => {
      socket.connected = true
      socket.fire("connect")
    }),
    disconnect: jest.fn((): void => {
      socket.connected = false
      socket.id = undefined
      socket.fire("disconnect")
    }),
    removeAllListeners: jest.fn(() => listeners.clear()),
    emit: jest.fn((event: string, payload: unknown, ack?: (response: unknown) => void) => {
      if (event !== "collaboration:join") return
      ack?.({
        ok: true, roomId: "room-1", heartbeatIntervalMs: 25_000,
        presence: { roomId: "room-1", users: [] }, locations: [],
      })
    }),
  }
  return socket
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe("collaboration background leave", () => {
  const originalFetch = global.fetch
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  const setState = jest.fn()
  const sendBeacon = jest.fn()
  let socket: ReturnType<typeof createSocket>
  let cleanup: () => void

  function SocketProbe() {
    const hook = useCollaborationRoomSocket()
    for (const [effect] of (useEffect as jest.Mock).mock.calls) {
      const result = effect()
      if (typeof result === "function") cleanup = result
    }
    return hook
  }

  async function joined() {
    const hook = SocketProbe()
    await hook.joinRoom("room-1")
    return hook
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(useState as jest.Mock).mockImplementation((value: unknown) => [value, setState])
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { setTimeout, clearTimeout, setInterval, clearInterval },
    })
    Object.defineProperty(globalThis, "navigator", {
      configurable: true, value: { sendBeacon },
    })
    sendBeacon.mockReturnValue(true)
    socket = createSocket("socket-1")
    ;(io as jest.Mock).mockReturnValue(socket)
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "token" }) })
  })

  afterEach(() => {
    cleanup?.()
    jest.useRealTimers()
    global.fetch = originalFetch
    for (const [key, descriptor] of [["window", originalWindow], ["navigator", originalNavigator]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })

  it("returns immediately, captures the socket ID and lets keepalive finish after unmount", async () => {
    const hook = await joined()
    const pending = deferred<{ ok: boolean }>()
    ;(global.fetch as jest.Mock).mockReturnValueOnce(pending.promise)

    expect(hook.leaveRoom()).toBeUndefined()
    expect(global.fetch).toHaveBeenLastCalledWith("/api/collaboration/rooms/room-1/leave", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socketId: "socket-1" }), keepalive: true,
    })
    expect(socket.disconnect).toHaveBeenCalledTimes(1)
    expect(socket.id).toBeUndefined()
    expect(jest.getTimerCount()).toBe(0)

    hook.leaveRoom()
    hook.leaveOnUnload()
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(sendBeacon).not.toHaveBeenCalled()
    cleanup()
    setState.mockClear()
    pending.resolve({ ok: true })
    await Promise.resolve()
    expect(setState).not.toHaveBeenCalled()
  })

  it.each(["failure", "rejection"])("falls back with the old socket identity on %s without disturbing a new join", async (mode) => {
    const hook = await joined()
    const pending = deferred<{ ok: boolean }>()
    ;(global.fetch as jest.Mock).mockReturnValueOnce(pending.promise)
    hook.leaveRoom()
    const nextSocket = createSocket("socket-2")
    ;(io as jest.Mock).mockReturnValue(nextSocket)
    await hook.joinRoom("room-1")
    setState.mockClear()

    if (mode === "failure") pending.resolve({ ok: false })
    else pending.reject(new Error("Network error"))
    await Promise.resolve()
    await Promise.resolve()
    expect(sendBeacon).toHaveBeenCalledWith("/api/collaboration/rooms/room-1/leave", expect.any(Blob))
    expect(await (sendBeacon.mock.calls[0][1] as Blob).text()).toBe(JSON.stringify({ socketId: "socket-1" }))
    expect(nextSocket.disconnect).not.toHaveBeenCalled()
    expect(setState).not.toHaveBeenCalled()
  })

  it("ignores pending token responses and heartbeat acks after exit", async () => {
    const token = deferred<{ ok: boolean; json: () => Promise<{ token: string }> }>()
    ;(global.fetch as jest.Mock).mockReturnValueOnce(token.promise)
    const hook = SocketProbe()
    const join = hook.joinRoom("room-1")
    hook.leaveRoom()
    token.resolve({ ok: true, json: async () => ({ token: "token" }) })
    await join
    expect(io).not.toHaveBeenCalled()

    await hook.joinRoom("room-1")
    jest.advanceTimersByTime(25_000)
    const heartbeat = socket.emit.mock.calls.find(([event]) => event === "collaboration:heartbeat")!
    hook.leaveRoom()
    setState.mockClear()
    heartbeat[2]?.({ ok: false, error: { code: "NOT_JOINED" } })
    jest.advanceTimersByTime(30_000)
    expect(setState).not.toHaveBeenCalled()
    expect(io).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it("sends one unload beacon and uses keepalive when the beacon throws", async () => {
    const hook = await joined()
    sendBeacon.mockImplementationOnce(() => { throw new Error("Beacon refused") })
    hook.leaveOnUnload()
    hook.leaveOnUnload()
    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenLastCalledWith("/api/collaboration/rooms/room-1/leave", expect.objectContaining({
      keepalive: true, body: JSON.stringify({ socketId: "socket-1" }),
    }))
    expect(jest.getTimerCount()).toBe(0)
  })
})
