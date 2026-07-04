# PR Detail Lighthouse 3-Run Performance Comparison

## 1. Measurement Context

이 문서는 PR 상세 페이지 성능 개선 전후 Lighthouse 측정값과, 해당 개선에 영향을 줬을 가능성이 높은 코드 변경사항을 정리한다.

비교 기준:

- Before: `feat/151-pr-search`와 #172 브랜치를 merge하기 직전의 `main`
- After: 위 변경사항을 반영한 이후의 PR 상세 페이지
- 측정 URL: `http://localhost:3000/pulls/cmotp4ehl001uokqdedir2ij1`
- 측정 도구: Lighthouse `13.0.2`
- 환경: Emulated Desktop, Chromium `148.0.0.0`, DevTools
- 세션: Single page session
- 로드 방식: Initial page load
- 측정 방식: Custom throttling
- 측정 시각: `2026-05-09 19:30 ~ 19:40 GMT+9`
- 반복 측정:
  - Before: before 1, before 2, before 3
  - After: after 1, after 2, after 3

주의:

- Lighthouse 결과는 실행마다 변동이 있으므로 단일 측정값이 아니라 3회 평균을 기준으로 비교한다.
- 코드 변경과 지표 개선 사이의 관련성은 높게 추정할 수 있는 부분이 있지만, 개별 변경의 기여도를 Lighthouse만으로 정확히 분리할 수는 없다.
- 이 측정은 localhost 기반이며, 배포 환경 수치로 표현하지 않는다.

## 2. Before Measurements

| Run | Performance | FCP | LCP | TBT | CLS | Speed Index | Main-thread work | JS execution | Long tasks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Before 1 | 49 | 0.5s | 2.7s | 1360ms | 0 | 2.8s | 3.9s | 1.8s | 5 |
| Before 2 | 55 | 0.4s | 2.1s | 910ms | 0 | 3.1s | 2.9s | N/A | 5 |
| Before 3 | 60 | 0.4s | 2.0s | 910ms | 0 | 1.8s | 2.9s | N/A | 6 |

## 3. After Measurements

| Run | Performance | FCP | LCP | TBT | CLS | Speed Index | Main-thread work | JS execution | Long tasks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| After 1 | 66 | 0.4s | 1.2s | 840ms | 0 | 2.0s | 2.6s | N/A | 8 |
| After 2 | 93 | 0.5s | 1.0s | 150ms | 0 | 1.7s | N/A | N/A | 4 |
| After 3 | 86 | 0.4s | 0.9s | 280ms | 0 | 1.5s | N/A | N/A | 5 |

## 4. Three-Run Average

| Metric | Before Avg | After Avg | Change |
|---|---:|---:|---:|
| Performance | 54.7 | 81.7 | +27.0 |
| FCP | 0.43s | 0.43s | No material change |
| LCP | 2.27s | 1.03s | -1.24s |
| TBT | 1060ms | 423ms | -637ms |
| CLS | 0 | 0 | No change |
| Speed Index | 2.57s | 1.73s | -0.84s |

Additional category scores stayed stable:

| Category | Score |
|---|---:|
| Accessibility | 90 |
| Best Practices | 96 |
| SEO | 100 |

## 5. Improvement Summary

- Performance Score: `54.7 -> 81.7`
- LCP: `2.27s -> 1.03s`
- TBT: `1060ms -> 423ms`
- Speed Index: `2.57s -> 1.73s`
- FCP stayed effectively unchanged at `0.43s`
- CLS stayed stable at `0`
- Accessibility, Best Practices, and SEO did not regress

Interpretation:

- The largest visible win is LCP improvement. This suggests the PR title/header path was able to render earlier after the changes.
- TBT also improved materially, which is consistent with less initial JavaScript work from memoized diff parsing/grouping and deferred syntax highlighter loading.
- Speed Index improved, likely because the first meaningful PR detail UI no longer waited for every secondary data path before rendering.

## 6. Code Change Candidates Behind The Improvement

| Changed file | Change | Metrics that may be affected | Evidence | Confidence |
|---|---|---|---|---|
| `components/pulls/detail/PRDetailContainer.tsx` | Before blocked the whole detail page when `prPending || filesPending`; After only blocks on `prPending` while `usePRFiles(id)` starts in the background | LCP, Speed Index | Before: `PRDetailLayout` did not render until file list loading completed. After: layout can render as soon as PR basic data is ready | High |
| `components/pulls/detail/PRDiffViewer/index.tsx` | Changed repeated `parsePatch(file.patch)` execution into a `useMemo` path and wrapped the component with `memo` | TBT, Main-thread work | Diff parsing is client-side JS work. Avoiding repeated parsing for the same `file.patch` directly reduces repeated render computation | High |
| `components/pulls/detail/PRDiffViewer/DiffTable.tsx` | Moved `issuesByLine` and `commentsByLine` Map construction from direct render-body calculation into `useMemo` | TBT, Main-thread work | Line-level grouping can be expensive on large diffs. Memoization limits recalculation to relevant prop changes | Medium |
| `components/review/SuggestionCard.tsx`, `components/review/SuggestionCodeBlock/*` | Removed top-level `react-syntax-highlighter` usage from suggestion cards and lazy-loaded syntax highlighting via dynamic import | TBT, Main-thread work, initial JS execution | Syntax highlighter and refractor-related code no longer need to be evaluated on the initial PR detail route unless a code suggestion block is actually rendered | High |
| `components/notification/NotificationBell.tsx`, `hooks/useNotifications.ts`, `app/api/notifications/summary/route.ts` | Replaced initial full notification list loading with unread summary loading, and deferred the full list until the dropdown opens with `enabled: isOpen` | Speed Index, TBT possible | Before: notification list query could run on bell mount. After: initial path loads a small summary endpoint and defers the heavier list path | Medium |
| `hooks/useSocket.ts`, `components/realtime/SocketConnectionStatus.tsx` | Deferred `socket.io-client` through dynamic import and used lightweight socket state for the status badge | TBT, Main-thread work possible | Socket client import timing is delayed. Impact depends on auth state, realtime mode, and whether the socket path is needed during initial load | Medium |
| `components/pulls/detail/PRDetailLayout.tsx` and extracted PR detail components/hooks | Split large layout responsibilities into dedicated sections, hooks, sticky header, modal host, file list, review section, and comment paths | TBT, Main-thread work possible | Responsibility split is visible in code, but render-count reduction is not independently measured here | Low to Medium |

## 7. Mapping Metrics To Likely Causes

### LCP

Most likely related change:

- `components/pulls/detail/PRDetailContainer.tsx`

Before, PR detail rendering was gated by both PR detail data and PR files data. If the LCP element is the PR title/header, then waiting for `/files` before showing the layout can directly delay LCP.

After, the PR layout can render once PR data is ready, while files/diff data continues to load in the background. This is the clearest code-level explanation for the LCP average changing from `2.27s` to `1.03s`.

Confidence: High, but exact LCP element confirmation should come from the Lighthouse report details.

### TBT

Likely related changes:

- `components/pulls/detail/PRDiffViewer/index.tsx`
- `components/pulls/detail/PRDiffViewer/DiffTable.tsx`
- `components/review/SuggestionCard.tsx`
- `components/review/SuggestionCodeBlock/*`
- `hooks/useSocket.ts`

The TBT reduction from `1060ms` to `423ms` is consistent with:

- fewer repeated diff parsing calculations
- memoized line-to-issue/comment grouping
- syntax highlighting moved out of the initial critical path
- socket client import delayed until needed

Confidence: Medium to High. The code changes reduce plausible JS work, but Lighthouse does not isolate the exact contribution of each change.

### Speed Index

Likely related changes:

- `components/pulls/detail/PRDetailContainer.tsx`
- `components/notification/NotificationBell.tsx`
- `hooks/useNotifications.ts`
- `app/api/notifications/summary/route.ts`

Speed Index improved from `2.57s` to `1.73s`. The likely reason is that the primary PR detail UI could appear earlier, while secondary data such as full files, full notification list, and heavier client modules were delayed or reduced.

Confidence: Medium. The direction matches the implementation, but individual contribution is not isolated.

### FCP And CLS

FCP stayed at `0.43s`, and CLS stayed at `0`.

Interpretation:

- The initial first paint was already fast enough, so the work mainly improved what meaningful content appeared after FCP.
- Layout stability did not regress, which is important because deferring sections can sometimes create shift if placeholders are not stable.

## 8. What Should Not Be Overstated

Avoid these claims:

- Do not claim a single component alone caused the full improvement.
- Do not claim total API request count universally decreased. What changed is that some heavier requests or modules were deferred from the initial path.
- Do not claim this was caused by converting the page to a Server Component. The PR detail page was already a server component at the page boundary, while the detail container/layout remain client components.
- Do not claim exact bundle-size savings unless bundle analyzer output is attached.
- Do not claim caching alone caused the improvement. React Query behavior changed in places, but the measured result cannot be attributed only to cache changes.

Safe wording:

> Lighthouse 3-run averages improved after a set of changes that reduced initial render blocking, memoized expensive diff work, and deferred non-critical client modules. The strongest code-level links are the PR detail loading gate removal, diff calculation memoization, and syntax highlighter lazy loading.

## 9. Resume And Portfolio Wording

### Conservative

PR 상세 페이지 성능 개선 작업으로 초기 렌더 차단 조건, diff 렌더 계산, 문법 하이라이터 로딩 시점, 알림 데이터 조회 흐름을 개선했으며, localhost Lighthouse Desktop 3회 평균에서 Performance 54.7에서 81.7, LCP 2.27초에서 1.03초, TBT 1060ms에서 423ms로 개선된 것을 확인했습니다.

### Stronger

React/Next.js PR 상세 페이지에서 초기 렌더 차단 조건 완화, diff 렌더 계산 메모이제이션, 문법 하이라이터 지연 로딩, 알림 목록 초기 조회 지연을 반영했으며, localhost Lighthouse Desktop 3회 평균 기준 Performance 54.7에서 81.7, LCP 2.27초에서 1.03초, TBT 1060ms에서 423ms로 개선했습니다.

### ATS-Friendly

React/Next.js PR 상세 페이지에서 React Query 로딩 조건 조정, `React.memo`/`useMemo` 기반 diff 렌더 최적화, dynamic import 기반 syntax highlighting 지연 로딩을 적용하고, localhost Lighthouse Desktop 3회 평균 기준 Performance 54.7에서 81.7 및 TBT 1060ms에서 423ms 개선을 검증했습니다.

### Recommended Final Sentence

React/Next.js PR 상세 페이지에서 초기 렌더 차단 조건 완화, diff 렌더 계산 메모이제이션, 문법 하이라이터 지연 로딩, 알림 목록 초기 조회 지연을 반영했으며, localhost Lighthouse Desktop 3회 평균 기준 Performance 54.7에서 81.7, LCP 2.27초에서 1.03초, TBT 1060ms에서 423ms 개선을 확인했습니다.

## 10. Follow-Up Verification Ideas

For stronger evidence later:

- Attach the raw Lighthouse JSON or PDF reports for all 6 runs.
- Re-run with the same throttling profile after a cold dev server start.
- Capture the Lighthouse LCP element for Before and After.
- Run bundle analyzer to confirm syntax highlighter and socket-related chunks are deferred.
- Add a short before/after network waterfall screenshot for `/api/pulls/[id]`, `/api/pulls/[id]/files`, and notification endpoints.
