"""Chat API 라우터

Supervisor Agent 기반 AI 상담 챗봇 엔드포인트.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.agents.chat_supervisor.graph import run_chat
from app.api.deps import AuthUser, get_auth_user
from app.services.chat_service import (
    append_chat_messages,
    clear_chat_history,
    get_chat_history,
)
from app.services.project_service import get_authorized_project

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


# ===============================
# 스키마
# ===============================


class ChatRequest(BaseModel):
    """채팅 메시지 전송 요청"""

    project_id: str
    message: str


class ChatResponse(BaseModel):
    """채팅 메시지 응답"""

    role: str = "assistant"
    content: str
    agent: str
    timestamp: str


class ChatMessage(BaseModel):
    """채팅 메시지"""

    role: str
    content: str
    timestamp: str
    agent: str | None = None


# ===============================
# 엔드포인트
# ===============================


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="채팅 메시지 전송",
    description="Supervisor Agent가 질문을 분석하여 적절한 sub-agent에게 위임합니다.",
)
async def send_chat_message(
    request: ChatRequest,
    auth_user: AuthUser = Depends(get_auth_user),
) -> ChatResponse:
    """채팅 메시지 전송 및 AI 응답 반환"""
    project_id = request.project_id

    # 프로젝트 조회 + 권한 확인
    get_authorized_project(project_id, auth_user)

    # 기존 대화 내역 조회
    chat_history = get_chat_history(project_id)

    # Supervisor Agent 실행
    try:
        result = await run_chat(
            project_id=project_id,
            user_message=request.message,
            chat_history=chat_history,
        )
    except Exception as e:
        logger.error(f"[Chat] Agent 실행 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 응답 생성 중 오류가 발생했습니다.",
        )

    now = datetime.now(timezone.utc).isoformat()

    # 대화 내역에 유저 메시지 + 어시스턴트 메시지 저장
    new_messages = [
        {"role": "user", "content": request.message, "timestamp": now},
        {
            "role": "assistant",
            "content": result["assistant_message"],
            "timestamp": now,
            "agent": result["agent_used"],
        },
    ]
    append_chat_messages(project_id, new_messages)

    return ChatResponse(
        content=result["assistant_message"],
        agent=result["agent_used"],
        timestamp=now,
    )


@router.get(
    "/{project_id}/history",
    response_model=list[ChatMessage],
    summary="대화 내역 조회",
)
async def get_history(
    project_id: str,
    auth_user: AuthUser = Depends(get_auth_user),
) -> list[ChatMessage]:
    """프로젝트의 대화 내역을 반환합니다."""
    get_authorized_project(project_id, auth_user)
    history = get_chat_history(project_id)
    return [ChatMessage(**msg) for msg in history]


@router.delete(
    "/{project_id}/history",
    summary="대화 내역 리셋",
)
async def reset_history(
    project_id: str,
    auth_user: AuthUser = Depends(get_auth_user),
) -> dict:
    """프로젝트의 대화 내역을 초기화합니다."""
    get_authorized_project(project_id, auth_user)
    clear_chat_history(project_id)
    return {"success": True}
