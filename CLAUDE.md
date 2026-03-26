# CodeMate - Claude Code 개발 규칙

## 아키텍처 규칙

### Page Component 구조
**목표**: 서버 컴포넌트 우선, 기능별 컴포넌트 분리

#### 원칙
1. **`page.tsx`는 항상 서버 컴포넌트로 유지**
   - `"use client"` 선언 금지
   - 서버에서 데이터 페칭만 담당
   - 페칭한 데이터를 클라이언트 컴포넌트에 props로 전달

2. **기능별 컴포넌트 분리**
   - 하나의 기능 = 하나의 컴포넌트 = 하나의 파일
   - 예시: 헤더, 필터, 리스트 등은 각각 별도 파일
   - 파일 위치: 페이지 디렉토리 내 (`app/(protected)/comments/`)

3. **클라이언트 로직 분리**
   - 상태 관리, 이벤트 핸들러 등이 필요하면 `[PageName]Client.tsx` 생성
   - `"use client"` 선언은 이 컴포넌트에만 포함
   - page.tsx에서 이 컴포넌트를 import해서 사용

#### 파일 위치 규칙
- **page.tsx**: `app/(protected)/[feature]/` (서버 컴포넌트만, 데이터 페칭)
- **컴포넌트**: `components/[feature]/` (페이지 컴포넌트, UI 컴포넌트 등)
- **유틸 함수**: `lib/[feature].ts` (API 호출, 데이터 변환, 타입 정의)

#### 예시 구조
```
app/(protected)/comments/
└── page.tsx (서버 컴포넌트만)

components/comment/
├── CommentsClient.tsx (클라이언트, 상태/이벤트)
├── CommentsHeader.tsx (헤더)
├── AllCommentList.tsx
├── CommentCard.tsx
└── CommentFilter.tsx

lib/
└── comments.ts (함수: fetchConnectedRepos, 타입: ConnectedRepo)
```

#### 각 디렉토리의 역할

| 디렉토리 | 역할 | 포함 내용 |
|---------|------|---------|
| `app/(protected)/[feature]/` | 페이지 진입점 | page.tsx (서버 컴포넌트만) |
| `components/[feature]/` | 모든 컴포넌트 | 페이지 클라이언트 컴포넌트, 헤더, 필터, 리스트, 카드 등 |
| `lib/[feature].ts` | 비즈니스 로직 | API 호출, 데이터 변환, 유틸 함수, 타입 정의 |

#### 예시 코드

**lib/comments.ts**
```tsx
export interface ConnectedRepo {
  id: string
  name: string
  fullName: string
}

export async function fetchConnectedRepos(): Promise<ConnectedRepo[]> {
  const res = await fetch("/api/repositories")
  if (!res.ok) return []
  return res.json()
}
```

**app/(protected)/comments/page.tsx (서버 컴포넌트)**
```tsx
import { fetchConnectedRepos } from "@/lib/comments"
import CommentsClient from "@/components/comment/CommentsClient"

export default async function CommentsPage() {
  const repos = await fetchConnectedRepos()
  return <CommentsClient repos={repos} />
}
```

**components/comment/CommentsClient.tsx (클라이언트 컴포넌트)**
```tsx
"use client"

import { useState } from "react"
import CommentsHeader from "@/components/comment/CommentsHeader"

export default function CommentsClient({ repos }) {
  const [filter, setFilter] = useState()
  return (
    <div>
      <CommentsHeader totalCount={10} isLoading={false} />
      {/* ... 나머지 UI */}
    </div>
  )
}
```

**components/comment/CommentsHeader.tsx**
```tsx
export default function CommentsHeader({ totalCount, isLoading }) {
  return <div>{/* ... */}</div>
}
```

---

## 푸시 규칙
- **git push는 항상 사용자 허락 후 실행**
