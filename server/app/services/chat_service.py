"""Chat Service — chat_history CRUD

projects 테이블의 chat_history JSONB 컬럼을 관리합니다.
"""

import logging

from app.core.config import supabase

logger = logging.getLogger(__name__)


def get_chat_history(project_id: str) -> list[dict]:
    """대화 내역 조회

    Args:
        project_id: 프로젝트 UUID

    Returns:
        chat_history 메시지 목록
    """
    result = (
        supabase.table("projects")
        .select("chat_history")
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        return []

    return result.data.get("chat_history") or []


def append_chat_messages(project_id: str, messages: list[dict]) -> None:
    """대화 내역에 메시지 추가

    기존 chat_history에 새 메시지들을 append합니다.

    Args:
        project_id: 프로젝트 UUID
        messages: 추가할 메시지 목록
    """
    current_history = get_chat_history(project_id)
    current_history.extend(messages)

    supabase.table("projects").update(
        {"chat_history": current_history}
    ).eq("id", project_id).execute()


def clear_chat_history(project_id: str) -> None:
    """대화 내역 초기화

    Args:
        project_id: 프로젝트 UUID
    """
    supabase.table("projects").update(
        {"chat_history": []}
    ).eq("id", project_id).execute()
