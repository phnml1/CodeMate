import { useCollaborationVoice } from "@/hooks/useCollaborationVoice"
import type { CollaborationClientSocket } from "@/hooks/useCollaborationRoomSocket"

let stateIndex = 0
const stateSetters: jest.Mock[] = []
const effects: Array<() => void | (() => void)> = []

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
  useEffect: (effect: () => void | (() => void)) => { effects.push(effect) },
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
  sender = { track: { kind: "audio" } as MediaStreamTrack, replaceTrack: jest.fn(async (track: MediaStreamTrack) => { this.sender.track = track }) }
  getSenders = () => [this.sender]
  getReceivers = () => [{ track: this.remoteTrack }]
  setRemoteDescription = async (description: RTCSessionDescriptionInit) => { this.remoteDescription = description }
  setLocalDescription = async (description: RTCSessionDescriptionInit) => { this.localDescription = description }
  createAnswer = async () => ({ type: "answer" as const, sdp: "answer" })
}

describe("voice peer cleanup", () => {
  const originals = new Map<string, PropertyDescriptor | undefined>()
  const peers: FakePeerConnection[] = []
  const handlers = new Map<string, (...args: never[]) => void>()
  const localTrack = { kind: "audio", stop: jest.fn(), enabled: true, onended: null, getSettings: () => ({ deviceId: "initial", echoCancellation: true, noiseSuppression: false }) }
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
      isSecureContext: true, setInterval: jest.fn(() => 1), clearInterval: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(),
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
    effects.length = 0
    peers.length = 0
    handlers.clear()
    jest.clearAllMocks()
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(localStream)
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

  it("replaces every peer's microphone before stopping the old muted track", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    await voice.start()
    const signal = handlers.get("collaboration:voice:signal")!
    signal({ roomId: "room-1", fromSocketId: "remote-1", fromUserId: "user-1", kind: "offer", sdp: "offer" } as never)
    signal({ roomId: "room-1", fromSocketId: "remote-2", fromUserId: "user-2", kind: "offer", sdp: "offer" } as never)
    await new Promise(setImmediate)
    voice.toggleMute()
    const nextTrack = { kind: "audio", stop: jest.fn(), enabled: true, onended: null, getSettings: () => ({ deviceId: "new-mic", echoCancellation: true, noiseSuppression: true }) }
    const nextStream = { getTracks: () => [nextTrack], getAudioTracks: () => [nextTrack] } as unknown as MediaStream
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(nextStream)

    await voice.switchMicrophone("new-mic")

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ audio: { deviceId: { exact: "new-mic" }, echoCancellation: true, noiseSuppression: true }, video: false })
    expect(peers).toHaveLength(2)
    expect(peers.every((peer) => peer.sender.replaceTrack.mock.calls[0]?.[0] === nextTrack as unknown as MediaStreamTrack)).toBe(true)
    expect(nextTrack.enabled).toBe(false)
    expect(localTrack.stop).toHaveBeenCalledTimes(1)
    expect(nextTrack.stop).not.toHaveBeenCalled()
    expect(localTrack.onended).toBeNull()
    const inputUpdates = stateSetters[6].mock.calls.map(([value]) => typeof value === "function" ? value({ devices: [] }) : value)
    expect(inputUpdates).toContainEqual(expect.objectContaining({ deviceId: "new-mic" }))
    voice.stop()
    expect(nextTrack.stop).toHaveBeenCalledTimes(1)
  })

  it("keeps the original microphone when replacement fails", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    await voice.start()
    handlers.get("collaboration:voice:signal")!({ roomId: "room-1", fromSocketId: "remote-1", fromUserId: "user-1", kind: "offer", sdp: "offer" } as never)
    await new Promise(setImmediate)
    peers[0].sender.replaceTrack.mockRejectedValueOnce(new Error("replace failed"))
    const nextTrack = { kind: "audio", stop: jest.fn(), enabled: true, onended: null, getSettings: () => ({ deviceId: "new-mic" }) }
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce({ getTracks: () => [nextTrack], getAudioTracks: () => [nextTrack] })

    await voice.switchMicrophone("new-mic")

    expect(nextTrack.stop).toHaveBeenCalledTimes(1)
    expect(localTrack.stop).not.toHaveBeenCalled()
    expect(peers[0].sender.track).toEqual({ kind: "audio" })
    voice.stop()
  })

  it("uses the current microphone for peers joining after a device change", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    await voice.start()
    const nextTrack = { kind: "audio", stop: jest.fn(), enabled: true, onended: null, getSettings: () => ({ deviceId: "new-mic" }) }
    const nextStream = { getTracks: () => [nextTrack], getAudioTracks: () => [nextTrack] } as unknown as MediaStream
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(nextStream)
    await voice.switchMicrophone("new-mic")

    handlers.get("collaboration:voice:signal")!({ roomId: "room-1", fromSocketId: "remote-new", fromUserId: "user-new", kind: "offer", sdp: "offer" } as never)
    await new Promise(setImmediate)

    expect(peers).toHaveLength(1)
    expect(peers[0].addTrack).toHaveBeenCalledWith(nextTrack, nextStream)
    expect(peers[0].addTrack).not.toHaveBeenCalledWith(localTrack, localStream)
    voice.stop()
  })

  it("cleans local and peer tracks on disconnect", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    const cleanups = effects.map((effect) => effect()).filter((cleanup): cleanup is () => void => typeof cleanup === "function")
    await voice.start()
    handlers.get("collaboration:voice:signal")!({ roomId: "room-1", fromSocketId: "remote-1", fromUserId: "user-1", kind: "offer", sdp: "offer" } as never)
    await new Promise(setImmediate)
    handlers.get("disconnect")!()
    expect(localTrack.stop).toHaveBeenCalledTimes(1)
    expect(peers[0].close).toHaveBeenCalledTimes(1)
    expect(handlers.size).toBe(0)
    cleanups.forEach((cleanup) => cleanup())
    expect(localTrack.stop).toHaveBeenCalledTimes(1)
  })

  it("stops the microphone and peers when the room unmounts", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    const cleanups = effects.map((effect) => effect()).filter((cleanup): cleanup is () => void => typeof cleanup === "function")
    await voice.start()
    handlers.get("collaboration:voice:signal")!({ roomId: "room-1", fromSocketId: "remote-1", fromUserId: "user-1", kind: "offer", sdp: "offer" } as never)
    await new Promise(setImmediate)

    cleanups.forEach((cleanup) => cleanup())
    expect(localTrack.stop).toHaveBeenCalledTimes(1)
    expect(peers[0].close).toHaveBeenCalledTimes(1)
    expect(socket.emit).toHaveBeenCalledWith("collaboration:voice:leave", { roomId: "room-1" })
    expect(handlers.size).toBe(0)
  })

  it("stops a newly granted microphone if the room closes during device switching", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    await voice.start()
    let resolveCapture!: (stream: MediaStream) => void
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockReturnValueOnce(new Promise<MediaStream>((resolve) => { resolveCapture = resolve }))
    const switching = voice.switchMicrophone("new-mic")
    voice.stop()
    const nextTrack = { kind: "audio", stop: jest.fn(), enabled: true }
    resolveCapture({ getTracks: () => [nextTrack], getAudioTracks: () => [nextTrack] } as unknown as MediaStream)
    await switching

    expect(localTrack.stop).toHaveBeenCalledTimes(1)
    expect(nextTrack.stop).toHaveBeenCalledTimes(1)
  })

  it("ends voice when the active microphone is removed", async () => {
    const voice = useCollaborationVoice("room-1", true, () => socket)
    await voice.start()
    const ended = localTrack.onended as unknown as () => void
    ended()

    expect(localTrack.stop).toHaveBeenCalledTimes(1)
    expect(socket.emit).toHaveBeenCalledWith("collaboration:voice:leave", { roomId: "room-1" })
    expect(handlers.size).toBe(0)
  })
})
