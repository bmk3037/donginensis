"""수소전문기업 PDF(files/DONG-IN-ENSIS_Hydrogen-Profile_KR.pdf)에 「디지털트윈」 쪽을 12쪽으로 끼워 넣는다 (2026.10).

    python3 patch_hydrogen_twin.py

배포본은 build_hydrogen.py 로 만든 뒤 글자를 직접 고친 부분이 있어 전체를 다시 만들지 않는다.
build_hydrogen.py 의 12쪽(디지털트윈)만 Chromium 으로 그려 끼우고, 뒤쪽(옛 12~19쪽)의 쪽 번호만 지우고 새 번호(13~20)를 겹쳐 넣는다.
쪽 번호는 build_hydrogen.py 의 .foot 와 같은 CSS 로 그린 투명 PDF 를 겹친다(PyMuPDF insert_text 는 Pretendard 글리프가 깨질 수 있음).
"""
import asyncio, os, shutil
import pymupdf as fitz
from playwright.async_api import async_playwright
import build_hydrogen as H

ROOT = H.ROOT
PDF = os.path.join(H.SITE, 'files', 'DONG-IN-ENSIS_Hydrogen-Profile_KR.pdf')
OUT = os.path.join(ROOT, 'out')
AT = 11                                   # 0부터 셈: 11 = 12쪽 자리
# 배포본의 아래쪽 표기는 「DONG-IN ENSIS · 수소전문기업」(build_hydrogen.py FOOT 보다 짧음) → 새 쪽도 배포본에 맞춘다
NEW = H.P[AT].replace(H.FOOT, 'DONG-IN ENSIS · 수소전문기업')
assert 'Digital Twin' in NEW, 'build_hydrogen.py 의 12쪽이 디지털트윈 쪽이 아닙니다'

async def render(html, path, background=True):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg = await b.new_page(viewport={'width': 1440, 'height': 810})
        tmp = os.path.join(OUT, '_patch.html')
        open(tmp, 'w').write(html)
        await pg.goto(f'file://{tmp}'); await pg.wait_for_timeout(1200)
        await pg.pdf(path=path, width='20in', height='11.25in', scale=1.3333, print_background=background,
                     margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        await b.close()

def doc(body, extra_css=''):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{H.CSS}{extra_css}</style></head><body>{body}</body></html>'

async def main():
    os.makedirs(OUT, exist_ok=True)
    src = fitz.open(PDF)
    await render(doc(NEW), os.path.join(OUT, '_twin_page.pdf'))
    if src.page_count == 21 and 'Digital Twin' in src[AT].get_text():
        # 이미 끼운 배포본: 12쪽만 새로 그린 것으로 바꾼다 (쪽 번호는 이미 맞음)
        src.delete_page(AT)
        src.insert_pdf(fitz.open(os.path.join(OUT, '_twin_page.pdf')), start_at=AT)
        return save(src)
    assert src.page_count == 20, f'배포본이 {src.page_count}쪽입니다 (20쪽 원본 또는 디지털트윈을 끼운 21쪽이어야 함)'
    # 새 쪽 번호 13~20 (배경 없이 번호만, 원래 .foot 자리)
    nums = ''.join(f'<div class="page" style="background:transparent"><div class="foot"><span></span><span>{n:02d}</span></div></div>' for n in range(13, 21))
    # 배경 없이 그리면 크롬이 옅은 글자를 진하게 바꾸므로 색을 그대로 쓰게 한다
    await render(doc(nums, 'html,body{background:transparent}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}'), os.path.join(OUT, '_nums.pdf'), background=False)

    numdoc = fitz.open(os.path.join(OUT, '_nums.pdf'))
    for k, i in enumerate(range(AT, 19)):                       # 옛 12~19쪽 (0부터 11~18)
        p = src[i]
        old = [s for b in p.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']
               if s['bbox'][1] > 760 and s['bbox'][0] > 1300]
        assert old, f'{i + 1}쪽 쪽 번호를 찾지 못했습니다'
        r = fitz.Rect(1300, 762, 1366, 784)
        p.add_redact_annot(r, fill=(1, 1, 1))
        p.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
        p.show_pdf_page(p.rect, numdoc, k, overlay=True)
    src.insert_pdf(fitz.open(os.path.join(OUT, '_twin_page.pdf')), start_at=AT)
    save(src)

def save(src):
    tmp = os.path.join(OUT, 'h2_profile_patched.pdf')
    src.subset_fonts()
    src.save(tmp, garbage=4, deflate=True)
    shutil.copy(tmp, PDF)
    print('saved', PDF, fitz.open(PDF).page_count, 'pages', os.path.getsize(PDF) // 1024, 'KB')

asyncio.run(main())
