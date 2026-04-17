# 🤖 CodeMate - AI 기반 코드 리뷰 & 협업 플랫폼

> GitHub과 연동되어 AI가 자동으로 코드 리뷰를 제공하고, 팀원들이 실시간으로 협업할 수 있는 개발자 협업 플랫폼

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)

## 📑 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시스템 아키텍처](#-시스템-아키텍처)
- [데이터베이스 설계](#-데이터베이스-설계)
- [개발 환경 설정](#-개발-환경-설정)
- [개발 로드맵](#-개발-로드맵)
- [API 문서](#-api-문서)
- [배포 가이드](#-배포-가이드)
- [트러블슈팅](#-트러블슈팅)

---

## 🎯 프로젝트 소개

### 배경
- 주니어 개발자들은 **제대로 된 코드 리뷰**를 받기 어려움
- 소규모 팀에서는 **시니어 개발자 부족**으로 리뷰가 지연됨
- 코드 리뷰 과정에서 **비효율적인 커뮤니케이션** 발생

### 해결 방법
CodeMate는 **AI를 활용한 자동 코드 리뷰**와 **실시간 협업 기능**으로 이 문제를 해결합니다.

### 타겟 유저
- 🎓 주니어 개발자 (코드 리뷰 학습)
- 🚀 소규모 스타트업 팀 (시니어 개발자 부족)
- 📦 오픈소스 프로젝트 관리자
- 💻 코딩 부트캠프 수강생

---

## ✨ 주요 기능

### 1️⃣ GitHub 연동 & PR 자동 분석
- GitHub OAuth 로그인
- Repository 선택적 연동
- PR 생성 시 자동 Webhook 트리거
- PR Diff 자동 분석

### 2️⃣ AI 기반 코드 리뷰
- **버그 가능성** 탐지 (Null pointer, Race condition 등)
- **성능 이슈** 분석 (불필요한 리렌더링, 메모리 누수)
- **보안 취약점** 검사 (SQL Injection, XSS)
- **베스트 프랙티스** 제안 (디자인 패턴, 코딩 컨벤션)
- **코드 품질 점수** 산정 (0-100점)

### 3️⃣ 실시간 협업
- 코드 라인별 댓글 (WebSocket)
- 팀원 멘션 (@username)
- 댓글 스레드 (답글 기능)
- 실시간 타이핑 인디케이터
- 읽음 표시
- 이모지 반응 (👍❤️🎉)

### 4️⃣ 코드 품질 대시보드
- PR별 품질 점수 추이
- 팀원별 리뷰 참여율
- 가장 많이 발견되는 이슈 TOP 5
- 평균 리뷰 응답 시간
- Repository별 통계

---

## 🛠 기술 스택

### Frontend
```
Next.js 15        - React 프레임워크
TypeScript        - 타입 안정성
Tailwind CSS      - 스타일링
shadcn/ui         - UI 컴포넌트
Recharts          - 데이터 시각화
Socket.io-client  - 실시간 통신
Zod               - 스키마 검증
```

### Backend
```
Next.js API Routes      - RESTful API
Next.js Server Actions  - 서버 사이드 로직
Prisma ORM             - 데이터베이스 ORM
PostgreSQL             - 메인 데이터베이스
Socket.io              - WebSocket 서버
```

### External APIs
```
Claude API (Anthropic)  - AI 코드 분석
GitHub API              - Repository & PR 데이터
GitHub OAuth            - 인증
GitHub Webhooks         - 이벤트 트리거
```

### Infrastructure
```
Vercel           - 호스팅 & 배포
Supabase         - PostgreSQL 호스팅
AWS S3           - 파일 저장소
GitHub Actions   - CI/CD
Docker           - 컨테이너화
```

### DevOps & Monitoring
```
ESLint           - 코드 린팅
Prettier         - 코드 포맷팅
Jest             - 단위 테스트
Sentry           - 에러 모니터링
```

---

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   Client Browser                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Next.js    │  │  WebSocket   │  │   GitHub   │ │
│  │     UI       │  │   Client     │  │   OAuth    │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
└─────────┼──────────────────┼────────────────┼────────┘
          │                  │                │
          ▼                  ▼                ▼
┌─────────────────────────────────────────────────────┐
│           Next.js Server (Vercel/Local)             │
│                                                     │
│  ┌────────────────┐      ┌──────────────────────┐  │
│  │  API Routes    │◄────►│  Server Actions      │  │
│  │  /api/review   │      │  (Direct DB Access)  │  │
│  │  /api/webhook  │      └──────────┬───────────┘  │
│  │  /api/github   │                 │              │
│  └────────┬───────┘                 │              │
│           │                         ▼              │
│           │              ┌─────────────────────┐   │
│           └─────────────►│   Prisma ORM        │   │
│                          └──────────┬──────────┘   │
│                                     │              │
│  ┌────────────────┐                 │              │
│  │ Socket.io      │                 │              │
│  │ Server         │                 │              │
│  └────────────────┘                 │              │
└──────────┬──────────────────────────┼──────────────┘
           │                          │
           ▼                          ▼
┌─────────────────┐         ┌──────────────────┐
│   WebSocket     │         │   PostgreSQL     │
│   Clients       │         │   (Supabase)     │
└─────────────────┘         └──────────────────┘
           
           ┌──────────────┐  ┌──────────────┐
           │  Claude API  │  │  GitHub API  │
           │  (Anthropic) │  │  & Webhooks  │
           └──────────────┘  └──────────────┘
```

---

## 💾 데이터베이스 설계

### ERD (Entity Relationship Diagram)

```
┌──────────────┐         ┌──────────────┐
│     User     │1       *│  Repository  │
│──────────────│─────────│──────────────│
│ id           │         │ id           │
│ email        │         │ githubId     │
│ name         │         │ name         │
│ githubId     │         │ fullName     │
│ githubToken  │         │ userId       │
└──────────────┘         └──────┬───────┘
       │                        │
       │                        │1
       │                        │
       │                        │*
       │                 ┌──────┴───────┐
       │                 │ PullRequest  │
       │                 │──────────────│
       │                 │ id           │
       │                 │ githubId     │
       │                 │ number       │
       │                 │ title        │
       │                 │ status       │
       │                 │ repoId       │
       │                 └──────┬───────┘
       │                        │1
       │                        │
       │                        │*
       │1                ┌──────┴───────┐
       │                 │    Review    │
       │                 │──────────────│
       │                 │ id           │
       │                 │ prId         │
       │                 │ aiSuggestions│
       │                 │ qualityScore │
       │                 │ severity     │
       │                 └──────────────┘
       │
       │*         ┌──────────────┐
       └──────────│   Comment    │
                  │──────────────│
                  │ id           │
                  │ content      │
                  │ lineNumber   │
                  │ prId         │
                  │ authorId     │
                  │ parentId     │
                  └──────────────┘
```

### Prisma Schema

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  image         String?
  githubId      Int?           @unique
  githubToken   String?        @db.Text
  repositories  Repository[]
  comments      Comment[]
  notifications Notification[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Repository {
  id           String        @id @default(cuid())
  githubId     Int           @unique
  name         String
  fullName     String
  isActive     Boolean       @default(true)
  webhookId    Int?
  owner        User          @relation(fields: [userId], references: [id])
  userId       String
  pullRequests PullRequest[]
  createdAt    DateTime      @default(now())
  
  @@index([userId])
}

model PullRequest {
  id          String    @id @default(cuid())
  githubId    Int       @unique
  number      Int
  title       String
  description String?   @db.Text
  status      PRStatus
  repo        Repository @relation(fields: [repoId], references: [id])
  repoId      String
  reviews     Review[]
  comments    Comment[]
  createdAt   DateTime  @default(now())
  
  @@index([repoId, status])
}

enum PRStatus {
  OPEN
  CLOSED
  MERGED
  DRAFT
}

model Review {
  id              String       @id @default(cuid())
  pullRequest     PullRequest  @relation(fields: [pullRequestId], references: [id])
  pullRequestId   String
  aiSuggestions   Json
  qualityScore    Int
  severity        Severity
  issueCount      Int          @default(0)
  status          ReviewStatus @default(PENDING)
  reviewedAt      DateTime     @default(now())
  
  @@index([pullRequestId])
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model Comment {
  id              String    @id @default(cuid())
  content         String    @db.Text
  lineNumber      Int?
  filePath        String?
  isResolved      Boolean   @default(false)
  pullRequest     PullRequest @relation(fields: [pullRequestId], references: [id])
  pullRequestId   String
  author          User      @relation(fields: [authorId], references: [id])
  authorId        String
  parentId        String?
  parent          Comment?  @relation("CommentThread", fields: [parentId], references: [id])
  replies         Comment[] @relation("CommentThread")
  mentions        String[]
  reactions       Json?
  createdAt       DateTime  @default(now())
  
  @@index([pullRequestId])
}
```

---

## 🚀 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn
- PostgreSQL (또는 Supabase 계정)
- GitHub 계정
- Anthropic API Key

### 1. 프로젝트 클론 & 설치

```bash
# 1. Next.js 프로젝트 생성
npx create-next-app@latest codemate \
  --typescript \
  --tailwind \
  --app \
  --use-npm

cd codemate

# 2. 필수 패키지 설치
npm install @prisma/client prisma
npm install next-auth @auth/prisma-adapter
npm install @anthropic-ai/sdk
npm install socket.io socket.io-client
npm install @octokit/rest
npm install zod
npm install recharts lucide-react
npm install date-fns

# 3. 개발 도구
npm install -D @types/node
npm install -D prisma
npm install -D eslint-config-prettier

# 4. UI 라이브러리 (shadcn/ui)
npx shadcn@latest init
npx shadcn@latest add button card input textarea
npx shadcn@latest add dropdown-menu avatar badge
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/codemate"
DIRECT_DATABASE_URL="postgresql://username:password@localhost:5432/codemate"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # openssl rand -base64 32

# GitHub OAuth
GITHUB_ID="your-github-oauth-app-id"
GITHUB_SECRET="your-github-oauth-app-secret"

# Anthropic API
ANTHROPIC_API_KEY="sk-ant-xxxxx"

# GitHub Webhook
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# WebSocket
NEXT_PUBLIC_WS_URL="http://localhost:3000"

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-northeast-2"
AWS_S3_BUCKET="codemate-files"
```

### 3. GitHub OAuth 앱 생성

1. GitHub Settings → Developer settings → OAuth Apps
2. New OAuth App 클릭
3. 설정값:
   - Application name: `CodeMate Dev`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Client ID와 Client Secret을 `.env.local`에 추가

### 4. 데이터베이스 초기화

```bash
# Prisma 초기화
npx prisma init

# schema.prisma 파일 작성 후
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate

# (Optional) Prisma Studio로 DB 확인
npx prisma studio
```

Supabase pooler URL을 `DATABASE_URL`로 쓰는 경우:
`DIRECT_DATABASE_URL`에는 direct connection URL을 따로 넣어두는 것을 권장합니다.
런타임 쿼리는 pooler로 처리해도 되지만, Prisma migration은 direct URL이 더 안정적입니다.

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 📅 개발 로드맵

### ✅ Week 1-2: 프로젝트 기반 & 인증 (완료 여부: ☐)

**목표:** Next.js 프로젝트 셋업 및 GitHub OAuth 인증 구현

#### 체크리스트:
- [ ] Next.js 15 프로젝트 생성
- [ ] TypeScript 설정
- [ ] Tailwind CSS 설정
- [ ] Prisma 스키마 작성
- [ ] PostgreSQL 연결 확인
- [ ] NextAuth.js 설정
- [ ] GitHub OAuth 연동
- [ ] 로그인/로그아웃 UI
- [ ] 사용자 세션 관리
- [ ] Protected Routes 구현

#### 주요 파일:
```
app/
├── api/
│   └── auth/
│       └── [...nextauth]/route.ts
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx
├── layout.tsx
└── page.tsx

lib/
├── auth.ts
├── prisma.ts
└── utils.ts

prisma/
└── schema.prisma
```

#### 테스트:
- [ ] GitHub 로그인 성공
- [ ] 로그아웃 정상 작동
- [ ] 로그인 상태 유지
- [ ] Protected page 접근 제어

---

### ✅ Week 3-4: GitHub 연동 (완료 여부: ☐)

**목표:** GitHub API 연동 및 Repository/PR 데이터 가져오기

#### 체크리스트:
- [ ] Octokit 설정
- [ ] Repository 목록 API
- [ ] Repository 연동 기능
- [ ] Webhook 생성 API
- [ ] Webhook 핸들러 (`/api/webhook/github`)
- [ ] PR 목록 페이지
- [ ] PR 상세 페이지
- [ ] PR Diff 표시
- [ ] 파일별 변경사항 표시

#### 주요 파일:
```
app/
├── api/
│   ├── github/
│   │   ├── repos/route.ts
│   │   └── webhook/route.ts
│   └── repositories/
│       ├── route.ts
│       └── [id]/
│           └── prs/route.ts
├── dashboard/
│   ├── page.tsx
│   └── [repoId]/
│       ├── page.tsx
│       └── pr/
│           └── [prId]/page.tsx

lib/
├── github.ts
└── webhook-validator.ts
```

#### 테스트:
- [ ] Repository 목록 로드
- [ ] Repository 연동/해제
- [ ] Webhook 생성 확인
- [ ] PR 목록 표시
- [ ] PR Diff 정상 표시
- [ ] 실제 PR 생성 시 Webhook 트리거 확인

---

### ✅ Week 5-6: AI 코드 리뷰 (완료 여부: ☐)

**목표:** Claude API 연동 및 자동 코드 리뷰 구현

#### 체크리스트:
- [ ] Anthropic SDK 설정
- [ ] AI 분석 프롬프트 작성
- [ ] `/api/review/analyze` 엔드포인트
- [ ] AI 응답 파싱 로직
- [ ] 품질 점수 계산 알고리즘
- [ ] 심각도 분류 로직
- [ ] 리뷰 결과 저장
- [ ] 리뷰 결과 UI 표시
- [ ] 라인별 제안사항 표시
- [ ] 코드 수정 제안 적용 기능

#### 주요 파일:
```
app/
├── api/
│   └── review/
│       ├── analyze/route.ts
│       └── [reviewId]/route.ts

lib/
├── ai/
│   ├── claude.ts
│   ├── prompts.ts
│   └── parsers.ts
└── scoring.ts

components/
├── ReviewPanel.tsx
├── SuggestionCard.tsx
└── CodeDiff.tsx
```

#### AI 프롬프트 예시:
```typescript
const REVIEW_PROMPT = `
당신은 숙련된 시니어 개발자입니다.
다음 코드 변경사항을 리뷰해주세요.

[분석 관점]
1. 버그 가능성 (Null pointer, Race condition 등)
2. 성능 이슈 (불필요한 리렌더링, O(n²) 알고리즘 등)
3. 보안 취약점 (SQL Injection, XSS 등)
4. 코드 품질 (중복, 복잡도, 가독성)
5. 베스트 프랙티스 준수

[출력 형식]
각 이슈를 다음 JSON 형식으로 제공:
{
  "issues": [
    {
      "lineNumber": 15,
      "severity": "HIGH|MEDIUM|LOW",
      "category": "BUG|PERFORMANCE|SECURITY|QUALITY",
      "title": "간단한 제목",
      "description": "상세 설명",
      "suggestion": "개선 방법",
      "exampleCode": "예시 코드"
    }
  ]
}
`;
```

#### 테스트:
- [ ] AI 분석 요청 성공
- [ ] 응답 파싱 정상
- [ ] 품질 점수 계산 정확
- [ ] UI에 제안사항 표시
- [ ] 라인별 주석 표시
- [ ] 에러 핸들링 (API 실패 시)

---

### ✅ Week 7-8: 실시간 협업 (완료 여부: ☐)

**목표:** WebSocket 서버 구축 및 실시간 댓글 기능

#### 체크리스트:
- [ ] Socket.io 서버 설정
- [ ] WebSocket 연결 관리
- [ ] Room 관리 (PR별)
- [ ] 실시간 댓글 전송/수신
- [ ] 타이핑 인디케이터
- [ ] 멘션 기능 (@username)
- [ ] 댓글 스레드 (답글)
- [ ] 이모지 반응
- [ ] 읽음 표시
- [ ] 알림 시스템
- [ ] 연결 끊김 처리

#### 주요 파일:
```
lib/
├── socket/
│   ├── server.ts
│   ├── handlers.ts
│   └── types.ts

hooks/
├── useSocket.ts
├── useRealtimeComments.ts
└── useTypingIndicator.ts

components/
├── CommentSection.tsx
├── CommentInput.tsx
├── CommentThread.tsx
└── TypingIndicator.tsx

server.js (Custom server for Socket.io)
```

#### Socket.io 서버 구현:
```typescript
// lib/socket/server.ts
import { Server } from 'socket.io';

export function initSocket(server: any) {
  const io = new Server(server);

  io.on('connection', (socket) => {
    // PR 룸 참여
    socket.on('join-pr', (prId) => {
      socket.join(`pr:${prId}`);
    });

    // 새 댓글
    socket.on('new-comment', async (data) => {
      const comment = await createComment(data);
      io.to(`pr:${data.prId}`).emit('comment-added', comment);
    });

    // 타이핑 중
    socket.on('typing', (data) => {
      socket.to(`pr:${data.prId}`).emit('user-typing', data);
    });
  });

  return io;
}
```

#### 테스트:
- [ ] WebSocket 연결 성공
- [ ] 댓글 실시간 전송/수신
- [ ] 여러 클라이언트 동시 접속
- [ ] 타이핑 인디케이터 작동
- [ ] 멘션 알림
- [ ] 연결 끊김 후 재연결

---

### ✅ Week 9-10: 대시보드 & 배포 (완료 여부: ☐)

**목표:** 통계 대시보드 완성 및 프로덕션 배포

#### 체크리스트:
- [ ] Repository 통계 API
- [ ] 품질 점수 추이 차트
- [ ] 팀원별 통계
- [ ] 이슈 분포 차트
- [ ] 필터링 기능
- [ ] 검색 기능
- [ ] Dockerfile 작성
- [ ] Docker Compose 설정
- [ ] Vercel 배포 설정
- [ ] 환경 변수 설정
- [ ] GitHub Actions CI/CD
- [ ] 에러 모니터링 (Sentry)
- [ ] 성능 모니터링

#### 주요 파일:
```
app/
└── dashboard/
    └── [repoId]/
        ├── page.tsx
        ├── stats/
        └── team/

components/
├── charts/
│   ├── QualityTrendChart.tsx
│   ├── IssueDistribution.tsx
│   └── TeamStats.tsx
└── filters/

Dockerfile
docker-compose.yml
.github/
└── workflows/
    ├── ci.yml
    └── deploy.yml
```

#### Dockerfile 예시:
```dockerfile
FROM node:18-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

#### 테스트:
- [ ] 차트 데이터 로드
- [ ] 필터링 작동
- [ ] Docker 이미지 빌드 성공
- [ ] 로컬 Docker 실행
- [ ] Vercel 배포 성공
- [ ] 프로덕션 환경 테스트
- [ ] CI/CD 파이프라인 작동
- [ ] 에러 로그 수집 확인

---

## 📡 API 문서

### Authentication

#### `POST /api/auth/signin`
GitHub OAuth 로그인

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://..."
  }
}
```

### GitHub Integration

#### `GET /api/github/repos`
사용자의 GitHub Repository 목록

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "repos": [
    {
      "id": 123,
      "name": "awesome-project",
      "fullName": "username/awesome-project",
      "language": "TypeScript",
      "isConnected": false
    }
  ]
}
```

#### `POST /api/repositories`
Repository 연동

**Body:**
```json
{
  "githubId": 123,
  "name": "awesome-project",
  "fullName": "username/awesome-project"
}
```

#### `POST /api/webhook/github`
GitHub Webhook 핸들러

### Code Review

#### `POST /api/review/analyze`
PR 자동 분석 요청

**Body:**
```json
{
  "prId": "pr_123"
}
```

**Response:**
```json
{
  "reviewId": "review_456",
  "qualityScore": 87,
  "severity": "MEDIUM",
  "issueCount": 3,
  "suggestions": [
    {
      "lineNumber": 15,
      "severity": "MEDIUM",
      "category": "QUALITY",
      "title": "타입 명시 필요",
      "description": "useState에 타입을 명시하세요",
      "suggestion": "const [data, setData] = useState<Data | null>()",
      "exampleCode": "..."
    }
  ]
}
```

#### `GET /api/review/[reviewId]`
리뷰 결과 조회

### Comments

#### `POST /api/comments`
댓글 작성

**Body:**
```json
{
  "prId": "pr_123",
  "lineNumber": 15,
  "content": "이 부분 타입 체크가 필요할 것 같아요",
  "mentions": ["user_456"]
}
```

#### `GET /api/comments?prId={prId}`
PR의 댓글 목록

### WebSocket Events

#### Client → Server

```typescript
// PR 룸 참여
socket.emit('join-pr', prId);

// 새 댓글 작성
socket.emit('new-comment', {
  prId: 'pr_123',
  lineNumber: 15,
  content: '댓글 내용',
  userId: 'user_123'
});

// 타이핑 중
socket.emit('typing', {
  prId: 'pr_123',
  userId: 'user_123',
  username: 'John'
});

// 멘션
socket.emit('mention', {
  prId: 'pr_123',
  mentionedUserId: 'user_456',
  commentId: 'comment_789'
});
```

#### Server → Client

```typescript
// 새 댓글 수신
socket.on('comment-added', (comment) => {
  // UI 업데이트
});

// 타이핑 인디케이터
socket.on('user-typing', ({ username }) => {
  // "John이 입력 중..." 표시
});

// 새 알림
socket.on('new-notification', (notification) => {
  // 알림 표시
});
```

---

## 🚢 배포 가이드

### Vercel 배포

1. **Vercel 프로젝트 생성**
```bash
npm i -g vercel
vercel login
vercel
```

2. **환경 변수 설정**
   - Vercel Dashboard → Settings → Environment Variables
   - 모든 환경 변수 추가

3. **자동 배포 설정**
   - GitHub 연동
   - main 브랜치 푸시 시 자동 배포

### Docker 배포

```bash
# 이미지 빌드
docker build -t codemate:latest .

# 컨테이너 실행
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e GITHUB_ID="..." \
  codemate:latest

# Docker Compose
docker-compose up -d
```

### GitHub Actions CI/CD

`.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📚 참고 자료

### 공식 문서
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [GitHub API](https://docs.github.com/en/rest)
- [Socket.io Documentation](https://socket.io/docs/v4/)

### 유용한 리소스
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)


## 🎯 다음 단계

### 추가 기능 아이디어
- [ ] 모바일 앱 (React Native)
- [ ] VS Code Extension
- [ ] Slack/Discord 봇 통합
- [ ] 코드 메트릭스 분석
- [ ] AI 학습 모델 커스터마이징
- [ ] 다국어 지원

### 최적화
- [ ] 이미지 최적화 (Next/Image)
- [ ] 코드 스플리팅
- [ ] React Query 캐싱
- [ ] Edge Functions 활용

---

## 📄 라이센스

MIT License

---

## 👥 기여

기여는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 연락처

프로젝트 관련 문의: [juyung0903@naver.com]

GitHub: [@phnml1](https://github.com/phnml1)

---

**⭐️ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!**
