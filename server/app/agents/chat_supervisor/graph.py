"""Chat Supervisor LangGraph 워크플로우

Supervisor가 sub-agent 노드들을 조합하여 하나의 StateGraph로 구성합니다.

워크플로우:
  START → supervisor → (조건부 라우팅) → results_analyst → END
                                       → rag_expert     → END
                                       → decline        → END
"""

import logging

from langgraph.graph import END, StateGraph

from app.agents.rag_expert.nodes import rag_expert_node
from app.agents.results_analyst.nodes import results_analyst_node

from .nodes import decline_node, supervisor_node
from .state import ChatSupervisorState

logger = logging.getLogger(__name__)


def _route_decision(state: ChatSupervisorState) -> str:
    """Supervisor의 라우팅 결정에 따라 다음 노드 선택"""
    return state.get("route", "decline")


def create_chat_supervisor_graph() -> StateGraph:
    """Chat Supervisor 그래프 생성"""
    graph = StateGraph(ChatSupervisorState)

    # 노드 추가
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("results_analyst", results_analyst_node)
    graph.add_node("rag_expert", rag_expert_node)
    graph.add_node("decline", decline_node)

    # 엣지 연결
    graph.set_entry_point("supervisor")

    # Supervisor → 조건부 라우팅
    graph.add_conditional_edges(
        "supervisor",
        _route_decision,
        {
            "results_analyst": "results_analyst",
            "rag_expert": "rag_expert",
            "decline": "decline",
        },
    )

    # Sub-agent → END
    graph.add_edge("results_analyst", END)
    graph.add_edge("rag_expert", END)
    graph.add_edge("decline", END)

    return graph


def compile_chat_supervisor_graph():
    """컴파일된 그래프 반환"""
    graph = create_chat_supervisor_graph()
    return graph.compile()


# 컴파일된 그래프 싱글톤 인스턴스
chat_supervisor_graph = compile_chat_supervisor_graph()


async def run_chat(
    project_id: str,
    user_message: str,
    chat_history: list[dict],
) -> dict:
    """채팅 실행

    Args:
        project_id: 프로젝트 UUID
        user_message: 사용자 메시지
        chat_history: 최근 대화 내역

    Returns:
        dict: assistant_message, agent_used
    """
    initial_state: ChatSupervisorState = {
        "project_id": project_id,
        "user_message": user_message,
        "chat_history": chat_history[-10:],  # 최근 10개만
        "route": "",
        "rewritten_query": "",
        "tool_results": "",
        "assistant_message": "",
        "agent_used": "",
    }

    result = await chat_supervisor_graph.ainvoke(
        initial_state,
        config={"recursion_limit": 5},
    )

    return {
        "assistant_message": result.get("assistant_message", ""),
        "agent_used": result.get("agent_used", ""),
    }
