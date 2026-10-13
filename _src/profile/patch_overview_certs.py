"""회사소개서(국문·영문) 4쪽 '인증·선정' 행 교체 기록 — base PDF에는 원본이 없어 PyMuPDF로 글자를 지우고 Chromium이 만든 PDF를 그 행 영역에 겹쳐 넣음.
PyMuPDF insert_text + subset_fonts()는 Pretendard OTF의 괄호·'+'·'&' 글리프를 깨뜨려서, 글자는 Chromium(Playwright)으로 렌더링해 show_pdf_page로 올린다.
2026.10 적용 완료(이미 files/의 PDF에 반영). 다시 쓰려면 OLD/NEW 문구와 기준선 위치만 바꾸면 된다.  실행: python3 patch_overview_certs.py
"""
import asyncio, os, fitz
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.join(HERE,'..','..'); F=os.path.join(HERE,'fonts'); OUT=os.path.join(HERE,'out')
JOBS={
 'KR': dict(old=['벤처기업 · 이노비즈 · 메인비즈 · 기업부설연구소','수소전문기업 · 혁신프리미어 1000 (2026)'],
   new=[('벤처기업 · 이노비즈 · 메인비즈 · 기업부설연구소 · 스마트공장 공급기업',15,'#111B2E'),
        ('수소전문기업 · 혁신프리미어 1000 (2026) · 혁신기업 국가대표 1000',12,'#5A6577'),
        ('부산광역시 전략산업 선도기업 · 레전드 50+ 참여기업 · 부산 서비스 강소기업',12,'#5A6577')]),
 'EN': dict(old=['Venture Company · INNOBIZ · MAINBIZ · Corporate R&D Center','Hydrogen Specialized Company · Innovation Premier 1000 (2026)'],
   new=[('Venture Company · INNOBIZ · MAINBIZ · Corporate R&amp;D Center · Smart Factory Supplier',14,'#111B2E'),
        ('Hydrogen Specialized Company · Innovation Premier 1000 (2026) · National Innovative Company 1000',12,'#5A6577'),
        ('Busan Strategic Industry Leading Company · Legend 50+ · Busan Service Strong SME',12,'#5A6577')]),
}
CSS=(f"@font-face{{font-family:P;src:url(file://{F}/Pretendard-Regular.otf);font-weight:400}}@font-face{{font-family:P;src:url(file://{F}/Pretendard-Bold.otf);font-weight:700}}"
     "html,body{margin:0;width:1440px;height:810px;background:transparent}div{position:absolute;font-family:P;line-height:1;white-space:nowrap;letter-spacing:-0.1px}")

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/opt/pw-browsers/chromium'))
        for lang,J in JOBS.items():
            src_pdf=os.path.join(ROOT,'files',f'DONG-IN-ENSIS_Company-Profile_{lang}.pdf'); d=fitz.open(src_pdf); pg=d[3]
            spans=[s for blk in pg.get_text('dict')['blocks'] for l in blk.get('lines',[]) for s in l['spans']]
            found={s['text']:s for s in spans if s['text'] in J['old']}
            if len(found)<2: print(lang,'이미 적용됨(원래 문구 없음) — 건너뜀'); continue
            s1=found[J['old'][0]]; s2=found[J['old'][1]]; o1=s1['origin'][1]; x0=s1['bbox'][0]
            lab=[s for s in spans if s['bbox'][0]<200 and abs(s['origin'][1]-o1)<3][0]
            rules=sorted(r['rect'].y0 for r in pg.get_drawings() if r['rect'].width>300 and r['rect'].height<3 and abs(r['rect'].y0-o1)<80)
            top_rule=max(y for y in rules if y<o1); bot_rule=min(y for y in rules if y>o1)
            right=max(r['rect'].x1 for r in pg.get_drawings() if r['rect'].width>300 and r['rect'].height<3 and abs(r['rect'].y0-bot_rule)<1)
            bl=[o1-4,o1+14,o1+30]  # 세 줄 기준선(y). line-height:1일 때 기준선은 글자 상자 위에서 약 0.85em
            divs=[f'<div style="left:{lab["bbox"][0]}px;top:{bl[0]-0.85*15:.1f}px;font-size:15px;font-weight:700;color:#1857A5">{lab["text"].strip()}</div>']
            for (t,sz,c),y in zip(J['new'],bl): divs.append(f'<div style="left:{x0}px;top:{y-0.85*sz:.1f}px;font-size:{sz}px;color:{c}">{t}</div>')
            hp=os.path.join(OUT,f'certs_{lang}.html'); open(hp,'w',encoding='utf8').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(divs)}</body></html>')
            page=await b.new_page(viewport={'width':1440,'height':810}); await page.goto('file://'+hp); await page.evaluate('document.fonts.ready')
            op=os.path.join(OUT,f'certs_{lang}.pdf'); await page.pdf(path=op,width='1440px',height='810px',print_background=False,margin={'top':'0','bottom':'0','left':'0','right':'0'}); await page.close()
            for s in (s1,s2,lab):
                r=fitz.Rect(s['bbox']); pg.add_redact_annot(fitz.Rect(r.x0-1,r.y0-1,(right-4 if s is not lab else r.x1+2),r.y1+1),fill=(1,1,1))
            pg.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
            ov=fitz.open(op); k=ov[0].rect.width/1440  # Chromium PDF는 1080pt 폭(96dpi→72pt)
            tgt=fitz.Rect(lab['bbox'][0]-4, top_rule+2, right-3, bot_rule-2)
            pg.show_pdf_page(tgt, ov, 0, clip=fitz.Rect(tgt.x0*k,tgt.y0*k,tgt.x1*k,tgt.y1*k))
            d.save(os.path.join(OUT,f'profile_{lang}_certs.pdf'),garbage=4,deflate=True); print(lang,'→ out/profile_%s_certs.pdf (확인 후 files/로 복사)'%lang)
        await b.close()
if __name__=='__main__': asyncio.run(main())
