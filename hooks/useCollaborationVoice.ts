"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { CollaborationClientSocket } from "@/hooks/useCollaborationRoomSocket"
import { COLLABORATION_VOICE_HEARTBEAT_MS } from "@/lib/collaboration/voice-protocol"
import type { CollaborationVoiceSignal } from "@/lib/collaboration/voice-protocol"
import type { CollaborationVoiceParticipant, CollaborationVoiceSignalEvent } from "@/lib/socket/types"

type VoicePhase = "idle" | "requesting" | "joining" | "connected" | "error"
type Peer = { connection: RTCPeerConnection; queuedCandidates: RTCIceCandidateInit[] }
type VoiceSession = {
  socket: CollaborationClientSocket
  stream: MediaStream
  peers: Map<string, Peer>
  onJoined: (data: { roomId: string; participant: CollaborationVoiceParticipant }) => void
  onLeft: (data: { roomId: string; socketId: string }) => void
  onSignal: (signal: CollaborationVoiceSignalEvent) => void
  onDisconnect: () => void
  heartbeat: number | null
}

function closePeer(peer: Peer) {
  const { connection } = peer
  connection.ontrack = null
  connection.onicecandidate = null
  connection.onconnectionstatechange = null
  for (const receiver of connection.getReceivers()) receiver.track?.stop()
  connection.close()
}

function voiceError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "마이크 권한이 거부됐습니다. 브라우저 권한을 확인해 주세요."
  if (error instanceof DOMException && error.name === "NotFoundError") return "사용할 수 있는 마이크가 없습니다."
  return error instanceof Error ? error.message : "음성 연결에 실패했습니다."
}

export function useCollaborationVoice(roomId: string, connected: boolean, getSocket: () => CollaborationClientSocket | null) {
  const [phase, setPhase] = useState<VoicePhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [participants, setParticipants] = useState<CollaborationVoiceParticipant[]>([])
  const [streams, setStreams] = useState<Record<string, MediaStream>>({})
  const [connectionStates, setConnectionStates] = useState<Record<string, RTCPeerConnectionState>>({})
  const sessionRef = useRef<VoiceSession | null>(null)
  const generationRef = useRef(0)

  const stop = useCallback((notifyServer = true, nextError?: string) => {
    generationRef.current++
    const session = sessionRef.current
    sessionRef.current = null
    if (session) {
      if (session.heartbeat !== null) window.clearInterval(session.heartbeat)
      session.socket.off("collaboration:voice:participant-joined", session.onJoined)
      session.socket.off("collaboration:voice:participant-left", session.onLeft)
      session.socket.off("collaboration:voice:signal", session.onSignal)
      session.socket.off("disconnect", session.onDisconnect)
      if (notifyServer && session.socket.connected) {
        session.socket.emit("collaboration:voice:leave", { roomId })
      }
      for (const peer of session.peers.values()) closePeer(peer)
      session.peers.clear()
      for (const track of session.stream.getTracks()) track.stop()
    }
    setParticipants([])
    setStreams({})
    setConnectionStates({})
    setMuted(false)
    setError(nextError ?? null)
    setPhase(nextError ? "error" : "idle")
  }, [roomId])

  const start = useCallback(async () => {
    if (sessionRef.current || !connected) return
    const socket = getSocket()
    if (!socket?.connected) return
    const generation = ++generationRef.current
    setPhase("requesting")
    setError(null)
    let stream: MediaStream | null = null
    try {
      if (!window.isSecureContext) {
        throw new Error("이 주소는 마이크를 사용할 수 없습니다. HTTPS 또는 같은 기기의 localhost로 접속해 주세요.")
      }
      const response = await fetch(`/api/collaboration/rooms/${encodeURIComponent(roomId)}/voice-config`, { cache: "no-store" })
      if (!response.ok) throw new Error("음성 연결 설정을 불러오지 못했습니다.")
      const config = await response.json() as { iceServers: RTCIceServer[] }
      if (!Array.isArray(config.iceServers)) throw new Error("음성 연결 설정이 올바르지 않습니다.")
      if (generation !== generationRef.current || !socket.connected) return
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("이 브라우저에서는 마이크를 사용할 수 없습니다.")
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      if (generation !== generationRef.current || !socket.connected) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      setPhase("joining")

      const sendSignal = (signal: CollaborationVoiceSignal) => {
        socket.emit("collaboration:voice:signal", signal, (ack) => {
          if (!ack.ok && generation === generationRef.current && ack.error.code === "VOICE_NOT_JOINED") {
            stop(false, "음성 연결이 종료됐습니다. 다시 참여해 주세요.")
          }
        })
      }
      const peers = new Map<string, Peer>()
      const offering = new Set<string>()
      const ensurePeer = (socketId: string) => {
        const existing = peers.get(socketId)
        if (existing) return existing
        const connection = new RTCPeerConnection({ iceServers: config.iceServers })
        const peer: Peer = { connection, queuedCandidates: [] }
        peers.set(socketId, peer)
        for (const track of stream!.getAudioTracks()) connection.addTrack(track, stream!)
        connection.onicecandidate = ({ candidate }) => {
          if (candidate && generation === generationRef.current) {
            const ice = candidate.toJSON()
            sendSignal({ roomId, toSocketId: socketId, kind: "ice", candidate: {
              candidate: ice.candidate ?? "",
              sdpMid: ice.sdpMid ?? null,
              sdpMLineIndex: ice.sdpMLineIndex ?? null,
              usernameFragment: ice.usernameFragment ?? null,
            } })
          }
        }
        connection.ontrack = ({ streams: remoteStreams, track }) => {
          const remote = remoteStreams[0] ?? new MediaStream([track])
          if (generation === generationRef.current && peers.get(socketId) === peer) {
            setStreams((current) => ({ ...current, [socketId]: remote }))
          }
        }
        connection.onconnectionstatechange = () => {
          if (generation === generationRef.current && peers.get(socketId) === peer) {
            setConnectionStates((current) => ({ ...current, [socketId]: connection.connectionState }))
          }
        }
        return peer
      }
      const offerPeer = async (socketId: string) => {
        if (!socket.id || socket.id >= socketId || offering.has(socketId)) return
        const peer = ensurePeer(socketId)
        if (peer.connection.signalingState !== "stable") return
        offering.add(socketId)
        try {
          const offer = await peer.connection.createOffer()
          await peer.connection.setLocalDescription(offer)
          if (generation === generationRef.current && peer.connection.localDescription?.sdp) {
            sendSignal({ roomId, toSocketId: socketId, kind: "offer", sdp: peer.connection.localDescription.sdp })
          }
        } finally {
          offering.delete(socketId)
        }
      }
      const onJoined: VoiceSession["onJoined"] = ({ roomId: incomingRoomId, participant }) => {
        if (incomingRoomId !== roomId || generation !== generationRef.current) return
        setParticipants((current) => current.some((item) => item.socketId === participant.socketId) ? current : [...current, participant])
        void offerPeer(participant.socketId).catch(() => {
          if (generation === generationRef.current) setError("참여자와 음성 연결에 실패했습니다.")
        })
      }
      const onLeft: VoiceSession["onLeft"] = ({ roomId: incomingRoomId, socketId }) => {
        if (incomingRoomId !== roomId || generation !== generationRef.current) return
        const peer = peers.get(socketId)
        if (peer) closePeer(peer)
        peers.delete(socketId)
        setParticipants((current) => current.filter((item) => item.socketId !== socketId))
        setStreams((current) => { const next = { ...current }; delete next[socketId]; return next })
        setConnectionStates((current) => { const next = { ...current }; delete next[socketId]; return next })
      }
      const onSignal: VoiceSession["onSignal"] = (signal) => {
        if (signal.roomId !== roomId || generation !== generationRef.current) return
        setParticipants((current) => current.some((item) => item.socketId === signal.fromSocketId)
          ? current
          : [...current, { socketId: signal.fromSocketId, userId: signal.fromUserId, userName: "참여자" }])
        void (async () => {
          const peer = ensurePeer(signal.fromSocketId)
          if (signal.kind === "ice") {
            if (peer.connection.remoteDescription) await peer.connection.addIceCandidate(signal.candidate)
            else peer.queuedCandidates.push(signal.candidate)
            return
          }
          if (signal.kind === "answer" && peer.connection.signalingState !== "have-local-offer") return
          await peer.connection.setRemoteDescription({ type: signal.kind, sdp: signal.sdp })
          for (const candidate of peer.queuedCandidates.splice(0)) await peer.connection.addIceCandidate(candidate)
          if (signal.kind === "offer") {
            const answer = await peer.connection.createAnswer()
            await peer.connection.setLocalDescription(answer)
            if (peer.connection.localDescription?.sdp) {
              sendSignal({ roomId, toSocketId: signal.fromSocketId, kind: "answer", sdp: peer.connection.localDescription.sdp })
            }
          }
        })().catch(() => {
          if (generation === generationRef.current) setError("참여자와 음성 연결에 실패했습니다.")
        })
      }
      const onDisconnect = () => stop(false, "실시간 연결이 끊겨 음성 대화가 종료됐습니다.")
      socket.on("collaboration:voice:participant-joined", onJoined)
      socket.on("collaboration:voice:participant-left", onLeft)
      socket.on("collaboration:voice:signal", onSignal)
      socket.on("disconnect", onDisconnect)
      sessionRef.current = { socket, stream, peers, onJoined, onLeft, onSignal, onDisconnect, heartbeat: null }
      const ack = await socket.timeout(5_000).emitWithAck("collaboration:voice:join", { roomId })
      if (generation !== generationRef.current) return
      if (!ack.ok) {
        const message = ack.error.code === "VOICE_FULL" ? "음성 대화 정원은 4명입니다." :
          ack.error.code === "VOICE_ALREADY_JOINED" ? "다른 탭에서 이미 음성 대화 중입니다." :
          ack.error.code === "VOICE_DISABLED" ? "음성 대화가 비활성화되어 있습니다." :
          ack.error.code === "VOICE_UNAVAILABLE" ? "음성 서버에 연결할 수 없습니다." : ack.error.message
        throw new Error(message)
      }
      setParticipants((current) => {
        const byId = new Map(current.map((participant) => [participant.socketId, participant]))
        for (const participant of ack.participants ?? []) byId.set(participant.socketId, participant)
        return [...byId.values()]
      })
      setPhase("connected")
      for (const participant of ack.participants ?? []) {
        void offerPeer(participant.socketId).catch(() => {
          if (generation === generationRef.current) setError("참여자와 음성 연결에 실패했습니다.")
        })
      }
      sessionRef.current.heartbeat = window.setInterval(() => {
        void socket.timeout(5_000).emitWithAck("collaboration:voice:heartbeat", { roomId })
          .then((result) => { if (!result.ok) stop(false, "음성 연결이 종료됐습니다. 다시 참여해 주세요.") })
          .catch(() => stop(false, "음성 연결이 끊겼습니다. 다시 참여해 주세요."))
      }, COLLABORATION_VOICE_HEARTBEAT_MS)
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (generation === generationRef.current) stop(true, "마이크 연결이 종료됐습니다.")
        }
      })
    } catch (nextError) {
      if (generation !== generationRef.current) return
      if (sessionRef.current) stop(true, voiceError(nextError))
      else {
        stream?.getTracks().forEach((track) => track.stop())
        setError(voiceError(nextError))
        setPhase("error")
      }
    }
  }, [connected, getSocket, roomId, stop])

  const toggleMute = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    const nextMuted = !muted
    for (const track of session.stream.getAudioTracks()) track.enabled = !nextMuted
    setMuted(nextMuted)
  }, [muted])

  useEffect(() => {
    if (!connected && sessionRef.current) stop(false, "실시간 연결이 끊겨 음성 대화가 종료됐습니다.")
  }, [connected, stop])
  useEffect(() => {
    const onPageHide = () => stop(false)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      window.removeEventListener("pagehide", onPageHide)
      stop(true)
    }
  }, [stop])

  return { phase, error, muted, participants, streams, connectionStates, start, stop, toggleMute }
}
