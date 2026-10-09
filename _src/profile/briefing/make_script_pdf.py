"""영업용 회사소개서 브리핑 대본 PDF — briefing_script.md → files/DONG-IN-ENSIS_Sales-Profile_Briefing-Script_KR.pdf

사용법: python3 make_script_pdf.py (markdown 패키지 필요: pip install markdown)
"""
import markdown, asyncio, os
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); F=os.path.join(HERE,'..','fonts'); OUT=os.path.join(HERE,'..','..','..','files','DONG-IN-ENSIS_Sales-Profile_Briefing-Script_KR.pdf')
md=open(os.path.join(HERE,'briefing_script.md'),encoding='utf-8').read()
body=markdown.markdown(md, extensions=['tables'])
css=f"""@font-face{{font-family:P;src:url({F}/Pretendard-Regular.otf);font-weight:400}}
@font-face{{font-family:P;src:url({F}/Pretendard-Bold.otf);font-weight:700}}
@font-face{{font-family:P;src:url({F}/Pretendard-ExtraBold.otf);font-weight:800}}
body{{font-family:P;color:#111B2E;font-size:10.5pt;line-height:1.65;word-break:keep-all}}
h1{{font-size:20pt;font-weight:800;color:#0F3F7E;border-bottom:3px solid #E83E30;padding-bottom:8px;margin:0 0 10px}}
h2{{font-size:13pt;font-weight:800;color:#1857A5;margin:22px 0 6px;break-after:avoid}}
blockquote{{margin:6px 0;padding:8px 14px;background:#F5F7FA;border-left:4px solid #1857A5;border-radius:4px}} blockquote p{{margin:3px 0}}
ul{{margin:6px 0;padding-left:20px;color:#5A6577;font-size:9.5pt}} hr{{border:0;border-top:1px solid #E2E7EE;margin:18px 0}}
table{{border-collapse:collapse;width:100%;font-size:9pt;margin:8px 0}} th{{background:#EAF1FA;color:#1857A5;text-align:left;padding:6px 8px;border-top:2px solid #1857A5}} td{{padding:6px 8px;border-bottom:1px solid #E2E7EE;vertical-align:top}}
strong{{color:#0F3F7E}} h2,blockquote,table,tr{{break-inside:avoid}}"""
open(os.path.join(HERE,'briefing_script.html'),'w',encoding='utf-8').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>{body}</body></html>')
async def r():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium'); p=await b.new_page()
        await p.goto('file://'+os.path.join(HERE,'briefing_script.html')); await p.wait_for_timeout(800)
        await p.pdf(path=OUT, format='A4', print_background=True, margin=dict(top='18mm',bottom='18mm',left='18mm',right='18mm'),
            display_header_footer=True, header_template='<span></span>', footer_template='<div style="font-size:8px;width:100%;text-align:center;color:#8A94A6"><span class="pageNumber"></span> / <span class="totalPages"></span></div>')
        await b.close()
asyncio.run(r())
