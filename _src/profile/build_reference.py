import json, sys, os, asyncio
from playwright.async_api import async_playwright

import os
ROOT = os.path.dirname(os.path.abspath(__file__))
C = ROOT + '/crops'
LOGO = os.path.abspath(os.path.join(ROOT,'..','..','img','logo_color.png'))

CSS = f"""
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Regular.otf);font-weight:400}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-SemiBold.otf);font-weight:600}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Bold.otf);font-weight:700}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-ExtraBold.otf);font-weight:800}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:1440px;height:810px;background:#fff}}
.page{{position:relative;width:1440px;height:810px;overflow:hidden;font-family:P,sans-serif;color:#111B2E;padding:72px 82px 0;page-break-after:always;background:#fff}}
.logo{{position:absolute;right:82px;top:39px;height:25px}}
.eyebrow{{display:flex;align-items:center;gap:14px;font-size:16.5px;font-weight:700;color:#1857A5;height:20px}}
.eyebrow:before{{content:"";width:32px;height:3px;background:#E83E30;display:block}}
h1{{font-size:48px;font-weight:800;line-height:1.22;margin-top:14px;letter-spacing:-0.5px}}
h1 b{{color:#1857A5;font-weight:800}}
.foot{{position:absolute;left:82px;right:82px;top:767px;display:flex;justify-content:space-between;font-size:12px;color:#8A94A6}}
.note{{position:absolute;left:82px;top:725px;font-size:12px;color:#8A94A6}}
.cards{{display:flex;gap:24px;margin-top:34px}}
.card{{flex:1;border:1px solid #E2E7EE;border-radius:12px;overflow:hidden;background:#fff}}
.card img.ph{{width:100%;height:220px;object-fit:cover;display:block}}
.card .b{{padding:18px 24px 22px}}
.tag{{font-size:11.2px;font-weight:800;color:#1857A5;letter-spacing:1px}}
.card h3{{font-size:21.8px;font-weight:700;margin:6px 0 10px}}
.card ul{{list-style:none}}
.card li{{font-size:13.9px;line-height:1.6;padding-left:14px;position:relative;margin-bottom:6px}}
.card li:before{{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:#1857A5}}
.own{{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:#5A6577;margin-bottom:4px}}
.own img{{height:26px}}
table{{width:100%;border-collapse:collapse;margin-top:30px;font-size:14px}}
th{{text-align:left;font-size:12px;font-weight:700;color:#1857A5;background:#EAF1FA;padding:11px 16px;border-top:2px solid #1857A5}}
td{{padding:11px 16px;border-bottom:1px solid #E2E7EE;line-height:1.45;vertical-align:top}}
td.k{{font-weight:600}}
.strip{{position:absolute;left:82px;right:82px;top:665px;display:flex;align-items:center;justify-content:space-between;border:1px solid #E2E7EE;border-radius:10px;padding:10px 24px;background:#F5F7FA}}
.strip img{{height:26px}}
.strip img.w{{height:20px}}
.grid{{display:flex;gap:24px;margin-top:34px}}
.feat{{width:300px;border:1px solid #E2E7EE;border-radius:12px;overflow:hidden;background:#fff}}
.feat img.ph{{width:100%;height:160px;object-fit:cover;display:block}}
.feat .b{{padding:14px 18px 16px}}
.feat .b img.lg{{height:26px;display:block;margin-bottom:8px}}
.feat h3{{font-size:16.5px;font-weight:700;line-height:1.3;margin-bottom:6px}}
.feat p{{font-size:12px;color:#5A6577;line-height:1.5}}
.list{{flex:1;background:#F5F7FA;border-radius:12px;padding:18px 22px}}
.list h3{{font-size:17px;font-weight:700;color:#0F3F7E;margin-bottom:12px}}
.list li{{font-size:12.5px;line-height:1.55;padding-left:14px;position:relative;margin-bottom:9px;list-style:none}}
.list li:before{{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:#1857A5}}
"""

def page(eyebrow, title, body, foot, num, note=None):
    n = f'<div class="note">{note}</div>' if note else ''
    return f'<div class="page"><img class="logo" src="{LOGO}"><div class="eyebrow">{eyebrow}</div><h1>{title}</h1>{body}{n}<div class="foot"><span>{foot}</span><span>{num}</span></div></div>'

I = lambda n: f'{C}/{n}'

def marine(L):
    ships = [
        (I('p39_04_photo.jpg'), I('p40_06_logo.jpg'), L['cn'], L['cn_t'], L['cn_l']),
        (I('p37_04_photo.jpg'), I('p37_06_logo.jpg'), L['gn'], L['gn_t'], L['gn_l']),
        (I('p36_04_photo.jpg'), I('p36_10_logo.jpg'), L['mof'], L['mof_t'], L['mof_l']),
    ]
    cards = ''.join(f'<div class="card"><img class="ph" src="{ph}"><div class="b"><div class="own"><img src="{lg}">{own}</div><h3>{t}</h3><ul>{"".join(f"<li>{x}</li>" for x in li)}</ul></div></div>' for ph,lg,own,t,li in ships)
    return f'<div class="cards">{cards}</div>'

def fgss(L):
    rows = ''.join(f'<tr><td class="k">{a}</td><td>{b}</td><td>{c}</td></tr>' for a,b,c in L['rows'])
    return f'<table><tr><th style="width:24%">{L["h"][0]}</th><th style="width:42%">{L["h"][1]}</th><th>{L["h"][2]}</th></tr>{rows}</table>'

def plant(L):
    feats = [
        (I('p20_06_photo.jpg'), I('p20_04_logo.jpg'), L['f1t'], L['f1d']),
        (I('photo_bobst_421.jpg'), I('logo_bobst.jpg'), L['f3t'], L['f3d']),
        (I('p21_04_photo.jpg'), I('p21_06_logo.jpg'), L['f2t'], L['f2d']),
    ]
    f = ''.join(f'<div class="feat"><img class="ph" src="{ph}"><div class="b"><img class="lg" src="{lg}"><h3>{t}</h3><p>{d}</p></div></div>' for ph,lg,t,d in feats)
    lis = ''.join(f'<li>{x}</li>' for x in L['others'])
    # 고객사 로고 띠 — logos/ 폴더의 벡터 로고 (파일명, 표시 높이 px)
    logos = [('skens.svg', 30), ('bobst.svg', 22), ('atlas.svg', 26), ('skecoplant.svg', 28), ('hhitm.svg', 20), ('hiair.svg', 26), ('kiswire.svg', 32), ('sunbo.png', 22), ('ksb.svg', 24), ('gsi.png', 22), ('kte.svg', 30), ('wilo.svg', 28)]
    strip = '<div class="strip">' + ''.join(f'<img src="{ROOT}/logos/{x}" style="height:{h}px">' for x, h in logos) + '</div>'
    return f'<div class="grid">{f}<div class="list"><h3>{L["oh"]}</h3><ul>{lis}</ul></div></div>{strip}'

KR = dict(
  foot='DONG-IN ENSIS · 회사소개서',
  m_eye='Major Reference · Green Ship', m_title='친환경 선박 하이브리드 추진,<br><b>통합제어·감시시스템을 공급했습니다</b>',
  cn='충청남도', cn_t='충남병원선 · G/T 330톤급', cn_l=['디젤엔진 + 전기모터 하이브리드 추진','추진시스템 · 통합제어·감시시스템 공급','2023년 8월 취항 · 친환경 선박 건조 공로 표창'],
  gn='경상남도', gn_t='경남청정호 · G/T 120톤급 환경정화선', gn_l=['디젤엔진 + 전기모터 하이브리드 추진','추진시스템 · 통합제어·감시시스템 공급','2023년 4월 취항'],
  mof='해양수산부 여수지방해양수산청', mof_t='G/T 280톤급 항만청소선', mof_l=['디젤 · LNG 엔진 하이브리드 추진','연료가스공급시스템(FGSS) 제어시스템 공급','LNG 연료 선박의 가스 안전 제어'],
  m_note='※ 해양수산부 하이브리드 시범어선 디젤·전기모터 통합제어 적용(2026) · 국가 R&D: 전기복합 추진어선(2021~25), 안전기반 소형 수소추진선박(2022~26)',
  f_eye='Major Reference · LNG Fuel Gas Supply System', f_title='LNG 연료공급시스템(FGSS) 제어,<br><b>가스 연료 선박에서 검증했습니다</b>',
  h=['발주처 · 조선소','선박 · 설비','공급 범위'],
  rows=[('Jiangsu New Times Shipbuilding (NTS)','EPS-NTS 210,000 / 209,000 DWT 벌크선 13척 (Liberia · ABS)','FGSS 글리콜워터 펌프 제어 · 유압 동력 공급 시스템'),
        ('Namura Shipbuilding','95,000 DWT 벌크선 (S496 · Liberia · NK)','FGSS 글리콜워터 펌프 제어시스템'),
        ('GSI (广船国际)','HMM 8,600 CEU DF 자동차운반선 3척 (Panama · KR)','FGSS 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
        ('GSI (广船国际)','EPS/Chandris 111K DWT LNG DF 원유·제품 운반선 (Taiwan · KR)','BOG 압축기 제어 · 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
        ('—','1.2 MW 앵커 핸들링선 (EK011 · Taiwan · KR)','FGSS 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
        ('삼성중공업','FGSS 시스템 시험설비','G/W(글리콜워터) 히터 제어시스템'),
        ('Atlas Copco','LNG 밸류체인용 고성능 BOG 압축기','BOG 압축기 제어시스템 엔지니어링 · 글로벌 지원'),
        ('SB선보','LNG 운반선용 BOG 압축기','BOG 압축기 제어시스템 설계 · 공급 · 시운전')],
  f_note='※ LNG 연료 선박의 가스 공급·안전 제어 경험이 수소 설비 제어의 기반입니다.',
  p_eye='Major Reference · Energy & Plant', p_title='수소충전소에서 해외 공장까지,<br><b>에너지·산업 플랜트 제어 실적</b>',
  f1t='SK E&amp;S 액화수소충전소', f1d='VFD · PLC · UPS 제어시스템 공급 · 상용 충전소 운영 실증',
  f2t='한국남부발전 연료전지 발전소 CCUS BOP 제어', f2d='탄소 포집·활용·저장(CCUS) 설비 BOP 제어시스템 · SK에코플랜트',
  f3t='밥스트코리아(BOBST) 포장기계', f3d='특수 기계 제어시스템 엔지니어링·공급 (서보·모션 제어)',
  oh='그 외 주요 실적',
  others=['현대자동차그룹 Metaplant America(미국) — 전기차 생산라인 통합제어시스템','동화기업 포르말린 수지 플랜트 — 전체 제어시스템 설계·제작','KOS · 고려제강(Kiswire) — 신선기·연선기·도금·열처리 라인 (한국·베트남·미국·체코·헝가리·말레이시아·중국)','KSB — 선박용 제어 콘솔 · 시스템 판넬','대한화섬 오토도퍼 · DMS 고밀도 클리너 · IGis 열가소성 스페이서 · 파워엠엔씨 SMR 핵연료 교환기 — 서보·모션 제어'],
)
EN = dict(
  foot='DONG-IN ENSIS · Company Profile',
  m_eye='Major Reference · Green Ship', m_title='Hybrid propulsion for green vessels,<br><b>delivered with integrated control</b>',
  cn='Chungcheongnam-do', cn_t='Chungnam Hospital Ship · G/T 330 t', cn_l=['Diesel engine + electric motor hybrid propulsion','Propulsion system · integrated control &amp; monitoring','Commissioned Aug 2023 · green-ship commendation'],
  gn='Gyeongsangnam-do', gn_t='Environmental cleanup ship · G/T 120 t', gn_l=['Diesel engine + electric motor hybrid propulsion','Propulsion system · integrated control &amp; monitoring','Commissioned Apr 2023'],
  mof='Ministry of Oceans and Fisheries, Yeosu', mof_t='Harbor cleaning ship · G/T 280 t', mof_l=['Diesel &amp; LNG engine hybrid propulsion','Fuel gas supply system (FGSS) control','Gas safety control on an LNG-fuelled vessel'],
  m_note='※ Hybrid demonstration fishing vessel: diesel–electric integrated control (2026) · National R&amp;D: electric hybrid fishing vessels (2021–25), safety-based small hydrogen vessels (2022–26)',
  f_eye='Major Reference · LNG Fuel Gas Supply System', f_title='FGSS control systems,<br><b>proven on LNG-fuelled ships</b>',
  h=['Owner · Shipyard','Vessel · Facility','Scope of supply'],
  rows=[('Jiangsu New Times Shipbuilding (NTS)','EPS-NTS 210,000 / 209,000 DWT bulk carriers, 13 ships (Liberia · ABS)','FGSS glycol water pump control · hydraulic power supply system'),
        ('Namura Shipbuilding','95,000 DWT bulk carrier (S496 · Liberia · NK)','FGSS glycol water pump control system'),
        ('GSI (Guangzhou Shipyard International)','HMM 8,600 CEU DF pure car truck carriers, 3 ships (Panama · KR)','FGSS glycol pump · L.O pump &amp; oil heater control'),
        ('GSI (Guangzhou Shipyard International)','EPS/Chandris 111K DWT LNG DF crude/product tankers (Taiwan · KR)','BOG compressor control · glycol pump · L.O pump &amp; oil heater control'),
        ('—','1.2 MW anchor handling ship (EK011 · Taiwan · KR)','FGSS glycol pump · L.O pump &amp; oil heater control'),
        ('Samsung Heavy Industries','FGSS system test facility','G/W (glycol water) heater control system'),
        ('Atlas Copco','High-performance BOG compressors for LNG value chains','BOG compressor control engineering · global support'),
        ('SB Sunbo','BOG compressors for LNG carriers','Design, supply and commissioning of BOG compressor control')],
  f_note='※ Gas supply and safety control on LNG-fuelled vessels is the foundation of our hydrogen facility control.',
  p_eye='Major Reference · Energy & Plant', p_title='From hydrogen stations to overseas plants,<br><b>energy and industrial references</b>',
  f1t='SK E&amp;S liquid hydrogen refueling station', f1d='VFD, PLC and UPS control system · in commercial operation',
  f2t='KOSPO fuel cell power plant CCUS BOP control', f2d='BOP control system for carbon capture, utilization and storage · SK ecoplant',
  f3t='BOBST Korea packaging machinery', f3d='Engineering and supply of specialized machine control (servo/motion)',
  oh='Other major references',
  others=['Hyundai Motor Group Metaplant America (USA) — integrated control systems for EV production','Dongwha formalin resin plant — entire control system designed and built','KOS · Kiswire — drawing, stranding, plating and heat-treatment lines (Korea, Vietnam, USA, Czechia, Hungary, Malaysia, China)','KSB — control consoles and system panels for marine application','Auto doffer, high-density cleaner, thermoplastic spacer, SMR refueling machine — servo/motion control'],
)

def html(L, start):
    pages = [page(L['m_eye'], L['m_title'], marine(L), L['foot'], start, L['m_note']),
             page(L['f_eye'], L['f_title'], fgss(L), L['foot'], start+1, L['f_note']),
             page(L['p_eye'], L['p_title'], plant(L), L['foot'], start+2)]
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(pages)}</body></html>'

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        for name, L in [('KR', KR), ('EN', EN)]:
            h = html(L, 12)
            open(f'{ROOT}/out/ref_{name}.html','w').write(h)
            pg = await b.new_page(viewport={'width':1440,'height':810})
            await pg.goto(f'file://{ROOT}/out/ref_{name}.html'); await pg.wait_for_timeout(800)
            await pg.pdf(path=f'{ROOT}/out/ref_{name}.pdf', width='20in', height='11.25in', scale=1.3333, print_background=True, prefer_css_page_size=False, margin={'top':'0','bottom':'0','left':'0','right':'0'})
            for i in range(3):
                await pg.evaluate(f'window.scrollTo(0,{i*810})')
            await pg.screenshot(path=f'{ROOT}/out/ref_{name}.png', full_page=True)
            await pg.close()
        await b.close()
asyncio.run(main())
print('done')
