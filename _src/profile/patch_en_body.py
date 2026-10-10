"""회사소개서(영문) 본문 쪽을 국문에 맞춘 기록 — base PDF에는 원본이 없어, 글자를 지우고 Chromium으로 그린 글을 겹쳐 넣는다
(patch_overview_certs.py와 같은 방식. 위치는 원래 글자의 기준선에 맞춤).

  4쪽  회사명 줄의 '(formerly Dongin Gijeon)' 삭제          ← 국문에는 옛 이름(동인기전) 표기 없음
  5쪽  1991 설명 · 1991 항목에서 'Dongin Gijeon' 삭제        ← 국문: 회사 설립. Siemens · Fuji Electric · ABB · Danfoss 등 … 공급 / 1991 회사 설립
       2026 첫 항목에 데이터 사업 진출 추가                 ← 국문: 2026 지능형 제어반 출시 · 데이터 사업 진출
  6쪽  양산 공장 항목에 준공 연도 추가                      ← 국문: 양산 1·2공장(2023년 준공) · 기장공장 운영

대상: base/profile_base_EN.pdf (영문 통합본 files/…_EN.pdf는 build_profile_refs_en.py가 이 base로 다시 만든다).
이미 고친 쪽은 건너뛴다.   실행: python3 patch_en_body.py
"""
import asyncio, os, shutil
import pymupdf as fitz
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); F = f'{HERE}/fonts'; OUT = f'{HERE}/out'
BASE = f'{HERE}/base/profile_base_EN.pdf'
INK, SUB, BLUE, RED = '#111B2E', '#5A6577', '#1857A5', '#E83E30'

CSS = (f"@font-face{{font-family:P;src:url(file://{F}/Pretendard-Regular.otf);font-weight:400}}"
       f"@font-face{{font-family:P;src:url(file://{F}/Pretendard-Bold.otf);font-weight:700}}"
       "html,body{margin:0;width:1440px;height:810px;background:transparent}"
       ".t{position:absolute;font-family:P;letter-spacing:0;white-space:normal} .t b{font-weight:700}"
       ".m{display:inline-block;width:0;height:0;vertical-align:baseline}"
       "")
# 원래 글자의 첫 줄 기준선(y)에 맞추기: .m(기준선 표시)로 실제 기준선을 재서 top을 옮긴다
ALIGN = """() => { document.querySelectorAll('.t').forEach(d => { const m = d.querySelector('.m');
  const off = m.getBoundingClientRect().top - d.getBoundingClientRect().top; d.style.top = (parseFloat(d.dataset.base) - off) + 'px'; }); }"""


def tx(x, base, size, color, html, width=None, lh=None):
    w = f'width:{width}px;' if width else 'white-space:nowrap;'
    l = f'line-height:{lh}px;' if lh else 'line-height:1.2;'
    return f'<div class="t" data-base="{base}" style="left:{x}px;top:0;font-size:{size}px;color:{color};{w}{l}"><span class="m"></span>{html}</div>'


def rgb(h): return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))


def spans_of(pg):
    return [s for b in pg.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']]


async def overlay(browser, name, divs):
    hp = f'{OUT}/{name}.html'
    open(hp, 'w', encoding='utf-8').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(divs)}</body></html>')
    pg = await browser.new_page(viewport={'width': 1440, 'height': 810}); await pg.goto('file://' + hp)
    await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(300); await pg.evaluate(ALIGN)
    op = f'{OUT}/{name}.pdf'
    await pg.pdf(path=op, width='1440px', height='810px', print_background=False, margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
    await pg.close(); return fitz.open(op)


def place(pg, ov, rects):
    k = ov[0].rect.width / 1440  # Chromium PDF는 1440px → 1080pt
    for r in rects:
        pg.show_pdf_page(r, ov, 0, clip=fitz.Rect(r.x0 * k, r.y0 * k, r.x1 * k, r.y1 * k))


async def main():
    os.makedirs(OUT, exist_ok=True)
    d = fitz.open(BASE); changed = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/opt/pw-browsers/chromium'))

        # ── 4쪽: 회사명 줄 '(formerly Dongin Gijeon)' 지우기 (덧그릴 글자 없음)
        p4 = d[3]
        for blk in p4.get_text('rawdict')['blocks']:
            for l in blk.get('lines', []):
                for s in l['spans']:
                    t = ''.join(c['c'] for c in s['chars'])
                    if ' (formerly Dongin Gijeon)' in t:
                        i = t.index(' (formerly'); bb = s['bbox']
                        p4.add_redact_annot(fitz.Rect(s['chars'][i]['bbox'][0] + 0.3, bb[1] + 1, bb[2] + 1, bb[3] - 1), fill=False)
        if p4.first_annot:
            p4.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE); changed.append(4)

        # ── 5쪽: 1991 설명 · 1991 항목 · 2026 항목들
        p5 = d[4]; S = spans_of(p5)
        if any('Dongin Gijeon' in s['text'] for s in S):
            r_desc = fitz.Rect(80, 465, 386, 540)       # 1991 설명 3줄 (기준선 482.2 · 506.2 · 530.2)
            r_1991 = fitz.Rect(134, 566, 386, 587)       # 1991 항목의 글(연도 '1991'은 그대로)
            r_2026 = fitz.Rect(1055, 566, 1362, 702)     # 2026 항목 3개(점 포함) — 첫 항목이 두 줄이 되어 아래로 밀림
            divs = [tx(82.5, 482.2, 14.62, SUB, 'Company founded. Supplying global power and control brands such as Siemens, Fuji Electric, ABB and Danfoss', width=300, lh=24),
                    tx(136.5, 581.2, 15, INK, 'Company founded')]
            items = ['Intelligent Control Panel launch · entry into the data business', 'Innovation Premier 1000', 'Hydrogen Specialized Co. · 5 patents']
            y = 581.2; dots = []
            for it in items:   # 줄 간격 22.5(1.5em), 항목 간격 33 — 원래 쪽과 같음
                dots.append(fitz.Point(1063.15, y - 4.05))   # 원래 점: 지름 5.3, 기준선보다 4.05 위가 중심
                divs.append(tx(1072.9, y, 15, INK, f'<b style="color:{RED}">2026</b> {it}', width=284.6, lh=22.5))
                lines = 2 if it.startswith('Intelligent') or it.startswith('Hydrogen') else 1
                y += 33 + 22.5 * (lines - 1)
            for r in (r_desc, r_1991, r_2026): p5.add_redact_annot(r, fill=False)
            p5.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED)
            place(p5, await overlay(b, 'en_body_p5', divs), [r_desc, r_1991, r_2026])
            for c in dots: p5.draw_circle(c, 2.65, color=None, fill=rgb(RED), width=0)   # 점은 PDF에 직접 그림(Chromium PDF는 배경색을 빼므로)
            changed.append(5)

        # ── 6쪽: 양산 공장 항목
        p6 = d[5]
        old = [s for s in spans_of(p6) if s['text'] == 'Yangsan Factories 1 & 2 and Gijang Factory']
        if old:
            s = old[0]; r = fitz.Rect(s['bbox'][0] - 2, s['bbox'][1], 470, s['bbox'][3])
            p6.add_redact_annot(r, fill=False); p6.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
            place(p6, await overlay(b, 'en_body_p6', [tx(s['origin'][0], s['origin'][1], 15, INK, 'Yangsan Factories 1 &amp; 2 (2023) · Gijang Factory')]), [r]); changed.append(6)
        await b.close()

    if changed:
        d.save(BASE + '.tmp', garbage=3, deflate=True); d.close(); shutil.move(BASE + '.tmp', BASE)
    print('고친 쪽:', changed or '없음(이미 적용됨)')


if __name__ == '__main__':
    asyncio.run(main())
