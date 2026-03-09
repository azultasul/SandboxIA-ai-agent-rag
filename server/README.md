# Server (Backend)

규제 샌드박스 컨설팅 시스템의 FastAPI + LangGraph 백엔드

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | FastAPI 0.128, Uvicorn |
| AI Agent | LangGraph 1.0, LangChain 1.2 |
| LLM | OpenAI GPT-4o, GPT-4o-mini |
| Vector DB | Qdrant (Production), ChromaDB (Development) |
| Search | Hybrid Search (Dense + SPLADE Sparse) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Auth | Supabase Auth (JWT ES256) |
| Document | docxtpl (DOCX), LibreOffice (PDF) |
| Package | uv (Python 3.12) |

## Getting Started

### Prerequisites

- Python 3.12+
- uv (Python package manager)
- Docker (Vector DB용)
- LibreOffice (PDF 변환용)

### Installation

```bash
cd server
uv sync
```

### Environment Variables

`.env` 파일 생성:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# LLM 설정
LLM_MODEL=gpt-4o-mini
LLM_EMBEDDING_MODEL=text-embedding-3-large

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Vector DB (개발: persistent, 배포: qdrant)
VECTORDB_TYPE=chroma
CHROMA_MODE=persistent
CHROMA_PERSIST_DIR=./data/chroma

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Google Drive (RAG 데이터)
R1_DATA_ID=your-folder-id
R2_DATA_ID=your-folder-id

# 문서 템플릿 (DOCX)
DRAFT_TEMPLATE_FASTCHECK_ID=your-file-id
DRAFT_TEMPLATE_TEMPORARY_ID=your-file-id
DRAFT_TEMPLATE_DEMONSTRATION_ID=your-file-id

# 법령 API (law.go.kr)
LAW_API_BASE_URL=https://www.law.go.kr
LAW_API_OC=your-api-key
```

### Vector DB Setup

RAG 데이터 수집 및 Vector DB 구축:

```bash
# R1: 규제제도 데이터 (Google Drive)
uv run python scripts/collect_regulations.py

# R2: 승인사례 데이터
uv run python scripts/collect_cases.py

# R3: 법령 데이터 (법령 API)
uv run python scripts/collect_laws.py
```

### Run Server

```bash
uv run uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- Health Check: http://127.0.0.1:8000/health

## Project Structure

```
server/
├── app/
│   ├── main.py                       # FastAPI 앱 진입점
│   │
│   ├── agents/                       # LangGraph AI Agents
│   │   ├── service_structurer/       # Step 1: HWP 파싱 → Canonical Structure
│   │   │   ├── state.py, graph.py, nodes.py, tools.py, prompts.py
│   │   ├── eligibility_evaluator/    # Step 2: 대상성 판단
│   │   │   ├── state.py, graph.py, nodes.py, tools.py, prompts.py, schemas.py
│   │   ├── track_recommender/        # Step 3: 트랙 추천
│   │   │   ├── state.py, graph.py, nodes.py, tools.py, prompts.py
│   │   ├── application_drafter/      # Step 4: 신청서 초안 생성
│   │   │   ├── state.py, graph.py, nodes.py, form_schema.py, prompts.py
│   │   ├── chat_supervisor/          # 채팅: 질문 라우팅 (Supervisor)
│   │   │   ├── state.py, graph.py, nodes.py, prompts.py
│   │   ├── rag_expert/              # 채팅 서브: 규제/사례/법령 RAG 검색
│   │   │   ├── nodes.py, prompts.py
│   │   ├── results_analyst/          # 채팅 서브: 프로젝트 분석 결과 조회
│   │   │   ├── nodes.py, prompts.py, tools.py
│   │   └── utils/
│   │       └── streaming.py          # SSE 진행 상태 래퍼
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── agents.py            # 에이전트 실행 API
│   │   │   ├── agent_progress.py    # SSE 진행 상태 스트리밍
│   │   │   ├── chat.py              # 채팅 API
│   │   │   ├── documents.py         # DOCX/PDF 문서 생성
│   │   │   ├── files.py             # 파일 다운로드
│   │   │   └── users.py             # 사용자 관리
│   │   ├── schemas/                  # Pydantic 요청/응답 모델
│   │   └── deps.py                   # 의존성 (JWT 인증)
│   │
│   ├── services/
│   │   ├── structure_service.py      # 서비스 구조화 로직
│   │   ├── eligibility_service.py    # 대상성 판단 로직
│   │   ├── track_service.py          # 트랙 추천 로직
│   │   ├── draft_service.py          # 초안 생성 로직
│   │   ├── chat_service.py           # 채팅 이력 관리
│   │   ├── project_service.py        # 프로젝트 CRUD
│   │   ├── document_generator.py     # DOCX 템플릿 렌더링
│   │   ├── law_api.py                # 법령 API 연동
│   │   └── parsers/
│   │       └── hwp_parser.py         # HWP 파일 파싱
│   │
│   ├── tools/shared/rag/             # 공용 RAG Tools
│   │   ├── regulation_rag.py         # R1: 규제제도 & 절차
│   │   ├── case_rag.py               # R2: 승인사례
│   │   └── domain_law_rag.py         # R3: 도메인별 법령
│   │
│   ├── core/
│   │   ├── config.py                 # Settings (환경 변수)
│   │   ├── llm.py                    # LLM 인스턴스 (gpt-4o, gpt-4o-mini)
│   │   ├── constants.py              # 컬렉션명, 트랙 매핑
│   │   ├── progress_store.py         # SSE 진행 상태 추적
│   │   └── exceptions.py             # 커스텀 예외
│   │
│   ├── db/
│   │   └── vector.py                 # Vector DB 추상 레이어 (ChromaDB / Qdrant)
│   │
│   └── rag/
│       ├── config.py                 # 청킹/임베딩 설정
│       ├── chunkers/                 # 문서 청커
│       └── collectors/               # 데이터 수집기
│
├── eval/                             # RAG 평가 시스템
│   ├── metrics.py                    # Retrieval 평가 지표
│   ├── llm_metrics.py                # RAGAS 기반 LLM 평가
│   ├── r1/, r2/, r3/                 # 도메인별 평가셋 및 실행 스크립트
│
├── scripts/
│   ├── collect_regulations.py        # R1 데이터 수집
│   ├── collect_cases.py              # R2 데이터 수집
│   ├── collect_laws.py               # R3 데이터 수집
│   └── create_test_user.py           # 테스트 사용자 생성
│
├── docker-compose.yml                # FastAPI + Qdrant
├── Dockerfile                        # Multi-stage build (uv + Python 3.12)
└── pyproject.toml
```

## Agent Architecture

### LangGraph Workflow

각 에이전트는 `StateGraph` + `TypedDict` 패턴을 사용합니다. 재귀 제한은 15로 설정되어 있습니다.

### 구현된 에이전트

**파이프라인 에이전트**

| Agent | Workflow | RAG |
|-------|----------|-----|
| **Service Structurer** | `parse_hwp` → `build_structure` | R3 |
| **Eligibility Evaluator** | `screen` → `search_all_rag` → `compose_decision` → `generate_evidence` | R1, R2, R3 |
| **Track Recommender** | `retrieve_cases` → `score_all_tracks` → `retrieve_definitions` → `generate_recommendation` | R1, R2 |
| **Application Drafter** | `load_form_schema` → `retrieve_context` → `generate_draft` | R1, R2, R3 |

**채팅 에이전트**

| Agent | Workflow | 모델 |
|-------|----------|------|
| **Chat Supervisor** | `supervisor` → 조건부 라우팅 | gpt-4o-mini |
| ↳ **Results Analyst** | Supabase에서 프로젝트 데이터 조회 → LLM 응답 생성 | gpt-4o-mini |
| ↳ **RAG Expert** | R1/R2/R3 병렬 검색 (ThreadPoolExecutor) → LLM 응답 생성 | gpt-4o |

### Chat Supervisor 라우팅

Chat Supervisor는 사용자 질문의 의도를 분류하여 적절한 서브 에이전트로 라우팅합니다.

```
사용자 메시지 → Supervisor (gpt-4o-mini, 의도 분류 + 쿼리 리라이팅)
                  │
                  ├→ Results Analyst : "이 프로젝트의~" 등 프로젝트별 분석 결과 질문
                  │   └─ Supabase 조회 (대상성 판정, 트랙 추천 점수, 서비스 정보)
                  │
                  ├→ RAG Expert      : 규제 제도, 절차, 승인 사례, 법령 관련 질문
                  │   └─ R1/R2/R3 병렬 검색 (top_k=3) → 검색 결과 기반 응답
                  │
                  └→ Decline         : 서비스 범위 외 질문 (고정 안내 메시지)
```

**Results Analyst** 데이터 조회 함수:
- `fetch_project_summary()` — 서비스명, 트랙, 현재 단계
- `fetch_eligibility_summary()` — 대상성 판정 + 확신도 + 판단 근거
- `fetch_track_summary()` — 트랙별 추천 점수 및 사유
- `fetch_all_project_data()` — 위 데이터 통합 조회

**RAG Expert** 검색 도구:
- R1 `search_regulation()` — 규제 제도 & 절차
- R2 `search_case()` — 승인 사례
- R3 `search_domain_law()` — 도메인별 법령

### 데이터 흐름

```
Client Input (HWP + Form)
         ↓
Step 1: Service Structurer → Canonical Structure
         ↓
Step 2: Eligibility Evaluator → 대상성 판정 + 근거
         ↓
Step 3: Track Recommender → 트랙 추천 + 비교
         ↓
Step 4: Application Drafter → 신청서 초안
         ↓
Document Generation (DOCX/PDF)
```

## API Endpoints

### Agent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/agents/structure` | Step 1: 서비스 구조화 |
| POST | `/api/v1/agents/eligibility` | Step 2: 대상성 판단 |
| PATCH | `/api/v1/agents/eligibility/{id}/final-decision` | 최종 결정 업데이트 |
| POST | `/api/v1/agents/track` | Step 3: 트랙 추천 |
| GET | `/api/v1/agents/track/{id}` | 캐싱된 트랙 결과 조회 |
| POST | `/api/v1/agents/draft` | Step 4: 초안 생성 |
| PATCH | `/api/v1/agents/draft/{id}` | 초안 카드 부분 업데이트 |

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat` | 메시지 전송 → 에이전트 응답 |
| GET | `/api/v1/chat/{project_id}/history` | 대화 이력 조회 |
| DELETE | `/api/v1/chat/{project_id}/history` | 대화 이력 초기화 |

### Progress Streaming (SSE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents/progress/nodes/{agent_type}` | 에이전트 노드 정의 |
| GET | `/api/v1/agents/progress/nodes` | 전체 에이전트 노드 |
| GET | `/api/v1/agents/progress/subscribe/{project_id}` | SSE 구독 |

**SSE 이벤트:** `agent_start`, `node_start`, `node_end`, `agent_end`, `error`

### Document & File

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/documents/{project_id}/{form_id}/docx` | DOCX 다운로드 |
| GET | `/api/v1/documents/{project_id}/{form_id}/pdf` | PDF 다운로드 |
| GET | `/api/v1/files/download/{file_id}` | 업로드 파일 다운로드 |

### User

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/api/users/me` | 계정 삭제 |

## Shared RAG Tools

### R1: 규제제도 & 절차

```python
# app/tools/shared/rag/regulation_rag.py
@tool
def search_regulations(query, track_filter=None, category_filter=None, ministry_filter=None)
    → RegulationSearchOutput
# 컬렉션: rag_regulations
```

### R2: 승인사례

```python
# app/tools/shared/rag/case_rag.py
@tool
def search_cases(query, track_filter=None)
    → CaseSearchOutput
# 컬렉션: rag_cases
```

### R3: 도메인별 법령

```python
# app/tools/shared/rag/domain_law_rag.py
@tool
def search_domain_laws(query, domain_filter=None)
    → DomainLawSearchOutput
# 컬렉션: rag_laws
# 도메인: healthcare, finance, data, privacy, telecom, regulation
```

**Relevance Threshold:** 0.25 이하 결과는 필터링됩니다.

## Vector DB

### 추상 레이어

`app/db/vector.py`에서 ChromaDB와 Qdrant를 추상화하여 동일한 인터페이스로 사용합니다.

```python
store = get_vector_store()  # 환경 변수에 따라 ChromaDB 또는 Qdrant 반환
results = store.search(collection, query_embedding, top_k=5, filters=...)
```

### Hybrid Search (Qdrant)

Dense(임베딩) + Sparse(SPLADE) 검색을 결합합니다.

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| Alpha | 0.7 | Dense 70%, Sparse 30% 가중치 |
| Sparse Model | SPLADE_PP_en_v1 | BM25 대비 향상된 sparse 임베딩 |

### 컬렉션

| Collection | 설명 |
|------------|------|
| `rag_regulations` | R1: 규제제도 |
| `rag_cases` | R2: 승인사례 |
| `rag_laws` | R3: 도메인법령 |

## Document Generation

### DOCX 템플릿

`docxtpl` + Jinja2 기반 템플릿 렌더링:

```python
# app/services/document_generator.py
# - 날짜 형식 변환 (한국어 → ISO)
# - 체크박스 (√) 처리
# - SafeDict로 undefined 방지
# - 배열 행 확장 (조직, 인물 정보)
```

### PDF 변환

LibreOffice CLI 사용:

```bash
# macOS
brew install --cask libreoffice

# Ubuntu/Debian (Docker)
apt-get install libreoffice
```

## Authentication

Supabase Auth JWT (ES256) 기반 인증:

```python
# app/api/deps.py
async def get_auth_user(request: Request) -> AuthUser:
    # Supabase JWKS 공개키로 JWT 검증
    # 알고리즘: ES256 (ECC P-256)
    # Audience: "authenticated"
```

## RAG Evaluation

```bash
# Retrieval 평가 (비용 없음)
uv run python eval/r3/run_evaluation.py --top_k 5

# LLM-as-Judge 평가 (RAGAS, OpenAI API 비용 발생)
uv run python eval/r3/run_llm_evaluation.py --limit 5
```

## Database

### Supabase Tables

| Table | Description |
|-------|-------------|
| `projects` | 프로젝트 메타데이터 (canonical, application_draft, chat_history, status, track) |
| `eligibility_results` | 대상성 판단 결과 |
| `track_results` | 트랙 추천 결과 |
| `project_files` | 업로드 파일 메타데이터 |
| `users` | 사용자 프로필 |

## Deployment

### Docker Compose (AWS EC2)

```bash
# 1. EC2에서 저장소 클론
git clone https://github.com/azultasul/SandboxIA-ai-agent-rag.git
cd SandboxIA-ai-agent-rag/server

# 2. 환경 변수 설정
cp .env.example .env
nano .env

# 3. 실행
docker-compose pull
docker-compose up -d

# 4. 상태 확인
docker-compose ps
docker-compose logs -f api
```

**서비스 구성:**

| 서비스 | 이미지 | 포트 | 설명 |
|--------|--------|------|------|
| `api` | ghcr.io/...server-api:latest | 8000 | FastAPI 서버 |
| `qdrant` | qdrant/qdrant:latest | 6333, 6334 | Vector DB (REST + gRPC) |

**배포 환경 변수 (.env):**

```env
VECTORDB_TYPE=qdrant
QDRANT_HOST=qdrant
QDRANT_PORT=6333
CHROMA_MODE=http
CORS_ORIGINS=https://your-domain.vercel.app
```

### CI/CD (GitHub Actions)

`.github/workflows/deploy-server.yml`:
- `main` 브랜치 `server/` 경로 변경 시 자동 배포
- Docker 이미지 빌드 → GHCR push → EC2 SSH 배포

### HTTPS (Caddy)

```
# /etc/caddy/Caddyfile
api.your-domain.com {
    reverse_proxy localhost:8000
}
```

### 운영 명령어

```bash
docker-compose logs -f api        # 로그 확인
docker-compose restart api        # 재시작
docker-compose pull && docker-compose up -d  # 업데이트
curl http://localhost:8000/health  # 헬스체크
docker stats                       # 리소스 모니터링
```
