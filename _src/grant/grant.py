#!/usr/bin/env python3
"""지원사업 대금청구·결과보고서 서류 도구.

  python3 grant.py new <프로젝트>          폴더 만들기 (projects/<프로젝트>, git 제외)
  python3 grant.py extract <프로젝트>      사업계획서·공고·양식 → work/text/*.md
  python3 grant.py scan <프로젝트>         양식 빈칸 분석 (한글 양식은 워드로 변환) → work/forms/*.md, fill/*.yaml 초안
  python3 grant.py checklist <프로젝트>    요청자료 체크리스트 → output/요청자료_체크리스트.xlsx
  python3 grant.py status <프로젝트>       받은 자료 / 빠진 자료
  python3 grant.py fill <프로젝트> [명세]   양식 채우기 (fill/*.yaml) → output/
  python3 grant.py build <프로젝트> [명세]  자체 문서 만들기 (docs/*.yaml) → output/*.docx, *.pdf
  python3 grant.py photos <프로젝트>       증빙 사진대지 → output/사진대지.docx, .pdf
  python3 grant.py check <프로젝트>        제출 전 점검
  python3 grant.py pack <프로젝트>         output/ 전체를 zip 으로 묶기
  python3 grant.py export <프로젝트>       브라우저 도구(지원사업 서류 도구)에서 불러올 JSON 만들기

자세한 설명: README.md
"""
import argparse
import sys
import warnings
import zipfile
from pathlib import Path

warnings.filterwarnings('ignore')
sys.path.insert(0, str(Path(__file__).resolve().parent))

from grantkit import build, check, extract, forms, sheets  # noqa: E402
from grantkit.project import Project, create  # noqa: E402


def cmd_new(a):
    d = create(a.project)
    print(f'만들었습니다: {d}')
    print('  input/plan    ← 사업계획서')
    print('  input/notice  ← 공고문·협약서·정산 안내 (제출서류 목록 근거)')
    print('  input/forms   ← 기관 양식 (DOCX/XLSX, 한글 HWP/HWPX 는 워드로 변환해서 채움)')
    print('  evidence      ← 증빙 사진·문서 (E01_*.jpg 처럼 자료 ID로 시작)')


def cmd_extract(a):
    p = Project(a.project)
    res = extract.extract_all([p.path('input', s) for s in ('plan', 'notice', 'forms')], p.path('work', 'text'))
    for src, out, msg in res:
        print(f"  {'✓' if out else '·'} {src.relative_to(p.dir)}  {msg}")
    if not res:
        print('input/ 에 파일이 없습니다')


def cmd_scan(a):
    p = Project(a.project)
    out_dir = p.path('work', 'forms')
    out_dir.mkdir(parents=True, exist_ok=True)
    for f in sorted(p.path('input', 'forms').iterdir()):
        if f.suffix.lower() not in ('.hwp', '.hwpx', '.docx', '.xlsx', '.xlsm') or f.name.startswith(('~$', '.')):
            continue
        try:
            word = forms.as_word(f, p.path('work'))       # 한글 양식은 워드로 변환해서 분석·채움
            r = forms.scan(word)
        except Exception as e:
            print(f'  ✗ {f.name}: {e}')
            continue
        spec = p.path('fill', f.stem + '.yaml')
        existed = spec.exists()
        forms.write_scan(word, r, out_dir / (f.stem + '.md'), spec, f.name)
        n = sum(len(t['후보']) for t in r.get('tables', [])) + sum(len(s['후보']) for s in r.get('sheets', []))
        conv = f' (워드 변환: work/converted/{word.name})' if word != f else ''
        print(f"  ✓ {f.name}{conv}: 빈칸 후보 {n}개 → work/forms/{f.stem}.md" + ('' if existed else f', fill/{f.stem}.yaml 초안'))


def cmd_checklist(a):
    p = Project(a.project)
    print(f'  ✓ {sheets.write_checklist(p).relative_to(p.dir)}')


def cmd_status(a):
    p = Project(a.project)
    rows = sheets.evidence_status(p)
    done = sum(r['제출'] for r in rows)
    print(f'자료 {done}/{len(rows)} 받음')
    for r in rows:
        mark = '✓' if r['제출'] else ('✗' if r.get('필수', True) else '·')
        print(f"  {mark} {r['id']} {r.get('항목', '')}  {len(r['파일'])}개  {r.get('담당', '')}")


def _specs(p, folder, name):
    d = p.path(folder)
    if name:
        f = d / (name if name.endswith('.yaml') else name + '.yaml')
        return [f]
    return sorted(d.glob('*.yaml'))


def cmd_fill(a):
    p = Project(a.project)
    specs = _specs(p, 'fill', a.spec)
    if not specs:
        print('fill/*.yaml 이 없습니다 (scan 먼저)')
    for s in specs:
        r = forms.fill(p, s, pdf=not a.no_pdf)
        print(f"  {'✓' if not r['실패'] else '△'} {s.name}: 적용 {len(r['적용'])}, 실패 {len(r['실패'])} → {', '.join(r['출력'])}")
        for fail in r['실패']:
            print(f"      ✗ {fail['항목']}: {fail['이유']}")
        if r['확인필요값']:
            print(f"      ! 확인필요 값 {len(r['확인필요값'])}개 그대로 들어감")


def cmd_build(a):
    p = Project(a.project)
    specs = _specs(p, 'docs', a.spec)
    if not specs:
        print('docs/*.yaml 이 없습니다')
    for s in specs:
        outs = build.build_doc(p, s, pdf=not a.no_pdf)
        print(f"  ✓ {s.name} → {', '.join(str(o.relative_to(p.dir)) for o in outs)}")


def cmd_photos(a):
    p = Project(a.project)
    outs = build.build_photosheet(p, a.per_row, pdf=not a.no_pdf)
    print(f"  ✓ {', '.join(str(o.relative_to(p.dir)) for o in outs)}")


def cmd_check(a):
    p = Project(a.project)
    res = check.run(p)
    for level, msg in res:
        print(f'  [{level}] {msg}')
    if any(level == '오류' for level, _ in res):
        sys.exit(1)


def cmd_pack(a):
    p = Project(a.project)
    out = p.path(f'{p.dir.name}_제출서류.zip')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(p.path('output').rglob('*')):
            if f.is_file():
                z.write(f, f.relative_to(p.path('output')))
    print(f'  ✓ {out.relative_to(p.dir)}')


def cmd_export(a):
    import datetime as dt
    import json
    p = Project(a.project)
    data = p.data()
    data['_type'] = 'dongin-grant'
    out = p.path('output', f'{p.dir.name}.json')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1,
                              default=lambda v: v.isoformat() if isinstance(v, (dt.date, dt.datetime)) else str(v)),
                   encoding='utf-8')
    print(f'  ✓ {out.relative_to(p.dir)} — 브라우저 도구 01 탭 "불러오기"로 엽니다')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    for name, fn in [('new', cmd_new), ('extract', cmd_extract), ('scan', cmd_scan), ('checklist', cmd_checklist),
                     ('status', cmd_status), ('fill', cmd_fill), ('build', cmd_build), ('photos', cmd_photos),
                     ('check', cmd_check), ('pack', cmd_pack), ('export', cmd_export)]:
        s = sub.add_parser(name)
        s.add_argument('project')
        if name in ('fill', 'build'):
            s.add_argument('spec', nargs='?', help='명세 파일 이름 (없으면 전부)')
        if name in ('fill', 'build', 'photos'):
            s.add_argument('--no-pdf', action='store_true', help='PDF 변환 생략')
        if name == 'photos':
            s.add_argument('--per-row', type=int, default=2)
        s.set_defaults(fn=fn)
    a = ap.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
