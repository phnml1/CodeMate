# 공유 저장소 다대다 전환 회고

## 배경

CodeMate는 GitHub 저장소를 연결한 뒤 PR 목록, 리뷰 결과, 댓글 협업 기능을 제공한다.  
초기 구조는 저장소 1개를 사용자 1명이 소유하는 형태에 가까웠고, `Repository.userId`를 기준으로 접근 권한을 판단하는 코드가 남아 있었다.

하지만 실제 제품 요구사항은 달랐다.

- 한 저장소를 여러 사용자가 함께 연결할 수 있어야 한다.
- 같은 저장소의 PR, 댓글, 리뷰 결과를 여러 사용자가 함께 봐야 한다.
- AI 리뷰는 사용자별 복제가 아니라 저장소/PR 단위의 공유 리뷰로 동작해야 한다.

이 요구사항을 만족시키기 위해 저장소 접근 모델을 `Repository.userId` 단일 소유자 방식에서 `UserRepository` 조인 테이블 기반의 다대다 방식으로 전환했다.

---

## 문제 상황

다른 사용자가 이미 연결한 저장소를 두 번째 사용자가 연결하려고 하면 아래와 같은 에러가 발생했다.

```text
Repository is already connected by another user
```

또한 저장소 목록 API에서 다음 에러가 발생했다.

```text
GET /api/github/repos?page=1 503
Shared repository migration is not applied. Run the "split_repository_membership" migration first.
```

이 문제는 단순한 UI 이슈가 아니라, 코드와 실제 운영 DB 스키마가 서로 다른 상태에서 발생한 구조적 문제였다.

---

## 원인 분석

### 1. 코드와 DB 스키마가 서로 다른 상태였다

Prisma schema와 migration 파일은 이미 `UserRepository` 기반 다대다 구조를 정의하고 있었다.

- `prisma/schema.prisma`
- `prisma/migrations/20260417000000_split_repository_membership/migration.sql`

하지만 실제 연결된 DB는 아직 이전 구조였다.

- `Repository.userId` 컬럼은 존재
- `UserRepository` 테이블은 없음

즉, 애플리케이션은 다대다를 지향하고 있었지만 실제 DB는 여전히 단일 소유자 구조였다.

### 2. 임시 fallback이 문제를 더 오래 숨겼다

처음에는 런타임 호환을 위해

- `UserRepository`가 있으면 다대다 경로 사용
- 없으면 `Repository.userId` fallback 사용

방식을 넣었다.

이 방식은 일시적으로 화면을 살리는 데는 도움이 됐지만, 실제로는 제품 요구사항과 충돌했다.  
특히 저장소 연결(write path)에서는 fallback이 곧 "다른 사용자는 연결할 수 없음"이라는 정책으로 이어졌다.

### 3. Prisma migration 자체도 바로 적용할 수 없는 상태였다

기존 운영 DB에 이미 테이블과 데이터가 존재했기 때문에, Prisma는 첫 `migrate deploy` 시점에 다음 에러를 반환했다.

```text
P3005: The database schema is not empty
```

즉, 이 DB는 "빈 DB에 migration을 처음부터 올리는 방식"이 아니라, 현재 상태를 기준점으로 삼는 **baseline migration** 절차가 필요했다.

---

## 해결 방법

### 1. 저장소 접근 코드를 다대다 전용으로 정리했다

`lib/repository-access.ts`를 중심으로 저장소 권한 판단을 `UserRepository`만 기준으로 하도록 정리했다.

핵심 변경:

- 접근 가능한 저장소 목록 조회: `UserRepository`
- 저장소 연결: `(userId, repositoryId)` membership 생성
- 저장소 해제: membership 삭제
- 저장소 멤버 조회: `UserRepository` 기반
- 대표 사용자/토큰 조회: membership을 통해 조회

즉, 더 이상 `Repository.userId`를 쓰지 않도록 읽기/쓰기 경로를 모두 정리했다.

관련 파일:

- `lib/repository-access.ts`
- `app/api/repositories/route.ts`
- `app/api/repositories/[id]/route.ts`
- `app/api/github/repos/route.ts`
- `lib/dashboard.ts`
- `lib/stats.ts`
- `app/api/pulls/*`
- `app/api/review/analyze/route.ts`
- `app/api/webhook/github/route.ts`

### 2. fallback을 제거하고, 마이그레이션 누락을 명시적으로 드러냈다

운영 요구사항이 "공유 저장소"인 이상, 단일 소유자 fallback을 유지하면 안 된다고 판단했다.

그래서 `UserRepository`가 없으면 조용히 예전 구조로 fallback하지 않고, 명시적으로 다음 에러를 반환하도록 바꿨다.

```text
Shared repository migration is not applied.
Run the "split_repository_membership" migration first.
```

이렇게 변경한 이유는:

- 원인을 빠르게 식별할 수 있고
- 코드가 제품 요구사항과 어긋난 상태로 오래 남지 않으며
- 운영 환경에서 "왜 다른 사용자는 연결이 안 되지?" 같은 혼란을 줄일 수 있기 때문이다

### 3. 기존 운영 DB를 Prisma baseline 절차로 편입했다

운영 DB가 비어 있지 않았기 때문에 바로 `migrate deploy`를 할 수 없었다.  
그래서 baseline 절차를 사용했다.

진행 순서:

1. 현재 운영 DB 상태를 `schema.baseline.prisma`로 introspect
2. 운영 DB 상태를 기준으로 `0_init` baseline migration 생성
3. `migrate resolve --applied 0_init`로 baseline 등록
4. 이후 실제 신규 migration인 `split_repository_membership` 적용

이 과정으로 "이미 운영 중인 DB"를 Prisma migration 체계 안으로 안전하게 편입할 수 있었다.

추가로 baseline 작업을 위해 아래 파일도 정리했다.

- `prisma/schema.baseline.prisma`

### 4. Supabase 연결 방식도 migration 친화적으로 분리했다

런타임 쿼리는 pooler URL로 잘 동작했지만, Prisma migration은 direct/session 연결이 더 안정적이었다.

그래서 `prisma.config.ts`에서:

- `DATABASE_URL`: 앱 런타임용
- `DIRECT_DATABASE_URL`: Prisma migration용

으로 분리해 사용하도록 정리했다.

이 변경으로 다음 문제를 함께 해결했다.

- pooler URL로 migration이 오래 멈추는 현상
- direct connection / session mode를 구분하지 않아 생기는 운영 혼란

관련 파일:

- `prisma.config.ts`
- `.env.example`
- `README.md`

---

## 결과

### 기능적 결과

- 한 저장소를 여러 사용자가 연결할 수 있게 됐다.
- 같은 저장소의 PR, 댓글, 리뷰 데이터를 여러 사용자가 공유할 수 있게 됐다.
- `"Repository is already connected by another user"` 정책 충돌이 제거됐다.
- 저장소 목록 API가 500으로 뭉개지지 않고, 스키마 상태를 정확히 드러내게 됐다.

### 운영 관점 결과

- 코드와 DB 스키마 불일치를 명확하게 드러내도록 개선했다.
- fallback으로 문제를 숨기지 않고, migration 누락을 명시적으로 노출하도록 바꿨다.
- 기존 운영 DB를 Prisma migration 체계 안으로 baseline 처리해 이후 migration 적용 가능 상태로 전환했다.

---

## 포트폴리오용 요약 문장

### 짧은 버전

> 단일 소유자 기반 GitHub 저장소 연결 구조를 `UserRepository` 조인 테이블 기반의 다대다 모델로 전환해, 여러 사용자가 같은 저장소와 PR 리뷰 데이터를 공유할 수 있도록 개선했습니다. 기존 운영 DB는 Prisma baseline migration 절차로 편입해 안전하게 스키마를 전환했고, migration 누락 시 명시적 에러를 반환하도록 해 운영 디버깅 난이도도 낮췄습니다.

### 조금 더 자세한 버전

> GitHub 저장소 연결 기능이 `Repository.userId` 단일 소유자 구조에 묶여 있어, 다른 사용자가 이미 연결한 저장소를 추가로 연결할 수 없는 문제가 있었습니다. 이를 해결하기 위해 `UserRepository` 조인 테이블 기반의 다대다 저장소 접근 모델로 전환하고, PR/댓글/AI 리뷰 공유 흐름이 이 모델을 일관되게 사용하도록 API와 접근 제어 로직을 정리했습니다. 또한 비어 있지 않은 기존 운영 DB를 Prisma baseline migration 절차로 편입해 스키마 전환을 안전하게 수행했고, migration 누락 시 500이 아닌 명시적 에러를 반환하도록 개선해 운영 가시성을 높였습니다.

---

## 배운 점

### 1. 읽기 경로 fallback과 쓰기 경로 정책은 분리해서 봐야 한다

읽기 fallback은 일시적인 호환성 확보에 유용할 수 있다.  
하지만 쓰기 경로까지 fallback을 허용하면, 제품 요구사항과 다른 정책이 실제 운영에 남아 버릴 수 있다.

이번 사례에서는 "여러 사용자가 같은 저장소를 연결할 수 있어야 한다"는 요구가 명확했기 때문에, 쓰기 경로는 다대다 모델만 허용하는 편이 맞았다.

### 2. 운영 DB 전환에서 migration 파일만 있다고 끝이 아니다

코드 저장소에 migration SQL이 존재해도, 실제 운영 DB에 반영되지 않았다면 제품은 여전히 이전 구조로 동작한다.  
특히 Prisma를 기존 DB에 도입할 때는 baseline 전략이 중요하다는 점을 체감했다.

### 3. 명시적인 장애 메시지는 디버깅 시간을 크게 줄인다

초기에는 `/api/github/repos`가 단순 500으로 보였지만, 원인을 구체적인 503 메시지로 노출한 뒤부터는 문제 범위를 빠르게 좁힐 수 있었다.

운영 환경에서는 "고쳤는가"만큼 "왜 안 되는지 빨리 알 수 있는가"도 중요하다.

---

## 관련 키워드

- Prisma Migrate
- Baselining Existing Database
- PostgreSQL Schema Migration
- Next.js App Router
- Multi-tenant Repository Access
- Many-to-Many Modeling
- GitHub Integration
- Operational Debugging
