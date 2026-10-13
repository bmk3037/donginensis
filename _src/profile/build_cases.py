"""영업용 레퍼런스 사례집 (1사례 1쪽 · 16:9 · 영업용 회사소개서와 같은 디자인)

사용법
  python3 build_cases.py                 # 고객사 이름을 가린 판 → out/cases_KR_anon.pdf (+ 빈 양식 1쪽)
  python3 build_cases.py --named         # 고객사 실명 판 → out/cases_KR_named.pdf (고객 동의 후 사용)
  python3 build_cases.py --named --png   # 확인용 PNG도 저장

홈페이지 자료실에는 올리지 않고 영업 담당자가 직접 보내는 자료입니다.
'□' 표시는 회사에서 확인 후 기입하는 숫자입니다(확인되면 CASES의 해당 값을 바꾸고 다시 생성).
"""
import asyncio, os, argparse
from build_sales import CSS, lis, X, I, LOGO, render

ROOT = os.path.dirname(os.path.abspath(__file__))
FOOT = 'DONG-IN ENSIS · 레퍼런스 사례 · 영업용'
EXTRA = """
.cs{display:flex;gap:26px;margin-top:24px;align-items:stretch}
.cs .ph-col{width:470px;display:flex;flex-direction:column;gap:12px;flex:none}
.cs .ph-col img{width:100%;object-fit:cover;border-radius:12px;display:block}
.cs .ph-col .cap{margin-top:-4px}
.cs .tx{flex:1;display:flex;flex-direction:column;gap:14px;min-width:0}
.kv{width:100%;border-collapse:collapse;font-size:13.5px}
.kv td{padding:7px 12px;border-bottom:1px solid #E2E7EE;line-height:1.45;vertical-align:top}
.kv td.k{width:112px;font-weight:700;color:#1857A5;background:#F5F7FA}
.sec{display:flex;gap:14px}
.sec > div{flex:1;border:1px solid #E2E7EE;border-radius:12px;padding:12px 16px 10px;background:#fff}
.sec h3{font-size:14px;color:#1857A5;margin:0 0 6px;display:flex;align-items:center;gap:8px}
.sec h3 i{font-style:normal;font-size:11px;font-weight:800;color:#fff;background:#E83E30;border-radius:4px;padding:2px 6px;letter-spacing:.5px}
.sec li{font-size:13px;line-height:1.5;margin-bottom:4px}
.res{display:flex;gap:12px}
.res div{flex:1;background:#0F3F7E;color:#fff;border-radius:12px;padding:12px 16px}
.res b{display:block;font-size:24px;font-weight:800;color:#8FC1FF;letter-spacing:-.5px;line-height:1.15}
.res span{display:block;font-size:12px;color:#D6E4F5;margin-top:4px;line-height:1.4}
.res .q{color:#FFD9D4}
.ribbon{position:absolute;left:14px;top:14px;background:#E83E30;color:#fff;font-size:12.5px;font-weight:800;padding:5px 10px;border-radius:6px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.tags span{font-size:12px;font-weight:600;color:#0F3F7E;background:#EAF1FA;padding:4px 10px;border-radius:20px}
.blank{border:1px dashed #AEB9C8;border-radius:12px;padding:12px 16px;color:#8A94A6;font-size:13px;line-height:1.5}
"""


def page(eye, title, body, note=None):
    n = f'<div class="note">{note}</div>' if note else ''
    return f'<div class="page"><img class="logo" src="{LOGO}"><div class="eyebrow">{eye}</div><h1>{title}</h1>{body}{n}<div class="foot"><span>{FOOT}</span><span>{{num}}</span></div></div>'


def kv(rows): return '<table class="kv">' + ''.join(f'<tr><td class="k">{k}</td><td>{v}</td></tr>' for k, v in rows) + '</table>'
def sec(no, h, items): return f'<div><h3><i>{no}</i>{h}</h3>{lis(items)}</div>'
def res(items): return '<div class="res">' + ''.join(f'<div><b>{b}</b><span>{s}</span></div>' for b, s in items) + '</div>'


# ---------------- 사례 데이터 ----------------
# named: 고객 동의 후 실명판 / anon: 이름·로고·식별 사진을 가린 판
CASES = [
    dict(
        key='lh2', eye='Reference Case 01 · Hydrogen Station', badge='2024 · 액화수소 · 상용 운영',
        title=dict(named='액화수소충전소 전기제어·전원설비,<br><b>설계부터 운영 실증까지 한 회사가 맡았습니다</b>',
                   anon='액화수소충전소 전기제어·전원설비,<br><b>설계부터 운영 실증까지 한 회사가 맡았습니다</b>'),
        photos=dict(named=[(X('ref_ske_station.jpg'), 232, 'SK E&amp;S 액화수소충전소 전경 (현장 사진)'),
                           (X('ref_ske_panel.jpg'), 196, '충전소 제어반실 — PDP · PLC 제어반 · UPS · VFD (현장 사진)')],
                    anon=[(f'{ROOT}/out/_ske_crop.jpg', 232, '액화수소충전소 충전 설비 (현장 사진)'),
                          (X('ref_ske_panel.jpg'), 196, '충전소 제어반실 — PDP · PLC 제어반 · UPS · VFD (현장 사진)')]),
        client=dict(named=[('고객 · 현장', 'SK E&amp;S 액화수소충전소 (니키소코리아 협업) · 2024년 공급 · 상용 충전소'),
                           ('설비', '액화수소 저장탱크 · 기화기 · 펌프 · 열매체유 순환장치 · 충전 디스펜서 · 배관 주변 설비'),
                           ('공급 범위', 'PDP(전력배전반) · PLC 제어반 · UPS · VFD 공급, 전력계통 설계·엔지니어링, FAT·현장 시운전')],
                    anon=[('고객 · 현장', '국내 대기업 주도 액화수소충전소 (충전설비 전문기업 협업) · 2024년 공급 · 상용 충전소'),
                          ('설비', '액화수소 저장탱크 · 기화기 · 펌프 · 열매체유 순환장치 · 충전 디스펜서 · 배관 주변 설비'),
                          ('공급 범위', 'PDP(전력배전반) · PLC 제어반 · UPS · VFD 공급, 전력계통 설계·엔지니어링, FAT·현장 시운전')]),
        tags=['PDP', 'PLC 제어반', 'UPS', 'VFD', '전력계통 설계', 'FAT · 시운전', '수소전문기업'],
        issue=['액화수소는 극저온·고압 설비라 전원이 끊기면 제어·감시가 함께 멈춰 안전에 직결됨',
               '저장탱크·기화기·펌프·충전기가 제조사별로 달라 제어·감시를 하나로 묶을 공급사가 필요',
               '국내 상용 액화수소충전소 초기 사례로, 전력·제어를 함께 책임질 엔지니어링 경험이 관건'],
        work=['전력계통 설계부터 PDP·PLC 제어반·UPS·VFD 제작, 공장검사, 현장 시운전까지 단일 공급',
              '정전 시에도 제어·감시 전원을 유지하는 UPS 기반 전원 구성',
              '저장탱크·기화기·펌프·열매체유 순환장치·배관 주변 설비의 운전 제어와 상태감시 통합',
              '충전소 운전 데이터를 D-Hub 클라우드·웹 앱으로 수집·모니터링하는 디지털전환 단계 진행 중'],
        result=[('2024~', '상용 충전소 정상 운영 중'), ('특허 5건', '수소 제어·전력 기술 (등록 2 · 출원 3)'), ('□ 개월', '무고장 연속 운전 (확인 후 기입)')],
        note='※ 수소전문기업 · 관련 특허: 제10-2964564호 「수소충전용 모듈러 인출식 VFD 판넬」 등 · 보도: 에너지경제신문 2024.06.05',
    ),
    dict(
        key='ship', eye='Reference Case 02 · Green Ship', badge='2023 취항 · 하이브리드 추진',
        title=dict(named='친환경 하이브리드 병원선,<br><b>추진시스템과 통합제어·감시시스템을 공급했습니다</b>',
                   anon='친환경 하이브리드 관공선,<br><b>추진시스템과 통합제어·감시시스템을 공급했습니다</b>'),
        photos=dict(named=[(I('p39_04_photo.jpg'), 232, '충남병원선 (G/T 330톤급) 건조 현장 (현장 사진)'),
                           (I('p39_05_photo.jpg'), 196, '충남병원선 기관실 — 추진 · 보기 설비 통합제어반 (현장 사진)')],
                    anon=[(I('p39_05_photo.jpg'), 232, '선박 기관실 — 추진 · 보기 설비 통합제어반 (현장 사진)'),
                          (I('p40_04_photo.jpg'), 196, '통합제어·감시 제어반 공장검사 (현장 사진)')]),
        client=dict(named=[('고객 · 현장', '충청남도 충남병원선 · G/T 330톤급 · 2023년 8월 취항 (보령 대천항)'),
                           ('선박 제원', '전장 49.9m · 폭 9m · 최대 20노트 · 항속 560마일 · 승선 50명 · 섬 지역 의료 순회'),
                           ('공급 범위', '디젤엔진 + 전기모터 하이브리드 추진시스템 · 통합제어·감시시스템 · 시운전')],
                    anon=[('고객 · 현장', '광역지자체 발주 병원선 · G/T 330톤급 · 2023년 취항'),
                          ('선박 제원', '전장 약 50m · 최대 20노트 · 항속 560마일 · 승선 50명 · 섬 지역 의료 순회'),
                          ('공급 범위', '디젤엔진 + 전기모터 하이브리드 추진시스템 · 통합제어·감시시스템 · 시운전')]),
        tags=['하이브리드 추진', '전기모터', '통합제어', '감시시스템', '시운전', '친환경 선박'],
        issue=['섬 지역 저수심·근거리 운항이 많아 디젤 단독 운항은 연료 소모와 배출이 큼',
               '디젤엔진과 전기모터를 운항 상황에 따라 안정적으로 전환하는 제어가 핵심',
               '관공선 특성상 운항 신뢰성과 유지관리 편의성을 함께 확보해야 함'],
        work=['저속·근거리 운항은 전기모터, 고속·장거리는 디젤엔진을 쓰는 전기 복합 추진 제어 구현',
              '추진 · 보기 설비를 한 화면에서 제어·감시하는 통합제어·감시시스템 설계·제작',
              '경남청정호(120톤급 환경정화선, 2023.04 취항)에 이은 두 번째 하이브리드 관공선 적용',
              '공장검사(FAT)와 현장 시운전, 취항 후 운항 지원'],
        result=[('2023.08', '취항 · 운항 중'), ('CO₂ □ %↓', '디젤 단독 대비 배출 저감 (확인 후 기입)'), ('표창', '친환경 선박 건조 공로 (취항식)')],
        note='※ 보도: 국제뉴스 2023.08.30 · 후속: 해양수산부 하이브리드 시범어선 통합제어 적용(2026), 안전기반 소형 수소추진선박 국가 R&amp;D(2022~26)',
    ),
]


def case(c, mode):
    ph = ''.join(f'<div style="position:relative"><img src="{s}" style="height:{h}px">' + (f'<span class="ribbon">{c["badge"]}</span>' if i == 0 else '') + f'</div><div class="cap">{cap}</div>' for i, (s, h, cap) in enumerate(c['photos'][mode]))
    tx = (kv(c['client'][mode]) + '<div class="tags">' + ''.join(f'<span>{t}</span>' for t in c['tags']) + '</div>'
          + '<div class="sec">' + sec('과제', '현장의 문제', c['issue']) + sec('수행', '동인엔시스가 한 일', c['work']) + '</div>'
          + res(c['result']))
    return page(c['eye'], c['title'][mode], f'<div class="cs"><div class="ph-col">{ph}</div><div class="tx">{tx}</div></div>', c['note'])


def template():
    blank = lambda h: f'<div class="blank" style="height:{h}px">{"현장 사진 자리 (실제 사진 1장)"}</div>'
    tx = (kv([('고객 · 현장', '고객사 · 현장명 · 공급 연도 · 설비 규모'), ('설비', '대상 설비 · 용량 · 수량'), ('공급 범위', '제어반 종류 · 설계/제작/시운전 범위')])
          + '<div class="sec">' + sec('과제', '현장의 문제', ['도입 전에 무엇이 문제였나 (2~3줄)', '왜 동인엔시스를 선택했나']) + sec('수행', '동인엔시스가 한 일', ['설계 · 제작 · 시운전 중 수행 범위', '다른 공급사와 다른 점', '납기 · 현장 대응']) + '</div>'
          + res([('숫자', '납기 · 규모 (예: 제어반 12면)'), ('숫자', '성과 (예: 비가동 30%↓)'), ('숫자', '운영 (예: 무고장 18개월)')]))
    return page('Reference Case · 양식', '사례 제목 — 고객이 얻은 것을<br><b>한 문장으로 씁니다</b>',
        f'<div class="cs"><div class="ph-col">{blank(232)}{blank(196)}</div><div class="tx">{tx}</div></div>',
        '※ 양식: 한 사례 한 쪽 · 실제 현장 사진 · 숫자 3개 · 고객사 실명은 동의 후 표기')


def build(mode):
    P = [case(c, mode) for c in CASES] + ([template()] if mode == 'anon' else [])
    P = [p.replace('{num}', f'{i + 1:02d}') for i, p in enumerate(P)]
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}{EXTRA}</style></head><body>{"".join(P)}</body></html>', len(P)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--named', action='store_true', help='고객사 실명 판')
    ap.add_argument('--png', action='store_true')
    a = ap.parse_args()
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    mode = 'named' if a.named else 'anon'
    if mode == 'anon':  # 익명판 충전소 사진: 간판이 보이지 않게 하단만 잘라 씀
        from PIL import Image
        Image.open(X('ref_ske_station.jpg')).crop((0, 340, 760, 703)).save(f'{ROOT}/out/_ske_crop.jpg', quality=88)
    h, n = build(mode)
    asyncio.run(render(f'cases_KR_{mode}', h, a.png)); print('done', n, 'pages')
