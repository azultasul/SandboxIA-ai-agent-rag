# SandboxIA

규제 샌드박스 신청 컨설팅을 지원하는 AI 멀티에이전트 시스템

## Overview

SandboxIA는 ICT 규제 샌드박스 신청 과정을 자동화하는 AI 기반 컨설팅 지원 시스템입니다. LangGraph 기반 멀티에이전트 아키텍처로 서비스 분석, 대상성 판단, 트랙 추천, 신청서 초안 작성까지 전 과정을 지원하며, RAG(Retrieval-Augmented Generation) 기반으로 규제 제도, 승인 사례, 도메인 법령 데이터를 활용합니다.

### 핵심 기능

| 단계 | 기능 | 설명 |
|------|------|------|
| Step 1 | 서비스 구조화 | HWP/PDF 파일 파싱, 서비스 정보 추출 및 정규화 |
| Step 2 | 대상성 판단 | 규제 샌드박스 적용 대상 여부 AI 판단 |
| Step 3 | 트랙 추천 | 신속확인/실증특례/임시허가 중 최적 트랙 추천 |
| Step 4 | 신청서 초안 | 트랙별 신청서 양식 AI 자동 작성 및 편집 |
| 채팅 | AI 상담 | 프로젝트 분석 결과, 규제/법령/사례 실시간 Q&A |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (Next.js 16)                         │
│  React 19 │ TanStack Query 5 │ Zustand │ TailwindCSS 4             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API + SSE (Progress Streaming)
┌────────────────────────────────▼────────────────────────────────────┐
│                      Server (FastAPI + LangGraph)                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      LangGraph Agents                          │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │ │
│  │  │ 1.Structurer │ │2.Eligibility │ │3.Recommender │           │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘           │ │
│  │  ┌──────────────┐ ┌──────────────────────────────────┐        │ │
│  │  │  4.Drafter   │ │ Chat Supervisor                  │        │ │
│  │  │              │ │  ├─ Results Analyst (프로젝트 결과)│        │ │
│  │  │              │ │  └─ RAG Expert (규제/사례/법령)   │        │ │
│  │  └──────────────┘ └──────────────────────────────────┘        │ │
│  └───────────────────────────┬────────────────────────────────────┘ │
│  ┌───────────────────────────▼────────────────────────────────────┐ │
│  │                    Shared RAG Tools                             │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │ │
│  │  │ R1: 규제제도     │ │ R2: 승인사례    │ │ R3: 도메인법령   │  │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────────┐
│                           External Services                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │   Supabase   │ │ Qdrant /     │ │  OpenAI API  │                 │
│  │  (DB/Auth/   │ │ ChromaDB     │ │  (LLM/Embed) │                 │
│  │   Storage)   │ │ (Vector DB)  │ │              │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript 5, TailwindCSS 4, TanStack Query 5, Zustand |
| Backend | FastAPI, LangGraph 1.0, LangChain, Pydantic |
| AI/ML | OpenAI GPT-4o / GPT-4o-mini, Hybrid Search (Dense + SPLADE) |
| Vector DB | Qdrant (Production), ChromaDB (Development) |
| Database | Supabase (PostgreSQL + Storage + Auth) |
| Infra | Vercel (Frontend), AWS EC2 + Docker Compose (Backend) |

## AI Agent Architecture

### LangGraph 멀티에이전트

4개의 파이프라인 에이전트와 채팅 에이전트 그룹(Supervisor + 2 서브에이전트)으로 구성됩니다.

**파이프라인 에이전트**

| Agent | 역할 | 사용 RAG |
|-------|------|----------|
| **Service Structurer** | HWP 파싱 → 서비스 정보 정규화 (Canonical Structure) | R3 |
| **Eligibility Evaluator** | 규제 샌드박스 대상 여부 판단 | R1, R2, R3 |
| **Track Recommender** | 신속확인/실증특례/임시허가 트랙 추천 | R1, R2 |
| **Application Drafter** | 트랙별 신청서 초안 자동 생성 | R1, R2, R3 |

**채팅 에이전트**

| Agent | 역할 | 모델 |
|-------|------|------|
| **Chat Supervisor** | 사용자 질문 의도 분류 및 서브 에이전트 라우팅 | gpt-4o-mini |
| ↳ **Results Analyst** | 프로젝트별 분석 결과(대상성, 트랙 추천, 점수 등) 질의응답 | gpt-4o-mini |
| ↳ **RAG Expert** | 규제 제도, 승인 사례, 법령 관련 질의응답 (R1/R2/R3 병렬 검색) | gpt-4o |

### RAG System

3개의 도메인별 RAG로 컨텍스트 기반 응답을 생성합니다.

| RAG | 데이터 소스 | 주요 활용 |
|-----|-------------|----------|
| R1: 규제제도 & 절차 | 트랙별 정의, 절차, 요건, 심사 기준 | 대상성 판단, 트랙 추천, 신청서 작성 |
| R2: 승인사례 | 실증특례/임시허가 승인 사례, 조건, 실증 범위 | 유사 사례 검색, 근거 제공 |
| R3: 도메인별 법령 | 의료법, 전자금융거래법, 개인정보보호법 등 | 규제 쟁점 분석, 법적 근거 |

### RAG 평가

RAGAS 기반 평가 시스템으로 Retrieval/Generation 품질을 측정합니다.

| 카테고리 | 지표 | 설명 |
|----------|------|------|
| Retrieval | Must-Have Recall@K | 필수 조항 검색률 |
| | Recall@K | 전체 정답 검색률 |
| | MRR | 첫 번째 정답의 역순위 |
| Generation | Faithfulness | 컨텍스트 기반 여부 |
| | Answer Relevancy | 질문-응답 적합도 |

## Getting Started

### Prerequisites

- Node.js 20+, pnpm 9+
- Python 3.12+, uv
- Docker (Vector DB용)

### Quick Start

```bash
# 1. 저장소 클론
git clone https://github.com/azultasul/SandboxIA-ai-agent-rag.git
cd SandboxIA-ai-agent-rag

# 2. 환경 변수 설정
cp server/.env.example server/.env
cp client/.env.example client/.env.local
# .env 파일 편집하여 API 키 설정

# 3. 서버 실행 (터미널 1)
cd server
uv sync
uv run python scripts/collect_regulations.py  # RAG 데이터 구축
uv run uvicorn app.main:app --reload

# 4. 클라이언트 실행 (터미널 2)
cd client
pnpm install
pnpm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

자세한 설정은 각 디렉토리의 README를 참고하세요:
- [client/README.md](./client/README.md) - 프론트엔드 설정 및 배포
- [server/README.md](./server/README.md) - 백엔드 설정 및 배포

## Repository Structure

```
.
├── client/                    # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/              # App Router 페이지
│   │   ├── components/       # React 컴포넌트 (ui/, features/, layouts/)
│   │   ├── hooks/            # TanStack Query 훅 (queries/, mutations/, streaming/)
│   │   ├── lib/              # API 클라이언트, 유틸리티
│   │   ├── stores/           # Zustand 스토어
│   │   ├── types/            # TypeScript 타입
│   │   └── data/             # 양식 스키마 (JSON)
│   └── README.md
│
├── server/                    # FastAPI 백엔드
│   ├── app/
│   │   ├── agents/           # LangGraph 멀티에이전트
│   │   ├── api/              # API 라우트 & 스키마
│   │   ├── services/         # 비즈니스 로직
│   │   ├── tools/shared/     # 공용 RAG Tools
│   │   ├── core/             # 설정, LLM, 상수
│   │   └── db/               # Vector DB 클라이언트
│   ├── eval/                 # RAG 평가 시스템
│   ├── scripts/              # 데이터 수집 스크립트
│   └── README.md
│
├── doc/                       # 프로젝트 문서
│   ├── development/          # 개발 명세 (에이전트, DB, 코딩 컨벤션)
│   ├── planning/             # 기획 문서 (PRD, 양식 정의)
│   └── evaluation/           # RAG 평가 결과
│
├── .github/workflows/        # CI/CD (GitHub Actions)
├── .coderabbit.yaml          # 자동 코드 리뷰 설정
├── CLAUDE.md                 # Claude Code 지침
└── README.md
```

## Deployment

### 배포 아키텍처

```
┌─────────────────┐           ┌─────────────────────────────────┐
│     Vercel      │           │         AWS EC2 (Ubuntu)        │
│   (Frontend)    │           │          (Backend)              │
│                 │           │                                 │
│  Next.js 16     │◀─────────▶│  ┌─────────────────────────┐   │
│  Edge Network   │   HTTPS   │  │   Docker Compose        │   │
│                 │           │  │  ┌─────────┐ ┌────────┐ │   │
│                 │           │  │  │ FastAPI │ │ Qdrant │ │   │
│                 │           │  │  │  :8000  │ │ :6333  │ │   │
└─────────────────┘           │  │  └─────────┘ └────────┘ │   │
                              │  └─────────────────────────┘   │
                              └─────────────────────────────────┘
```

- **Frontend**: Vercel (GitHub 연동 자동 배포, Preview Deployments)
- **Backend**: AWS EC2 + Docker Compose (GitHub Actions CI/CD)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Vector DB**: Qdrant (Docker 컨테이너)

## Branch Strategy

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 배포 |
| `dev` | 개발 통합 |
| `feature/agent-*` | 에이전트 개발 |
| `feature/func-*` | 기능 개발 |
| `feature/uiux` | UI/UX 개발 |
| `eval/rag-*` | RAG 평가 실험 |

## Development Tools

### CodeRabbit

PR 생성 시 자동 코드 리뷰. 설정: `.coderabbit.yaml`

### Claude Code

AI 기반 개발 지원. 프로젝트 지침: `CLAUDE.md`

**MCP 서버:**
- [context7](https://github.com/upstash/context7) - 라이브러리 공식 문서 검색
- [supabase-mcp](https://github.com/supabase-community/supabase-mcp) - DB 스키마 관리
- [serena](https://github.com/brokegen/serena) - 시맨틱 코드 탐색

## Contributing

1. 이슈 생성 또는 할당된 이슈 확인
2. `dev`에서 feature 브랜치 생성
3. 작업 완료 후 PR 생성 (base: `dev`)
4. CodeRabbit 리뷰 확인 및 수정
5. 리뷰 승인 후 Merge

## Team

AI Camp 4th - Team SandboxIA
