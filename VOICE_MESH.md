# Experimental collaboration voice

This is an opt-in, audio-only WebRTC mesh for up to four distinct room members. Socket.IO carries only signaling; it does not relay audio. Recording is not supported.

## Configuration

Set `COLLABORATION_VOICE_ENABLED=1` on both Next.js and the standalone Socket service. It is disabled by default. Deploy the Socket service before enabling the Next.js UI.

The ICE configuration endpoint uses `stun:stun.l.google.com:19302` by default. Set `COLLABORATION_VOICE_STUN_URLS` to a comma-separated list of STUN URLs to change it. STUN-only calls may fail on restrictive networks.

For coturn relay, set `COLLABORATION_TURN_URLS` (comma-separated `turn:` or `turns:` URLs) and `COLLABORATION_TURN_SECRET` on the Next.js service. Configure coturn with `use-auth-secret` and the same `static-auth-secret`. The API issues one-hour time-limited credentials; never expose the shared secret to the browser. If TURN URLs are set without a secret, voice configuration returns 503.

Microphone access requires HTTPS or localhost. Only joined members of an active room can fetch ICE settings, and only sockets joined to that room can join voice or send signaling. A user can occupy one voice seat across tabs. Four concurrent seats are enforced through Redis when `REDIS_URL` is configured. A killed Socket process can hold a stale voice seat for up to 45 seconds.

## Audio controls

Each remote participant has independent playback volume (50% by default) and playback mute, separate from local microphone mute. On peer leave or voice exit, received tracks and peer connections are closed and audio elements are paused and detached. Automated cleanup tests cover these paths; real-device feedback and playback checks remain manual.

The audio settings panel lists available microphones after permission is granted. Switching acquires a new track, replaces the outgoing track on each peer, preserves mute, and stops the previous track only after success. A failed replacement rolls back or ends the voice session if rollback fails. Device removal or permission revocation ends the call when the active track stops.

Output selection is offered only where `selectAudioOutput()` and `HTMLMediaElement.setSinkId()` are available; otherwise playback follows the system default. The selected output is kept in memory for the current call only. If it disappears or switching fails, playback returns to the default output.

The settings panel shows a local-only microphone level meter and the requested echo-cancellation/noise-suppression state reported by `getSupportedConstraints()` and `getSettings()`. Unsupported and unreported values are not displayed as enabled. Audio samples and level history are not transmitted or persisted.

## Remaining manual validation

Reproduce feedback with two nearby devices, then repeat with one microphone muted, with headphones, and on separate networks. If feedback remains with headphones, inspect the number of remote tracks/audio elements and input gain before changing capture constraints. Recheck cleanup on device changes, disconnect, room end, and route exit on real browsers. Automatic voice rejoin is not implemented.

## TURN decision and validation

Keep STUN and add TURN as an alternative ICE path; do not force relay for normal calls that already work directly. TURN improves connectivity when NAT or firewall rules prevent a direct path, but relayed audio adds server traffic/cost and can add latency. It does not fix acoustic feedback between nearby speakers and microphones.

Before broad rollout, configure a reachable TURN service and matching secret, then test two accounts on different networks. In a test-only configuration, set `iceTransportPolicy: "relay"` to prove that the relay path actually carries audio. Check the selected candidate pair via WebRTC stats and record only candidate type, connection result, and setup duration; never log candidate addresses, SDP, credentials, or audio. Return to the default `all` policy for normal calls and compare direct and relayed connection success and setup time. Keep STUN-only operation as an explicitly limited demo option if TURN is not yet available.

## Manual check

1. Join the same collaboration room from two different accounts in separate browsers.
2. Click **음성 참여** in both. Confirm permission, audio playback, mute/unmute, and **음성 대화 나가기**.
3. Repeat with three and four people. A fifth voice participant should see the four-person limit while text chat remains usable.
4. Open audio settings. Confirm that the input meter reacts locally, and compare the reported echo-cancellation/noise-suppression state with the selected microphone. Switch microphones while muted and unmuted; the old device indicator should turn off without ending the call.
5. Where output selection is supported, choose a different speaker or headset and verify that remote audio moves there. Disconnect that device and confirm playback returns to the system default. On unsupported browsers, confirm the default output is shown.
6. Deny or revoke microphone permission, change routes, close a tab, and interrupt the Socket connection. Confirm the microphone indicator turns off and text chat continues.
7. Repeat from two different networks with TURN configured, including a forced-relay ICE test before production rollout.

This experiment does not provide automatic voice rejoin. The room and voice call are limited to four people; use an SFU before increasing that limit.
