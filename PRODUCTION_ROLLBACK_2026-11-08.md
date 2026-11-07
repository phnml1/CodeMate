# CodeMate 운영 배포 되돌리기 기록

기준 시각: 2026-11-08 KST. 이 문서는 **되돌릴 대상을 식별하고 실행 순서를 기록한 것**이며, 롤백을 실행하거나 대상 버전의 실제 기능 정상 동작을 검증한 기록은 아니다. 다음 배포가 생기면 아래 ID와 후보를 다시 확인한다.

## 현재 배포와 되돌릴 후보

| 서비스 | 현재 운영으로 확인한 버전 | 직전 배포 후보 | 확인 상태 |
| --- | --- | --- | --- |
| 웹/API (Vercel `code-mate`) | Git `7a7509da4b73428da52b34b67af3f62fd8c98ae3` (#218), Vercel `Bsd6Ctx4SVCdKHqWveWfdPJKnpca`, 현재 도메인 `code-mate-two.vercel.app` | Git `d23ec7a92a360587f9e701658d415534566f0ae7` (#216), 직전 Production 재배포 `6FjxXVmAP7jy5iJayMe9bTGKgkix` (`code-mate-dtkjdcrzu-phnml1s-projects.vercel.app`) | Vercel 배포 목록에서 양쪽 `Ready`, `Production` 확인. 후보의 기능 스모크는 **미검증**. |
| Socket (Railway `codemate-socket`, production) | Git `7a7509d`, GitHub 배포 기록 `7622665200` (success, 2026-11-07 23:53:59 KST) | Git `d23ec7a`, GitHub 배포 기록 `7622149931` (이후 inactive) | GitHub 배포 기록만 확인. Railway 대시보드의 **실제 배포 ID·현재 실행 상태·롤백 가능 여부는 확인 필요**. GitHub 배포 ID를 Railway 배포 ID로 사용하지 않는다. |

- [Vercel 현재 배포](https://vercel.com/phnml1s-projects/code-mate/Bsd6Ctx4SVCdKHqWveWfdPJKnpca) · [웹 롤백 후보](https://vercel.com/phnml1s-projects/code-mate/6FjxXVmAP7jy5iJayMe9bTGKgkix) · [Railway 프로젝트](https://railway.com/project/65d165ea-9774-4abe-b879-652bf917dcff?environmentId=f3b674f9-425c-4747-9b71-99c356b15221)
- Vercel 팀은 확인 당시 **Hobby**였다. [공식 Instant Rollback 문서](https://vercel.com/docs/instant-rollback)에 따르면 Hobby는 바로 이전에 운영 도메인이 연결됐던 배포로만 Instant Rollback할 수 있다. 실행 직전 Vercel 화면에서 실제 선택 가능한 대상과 도메인을 다시 확인한다. Preview 배포 `b98943b`는 롤백 대상으로 가정하지 않는다.
- `d23ec7a`는 빌드 성공 기록이지 정상 작동이 입증된 버전이 아니다. 특히 과거 `sync` 503과 Redis 연결 설정 문제가 있었으므로 대상 배포의 환경 변수 **값을 노출하지 않고** 연결 상태와 핵심 흐름을 확인해야 한다. #218은 이전 GitHub 암호화 키로 저장된 토큰의 마이그레이션 오류를 고쳤다. 키 교체를 진행했다면 #216 버전으로의 복귀 호환성을 별도로 검토한다.

## 사고 시 선택과 사전 확인

1. 장애 시작 시각, 영향 기능, Vercel Runtime Logs/오류율, Railway Socket 로그와 `/health`, Redis 연결 오류를 기록한다. 웹/API 문제면 먼저 Vercel만, 채팅·음성 연결 문제면 Railway Socket만 대상으로 좁힌다. 둘 다 되돌리는 것은 양쪽 배포가 원인으로 확인된 경우에만 한다.
2. 현재 운영 SHA·배포 ID·도메인과 후보를 대시보드에서 다시 대조한다. 후보가 `Ready`/`Success`인지와 실제 롤백 메뉴가 있는지 확인한다. 후보 도메인 또는 격리된 테스트 계정으로 로그인, 저장소·PR 접근, `sync`, AI 분석, 리뷰 게시, 협업방 입장·재연결을 가능한 범위에서 점검한다. 단, 후보 도메인 테스트가 실제 운영 별칭/외부 연동까지 보장하지는 않는다.
3. 앱과 Socket의 `SOCKET_INTERNAL_SECRET`, `NEXTJS_URL`, `SOCKET_ALLOWED_ORIGINS`, `REDIS_URL`, GitHub 토큰 암호화 키 및 DB 연결 **변수의 존재·대상 환경·호환성만** 확인한다. 비밀값은 문서나 로그에 적지 않는다. 특히 Vercel `REDIS_URL`이 Railway 내부 주소(`*.railway.internal`)면 Vercel에서 접근 가능한 주소인지 확인한다.
4. DB 변경이 원인이라면 앱 롤백만으로 복구된다고 판단하지 않는다. `package.json`의 `prebuild`가 `scripts/migrate-production.mjs`를 실행하고, 운영 빌드에서 `prisma migrate deploy`를 호출한다. 이전 배포를 다시 가리켜도 이미 적용된 DB 마이그레이션은 되돌아가지 않는다. `7a7509d`와 `d23ec7a` 사이에 저장소의 `prisma/migrations` 변경은 없지만, 실제 DB 상태와 연결 대상은 별도 확인이 필요하다. [Prisma 운영 마이그레이션 문서](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production).
5. 2026-11-08 수동 백업 파일명은 `codemate-public-2026-11-08.dump`이며, 저장 위치와 무결성 해시는 비공개 백업 기록 `MANIFEST.md`에서 확인한다. 격리된 로컬 PostgreSQL 17에서 복원 시험을 통과했고 `public` 스키마만 포함한다. **Vercel 운영 DB가 이 백업의 Supabase 프로젝트와 동일한지는 미확인**이므로, 이를 운영 DB 복구 가능성의 최종 증거로 간주하지 않는다. 운영 DB 복원·데이터 삭제는 이 배포 롤백 절차에 포함하지 않는다.

## 웹/API 롤백 (Vercel)

1. Vercel `code-mate` 프로젝트 → Overview의 **Production Deployment** → **Instant Rollback**을 연다. 또는 Deployments에서 대상 배포의 `⋮` → Instant Rollback을 선택한다.
2. 현재 배포 `Bsd6Ctx4S…`와 대상 `6FjxXVm…`/커밋 `d23ec7a`가 화면에 표시되는지, 적용될 도메인에 `code-mate-two.vercel.app`이 포함되는지 확인한다. 다르면 중단하고 새 후보를 조사한다. 후보가 선택 불가하면 실행하지 않는다.
3. 변경될 도메인과 외부 API/DB 호환성을 검토한 뒤 롤백을 승인한다. Vercel 롤백은 **과거 배포의 환경 변수 스냅샷을 사용**하며 현재 프로젝트 설정의 새 변수값을 자동 반영하지 않는다. [Vercel 공식 절차](https://vercel.com/docs/instant-rollback).
4. 도메인이 대상 배포를 가리키는지 확인하고 아래 스모크를 실행한다. 실패하면 새 배포를 수정하거나 **Undo Rollback**으로 적절한 배포를 다시 승격한다. 롤백 뒤에는 운영 도메인의 자동 할당이 중지되므로, 정상화 후 Undo Rollback/승격으로 자동 배포를 다시 켰는지 확인한다.

## Socket 롤백 (Railway)

1. Railway `codemate-socket` 서비스 → **Deployments**에서 현재 배포와 직전 성공 배포의 SHA·시각·배포 ID를 확인해 사고 기록에 적는다. 이 단계는 Railway 로그인/대시보드 접근이 없어 아직 직접 확인하지 못했다.
2. Socket 배포가 원인으로 확인되고 직전 버전이 호환될 때만 대상의 `⋮` → **Rollback**을 선택한다. [Railway 공식 문서](https://docs.railway.com/deployments/deployment-actions)에 따르면 Docker 이미지와 사용자 지정 변수도 함께 복구되며, 보존 기간이 지난 배포는 롤백 메뉴가 없을 수 있다.
3. 재시작 후 Socket `/health`가 200인지, 입장·채팅·재연결·퇴장과 웹 앱의 연결을 확인한다. Redis나 웹 API 자체가 원인이면 Socket 롤백으로 해결되지 않을 수 있다.

## 롤백 직후 최소 확인 및 기록

- 운영 도메인에서 로그인 → 권한 있는 저장소/PR 연결 → diff와 AI 분석 → 리뷰 작성·GitHub 게시 → 협업방 입장·채팅·재연결·퇴장을 두 계정으로 확인한다. 음성 연결은 권한 허용/거부와 실패 표시를 확인한다.
- `sync` 요청의 HTTP 상태와 사용자 알림, API 5xx/429, Vercel Runtime Logs, Railway `/health` 및 Socket/Redis 로그, GitHub·AI API 오류를 사고 전후로 비교한다. 개인정보·토큰·전체 연결 URL은 기록하지 않는다.
- 사고 기록에 `발생 시각 / 영향 범위 / 원인 가설 / 롤백 전후 Git SHA·배포 ID / 실행자 / 롤백 시각 / 스모크 결과 / 재발 여부 / 정상 배포 재승격 시각`을 적는다.

이 문서 작성 중 **운영 롤백·재배포·DB 변경은 실행하지 않았다**.
