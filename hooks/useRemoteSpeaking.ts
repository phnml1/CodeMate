"use client"

import { useEffect, useState } from "react"

const SAMPLE_INTERVAL_MS = 100
const VOICE_THRESHOLD = 0.018
const RELEASE_DELAY_MS = 350

export function nextVoiceActivity(level: number, now: number, lastVoiceAt: number | null) {
  if (level >= VOICE_THRESHOLD) return { speaking: true, lastVoiceAt: now }
  return { speaking: lastVoiceAt !== null && now - lastVoiceAt < RELEASE_DELAY_MS, lastVoiceAt }
}

export function useRemoteSpeaking(streams: Record<string, MediaStream>, active: boolean) {
  const [detected, setDetected] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!active || !window.AudioContext || Object.keys(streams).length === 0) return

    let context: AudioContext
    try {
      context = new window.AudioContext()
    } catch {
      return
    }
    const meters = Object.entries(streams).flatMap(([socketId, stream]) => {
      try {
        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        return [{ socketId, source, analyser, samples: new Float32Array(analyser.fftSize), lastVoiceAt: null as number | null }]
      } catch {
        return []
      }
    })

    if (meters.length === 0) {
      void context.close()
      return
    }

    const resume = () => {
      if (context.state === "suspended") void context.resume().catch(() => {})
    }
    resume()
    window.addEventListener("pointerdown", resume)
    window.addEventListener("keydown", resume)

    const timer = window.setInterval(() => {
      const now = Date.now()
      const next: Record<string, boolean> = {}
      for (const meter of meters) {
        meter.analyser.getFloatTimeDomainData(meter.samples)
        let power = 0
        for (const sample of meter.samples) power += sample * sample
        const activity = nextVoiceActivity(Math.sqrt(power / meter.samples.length), now, meter.lastVoiceAt)
        meter.lastVoiceAt = activity.lastVoiceAt
        next[meter.socketId] = activity.speaking
      }
      setDetected((previous) =>
        Object.keys(previous).length === Object.keys(next).length &&
        Object.entries(next).every(([socketId, speaking]) => previous[socketId] === speaking)
          ? previous
          : next
      )
    }, SAMPLE_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener("pointerdown", resume)
      window.removeEventListener("keydown", resume)
      for (const { source, analyser } of meters) {
        source.disconnect()
        analyser.disconnect()
      }
      void context.close()
    }
  }, [active, streams])

  return active
    ? Object.fromEntries(Object.keys(streams).map((socketId) => [socketId, !!detected[socketId]]))
    : {}
}
