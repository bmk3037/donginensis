"""회사소개서(영문) 통합본 — 국문 통합본(build_profile_refs.py)과 같은 23장 구성

base/profile_base_EN.pdf(원본 없는 16장: 옛 1~11쪽, 15~19쪽) 사이에 영문 실적 7장을 끼워 23장을 만듭니다.
쪽 구성 · 사진 · 레이아웃은 국문과 같고(build_sales.py의 CSS와 page/card/stat 함수를 그대로 씀), 글만 영어입니다.
  1~11  기존 (표지 · 회사 · CEO · 개요 · 연혁 · 세 가지 기반 · 지능형 제어반 · 연결 구조 · 보안 · 적용 분야 · 친환경 선박·수소)
  12~18 실적 (Green Ship · LNG FGSS · Energy · Plant & OEM · Servo & Motion · Reference list · Customers)
  19~23 기존 (제조기업 · 도입 절차 · IT 협업 · 데이터 · 마무리) — 꼬리말 쪽번호만 고쳐 넣음

※ 국문 실적 쪽(build_sales.py의 ref_* · STATS6, build_profile_refs.py의 고객 쪽)을 고치면 이 파일의 영문도 같은 작업에서 고칩니다.

사용법
  python3 build_profile_refs_en.py                 # → ../../files/DONG-IN-ENSIS_Company-Profile_EN.pdf
  python3 build_profile_refs_en.py 출력경로.pdf
"""
import os, sys, asyncio
import build_sales as bs
import build_profile_refs as r

ROOT, SITE = r.ROOT, r.SITE
BASE = f'{ROOT}/base/profile_base_EN.pdf'   # 옛 1~11쪽 + 15~19쪽 (16장)
OUT = f'{SITE}/files/DONG-IN-ENSIS_Company-Profile_EN.pdf'
I, X, LG, card, stat, page = bs.I, bs.X, bs.LG, bs.card, bs.stat, bs.page


def ref_green():   # 영문은 글이 길어 사진 높이를 국문(280)보다 조금 낮춤(250)
    ships = [(I('p39_04_photo.jpg'), I('p40_06_logo.jpg'), 'Chungcheongnam-do', 'Chungnam Hospital Ship · G/T 330 t',
              ['Diesel engine + electric motor hybrid propulsion', 'Propulsion system · integrated control &amp; monitoring', 'In service Aug 2023 · green-ship commendation']),
             (I('p37_04_photo.jpg'), I('p37_06_logo.jpg'), 'Gyeongsangnam-do', 'Gyeongnam Cheongjeong · G/T 120 t environmental cleanup ship',
              ['Diesel engine + electric motor hybrid propulsion', 'Propulsion system · integrated control &amp; monitoring', 'In service Apr 2023']),
             (I('p36_04_photo.jpg'), I('p36_10_logo.jpg'), 'Ministry of Oceans and Fisheries, Yeosu', 'Harbor cleaning ship · G/T 280 t',
              ['Diesel · LNG engine hybrid propulsion', 'Fuel gas supply system (FGSS) control system', 'Gas safety control on an LNG-fuelled vessel'])]
    return page('Major Reference · Green Ship', 'Hybrid propulsion for green ships,<br><b>with our integrated control &amp; monitoring</b>',
        '<div class="row">' + ''.join(card(p, t, l, 230, own=(lg, o), badge=b) for (p, lg, o, t, l), b in zip(ships, ['In service 2023', 'In service 2023', 'LNG hybrid'])).replace('height:230px', 'height:250px') + '</div>',
        '※ Pilot hybrid fishing vessel: diesel–electric integrated control (2026) · National R&amp;D: hybrid electric fishing vessels (2021–25), safety-based small hydrogen-powered vessels (2022–26)')


def ref_fgss():
    rows = [('Jiangsu New Times Shipbuilding (NTS)', 'EPS-NTS 210,000 / 209,000 DWT bulk carriers, 13 ships', 'Liberia · ABS', 'FGSS glycol water pump control · hydraulic power supply system'),
            ('Namura Shipbuilding', '95,000 DWT bulk carrier (S496)', 'Liberia · NK', 'FGSS glycol water pump control system'),
            ('GSI (Guangzhou Shipyard International)', 'HMM 8,600 CEU DF car carriers, 3 ships', 'Panama · KR', 'FGSS glycol pump · L.O pump &amp; oil heater control'),
            ('GSI (Guangzhou Shipyard International)', 'EPS/Chandris 111K DWT LNG DF crude/product tanker', 'Taiwan · KR', 'BOG compressor · glycol pump · L.O pump &amp; oil heater control'),
            ('Samsung Heavy Industries', 'FGSS system test facility', '—', 'G/W (glycol water) heater control system')]
    tb = '<table><tr><th style="width:25%">Shipyard · owner</th><th style="width:31%">Vessel · facility</th><th style="width:14%">Flag · class</th><th>Scope of supply</th></tr>' + ''.join(f'<tr><td class="k">{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in rows) + '</table>'
    return page('Major Reference · LNG Fuel Gas Supply System', 'LNG fuel gas supply system (FGSS) control,<br><b>delivered again and again for newbuilds</b>',
        f'<div class="row top"><div style="flex:1">{tb}<div class="ms"><div><b>13 ships</b><span>NTS 210K · 209K DWT bulk carriers</span></div><div><b>ABS · NK · KR</b><span>Class of FGSS vessels supplied</span></div><div><b>China · Japan</b><span>NTS · Namura · GSI shipyards</span></div></div></div><div class="col" style="width:330px">'
        f'<img class="ph" src="{X("ship_pctc.jpg")}" style="width:100%;height:190px"><img class="ph" src="{X("ship_tanker.jpg")}" style="width:100%;height:190px"><div class="cap" style="margin-top:-6px">8,600 CEU DF car carrier · 111K DWT LNG DF tanker</div></div></div>',
        '※ Ship photos show the vessel types. We are extending our gas supply and safety control experience on LNG-fuelled ships to hydrogen facilities.')


def ref_energy():
    return page('Major Reference · Energy', 'Hydrogen stations, power plants and test facilities:<br><b>control systems for energy facilities</b>', '<div class="row">'
        + card(X('ref_ske_station.jpg'), 'SK E&amp;S liquid hydrogen station', ['VFD · PLC · UPS control system (2024)', 'Proven in commercial operation', '5 patents on hydrogen control &amp; power'], 280, own=(I('p20_04_logo.jpg'), ''), badge='2024 · Liquid hydrogen')
        + card(X('ref_ccus1.jpg'), 'Fuel cell plant CCUS BOP control', ['KOSPO fuel cell power plant', 'BOP control for carbon capture (CCUS) facilities', 'SK ecoplant'], 280, own=(I('p21_06_logo.jpg'), ''))
        + card(X('ref_mastc.jpg'), 'MASTC marine test facility', ['Propulsion test facility for green ships', '400 kW propulsion drive · main switchboard · PMS', 'Load bank · battery charge/discharge (DC/DC) · HiL'], 280, own=(None, 'KMOU · Korean Register · KOMERI'))
        + '</div>')


def ref_plant():
    return page('Major Reference · Plant &amp; OEM', 'From overseas production lines to compressor OEMs,<br><b>industrial plant control references</b>', '<div class="row">'
        + card(X('ref_hmg2.jpg'), 'Hyundai Motor Group Metaplant America', ['EV production line in the USA', 'Integrated control systems built and supplied'], 250, 'PLANT · USA', badge='USA')
        + card(X('ref_kiswire.jpg'), 'KOS · Kiswire', ['Wire drawing · stranding · plating · heat treatment lines', 'Korea · Vietnam · USA · Czechia · Hungary · Malaysia · China'], 250, 'PLANT · 7 COUNTRIES')
        + card(X('ref_atlas2.jpg'), 'Atlas Copco', ['High-performance BOG compressors for the LNG value chain', 'Control system engineering · global support'], 250, 'OEM · COMPRESSOR')
        + card(X('ref_sb_bog.jpg'), 'SB Sunbo', ['BOG compressors for LNG carriers', 'Control system design · supply · commissioning'], 250, 'OEM · COMPRESSOR')
        + '</div>')


def ref_servo():
    return page('Major Reference · Servo &amp; Motion', 'Multi-axis servo and motion control,<br><b>control systems for special machines</b>', '<div class="row">'
        + card(X('ref_bobst1.jpg'), 'BOBST Korea', ['Packaging machinery', 'Special machine control engineering · supply'], 228, 'PACKAGING', spec='Servo · motion control')
        + card(X('ref_doffer2.jpg'), 'Daehan Synthetic Fiber auto doffer', ['Auto doffer for the textile process', 'PLC · HMI control system'], 228, 'TEXTILE', spec='M340 PLC · 8 servo axes (CANopen)<br>2 × ATV312 drives · HMI')
        + card(X('ref_smr.jpg'), 'Power MnC SMR refueling machine', ['Refueling machine for small modular reactors', 'PLC · monitoring PC control system'], 228, 'NUCLEAR', spec='M580 PLC · 3 servo axes<br>ATV930 drive · monitoring PC', pos='center 35%', badge='SMR')
        + card(X('ref_dms.jpg'), 'DMS high-density cleaner', ['High Density Cleaner', 'Distributed control · HMI'], 228, 'CLEANER', spec='5 distributed PLCs · servo (CANopen)<br>Modbus TCP · HMI')
        + '</div>', '※ IGis thermal plastic spacer production line: M262 motion controller · 13 servo axes (Sercos III) · 2 drive axes · Schneider Electric platform')


def ref_list():
    R = [('Green ships', 'Chungcheongnam-do', 'Chungnam Hospital Ship · G/T 330 t', 'Hybrid propulsion · integrated control &amp; monitoring'),
         ('', 'Gyeongsangnam-do', 'Gyeongnam Cheongjeong · G/T 120 t', 'Hybrid propulsion · integrated control &amp; monitoring'),
         ('', 'MOF Yeosu Regional Office', 'Harbor cleaning ship · G/T 280 t', 'Diesel–LNG hybrid · FGSS control'),
         ('LNG FGSS', 'NTS · Namura · GSI', 'Bulk carriers · car carriers · LNG DF tanker', 'FGSS glycol pump · BOG · L.O pump &amp; oil heater control'),
         ('', 'Samsung Heavy Industries', 'FGSS system test facility', 'G/W heater control system'),
         ('Compressor OEM', 'Atlas Copco · SB Sunbo', 'LNG BOG compressors', 'Control system engineering · supply · commissioning'),
         ('Hydrogen · energy', 'SK E&amp;S', 'Liquid hydrogen refueling station', 'VFD · PLC · UPS control system'),
         ('', 'SK ecoplant', 'KOSPO fuel cell power plant CCUS', 'BOP control system'),
         ('', 'MASTC (KMOU · KR · KOMERI)', 'Green ship propulsion test facility', 'Propulsion motor drive · main switchboard · PMS · HiL'),
         ('Industrial plants', 'Hyundai Motor Group', 'Metaplant America (USA) EV production line', 'Integrated control system'),
         ('', 'KOS · Kiswire', 'Drawing · stranding · plating · heat treatment lines (7 countries)', 'Control systems'),
         ('', 'Dongwha', 'Formalin resin plant', 'Entire plant control system, designed and built'),
         ('Special machines', 'BOBST Korea', 'Packaging machinery', 'Special machine control system'),
         ('', 'Daehan Synthetic Fiber · DMS · IGis', 'Auto doffer · high-density cleaner · thermal spacer line', 'PLC · up to 13 servo axes · drives · HMI'),
         ('', 'Power MnC', 'SMR refueling machine', 'PLC · 3 servo axes · drive · monitoring PC'),
         ('Marine panels', 'KSB', 'Marine equipment', 'Control consoles · system panels'),
         ('National R&amp;D', 'MOF · KIMST', 'Hybrid electric fishing vessels · small hydrogen-powered vessels', 'Propulsion motor drive · integrated control &amp; monitoring')]
    tb = '<table class="sm"><tr><th style="width:14%">Field</th><th style="width:23%">Owner · customer</th><th style="width:32%">Vessel · facility</th><th>Scope of supply</th></tr>' + ''.join(f'<tr><td class="g">{a}</td><td class="k">{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in R) + '</table>'
    return page('Reference List', 'Major references', f'<div style="margin-top:22px">{tb}</div>')


# 고객 페이지 하단 타일 6개 (국문 build_sales.STATS6과 같은 내용)
STATS6 = (stat('750<sup>+</sup>', 'Control system projects', 'Marine · energy · plant<br>special machines')
          + stat('7<sup> countries</sup>', 'Overseas production lines', 'Korea · Vietnam · USA · Czechia<br>Hungary · Malaysia · China')
          + stat('6<sup> classes</sup>', 'Class-approved vessels', 'ABS · NK · KR · DNV · LR · BV<br>Newbuilds in China · Japan')
          + stat('2026', 'Innovation Premier 1000', 'Selected by MOTIE', True)
          + stat('<span style="font-size:18px;line-height:1.2;display:block">Hydrogen Specialized Company</span>', 'Designated by MOTIE', 'Hydrogen control · power tech<br>5 registered patents', True)
          + stat('<span style="font-size:18px;line-height:1.2;display:block">Smart Factory</span>', 'Registered supplier', 'Linked to smart factory programs<br>Proposal · application support', True))


def customers_profile():
    L = [LG(x) for x in r.CUSTOMER_LOGOS]
    return page('Customers', 'Building sites together with<br><b>customers in Korea and abroad</b>', '<div class="logos p5">' + ''.join(f'<div><img src="{x}"></div>' for x in L) + '</div>'
        '<div class="row six" style="margin-top:20px">' + STATS6 + '</div>')


def build():
    bs.FOOT = 'DONG-IN ENSIS · Company Profile'   # 영문 소개서 꼬리말 (base 쪽과 같음)
    P = [ref_green(), ref_fgss(), ref_energy(), ref_plant(), ref_servo(), ref_list(), customers_profile()]
    P = [p.replace('{num}', f'{r.START + i:02d}') for i, p in enumerate(P)]
    extra = '.logos.p5 div{width:244px;height:88px;padding:14px 20px} .logos.p5 img{max-height:48px}'
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{bs.CSS}{extra} .page{{word-break:normal;overflow-wrap:break-word}}</style></head><body>{"".join(P)}</body></html>', len(P)


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    h, n = build()
    asyncio.run(bs.render('profile_refs_en', h))
    r.BASE = BASE   # 꼬리말 쪽번호 고치기는 국문과 같은 splice()를 영문 base로 사용
    n = r.splice(f'{ROOT}/out/profile_refs_en.pdf', out)
    # 무손실 압축 저장(모양 그대로, 용량 약 15% 감소)
    import pymupdf as fitz, shutil
    d = fitz.open(out); d.save(out + '.tmp', garbage=4, deflate=True, deflate_images=True, deflate_fonts=True, clean=True); d.close(); shutil.move(out + '.tmp', out)
    print('pages:', n, '->', out, f'({os.path.getsize(out) / 1e6:.2f} MB)')
