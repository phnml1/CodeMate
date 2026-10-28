"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Headphones, Loader2, Mic, MicOff, PhoneOff, Settings2, Volume2, VolumeX } from "lucide-react"
import { Popover } from "radix-ui"
import { Button } from "@/components/ui/button"
import { useCollaborationVoice } from "@/hooks/useCollaborationVoice"
import { useRemoteSpeaking } from "@/hooks/useRemoteSpeaking"
import type { CollaborationClientSocket } from "@/hooks/useCollaborationRoomSocket"

const DEFAULT_PLAYBACK_VOLUME = 0.5
type PlaybackSetting = { volume: number; muted: boolean }
type AudioOutputDevices = MediaDevices & { selectAudioOutput?: () => Promise<MediaDeviceInfo> }
type OutputAudio = HTMLAudioElement & { setSinkId?: (id: string) => Promise<void>; sinkId?: string }

export function RemoteAudio({ stream, volume, muted, sinkId = "", onOutputError }: {
  stream: MediaStream
  volume: number
  muted: boolean
  sinkId?: string
  onOutputError?: () => void
}) {
  const ref = useRef<HTMLAudioElement>(null)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])
  useEffect(() => {
    const audio = ref.current as OutputAudio | null
    if (!audio) return
    let active = true
    audio.srcObject = stream
    const play = async () => {
      try {
        if (audio.setSinkId && audio.sinkId !== sinkId) await audio.setSinkId(sinkId)
      } catch {
        if (!active) return
        onOutputError?.()
        await audio.setSinkId?.("").catch(() => {})
      }
      if (!active) return
      try {
        await audio.play()
        if (active) setBlocked(false)
      } catch {
        if (active) setBlocked(true)
      }
    }
    void play()
    return () => {
      active = false
      audio.pause()
      audio.srcObject = null
    }
  }, [stream, sinkId, onOutputError])
  return <>
    <audio ref={ref} playsInline />
    {blocked && !muted && <Button type="button" variant="outline" size="xs" onClick={() => void ref.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true))}><Volume2 /> 소리 재생</Button>}
  </>
}

export function MicrophoneLevel({ stream, muted }: { stream: MediaStream; muted: boolean }) {
  const [level, setLevel] = useState(0)
  const [available, setAvailable] = useState(() => typeof window !== "undefined" && !!window.AudioContext)
  useEffect(() => {
    if (muted) return
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return
    let context: AudioContext | null = null
    try {
      const audioContext = new AudioContextClass()
      context = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      const timer = window.setInterval(() => {
        analyser.getFloatTimeDomainData(samples)
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length)
        setLevel(Math.min(100, Math.round(rms * 300)))
      }, 100)
      return () => {
        window.clearInterval(timer)
        source.disconnect()
        analyser.disconnect()
        void audioContext.close()
      }
    } catch {
      void context?.close()
      queueMicrotask(() => setAvailable(false))
    }
  }, [stream, muted])

  return <div className="space-y-1">
    <span className="text-xs text-muted-foreground">마이크 입력 레벨</span>
    {available ? <div role="meter" aria-label="마이크 입력 레벨" aria-valuemin={0} aria-valuemax={100} aria-valuenow={muted ? 0 : level} className="h-1.5 w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
      <div className="h-full bg-emerald-600" style={{ width: `${muted ? 0 : level}%` }} />
    </div> : <p className="text-xs text-muted-foreground">이 브라우저에서는 입력 레벨을 확인할 수 없습니다.</p>}
  </div>
}

export function VoiceParticipantBadge({ userName, speaking, failed = false }: { userName: string; speaking: boolean; failed?: boolean }) {
  return <span
    data-speaking={speaking ? "true" : "false"}
    aria-label={`${userName}${speaking ? " 말하는 중" : ""}${failed ? " 연결 실패" : ""}`}
    title={`${userName}${speaking ? " 말하는 중" : ""}${failed ? " 연결 실패" : ""}`}
    className={`inline-flex max-w-28 min-w-0 items-center gap-1 rounded-full border px-1.5 py-0.5 ${speaking
      ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
  >
    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${speaking ? "bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700" : "bg-slate-400 dark:bg-slate-500"}`} />
    <span className="truncate">{userName}</span>
  </span>
}

export default function VoiceControls({ roomId, connected, getSocket }: {
  roomId: string
  connected: boolean
  getSocket: () => CollaborationClientSocket | null
}) {
  const voice = useCollaborationVoice(roomId, connected, getSocket)
  const speaking = useRemoteSpeaking(voice.streams, voice.phase === "connected")
  const [playback, setPlayback] = useState<Record<string, PlaybackSetting>>({})
  const [outputDevice, setOutputDevice] = useState<MediaDeviceInfo | null>(null)
  const [outputError, setOutputError] = useState<string | null>(null)
  const busy = voice.phase === "requesting" || voice.phase === "joining"
  const outputDevices = typeof navigator !== "undefined" ? navigator.mediaDevices as AudioOutputDevices | undefined : undefined
  const canSelectOutput = !!outputDevices?.selectAudioOutput && typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype
  const handleOutputError = useCallback(() => {
    setOutputDevice(null)
    setOutputError("출력 장치를 사용할 수 없어 기본 출력으로 변경했습니다.")
  }, [])

  useEffect(() => {
    if (!outputDevice || !outputDevices?.enumerateDevices) return
    const onDeviceChange = () => {
      void outputDevices.enumerateDevices().then((devices) => {
        if (!devices.some((device) => device.kind === "audiooutput" && device.deviceId === outputDevice.deviceId)) {
          setOutputDevice(null)
          setOutputError("선택한 출력 장치가 연결 해제되어 기본 출력으로 변경했습니다.")
        }
      }).catch(() => {})
    }
    outputDevices.addEventListener?.("devicechange", onDeviceChange)
    return () => outputDevices.removeEventListener?.("devicechange", onDeviceChange)
  }, [outputDevice, outputDevices])

  const selectOutput = async () => {
    try {
      const selected = await outputDevices?.selectAudioOutput?.()
      if (!selected) return
      setOutputDevice(selected)
      setOutputError(null)
    } catch (error) {
      setOutputError(error instanceof DOMException && error.name === "NotAllowedError"
        ? "출력 장치 선택이 취소됐거나 권한이 없습니다."
        : "출력 장치를 선택하지 못했습니다.")
    }
  }

  const updatePlayback = (socketId: string, update: Partial<PlaybackSetting>) => {
    setPlayback((current) => {
      const previous = current[socketId] ?? { volume: DEFAULT_PLAYBACK_VOLUME, muted: false }
      return { ...current, [socketId]: { ...previous, ...update } }
    })
  }

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-xs">
      {voice.phase === "connected" ? (
        <>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400" title="음성 대화 참여 중">
            <Headphones className="size-4" /> 음성 {voice.participants.length + 1}/4
          </span>
          <Button type="button" variant={voice.muted ? "secondary" : "ghost"} size="icon-xs" title={voice.muted ? "마이크 켜기" : "마이크 끄기"} aria-label={voice.muted ? "마이크 켜기" : "마이크 끄기"} aria-pressed={voice.muted} onClick={voice.toggleMute}>
            {voice.muted ? <MicOff /> : <Mic />}
          </Button>
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" title="오디오 설정" aria-label="오디오 설정"><Settings2 /></Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" sideOffset={8} className="bg-popover text-popover-foreground z-50 w-72 max-w-[calc(100vw-1rem)] rounded-md border p-3 shadow-md">
                <p className="mb-3 text-sm font-medium">오디오 설정</p>
                <div className="space-y-3 border-b pb-3">
                  <label className="block space-y-1 text-xs">
                    <span>마이크</span>
                    <select value={voice.input.deviceId === "default" ? "" : voice.input.deviceId} disabled={voice.input.switching} onChange={(event) => void voice.switchMicrophone(event.target.value)} className="w-full min-w-0 border bg-background px-2 py-1.5 text-foreground">
                      <option value="">시스템 기본 마이크</option>
                      {voice.input.deviceId && voice.input.deviceId !== "default" && !voice.input.devices.some((device) => device.deviceId === voice.input.deviceId) && <option value={voice.input.deviceId}>현재 마이크</option>}
                      {voice.input.devices.filter((device) => device.deviceId !== "default").map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `마이크 ${index + 1}`}</option>)}
                    </select>
                  </label>
                  {voice.input.switching && <span className="inline-flex items-center gap-1 text-xs"><Loader2 className="size-3 animate-spin" /> 마이크 변경 중</span>}
                  {voice.input.error && <p role="alert" className="text-xs text-rose-600">{voice.input.error}</p>}
                  {voice.input.stream && <MicrophoneLevel stream={voice.input.stream} muted={voice.muted} />}
                  <div className="flex min-w-0 items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate" title={outputDevice?.label}>출력: {outputDevice?.label || "시스템 기본"}</span>
                    {canSelectOutput && <Button type="button" variant="outline" size="xs" onClick={() => void selectOutput()}>출력 선택</Button>}
                  </div>
                  {outputError && <p role="alert" className="text-xs text-rose-600">{outputError}</p>}
                </div>
                <p className="my-3 text-sm font-medium">상대 소리</p>
                {voice.participants.length === 0 && <p className="text-muted-foreground text-xs">참여자를 기다리는 중</p>}
                <div className="space-y-3">
                  {voice.participants.map((participant) => {
                    const setting = playback[participant.socketId] ?? { volume: DEFAULT_PLAYBACK_VOLUME, muted: false }
                    return <div key={participant.socketId} className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <VoiceParticipantBadge userName={participant.userName} speaking={!!speaking[participant.socketId]} failed={voice.connectionStates[participant.socketId] === "failed"} />
                        <Button type="button" variant="ghost" size="icon-xs" title={`${participant.userName} ${setting.muted ? "재생 켜기" : "재생 음소거"}`} aria-label={`${participant.userName} ${setting.muted ? "재생 켜기" : "재생 음소거"}`} aria-pressed={setting.muted} onClick={() => updatePlayback(participant.socketId, { muted: !setting.muted })}>
                          {setting.muted ? <VolumeX /> : <Volume2 />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="range" min="0" max="100" value={Math.round(setting.volume * 100)} aria-label={`${participant.userName} 재생 음량`} onChange={(event) => updatePlayback(participant.socketId, { volume: Number(event.target.value) / 100 })} className="min-w-0 flex-1 accent-emerald-600" />
                        <span className="w-8 text-right text-xs tabular-nums">{Math.round(setting.volume * 100)}%</span>
                      </div>
                    </div>
                  })}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <Button type="button" variant="ghost" size="icon-xs" title="음성 대화 나가기" aria-label="음성 대화 나가기" onClick={() => { voice.stop(); setPlayback({}); setOutputDevice(null); setOutputError(null) }}><PhoneOff /></Button>
          <span aria-label="음성 참여자" className="flex min-w-0 max-w-48 flex-wrap gap-1">
            {voice.participants.map((peer) => <VoiceParticipantBadge key={peer.socketId} userName={peer.userName} speaking={!!speaking[peer.socketId]} failed={voice.connectionStates[peer.socketId] === "failed"} />)}
          </span>
        </>
      ) : (
        <Button type="button" variant="outline" size="xs" disabled={!connected || busy} onClick={() => { setPlayback({}); setOutputDevice(null); setOutputError(null); void voice.start() }} title="음성 대화 참여">
          {busy ? <Loader2 className="animate-spin" /> : <Headphones />} {busy ? "연결 중" : "음성 참여"}
        </Button>
      )}
      {voice.error && <span role="alert" className="max-w-56 text-rose-600 dark:text-rose-400">{voice.error}</span>}
      {Object.entries(voice.streams).map(([socketId, stream]) => {
        const setting = playback[socketId] ?? { volume: DEFAULT_PLAYBACK_VOLUME, muted: false }
        return <RemoteAudio key={socketId} stream={stream} volume={setting.volume} muted={setting.muted} sinkId={outputDevice?.deviceId} onOutputError={handleOutputError} />
      })}
    </div>
  )
}
