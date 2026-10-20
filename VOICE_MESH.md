# Experimental collaboration voice

This is an opt-in, audio-only WebRTC mesh for up to four distinct room members. Socket.IO carries only signaling; it does not relay audio. Recording is not supported.

## Configuration

Set `COLLABORATION_VOICE_ENABLED=1` on both Next.js and the standalone Socket service. It is disabled by default. Deploy the Socket service before enabling the Next.js UI.

The ICE configuration endpoint uses `stun:stun.l.google.com:19302` by default. Set `COLLABORATION_VOICE_STUN_URLS` to a comma-separated list of STUN URLs to change it. STUN-only calls may fail on restrictive networks.

For coturn relay, set `COLLABORATION_TURN_URLS` (comma-separated `turn:` or `turns:` URLs) and `COLLABORATION_TURN_SECRET` on the Next.js service. Configure coturn with `use-auth-secret` and the same `static-auth-secret`. The API issues one-hour time-limited credentials; never expose the shared secret to the browser. If TURN URLs are set without a secret, voice configuration returns 503.

Microphone access requires HTTPS or localhost. Only joined members of an active room can fetch ICE settings, and only sockets joined to that room can join voice or send signaling. A user can occupy one voice seat across tabs. Four concurrent seats are enforced through Redis when `REDIS_URL` is configured. A killed Socket process can hold a stale voice seat for up to 45 seconds.

## Manual check

1. Join the same collaboration room from two different accounts in separate browsers.
2. Click **음성 참여** in both. Confirm permission, audio playback, mute/unmute, and **음성 대화 나가기**.
3. Repeat with three and four people. A fifth voice participant should see the four-person limit while text chat remains usable.
4. Deny or revoke microphone permission, change routes, close a tab, and interrupt the Socket connection. Confirm the microphone indicator turns off and text chat continues.
5. Repeat from two different networks with TURN configured, including a forced-relay ICE test before production rollout.

This experiment does not provide device selection, automatic voice rejoin, or eight-person voice. Use an SFU rather than extending this mesh to the room's full eight-person capacity.
