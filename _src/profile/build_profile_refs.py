"""회사소개서(국문) 통합본 — 지능형 제어반 소개 + 실적 7장

base/profile_base_KR.pdf(원본 없는 16장: 옛 1~11쪽, 15~19쪽) 사이에 build_sales.py의 실적 페이지 7장을 끼워 23장을 만듭니다.
  1~11  기존 (표지 · 회사 · CEO · 개요 · 연혁 · 세 가지 기반 · 지능형 제어반 · 연결 구조 · 보안 · 적용 분야 · 친환경 선박·수소)
  12~18 실적 (친환경 선박 · LNG FGSS · 에너지 · 플랜트·OEM · 서보·모션 · 주요 납품 실적표 · 고객)
  19~23 기존 (제조기업 · 도입 절차 · IT 협업 · 데이터 · 마무리) — 꼬리말 쪽번호만 고쳐 넣음

사용법
  python3 build_profile_refs.py                 # → ../../files/DONG-IN-ENSIS_Company-Profile_KR.pdf
  python3 build_profile_refs.py 출력경로.pdf
"""
import os, sys, asyncio
import build_sales as bs

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(ROOT, '..', '..'))
BASE = f'{ROOT}/base/profile_base_KR.pdf'   # 옛 1~11쪽 + 15~19쪽 (16장)
OUT = f'{SITE}/files/DONG-IN-ENSIS_Company-Profile_KR.pdf'
HEAD = 11      # base 앞부분 장수 (1~11)
START = 12     # 실적 첫 장 번호
TAIL_OLD = 15  # base 뒷부분 첫 장의 옛 쪽번호

bs.FOOT = 'DONG-IN ENSIS · 회사소개서'  # 기존 소개서와 같은 꼬리말


def customers_profile():
    # 영업용 12종 + 실적 페이지에 나오는 SK에코플랜트 · KSB · GSI = 15종 (5 × 3)
    L = [bs.LG(x) for x in ['atlas.svg', 'bobst.svg', 'hhitm.svg', 'sunbo.png', 'oriental.svg', 'hiair.svg', 'nikkiso.svg',
                            'skens.svg', 'skecoplant.svg', 'kiswire.svg', 'kos.svg', 'ksb.svg', 'gsi.png', 'kte.svg', 'wilo.svg']]
    return bs.page('Customers', '국내외 고객과 함께<br><b>현장을 만들어 왔습니다</b>', '<div class="logos p5">' + ''.join(f'<div><img src="{x}"></div>' for x in L) + '</div>'
        '<div class="row six" style="margin-top:20px">' + bs.STATS6 + '</div>')


def build():
    P = [bs.ref_green(), bs.ref_fgss(), bs.ref_energy(), bs.ref_plant(), bs.ref_servo(), bs.ref_list(), customers_profile()]
    P = [p.replace('{num}', f'{START + i:02d}') for i, p in enumerate(P)]
    extra = '.logos.p5 div{width:244px;height:88px;padding:14px 20px} .logos.p5 img{max-height:48px}'
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{bs.CSS}{extra}</style></head><body>{"".join(P)}</body></html>', len(P)


def splice(ref_pdf, out):
    """base 앞 11장 + 실적 + base 뒤 5장. 뒤쪽 기존 페이지는 오른쪽 아래 쪽번호 글자만 바꿔 넣는다."""
    import pymupdf as fitz
    base = fitz.open(BASE); ref = fitz.open(ref_pdf); n = ref.page_count
    doc = fitz.open(); doc.insert_pdf(base, from_page=0, to_page=HEAD - 1); doc.insert_pdf(ref); doc.insert_pdf(base, from_page=HEAD, to_page=base.page_count - 1)
    ttf = f'{ROOT}/fonts/Pretendard-Regular.otf'; font = fitz.Font(fontfile=ttf)
    for j in range(base.page_count - HEAD):
        pg = doc[HEAD + n + j]; old = str(TAIL_OLD + j); new = f'{HEAD + n + j + 1:02d}'
        for b in pg.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    if s['text'].strip() == old and s['bbox'][1] > 740:  # 오른쪽 아래 쪽번호
                        r = fitz.Rect(s['bbox']); pg.add_redact_annot(fitz.Rect(r.x0 - 1, r.y0, r.x1 + 1, r.y1), fill=(1, 1, 1))
                        pg.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
                        w = font.text_length(new, fontsize=s['size'])
                        pg.insert_text(fitz.Point(r.x1 - w, s['origin'][1]), new, fontsize=s['size'], fontname='P', fontfile=ttf, color=(0x8A / 255, 0x94 / 255, 0xA6 / 255))
    doc.save(out, garbage=3, deflate=True); return doc.page_count


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    h, n = build()
    asyncio.run(bs.render('profile_refs', h))
    print('pages:', splice(f'{ROOT}/out/profile_refs.pdf', out), '->', out)
