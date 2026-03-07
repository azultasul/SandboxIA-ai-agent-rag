#!/usr/bin/env python3
"""
테스트 계정 생성 스크립트

Supabase Admin API를 사용하여 테스트 계정을 생성합니다.
실행 전 .env 파일에 SUPABASE_URL, SUPABASE_SERVICE_KEY가 설정되어 있어야 합니다.

Usage:
    uv run python scripts/create_test_user.py
"""

import os
import sys

# 프로젝트 루트를 PYTHONPATH에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# 테스트 계정 정보
TEST_EMAIL = "test@sandboxia.com"
TEST_PASSWORD = "test1234!"
TEST_NAME = "테스트 사용자"


def create_test_user():
    """Supabase에 테스트 계정을 생성합니다."""

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_key:
        print("Error: SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다.")
        print("서버의 .env 파일을 확인해주세요.")
        sys.exit(1)

    # Service Role Key로 Admin 클라이언트 생성
    supabase = create_client(supabase_url, service_key)

    print(f"테스트 계정 생성 중...")
    print(f"  이메일: {TEST_EMAIL}")
    print(f"  비밀번호: {TEST_PASSWORD}")
    print()

    try:
        # 1. Auth에 사용자 생성 (Admin API)
        user_response = supabase.auth.admin.create_user({
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "email_confirm": True,  # 이메일 인증 스킵
        })

        user_id = user_response.user.id
        print(f"Auth 사용자 생성 완료: {user_id}")

        # 2. public.users 테이블에 프로필 생성
        profile_response = supabase.table("users").insert({
            "id": user_id,
            "email": TEST_EMAIL,
            "name": TEST_NAME,
            "status": "ACTIVE",
        }).execute()

        print(f"프로필 생성 완료")
        print()
        print("=" * 50)
        print("테스트 계정 생성이 완료되었습니다!")
        print()
        print("클라이언트 .env.local에 다음을 추가하세요:")
        print(f"  NEXT_PUBLIC_TEST_USER_EMAIL={TEST_EMAIL}")
        print(f"  NEXT_PUBLIC_TEST_USER_PASSWORD={TEST_PASSWORD}")
        print("=" * 50)

    except Exception as e:
        error_msg = str(e)

        # 이미 존재하는 사용자인 경우
        if "already been registered" in error_msg or "duplicate key" in error_msg.lower():
            print(f"이미 존재하는 계정입니다: {TEST_EMAIL}")
            print("기존 계정을 사용하거나 삭제 후 다시 시도하세요.")
        else:
            print(f"오류 발생: {e}")
            sys.exit(1)


if __name__ == "__main__":
    create_test_user()
