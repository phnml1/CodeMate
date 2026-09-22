# 반응형 및 브라우저 검증 기록

작성일: 2026-09-21

대상 PR: [#179 test: PR 주요 흐름 반응형 회귀 테스트 추가](https://github.com/phnml1/CodeMate/pull/179)

검증 커밋: [`c8289b3`](https://github.com/phnml1/CodeMate/commit/c8289b3de23aeefa99eca41ec52c509b9b0f3abe)

CI 실행: [GitHub Actions run 35573993168](https://github.com/phnml1/CodeMate/actions/runs/35573993168)

## 목적

PR 목록, PR 상세, 댓글 작성, AI 리뷰 요청이 대표 viewport에서 동작하고 페이지 전체의 가로 overflow가 발생하지 않는지 반복 검증한다. 이 문서는 실제 실행 결과와 검증 범위를 기록하며, 실행하지 않은 브라우저나 실제 기기 결과를 포함한 것처럼 해석하지 않는다.

## 검증 환경

| 구분 | 환경 |
| --- | --- |
| 테스트 도구 | Playwright `1.62.1` |
| 자동화 브라우저 | Chromium |
| 로컬 실행 | Windows, Node.js `22.16.0`, Docker PostgreSQL 16, Playwright 1 worker |
| CI 실행 | GitHub Actions `ubuntu-latest`, Node.js 20, PostgreSQL 16, Playwright 1 worker |
| 애플리케이션 모드 | 로컬은 Next.js development server, CI는 production build/start |
| 실시간 모드 | `NEXT_PUBLIC_REALTIME_MODE=polling` |
| 테스트 데이터 | `codemate_e2e` 전용 PostgreSQL DB를 실행 전 초기화하고 fixture로 seed |

## Viewport 및 브라우저 Matrix

| 구분 | Viewport | Chromium | Firefox | WebKit | 실제 기기 |
| --- | --- | --- | --- | --- | --- |
| Mobile | `390x844` | 통과 | 미검증 | 미검증 | 미검증 |
| Tablet | `768x1024` | 통과 | 미검증 | 미검증 | 미검증 |
| Desktop | `1440x900` | 통과 | 미검증 | 미검증 | 미검증 |

현재 자동화 범위는 Chromium 하나다. Firefox/WebKit은 CI 필수 항목으로 추가하지 않았으며, 브라우저 호환성 검증을 주장하려면 별도 실행 결과가 필요하다. WebKit 자동화 결과도 실제 iOS Safari 기기 검증과 동일하게 간주하지 않는다.

## 검증 흐름

`e2e/responsive.spec.ts`는 각 viewport에서 아래 흐름을 순서대로 검증한다.

1. PR 목록에 가로 overflow가 없는지 확인한다.
2. 대상 PR 제목 링크가 보이고 올바른 상세 URL을 가리키는지 확인한다.
3. PR 상세 제목, 저장소명, PR 번호가 표시되는지 확인한다.
4. Mobile/Tablet에서는 파일 드롭다운이, Desktop에서는 파일 사이드바가 표시되는지 확인한다.
5. 일반 댓글을 작성하고 API가 `201`을 반환하며 작성 내용이 화면에 표시되는지 확인한다.
6. AI 리뷰를 요청하고 요약과 첫 번째 이슈가 표시되며 분석 요청이 한 번 발생했는지 확인한다.
7. PR 상세, 댓글 작성, AI 리뷰 결과 화면에 페이지 전체 가로 overflow가 없는지 확인한다.

네트워크 의존성이 큰 GitHub 파일 조회와 AI 분석 결과는 Playwright route fixture로 고정한다. 댓글 작성은 E2E 전용 데이터베이스에 실제 API 요청을 보내 응답과 화면 반영을 함께 확인한다.

## 실행 결과

### 로컬 집중 검증

- 실행일: 2026-09-21
- 명령: `npm run test:e2e -- e2e/responsive.spec.ts --project=chromium --workers=1`
- 결과: Mobile, Tablet, Desktop 3건 통과 (`3 passed`, 약 1.5분)
- 함께 확인한 정적 검사:
  - `npx eslint e2e/responsive.spec.ts`
  - `npx tsc --noEmit --pretty false`

### GitHub Actions

- 실행일: 2026-09-21
- Workflow: `CI Check / build-and-test`
- 결과: 성공 (`8 passed`, 10.6초)
- 포함 단계: lint, Prisma Client 생성, type check, Jest, production build, Chromium Playwright E2E, report artifact 업로드
- Job 링크: [build-and-test 결과](https://github.com/phnml1/CodeMate/actions/runs/35573993168/job/106251591035)

Playwright report와 실패 시 screenshot/trace는 CI artifact로 업로드되지만 보존 기간은 7일이다. 장기 근거는 이 문서, 테스트 코드, 커밋, PR 및 CI 실행 링크를 기준으로 한다.

## 발견한 문제와 수정 근거

| 문제 | 원인 | 수정 | 근거 파일 |
| --- | --- | --- | --- |
| 768px에서 PR 상세 본문 폭이 좁아짐 | Desktop 파일 사이드바가 `md` breakpoint부터 노출됨 | 파일 사이드바와 다시 열기 버튼을 `lg`부터 노출 | `components/pulls/detail/PRFileList.tsx`, `components/pulls/detail/PRDetailLayout.tsx`, `components/pulls/detail/MobileFileDropdown.tsx` |
| Tablet에서 목록 헤더와 필터가 이르게 가로 배치됨 | `md`부터 horizontal layout 사용 | `lg`부터 horizontal layout 사용 | `components/layout/PageHeader.tsx`, `components/pulls/PRFilterBar.tsx` |
| PR 카드 제목 링크 자동화가 불안정함 | 카드 전체를 덮는 빈 overlay link가 접근성 트리에만 노출됨 | 제목을 명시적인 focus 가능한 링크로 변경 | `components/pulls/PRCard.tsx` |
| 최초 CI에서 저장소명 확인 실패 | 동일 텍스트가 두 요소와 일치해 Playwright strict locator 위반 | 검증 대상 중 첫 번째 일치 요소를 명시 | `e2e/responsive.spec.ts` |

최초 CI 실패 run은 [35572673937](https://github.com/phnml1/CodeMate/actions/runs/35572673937)이며, locator 수정 커밋 `c8289b3` 이후 run `35573993168`에서 전체 CI가 통과했다.

## 로컬 재현 절차

PowerShell에서 E2E 전용 DB를 실행하고 아래 환경을 현재 터미널 세션에만 설정한다.

```powershell
docker compose -f docker-compose.e2e.yml up -d --wait

$env:E2E_TEST_MODE = "1"
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/codemate_e2e"
$env:DIRECT_DATABASE_URL = $env:DATABASE_URL
$env:AUTH_URL = "http://localhost:3100"
$env:NEXTAUTH_URL = "http://localhost:3100"
$env:AUTH_SECRET = "local-e2e-secret-local-e2e-secret"
$env:NEXTAUTH_SECRET = "local-e2e-secret-local-e2e-secret"
$env:GITHUB_ID = "e2e-client-id"
$env:GITHUB_SECRET = "e2e-client-secret"
$env:NEXT_PUBLIC_REALTIME_MODE = "polling"

npm run test:e2e -- e2e/responsive.spec.ts --project=chromium --workers=1
```

검증 후 E2E DB를 종료한다.

```powershell
docker compose -f docker-compose.e2e.yml down
```

`test:e2e:prepare`는 데이터베이스를 강제로 초기화하므로 반드시 `codemate_e2e` 전용 로컬 DB에서만 실행한다. `e2e/fixtures/safety.ts`가 `E2E_TEST_MODE`, host, DB 이름을 검사해 다른 DB 초기화를 차단한다.

## 관련 파일

- `e2e/responsive.spec.ts`: 세 viewport의 핵심 사용자 흐름 회귀 테스트
- `playwright.config.ts`: Chromium 프로젝트, CI worker/retry, screenshot/trace 설정
- `e2e/fixtures/network.ts`: GitHub 파일 조회 및 AI 리뷰 API fixture
- `e2e/fixtures/test-data.ts`: E2E 사용자, 저장소, PR, 리뷰 데이터
- `docker-compose.e2e.yml`: 로컬 E2E PostgreSQL 16 환경
- `.github/workflows/ci.yml`: CI 검증 순서와 Playwright report artifact 업로드

## 남은 검증 범위

- Firefox와 WebKit에서 동일한 세 viewport 실행
- 실제 Android Chrome과 iOS Safari에서 키보드, sticky header, dropdown, scroll 동작 확인
- 화면 전체 screenshot baseline을 사용하는 시각적 회귀 테스트 도입 여부 판단
- CI의 Firefox/WebKit 필수화 여부를 실행 시간과 flakiness를 측정한 뒤 결정
- polling 모드가 아닌 실제 Socket.io 연결 환경의 댓글 갱신 검증

이 항목들이 완료되기 전에는 "주요 브라우저 호환성 검증" 또는 "실제 모바일 기기 검증"을 완료 성과로 표현하지 않는다.
