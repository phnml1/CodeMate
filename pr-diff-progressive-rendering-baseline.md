# PR diff progressive rendering baseline

## Production measurement

Measured on 2026-10-06 against `https://code-mate-two.vercel.app/` after the
non-blocking collaboration leave change. The comparison run was on 2026-10-05.
Both used authenticated Chrome on Windows, a 1280 x 800 CSS-pixel viewport,
PR #189 with 31 changed files, no CPU/network throttling, and 20 completed
entry/return rounds. HTTP cache was retained; each round reloaded the PR page.

| Metric | Before median / P90 | After median / P90 |
| --- | ---: | ---: |
| Confirm leave to PR code ready | 4.844 / 5.086 s | 3.259 / 3.497 s |
| Confirm leave to PR RSC start | 1.372 / 1.439 s | 0.003 / 0.005 s |
| Longest return main-thread task | 1.001 / 1.120 s | 0.862 / 0.976 s |
| Enter collaboration room to code ready | 5.482 / 5.971 s | 6.174 / 6.881 s |

The post-change PR still rendered 31 diff tables and about 18,163 DOM
elements. The next optimization should use the **after** column as its
comparison baseline. Code ready means the first visible code row was checked
after two animation frames; it is not a paint timestamp. P90 is the 18th of
20 ordered samples, not a population percentile guarantee. Different rooms,
dates, and server load mean this is an observed before/after comparison, not
a controlled A/B experiment.

The detailed report and raw rounds remain at
`%LOCALAPPDATA%/Temp/codemate-perf-analysis-20261005/after-merge/`.

## Progressive rendering regression contract

`e2e/pr-diff-progressive-baseline.spec.ts` uses three 100-line mocked files
with the existing seeded PR. Before changing diff mounting, keep these flows
working: distant file selection, direct code-comment deep link, an unfinished
inline-comment draft after visiting another file, and navigation after leaving
and returning to the PR page. These are functional assertions, not latency
thresholds. Re-measure production under the conditions above after rollout;
compare return median/P90, DOM count, longest task, and scroll stability.

The direct code-comment deep link was fixed by waiting for file data and the
target diff row before scrolling. Browser back from the PR list still returns
the PR detail scroll root to the top. Its E2E case remains marked `fixme`.
