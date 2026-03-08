"""Results Analyst 도구 — Supabase 데이터 전처리

기존 서비스 함수를 재활용하여 LLM이 읽기 좋은 텍스트로 변환합니다.
"""

import logging

from app.services.eligibility_service import get_eligibility_result
from app.services.track_service import get_track_result

logger = logging.getLogger(__name__)


def fetch_project_summary(project_id: str) -> str:
    """projects 테이블에서 기본 정보 + canonical 구조를 읽기 좋은 텍스트로 변환"""
    from app.core.config import supabase

    result = (
        supabase.table("projects")
        .select("service_name, track, current_step, status, canonical")
        .eq("id", project_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        return "프로젝트 정보를 찾을 수 없습니다."

    p = result.data
    track_map = {
        "demo": "실증특례",
        "temp_permit": "임시허가",
        "quick_check": "신속확인",
    }
    track_label = track_map.get(p.get("track", ""), p.get("track") or "미정")

    lines = [
        f"- 서비스명: {p.get('service_name', '미입력')}",
        f"- 선택된 트랙: {track_label}",
        f"- 현재 단계: Step {p.get('current_step', '?')}",
    ]

    # Canonical 구조에서 상세 정보 추출
    canonical = p.get("canonical")
    if canonical and isinstance(canonical, dict):
        lines.append("\n## 서비스 상세 정보 (Canonical)")
        lines.extend(_format_canonical(canonical))

    return "\n".join(lines)


def _format_canonical(canonical: dict) -> list[str]:
    """Canonical 구조를 읽기 좋은 텍스트로 변환"""
    lines = []

    # 회사 정보
    company = canonical.get("company", {})
    if company:
        lines.append("\n### 회사 정보")
        if company.get("company_name"):
            lines.append(f"- 회사명: {company['company_name']}")
        if company.get("representative"):
            lines.append(f"- 대표자: {company['representative']}")
        if company.get("business_number"):
            lines.append(f"- 사업자번호: {company['business_number']}")
        if company.get("main_business"):
            lines.append(f"- 주요 사업: {company['main_business']}")

    # 서비스 정보
    service = canonical.get("service", {})
    if service:
        lines.append("\n### 서비스 정보")
        if service.get("service_name"):
            lines.append(f"- 서비스명: {service['service_name']}")
        if service.get("what_action"):
            lines.append(f"- 핵심 행위: {service['what_action']}")
        if service.get("target_users"):
            lines.append(f"- 대상 사용자: {service['target_users']}")
        if service.get("delivery_method"):
            lines.append(f"- 제공 방식: {service['delivery_method']}")
        if service.get("service_description"):
            lines.append(f"- 서비스 설명: {service['service_description']}")

    # 기술 정보
    technology = canonical.get("technology", {})
    if technology:
        lines.append("\n### 기술 정보")
        if technology.get("core_technology"):
            lines.append(f"- 핵심 기술: {technology['core_technology']}")
        innovation = technology.get("innovation_points", [])
        if innovation:
            lines.append("- 혁신 포인트:")
            for ip in innovation:
                lines.append(f"  - {ip}")

    # 규제 정보
    regulatory = canonical.get("regulatory", {})
    if regulatory:
        lines.append("\n### 규제 정보")
        if regulatory.get("governing_agency"):
            lines.append(f"- 소관 부처: {regulatory['governing_agency']}")
        if regulatory.get("expected_permit"):
            lines.append(f"- 예상 허가: {regulatory['expected_permit']}")
        issues = regulatory.get("regulatory_issues", [])
        if issues:
            lines.append("- 규제 이슈:")
            for issue in issues:
                if isinstance(issue, dict):
                    lines.append(f"  - {issue.get('summary', str(issue))}")
                else:
                    lines.append(f"  - {issue}")

    # 사업 계획
    plan = canonical.get("project_plan", {})
    if plan:
        lines.append("\n### 사업 계획")
        if plan.get("projectName"):
            lines.append(f"- 사업명: {plan['projectName']}")
        if plan.get("startDate"):
            lines.append(f"- 시작일: {plan['startDate']}")
        if plan.get("endDate"):
            lines.append(f"- 종료일: {plan['endDate']}")
        if plan.get("durationMonths"):
            lines.append(f"- 기간: {plan['durationMonths']}개월")

    return lines


def fetch_eligibility_summary(project_id: str) -> str:
    """eligibility_results를 LLM이 읽기 좋은 한국어 텍스트로 변환"""
    data = get_eligibility_result(project_id)
    if not data:
        return "대상성 판단 결과가 아직 없습니다."

    label_map = {
        "required": "규제 샌드박스 신청 필요",
        "not_required": "규제 샌드박스 신청 불필요",
        "unclear": "판단 불확실",
    }

    lines = [
        "## 대상성 판단 결과",
        f"- 판정: {label_map.get(data.get('eligibility_label', ''), data.get('eligibility_label', '알 수 없음'))}",
        f"- 신뢰도: {data.get('confidence_score', 0):.0%}",
    ]

    if data.get("result_summary"):
        lines.append(f"- AI 분석 요약: {data['result_summary']}")

    evidence = data.get("evidence_data", {})
    if evidence.get("judgment_summary"):
        lines.append("\n### 판단 근거")
        for js in evidence["judgment_summary"]:
            criterion = js.get("criterion", "")
            analysis = js.get("analysis", "")
            lines.append(f"- **{criterion}**: {analysis}")

    risks = data.get("direct_launch_risks", [])
    if risks:
        lines.append("\n### 바로 출시 시 리스크")
        for risk in risks:
            lines.append(f"- {risk.get('description', '')}")

    return "\n".join(lines)


def fetch_track_summary(project_id: str) -> str:
    """track_results를 트랙 비교/추천 요약 텍스트로 변환"""
    data = get_track_result(project_id)
    if not data:
        return "트랙 추천 결과가 아직 없습니다."

    track_map = {
        "demo": "실증특례",
        "temp_permit": "임시허가",
        "quick_check": "신속확인",
    }

    lines = [
        "## 트랙 추천 결과",
        f"- AI 추천 트랙: {track_map.get(data.get('recommended_track', ''), data.get('recommended_track', '알 수 없음'))}",
        f"- 신뢰도: {data.get('confidence_score', 0)}점",
    ]

    if data.get("result_summary"):
        lines.append(f"- 분석 요약: {data['result_summary']}")

    comparison = data.get("track_comparison", {})
    if comparison:
        lines.append("\n### 트랙별 비교")
        for track_key, info in comparison.items():
            label = track_map.get(track_key, track_key)
            if isinstance(info, dict):
                score = info.get("score", "?")
                reasons = info.get("reasons", [])
                lines.append(f"\n**{label}** (점수: {score})")
                for reason in reasons[:3]:
                    lines.append(f"  - {reason}")

    return "\n".join(lines)


def fetch_all_project_data(project_id: str) -> str:
    """프로젝트의 모든 분석 결과를 하나의 텍스트로 합산"""
    sections = [
        fetch_project_summary(project_id),
        fetch_eligibility_summary(project_id),
        fetch_track_summary(project_id),
    ]
    return "\n\n".join(sections)
