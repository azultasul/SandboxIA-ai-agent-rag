# Client (Frontend)

규제 샌드박스 컨설팅 시스템의 Next.js 프론트엔드

## Tech Stack

| 영역         | 기술                              |
| ------------ | --------------------------------- |
| Framework    | Next.js 16 (App Router), React 19 |
| Language     | TypeScript 5                      |
| Styling      | TailwindCSS 4, Radix UI           |
| Server State | TanStack Query 5                  |
| Client State | Zustand 5                         |
| Form         | React Hook Form + Zod             |
| Editor       | Tiptap 3 (Rich Text)              |
| Auth         | Supabase Auth (SSR)               |
| Icons        | Lucide React                      |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
cd client
pnpm install
```

### Environment Variables

`.env.local` 파일 생성:

```env
# Backend API (개발)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
pnpm run dev       # 개발 서버 (http://localhost:3000)
pnpm run build     # 프로덕션 빌드
pnpm run lint      # ESLint
pnpm run format    # Prettier
```

## Project Structure

```
client/src/
├── app/                              # App Router
│   ├── (marketing)/                  # Public 페이지
│   │   ├── page.tsx                 # 랜딩 페이지
│   │   ├── login/                   # 로그인
│   │   ├── signup/                  # 회원가입
│   │   └── onboarding/             # 온보딩
│   ├── (dashboard)/                  # Protected 페이지
│   │   ├── dashboard/               # 프로젝트 목록
│   │   ├── projects/[id]/
│   │   │   ├── service/             # Step 1: 서비스 구조화
│   │   │   ├── eligibility/         # Step 2: 대상성 판단
│   │   │   ├── track/               # Step 3: 트랙 추천
│   │   │   └── draft/               # Step 4: 신청서 작성
│   │   └── my-account/             # 계정 관리
│   └── auth/callback/               # OAuth 콜백
│
├── components/
│   ├── ui/                           # 재사용 UI 프리미티브
│   │   ├── button.tsx, input.tsx, select.tsx
│   │   ├── card.tsx, modal.tsx, confirm-modal.tsx
│   │   ├── tabs.tsx, accordion.tsx, badge.tsx
│   │   ├── ai-loader.tsx            # 에이전트 진행 상태 표시
│   │   ├── file-upload.tsx          # 파일 드래그 앤 드롭
│   │   └── tiptap-editor.tsx        # 리치 텍스트 에디터
│   ├── features/
│   │   ├── dashboard/               # 파이프라인, 프로젝트 카드
│   │   ├── draft/                   # 양식 편집, 채팅, 참고자료, 다운로드
│   │   ├── analysis/                # AI 분석 결과 카드
│   │   ├── project/                 # 서비스 폼, 프로젝트 헤더
│   │   └── wizard/                  # 스텝 네비게이션
│   └── layouts/
│       ├── DashboardLayout.tsx
│       └── ProjectLayout.tsx
│
├── hooks/
│   ├── queries/                      # TanStack Query (Read)
│   │   ├── use-projects-query.ts
│   │   ├── use-eligibility-query.ts
│   │   ├── use-track-query.ts
│   │   ├── use-draft-query.ts
│   │   ├── use-chat-query.ts
│   │   └── use-agent-nodes-query.ts
│   ├── mutations/                    # TanStack Mutation (Write)
│   │   ├── use-service-mutation.ts
│   │   ├── use-eligibility-mutation.ts
│   │   ├── use-track-mutation.ts
│   │   ├── use-draft-mutation.ts
│   │   ├── use-chat-mutation.ts
│   │   ├── use-create-project-mutation.ts
│   │   └── use-delete-project-mutation.ts
│   └── streaming/
│       └── use-agent-progress.ts    # SSE 진행 상태 구독
│
├── lib/
│   ├── api/                          # API 클라이언트
│   │   ├── agents.ts                # 에이전트 호출
│   │   ├── projects.ts              # 프로젝트 CRUD
│   │   ├── chat.ts                  # 채팅 API
│   │   ├── eligibility.ts          # 대상성 결과
│   │   ├── track.ts                # 트랙 추천 결과
│   │   └── draft.ts                # 초안 데이터
│   ├── supabase/
│   │   ├── client.ts               # 브라우저 클라이언트
│   │   └── server.ts               # 서버 클라이언트
│   └── utils/                       # cn, date, form, step-utils
│
├── stores/                           # Zustand
│   ├── auth-store.ts                # 인증 상태
│   ├── project-store.ts             # 프로젝트 상태 (localStorage 영속)
│   ├── ui-store.ts                  # UI 상태 (뷰 모드, 로더)
│   └── wizard-store.ts             # 스텝 폼 상태
│
├── types/
│   ├── api/                          # API 타입 (project, eligibility, track, draft, chat)
│   └── data/                         # 내부 타입 (ProjectStatus, Track 등)
│
└── data/                             # 정적 데이터
    ├── tracks.json                  # 트랙 정의
    ├── formData.json                # 양식 스키마
    └── form/                        # 트랙별 양식 (counseling, fastcheck, temporary, demonstration)
```

## Key Features

### 대시보드 (`/dashboard`)

프로젝트 목록을 관리하고 진행 상황을 파악하는 메인 화면입니다.

- 파이프라인 필터: 기업상담 / 신청서작성 / 결과대기 / 완료 상태별 카운트 및 필터링
- 프로젝트 카드: 회사명, 서비스명, 상태, 최근 수정일 표시
- 검색, 정렬(최신순/오래된순), 그리드/리스트 뷰 전환, 페이지네이션
- 새 프로젝트 생성 모달

### Step 1. 서비스 구조화 (`/projects/[id]/service`)

서비스 기본 정보를 입력하고 신청서 파일을 업로드하는 화면입니다.

- 서비스 정보 입력: 회사명, 서비스명, 서비스 설명, 추가 메모
- 신청 유형 선택: 상담신청/신속확인/임시허가/실증특례
- 파일 업로드: HWP/PDF 신청서 (드래그 앤 드롭)
- AI 분석 실행 → 서비스 구조화 + 대상성 판단

### Step 2. 대상성 판단 (`/projects/[id]/eligibility`)

AI가 규제 현황을 분석하여 샌드박스 신청 필요 여부를 판단합니다.

- AI 분석 결과: 판정(필요/불필요/불명확) + 신뢰도
- 판단 근거: 규제/법령/사례 기준별 근거 배지
- 리스크: 바로 출시 시 예상 리스크
- 최종 결정: 바로 시장 출시 / 규제 샌드박스 신청 선택
- 참고 패널: 유사 승인 사례 + 관련 법령

### Step 3. 트랙 추천 (`/projects/[id]/track`)

AI가 분석 결과를 바탕으로 최적의 트랙을 추천합니다.

- 트랙 카드(3개): 순위 배지, 점수, 상태 배지(추천/조건부/비추천)
- 추천 이유: 긍정/부정/중립 아이콘과 근거
- 트랙 선택: 카드 클릭으로 선택
- 참고 패널: 유사 사례 + 관련 법령

### Step 4. 신청서 작성 (`/projects/[id]/draft`)

AI가 생성한 초안을 검토하고 수정하여 최종 문서를 완성합니다.

- AI 초안 생성/재생성
- 동적 양식: JSON 스키마 기반, 트랙별 다른 폼 렌더링
- 필드 타입: 텍스트, Tiptap 리치 에디터, 날짜, 셀렉트, 체크박스, 동적 배열
- 카드별 부분 저장
- AI 채팅 패널: Chat Supervisor 에이전트 연동 실시간 Q&A
- 참고자료 패널: 유사 승인 사례 + 관련 법령
- 사이드 패널 전환: 참고자료 ↔ AI 채팅
- 문서 다운로드: DOCX/PDF

### 공통 UI

- SSE 기반 에이전트 진행 상태 표시 (노드별 체크리스트)
- 참고 패널 접기/펼치기
- 확인 모달 (재분석, 완료 등)
- 스텝 네비게이션 바

## Architecture Patterns

### State Management

```
┌─────────────────────────────────────────────────────┐
│  Server State (TanStack Query)                      │
│  • 프로젝트, 대상성, 트랙, 초안, 채팅 이력                  │
├─────────────────────────────────────────────────────┤
│  Client State (Zustand)                             │
│  • 인증, UI 상태 (뷰 모드, 로더), 위자드 스텝               │
├─────────────────────────────────────────────────────┤
│  Form State (React Hook Form + Zod)                 │
│  • 필드 값, 유효성 검증, dirty state                    │
└─────────────────────────────────────────────────────┘
```

### API Proxy

`next.config.mjs`에서 API 프록시를 설정하여 CORS를 처리합니다:

```javascript
rewrites() {
  return [
    { source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` },
    { source: "/api/users/:path*", destination: `${BACKEND_URL}/api/users/:path*` },
  ];
}
```

### SSE Progress Streaming

에이전트 실행 중 실시간 진행 상태를 `EventSource`로 구독합니다:

```typescript
// hooks/streaming/use-agent-progress.ts
const eventSource = new EventSource(`${API_BASE}/agents/progress/subscribe/${projectId}`)
// Events: agent_start, node_start, node_end, agent_end, error
```

### Authentication

Supabase Auth 기반 인증:

1. `AuthProvider`가 앱 초기화 시 세션 복원
2. `auth-store`에서 토큰 관리
3. API 요청 시 `Authorization: Bearer {token}` 헤더 추가
4. Protected route는 대시보드 레이아웃에서 접근 제어

### Performance

- React Compiler 자동 메모이제이션
- TanStack Query 캐싱, 중복 요청 제거
- Zustand Persist (localStorage 기반 상태 복원)
- 동적 import 코드 스플리팅

## Deployment

### Vercel

```bash
# Vercel CLI 배포
cd client
vercel --prod

# 또는 GitHub 연동 자동 배포 (main 브랜치 push 시)
```

**빌드 설정:**

| 설정             | 값               |
| ---------------- | ---------------- |
| Framework Preset | Next.js          |
| Root Directory   | `client`         |
| Build Command    | `pnpm run build` |
| Install Command  | `pnpm install`   |

**환경 변수 (Vercel Dashboard):**

```env
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

GitHub PR 생성 시 자동으로 Preview URL이 생성됩니다.
