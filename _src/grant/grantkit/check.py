"""제출 전 점검: 빠진 자료, 확인 안 된 값, 금액 합계, 사업기간 밖 사진."""
from __future__ import annotations

import json

from . import media
from .project import CHECK_MARK, Project, lookup, to_date, to_int
from .sheets import evidence_status


def run(project: Project) -> list[tuple[str, str]]:
    """[(level, message)] level: 오류 | 경고 | 정보"""
    out = []
    data = project.data()
    if not data:
        return [('오류', 'project.yaml 이 비어 있습니다')]

    # 1) 확인 안 된 값
    for f in [project.path('project.yaml'), *project.path('fill').glob('*.yaml'), *project.path('docs').glob('*.yaml')]:
        text = f.read_text(encoding='utf-8')
        n = text.count('【확인필요')
        if n:
            out.append(('오류', f'{f.relative_to(project.dir)}: {CHECK_MARK} {n}곳'))

    # 2) 사업비 합계
    money = lookup(data, '사업.사업비') or {}
    try:
        parts = sum(to_int(money.get(k, 0) or 0) for k in ('정부지원금', '자부담_현금', '자부담_현물'))
        total = to_int(money.get('총사업비', 0) or 0)
        if total and parts != total:
            out.append(('오류', f'사업비 합계 불일치: 정부지원금+자부담 {parts:,}원 ≠ 총사업비 {total:,}원'))
        claim = to_int(lookup(data, '청구.청구금액') or 0)
        gov = to_int(money.get('정부지원금', 0) or 0)
        if claim and gov and claim > gov:
            out.append(('오류', f'청구금액 {claim:,}원이 정부지원금 {gov:,}원보다 큽니다'))
    except ValueError as e:
        out.append(('오류', f'금액 형식: {e}'))

    # 3) 증빙
    start = to_date(lookup(data, '사업.사업기간.시작'))
    end = to_date(lookup(data, '사업.사업기간.종료'))
    for e in evidence_status(project):
        if e.get('필수', True) and not e['제출']:
            out.append(('오류', f"필수 자료 미제출: {e['id']} {e.get('항목', '')}"))
        for rel in e['파일']:
            f = project.path('evidence', rel)
            if not media.is_image(f):
                continue
            d, src = media.taken_date(f)
            if d and start and end and not (start <= d <= end):
                out.append(('경고', f'{rel}: 촬영일 {d} 이 사업기간({start}~{end}) 밖입니다'))
            elif not d:
                out.append(('정보', f'{rel}: 촬영일 정보 없음 (메신저로 받은 사진은 EXIF 가 지워짐 — 원본 요청 권장)'))

    # 4) 성과지표 실적
    for t in data.get('과제목록') or []:
        for k in t.get('성과지표') or []:
            if k.get('실적') in (None, ''):
                out.append(('경고', f"{t.get('id')} 성과지표 실적 미입력: {k.get('지표')}"))

    # 5) 양식 채우기 결과
    for log in sorted(project.path('work', 'logs').glob('*.fill.json')):
        r = json.loads(log.read_text(encoding='utf-8'))
        for fail in r.get('실패', []):
            out.append(('오류', f"{r['양식']}: {fail['항목']} — {fail['이유']}"))

    # 6) 문서별 빠진 자료
    ev_ok = {e['id']: e['제출'] for e in evidence_status(project)}
    for d in data.get('서류목록') or []:
        miss = [x for x in d.get('필요증빙') or [] if not ev_ok.get(x)]
        if miss:
            out.append(('오류', f"{d.get('서류명')}: 필요 자료 없음 {', '.join(miss)}"))
        if d.get('작성') == '자동' and d.get('양식') and not project.path(d['양식']).exists():
            out.append(('오류', f"{d.get('서류명')}: 양식 파일 없음 {d['양식']}"))

    if not out:
        out.append(('정보', '점검 통과: 빠진 자료와 확인 안 된 값이 없습니다'))
    order = {'오류': 0, '경고': 1, '정보': 2}
    return sorted(out, key=lambda x: order[x[0]])
