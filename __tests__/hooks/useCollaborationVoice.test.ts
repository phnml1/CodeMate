import { useCollaborationVoice } from "@/hooks/useCollaborationVoice"
import type { CollaborationClientSocket } from "@/hooks/useCollaborationRoomSocket"

let stateIndex = 0
const stateSetters: jest.Mock[] = []

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: (initial: unknown) => {
    const index = stateIndex++
    const setter = jest.fn()
    stateSetters[index] = setter
    return [initial, setter]
  },
  useRef: (initial: unknown) => ({ current: initial }),
  useCallback: (callback: unknown) => callback,
  useEffect: jest.fn(),
}))

class FakePeerConnection {
  ontrack: ((event: { streams: MediaStream[]; track: MediaStreamTrack }) => void) | null = null
  onicecandidate: (() => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  signalingState = "stable"
  connectionState = "connected"
  remoteDescription: RTCSessionDescriptionInit | null = null
  localDescription: RTCSessionDescriptionInit | null = null
  remoteTrack = { stop: jest.fn() }
  close = jest.fn()
  addTrack = jest.fn()
  getReceivers = () => [{ track: this.remoteTrack }]
  setRemoteDescription = async (description: RTCSessionDescriptionInit) => { this.remoteDescription = description }
  setLocalDescription = async (description: RTCSessionDescriptionInit) => { this.localDescription = description }
  createAnswer = async () => ({ type: "answer" as const, sdp: "answer" })
}

describe("voice peer cleanup", () => {
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const peers: FakePeerConnection[] = []
  const handlers = new Map<string, (...args: never[]) => void>()
  const localTrack = { stop: jest.fn(), enabled: true, onended: null }
  const localStream = { getTracks: () => [localTrack], getAudioTracks: () => [localTrack] } as unknown as MediaStream
  const socket = {
    id: "self",
    connected: true,
    on: jest.fn((event: string, listener: (...args: never[]) => void) => { handlers.set(event, listener) }),
    off: jest.fn((event: string) => { handlers.delete(event) }),
    emit: jest.fn(),
    timeout: jest.fn(() => ({ emitWithAck: jest.fn(async () => ({ ok: true, participants: [] })) })),
  } as unknown as CollaborationClientSocket

  beforeAll(() => {
    for (const name of ["window", "navigator", "fetch", "RTCPeerConnection"]) {
      originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
    }
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      isSecureContext: true, setInterval: jest.fn(() => 1), clearInterval: jest.fn(),
    } })
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
      mediaDevices: { getUserMedia: jest.fn(async () => localStream) },
    } })
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: jest.fn(async () => ({
      ok: true, json: async () => ({ iceServers: [] }),
    })) })
    Object.defineProperty(globalThis, "RTCPeerConnection", { configurable: true, value: class extends FakePeerConnection {
      constructor() { super(); peers.push(this) }
    } })
  })

  afterAll(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
  })

  beforeEach(() => {
    stateIndex = 0
    stateSetters.length = 0
    peers.length = 0
    handlers.clear()
    jest.clearAllMocks()
  })

  it("stops the remote track on peer leave and all remaining tracks on voice exit", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    await voice.start()

    const signal = handlers.get("collaboration:voice:signal")!
    signal({ roomId: "room-1", fromSocketId: "remote-1", fromUserId: "user-1", kind: "offer", sdp: "offer" } as never)
    await new Promise(setImmediate)
    expect(peers).toHaveLength(1)
    const firstOnTrack = peers[0].ontrack!
    firstOnTrack({ streams: [{} as MediaStream], track: {} as MediaStreamTrack })

    handlers.get("collaboration:voice:participant-left")!({ roomId: "room-1", socketId: "remote-1" } as never)
    expect(peers[0].remoteTrack.stop).toHaveBeenCalledTimes(1)
    expect(peers[0].close).toHaveBeenCalledTimes(1)
    expect(peers[0].ontrack).toBeNull()
    const streamUpdates = stateSetters[4].mock.calls.length
    firstOnTrack({ streams: [{} as MediaStream], track: {} as MediaStreamTrack })
    expect(stateSetters[4]).toHaveBeenCalledTimes(streamUpdates)

    signal({ roomId: "room-1", fromSocketId: "remote-2", fromUserId: "user-2", kind: "offer", sdp: "offer" } as never)
    await new Promise(setImmediate)
    voice.stop()
    expect(peers[1].remoteTrack.stop).toHaveBeenCalledTimes(1)
    expect(peers[1].close).toHaveBeenCalledTimes(1)
    expect(localTrack.stop).toHaveBeenCalledTimes(1)
    expect(socket.emit).toHaveBeenCalledWith("collaboration:voice:leave", { roomId: "room-1" })
    expect(handlers.size).toBe(0)
  })
})
