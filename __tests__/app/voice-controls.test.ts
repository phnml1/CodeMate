import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MicrophoneLevel, RemoteAudio, VoiceParticipantBadge } from "@/components/collaboration/VoiceControls"
import { nextVoiceActivity, useRemoteSpeaking } from "@/hooks/useRemoteSpeaking"

const effects: Array<() => void | (() => void)> = []
const audio = {
  volume: 1,
  muted: false,
  srcObject: null as MediaStream | null,
  sinkId: "",
  setSinkId: jest.fn(async (id: string) => { audio.sinkId = id }),
  play: jest.fn(async () => {}),
  pause: jest.fn(),
}

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useRef: () => ({ current: audio }),
  useState: (value: unknown) => [value, jest.fn()],
  useEffect: (effect: () => void | (() => void)) => { effects.push(effect) },
}))

jest.mock("@/hooks/useCollaborationVoice", () => ({ useCollaborationVoice: jest.fn() }))

describe("remote voice playback", () => {
  beforeEach(() => {
    effects.length = 0
    audio.volume = 1
    audio.muted = false
    audio.srcObject = null
    audio.sinkId = ""
    audio.setSinkId.mockReset().mockImplementation(async (id: string) => { audio.sinkId = id })
    audio.play.mockClear()
    audio.pause.mockClear()
  })

  it("sets the participant volume before playback and detaches audio on cleanup", () => {
    const stream = {} as MediaStream
    const playbackSettings: Array<{ volume: number; muted: boolean }> = []
    audio.play.mockImplementation(async () => {
      playbackSettings.push({ volume: audio.volume, muted: audio.muted })
    })
    RemoteAudio({ stream, volume: 0.5, muted: true })
    const cleanups = effects.map((effect) => effect())

    expect(audio.volume).toBe(0.5)
    expect(audio.muted).toBe(true)
    expect(audio.srcObject).toBe(stream)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(playbackSettings).toEqual([{ volume: 0.5, muted: true }])

    cleanups.forEach((cleanup) => { if (cleanup) cleanup() })
    expect(audio.pause).toHaveBeenCalledTimes(1)
    expect(audio.srcObject).toBeNull()
  })

  it("selects the output before playing and restores the default when selection fails", async () => {
    const stream = {} as MediaStream
    const onOutputError = jest.fn()
    audio.setSinkId.mockRejectedValueOnce(new Error("device removed"))
    RemoteAudio({ stream, volume: 0.5, muted: false, sinkId: "headset", onOutputError })
    const cleanups = effects.map((effect) => effect())
    await new Promise(setImmediate)

    expect(audio.setSinkId.mock.calls.map(([id]) => id)).toEqual(["headset", ""])
    expect(onOutputError).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(audio.sinkId).toBe("")
    cleanups.forEach((cleanup) => { if (cleanup) cleanup() })
    expect(audio.srcObject).toBeNull()
  })

  it("routes received audio to a selected output before playback", async () => {
    RemoteAudio({ stream: {} as MediaStream, volume: 0.5, muted: false, sinkId: "headset" })
    const cleanups = effects.map((effect) => effect())
    await new Promise(setImmediate)
    expect(audio.setSinkId).toHaveBeenCalledWith("headset")
    expect(audio.sinkId).toBe("headset")
    expect(audio.play).toHaveBeenCalledTimes(1)
    cleanups.forEach((cleanup) => { if (cleanup) cleanup() })
  })

  it("disconnects the local-only input meter on unmount", () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
    const source = { connect: jest.fn(), disconnect: jest.fn() }
    const analyser = { fftSize: 0, getFloatTimeDomainData: jest.fn(), disconnect: jest.fn() }
    const context = { createMediaStreamSource: jest.fn(() => source), createAnalyser: jest.fn(() => analyser), close: jest.fn(async () => {}) }
    const fakeWindow = { AudioContext: jest.fn(() => context), setInterval: jest.fn(() => 1), clearInterval: jest.fn() }
    Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow })
    try {
      const stream = {} as MediaStream
      MicrophoneLevel({ stream, muted: false })
      const cleanups = effects.map((effect) => effect())
      expect(context.createMediaStreamSource).toHaveBeenCalledWith(stream)
      expect(source.connect).toHaveBeenCalledWith(analyser)
      expect(fakeWindow.setInterval).toHaveBeenCalledTimes(1)
      cleanups.forEach((cleanup) => { if (cleanup) cleanup() })
      expect(fakeWindow.clearInterval).toHaveBeenCalledWith(1)
      expect(source.disconnect).toHaveBeenCalledTimes(1)
      expect(context.close).toHaveBeenCalledTimes(1)
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
      else Reflect.deleteProperty(globalThis, "window")
    }
  })

  it("identifies the speaking participant without changing the badge size", () => {
    const speaking = renderToStaticMarkup(React.createElement(VoiceParticipantBadge, { userName: "Mina", speaking: true }))
    const quiet = renderToStaticMarkup(React.createElement(VoiceParticipantBadge, { userName: "Mina", speaking: false }))

    expect(speaking).toContain('data-speaking="true"')
    expect(speaking).toContain('aria-label="Mina 말하는 중"')
    expect(speaking).toContain("border-emerald-500")
    expect(quiet).toContain('data-speaking="false"')
    expect(quiet).not.toContain("말하는 중")
    expect(quiet).toContain("border-slate-200")
  })

  it("holds the voice indicator briefly after audio falls silent", () => {
    expect(nextVoiceActivity(0, 1_000, null)).toEqual({ speaking: false, lastVoiceAt: null })
    expect(nextVoiceActivity(0.03, 1_000, null)).toEqual({ speaking: true, lastVoiceAt: 1_000 })
    expect(nextVoiceActivity(0, 1_300, 1_000)).toEqual({ speaking: true, lastVoiceAt: 1_000 })
    expect(nextVoiceActivity(0, 1_350, 1_000)).toEqual({ speaking: false, lastVoiceAt: 1_000 })
  })

  it("disconnects remote audio analysis when the call ends", () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
    const source = { connect: jest.fn(), disconnect: jest.fn() }
    const analyser = { fftSize: 0, getFloatTimeDomainData: jest.fn(), disconnect: jest.fn() }
    const context = {
      state: "running", createMediaStreamSource: jest.fn(() => source),
      createAnalyser: jest.fn(() => analyser), resume: jest.fn(async () => {}), close: jest.fn(async () => {}),
    }
    const fakeWindow = {
      AudioContext: jest.fn(() => context), setInterval: jest.fn(() => 1), clearInterval: jest.fn(),
      addEventListener: jest.fn(), removeEventListener: jest.fn(),
    }
    Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow })
    try {
      const stream = {} as MediaStream
      useRemoteSpeaking({ peer: stream }, true)
      const cleanups = effects.map((effect) => effect())

      expect(context.createMediaStreamSource).toHaveBeenCalledWith(stream)
      expect(source.connect).toHaveBeenCalledWith(analyser)
      expect(fakeWindow.setInterval).toHaveBeenCalledTimes(1)

      cleanups.forEach((cleanup) => { if (cleanup) cleanup() })
      expect(fakeWindow.clearInterval).toHaveBeenCalledWith(1)
      expect(source.disconnect).toHaveBeenCalledTimes(1)
      expect(analyser.disconnect).toHaveBeenCalledTimes(1)
      expect(context.close).toHaveBeenCalledTimes(1)
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
      else Reflect.deleteProperty(globalThis, "window")
    }
  })
})
