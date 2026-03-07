"""Chat Supervisor 전체 상태 정의

Supervisor와 sub-agent들이 공유하는 통합 상태.
"""

from typing_extensions import TypedDict


class ChatSupervisorState(TypedDict, total=False):
    """Chat Supervisor 에이전트 상태

    Attributes:
        # 입력
        project_id: 프로젝트 UUID
        user_message: 사용자 메시지
        chat_history: 최근 10개 메시지 (컨텍스트용)

        # Supervisor 출력
        route: 라우팅 결정 ("results_analyst" | "rag_expert" | "decline")
        rewritten_query: Supervisor가 재작성한 쿼리

        # Sub-agent 출력
        tool_results: sub-agent가 수집한 데이터 (전처리된 텍스트)
        assistant_message: 최종 응답
        agent_used: 응답 생성한 sub-agent 이름
    """

    # 입력
    project_id: str
    user_message: str
    chat_history: list[dict]

    # Supervisor 출력
    route: str
    rewritten_query: str

    # Sub-agent 출력
    tool_results: str
    assistant_message: str
    agent_used: str
