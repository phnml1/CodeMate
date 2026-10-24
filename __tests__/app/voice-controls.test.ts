import { RemoteAudio } from "@/components/collaboration/VoiceControls"

const effects: Array<() => void | (() => void)> = []
const audio = {
  volume: 1,
  muted: false,
  srcObject: null as MediaStream | null,
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
})
