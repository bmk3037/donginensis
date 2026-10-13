"""프로젝트 폴더 구조, YAML 로드, {{변수}} 치환과 금액·날짜 표기."""
from __future__ import annotations

import datetime as dt
import glob
import os
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent          # _src/grant
PROJECTS = ROOT / 'projects'                           # git 에 올라가지 않음 (.gitignore)
FONTS = ROOT.parent / 'profile' / 'fonts'              # Pretendard (PDF 변환용)

SUBDIRS = ['input/plan', 'input/forms', 'input/notice', 'evidence', 'fill', 'docs', 'work', 'output']

CHECK_MARK = '【확인필요】'


class Project:
    def __init__(self, slug: str):
        self.slug = slug
        self.dir = Path(slug) if os.sep in slug or Path(slug).is_absolute() else PROJECTS / slug
        if not self.dir.exists():
            raise SystemExit(f'프로젝트가 없습니다: {self.dir}\n  먼저: python3 grant.py new {slug}')

    def path(self, *parts) -> Path:
        return self.dir.joinpath(*parts)

    # ---- data -------------------------------------------------------------------------
    def data(self) -> dict:
        p = self.path('project.yaml')
        if not p.exists():
            return {}
        return yaml.safe_load(p.read_text(encoding='utf-8')) or {}

    def evidence_files(self, eid: str) -> list[Path]:
        """E01 → evidence/E01_*.*, evidence/E01/*, evidence/E01*/** (이미지·문서 모두)"""
        ev = self.path('evidence')
        hits = set()
        for pat in (f'{eid}_*', f'{eid}.*', f'{eid} *', f'{eid}/**/*', f'{eid}_*/**/*'):
            for f in glob.glob(str(ev / pat), recursive=True):
                if os.path.isfile(f) and not os.path.basename(f).startswith('.'):
                    hits.add(Path(f))
        return sorted(hits)

    def resolve_files(self, pattern: str) -> list[Path]:
        p = pattern if os.path.isabs(pattern) else str(self.dir / pattern)
        return sorted(Path(f) for f in glob.glob(p, recursive=True) if os.path.isfile(f))


def create(slug: str) -> Path:
    d = PROJECTS / slug
    for s in SUBDIRS:
        (d / s).mkdir(parents=True, exist_ok=True)
    tpl = d / 'project.yaml'
    if not tpl.exists():
        tpl.write_text(PROJECT_TEMPLATE, encoding='utf-8')
    return d


PROJECT_TEMPLATE = """\
# 사업계획서·공고문을 읽고 채운다. 모르는 값은 【확인필요】로 남긴다(지어내지 않음).
사업:
  사업명: 【확인필요】
  과제명: 【확인필요】
  주관기관: 【확인필요】
  협약번호: 【확인필요】
  사업기간: {시작: 【확인필요】, 종료: 【확인필요】}
  사업비: {정부지원금: 0, 자부담_현금: 0, 자부담_현물: 0, 총사업비: 0}
기업:
  기업명: 【확인필요】
  대표자: 【확인필요】
  사업자등록번호: 【확인필요】
  주소: 【확인필요】
  담당자: 【확인필요】
  연락처: 【확인필요】
청구:
  청구일: 【확인필요】
  청구금액: 0
  계좌: {은행: 【확인필요】, 계좌번호: 【확인필요】, 예금주: 【확인필요】}
과제목록: []
#  - id: T1
#    이름: ...
#    목표: ...
#    내용: ...
#    성과지표: [{지표: ..., 목표: ..., 단위: ..., 실적: null, 증빙: [E01]}]
증빙목록: []
#  - {id: E01, 항목: 설치 완료 사진, 관련과제: T1, 종류: 사진, 필수: true, 담당: ..., 설명: 정면·측면·명판 각 1장 이상}
서류목록: []
#  - {id: D01, 서류명: 대금청구서, 작성: 자동, 양식: input/forms/대금청구서.hwp, 필요증빙: []}
#    작성: 자동(양식 채움) | 보고서(자체 작성) | 자료필요(증빙 첨부) | 외부발급(세금계산서 등)
"""


# ---- {{변수|필터}} 치환 ---------------------------------------------------------------------

_VAR = re.compile(r'\{\{\s*([^}|]+?)\s*(?:\|\s*([^}]+?)\s*)?\}\}')


def lookup(data: dict, dotted: str):
    cur = data
    for key in dotted.split('.'):
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        elif isinstance(cur, list) and key.isdigit() and int(key) < len(cur):
            cur = cur[int(key)]
        else:
            return None
    return cur


def render(value, data: dict):
    """문자열 안의 {{a.b|필터}} 를 project.yaml 값으로 바꾼다. 값이 없으면 【확인필요:a.b】."""
    if isinstance(value, list):
        return [render(v, data) for v in value]
    if isinstance(value, dict):
        return {k: render(v, data) for k, v in value.items()}
    if not isinstance(value, str):
        return value

    def sub(m):
        v = lookup(data, m.group(1))
        if v is None:
            return f'【확인필요:{m.group(1)}】'
        return apply_filter(v, m.group(2))
    return _VAR.sub(sub, value)


def apply_filter(v, f: str | None) -> str:
    if not f:
        return fmt_date(v) if isinstance(v, (dt.date, dt.datetime)) else str(v)
    f = f.strip()
    if f == '원':
        return f'{to_int(v):,}원'
    if f == '콤마':
        return f'{to_int(v):,}'
    if f == '한글금액':
        return f'금 {hangul_amount(to_int(v))}원정'
    if f == '청구금액':                 # 금 일천이백만원정 (₩12,000,000)
        n = to_int(v)
        return f'금 {hangul_amount(n)}원정 (₩{n:,})'
    if f.startswith('날짜'):            # 날짜 / 날짜:%Y년 %m월 %d일
        fmt = f.split(':', 1)[1] if ':' in f else None
        return fmt_date(v, fmt)
    raise ValueError(f'알 수 없는 필터: {f}')


def to_int(v) -> int:
    if isinstance(v, (int, float)):
        return int(round(v))
    s = re.sub(r'[^\d\-]', '', str(v))
    if not s:
        raise ValueError(f'금액이 아닙니다: {v!r}')
    return int(s)


def to_date(v) -> dt.date | None:
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    m = re.match(r'\s*(\d{4})\D+(\d{1,2})\D+(\d{1,2})', str(v or ''))
    return dt.date(int(m[1]), int(m[2]), int(m[3])) if m else None


def fmt_date(v, fmt: str | None = None) -> str:
    d = to_date(v)
    if not d:
        return str(v)
    if fmt:
        return d.strftime(fmt).replace(' 0', ' ')
    return f'{d.year}. {d.month}. {d.day}.'


_DIGITS = '영일이삼사오육칠팔구'
_SMALL = ['', '십', '백', '천']
_BIG = ['', '만', '억', '조']


def hangul_amount(n: int) -> str:
    """12000000 → 일천이백만 (공문서 금액 표기, '일'을 생략하지 않음)"""
    if n == 0:
        return '영'
    out, group = [], 0
    while n > 0:
        n, chunk = divmod(n, 10000)
        if chunk:
            s = ''
            for i in range(3, -1, -1):
                d = (chunk // 10 ** i) % 10
                if d:
                    s += _DIGITS[d] + _SMALL[i]
            out.append(s + _BIG[group])
        group += 1
    return ''.join(reversed(out))
