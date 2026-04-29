# PR Detail Header Loading Split Performance Log

## 1. Work Item

- Issue: [#156 perf: PR Detail 헤더 렌더링과 files 로딩 분리](https://github.com/phnml1/CodeMate/issues/156)
- Branch: `refactor/156-pr-detail-header-loading`
- Target page: `/pulls/cmoa927ak001sxgqdqlwv9gu4`
- Target area: PR Detail page initial loading path
- Goal: PR title/header rendering should not wait for PR files/diff loading.

이 문서는 PR Detail 성능 개선 작업의 누적 기록으로 사용한다. 이후 추가 최적화를 적용하면 같은 파일에 측정값과 해석을 이어서 적는다.

## 2. Baseline Problem

기존 `PRDetailContainer`는 PR 기본 정보와 변경 파일 목록을 같은 full-page loading gate로 묶고 있었다.

```tsx
const { data: pr, isPending: prPending, isError: prError } = usePRDetail(id);
const { data: files, isPending: filesPending, isError: filesError } = usePRFiles(id);

if (prPending || filesPending) {
  return <PRDetailSkeleton />;
}
```

이 구조에서는 PR 제목과 헤더를 렌더링하는 데 실제로 필요한 `pr` 데이터가 준비되어도, `usePRFiles(id)`가 끝날 때까지 전체 detail layout이 skeleton에 머무를 수 있다. Lighthouse에서 LCP element가 PR title로 잡혔기 때문에, files API를 PR title/header 렌더링의 선행 조건에서 제거하는 것이 첫 번째 low-risk 개선 지점이었다.

## 3. Applied Change

### Changed Files

- `components/pulls/detail/PRDetailContainer.tsx`
- `components/pulls/detail/PRFileList.tsx`
- `components/pulls/detail/PRDiffSection.tsx`
- `components/pulls/detail/MobileFileDropdown.tsx`

### Implementation Summary

- `PRDetailContainer`의 full-page loading/error gate를 `usePRDetail(id)` 중심으로 축소했다.
- `usePRFiles(id)`는 계속 실행해서 React Query cache를 채우되, `filesPending`이 전체 페이지 skeleton을 만들지 않도록 분리했다.
- 변경 파일 loading/error UI는 파일을 실제로 사용하는 하위 영역으로 이동했다.
- `PRFileList`, `PRDiffSection`, `MobileFileDropdown`에서 각각 files loading/error 상태를 지역적으로 처리한다.

### Rendering Flow

Before:

```txt
PR header/title render = usePRDetail 완료 + usePRFiles 완료 필요
```

After:

```txt
PR header/title render = usePRDetail 완료 후 가능
File sidebar / mobile dropdown / diff render = usePRFiles 상태를 각 영역에서 처리
```

## 4. Lighthouse Before Metrics

Report: `PR Detail Page Performance Report 2`

- Measured at: `2026-04-29 17:09`
- Environment: `localhost:3000`
- Report type: Lighthouse / Chrome performance report

| Metric | Before |
|---|---:|
| Performance | 49 |
| First Contentful Paint | 0.3s |
| Largest Contentful Paint | 2.8s |
| Total Blocking Time | 1,730ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 2.3s |
| Server response time observed | 2,020ms |
| Time to First Byte | 2,030ms |
| Maximum critical path latency | 2,238ms |
| Element render delay | 4,460ms |
| Main-thread work | 3.9s |
| JavaScript execution time | 2.9s |
| Script Evaluation | 2,673ms |
| Script Parsing & Compilation | 380ms |
| PRDetailPage user timing | 567.61ms |
| ProtectedLayout user timing | 548.82ms |
| AppHeader user timing | 545.78ms |
| AppSidebar user timing | 481.65ms |
| Total network payload | 1,608KiB |
| `node_modules_refractor_lang_ce18cb0d._.js` transfer size | 279.3KiB |

LCP element:

```txt
h1.text-xl.md:text-2xl.font-bold.text-slate-900.dark:text-white.tracking-tight.break-all
```

## 5. Lighthouse After Metrics

Report: `PR Detail Page Performance Report - 156 Applied`

- Measured at: `2026-04-29 17:38`
- Environment: `localhost:3000`
- Report type: Lighthouse / Chrome performance report

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Performance | 49 | 51 | +2 |
| First Contentful Paint | 0.3s | 0.3s | 0 |
| Largest Contentful Paint | 2.8s | 2.8s | 0 |
| Total Blocking Time | 1,730ms | 1,780ms | +50ms |
| Cumulative Layout Shift | 0 | 0 | 0 |
| Speed Index | 2.3s | 2.1s | -0.2s |
| Server response time observed | 2,020ms | 1,551ms | -469ms |
| Time to First Byte | 2,030ms | 1,560ms | -470ms |
| Maximum critical path latency | 2,238ms | 1,854ms | -384ms |
| Element render delay | 4,460ms | 4,370ms | -90ms |
| Main-thread work | 3.9s | 4.0s | +0.1s |
| JavaScript execution time | 2.9s | 2.9s | 0 |
| Script Evaluation | 2,673ms | 2,671ms | -2ms |
| Script Parsing & Compilation | 380ms | 400ms | +20ms |
| PRDetailPage user timing | 567.61ms | 900.85ms | +333.24ms |
| ProtectedLayout user timing | 548.82ms | 866.82ms | +318.00ms |
| AppHeader user timing | 545.78ms | 864.35ms | +318.57ms |
| AppSidebar user timing | 481.65ms | 457.04ms | -24.61ms |
| Total network payload | 1,608KiB | 1,608KiB | 0 |
| `node_modules_refractor_lang_ce18cb0d._.js` transfer size | 279.3KiB | 279.3KiB | 0 |

## 6. What Improved

- 서버 응답 계열 지표가 개선되었다.
  - TTFB: `2,030ms -> 1,560ms`
  - Server response: `2,020ms -> 1,551ms`
  - Maximum critical path latency: `2,238ms -> 1,854ms`
- Speed Index가 `2.3s -> 2.1s`로 개선되었다.
- Element render delay가 `4,460ms -> 4,370ms`로 소폭 감소했다.
- Performance score가 `49 -> 51`로 소폭 상승했다.

해석: files loading을 full-page gate에서 분리한 방향은 맞았다. 특히 PR header/title이 files API 완료를 직접 기다리는 구조를 제거했기 때문에, 서버/초기 경로의 대기 시간이 줄어든 것으로 볼 수 있다.

## 7. What Did Not Improve Enough

- LCP는 여전히 `2.8s`로 개선되지 않았다.
- TBT는 `1,730ms -> 1,780ms`로 소폭 악화되었다.
- Main-thread work는 `3.9s -> 4.0s`로 여전히 높다.
- JavaScript execution time은 `2.9s`로 그대로다.
- `refractor` bundle은 여전히 초기 route payload에 포함된다.
- `PRDetailPage`, `ProtectedLayout`, `AppHeader` user timing은 이번 측정에서 더 크게 잡혔다.

해석: #156은 loading 책임 분리 개선이지, 클라이언트 JS/hydration 비용 자체를 줄이는 작업은 아니었다. 현재 남은 병목은 서버 대기보다 초기 JS 실행, hydration, code highlighting bundle, PR detail body mount 쪽에 더 가깝다.

## 8. Current Bottlenecks

### 1. PR Detail page-specific rendering

- `PRDetailPage: 900.85ms`
- files gate는 분리됐지만 PR detail 본문, review, diff, comments, modal 관련 client component mount 비용이 여전히 크다.

### 2. Shared app shell hydration

- `ProtectedLayout: 866.82ms`
- `AppHeader: 864.35ms`
- `AppSidebar: 457.04ms`
- 공통 shell의 session/auth, header interactive UI, sidebar tooltip/Radix primitive 비용이 모든 protected page에서 반복된다.

### 3. Syntax highlighting / refractor bundle

- `node_modules_refractor_lang_ce18cb0d._.js`: `279.3KiB`
- 현재 가장 명확한 page-specific bundle 병목이다.
- 주요 의심 경로:

```txt
ReviewSection
-> ReviewPanel
-> ReviewCompletedState
-> ReviewIssueList
-> ReviewSuggestionList
-> SuggestionCard
-> react-syntax-highlighter / refractor
```

### 4. Socket reconnect traces

- Lighthouse에 `Reconnect` measure가 반복해서 나타난다.
- polling mode로 측정했다고 해도 실제 client bundle/env가 socket mode로 떠 있으면 reconnect 비용이 남는다.
- `NEXT_PUBLIC_REALTIME_MODE`는 dev server 시작 시점에 반영되므로, polling 측정 전 dev server 재시작이 필요하다.

### 5. IssueDetailModal / Dialog load behavior

- after report에서 `IssueDetailModal`과 `Dialog`가 두 번 나타난다.
- modal이 닫힌 상태에서도 양쪽 섹션에서 중복 mount/load되는지 확인해야 한다.

## 9. Recommended Next Plan

### Phase 1: Reduce `refractor` initial bundle

- Target:
  - `components/review/SuggestionCard.tsx`
  - `components/review/ReviewSuggestionList.tsx`
- Plan:
  - `react-syntax-highlighter`를 static import에서 제거한다.
  - example code block을 별도 lazy/dynamic component로 분리한다.
  - suggestion card가 열려 있고 `issue.exampleCode`가 있을 때만 highlighter를 로드한다.
- Expected impact:
  - `node_modules_refractor_lang_ce18cb0d._.js`가 초기 route payload에서 빠지거나 늦게 로드될 가능성이 높다.
  - Script parsing/compilation과 unused JS 지표 개선 기대.

### Phase 2: Render only one issue modal

- Target:
  - `PRDiffSection`
  - `ReviewSection`
  - `IssueDetailModal`
- Plan:
  - `selectedIssue`가 없을 때 modal component 자체를 렌더링하지 않는다.
  - 가능하면 PR detail layout 레벨에서 issue modal을 하나만 소유하게 정리한다.
- Expected impact:
  - `IssueDetailModal` / `Dialog` 중복 mount 감소.
  - post-load dynamic component work 감소.

### Phase 3: Verify true polling mode

- Target:
  - `.env.local` or `.env`
  - `hooks/useSocket.ts`
- Plan:
  - `NEXT_PUBLIC_REALTIME_MODE=polling` 적용 후 dev server를 재시작하고 다시 측정한다.
  - true polling mode에서도 socket bundle이 포함되는지 확인한다.
  - 필요하면 `socket.io-client`를 top-level import에서 dynamic import로 변경한다.
- Expected impact:
  - WebSocket reconnect trace 제거.
  - bfcache blocker 일부 감소.

### Phase 4: Shared shell hydration reduction

- Target:
  - `components/layout/AppHeader.tsx`
  - `components/layout/AppSidebar.tsx`
  - `components/ui/sidebar.tsx`
  - auth/session helpers
- Plan:
  - sidebar tooltip을 collapsed 상태에서만 mount한다.
  - header search/notification/dropdown의 초기 mount 범위를 줄인다.
  - duplicate session/auth path를 줄인다.
- Expected impact:
  - `/pulls`, `/repositories`, `/pulls/[id]` 공통 개선.

## 10. Running Notes

- #156 적용으로 loading responsibility는 더 명확해졌다.
- 하지만 Lighthouse after 결과상 다음 병목은 `files loading gate`가 아니라 client-side JS/hydration이다.
- 다음 작업은 `refractor` lazy loading을 별도 이슈/브랜치로 분리하는 것이 가장 객관적이고 측정 가능한 순서다.

## 11. Lighthouse After Refractor Lazy Loading

Report: `PR Detail Page Performance Report - 157 Applied`

- Measured at: `2026-04-29 18:42`
- Environment: `localhost:3000`
- Related PR: [#158 perf: PR Detail 리뷰 코드 하이라이터 lazy loading](https://github.com/phnml1/CodeMate/pull/158)
- Base PR: [#157 perf: PR Detail 헤더 렌더링과 files 로딩 분리](https://github.com/phnml1/CodeMate/pull/157)

### Applied Change

- `components/review/SuggestionCard.tsx`에서 `react-syntax-highlighter`와 `oneDark` static import를 제거했다.
- `components/review/SuggestionCodeBlock/` 폴더를 추가했다.
- suggestion card가 열리고 example code block이 실제로 mount될 때만 `SyntaxHighlightedCode`를 dynamic import한다.
- highlighter import 전 또는 import 실패 시 plain `<pre><code>` fallback을 유지한다.
- `react-syntax-highlighter` import는 `components/review/SuggestionCodeBlock/SyntaxHighlightedCode.tsx` 한 파일에만 남겼다.

### Metrics Compared With `156 Applied`

| Metric | 156 Applied | 157 Applied | Change |
|---|---:|---:|---:|
| Performance | 51 | 53 | +2 |
| First Contentful Paint | 0.3s | 0.3s | 0 |
| Largest Contentful Paint | 2.8s | 2.7s | -0.1s |
| Total Blocking Time | 1,780ms | 1,240ms | -540ms |
| Cumulative Layout Shift | 0 | 0 | 0 |
| Speed Index | 2.1s | 1.8s | -0.3s |
| Server response time observed | 1,551ms | 1,328ms | -223ms |
| Time to First Byte | 1,560ms | 1,330ms | -230ms |
| Maximum critical path latency | 1,854ms | 1,600ms | -254ms |
| Element render delay | 4,370ms | 3,270ms | -1,100ms |
| Main-thread work | 4.0s | 3.6s | -0.4s |
| JavaScript execution time | 2.9s | 2.6s | -0.3s |
| Script Evaluation | 2,671ms | 2,490ms | -181ms |
| Script Parsing & Compilation | 400ms | 309ms | -91ms |
| Total network payload | 1,608KiB | 1,286KiB | -322KiB |
| Long tasks | 13 | 11 | -2 |

### Important Result

`node_modules_refractor_lang_ce18cb0d._.js` no longer appears in the largest payload list or CPU table.

This strongly suggests that the review code highlighter was removed or deferred from the initial PR Detail route. This is the clearest measurable win so far because it directly reduced initial payload, parsing/compilation work, TBT, and element render delay.

### Remaining Bottlenecks After `157 Applied`

| Area | Evidence | Notes |
|---|---|---|
| Shared app shell hydration | `ProtectedLayout: 927.49ms`, `AppHeader: 923.68ms`, `AppSidebar: 489.37ms` | Header/sidebar/session/socket/UI primitives are now more visible. |
| PR detail render cost | `PRDetailPage: 888.60ms` | Detail layout still mounts review, diff, comments, socket room, deep link, modal hosts, and floating button path. |
| Socket reconnect | `Reconnect: 134.10ms`, `Reconnect: 85.30ms` | Reconnect traces remain one of the biggest post-load costs. |
| Modal/dynamic loading | `IssueDetailModal` appears twice, `Dialog`, `BailoutToCSR`, `Promise Resolved: 349.50ms` | Modal is currently rendered from both review and diff sections. |
| New long-task target | `node_modules_1819799d._.js` long tasks up to `432ms` | Need bundle/import tracing to identify the package group. |
| Session/auth duplication | Multiple `Object.session` measures | `AppHeader`, `AppSidebar`, PR page, APIs, and socket token path all need inspection. |

### Updated Priority

1. Confirm `refractor` stays out of the initial route in follow-up measurements.
2. Remove duplicated `IssueDetailModal` mounting by introducing a single modal owner.
3. Reduce socket reconnect work and avoid socket attempts when the configured mode is polling or the socket server is unavailable.
4. Inspect `node_modules_1819799d._.js` with bundle analysis/import tracing.
5. Reduce shared app shell hydration by addressing session duplication and tooltip/dropdown mounting.

## 12. Next Candidate: Single Issue Modal Owner

Current modal ownership:

```txt
ReviewSection
  owns selectedIssue
  renders IssueDetailModal

PRDiffSection
  owns selectedIssue
  renders IssueDetailModal
```

This means the PR Detail page has two dynamic imports and two modal hosts for the same conceptual UI: "show selected review issue detail".

Proposed modal ownership:

```txt
PRDetailLayout
  owns selectedIssue once
  renders IssueDetailModal once, only when selectedIssue exists

ReviewSection
  receives onIssueClick
  calls onIssueClick(issue)

PRDiffSection
  receives onIssueClick
  calls onIssueClick(issue)
```

Expected impact:

- `IssueDetailModal` and `Dialog` should stop appearing twice.
- Closed modal code should not mount during initial render.
- `LoadableComponent`, `BailoutToCSR`, and related promise work should decrease.
- Review and diff sections become simpler because they no longer own modal state.

## 13. After Single Issue Modal Owner

Related change: `IssueModalHost` owns the issue detail modal once under `PRDetailLayout`.

### Applied Structure

Before:

```txt
ReviewSection
  owns selectedIssue
  dynamic-imports IssueDetailModal
  renders IssueDetailModal

PRDiffSection
  owns selectedIssue
  dynamic-imports IssueDetailModal
  renders IssueDetailModal
```

After:

```txt
PRDetailLayout
  owns selectedIssue once
  passes onIssueClick to ReviewSection and PRDiffSection
  renders IssueModalHost once

IssueModalHost
  returns null when selectedIssue is null
  lazy-loads IssueDetailModal only after an issue is selected
```

### Lighthouse Follow-up Interpretation

The follow-up Lighthouse PDFs after the `158` work show that the modal optimization is working in the intended direction.

Before this change, the `157 Applied` report showed `IssueDetailModal` twice during the initial page lifetime. Those entries were paired with `Dialog`, `BailoutToCSR`, and multiple `LoadableComponent` entries. The report also showed `Promise Resolved: 349.50ms`.

After the single-owner modal structure, the follow-up `158 Applied` measurements no longer show `IssueDetailModal` in User Timing search results. This matches the implementation because `IssueModalHost` returns `null` while no issue is selected:

```tsx
if (!issue) return null;
```

### 158 Applied Three-run Average

| Metric | Average |
|---|---:|
| Performance | 56 |
| First Contentful Paint | 0.33s |
| Largest Contentful Paint | 2.47s |
| Total Blocking Time | 1,183ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1.5s |
| Time to First Byte | 957ms |
| Server response time observed | 949ms |
| Element render delay | 3,403ms |
| JavaScript execution time | 2.4s |
| Main-thread work | about 3.2s |
| Unused JS savings | 370KiB |
| Minify JS savings | 267KiB |

Component timing averages from the 2nd and 3rd measurements:

| Component / Measure | Average |
|---|---:|
| `ProtectedLayout` | 533.26ms |
| `AppHeader` | 530.33ms |
| `PRDetailPage` | 545.05ms |
| `AppSidebar` | 443.52ms |
| `Cascading Update` | 108.80ms |
| `TooltipProviderProvider` | 69.05ms |
| Long tasks count | about 9.5 |

### Result

- `IssueDetailModal` no longer appears in the initial-load User Timing search results.
- The previous duplicated `IssueDetailModal` / `Dialog` / `BailoutToCSR` pattern appears removed.
- `Promise Resolved` improved from `349.50ms` to either `205.70ms` or `11.50ms` in the follow-up reports, though this value still fluctuates.
- `LoadableComponent` entries still exist, which means other dynamic imports remain.
- Reconnect work still appears, including values around `85ms` to `120ms`.

### Updated Bottleneck Layer

This change should be treated as a successful cleanup of duplicated modal ownership, not as the final PR Detail performance fix. The remaining bottleneck layer is now:

1. `ProtectedLayout` / `AppHeader` hydration and shared AppShell work.
2. `PRDetailPage` initial render cost.
3. `node_modules_1819799d._.js` long tasks.
4. WebSocket reconnect work during or shortly after initial load.
5. Repeated Tooltip / Popper / Radix primitive mounting.

Recommended next target: inspect WebSocket connect/reconnect behavior and make sure socket connection and `socket.io-client` loading do not happen on the critical path when the page is measured in polling mode or when realtime is not immediately needed.
