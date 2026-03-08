"""Results Analyst 노드 — 프로젝트 분석 결과 조회 및 설명"""

import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.core.llm import get_fast_llm

from .prompts import RESULTS_ANALYST_SYSTEM_PROMPT
from .tools import fetch_all_project_data

logger = logging.getLogger(__name__)


async def results_analyst_node(state: dict) -> dict:
    """프로젝트 분석 결과를 조회하여 사용자 질문에 답변

    - Supabase에서 대상성/트랙 결과를 전처리된 텍스트로 가져옴
    - gpt-4o-mini로 데이터 기반 설명 생성
    - max_tokens=1024
    """
    project_id = state["project_id"]
    query = state.get("rewritten_query", state["user_message"])

    # Supabase에서 프로젝트 데이터 조회 및 전처리
    project_data = fetch_all_project_data(project_id)

    # LLM으로 답변 생성
    llm = get_fast_llm()
    system_prompt = RESULTS_ANALYST_SYSTEM_PROMPT.format(project_data=project_data)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=query),
    ]

    try:
        response = await llm.bind(max_tokens=1024).ainvoke(messages)
        assistant_message = response.content
    except Exception as e:
        logger.error(f"[ResultsAnalyst] 응답 생성 실패: {e}")
        assistant_message = "분석 결과를 설명하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."

    return {
        "tool_results": project_data,
        "assistant_message": assistant_message,
        "agent_used": "results_analyst",
    }
