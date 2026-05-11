# PR Detail Lighthouse Improvement Plan

## 1. Measurement Snapshot

- Target URL: `http://localhost:3000/pulls/cmotp4ehl001uokqdedir2ij1`
- Lighthouse version: `13.0.2`
- Fetch time: `2026-05-09T12:14:33.824Z`

| Metric | Current |
|---|---:|
| Performance | 54 |
| First Contentful Paint | 0.6s |
| Largest Contentful Paint | 2.0s |
| Speed Index | 3.5s |
| Total Blocking Time | 1,110ms |
| Max Potential FID | 810ms |
| Cumulative Layout Shift | 0.000015 |
| Time to Interactive | 2.3s |
| Root document response time | 1,270ms |
| Main-thread work | 4.1s |
| JavaScript execution time | 1.2s |

## 2. Primary Findings

### 2.1 Review API Error

Lighthouse reports two console errors from:

```txt
GET /api/pulls/cmotp4ehl001uokqdedir2ij1/review
500 Internal Server Error
```

This should be fixed before comparing performance runs because the failed request adds noise, creates console errors, and may trigger retry behavior.

### 2.2 LCP Is The PR Title

The LCP element is the PR detail title:

```txt
h1.text-xl
perf: PR Detail 성능 개선 스택 main 반영
```

The title is not image-bound. The main LCP opportunities are:

- reduce root document response time
- render or hydrate the minimal PR header data earlier
- avoid making the PR title wait for client-side data fetches when possible

### 2.3 Diff Rendering Dominates The Page

The report shows:

- total DOM elements: `10,242`
- largest child set: `tbody` under `hooks/useNotifications.ts`, `325` children
- style and layout work: `1.2s`
- Speed Index: `3.5s`
- full page contains many expanded diff tables for 19 changed files

This points to diff table DOM size and layout work as the biggest frontend rendering target.

### 2.4 Files API Is A Large Critical Input

The files request is one of the largest and slowest page data requests:

```txt
GET /api/pulls/cmotp4ehl001uokqdedir2ij1/files
transfer: 58.2KB
duration: about 1.83s
```

The PR title and header do not need full patch bodies, so file metadata and patch content should be split or lazily fetched.

### 2.5 One JS Chunk Has High Evaluation Cost

The largest script evaluation cost is:

```txt
/_next/static/chunks/4af27f77bd5de33b.js
transfer: 70.6KB
script evaluation: 1.17s
unused JS: 21KB
```

The Lighthouse JSON does not identify the source modules for this chunk. A bundle analyzer or Next build stats should be used before assigning the cost to a specific component or dependency.

## 3. Implementation Goals

1. Remove measurement noise from expected API failures.
2. Make PR title/header visible as early as possible.
3. Reduce initial diff DOM size and layout work.
4. Split expensive patch data from lightweight file metadata.
5. Identify and defer initial JavaScript that is not needed for the first screen.

## 4. Implementation Plan

### Phase 1. Stabilize Review API

Target files:

- `hooks/useReview.ts`
- `components/pulls/detail/ReviewSection.tsx`
- `components/review/ReviewPanel/index.tsx`
- `app/api/pulls/[id]/review/route.ts`

Tasks:

- Treat "review does not exist yet" as a normal empty state instead of a 500.
- Return a stable JSON shape such as `{ review: null }` or `{ status: "not_found" }`.
- Disable or limit client retry for expected not-found states.
- Make `ReviewSection` and `ReviewPanel` render the empty state without logging browser errors.

Acceptance criteria:

- Lighthouse `errors-in-console` no longer reports `/review` 500 errors.
- Network tab shows no repeated failed `/review` request on initial page load.
- Review UI still works when review data exists.

### Phase 2. Improve PR Header LCP Path

Target files:

- `app/(protected)/pulls/[id]/page.tsx`
- `components/pulls/detail/PRDetailContainer.tsx`
- `components/pulls/detail/PRDetailHeader.tsx`
- `hooks/usePRDetail.ts`

Tasks:

- Profile the server page path around `auth()` and initial render.
- Fetch only minimal PR header data server-side or prehydrate the PR detail query.
- Pass initial PR title/status/branch metadata into the client detail container.
- Keep files and diff loading separate from the PR header path.

Acceptance criteria:

- PR title can render without waiting for `/api/pulls/[id]/files`.
- LCP remains the PR title but moves earlier.
- Root document response time does not regress materially after adding server-side header data.

### Phase 3. Reduce Initial Diff DOM

Target files:

- `components/pulls/detail/PRDiffSection.tsx`
- `components/pulls/detail/PRDiffViewer/index.tsx`
- `components/pulls/detail/PRDiffViewer/DiffTable.tsx`
- `components/pulls/detail/MobileFileDropdown.tsx`
- `components/pulls/detail/PRFileList.tsx`

Tasks:

- Render only the selected file's diff on mobile.
- On desktop, mount only visible or explicitly expanded file diffs initially.
- Default very large files to collapsed state.
- Keep file headers and file list visible while deferring large diff tables.
- Consider row virtualization for large `DiffTable` bodies after the lazy-mount step is stable.

Acceptance criteria:

- Initial DOM element count drops significantly from `10,242`.
- Largest `tbody` child count no longer appears in the initial Lighthouse DOM snapshot unless that file is selected.
- Style and layout time decreases from the current `1.2s` range.
- File navigation, issue click handling, and comment anchors still work.

### Phase 4. Split Files Metadata From Patch Content

Target files:

- `app/api/pulls/[id]/files/route.ts`
- `hooks/usePRFiles.ts`
- `components/pulls/detail/PRFileList.tsx`
- `components/pulls/detail/PRDiffSection.tsx`
- `components/pulls/detail/PRDiffViewer/index.tsx`

Tasks:

- Add or adjust an endpoint that returns lightweight file metadata only.
- Fetch full patch content only when a file is selected, expanded, or scrolled into view.
- Cache patch responses per PR/file key.
- Keep existing UI states for loading, error, empty patch, and binary/no-diff files.

Acceptance criteria:

- Initial `/files` payload no longer includes all patch bodies.
- Initial page load transfers less data than the current `58.2KB` files response.
- Expanding or selecting a file fetches and renders its patch predictably.
- Previously supported diff interactions still work.

### Phase 5. Analyze And Defer Heavy JavaScript

Target files:

- To be decided after bundle analysis.

Tasks:

- Run Next bundle analysis or inspect build stats to map `4af27f77bd5de33b.js`.
- Identify whether the heavy work comes from diff rendering, syntax highlighting, socket code, modal code, or shared UI dependencies.
- Move non-first-screen modules behind dynamic imports only after confirming their source.
- Ensure syntax highlighting and modal code are loaded only when the relevant UI is opened.

Acceptance criteria:

- The largest initial JS chunk has a known source module list.
- Initial script evaluation time decreases from the current `1.17s` chunk cost.
- No user-visible loading regressions for review suggestions, issue modals, or socket status UI.

## 5. Verification Plan

Run each measurement at least 3 times and compare averages, not one-off runs.

Recommended checks:

- `npm run lint`
- `npm run build`
- Lighthouse on the same URL and same device mode
- Browser console check for `/review` errors
- Manual PR detail flow:
  - page load
  - file list navigation
  - mobile file dropdown
  - diff issue click
  - review issue click
  - large file expand/collapse
  - comment section load

Target metrics:

| Metric | Target |
|---|---:|
| Performance | 80+ |
| LCP | under 1.5s |
| Speed Index | under 2.5s |
| TBT | under 500ms |
| Console errors | 0 |
| CLS | keep near 0 |

## 6. Notes And Non-Goals

- Do not attribute the heavy JS chunk to a specific dependency until bundle analysis confirms it.
- Do not optimize GitHub avatar caching first; it is not a meaningful bottleneck in this report.
- Do not prioritize CLS; the current CLS value is already effectively zero.
- Accessibility issues should be handled separately unless a change directly touches the same markup.
- Avoid hiding diff content permanently. The goal is lazy rendering and progressive loading, not removing useful review context.
