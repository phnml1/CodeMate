# CodeMate 실시간 협업방 구현 계획

> 상태: 설계안 초안
> 작성 기준일: 2026-09-15
> 범위: 저장소 분석 및 구현 계획만 포함하며, 애플리케이션 코드는 변경하지 않는다.
> 구현 시작 조건: 이 문서의 필수 결정 사항을 검토하고 사용자 승인을 받은 뒤 단계별 PR로 진행한다.

## 요약

현재 CodeMate는 `NEXT_PUBLIC_REALTIME_MODE` 하나로 일반 PR 댓글과 알림의 polling/WebSocket 방식을 함께 결정한다. Socket 모드에서는 보호된 모든 화면의 헤더에 있는 알림 벨이 전역 소켓 연결을 유발하고, PR 상세 화면은 같은 소켓으로 PR room에 들어가 댓글·타이핑 이벤트를 받는다.

목표 구조에서는 이 두 흐름을 완전히 분리한다.

- 일반 PR 상세 댓글과 전역 알림은 항상 REST API + React Query polling을 사용한다.
- 일반 화면에서는 Socket.IO client를 로드하거나 연결하지 않는다.
- 사용자가 실시간 협업방에 명시적으로 입장했을 때만 방 전용 WebSocket 연결을 만든다.
- 협업방의 방/멤버/메시지/코드 참조는 PostgreSQL에 저장한다.
- 현재 접속자, 포커스, 타이핑, 음성 상태는 일시 데이터로 관리한다.
- 단일 Socket 서버 MVP에서는 메모리 기반 presence를 허용하되, 운영 다중 인스턴스 단계에서는 Redis로 정원과 presence를 원자적으로 관리한다.
- 텍스트 채팅·코드 포커스가 안정화된 뒤 음성은 WebRTC로 추가한다. Socket.IO는 음성 데이터가 아니라 signaling에만 사용한다.

권장 MVP 범위는 **PR에 연결된 협업방 + 정원 제한 + presence + 영속 텍스트 채팅 + 단일 코드 위치 참조 + 사용자 포커스/따라가기**이다. 음성, 초대 링크, 메시지 편집, 독립형 저장소 방은 MVP 이후로 미룬다.

---

## 1. 현재 구조 분석

### 1.1 polling/WebSocket 결정 과정

`hooks/useSocket.ts:23`에서 아래 조건을 모듈 전역 상수로 계산한다.

```ts
const realtimeEnabled = process.env.NEXT_PUBLIC_REALTIME_MODE === "socket"
```

이 값은 댓글과 알림의 통신 방식을 동시에 결정한다.

| 영역 | 현재 결정 방식 | 코드 근거 |
|---|---|---|
| 소켓 활성화 | `NEXT_PUBLIC_REALTIME_MODE === "socket"` | `hooks/useSocket.ts:23` |
| 소켓 연결 | `useSocket()` 호출 시 `useEnsureSocketConnection()` 실행 | `hooks/useSocket.ts:335-345` |
| 인증 토큰 | `/api/socket/token`에서 60초 HMAC 토큰 발급 | `hooks/useSocket.ts:218-236`, `app/api/socket/token/route.ts:5-28` |
| 댓글 polling | socket이 아니거나 fallback이면 10초 | `hooks/useRealtimeComments.ts:58-62` |
| 알림 polling | socket이 아니거나 fallback이면 10초 | `hooks/useNotifications.ts:23-24`, `hooks/useNotifications.ts:219-225` |
| CI | realtime mode를 polling으로 고정 | `.github/workflows/ci.yml:28-36` |

Socket 모드에서 첫 연결이 실패하면 8초 grace 이후 polling fallback으로 전환한다. 최초 `connect_error`에서는 소켓 재시도를 차단하고 socket client를 제거한다. 이 로직은 일반 기능과 실시간 기능이 한 상태 기계에 결합된 결과다.

### 1.2 실제 소켓 생성 시점

소켓은 PR 상세 화면에서만 생성되는 것이 아니다.

1. 모든 보호된 페이지는 `app/(protected)/layout.tsx:12-16`에서 `AppHeader`를 렌더링한다.
2. `components/layout/AppHeader.tsx:23`은 로그인 사용자에게 `NotificationBell`을 렌더링한다.
3. `components/notification/NotificationBell.tsx:15`은 항상 `useNotificationSummary()`를 호출한다.
4. `hooks/useNotifications.ts:214`의 `useNotificationSummary()`가 `useSocket()`을 호출한다.
5. 따라서 socket 모드에서는 대시보드 등 모든 보호된 화면에서 소켓 연결을 시도한다.

`SocketConnectionBadge` 자체는 `useSocketState()`만 읽으므로 연결을 만들지 않지만, 같은 헤더의 알림 벨이 실제 연결을 만든다.

### 1.3 PR 댓글 데이터 흐름

#### 조회

```text
PRDetailPage (server)
  -> PRDetailContainer (client)
    -> PRDetailLayout
      -> CommentSection (server slot)
        -> CommentList (client)
          -> useRealtimeComments(prId)
             -> GET /api/pulls/:prId/comments
             -> socket 모드: PR room 이벤트로 캐시 갱신
             -> polling/fallback: 10초 refetch
```

- `components/comment/CommentList.tsx:251`은 `useRealtimeComments(prId)`를 사용한다.
- `hooks/useRealtimeComments.ts:53`은 먼저 `useSocketRoom(prId)`로 room에 들어간다.
- `components/pulls/detail/PRDetailLayout.tsx:44`도 별도로 `useSocketRoom(id)`를 호출한다.
- 따라서 PR 상세에서 같은 소켓에 `room:join`이 중복 emit될 수 있다.
- Socket.IO room membership 자체는 집합이지만, 어느 한 effect가 먼저 정리되면서 `room:leave`를 보내면 다른 consumer가 남아 있어도 room에서 빠질 수 있다. 참조 횟수 관리가 없기 때문이다.
- `hooks/pr-detail/usePRCommentGroups.ts:7`은 별도로 `useComments(prId)`를 호출하지만 `useRealtimeComments`와 동일한 `['comments', prId]` query key를 공유한다. 캐시는 공유되지만 observer별 옵션이 분산돼 있어 polling 정책을 한 곳에서 이해하기 어렵다.

#### 생성·수정·삭제·반응

- 댓글 생성은 `POST /api/pulls/:prId/comments`가 DB 저장 후 `emitCommentNew()`을 호출한다 (`app/api/pulls/[id]/comments/route.ts:132-149`).
- 수정/삭제는 해당 API가 DB 변경 후 `comment:updated`, `comment:deleted`를 발행한다 (`app/api/comments/[id]/route.ts:58-68`, `120-124`).
- 반응은 변경 후 `comment:reaction-updated`를 발행한다 (`app/api/comments/[id]/reactions/route.ts:72-82`).
- `lib/socket/emitter.ts:8-26`은 `SOCKET_SERVER_URL/internal/emit`에 서버 간 HTTP 요청을 보내고, standalone Socket 서버가 이를 room에 broadcast한다.
- `useCreateComment()`은 polling/fallback일 때만 성공 응답을 캐시에 즉시 추가하고 항상 invalidate한다 (`hooks/useComments.ts:67-91`). Socket 정상 상태에서는 broadcast 이벤트가 캐시를 채운다는 전제다.
- 반응은 `onMutate`에서 optimistic patch, 오류 시 rollback, 성공 시 서버 응답으로 보정한다 (`hooks/useComments.ts:141-180`).

### 1.4 알림 흐름과 분리 영향

- 알림 요약과 목록은 Socket 정상 연결 중에는 polling을 중지한다.
- `notification:new` 이벤트는 알림 수와 기존 목록 캐시를 patch하고 toast를 띄운다 (`hooks/useNotifications.ts:228-254`).
- polling 모드에서는 unread count 증가를 감지해 일반 toast를 띄운다 (`hooks/useNotifications.ts:266-278`).
- 댓글 생성, GitHub webhook, 리뷰 알림 생성 코드가 `emitNotification()`에 의존한다.
  - `app/api/pulls/[id]/comments/route.ts:15-38`
  - `app/api/webhook/github/route.ts:12,65`
  - `lib/review-notifications.ts:6,81`

목표 원칙상 일반 화면에서 WebSocket을 열지 않으므로 알림도 polling으로 고정하는 것이 일관된다. 그렇지 않고 협업방 소켓에 알림까지 실으면 방에 들어간 사용자만 실시간 알림을 받고 나머지는 polling하는 불일치가 생긴다.

### 1.5 타이핑 이벤트 흐름

- 일반 댓글 타이핑은 `typing:start/stop` 이벤트를 PR room으로 보낸다 (`hooks/useTypingIndicator.ts:39-62`).
- 인라인 댓글 타이핑은 파일과 줄 번호를 포함한다 (`hooks/useInlineTypingIndicator.ts:42-76`).
- `DiffTable`마다 `useInlineTypingIndicator()`를 호출하고, 인라인 입력 폼도 같은 hook을 호출한다 (`components/pulls/detail/PRDiffViewer/DiffTable.tsx:40`, `components/comment/InlineCommentForm.tsx:25`).
- 파일 수가 많으면 같은 socket 이벤트에 대한 listener와 local state가 여러 번 만들어질 수 있다.
- 서버는 user ID/name을 인증 결과에서 가져오지만 `room:join`의 `prId` 접근 권한은 확인하지 않는다 (`socket-server/handlers.ts:4-10`). 인증된 사용자가 임의의 PR room ID를 emit할 수 있는 구조다.

일반 PR 페이지가 polling 전용이 되면 기존 일반/인라인 댓글 타이핑 표시는 제거한다. 실시간 협업방에서는 방 루트에 단 하나의 presence/focus/typing subscriber를 두어 중앙 집중식으로 관리한다.

### 1.6 Socket 서버 구현이 병존하는 이유와 실제 실행 경로

저장소에는 두 서버 경로가 있다.

| 구현 | 시작 경로 | 인증 | 내부 emit endpoint | 현재 npm script 연결 |
|---|---|---|---|---|
| Next 결합형 | `server.ts` -> `lib/socket/server.ts` | 세션 쿠키를 Prisma로 직접 조회 | 없음 | 없음 |
| standalone | `socket-server/index.ts` | Next가 발급한 HMAC 토큰 검증 | `/internal/emit` 있음 | `npm run dev:socket` |

근거:

- `server.ts:11-19`는 Next custom HTTP server에 `lib/socket/server.ts`를 붙인다.
- 그러나 `package.json:6-10`의 `dev`와 `start`는 각각 `next dev`, `next start`이며 `server.ts`를 실행하지 않는다.
- `package.json:7`의 `dev:socket`만 `socket-server/index.ts`를 실행한다.
- 브라우저는 기본값 `http://localhost:4000`으로 연결한다 (`hooks/useSocket.ts:233`). 이는 standalone 서버의 기본 포트와 같다 (`socket-server/index.ts:7`).
- Next API의 서버 emit은 standalone 서버에만 있는 `/internal/emit`을 호출한다 (`lib/socket/emitter.ts:16`, `socket-server/index.ts:32-50`).

따라서 **현재 npm script 기준 실제 사용 경로는 standalone `socket-server/**`**이며, `server.ts`와 `lib/socket/server.ts`, `lib/socket/handlers.ts`, `lib/socket/auth.ts`는 별도의 수동 실행 없이는 활성화되지 않는다. 둘을 계속 유지하면 인증 방식과 이벤트 타입이 쉽게 어긋난다.

권장안은 standalone Socket 서버를 유일한 realtime runtime으로 지정하고 Next는 일반 HTTP/DB 업무를 담당하는 것이다. 결합형 서버 코드는 Phase 0에서 실제 배포 명령까지 확인한 뒤 제거한다.

### 1.7 현재 타입과 보안상 주의점

- `lib/socket/types.ts`와 `socket-server/types.ts`가 이벤트 타입을 복제한다.
- standalone 타입에는 `comment:reaction-updated`가 없지만 브라우저 타입과 emitter에는 있다. 내부 emit에서 `any` cast로 우회하므로 컴파일 타임 계약이 이미 깨져 있다 (`socket-server/index.ts:42-44`).
- `/api/socket/token`은 로그인 사용자 ID와 이름을 서명하지만 room scope를 포함하지 않는다. 토큰을 가진 사용자는 임의 room join 이벤트를 보낼 수 있다.
- standalone HMAC 검증은 평문 문자열 비교다 (`socket-server/auth.ts:25-27`). 새 토큰 검증에서는 길이를 확인한 뒤 `timingSafeEqual`을 사용한다.
- 댓글 조회/생성은 repository membership을 검사하지만, 기존 resolve API는 로그인 여부만 검사한다 (`app/api/comments/[id]/resolve/route.ts:34-48`). reaction API도 댓글이 속한 repository 접근을 별도로 검증하지 않는다. 협업방 API는 이 패턴을 복제하지 않고 모든 요청에서 room -> PR -> repository membership을 확인해야 한다.

### 1.8 코드 위치 표현의 현재 한계

- `PullRequest` 모델에는 base/head commit SHA가 없다 (`prisma/schema.prisma:118-147`).
- `/api/pulls/:id/files`는 GitHub에서 filename과 patch를 가져오지만 SHA를 반환하지 않는다 (`app/api/pulls/[id]/files/route.ts:44-59`).
- `parsePatch()`는 hunk header의 실제 line number를 해석하지 않고 patch 배열의 행 카운터를 `oldNum/newNum`으로 사용한다 (`lib/diff.ts:10-24`).
- 기존 deep link와 DOM ID는 이 번호에 의존한다 (`hooks/pr-detail/usePRDetailDeepLink.ts:13-24`, `lib/pr-detail/diffUtils.ts:3-4`).

코드 참조 채팅을 영속 기능으로 만들기 전에 Git unified diff hunk header를 정확히 파싱하고 LEFT/RIGHT line 좌표와 head/base SHA를 확보해야 한다. 그렇지 않으면 PR이 갱신되기 전에도 코드 링크가 잘못된 줄로 이동할 수 있다.

### 1.9 재사용/분리/제거 분류

| 분류 | 대상 | 이유 |
|---|---|---|
| 재사용 | React Query provider와 댓글 cache helper | polling 캐시와 mutation patch에 활용 가능 |
| 재사용 | repository access helper | 방/PR 접근 권한의 기반 |
| 재사용 | PR 파일 조회, PR detail store, 파일/줄 navigation | 협업 코드 workspace 기반. 줄 좌표 보정 필요 |
| 재사용 | standalone Socket.IO 프로세스와 HMAC 토큰 개념 | 방 전용 gateway로 발전 가능 |
| 분리 | `Comment`와 `ChatMessage` | 수명, 정렬, 권한, 코드 참조, 멱등성 요구가 다름 |
| 분리 | 일반 댓글 polling과 협업방 socket 상태 | fallback 중심 전역 상태를 제거하고 명시적 방 연결로 전환 |
| 중앙화 | typing/focus/presence subscriber | 파일별 hook 중복을 방 루트 1개로 축소 |
| 제거 후보 | `server.ts`, `lib/socket/server.ts`, `lib/socket/handlers.ts`, `lib/socket/auth.ts` | npm 실행 경로에서 사용되지 않는 중복 runtime |
| 제거 후보 | PR/헤더의 전역 socket 상태 badge | 일반 화면이 polling 전용이 되면 의미가 없음 |

---

## 2. 요구사항 해석 및 기본 가정

### 2.1 권장 기본값

| 항목 | 권장 기본값 | 이유 |
|---|---|---|
| 방 범위 | MVP는 반드시 하나의 PR에 연결 | 코드 workspace와 접근 권한을 명확하게 유지 |
| 접근 정책 | 해당 repository의 `UserRepository` 멤버만 | 기존 권한 모델 재사용 |
| 방 노출 | 접근 가능한 PR의 활성 방 목록에서 조회 | 초대 시스템 없이도 MVP 완성 가능 |
| 방 정원 | 2~20명, 기본 8명, 소유자 포함 | 텍스트 협업에는 충분하고 추후 음성 비용 제한에 유리 |
| 정원 계산 | socket 수가 아닌 활성 unique user 수 | 다중 탭/재연결 중복 방지 |
| 방 상태 | `ACTIVE`, `ENDED`; 종료 후 읽기 전용 | 기록 보존과 단순한 수명 주기 |
| 소유자 | 생성자 1명, 종료/정원 변경 권한 | MVP 권한 모델 최소화 |
| 연결 종료 grace | 마지막 heartbeat 이후 45초, heartbeat 15초 | 순간 단절/새로고침 허용 |
| 댓글 polling | foreground 10초, focus/reconnect 즉시 refetch | 현재 체감 유지, background 낭비 방지 |
| 알림 polling | foreground 10초 | 일반 화면 WebSocket 금지 원칙 유지 |
| 메시지 길이 | 1~4,000자 | abuse와 payload 크기 제한 |
| 메시지 이력 | 최신 50개 + cursor 기반 이전 페이지 | offset 중복/누락 방지 |
| 코드 참조 | 메시지당 0개 또는 1개 | 첫 버전 UI와 검증 단순화 |
| 메시지 편집/삭제 | MVP 이후 | 실시간 정합성과 감사 정책 결정을 뒤로 분리 |
| 음성 녹음 | 지원하지 않음 | 개인정보·보관·동의 범위 급증 방지 |

### 2.2 주요 선택지와 권장안

#### PR 연결 방 vs 독립 방

- 대안 A: 모든 방은 PR에 연결한다.
- 대안 B: repository room을 만들고 필요할 때 여러 PR을 연결한다.
- **권장: MVP는 A.** 코드 focus 대상과 repository 권한을 한 번에 결정할 수 있다. B는 이후 `scopeType` 확장으로 추가한다.

#### 참여 이력과 현재 접속자를 같은 테이블로 관리할지

- DB membership만으로 현재 접속자를 관리하면 비정상 종료 시 `leftAt`가 남고, heartbeat update가 DB write 부하를 만든다.
- 메모리/Redis presence만 사용하면 참여 이력과 owner/member 권한을 보존하기 어렵다.
- **권장: DB의 `CollaborationRoomMember`는 영구 membership/이력, 메모리 또는 Redis는 활성 presence/정원 계산에 사용한다.**

#### Socket 서버가 DB에 직접 접근할지

- 직접 접근은 hop이 적지만 standalone 빌드가 Prisma와 도메인 코드를 중복 소유하게 된다.
- 내부 API 방식은 한 번의 HTTP hop이 추가되지만 Next의 Prisma/권한 로직을 단일 소스로 유지할 수 있다.
- **권장: MVP Socket 서버는 얇은 gateway로 유지하고, room authorization과 메시지 영속화는 비공개 Next internal API에 요청한다.** 부하가 실제 문제가 될 때 shared server package로 추출한다.

#### 음성 mesh vs SFU

- mesh는 별도 미디어 서버 없이 시작할 수 있지만 N명일 때 각 참가자가 N-1개 업로드를 수행한다.
- SFU는 서버 비용과 운영 복잡도가 있지만 품질, 모바일, 6명 이상 확장성이 낫다.
- **권장: 제품 기능으로 제공할 때는 managed SFU를 우선 검토한다.** 2~4명 기술 검증에만 mesh를 사용하고, 정원 8명 기본 방에 mesh를 그대로 출시하지 않는다.

---

## 3. 목표 아키텍처

### 3.1 전체 경계

```text
일반 보호 페이지 / PR 상세
  Browser
    -> Next REST API
    -> React Query polling (댓글/알림 10초)
    X  Socket.IO client 로드/연결 없음

실시간 협업방 /collaboration/rooms/:roomId
  Browser
    -> Next REST API: 방 CRUD, 초기 데이터, 메시지 이력, room-scoped token
    -> Socket.IO: join, presence, message, typing, focus, signaling

  Standalone Socket Gateway
    -> Next internal API: 현재 권한 재검증, 메시지 DB 저장
    -> Memory(MVP) 또는 Redis(운영): presence, 정원, heartbeat, multi-instance fan-out

  PostgreSQL
    -> room, member, message, code reference, PR commit SHA
```

### 3.2 일반 PR polling 흐름

1. `CommentList`와 PR diff가 하나의 `useComments(prId)` query contract를 사용한다.
2. 페이지 진입 즉시 `GET /api/pulls/:id/comments`를 호출한다.
3. 화면이 visible인 동안 10초마다 갱신한다. background tab에서는 중지한다.
4. window focus 및 network reconnect 시 즉시 갱신한다.
5. 생성 성공 응답은 query cache에 즉시 병합하고, 이어서 invalidate하여 서버를 최종 기준으로 맞춘다.
6. 수정/삭제/resolve도 성공 응답으로 해당 item을 즉시 patch/remove한 뒤 invalidate한다.
7. reaction은 현재처럼 `onMutate` optimistic patch와 오류 rollback을 유지한다.
8. 중복 댓글은 `comment.id` 기준으로 제거한다.

첫 단계에서는 생성 댓글을 서버 응답 이전에 화면에 삽입하는 “완전 optimistic create”까지 확장하지 않는다. 현재 동작과 위험을 최소화하기 위해 전송 중 상태를 표시하고, 성공 직후 cache patch한다. 협업 채팅에는 별도의 `clientMessageId`를 두어 진짜 optimistic send를 지원한다.

### 3.3 협업방 연결 생명주기

```text
1. Server Page가 session과 room/PR 접근 권한을 확인
2. CollaborationRoomClient mount
3. POST /api/collaboration/rooms/:id/join
   - 접근 권한 확인
   - membership upsert
   - 짧은 room-scoped token 발급
4. socket.io-client dynamic import 및 연결
5. collab:room:join { roomId, clientInstanceId, lastMessageId }
6. 서버 재검증 + 정원 원자 확인
7. 성공 ack: room snapshot + participants + server time
8. heartbeat / focus / typing / message 교환
9. route 이탈 시 leave emit 후 disconnect
10. 비정상 종료 시 TTL/grace 만료 후 presence 제거
```

- socket instance는 협업방 client root가 소유한다.
- 일반 layout이나 전역 provider에 socket singleton을 두지 않는다.
- `clientInstanceId`는 `sessionStorage`에 생성해 새로고침 동안 유지한다.
- 한 사용자의 여러 탭/socket은 presence 하나로 합치고 정원 1명으로 센다.
- 마지막 socket이 끊긴 즉시 퇴장시키지 않고 grace 동안 자리를 유지한다.
- 재연결 시 같은 user ID이면 기존 자리를 갱신하고 중복 count하지 않는다.

### 3.4 인증 및 권한 흐름

#### REST

모든 public API는 `auth()`로 user ID를 가져온 뒤 다음 체인을 검증한다.

```text
roomId
  -> CollaborationRoom.pullRequestId
  -> PullRequest.repoId
  -> UserRepository(userId, repoId)
```

- user ID, user name, role은 request body에서 받지 않는다.
- 존재하지만 권한 없는 방은 정보 노출을 줄이기 위해 일반적으로 404를 반환한다.
- owner 전용 변경은 membership 확인 후 403을 반환할 수 있다.

#### WebSocket

- `/api/collaboration/rooms/:id/join`이 `sub`, `roomId`, `jti`, `exp`가 서명된 60초 token을 발급한다.
- socket handshake token은 특정 room에만 유효하다.
- Socket 서버는 token의 user ID를 socket data에 저장하고 client payload의 user ID는 무시한다.
- `collab:room:join` 때 internal authorization API로 room ACTIVE 상태와 repository membership을 다시 확인한다.
- token 검증은 `timingSafeEqual`, expiration, room ID 일치, 허용 origin을 확인한다.
- internal API는 browser에서 접근할 수 없는 network path를 우선 사용하고, 별도 secret과 body size 제한을 적용한다.

### 3.5 메시지 전송 흐름

```text
Client
  1. clientMessageId(UUID)로 pending message 표시
  2. collab:message:send emit + 5초 ack timeout

Socket Gateway
  3. joined room / rate / payload schema 검사
  4. internal message API 호출 (trusted socket userId 전달)

Next internal API
  5. room/권한/ACTIVE 재검증
  6. (roomId, authorId, clientMessageId) unique로 DB upsert/create
  7. canonical message DTO 반환

Socket Gateway
  8. collab:message:created broadcast
  9. sender ack에 같은 canonical DTO 반환

Clients
 10. message.id/clientMessageId 기준 pending 교체 및 중복 제거
```

ack가 유실되어 client가 재전송해도 composite unique constraint 덕분에 같은 메시지를 반환한다. broadcast가 ack보다 먼저 도착해도 같은 ID로 merge한다.

### 3.6 일시 데이터와 영구 데이터

| 데이터 | 저장 위치 | 수명 |
|---|---|---|
| 방 설정/상태 | PostgreSQL | 방 종료 후에도 보존 |
| membership/role/참여 시각 | PostgreSQL | 보존 |
| 채팅 메시지/코드 참조 | PostgreSQL | 정책에 따라 보존 |
| 현재 접속자 | 메모리(MVP), Redis(운영) | heartbeat TTL |
| 현재 file/line focus | 메모리/Redis | presence TTL |
| typing | 메모리/Redis | 약 3초 TTL |
| follow 대상 | follower의 client local state | 탭 종료까지 |
| mic mute/speaking | presence 또는 미디어 SDK 상태 | 연결 종료까지 |
| SDP/ICE signaling | 전달만 하고 저장하지 않음 | 이벤트 처리 순간 |

---

## 4. 데이터 모델 제안

아래 이름은 기존 `Comment`와의 의미 충돌을 피하기 위해 `Collaboration` prefix를 사용한다.

### 4.1 `CollaborationRoom`

| 필드 | 타입/제약 | 설명 |
|---|---|---|
| `id` | `String @id @default(cuid())` | 방 ID |
| `name` | `String @db.VarChar(100)` | 표시 이름 |
| `pullRequestId` | `String` FK | MVP에서는 필수 PR |
| `ownerId` | `String` FK | 방 소유자 |
| `maxParticipants` | `Int @default(8)` | API에서 2~20 검증 |
| `status` | `CollaborationRoomStatus @default(ACTIVE)` | `ACTIVE`, `ENDED` |
| `createdAt` | `DateTime @default(now())` | 생성 시각 |
| `updatedAt` | `DateTime @updatedAt` | 설정 변경 시각 |
| `endedAt` | `DateTime?` | 종료 시각 |

관계/인덱스:

- `PullRequest.collaborationRooms`
- `User.ownedCollaborationRooms`
- `members`, `messages`
- `@@index([pullRequestId, status, createdAt])`
- `@@index([ownerId, status])`

방은 물리 삭제하지 않고 `ENDED`로 전환한다. PR 삭제 시 현재 스키마의 cascade 정책과 맞춰 room도 cascade할 수 있으나, 제품 감사 기록 요구가 생기면 PR soft delete가 선행돼야 한다.

### 4.2 `CollaborationRoomMember`

| 필드 | 타입/제약 | 설명 |
|---|---|---|
| `id` | `String @id @default(cuid())` | membership ID |
| `roomId` | `String` FK | 방 |
| `userId` | `String` FK | 사용자 |
| `role` | `CollaborationRoomRole` | `OWNER`, `MEMBER` |
| `joinedAt` | `DateTime @default(now())` | 최초 참여 |
| `lastJoinedAt` | `DateTime @default(now())` | 최근 입장 |
| `leftAt` | `DateTime?` | 사용자가 명시적으로 최근 퇴장한 시각 |

제약/인덱스:

- `@@unique([roomId, userId])`
- `@@index([userId, lastJoinedAt])`
- owner 생성 시 같은 transaction에서 OWNER membership을 만든다.
- owner transfer를 MVP에서 지원하지 않으며 owner가 종료한다.
- `leftAt`는 현재 online 판정에 사용하지 않는다. online/capacity는 presence store가 결정한다.

### 4.3 `CollaborationMessage`

| 필드 | 타입/제약 | 설명 |
|---|---|---|
| `id` | `String @id @default(cuid())` | 서버 메시지 ID |
| `roomId` | `String` FK | 방 |
| `authorId` | `String` FK | socket 인증 사용자 |
| `clientMessageId` | `String @db.VarChar(64)` | 클라이언트 UUID, 멱등 key |
| `content` | `String @db.Text` | 1~4,000자 plain text |
| `createdAt` | `DateTime @default(now())` | 서버 정렬 기준 |
| `updatedAt` | `DateTime @updatedAt` | 향후 편집 대비 |
| `deletedAt` | `DateTime?` | 향후 soft delete 대비 |

제약/인덱스:

- `@@unique([roomId, authorId, clientMessageId])`
- `@@index([roomId, createdAt, id])`
- `onDelete: Cascade`는 room 물리 삭제가 없다는 전제다.
- client가 보낸 createdAt은 저장하지 않는다.

### 4.4 `CollaborationCodeReference`

| 필드 | 타입/제약 | 설명 |
|---|---|---|
| `id` | `String @id @default(cuid())` | 코드 참조 ID |
| `messageId` | `String @unique` FK | MVP 메시지당 최대 1개 |
| `pullRequestId` | `String` FK | 검증 및 조회 명시성 |
| `filePath` | `String @db.VarChar(1024)` | PR 파일 경로 |
| `side` | `DiffSide` | `LEFT` 또는 `RIGHT` |
| `startLine` | `Int` | 실제 side line 시작 |
| `endLine` | `Int` | 실제 side line 끝, `startLine <= endLine` |
| `commitSha` | `String @db.VarChar(40)` | LEFT면 base, RIGHT면 head snapshot SHA |
| `selectedText` | `String? @db.Text` | UI 미리보기용 제한된 snapshot |
| `contextHash` | `String? @db.VarChar(64)` | 코드 이동 후 anchor 재탐색 보조 |

API validation:

- message room의 `pullRequestId`와 동일해야 한다.
- filePath가 해당 SHA의 PR diff에 존재해야 한다.
- line range는 해당 side의 diff line에 존재하고 최대 200줄로 제한한다.
- `selectedText`는 서버가 신뢰 가능한 diff 데이터에서 재생성하거나 client 값과 비교한다.
- 최신 head SHA와 다르면 메시지는 저장할 수 있으나 “이전 커밋 기준” 배지를 표시한다. 잘못된 최신 줄로 조용히 이동시키지 않는다.

### 4.5 `PullRequest` 확장

정확한 anchor를 위해 다음 nullable 필드를 먼저 추가하고 GitHub sync에서 채운다.

- `baseSha String? @db.VarChar(40)`
- `headSha String? @db.VarChar(40)`

기존 데이터는 다음 sync 시 backfill한다. SHA가 없는 기존 PR에서는 코드 참조 생성을 비활성화하고 일반 메시지는 허용한다.

### 4.6 Voice 관련 데이터

MVP 이후 음성 1차 버전에는 별도 DB 모델을 만들지 않는다.

- 참여 여부, mute, speaking은 ephemeral presence다.
- SDP/ICE는 저장하지 않는다.
- 통화 녹음과 transcript는 지원하지 않는다.
- 운영 metric은 사용자 내용 없이 room ID, 연결 성공/실패, 지연, 참가자 수만 기록한다.

추후 과금·감사 요구가 생길 때만 `VoiceSession(roomId, startedAt, endedAt, peakParticipants, providerSessionId)` 같은 메타데이터 모델을 별도 migration으로 추가한다.

### 4.7 migration 전략

1. SHA 필드와 collaboration table/enums를 한 migration에 추가한다.
2. 기존 테이블/데이터 변경은 nullable/additive 형태로 배포한다.
3. `prisma generate` 후 API를 먼저 배포하되 UI entry는 feature flag로 숨긴다.
4. GitHub sync가 새 SHA를 채우도록 배포한다.
5. 방 기능을 활성화한다.
6. rollback은 UI flag off -> socket room join 차단 -> API read-only 순서로 진행한다. additive DB migration은 즉시 drop하지 않는다.

---

## 5. API 설계

### 5.1 Public REST API

모든 응답 오류는 `{ error: { code, message } }` 형태로 통일한다.

| Method / Path | 요청 | 성공 응답 | 권한 | 주요 오류 |
|---|---|---|---|---|
| `GET /api/collaboration/rooms?prId=&status=&cursor=&limit=` | query | room summary page | 접근 가능한 repo 멤버 | `400`, `401` |
| `POST /api/collaboration/rooms` | `{ name, pullRequestId, maxParticipants }` | `201 { room }` | PR 접근 가능 | `400`, `401`, `404`, `422` |
| `GET /api/collaboration/rooms/:roomId` | 없음 | `{ room, membership, activeCountHint }` | room의 PR 접근 가능 | `401`, `404` |
| `PATCH /api/collaboration/rooms/:roomId` | `{ name?, maxParticipants? }` | `{ room }` | OWNER | `401`, `403`, `404`, `409`, `422` |
| `POST /api/collaboration/rooms/:roomId/join` | 없음 | `{ room, member, socketToken, expiresAt }` | repo 멤버 | `401`, `404`, `409 ROOM_ENDED`, `409 ROOM_FULL_HINT` |
| `POST /api/collaboration/rooms/:roomId/leave` | 없음 | `{ success: true }` | joined member | `401`, `404` |
| `POST /api/collaboration/rooms/:roomId/end` | 없음 | `{ room }` | OWNER | `401`, `403`, `404`, `409` |
| `GET /api/collaboration/rooms/:roomId/messages?before=&limit=` | cursor | `{ messages, nextCursor }` | room 접근 가능 | `401`, `404`, `422` |

`join` REST 응답의 full 여부는 UX를 위한 사전 검사다. 여러 사용자가 동시에 입장할 수 있으므로 실제 자리 확보는 `collab:room:join`의 원자적 presence 연산이 최종 결정한다.

Cursor는 `(createdAt, id)`를 opaque base64url 문자열로 인코딩한다. limit 기본 50, 최대 100으로 제한한다.

### 5.2 Internal API

| Method / Path | 호출자 | 역할 |
|---|---|---|
| `POST /api/internal/collaboration/rooms/:roomId/authorize` | Socket gateway | trusted user ID의 room/PR 접근, ACTIVE, maxParticipants, user DTO 확인 |
| `POST /api/internal/collaboration/rooms/:roomId/messages` | Socket gateway | 메시지/코드 참조 검증과 idempotent DB 저장 |
| `POST /api/internal/collaboration/rooms/:roomId/presence-left` | Socket gateway, 선택 | durable member의 `leftAt` 보조 갱신 |

Internal API 요구사항:

- `SOCKET_INTERNAL_SECRET` 검증.
- public CORS 미허용.
- trusted user ID는 socket이 검증한 token에서만 전달.
- room authorization은 각 write 때 재검증.
- 64KB 이하 body 제한.
- 동일 네트워크 또는 service-to-service TLS 사용.

### 5.3 접근 정책

| 동작 | OWNER | MEMBER | Repo 멤버/미참여 | 비멤버 |
|---|---:|---:|---:|---:|
| 방 조회 | O | O | O | X |
| 입장 | O | O | 정원 내 O | X |
| 메시지 이력 | O | O | O | X |
| 메시지 전송 | 접속 중 O | 접속 중 O | X | X |
| 이름/정원 변경 | O | X | X | X |
| 방 종료 | O | X | X | X |
| 참가자 강퇴 | MVP 이후 | X | X | X |

---

## 6. WebSocket 이벤트 설계

### 6.1 공통 ack 계약

```ts
type SocketAck<T> =
  | { ok: true; data: T; serverTime: string }
  | {
      ok: false
      error: {
        code: string
        message: string
        retryable: boolean
      }
    }
```

대표 오류 코드는 `UNAUTHORIZED`, `FORBIDDEN`, `ROOM_NOT_FOUND`, `ROOM_ENDED`, `ROOM_FULL`, `NOT_JOINED`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`다.

### 6.2 Room/presence 이벤트

| 이벤트 | 방향 | payload | 서버 검증/동작 |
|---|---|---|---|
| `collab:room:join` | C→S + ack | `{ roomId, clientInstanceId, lastMessageId? }` | token room 일치, internal 권한, ACTIVE, 원자적 정원 확보 |
| `collab:room:leave` | C→S + ack | `{ roomId, clientInstanceId }` | 현재 socket membership 확인, 마지막 socket이면 grace 시작 |
| `collab:presence:heartbeat` | C→S + ack 선택 | `{ roomId, clientInstanceId }` | TTL 갱신, 과도한 호출 제한 |
| `collab:room:snapshot` | S→C | `{ room, participants, version }` | join 성공 시 현재 상태 전달 |
| `collab:participant:upserted` | S→C | `{ participant }` | 신규/재연결/상태 변경 |
| `collab:participant:left` | S→C | `{ userId, reason }` | grace/TTL 만료 또는 정상 leave |
| `collab:room:updated` | S→C | `{ name, maxParticipants, version }` | owner REST 변경 후 broadcast |
| `collab:room:ended` | S→C | `{ endedAt, endedBy }` | 입력 비활성화 후 socket 정리 |

`participant` DTO는 `userId`, `name`, `image`, 결정적 `colorToken`, `joinedAt`, `connectionState`, `focus`, `typing`, `voice`만 포함한다. 이메일이나 GitHub token은 절대 포함하지 않는다.

### 6.3 메시지 이벤트

| 이벤트 | 방향 | payload | 서버 검증/동작 |
|---|---|---|---|
| `collab:message:send` | C→S + ack | `{ roomId, clientMessageId, content, codeReference? }` | joined, 1~4000자, rate limit, 코드 위치 검증, DB 저장 |
| `collab:message:created` | S→C | canonical message DTO | DB commit 이후에만 broadcast |
| `collab:typing:set` | C→S | `{ roomId, isTyping }` | joined, per-user debounce/rate limit |
| `collab:typing:updated` | S→C | `{ userId, isTyping, expiresAt }` | 3초 TTL, stop 유실 자동 정리 |

- 메시지 전송 timeout은 5초로 시작한다.
- timeout이면 UI에 “재전송”을 표시하고 같은 `clientMessageId`로만 재시도한다.
- 수신 client는 `message.id` 우선, 전송 client는 `clientMessageId`도 함께 사용해 dedupe한다.
- reconnect 후 REST message query를 invalidate하고 마지막 known ID 이후를 동기화한다.
- transient broadcast replay를 별도로 구현하지 않고 DB를 최종 source of truth로 둔다.

### 6.4 Focus/highlight 이벤트

권장 focus payload:

```ts
type CollaborationFocus = {
  pullRequestId: string
  filePath: string
  side: "LEFT" | "RIGHT"
  startLine: number
  endLine: number
  commitSha: string
  seq: number
}
```

| 이벤트 | 방향 | payload | 처리 |
|---|---|---|---|
| `collab:focus:update` | C→S | `{ roomId, focus, seq }` | joined/PR/file/range 검증, 마지막 seq보다 큰 값만 반영 |
| `collab:focus:cleared` | C→S | `{ roomId, seq }` | focus 제거 |
| `collab:focus:updated` | S→C | `{ userId, focus, seq }` | 다른 participant overlay 갱신 |

전송 정책:

- 단순 스크롤 pixel 좌표는 보내지 않는다.
- 현재 viewport의 대표 diff line 또는 명시적 selection이 바뀔 때만 보낸다.
- 최대 5 events/sec(약 200ms throttle)로 제한하고 마지막 상태만 유지한다.
- 동일 focus 연속 값은 client/server 모두 제거한다.
- 사용자가 participant를 클릭하면 client local `followingUserId`를 설정한다.
- follow 중 대상의 focus가 바뀌면 기존 `selectAndScrollToLine()` 확장 함수를 호출한다.
- 사용자의 수동 scroll/click 또는 Escape로 follow를 해제한다.
- follow 여부 자체는 서버에 저장할 필요가 없다.

### 6.5 WebRTC signaling 이벤트

음성 단계에서만 활성화한다.

| 이벤트 | 방향 | payload 핵심 | 검증 |
|---|---|---|---|
| `collab:voice:join` | C→S + ack | `{ roomId }` | joined room, voice capacity/policy |
| `collab:voice:leave` | C→S | `{ roomId }` | 현재 voice participant |
| `collab:voice:offer` | C→S | `{ roomId, targetUserId, sdp }` | 대상이 같은 voice room에 존재 |
| `collab:voice:answer` | C→S | `{ roomId, targetUserId, sdp }` | 동일 |
| `collab:voice:ice-candidate` | C→S | `{ roomId, targetUserId, candidate }` | 크기/rate 제한 |
| `collab:voice:state` | C→S | `{ roomId, muted }` | speaking은 client 추정 또는 SFU 이벤트 |
| `collab:voice:participant-updated` | S→C | `{ userId, joined, muted, speaking? }` | 같은 room에만 broadcast |

SFU를 채택하면 offer/answer/ICE 직접 중계 대신 provider room token 발급 API와 SDK 이벤트로 대체한다. 제품 출시 전에는 두 구현을 동시에 유지하지 않는다.

### 6.6 이벤트 타입 단일화

- browser와 Socket server가 공유하는 dependency-free protocol 타입을 `types/collaboration-socket.ts` 또는 workspace package로 한 번만 정의한다.
- runtime payload는 TypeScript 타입만 믿지 않고 Zod schema로 검증한다.
- `socket-server/tsconfig.json`의 `rootDir/include`를 조정하거나 `packages/collaboration-protocol` package로 분리한다.
- internal emit의 `as any` 우회는 제거한다.

---

## 7. UI/UX 구조

### 7.1 라우트

| 경로 | Server/Client 경계 | 역할 |
|---|---|---|
| `/collaboration` | `page.tsx` server + `CollaborationRoomsClient.tsx` | 접근 가능한 방 목록, PR 필터, 생성 dialog |
| `/collaboration/rooms/[roomId]` | `page.tsx` server + `CollaborationRoomClient.tsx` | 권한 확인 후 실시간 workspace |

Sidebar에는 `components/layout/sidebar/SidebarNav.tsx`에 “협업방” 항목을 추가한다.

### 7.2 방 목록/생성

- 활성/종료 방 탭.
- PR title, repository, 현재 인원 hint, 정원, owner, 생성 시각 표시.
- 생성 dialog에서 접근 가능한 PR, 방 이름, 2~20명 정원을 선택.
- 동일 PR에 여러 활성 방을 허용하되, 제품 단순화를 원하면 Phase 2에서 `pullRequestId + ACTIVE` partial unique index를 선택할 수 있다. 권장 기본은 여러 방 허용이다.
- 정원 정보는 polling summary이므로 “참고 수치”이며 입장 확정은 socket ack 이후 표시한다.

### 7.3 협업방 workspace

데스크톱 권장 배치:

```text
+-----------------------------------------------------------+
| Room header | connection | participants | voice controls  |
+--------------+-------------------------------+-------------+
| File list    | PR diff/code workspace        | Chat panel  |
|              | participant highlights       | messages    |
|              | follow indicator              | composer    |
+--------------+-------------------------------+-------------+
```

- 모바일에서는 file list와 participant/chat을 sheet/tab으로 전환한다.
- 기존 `PRDiffViewer`를 그대로 복제하지 않고 comment/review 의존성을 분리한 재사용 가능한 code workspace를 추출한다.
- 방 client root가 message/presence/focus state를 소유하고 하위 diff row에는 계산된 highlight만 props/store selector로 전달한다.
- participant 색상은 user ID hash로 결정하되 색상만으로 구분하지 않고 avatar/name label을 함께 표시한다.
- 여러 사용자가 같은 줄을 선택하면 border/marker stack으로 표시하고 배경색을 과도하게 겹치지 않는다.
- 코드 참조 메시지를 클릭하면 해당 파일을 펼치고 line range로 scroll한 뒤 일시 highlight한다.
- SHA가 현재 PR head와 다르면 “이전 커밋의 코드” 상태를 표시하고 자동 이동을 제한하거나 snapshot preview를 보여준다.

### 7.4 연결 상태

기존 전역 `SocketConnectionBadge` 대신 협업방 header 전용 상태를 둔다.

- `연결 중`: composer 비활성, skeleton participant.
- `연결됨`: 실시간 기능 활성.
- `재연결 중`: 기존 메시지 읽기는 유지, 전송은 pending queue 또는 명시적 차단.
- `정원 초과`: 방 화면 진입 전용 상태와 목록으로 돌아가기 CTA.
- `권한 없음/종료됨`: socket retry 중단.
- `일시 오류`: 지수 backoff, 수동 다시 연결.
- reconnect 성공: message REST refetch 후 presence snapshot 교체.

### 7.5 접근성

- 채팅 목록은 `role="log"`, 새 메시지는 적절한 `aria-live="polite"`를 사용하되 과도한 전체 재낭독을 피한다.
- participant/focus 상태는 색상 외에 이름/아이콘/텍스트를 제공한다.
- code line은 keyboard focus와 selection이 가능해야 한다.
- “사용자 따라가기 중” 상태와 해제 단축키를 화면에 알린다.
- motion 감소 설정에서는 smooth scroll과 pulse animation을 줄인다.
- voice control은 mute 상태를 `aria-pressed`로 표현하고 권한 거부 안내를 제공한다.

### 7.6 예상 파일 구조

```text
app/(protected)/collaboration/
  page.tsx
  loading.tsx
  rooms/[roomId]/page.tsx
  rooms/[roomId]/loading.tsx

app/api/collaboration/rooms/
  route.ts
  [roomId]/route.ts
  [roomId]/join/route.ts
  [roomId]/leave/route.ts
  [roomId]/end/route.ts
  [roomId]/messages/route.ts

app/api/internal/collaboration/rooms/[roomId]/
  authorize/route.ts
  messages/route.ts

components/collaboration/
  CollaborationRoomsClient.tsx
  CreateRoomDialog.tsx
  RoomCard.tsx
  room/CollaborationRoomClient.tsx
  room/RoomHeader.tsx
  room/ParticipantList.tsx
  room/ChatPanel.tsx
  room/ChatMessageItem.tsx
  room/ChatComposer.tsx
  room/CodeReferencePreview.tsx
  room/ConnectionState.tsx
  room/VoiceControls.tsx              # Phase 7
  code/CollaborationCodeWorkspace.tsx
  code/ParticipantHighlight.tsx

hooks/collaboration/
  useCollaborationRooms.ts
  useCollaborationRoom.ts
  useCollaborationMessages.ts
  useCollaborationSocket.ts
  useRoomPresence.ts
  useRoomFocus.ts
  useFollowParticipant.ts
  useVoiceRoom.ts                     # Phase 7

lib/collaboration/
  access.ts
  rooms.ts
  messages.ts
  dto.ts
  validation.ts
  token.ts
  internal-client.ts

types/
  collaboration.ts
  collaboration-socket.ts

socket-server/
  index.ts
  auth.ts
  presence.ts
  handlers/room.ts
  handlers/message.ts
  handlers/focus.ts
  handlers/voice.ts                   # Phase 7
```

---

## 8. 단계별 구현 로드맵

### Phase 0. Socket 실행 경로와 계약 정리

**목표**

실제 runtime을 하나로 정하고 새 기능이 중복 코드 위에 쌓이지 않게 한다.

**작업**

1. 개발/배포 시작 명령을 확인해 standalone `socket-server/**`를 공식 runtime으로 확정한다.
2. `server.ts` 및 `lib/socket/server.ts`, `handlers.ts`, `auth.ts`의 외부 사용 여부를 `rg`와 배포 설정으로 재확인한다.
3. 사용되지 않으면 결합형 runtime을 제거한다.
4. 공유 protocol 위치와 socket-server build 방식을 정한다.
5. 현재 socket smoke test를 추가해 baseline을 고정한다.

**예상 변경 파일**

- `package.json`
- `socket-server/package.json`
- `socket-server/tsconfig.json`
- `server.ts` 및 `lib/socket/server.ts`, `lib/socket/handlers.ts`, `lib/socket/auth.ts` 제거 후보
- `types/collaboration-socket.ts` 또는 별도 protocol package
- socket integration test 설정

**선행 조건**

- 실제 production process manager/hosting 명령 확인.

**테스트**

- Next와 Socket 서버 각각 기동.
- `/health` 성공.
- 유효/만료/변조 token 연결 테스트.
- 타입 검사에서 browser/server 이벤트 계약 공유 확인.

**완료 조건**

- socket runtime이 문서와 script 기준 하나뿐이다.
- 중복 이벤트 타입 복사가 없다.
- 인증 실패가 명시적인 connect error로 확인된다.

### Phase 1. 일반 댓글/알림을 polling으로 고정

**목표**

일반 보호 화면이 WebSocket을 로드하거나 연결하지 않게 한다.

**작업**

1. 댓글 query를 단일 `useComments()`로 통합하고 foreground 10초 polling을 설정한다.
2. `useRealtimeComments`, PR의 `useSocketRoom`, 기존 댓글 typing hook 의존성을 제거한다.
3. comment mutation이 socket 여부와 무관하게 성공 응답으로 cache를 patch하도록 단순화한다.
4. 알림 summary/list를 10초 polling으로 고정하고 socket listener를 제거한다.
5. AppHeader/PR header/comment list의 전역 Socket badge/notice를 제거한다.
6. 댓글/알림 API의 구형 socket emit 호출을 제거한다.
7. `NEXT_PUBLIC_REALTIME_MODE`와 CI 설정을 제거한다.
8. `socket.io-client`가 일반 page chunk에 포함되지 않는지 bundle analyzer로 확인한다.

**예상 변경 파일**

- `hooks/useComments.ts`
- `hooks/useRealtimeComments.ts` 제거 후보
- `hooks/useSocket.ts` 제거 또는 Phase 3 전용으로 대체
- `hooks/useSocketRoom.ts`, `hooks/useTypingIndicator.ts`, `hooks/useInlineTypingIndicator.ts` 제거 후보
- `hooks/useNotifications.ts`
- `components/comment/CommentList.tsx`
- `components/comment/InlineCommentForm.tsx`
- `components/pulls/detail/PRDetailLayout.tsx`
- `components/pulls/detail/PRDiffViewer/DiffTable.tsx`
- `components/layout/AppHeader.tsx`
- `components/pulls/detail/PRDetailHeader.tsx`
- `components/realtime/SocketConnectionStatus.tsx` 제거 후보
- 댓글/알림 emitter 호출 API와 관련 mock test
- `.github/workflows/ci.yml`
- `README.md`

**테스트**

- PR 진입 후 10초 polling 및 focus refetch 확인.
- 댓글 생성/수정/삭제/반응/resolve 직후 UI와 다음 polling 결과 일치.
- 대시보드/PR/알림 페이지에서 socket token 및 WebSocket 요청이 0회인지 확인.
- 기존 E2E `comment-create.spec.ts`, accessibility test 회귀.
- socket client bundle이 일반 PR initial chunk에서 제외됐는지 확인.

**완료 조건**

- env 값과 무관하게 일반 댓글/알림이 polling한다.
- 일반 화면에서 `/api/socket/token`과 WebSocket 연결이 발생하지 않는다.
- 기존 댓글 UX가 유지된다.

### Phase 2. 방 데이터와 REST API

**목표**

WebSocket 없이도 방 생성/목록/상세/종료와 메시지 이력 골격을 완성한다.

**작업**

1. Prisma model/enums 및 PullRequest SHA 추가.
2. repository/PR 기반 collaboration access helper 작성.
3. room CRUD/join/leave/end API와 Zod validation 작성.
4. room list, create dialog, read-only room shell UI 작성.
5. owner membership transaction과 room-scoped token 발급 구현.
6. SHA sync/backfill 경로 추가.

**예상 변경 파일**

- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_collaboration_rooms/migration.sql`
- `lib/pull-request-sync.ts`
- `lib/collaboration/**`
- `app/api/collaboration/rooms/**`
- `types/collaboration.ts`
- `app/(protected)/collaboration/**`
- `components/collaboration/**`
- `components/layout/sidebar/SidebarNav.tsx`

**테스트**

- API unit/integration: 401/404/403/422, owner 동작, repo 격리.
- owner와 member relation 생성 transaction.
- pagination cursor 안정성.
- 종료 방 read-only.

**완료 조건**

- 접근 가능한 사용자가 방을 만들고 목록/상세를 조회할 수 있다.
- 비멤버에게 방/PR 정보가 노출되지 않는다.
- room-scoped token이 다른 방에서 거부된다.

### Phase 3. 방 전용 WebSocket과 presence/정원

**목표**

협업방에서만 연결되는 실시간 presence와 서버 권위 정원 제한을 완성한다.

**작업**

1. `useCollaborationSocket(roomId)`를 room client root에만 추가한다.
2. room join/leave/heartbeat/snapshot 이벤트와 ack 계약을 구현한다.
3. Socket gateway가 internal authorization API를 호출하도록 한다.
4. 단일 인스턴스 presence registry를 user 단위로 구현한다.
5. 다중 탭 socket set과 last-socket grace를 처리한다.
6. owner가 방을 종료하면 모든 client에 알리고 연결을 닫는다.
7. connection state, participant list, room full UI를 구현한다.

**예상 변경 파일**

- `hooks/collaboration/useCollaborationSocket.ts`
- `hooks/collaboration/useRoomPresence.ts`
- `components/collaboration/room/**`
- `socket-server/auth.ts`
- `socket-server/presence.ts`
- `socket-server/handlers/room.ts`
- `app/api/internal/collaboration/rooms/[roomId]/authorize/route.ts`
- shared protocol/schema 파일

**테스트**

- 정원 N에 N+1명이 동시에 join할 때 정확히 N명만 성공.
- 같은 user 3개 탭이 정원 1명으로 계산.
- 새로고침 30초 내 reconnect 시 자리/색상 유지.
- TTL 이후 stale participant 제거.
- 종료/권한 회수/만료 token 재연결 중단.

**완료 조건**

- 일반 화면에는 socket이 없고 방 route에서만 연결된다.
- 정원은 client 표시가 아니라 server join ack로 강제된다.
- presence가 다중 탭과 비정상 종료에서 수렴한다.

### Phase 4. 영속 실시간 텍스트 채팅

**목표**

재입장 가능한 메시지 이력과 optimistic 전송을 제공한다.

**작업**

1. message internal API와 DB 멱등 constraint 구현.
2. Socket message send/created/typing 이벤트 구현.
3. React Query infinite message history와 socket cache merge 구현.
4. pending/sent/failed/retry UI 구현.
5. 메시지 길이/rate limit/XSS 안전 렌더링 적용.
6. reconnect 시 REST backfill을 구현한다.

**예상 변경 파일**

- `lib/collaboration/messages.ts`, `validation.ts`, `dto.ts`
- `app/api/collaboration/rooms/[roomId]/messages/route.ts`
- `app/api/internal/collaboration/rooms/[roomId]/messages/route.ts`
- `socket-server/handlers/message.ts`
- `hooks/collaboration/useCollaborationMessages.ts`
- `components/collaboration/room/Chat*.tsx`

**테스트**

- ack-before-broadcast와 broadcast-before-ack 양쪽 순서.
- 같은 `clientMessageId` 재전송 시 한 row/한 UI item.
- gateway가 DB 저장에 실패하면 broadcast하지 않음.
- pagination 중 새 메시지가 와도 누락/중복 없음.
- rate limit과 4,000자 제한.

**완료 조건**

- 두 client가 메시지를 실시간으로 받고 새로고침 후 같은 기록을 본다.
- 실패 메시지를 안전하게 재시도할 수 있다.

### Phase 5. 코드 참조와 focus/highlight

**목표**

정확한 diff 좌표를 바탕으로 코드 메시지와 Figma형 presence를 제공한다.

**작업**

1. unified diff hunk parser를 실제 old/new line number 기반으로 수정한다.
2. PR files 응답에 base/head SHA와 side 좌표를 제공한다.
3. 재사용 가능한 collaboration code workspace를 추출한다.
4. line/range selection과 code reference composer를 구현한다.
5. 서버가 file/SHA/side/range를 검증한 뒤 message와 transaction 저장한다.
6. focus update throttle/sequence/presence를 구현한다.
7. participant 색상 highlight와 follow mode를 구현한다.
8. stale SHA UX와 text snapshot fallback을 구현한다.

**예상 변경 파일**

- `lib/diff.ts`
- `types/pulls.ts`
- `app/api/pulls/[id]/files/route.ts`
- `components/pulls/detail/PRDiffViewer/**` 리팩터링
- `components/collaboration/code/**`
- `components/collaboration/room/CodeReferencePreview.tsx`
- `hooks/collaboration/useRoomFocus.ts`
- `hooks/collaboration/useFollowParticipant.ts`
- `socket-server/handlers/focus.ts`
- code reference domain/API 파일

**테스트**

- 여러 hunk, added/removed/context line 좌표 fixture.
- LEFT/RIGHT range와 SHA 검증.
- 메시지 click 시 올바른 파일/줄 scroll/highlight.
- 5 events/sec 제한과 out-of-order seq 무시.
- follow 중 수동 스크롤/Escape 해제.
- 이전 SHA 메시지의 안전한 fallback.

**완료 조건**

- 코드 메시지가 생성 당시 commit과 line range를 재현한다.
- 다른 참가자의 의미 있는 focus 변화가 제한된 빈도로 표시된다.
- follow가 사용자 제어를 빼앗지 않고 명시적으로 해제된다.

### Phase 6. 다중 인스턴스, 안정성, 관측성

**목표**

Socket 서버 scale-out에서도 정원/presence/이벤트가 일관되게 동작하게 한다.

**작업**

1. Socket.IO Redis adapter를 추가한다.
2. presence/정원을 Redis 원자 연산으로 교체한다.
3. room별 user expiry sorted set/hash와 Lua script 또는 동등한 transaction을 구현한다.
4. load balancer WebSocket/idle timeout 설정을 확정한다.
5. 구조화 로그와 metric/dashboard를 추가한다.
6. graceful shutdown 시 신규 join 차단, 연결 drain, presence TTL 수렴을 구현한다.
7. chaos/reconnect/load test를 수행한다.

**Redis 정원 권장 방식**

- `collab:room:{id}:users` sorted set score를 expiry timestamp로 사용한다.
- join Lua script가 만료 user 제거 -> 기존 user 갱신 또는 `ZCARD < max`일 때 추가를 한 번에 수행한다.
- detail/focus는 별도 hash/key에 TTL을 둔다.
- 같은 user의 다중 socket은 gateway별 connection metadata를 유지하되 정원 set에는 user ID 하나만 둔다.
- Redis 장애 시 fail-open하지 않고 신규 join을 일시 거절한다. 이미 연결된 사용자는 제한된 degraded 상태로 유지한다.

**예상 변경 파일**

- `socket-server/redis.ts`
- `socket-server/presence.ts`
- `socket-server/index.ts`
- `docker-compose.yml`
- deployment/observability 설정
- load/integration tests

**테스트**

- Socket 서버 2개에 동시에 N+1 join.
- 인스턴스 강제 종료 후 TTL 수렴.
- Redis 재시작/네트워크 지연.
- reconnect storm과 room event fan-out.

**완료 조건**

- 어느 인스턴스로 연결해도 정원 초과가 발생하지 않는다.
- stale presence가 지정 TTL 안에 제거된다.
- 장애 원인을 metric과 request/socket correlation ID로 추적할 수 있다.

### Phase 7. WebRTC 음성

**목표**

텍스트 협업과 독립적으로 배포/비활성화 가능한 음성 대화를 추가한다.

**작업**

1. 2~4명 mesh spike와 managed SFU 비교 실험을 한다.
2. 정원 8명과 모바일 지원을 기준으로 SFU provider/self-host 선택을 승인받는다.
3. short-lived media room token API를 구현한다.
4. microphone permission, join/leave, mute, device change UI를 구현한다.
5. TURN 경로와 기업망 실패를 테스트한다.
6. room 종료/reconnect/백그라운드에서 track을 확실히 정리한다.
7. 음성 feature flag와 운영 metric을 추가한다.

**예상 변경 파일**

- `app/api/collaboration/rooms/[roomId]/voice-token/route.ts`
- `hooks/collaboration/useVoiceRoom.ts`
- `components/collaboration/room/VoiceControls.tsx`
- provider adapter/config
- `socket-server/handlers/voice.ts`는 mesh signaling을 선택한 경우에만 추가

**테스트**

- 권한 허용/거부/철회.
- 장치 없음/장치 변경.
- 참가/퇴장/mute 상태 동기화.
- TURN 강제 relay와 연결 실패.
- room 종료 시 모든 media track stop.
- 로그/metric에 SDP, ICE 민감 정보, 음성 내용이 남지 않음.

**완료 조건**

- 텍스트 기능 장애 없이 음성을 feature flag로 독립 on/off할 수 있다.
- 지원 브라우저/네트워크 기준과 실패 UX가 문서화된다.

---

## 9. 테스트 전략

### 9.1 계층별 테스트

| 계층 | 도구/방식 | 핵심 범위 |
|---|---|---|
| Unit | Jest | validation, diff parser, token, cache merge, presence registry, cursor |
| API integration | Jest + test DB 또는 route test | auth, repository 격리, owner 권한, idempotent message |
| Socket integration | 실제 ephemeral Socket.IO server + `socket.io-client` | handshake, ack, broadcast, 정원, reconnect |
| E2E | Playwright | 방 생성→두 사용자 입장→채팅→코드 이동→재입장 |
| Load/chaos | 별도 script | N+1 race, reconnect storm, 다중 instance/Redis 장애 |

현재 Jest는 node environment와 route mock 중심이고 socket 전용 테스트가 없다. socket integration suite는 실제 server를 random port에 띄우고 client를 종료 후 정리하도록 별도 test config/script를 두는 편이 안전하다.

### 9.2 필수 시나리오

#### Polling 회귀

- socket 관련 env가 없어도 PR 댓글이 즉시 조회되고 10초마다 갱신된다.
- background tab에서 polling이 중지되고 foreground 복귀 시 즉시 갱신된다.
- 다른 사용자의 댓글이 다음 polling 안에 보인다.
- local mutation patch와 polling 결과가 중복 item을 만들지 않는다.
- 일반 보호 화면에서 WebSocket/network token 요청이 없다.

#### 권한

- 로그인하지 않은 사용자는 401.
- repository 비멤버는 room 존재 여부를 알 수 없는 404.
- MEMBER는 room 종료/정원 변경 불가.
- room-scoped token을 다른 room ID로 재사용할 수 없음.
- client payload에 다른 user ID를 넣어도 무시/거절.

#### 정원과 presence

- 최대 5명 방에 20명이 동시에 join하면 5 unique users만 성공.
- 한 사용자 여러 탭은 1명으로 count하되 각 탭은 이벤트를 받음.
- 한 탭 종료가 다른 탭 presence를 제거하지 않음.
- 비정상 종료가 TTL 이후 제거되고 새 사용자가 입장 가능.
- reconnect grace 내 복귀가 새 입장으로 계산되지 않음.
- owner가 max를 현재 active count 아래로 낮추려 하면 409.

#### 메시지

- 동일 client message를 2회 보내도 DB row 1개.
- ack 유실 후 retry가 중복 UI를 만들지 않음.
- DB 실패 시 broadcast 없음.
- 오래된 cursor pagination 중 새 메시지 도착 시 정렬/중복 정상.
- 연결되지 않은 socket과 종료 방은 send 불가.

#### Focus/code reference

- 실제 hunk line 번호를 LEFT/RIGHT로 정확히 계산.
- 잘못된 file/range/SHA 거절.
- out-of-order focus seq 무시.
- stale participant focus가 TTL과 함께 사라짐.
- 오래된 SHA는 최신 줄로 잘못 이동하지 않음.

#### 음성

- signaling target이 같은 room이 아니면 거절.
- 마이크 권한 거부 후 텍스트 채팅은 정상.
- reconnect/room end에서 media tracks와 peer connection 정리.

### 9.3 단계별 검증 명령

각 PR에서 최소 다음을 수행한다.

```text
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Socket 관련 PR은 추가로 standalone server build와 socket integration test를 CI job에 넣는다. UI 변화가 있는 단계는 Playwright E2E와 주요 viewport 접근성 검사를 포함한다.

---

## 10. 배포 및 운영 고려사항

### 10.1 환경변수

| 변수 | 노출 | 용도 | 단계 |
|---|---|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | browser 공개 | 협업방 Socket endpoint | Phase 3 |
| `SOCKET_SERVER_URL` | server only | Next -> Socket internal notify/room update | Phase 3 |
| `SOCKET_INTERNAL_SECRET` | server only | token/internal API 서명·인증. 용도별 secret 분리 권장 | Phase 0~3 |
| `NEXTJS_URL` | Socket server only | Socket -> Next internal API 및 origin | Phase 3 |
| `REDIS_URL` | server only | adapter/presence/capacity | Phase 6 |
| `COLLAB_PRESENCE_TTL_MS` | server only | 기본 45000 | Phase 3/6 |
| `COLLAB_HEARTBEAT_INTERVAL_MS` | client config 또는 고정 | 기본 15000 | Phase 3 |
| `COLLAB_MAX_ROOM_CAPACITY` | server only | hard cap 20 | Phase 2 |
| media provider key/secret | server only | SFU token 발급 | Phase 7 |
| STUN/TURN URL | 일부 공개 가능 | WebRTC ICE | Phase 7 |

`NEXT_PUBLIC_REALTIME_MODE`는 Phase 1에서 제거한다. secret rotation과 room token signing secret을 internal API secret과 분리할지는 운영 환경에서 결정하되, production은 분리를 권장한다.

### 10.2 배포 토폴로지

- Next app이 serverless 플랫폼이면 persistent Socket.IO를 같은 process에 넣지 않는다.
- standalone Socket 서버는 WebSocket upgrade와 장시간 연결을 지원하는 서비스에 배포한다.
- 현재 client는 `transports: ['websocket']`만 사용하므로 long-polling handshake용 sticky session 의존은 줄어든다.
- 다중 인스턴스에서는 Redis adapter가 event fan-out을 담당한다.
- WebSocket-only라도 load balancer idle timeout보다 짧은 ping/heartbeat를 유지한다.
- 배포 시 신규 연결을 중지하고 기존 연결에 reconnect 안내 후 drain한다.

### 10.3 보안/abuse 제한

- 정확한 CORS allowlist, credential 정책, origin 검사.
- room 생성, token 발급, join, message, focus, signaling별 rate limit.
- 방 이름 100자, 메시지 4,000자, 코드 snapshot/range, signaling payload 크기 제한.
- Zod runtime validation을 browser/server/internal API 모두 적용.
- React text rendering을 유지하고 사용자 Markdown을 도입할 경우 sanitize library와 URL scheme allowlist 적용.
- file path는 실제 PR 파일 목록과 대조하고 path traversal 성격의 값을 저장/DOM ID로 직접 사용하지 않는다.
- token HMAC 비교는 timing-safe하게 처리하고 짧은 expiration과 `jti`를 사용한다.
- `SOCKET_INTERNAL_SECRET`가 browser bundle이나 로그에 노출되지 않게 한다.
- SDP/ICE, message body, selected source text를 일반 로그에 남기지 않는다.

초기 rate limit 예시:

- room create: 사용자당 10회/시간.
- join/token: 사용자+room당 20회/분.
- message: 사용자당 30회/10초, burst 허용.
- typing: 상태 변경 최대 2회/초.
- focus: 최대 5회/초.
- signaling ICE: 별도 높은 한도와 payload cap.

### 10.4 관측성

필수 metric:

- active connections, active rooms, unique active users.
- join success/failure by error code, room full count.
- reconnect attempt/success, presence expiry count.
- message persist latency p50/p95/p99, ack latency, duplicate retry count.
- internal API error rate.
- Redis operation/script latency와 failure.
- voice join success, ICE/SFU connection success, 연결 시간. 음성 내용은 수집하지 않는다.

로그에는 `requestId`, `socketId`의 비식별 hash, `roomId`, `userId`의 제한된 hash, event name, duration, result code를 사용한다. clientMessageId는 장애 추적 기간에만 제한적으로 기록한다.

### 10.5 rollout/rollback

1. Phase 1 polling 전환을 먼저 독립 배포하고 socket 요청 0을 확인한다.
2. DB/API는 additive migration 후 UI feature flag off 상태로 배포한다.
3. 내부 사용자에게 방 목록/텍스트 채팅을 활성화한다.
4. 정원/presence metric 안정화 후 일반 사용자에게 점진 확대한다.
5. code focus는 별도 flag로 활성화한다.
6. Redis migration은 single-instance와 결과를 shadow 비교한 후 전환한다.
7. voice는 완전히 독립된 flag와 kill switch를 둔다.

문제 발생 시 feature flag를 끄고 신규 join을 막는다. 메시지/방 DB 데이터는 보존하고, schema drop은 하지 않는다. 일반 PR과 알림은 이미 polling으로 독립돼 있어 협업방 장애의 영향을 받지 않아야 한다.

---

## 11. 위험 요소와 미결정 사항

### 11.1 위험 목록

| 위험 | 영향 | 가능성 | 완화 |
|---|---|---:|---|
| 실제 diff line parser가 부정확함 | 높음 | 높음 | 코드 참조 전 parser fixture/수정, SHA anchor |
| Socket runtime 중복 유지 | 높음 | 중간 | Phase 0에서 standalone 단일화 |
| 동시 join 정원 race | 높음 | 높음 | 단일 서버 원자 registry, 운영 Redis Lua |
| 다중 탭/재연결 중복 count | 높음 | 높음 | user 단위 presence + socket set + TTL |
| room join 권한 우회 | 높음 | 현재 존재 | room-scoped token + join/write 재검증 |
| socket/internal API 타입 drift | 높음 | 중간 | shared protocol + Zod + contract test |
| 메시지 commit 전 broadcast | 높음 | 중간 | DB canonical response 이후 broadcast |
| PR head 변경으로 code anchor stale | 높음 | 높음 | commit SHA 저장, stale 표시, context snapshot |
| 파일 수만큼 listener 증가 | 중간 | 현재 존재 | 방 root subscriber 1개로 중앙화 |
| serverless 환경에서 WebSocket 유지 불가 | 높음 | 환경 의존 | standalone persistent service |
| Redis 장애 시 정원 불일치 | 높음 | 낮음~중간 | 신규 join fail-closed, TTL 복구/runbook |
| focus가 사용자의 화면을 과도하게 이동 | 중간 | 중간 | opt-in follow, 수동 동작/Escape 해제 |
| 음성 mesh 네트워크 폭증 | 높음 | 중간 | 제품은 SFU 우선, mesh 제한 spike만 |
| 메시지/코드 내용 로그 노출 | 높음 | 낮음~중간 | 구조화 metadata 로그, 내용 제외 |

### 11.2 구현 전에 반드시 결정할 사항

1. 실제 production Socket process가 standalone인지 최종 확인.
2. MVP 방을 PR 필수 scope로 제한하는 것에 대한 승인.
3. repository 멤버 전체가 방 목록/기록을 볼 수 있는 기본 접근 정책 승인.
4. 최대 정원 범위(권장 2~20, 기본 8) 승인.
5. 방 종료 후 메시지 보존 정책 승인.
6. 운영 첫 출시가 단일 Socket 인스턴스인지, 시작부터 Redis가 필요한지 결정.
7. 코드 선택이 최신 PR head가 아닐 때 저장 허용/차단 UX 결정.

### 11.3 구현 중 결정 가능한 사항

- participant color palette 세부값.
- focus throttle 150~250ms 중 최종 수치.
- chat page size 30/50 중 조정.
- 모바일 panel의 sheet/tab 배치.
- metric dashboard 제품 선택.
- 음성 provider는 Phase 7 시작 전 별도 ADR로 결정.

### 11.4 MVP 이후로 미룰 사항

- 초대 전용/비공개 방과 외부 GitHub collaborator 초대.
- repository 범위 또는 여러 PR을 넘나드는 방.
- owner transfer, moderator, 강퇴/차단.
- 메시지 편집/삭제, thread/reaction, 파일 첨부.
- code anchor 자동 재배치 알고리즘.
- 화면 공유, 음성 녹음, transcript.
- 모바일 background voice 보장.

---

## 12. 최종 권장안

### 12.1 MVP 포함

- 일반 PR 댓글 및 알림 10초 polling 고정.
- 일반 페이지 WebSocket 완전 제거.
- PR 필수 연결 협업방 생성/목록/종료.
- repository membership 기반 인증/권한.
- 사용자 지정 정원과 unique active user 기준 서버 강제.
- 방 route에서만 생성되는 Socket.IO 연결.
- 참가자 presence, heartbeat, reconnect grace, 다중 탭 처리.
- DB 영속 텍스트 채팅, cursor 이력, idempotent optimistic send.
- 정확한 diff line parser와 head/base SHA.
- 메시지당 하나의 코드 range 참조.
- participant focus/highlight와 opt-in follow.

### 12.2 MVP 이후

- Redis scale-out은 운영에서 인스턴스 2개 이상이 필요해지는 시점 전에는 반드시 완료하되, 제품 MVP 데모와 분리 가능하다.
- 음성은 텍스트/코드 협업 안정화 이후 별도 목표로 진행한다.
- 정원 8명을 그대로 지원하려면 managed SFU를 권장한다.

### 12.3 가장 먼저 구현할 작은 단위

첫 구현은 **일반 댓글과 알림의 polling 고정**이어야 한다.

이 변경은 새 room 기능 전에 다음 불확실성을 제거한다.

- 일반 화면과 협업방의 연결 생명주기가 섞이지 않는다.
- socket client bundle이 언제 로드되는지 명확해진다.
- 기존 댓글 cache가 socket 이벤트에 암묵적으로 의존하지 않는다.
- 새 Socket protocol을 구형 PR room 이벤트와 호환시킬 필요가 없다.

### 12.4 권장 이슈/PR 분할

| 순서 | 이슈/PR | 의존 | 주요 산출물 |
|---:|---|---|---|
| 1 | `refactor: realtime runtime 실행 경로 단일화` | 없음 | standalone 확정, protocol/test 기반 |
| 2 | `refactor: PR 댓글과 알림 polling 고정` | 1 | env 분기/일반 socket 제거 |
| 3 | `feat: collaboration room Prisma 모델과 접근 계층` | 2 | migration, access/domain service |
| 4 | `feat: collaboration room REST API` | 3 | CRUD/join/end/history API |
| 5 | `feat: collaboration room 목록 및 생성 UI` | 4 | server page/client components/sidebar |
| 6 | `feat: room-scoped socket 인증과 연결 수명주기` | 4 | token, room-only socket, connection UI |
| 7 | `feat: collaboration presence와 정원 제한` | 6 | join ack, unique user count, heartbeat |
| 8 | `feat: 영속 실시간 채팅` | 3, 6 | message DB/internal API/socket/UI |
| 9 | `fix: Git diff line 좌표와 PR SHA 지원` | 2 | 정확한 parser/SHA API |
| 10 | `feat: 코드 참조 채팅` | 8, 9 | CodeReference와 navigation |
| 11 | `feat: participant focus와 follow mode` | 7, 9 | focus presence/highlight/follow |
| 12 | `infra: Redis adapter와 분산 정원` | 7, 8 | multi-instance 안정성 |
| 13 | `chore: collaboration 관측성 및 부하 테스트` | 12 | metric, chaos/load test, runbook |
| 14 | `spike: WebRTC mesh/SFU 비교` | 8 | ADR와 비용/품질 결과 |
| 15 | `feat: 협업방 음성 대화` | 14 | provider/token/UI/운영 metric |

PR 9는 PR 3~8과 병렬 준비가 가능하지만, 코드 참조와 focus 기능보다 먼저 merge해야 한다. 각 PR은 기존 `.github/pull_request_template.md`를 따르고 unrelated 변경을 섞지 않는다.

### 12.5 기능 완료 정의

전체 기능은 다음 조건을 모두 만족할 때 완료로 본다.

1. 일반 보호 화면과 PR 상세 진입에서 WebSocket 연결이 0회다.
2. 댓글과 알림은 polling 및 local mutation cache 갱신으로 정상 작동한다.
3. 협업방 route에서만 socket client가 lazy load된다.
4. 서버가 인증, room/PR/repository 권한, 상태, 정원을 매번 검증한다.
5. 다중 탭과 reconnect 상황에서도 한 사용자는 한 자리만 차지한다.
6. 메시지는 DB commit 이후 전파되고 재전송해도 중복 저장되지 않는다.
7. 코드 참조는 생성 당시 commit SHA와 실제 diff side line을 보존한다.
8. focus/highlight는 rate 제한과 TTL을 지키며 사용자가 follow를 즉시 해제할 수 있다.
9. Socket/Redis/voice 장애가 일반 PR 댓글과 알림을 중단시키지 않는다.
10. lint, type check, unit/API/socket integration, E2E, build가 모두 통과한다.

---

## 승인 체크리스트

구현 전에 아래 항목을 확정한다.

- [ ] standalone `socket-server/**`를 유일한 Socket runtime으로 사용한다.
- [ ] 일반 PR 댓글과 알림 모두 10초 polling으로 전환한다.
- [ ] MVP 방은 하나의 PR에 필수로 연결한다.
- [ ] 해당 repository 멤버는 활성 방을 찾고 입장할 수 있다.
- [ ] 정원은 2~20명, 기본 8명이며 unique active user 기준이다.
- [ ] 종료 방과 메시지는 삭제하지 않고 읽기 전용으로 보존한다.
- [ ] MVP 메시지는 편집/삭제 없이 plain text와 코드 참조 1개만 지원한다.
- [ ] 음성은 MVP 이후 별도 단계이며 녹음하지 않는다.
- [ ] production scale-out 전 Redis 기반 분산 정원을 완료한다.

이 체크리스트 승인 전에는 애플리케이션 구현을 시작하지 않는다.
