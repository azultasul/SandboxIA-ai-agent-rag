# Supervisor Agent 챗봇 구현 계획

## Context

현재 SandboxIA는 4개 에이전트(구조화/대상성/트랙/신청서)가 각각 독립 API로 호출되며, 에이전트 간 조율하는 중앙 제어자가 없다. Supervisor 패턴을 적용하여 Draft 페이지에 AI 상담 챗봇을 추가한다.

Supervisor Agent가 사용자 질문을 분석하여 2개 sub-agent 중 적절한 것을 선택하고 위임하는 구조:
- **Results Analyst Agent**: Supabase에 저장된 기존 분석 결과(대상성, 트랙 추천) 조회 및 설명
- **RAG Expert Agent**: 기존 R1/R2/R3 RAG 도구를 사용한 규제/사례/법령 질의응답

---

## 1. DB 마이그레이션

projects 테이블에 `chat_history` 컬럼 추가.

```sql
ALTER TABLE projects ADD COLUMN chat_history JSONB DEFAULT '[]'::jsonb;
```

**chat_history 데이터 구조:**
```json
[
  {"role": "user", "content": "...", "timestamp": "2026-03-08T10:30:00Z"},
  {"role": "assistant", "content": "...", "timestamp": "2026-03-08T10:30:05Z", "agent": "results_analyst"}
]
```

---

## 2. Server 구현

### 2.1 파일 구조

에이전트별 독립 폴더로 분리하여 Supervisor 패턴을 명확히 표현합니다.

```
server/app/agents/
├── chat_supervisor/              # Supervisor Agent (중앙 라우터)
│   ├── __init__.py
│   ├── state.py                  # ChatSupervisorState (TypedDict) — 전체 상태
│   ├── prompts.py                # Supervisor 라우팅 프롬프트
│   ├── nodes.py                  # supervisor_node (라우팅 분류만)
│   └── graph.py                  # 전체 StateGraph 조합, compile, run_chat()
│
├── results_analyst/              # Sub-Agent 1: 프로젝트 분석 결과 설명
│   ├── __init__.py
│   ├── prompts.py                # Results Analyst 프롬프트
│   ├── tools.py                  # Supabase 조회 도구 (전처리된 결과 반환)
│   └── nodes.py                  # results_analyst_node
│
└── rag_expert/                   # Sub-Agent 2: 규제/법령/사례 RAG Q&A
    ├── __init__.py
    ├── prompts.py                # RAG Expert 프롬프트
    └── nodes.py                  # rag_expert_node (R1/R2/R3 RAG 호출)

server/app/services/chat_service.py     # chat_history CRUD
server/app/api/routes/chat.py           # API 엔드포인트
```

**설계 원칙:**
- `chat_supervisor/`가 진입점 — `graph.py`에서 sub-agent 노드들을 import하여 하나의 StateGraph로 조합
- `results_analyst/`, `rag_expert/`는 각각 독립적인 노드 + 도구 + 프롬프트를 보유
- 상태(State)는 `chat_supervisor/state.py`에서 통합 관리 (sub-agent들이 공유)

### 2.2 State — `chat_supervisor/state.py`

Supervisor가 관리하는 전체 상태. Sub-agent들도 이 상태를 공유합니다.

```python
class ChatSupervisorState(TypedDict, total=False):
    project_id: str
    user_message: str
    chat_history: list[dict]        # 최근 10개 메시지 (컨텍스트용)
    route: str                       # "results_analyst" | "rag_expert" | "decline"
    rewritten_query: str             # Supervisor가 재작성한 쿼리
    tool_results: str                # sub-agent가 수집한 데이터 (전처리된 텍스트)
    assistant_message: str           # 최종 응답
    agent_used: str                  # 응답 생성한 sub-agent 이름
```

### 2.3 Graph 구조 — `chat_supervisor/graph.py`

```
START → supervisor → (조건부 라우팅) → results_analyst → END
                                     → rag_expert     → END
                                     → decline        → END
```

- `chat_supervisor/graph.py`에서 sub-agent 노드들을 import하여 하나의 StateGraph로 조합
- `compile()` 후 싱글톤 인스턴스
- `ainvoke()` 사용 (스트리밍 불필요)
- `recursion_limit=5`

```python
# chat_supervisor/graph.py
from app.agents.chat_supervisor.nodes import supervisor_node, decline_node
from app.agents.results_analyst.nodes import results_analyst_node
from app.agents.rag_expert.nodes import rag_expert_node
```

### 2.4 Supervisor Node — `chat_supervisor/nodes.py`

- `get_fast_llm()` 사용 (gpt-4o-mini -- 분류는 저렴한 모델로 충분)
- `with_structured_output()` 사용하여 route + rewritten_query를 JSON으로 추출
- chat_history 최근 10개를 컨텍스트로 포함
- 라우팅 분류 스키마:

```python
class SupervisorDecision(BaseModel):
    route: Literal["results_analyst", "rag_expert", "decline"]
    rewritten_query: str = ""
```

### 2.5 Results Analyst — `results_analyst/`

**nodes.py — `results_analyst_node`:**
- `tools.py`의 전처리 함수 호출 → Supabase 데이터를 읽기 좋은 텍스트로 변환
- `get_fast_llm()` (데이터 설명은 간단한 작업)
- `max_tokens=1024`

**tools.py — Supabase 전처리 도구:**
기존 서비스 함수를 재활용하되, LLM에 넘길 때 전처리:

```python
def fetch_eligibility_summary(project_id: str) -> str:
    """eligibility_results → LLM이 읽기 좋은 한국어 텍스트"""
    # 기존 get_eligibility_result() 재활용

def fetch_track_summary(project_id: str) -> str:
    """track_results → 트랙 비교/추천 요약 텍스트"""
    # 기존 get_track_result() 재활용

def fetch_project_summary(project_id: str) -> str:
    """projects → 서비스명, 트랙, 현재 단계 등 기본 정보"""
```

**prompts.py — RESULTS_ANALYST_SYSTEM_PROMPT:**
- 프로젝트 분석 결과를 친절하게 설명하는 컨설턴트 역할
- 제공된 데이터 범위 내에서만 답변

### 2.6 RAG Expert — `rag_expert/`

**nodes.py — `rag_expert_node`:**
- 기존 공유 RAG 도구 호출 (search_regulation, search_case, search_domain_law)
- 질문 분석 후 필요한 RAG 도구만 선택적 호출 (ThreadPoolExecutor로 병렬)
- `get_llm()` (추론 필요)
- `max_tokens=1024`
- RAG `top_k=3` (채팅용은 적게)

**prompts.py — RAG_EXPERT_SYSTEM_PROMPT:**
- 규제 샌드박스 전문가 역할
- 검색 결과 기반 답변, 출처 인용 필수
- 검색 결과가 없으면 솔직히 정보 없음을 안내

### 2.7 Decline Node — `chat_supervisor/nodes.py`

- LLM 호출 없이 템플릿 메시지 반환
- "저는 규제 샌드박스 제도, 승인 사례, 관련 법령, 그리고 이 프로젝트의 분석 결과에 대한 질문에만 답변드릴 수 있습니다."

### 2.8 Supervisor 프롬프트 — `chat_supervisor/prompts.py`

**SUPERVISOR_SYSTEM_PROMPT** -- 핵심 지침:
- 3가지 라우팅 기준 명확 정의
- results_analyst: "이 프로젝트의", "대상성 결과", "트랙 추천 이유", "분석 결과" 등 프로젝트 데이터 관련
- rag_expert: "규제", "법령", "승인 사례", "절차", "요건" 등 제도/법 관련
- decline: 위 두 카테고리에 해당하지 않는 모든 질문

### 2.9 API 엔드포인트 (chat.py)

```python
router = APIRouter(prefix="/chat", tags=["chat"])

# POST /api/v1/chat              -- 메시지 전송
# GET  /api/v1/chat/{project_id}/history  -- 대화 내역 조회
# DELETE /api/v1/chat/{project_id}/history -- 대화 리셋
```

**main.py에 라우터 등록:**
```python
from app.api.routes.chat import router as chat_router
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
```

### 2.10 Chat Service (chat_service.py)

```python
def get_chat_history(project_id: str) -> list[dict]
def append_chat_messages(project_id: str, messages: list[dict]) -> None
def clear_chat_history(project_id: str) -> None
```

- 기존 supabase 싱글톤 사용
- projects.chat_history JSONB 읽기/쓰기/초기화

### 2.11 비용 제어 정리

| 구성요소 | LLM | 제한 |
|---------|-----|------|
| Supervisor | gpt-4o-mini | 분류만 (토큰 최소) |
| Results Analyst | gpt-4o-mini | max_tokens=1024 |
| RAG Expert | gpt-4o (설정 모델) | max_tokens=1024, top_k=3 |
| Graph | - | recursion_limit=5 |
| 컨텍스트 | - | chat_history 최근 10개만 |

---

## 3. Client 구현

### 3.1 파일 구조

```
client/src/
├── types/api/chat.ts                              # ChatMessage, ChatRequest, ChatResponse
├── lib/api/chat.ts                                # chatApi (fetch 기반)
├── hooks/
│   ├── queries/use-chat-query.ts                  # useChatHistoryQuery
│   └── mutations/use-chat-mutation.ts             # useChatMutation, useChatResetMutation
└── components/features/draft/ChatPanel.tsx         # 채팅 UI
```

### 3.2 Types (types/api/chat.ts)

```typescript
export interface ChatMessage {
    role: "user" | "assistant"
    content: string
    timestamp: string
    agent?: string  // 어떤 sub-agent가 답변했는지
}

export interface ChatRequest {
    project_id: string
    message: string
}

export interface ChatResponse {
    role: "assistant"
    content: string
    agent: string
    timestamp: string
}
```

### 3.3 API Client (lib/api/chat.ts)

기존 agents.ts 패턴 준수 (fetch + getAuthToken):

```typescript
export const chatApi = {
    sendMessage: async (request: ChatRequest): Promise<ChatResponse> => { ... },
    getHistory: async (projectId: string): Promise<ChatMessage[]> => { ... },
    resetHistory: async (projectId: string): Promise<{ success: boolean }> => { ... },
}
```

### 3.4 Hooks

**use-chat-mutation.ts:**
```typescript
export function useChatMutation()  // POST /chat
export function useChatResetMutation()  // DELETE /chat/{id}/history
```

**use-chat-query.ts:**
```typescript
export function useChatHistoryQuery(projectId: string)  // GET /chat/{id}/history
```

### 3.5 ChatPanel UI (ChatPanel.tsx)

**구조:**
```
+-------------------------------+
| AI 어시스턴트     [리셋] [닫기] |  <- 헤더
+-------------------------------+
|                               |
|  메시지 목록 (스크롤)           |  <- 채팅 영역
|  - user 메시지: 오른쪽 정렬     |
|  - assistant 메시지: 왼쪽 정렬  |
|  - ReactMarkdown 렌더링        |
|  - 자동 스크롤 (최하단)         |
|                               |
+-------------------------------+
| [텍스트 입력]          [전송]  |  <- 입력 영역
+-------------------------------+
```

**주요 동작:**
- `useChatHistoryQuery`로 초기 대화 로드
- `useChatMutation`으로 메시지 전송
- 낙관적 UI: 유저 메시지 즉시 표시 -> 응답 수신 후 어시스턴트 메시지 추가
- Enter로 전송, Shift+Enter로 줄바꿈
- 전송 중 입력 비활성화 + 로딩 인디케이터
- 리셋 버튼 -> ConfirmModal ("대화를 리셋하면 이전 대화 내용을 복구할 수 없습니다.")
- 닫힌 상태: 토글 버튼만 표시

### 3.6 Draft 페이지 통합 (page.tsx 수정)

**변경 방식 -- 오른쪽 패널 영역에 탭 전환:**

```tsx
// 기존: isReferencePanelOpen (boolean)
// 변경: rightPanelMode ("reference" | "chat" | "closed")
const [rightPanelMode, setRightPanelMode] = useState<"reference" | "chat" | "closed">("reference")
```

**오른쪽 패널 영역:**
```tsx
<div className={rightPanelMode !== "closed" ? "flex-1 min-w-0" : ""}>
    <div className="sticky top-24">
        {/* 패널 전환 버튼 */}
        <div className="flex gap-1 mb-2">
            <Button size="icon" variant={...} onClick={...}>
                <BookOpen />  {/* 참고자료 패널 */}
            </Button>
            <Button size="icon" variant={...} onClick={...}>
                <MessageSquare />  {/* 챗봇 패널 */}
            </Button>
        </div>

        {rightPanelMode === "reference" && <ReferencePanel ... />}
        {rightPanelMode === "chat" && <ChatPanel projectId={id} />}
    </div>
</div>
```

---

## 4. 구현 순서

| 순서 | 작업 | 파일 | 브랜치 |
|------|------|------|--------|
| 1 | DB 마이그레이션 | Supabase SQL (수동) | - |
| 2 | Supervisor: state.py, prompts.py, nodes.py | agents/chat_supervisor/ | `feature/agent-chat-supervisor` |
| 3 | Results Analyst: prompts.py, tools.py, nodes.py | agents/results_analyst/ | `feature/result-analyst` |
| 4 | RAG Expert: prompts.py, nodes.py | agents/rag_expert/ | `feature/rag-expert` |
| 5 | Supervisor: graph.py (sub-agent 조합) | agents/chat_supervisor/ | `feature/agent-chat-supervisor` |
| 6 | Server: chat_service.py | services/ | `feature/agent-chat-supervisor` |
| 7 | Server: chat.py (API) | api/routes/ | `feature/agent-chat-supervisor` |
| 8 | Server: main.py 라우터 등록 | main.py | `feature/agent-chat-supervisor` |
| 9 | Client: types, api client | types/, lib/api/ | `feature/func-chatbot` |
| 10 | Client: hooks | hooks/ | `feature/func-chatbot` |
| 11 | Client: ChatPanel.tsx | components/features/draft/ | `feature/func-chatbot` |
| 12 | Client: page.tsx 수정 | app/.../draft/page.tsx | `feature/func-chatbot` |

### 브랜치 전략

```
dev (base)
 ├── feature/agent-chat-supervisor   ← 순서 1~2, 5~8 (Supervisor + API + 서비스)
 ├── feature/result-analyst          ← 순서 3 (Results Analyst sub-agent)
 ├── feature/rag-expert              ← 순서 4 (RAG Expert sub-agent)
 └── feature/func-chatbot            ← 순서 9~12 (Client 전체)
```

- 각 브랜치에서 작업 완료 시 커밋 + 푸시
- 커밋 메시지는 작업 컬럼 내용 사용
- 1번(DB 마이그레이션)은 수동 실행이므로 커밋 없음 → 총 11개 커밋

---

## 5. 검증 방법

### Server 테스트
```bash
cd server && uv run uvicorn app.main:app --reload

# 메시지 전송
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"project_id": "{id}", "message": "이 프로젝트의 대상성 판단 결과를 설명해줘"}'

# 대화 내역 조회
curl http://localhost:8000/api/v1/chat/{project_id}/history

# 대화 리셋
curl -X DELETE http://localhost:8000/api/v1/chat/{project_id}/history
```

### 라우팅 정확도 테스트
| 질문 | 기대 라우팅 |
|------|------------|
| "왜 실증특례를 추천했어?" | results_analyst |
| "대상성 판단 신뢰도가 낮은 이유는?" | results_analyst |
| "임시허가 신청 절차 알려줘" | rag_expert |
| "의료법 관련 조항 찾아줘" | rag_expert |
| "파이썬 코드 짜줘" | decline |

### Client 테스트
1. Draft 페이지 -> 채팅 아이콘 클릭 -> ChatPanel 표시
2. 프로젝트 분석 결과 질문 -> Results Analyst 응답
3. 규제/법령 질문 -> RAG Expert 응답
4. 관련 없는 질문 -> Decline 응답
5. 리셋 -> 모달 확인 -> 대화 초기화
6. 새로고침 -> 대화 내역 유지
