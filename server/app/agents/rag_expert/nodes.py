"""RAG Expert 노드 — R1/R2/R3 RAG 검색 및 답변 생성"""

import logging
from concurrent.futures import ThreadPoolExecutor

from langchain_core.messages import HumanMessage, SystemMessage

from app.core.llm import get_llm
from app.tools.shared.rag import search_case, search_domain_law, search_regulation

from .prompts import RAG_EXPERT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

RAG_TOP_K = 3  # 채팅용은 적게


def _search_all_rag(query: str) -> str:
    """R1/R2/R3 RAG를 병렬로 검색하여 결과를 텍스트로 합산"""
    results_text = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        future_r1 = executor.submit(search_regulation, query=query, top_k=RAG_TOP_K)
        future_r2 = executor.submit(search_case, query=query, top_k=RAG_TOP_K)
        future_r3 = executor.submit(search_domain_law, query=query, top_k=RAG_TOP_K)

        # R1: 규제제도 & 절차
        try:
            r1_output = future_r1.result(timeout=30)
            if r1_output.results:
                results_text.append("### R1. 규제제도 & 절차")
                for r in r1_output.results:
                    results_text.append(
                        f"- [{r.category_label}] {r.section_title}\n  {r.content[:300]}"
                    )
        except Exception as e:
            logger.warning(f"[RAGExpert] R1 검색 실패: {e}")

        # R2: 승인 사례
        try:
            r2_output = future_r2.result(timeout=30)
            if r2_output.results:
                results_text.append("\n### R2. 승인 사례")
                for r in r2_output.results:
                    results_text.append(
                        f"- [{r.track}] {r.service_name} ({r.company_name})\n  {r.service_description[:300]}"
                    )
        except Exception as e:
            logger.warning(f"[RAGExpert] R2 검색 실패: {e}")

        # R3: 도메인별 법령
        try:
            r3_output = future_r3.result(timeout=30)
            if r3_output.results:
                results_text.append("\n### R3. 관련 법령")
                for r in r3_output.results:
                    results_text.append(
                        f"- {r.citation} ({r.law_name})\n  {r.content[:300]}"
                    )
        except Exception as e:
            logger.warning(f"[RAGExpert] R3 검색 실패: {e}")

    if not results_text:
        return "검색 결과가 없습니다."

    return "\n".join(results_text)


async def rag_expert_node(state: dict) -> dict:
    """RAG 검색 후 규제/법령/사례 관련 질문에 답변

    - R1/R2/R3 병렬 검색 (ThreadPoolExecutor)
    - gpt-4o (설정 모델)로 검색 결과 기반 답변 생성
    - max_tokens=1024, top_k=3
    """
    query = state.get("rewritten_query", state["user_message"])

    # RAG 병렬 검색
    search_results = _search_all_rag(query)

    # LLM으로 답변 생성
    llm = get_llm()
    system_prompt = RAG_EXPERT_SYSTEM_PROMPT.format(search_results=search_results)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=query),
    ]

    try:
        response = await llm.ainvoke(messages, max_tokens=1024)
        assistant_message = response.content
    except Exception as e:
        logger.error(f"[RAGExpert] 응답 생성 실패: {e}")
        assistant_message = "검색 결과를 분석하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."

    return {
        "tool_results": search_results,
        "assistant_message": assistant_message,
        "agent_used": "rag_expert",
    }
