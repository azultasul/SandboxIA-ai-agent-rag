"""Chat Supervisor 노드 — 라우팅 분류 + decline 처리"""

import logging
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.llm import get_fast_llm

from .prompts import DECLINE_MESSAGE, SUPERVISOR_SYSTEM_PROMPT
from .state import ChatSupervisorState

logger = logging.getLogger(__name__)


class SupervisorDecision(BaseModel):
    """Supervisor 라우팅 결정 스키마"""

    route: Literal["results_analyst", "rag_expert", "decline"] = Field(
        description="위임할 sub-agent 이름"
    )
    rewritten_query: str = Field(
        default="",
        description="sub-agent가 이해하기 쉽도록 재작성한 쿼리",
    )


async def supervisor_node(state: ChatSupervisorState) -> dict:
    """사용자 질문을 분석하여 적절한 sub-agent로 라우팅

    - gpt-4o-mini로 분류 (비용 최소화)
    - with_structured_output으로 route + rewritten_query 추출
    - chat_history 최근 10개를 컨텍스트로 포함
    """
    llm = get_fast_llm().with_structured_output(SupervisorDecision)

    # 대화 히스토리 컨텍스트 구성
    history_context = ""
    chat_history = state.get("chat_history", [])
    if chat_history:
        history_lines = []
        for msg in chat_history[-10:]:
            role = "사용자" if msg["role"] == "user" else "어시스턴트"
            history_lines.append(f"{role}: {msg['content']}")
        history_context = f"\n\n## 최근 대화 내역\n" + "\n".join(history_lines)

    messages = [
        SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT + history_context),
        HumanMessage(content=state["user_message"]),
    ]

    try:
        decision: SupervisorDecision = await llm.ainvoke(messages)
        logger.info(f"[Supervisor] route={decision.route}, query={decision.rewritten_query[:50]}")
    except Exception as e:
        logger.error(f"[Supervisor] 라우팅 실패, decline으로 폴백: {e}")
        decision = SupervisorDecision(route="decline", rewritten_query="")

    return {
        "route": decision.route,
        "rewritten_query": decision.rewritten_query or state["user_message"],
    }


async def decline_node(state: ChatSupervisorState) -> dict:
    """범위 밖 질문에 대한 거절 응답 (LLM 호출 없음)"""
    return {
        "assistant_message": DECLINE_MESSAGE,
        "agent_used": "decline",
    }
