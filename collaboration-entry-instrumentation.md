# Collaboration entry timing

This opt-in instrumentation splits existing-room entry into browser navigation, room RSC, code commit, token issuance, and Socket.IO join. It does not change fetch order, cache settings, membership behavior, or the visible UI.

## Enable

1. For server phase logs and the token endpoint's `Server-Timing` header, set `COLLABORATION_PERF_LOGS=1` on the Next.js service and redeploy. Leave the Socket service unchanged. Remove the variable and redeploy when the investigation ends.
2. In the measurement browser tab, run `sessionStorage.setItem("codemate:collaboration-perf", "1")` on the same origin. This enables browser marks for that tab only. To turn them off, remove the key or close the tab.
3. On PR #189, keep the existing test room active in a second tab. For each round, load a fresh PR document, wait for its 31-file list, first diff row, and existing-room Enter button, hover about one second, then click Enter. Use the same viewport and HTTP-cache condition as the baseline.

## Browser timeline

The following marks use one browser clock. Use the first occurrence after `collaboration.entry.click` for initial entry; later occurrences may be reconnects or file switches.

| Mark or measure | Meaning |
| --- | --- |
| `entry.click` | Enter handler starts |
| `loading.commit` / `loading.paint-proxy` | Loading boundary DOM insertion and two subsequent animation frames |
| Room `_rsc` resource start/responseStart/responseEnd | Navigation request, first byte, and full response |
| `workspace.commit` | Workspace component first DOM commit, not paint |
| `files.commit` | Revision data is present in a committed workspace render |
| `diff.parse` measure | Selected patch parsing; React render retries may create extra samples |
| `diff.commit` / `diff.paint-proxy` | Diff table DOM commit and two subsequent animation frames |
| `join.start` | Client connection attempt starts |
| `token.start` / `token.done` | Socket-token fetch and JSON parse |
| `socket.connect.start` / `socket.connected` | WebSocket connection |
| `join.emit` / `join.ack` | Room join request and ack |
| `connected.commit` | Connected state appears in a committed workspace render |

The Performance panel can export a trace. The console can also inspect `performance.getEntriesByType("mark").filter((item) => item.name.startsWith("collaboration."))` and likewise inspect `"measure"`. Use Resource Timing for `_rsc`, revision files, messages, and socket-token. A zero `responseStart` can be a cache hit or unavailable timing, not zero-latency server work.

## Server timeline

With the server flag enabled, the Next.js service emits JSON logs for `collaboration.room.rsc` and `collaboration.token.issue`, containing `roomId`, `outcome`, `totalMs`, and phase durations. Room page phases are `auth`, `params`, `roomLookup`. **Its `totalMs` ends when the async page function returns; it excludes React serialization, streaming, network transfer, and browser rendering.** Compare it with full browser `_rsc` timing rather than treating them as equivalent.

Token endpoint phases are `auth`, `params`, `roomLookup`, `memberLookup`, `presence`, `memberUpsert`, and `sign`. The response exposes these durations in `Server-Timing` when enabled. Server and browser clocks are independent; compare durations or align by a response, not by subtracting absolute timestamps. Logs and marks contain no token, message body, or code content.

## Report

Collect 20 valid entries on PR #189 with about one second of hover. Report median and nearest-rank P90 for click-to-loading-shell, click-to-first-code, click-to-connected, `_rsc` response end, RSC-end-to-workspace-commit, workspace-commit-to-diff-commit, token request, token server phases, and join ack. Record duplicate requests and excluded attempts. `loading.paint-proxy` is recorded by an opt-in DOM observer. The workspace and diff can commit in the same React update, and child layout effects may run before parent effects, so treat a tiny negative gap as the same commit. Compare with the earlier PR #189 hover baseline, but do not call differences causal because deployment load and run order differ.
