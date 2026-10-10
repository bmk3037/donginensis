"""영업용 회사소개서 (전기제어시스템 설계·제작 전문기업)

사용법
  python3 build_sales.py                       # 기본본 → out/sales_base.pdf
  python3 build_sales.py marine                # 조선·해양 고객용 (실적 순서·부제 변경)
  python3 build_sales.py plant --to "OOO 귀중"  # 표지에 제출처 표기
  python3 build_sales.py machine --contact "영업팀 홍길동 과장 · 010-0000-0000 · hong@donginmne.com"

변형(VARIANTS)은 표지 부제 · 대표 실적 6건 · 실적 페이지 순서만 바꿉니다. 문구 자체를 고치려면 아래 데이터를 수정하세요.
"""
import asyncio, os, sys, argparse
import segno
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(ROOT, '..', '..'))
C = ROOT + '/crops'; S = ROOT + '/sales'
LOGO = f'{SITE}/files/brand/logo/DONG-IN-ENSIS_logo_color.svg'
LOGOW = f'{SITE}/files/brand/logo/DONG-IN-ENSIS_logo_white.svg'
I = lambda n: f'{C}/{n}'
X = lambda n: f'{S}/{n}'
LG = lambda n: f'{ROOT}/logos/{n}'  # 고객사 로고 (벡터)
FOOT = 'DONG-IN ENSIS · 회사소개서 · 전기제어시스템 설계·제작'

VARIANTS = {
    'base':    dict(img='cover_base.jpg', sub='선박 · 플랜트 · 산업설비 제어반 — 설계부터 제작 · 시운전까지',
                    order=['green', 'fgss', 'energy', 'plant', 'servo'], hl=['hmg', 'ske', 'fgss', 'hyb', 'kos', 'bog']),
    'marine':  dict(img='cover_marine.jpg', sub='선박용 전기제어시스템 — LNG 연료공급(FGSS) · 하이브리드 추진 통합제어·감시',
                    order=['green', 'fgss', 'plant', 'energy', 'servo'], hl=['fgss', 'hyb', 'bog', 'mastc', 'ske', 'hmg']),
    'plant':   dict(img='cover_plant.jpg', sub='플랜트 · 에너지 설비 제어시스템 — VFD · PLC · UPS 전원설비',
                    order=['energy', 'plant', 'fgss', 'green', 'servo'], hl=['ske', 'hmg', 'ccus', 'kos', 'bog', 'fgss']),
    'machine': dict(img='cover_machine.jpg', sub='산업기계 · 특수기계 제어반 — PLC · 서보 · 모션 제어',
                    order=['servo', 'plant', 'energy', 'fgss', 'green'], hl=['servo', 'smr', 'hmg', 'kos', 'bog', 'ske']),
}

CSS = f"""
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Regular.otf);font-weight:400}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-SemiBold.otf);font-weight:600}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Bold.otf);font-weight:700}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-ExtraBold.otf);font-weight:800}}
*{{box-sizing:border-box;margin:0;padding:0}} html,body{{width:1440px;background:#fff}}
.page{{position:relative;width:1440px;height:810px;overflow:hidden;font-family:P,sans-serif;color:#111B2E;padding:72px 82px 0;page-break-after:always;background:#fff;word-break:keep-all}}
.logo{{position:absolute;right:82px;top:39px;height:25px}}
.eyebrow{{display:flex;align-items:center;gap:14px;font-size:16.5px;font-weight:700;color:#1857A5;height:20px}}
.eyebrow:before{{content:"";width:32px;height:3px;background:#E83E30;display:block}}
h1{{font-size:44px;font-weight:800;line-height:1.24;margin-top:14px;letter-spacing:-0.5px}} h1 b{{color:#1857A5;font-weight:800}}
.foot{{position:absolute;left:82px;right:82px;top:767px;display:flex;justify-content:space-between;font-size:12px;color:#8A94A6}}
.note{{position:absolute;left:82px;right:82px;top:732px;font-size:12px;color:#8A94A6}}
.lead{{font-size:17px;line-height:1.6;color:#4A5568;margin-top:16px;max-width:1150px}}
.row{{display:flex;gap:22px;margin-top:28px;align-items:stretch}} .row.top{{align-items:flex-start}}
.card{{flex:1;border:1px solid #E2E7EE;border-radius:12px;overflow:hidden;background:#fff;display:flex;flex-direction:column}}
.card img.ph{{width:100%;object-fit:cover;display:block}}
.card .b{{padding:16px 20px 18px}}
.tag{{font-size:11.5px;font-weight:800;color:#1857A5;letter-spacing:1px}}
h3{{font-size:20px;font-weight:700;margin:5px 0 8px;line-height:1.3}} h3.s{{font-size:17px;color:#1857A5;margin:0 0 6px}}
ul{{list-style:none}} li{{font-size:14.5px;line-height:1.55;padding-left:14px;position:relative;margin-bottom:5px}}
li:before{{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:#1857A5}}
.own{{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:#5A6577;margin-bottom:4px;height:28px}} .own img{{height:26px;max-width:120px;object-fit:contain}}
table{{width:100%;border-collapse:collapse;font-size:13.5px}}
th{{text-align:left;font-size:12px;font-weight:700;color:#1857A5;background:#EAF1FA;padding:10px 14px;border-top:2px solid #1857A5}}
td{{padding:9px 14px;border-bottom:1px solid #E2E7EE;line-height:1.45;vertical-align:top}} td.k{{font-weight:600}}
table.sm{{font-size:12.6px}} table.sm td{{padding:6px 12px}} table.sm th{{padding:8px 12px}} td.g{{color:#1857A5;font-weight:700;font-size:12px}}
.stat{{flex:1;border:1px solid #E2E7EE;border-radius:12px;padding:20px 22px;background:#fff}}
.stat .n{{font-size:42px;font-weight:800;color:#1857A5;line-height:1.1;letter-spacing:-1px}} .stat .n sup{{color:#E83E30;font-size:22px;vertical-align:top}}
.stat .l{{font-size:16px;font-weight:700;margin-top:8px}} .stat .d{{font-size:13px;color:#5A6577;margin-top:4px;line-height:1.5}}
.stat.dark{{background:#0F3F7E;border-color:#0F3F7E;color:#fff}}
.row.six{{gap:14px}} .row.six .stat{{padding:16px 16px 14px}} .row.six .stat .n{{font-size:34px;line-height:1.15}} .row.six .stat .n sup{{font-size:17px}} .row.six .stat .l{{font-size:14px;margin-top:6px}} .row.six .stat .d{{font-size:11.5px;margin-top:3px;line-height:1.45}} .stat.dark .n{{color:#8FC1FF}} .stat.dark .d{{color:#BFD3EC}}
.box{{background:#F5F7FA;border-radius:12px;padding:20px 24px}} .box.navy{{background:#0F3F7E;color:#fff}} .box.navy li{{color:#D6E4F5}} .box.navy li:before{{background:#8FC1FF}} .box.navy h3{{color:#fff}} .box.navy .tag{{color:#8FC1FF}}
.pill{{display:inline-block;font-size:12.5px;font-weight:600;color:#0F3F7E;background:#EAF1FA;padding:6px 12px;border-radius:20px;margin:0 6px 6px 0}}
.col{{display:flex;flex-direction:column;gap:14px}}
.ph{{object-fit:cover;border-radius:12px;display:block;min-width:0}}
.cap{{font-size:12px;color:#8A94A6;margin-top:6px}}
.tl .r{{display:flex;gap:18px;padding:9px 0;border-bottom:1px solid #E2E7EE;align-items:baseline}}
.tl .y{{width:92px;font-size:18px;font-weight:800;color:#1857A5;flex:none}} .tl .t{{flex:1;font-size:14px;line-height:1.45}}
.steps{{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:28px}}
.st{{border:1px solid #E2E7EE;border-radius:12px;overflow:hidden;background:#fff;position:relative}}
.st img{{width:100%;height:200px;object-fit:cover;display:block}} .st .b{{padding:14px 16px 16px}}
.st .no{{font-size:12px;font-weight:800;color:#E83E30;letter-spacing:1px}} .st h3{{font-size:18px;margin:3px 0 6px}} .st p{{font-size:14px;line-height:1.5;color:#4A5568}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:12px}} .grid3{{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}} .grid3 .gc{{padding:12px 14px}} .grid3 .gc h3{{font-size:14px}} .grid3 .gc p{{font-size:11.5px}}
.tl2 .r{{padding:7px 0}} .tl2 .y{{font-size:16px;line-height:1.2}} .tl2 .t{{font-size:13.2px;line-height:1.45}}
.tl2 .hl{{display:inline-block;margin:0 0 4px -12px;padding:4px 12px 4px 9px;border-left:3px solid #1857A5;border-radius:0 6px 6px 0;background:#E8F1FC;color:#0F3F7E;font-size:14.4px;font-weight:600}} .tl2 .hl b{{font-weight:800;color:#1857A5}}  /* 연혁 강조 줄: 2026 지능형 제어반 출시 */
.gc{{border:1px solid #E2E7EE;border-radius:10px;padding:15px 18px;background:#fff}} .gc.dark{{background:#0F3F7E;border-color:#0F3F7E;color:#fff}}
.gc h3{{font-size:15.5px;margin:0 0 3px}} .gc p{{font-size:12.5px;color:#5A6577;line-height:1.4}} .gc.dark p{{color:#BFD3EC}}
.logos{{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:26px}}
.logos div{{width:308.5px;height:92px;border:1px solid #E2E7EE;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff;padding:16px 26px}}
.logos img{{max-width:100%;max-height:54px;object-fit:contain}}
.spec{{font-size:12.5px;color:#0F3F7E;background:#EAF1FA;border-radius:8px;padding:8px 10px;margin-top:8px;line-height:1.5;font-weight:600}}
.flow{{display:flex;align-items:center;gap:10px;margin-top:18px}} .fb{{flex:1;border:1px solid #E2E7EE;border-radius:10px;padding:12px 10px;text-align:center;background:#fff}}
.fb b{{display:block;font-size:14.5px}} .fb span{{font-size:11.5px;color:#5A6577}} .fb.dark{{background:#1857A5;border-color:#1857A5;color:#fff}} .fb.dark span{{color:#D6E4F5}}
.ar{{width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:11px solid #1857A5;flex:none}}
.ovl{{position:absolute;inset:0}}
.hl{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px}}
.ht{{position:relative;height:226px;border-radius:12px;overflow:hidden;background:#0A2A55}} .ht img{{width:100%;height:100%;object-fit:cover;display:block}}
.ht .sh{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,42,85,0) 25%,rgba(10,42,85,.92) 100%)}}
.ht .tx{{position:absolute;left:20px;right:20px;bottom:16px;color:#fff}} .ht .k{{font-size:11.5px;font-weight:800;letter-spacing:1px;color:#8FC1FF}}
.ht .t{{font-size:21px;font-weight:800;line-height:1.25;margin-top:4px}} .ht .d{{font-size:13.5px;color:#D6E4F5;margin-top:5px;line-height:1.45}}
.bdg{{position:absolute;left:14px;top:14px;background:#E83E30;color:#fff;font-size:13px;font-weight:800;padding:6px 11px;border-radius:6px;letter-spacing:.3px}}
.ms{{display:flex;gap:12px;margin-top:16px}} .ms div{{flex:1;background:#F5F7FA;border-radius:10px;padding:12px 16px}} .ms b{{display:block;font-size:26px;font-weight:800;color:#1857A5;letter-spacing:-.5px}} .ms span{{font-size:12.5px;color:#5A6577}}
"""


def page(eye, title, body, note=None):
    n = f'<div class="note">{note}</div>' if note else ''
    return f'<div class="page"><img class="logo" src="{LOGO}"><div class="eyebrow">{eye}</div><h1>{title}</h1>{body}{n}<div class="foot"><span>{FOOT}</span><span>{{num}}</span></div></div>'
def lis(items): return '<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'
def stat(n, l, d, dark=False): return f'<div class="stat{" dark" if dark else ""}"><div class="n">{n}</div><div class="l">{l}</div><div class="d">{d}</div></div>'
def blk(h, items): return f'<div><h3 class="s">{h}</h3>{lis(items)}</div>'
def card(img, title, items, h=200, tag=None, own=None, spec=None, pos='center', badge=None):
    o = (f'<div class="own">' + (f'<img src="{own[0]}">' if own[0] else '') + f'{own[1]}</div>') if own else ''
    t = f'<div class="tag">{tag}</div>' if tag else ''
    s = f'<div class="spec">{spec}</div>' if spec else ''
    bd = f'<span class="bdg">{badge}</span>' if badge else ''
    return f'<div class="card"><div style="position:relative"><img class="ph" src="{img}" style="height:{h}px;object-position:{pos}">{bd}</div><div class="b">{o}{t}<h3>{title}</h3>{lis(items)}{s}</div></div>'


# ---------------- 고정 페이지 ----------------
def cover(v, to):
    t = f'<div style="position:absolute;left:82px;top:600px;font-size:20px;font-weight:700;color:#fff;border-left:3px solid #E83E30;padding-left:14px">{to}</div>' if to else ''
    return f'''<div class="page" style="background:#0A2A55;color:#fff;padding:0">
<img src="{v['img'] if v['img'].startswith('/') else X(v['img'])}" style="position:absolute;left:0;top:0;width:1440px;height:810px;object-fit:cover;object-position:{v.get('pos','center')}">
<div class="ovl" style="background:linear-gradient(90deg,#0A2A55 0%,rgba(10,42,85,.97) 34%,rgba(10,42,85,.86) 52%,rgba(10,42,85,.30) 100%)"></div>
<img src="{LOGOW}" style="position:absolute;left:82px;top:72px;height:32px">
<div style="position:absolute;left:82px;top:228px;width:800px">
<div style="font-size:14px;font-weight:700;letter-spacing:4px;color:#8FC1FF">COMPANY PROFILE 2026</div>
<div style="font-size:60px;font-weight:800;line-height:1.18;margin-top:18px;letter-spacing:-1px">설비를 제어하고,<br>데이터를 연결하다.</div>
<div style="width:510px;height:5px;background:#E83E30;margin-top:14px"></div>
<div style="font-size:22px;font-weight:700;margin-top:24px">1991년 출발한 전기제어시스템 설계·제작 전문기업</div>
<div style="font-size:17.5px;color:#BFD3EC;margin-top:10px;line-height:1.55;font-weight:500">{v['sub']}</div></div>{t}
<div style="position:absolute;left:82px;top:672px;width:760px;font-size:13.5px;color:#D6E4F5;line-height:1.5"><b style="color:#8FC1FF;letter-spacing:2px;font-size:12px;margin-right:10px">REFERENCES</b>현대자동차그룹 Metaplant America · SK E&amp;S · Atlas Copco · KOS·고려제강 · NTS · GSI · BOBST</div>
<div style="position:absolute;left:82px;right:82px;top:745px;display:flex;justify-content:space-between;font-size:13px;color:#BFD3EC"><span>㈜동인엔시스 · Since 1991 · 부산 · 양산 · 기장</span><span>donginensis.com</span></div></div>'''


def glance():
    return page('At a Glance', '1991년부터, 제어반을<br><b>직접 설계하고 직접 만들어 왔습니다</b>',
        '<p class="lead">선박 기관실 보기 설비부터 해외 생산라인, 수소충전소 전원설비까지. 동인엔시스는 전기 설계 · 판넬 제작 · PLC 프로그램 · 공장검사 · 현장 시운전을 한 회사에서 수행합니다.</p>'
        '<div class="row">' + stat('35<sup>+</sup>', 'Years', '1991년 설립 · 제어기기 공급에서<br>제어시스템 설계·제작으로') + stat('750<sup>+</sup>', 'Projects', '선박 · 에너지 · 플랜트<br>제어시스템 프로젝트 수행')
        + stat('3<sup>개</sup>', 'Factories', '양산 1공장 · 양산 2공장<br>기장공장') + stat('40<sup>+</sup>', 'CE · UL', 'CE · UL 기준<br>설계·제작 솔루션', True) + '</div>'
        '<div style="margin-top:22px">' + ''.join(f'<span class="pill">{x}</span>' for x in ['설계 · 제작 · PLC · FAT · 시운전 일괄 수행', 'ABS · NK · KR · DNV · LR · BV 선급 선박 공급', '해외 7개국 생산라인 제어', 'Schneider Electric 공식 SI 파트너', '혁신프리미어 1000 (2026)', '지능형 제어반 — 제어 + 데이터 수집']) + '</div>'
        f'<div class="row" style="margin-top:14px"><img class="ph" src="{X("fac_yangsan2.jpg")}" style="flex:1;height:200px"><img class="ph" src="{X("svc_mfg1.jpg")}" style="flex:1;height:200px"><img class="ph" src="{X("ship_engroom.jpg")}" style="flex:1;height:200px"><img class="ph" src="{X("ref_hmg1.jpg")}" style="flex:1;height:200px;object-position:center top"></div>',
        '생산공장 · 판넬 제작 · 선박 기관실 제어반 · 해외 생산라인 제어반')


def overview():
    rows = [('회사명', '㈜동인엔시스 DONG-IN ENSIS CO., LTD.'), ('슬로건', '<b>설비를 제어하고, 데이터를 연결하다.</b> <span style="color:#5A6577;font-size:13px">Controlling equipment, connecting data.</span>'),
            ('대표이사', '백민기'), ('설립', '1991년 10월 · 1997년 7월 법인 전환'),
            ('주요 사업', '선박용 · 산업용 전기제어시스템 설계·제작 · 전원설비(VFD · UPS · PDP) · PLC 프로그램 · 시스템 통합 · 지능형 제어반'),
            ('사업장', '본사 부산광역시 부산진구 진연로9번길 47 (양정동)<br>친환경기술연구소 진연로9번길 39, 엔에스타워 8층<br>양산 1·2공장 경상남도 양산시 상북면 공원로 107 · 103-5<br>기장공장 부산광역시 기장군 정관읍 달음산길 20'),
            ('경영시스템', 'ISO 9001 · ISO 14001 · ISO 45001'),
            ('인증·선정', '혁신프리미어 1000 (2026) · 수소전문기업 · 혁신기업 국가대표 1000 · 스마트공장 공급기업<br><span style="color:#5A6577;font-size:13.5px">부산광역시 전략산업 선도기업 · 레전드 50+ 참여기업 · 부산 서비스 강소기업 · 벤처 · 이노비즈 · 메인비즈 · 기업부설연구소</span>'),
            ('파트너', 'Schneider Electric 공식 SI 파트너 · ABB · Fuji Electric · Eaton · Danfoss')]
    tb = '<table style="font-size:15px">' + ''.join(f'<tr><td class="k" style="width:118px;color:#5A6577;padding:12px 14px">{k}</td><td style="padding:12px 14px">{v}</td></tr>' for k, v in rows) + '</table>'
    return page('Company Overview', '회사 개요', '<div class="row top"><div style="width:780px">' + tb + '</div><div class="col" style="flex:1">'
        # 연구소(엔에스타워) 세로 사진을 표 높이(≈551px)에 맞춰 건물 전체가 잘리지 않게(contain) 보이고, WHAT WE DO 박스는 옅은 반투명 음영으로 겹쳐 건물이 비치게 함
        f'<div style="position:relative;height:551px;border-radius:12px;overflow:hidden;background:#0A2A55"><img src="{SITE}/img/sites/hq-ns-tower.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">'
        '<div style="position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,rgba(10,42,85,.28) 0%,rgba(10,42,85,.62) 100%);color:#fff;padding:22px 22px 18px;text-shadow:0 1px 3px rgba(0,0,0,.45)"><div class="tag" style="color:#BFD3EC">WHAT WE DO</div><p style="font-size:16.5px;font-weight:700;line-height:1.5;margin-top:6px">고객 설비에 맞는 제어반을 설계하고,<br>직접 제작해 현장 시운전까지 책임집니다.</p>'
        '<p style="font-size:12.5px;color:#E3EDF9;margin-top:8px;line-height:1.5">설비를 제어하고, 데이터를 연결하다. · 친환경기술연구소 엔에스타워 (부산 양정동)</p></div></div></div></div>')


def scope():
    return page('Business Scope', '사업 영역', '<div class="row">'
        + card(X('ship_engroom.jpg'), '선박용 제어시스템', ['기관실 펌프·팬 등 보기 설비 제어반', 'LNG 연료공급(FGSS) · BOG 압축기 제어', '하이브리드 추진 통합제어·감시시스템', '제어 콘솔 · 시스템 판넬'], 245, 'MARINE')
        + card(X('ref_hmg2.jpg'), '산업·플랜트 제어시스템', ['생산라인 · 플랜트 통합 제어시스템', '신선·연선·도금·열처리 라인 제어', '압축기 등 OEM 설비 제어반', '해외 현장 공급 · 시운전 지원'], 245, 'PLANT')
        + card(X('ref_doffer2.jpg'), '특수기계 서보·모션 제어', ['포장 · 섬유 · 생산설비 모션 제어', 'PLC · 모션 컨트롤러 · 서보 최대 13축', '인버터 · HMI · 감시 PC 연동', 'CANopen · Sercos III · Modbus TCP'], 245, 'MACHINE')
        + card(X('ref_ske_station.jpg'), '전원·에너지 설비', ['VFD 판넬 · UPS · PDP 전원설비', '액화수소충전소 VFD · PLC · UPS 제어', '연료전지 발전소 CCUS BOP 제어', '추진모터 드라이브 · 주배전반 · PMS'], 245, 'POWER')
        + '</div>', '※ 고객 사양서에 따라 설계하며, 전기 설계 · 부품 선정 · 판넬 제작 · PLC/HMI 프로그램 · 공장검사 · 시운전까지 일괄 또는 구간별로 수행합니다.')


def service():
    S5 = [('svc_design.jpg', '01 · DESIGN', '전기 설계', '사양 검토 · 회로도 · 판넬 배치도 · 부품 선정. CE · UL 기준 대응'),
          ('svc_mfg2.jpg', '02 · MANUFACTURING', '판넬 제작·배선', '자체 공장에서 판넬 제작 · 배선 · 라벨링까지 직접 수행'),
          ('svc_sw.jpg', '03 · SOFTWARE', 'PLC · HMI 프로그램', '제어 로직 · 운전 화면 · 성능 감시 소프트웨어 자체 개발'),
          ('ship_fat.jpg', '04 · FAT', '공장검사', '출하 전 전용 테스트 라인에서 기능 · 인터록 · I/O 검사'),
          ('svc_install.jpg', '05 · COMMISSIONING', '설치 · 시운전', '현장 설치 · 결선 확인 · 시운전 · 운전 교육')]
    st = ''.join(f'<div class="st"><img src="{X(a)}"><div class="b"><div class="no">{b}</div><h3>{c}</h3><p>{d}</p></div></div>' for a, b, c, d in S5)
    return page('One-Stop Engineering', '설계부터 시운전까지,<br><b>한 회사가 끝까지 책임집니다</b>', f'<div class="steps">{st}</div>'
        '<div class="box" style="margin-top:22px;display:flex;align-items:center;gap:28px;padding:18px 26px"><div style="font-size:17px;font-weight:800;color:#0F3F7E;flex:none">06 · 사후관리</div>'
        '<div style="font-size:14px;line-height:1.55;color:#4A5568">정기 점검 · 부품 교체 · 프로그램 수정 · 현장 대응. 제어반을 직접 설계·제작한 회사가 도면과 프로그램을 보유하고 유지관리까지 맡습니다.</div></div>')


def factory():
    return page('Manufacturing · Quality', '직접 제작하고,<br><b>검사한 뒤 출하합니다</b>', '<div class="row top"><div style="width:620px"><div style="display:flex;gap:14px">'
        f'<img class="ph" src="{X("svc_mfg2.jpg")}" style="flex:1;height:225px"><img class="ph" src="{X("svc_mfg1.jpg")}" style="flex:1;height:225px"></div>'
        f'<div style="display:flex;gap:14px;margin-top:14px"><img class="ph" src="{X("ship_fat.jpg")}" style="flex:1;height:225px"><img class="ph" src="{X("svc_test.jpg")}" style="flex:1;height:225px"></div>'
        '<div class="cap">판넬 배선 · 판넬 제작 · 공장검사(FAT) · 추진시스템 시험</div></div>'
        '<div class="col" style="flex:1;gap:20px">'
        + blk('생산 거점', ['양산 1공장 · 양산 2공장 (2023년 준공) · 기장공장', '본사 · 친환경기술연구소 — 부산 양정동 (엔에스타워)'])
        + blk('품질 체계', ['FAT 전용 테스트 라인 — 출하 전 공장검사 후 현장 설치', 'CE · UL 기준 설계·제작 체계 · 40+ CE·UL 솔루션', 'ISO 9001 품질 · ISO 14001 환경 · ISO 45001 안전보건'])
        + blk('선박 · 해외 대응', ['ABS · NK · KR · DNV · LR · BV 선급 선박 제어시스템 공급', '중국 · 일본 조선소 신조선 FGSS 제어 공급', '미국 · 베트남 · 유럽 · 동남아 생산라인 공급'])
        + blk('부품 · 기술 파트너', ['Schneider Electric 공식 SI 파트너', 'ABB · Fuji Electric · Eaton · Danfoss'])
        + '</div></div>')


# ---------------- 실적 페이지 ----------------
HL = dict(
    hmg=(X('ref_hmg1.jpg'), 'PLANT · USA', '현대자동차그룹<br>Metaplant America', '미국 전기차 생산라인 통합 제어시스템', 'object-fit:contain'),
    ske=(X('ref_ske_station.jpg'), 'HYDROGEN · 2024', 'SK E&amp;S 액화수소충전소', 'VFD · PLC · UPS 제어시스템'),
    fgss=(X('ship_pctc.jpg'), 'MARINE · ABS · NK · KR · DNV · LR · BV', 'LNG 연료공급(FGSS) 제어', 'NTS · Namura · GSI 신조선 — 벌크선 13척 등'),
    hyb=(I('p39_04_photo.jpg'), 'GREEN SHIP · 2023', '충남병원선 · 경남청정호', '하이브리드 추진 · 통합제어·감시시스템'),
    kos=(X('ref_kiswire.jpg'), 'PLANT · 7 COUNTRIES', 'KOS · 고려제강(Kiswire)', '신선 · 연선 · 도금 · 열처리 라인 제어'),
    bog=(X('ref_atlas1.jpg'), 'OEM · COMPRESSOR', 'Atlas Copco · SB선보', 'LNG BOG 압축기 제어시스템'),
    ccus=(X('ref_ccus1.jpg'), 'POWER PLANT', '연료전지 발전소 CCUS', 'BOP 제어시스템 · SK에코플랜트'),
    mastc=(X('ref_mastc.jpg'), 'TEST FACILITY', '해양실증기술센터(MASTC)', '추진모터 드라이브 · 주배전반 · PMS'),
    servo=(X('ref_bobst1.jpg'), 'MACHINE · SERVO', '밥스트코리아 (BOBST)', '포장기계 특수 기계 제어시스템'),
    smr=(X('ref_smr.jpg'), 'NUCLEAR · SERVO', '파워엠엔씨 SMR 연료교체기', 'M580 PLC · 서보 3축 · 감시 PC'))


def highlights(v):
    t = ''.join(f'<div class="ht"><img src="{e[0]}" style="{e[4] if len(e) > 4 else ""}"><div class="sh"></div><div class="tx"><div class="k">{e[1]}</div><div class="t">{e[2]}</div><div class="d">{e[3]}</div></div></div>' for e in (HL[k] for k in v['hl']))
    return page('Reference Highlights', '국내외 대표 현장에서<br><b>검증된 제어시스템</b>', f'<div class="hl">{t}</div>',
        '※ 750건 이상의 제어시스템 프로젝트 중 대표 실적 · 상세 내용은 다음 페이지부터 이어집니다.')


def ref_green():
    ships = [(I('p39_04_photo.jpg'), I('p40_06_logo.jpg'), '충청남도', '충남병원선 · G/T 330톤급', ['디젤엔진 + 전기모터 하이브리드 추진', '추진시스템 · 통합제어·감시시스템 공급', '2023년 8월 취항 · 친환경 선박 건조 공로 표창']),
             (I('p37_04_photo.jpg'), I('p37_06_logo.jpg'), '경상남도', '경남청정호 · G/T 120톤급 환경정화선', ['디젤엔진 + 전기모터 하이브리드 추진', '추진시스템 · 통합제어·감시시스템 공급', '2023년 4월 취항']),
             (I('p36_04_photo.jpg'), I('p36_10_logo.jpg'), '해양수산부 여수지방해양수산청', 'G/T 280톤급 항만청소선', ['디젤 · LNG 엔진 하이브리드 추진', '연료가스공급시스템(FGSS) 제어시스템 공급', 'LNG 연료 선박의 가스 안전 제어'])]
    return page('Major Reference · Green Ship', '친환경 선박 하이브리드 추진,<br><b>통합제어·감시시스템을 공급했습니다</b>',
        '<div class="row">' + ''.join(card(p, t, l, 230, own=(lg, o), badge=b) for (p, lg, o, t, l), b in zip(ships, ['2023 취항', '2023 취항', 'LNG 하이브리드'])).replace('height:230px','height:280px') + '</div>',
        '※ 해양수산부 하이브리드 시범어선 디젤·전기모터 통합제어 적용(2026) · 국가 R&amp;D: 전기복합 추진어선(2021~25), 안전기반 소형 수소추진선박(2022~26)')


def ref_fgss():
    rows = [('Jiangsu New Times Shipbuilding (NTS)', 'EPS-NTS 210,000 / 209,000 DWT 벌크선 13척', 'Liberia · ABS', 'FGSS 글리콜워터 펌프 제어 · 유압 동력 공급 시스템'),
            ('Namura Shipbuilding', '95,000 DWT 벌크선 (S496)', 'Liberia · NK', 'FGSS 글리콜워터 펌프 제어시스템'),
            ('GSI (广船国际)', 'HMM 8,600 CEU DF 자동차운반선 3척', 'Panama · KR', 'FGSS 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
            ('GSI (广船国际)', 'EPS/Chandris 111K DWT LNG DF 원유·제품 운반선', 'Taiwan · KR', 'BOG 압축기 · 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
            ('삼성중공업', 'FGSS 시스템 시험설비', '—', 'G/W(글리콜워터) 히터 제어시스템')]
    tb = '<table><tr><th style="width:25%">조선소 · 발주처</th><th style="width:31%">선박 · 설비</th><th style="width:14%">선적 · 선급</th><th>공급 범위</th></tr>' + ''.join(f'<tr><td class="k">{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in rows) + '</table>'
    return page('Major Reference · LNG Fuel Gas Supply System', 'LNG 연료공급시스템(FGSS) 제어,<br><b>신조선에 반복 공급하고 있습니다</b>',
        f'<div class="row top"><div style="flex:1">{tb}<div class="ms"><div><b>13척</b><span>NTS 210K · 209K DWT 벌크선</span></div><div><b>ABS · NK · KR</b><span>FGSS 공급선 선급</span></div><div><b>중국 · 일본</b><span>NTS · Namura · GSI 조선소</span></div></div></div><div class="col" style="width:330px">'
        f'<img class="ph" src="{X("ship_pctc.jpg")}" style="width:100%;height:190px"><img class="ph" src="{X("ship_tanker.jpg")}" style="width:100%;height:190px"><div class="cap" style="margin-top:-6px">8,600 CEU DF 자동차운반선 · 111K DWT LNG DF 운반선</div></div></div>',
        '※ 선박 사진은 해당 선형 이미지입니다. LNG 연료 선박의 가스 공급·안전 제어 경험을 수소 설비 제어로 확장하고 있습니다.')


def ref_energy():
    return page('Major Reference · Energy', '수소충전소 · 발전소 · 시험설비,<br><b>에너지 설비 제어를 공급했습니다</b>', '<div class="row">'
        + card(X('ref_ske_station.jpg'), 'SK E&amp;S 액화수소충전소', ['VFD · PLC · UPS 제어시스템 공급 (2024)', '상용 충전소 운영 실증', '수소 제어·전력 기술 특허 5건'], 300, own=(I('p20_04_logo.jpg'), ''), badge='2024 · 액화수소')
        + card(X('ref_ccus1.jpg'), '연료전지 발전소 CCUS BOP 제어', ['한국남부발전 연료전지 발전소', '탄소 포집·활용·저장(CCUS) 설비 BOP 제어시스템', 'SK에코플랜트'], 300, own=(I('p21_06_logo.jpg'), ''))
        + card(X('ref_mastc.jpg'), '해양실증기술센터(MASTC) 시험설비', ['친환경 선박 추진시스템 시험설비', '400kW급 추진모터 드라이브 · 주배전반 · PMS', '로드뱅크 · 배터리 충방전(DC/DC) · HiL'], 300, own=(None, '한국해양대학교 · 한국선급 · KOMERI'))
        + '</div>')


def ref_plant():
    return page('Major Reference · Plant &amp; OEM', '해외 생산라인부터 압축기 OEM까지,<br><b>산업 플랜트 제어 실적</b>', '<div class="row">'
        + card(X('ref_hmg2.jpg'), '현대자동차그룹 Metaplant America', ['미국 전기차 생산라인', '통합 제어시스템 제작·공급'], 250, 'PLANT · USA', badge='미국')
        + card(X('ref_kiswire.jpg'), 'KOS · 고려제강(Kiswire)', ['신선기 · 연선기 · 도금 · 열처리 라인', '한국 · 베트남 · 미국 · 체코 · 헝가리 · 말레이시아 · 중국'], 250, 'PLANT · 7 COUNTRIES')
        + card(X('ref_atlas2.jpg'), 'Atlas Copco', ['LNG 밸류체인용 고성능 BOG 압축기', '제어시스템 엔지니어링 · 글로벌 지원'], 250, 'OEM · COMPRESSOR')
        + card(X('ref_sb_bog.jpg'), 'SB선보', ['LNG 운반선용 BOG 압축기', '제어시스템 설계 · 공급 · 시운전'], 250, 'OEM · COMPRESSOR')
        + '</div>')


def ref_servo():
    return page('Major Reference · Servo &amp; Motion', '다축 서보 · 모션 제어,<br><b>특수기계 제어시스템</b>', '<div class="row">'
        + card(X('ref_bobst1.jpg'), '밥스트코리아 (BOBST)', ['포장기계', '특수 기계 제어시스템 엔지니어링 · 공급'], 228, 'PACKAGING', spec='서보 · 모션 제어')
        + card(X('ref_doffer2.jpg'), '대한화섬 자동 도퍼', ['섬유 공정 Auto Doffer', 'PLC · HMI 제어시스템'], 228, 'TEXTILE', spec='M340 PLC · 서보 8축(CANopen)<br>ATV312 인버터 2대 · HMI')
        + card(X('ref_smr.jpg'), '파워엠엔씨 SMR 연료교체기', ['소형모듈원자로 연료교체기', 'PLC · 감시 PC 제어시스템'], 228, 'NUCLEAR', spec='M580 PLC · 서보 3축<br>ATV930 인버터 · 감시 PC', pos='center 35%', badge='SMR')
        + card(X('ref_dms.jpg'), 'DMS 고밀도 세정기', ['High Density Cleaner', '분산 제어 · HMI'], 228, 'CLEANER', spec='분산 PLC 5대 · 서보(CANopen)<br>Modbus TCP · HMI')
        + '</div>', '※ IGis 단열 스페이서(Thermal Plastic Spacer) 생산설비 — M262 모션 컨트롤러 · 서보 13축(Sercos III) · 인버터 2축 제어 · Schneider Electric 플랫폼 기준')


REFS = dict(green=ref_green, fgss=ref_fgss, energy=ref_energy, plant=ref_plant, servo=ref_servo)


def ref_list():
    R = [('친환경 선박', '충청남도', '충남병원선 · G/T 330톤급', '하이브리드 추진 · 통합제어·감시시스템'),
         ('', '경상남도', '경남청정호 · G/T 120톤급', '하이브리드 추진 · 통합제어·감시시스템'),
         ('', '여수지방해양수산청', '항만청소선 · G/T 280톤급', '디젤·LNG 하이브리드 · FGSS 제어'),
         ('LNG FGSS', 'NTS · Namura · GSI', '벌크선 · 자동차운반선 · LNG DF 운반선', 'FGSS 글리콜 펌프 · BOG · L.O 펌프·오일히터 제어'),
         ('', '삼성중공업', 'FGSS 시스템 시험설비', 'G/W 히터 제어시스템'),
         ('압축기 OEM', 'Atlas Copco · SB선보', 'LNG BOG 압축기', '제어시스템 엔지니어링 · 공급 · 시운전'),
         ('수소 · 에너지', 'SK E&amp;S', '액화수소충전소', 'VFD · PLC · UPS 제어시스템'),
         ('', 'SK에코플랜트', '한국남부발전 연료전지 발전소 CCUS', 'BOP 제어시스템'),
         ('', 'MASTC (한국해양대·KR·KOMERI)', '친환경 선박 추진시스템 시험설비', '추진모터 드라이브 · 주배전반 · PMS · HiL'),
         ('산업 플랜트', '현대자동차그룹', 'Metaplant America (미국) 전기차 생산라인', '통합 제어시스템'),
         ('', 'KOS · 고려제강(Kiswire)', '신선 · 연선 · 도금 · 열처리 라인 (7개국)', '제어시스템'),
         ('', '동화기업', '포르말린 수지 플랜트', '플랜트 전체 제어시스템 설계·제작'),
         ('특수기계', '밥스트코리아 (BOBST)', '포장기계', '특수 기계 제어시스템'),
         ('', '대한화섬 · DMS · IGis', '자동 도퍼 · 고밀도 세정기 · 단열 스페이서 설비', 'PLC · 서보 최대 13축 · 인버터 · HMI'),
         ('', '파워엠엔씨', 'SMR 연료교체기', 'PLC · 서보 3축 · 인버터 · 감시 PC'),
         ('선박 제어반', 'KSB', '선박용 설비', '제어 콘솔 · 시스템 판넬'),
         ('국가 R&amp;D', '해양수산부 · KIMST', '전기복합 추진어선 · 소형 수소추진선박', '추진모터 드라이브 · 통합제어·감시')]
    tb = '<table class="sm"><tr><th style="width:13%">분야</th><th style="width:22%">발주처 · 고객</th><th style="width:33%">선박 · 설비</th><th>공급 범위</th></tr>' + ''.join(f'<tr><td class="g">{a}</td><td class="k">{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in R) + '</table>'
    return page('Reference List', '주요 납품 실적', f'<div style="margin-top:22px">{tb}</div>')


def customers():
    L = [LG(x) for x in ['atlas.svg', 'bobst.svg', 'hhitm.svg', 'sunbo.png', 'oriental.svg', 'hiair.svg', 'nikkiso.svg', 'skens.svg', 'kiswire.svg', 'kos.svg', 'kte.svg', 'wilo.svg']]
    return page('Customers', '국내외 고객과 함께<br><b>현장을 만들어 왔습니다</b>', '<div class="logos">' + ''.join(f'<div><img src="{x}"></div>' for x in L) + '</div>'
        '<div class="row six" style="margin-top:20px">' + STATS6 + '</div>')


# 고객 페이지 하단 타일 6개 (영업용 · 통합본 공통)
STATS6 = (stat('750<sup>+</sup>', '제어시스템 프로젝트', '선박 · 에너지 · 플랜트<br>특수기계')
          + stat('7<sup>개국</sup>', '해외 생산라인 공급', '한국 · 베트남 · 미국 · 체코<br>헝가리 · 말레이시아 · 중국')
          + stat('6<sup>개</sup>', '선급 선박 공급', 'ABS · NK · KR · DNV · LR · BV<br>중국 · 일본 조선소 신조선')
          + stat('2026', '혁신프리미어 1000', '산업통상자원부 선정', True)
          + stat('<span style="font-size:26px">수소전문기업</span>', '산업통상자원부 지정', '수소 제어·전력 기술<br>특허 5건 등록', True)
          + stat('<span style="font-size:26px">스마트공장</span>', '공급기업', '스마트공장 지원사업 연계<br>구성안 · 신청 자료 지원', True))


def icp():
    gen = '<div class="flow" style="margin-top:8px"><div class="fb"><b>설비 · 센서</b></div><div class="ar" style="border-left-color:#B8C2D0"></div><div class="fb"><b>제어 PLC</b></div><div class="ar" style="border-left-color:#B8C2D0"></div><div class="fb" style="border:2px dashed #E83E30"><b style="color:#E83E30">별도 게이트웨이 · 산업용 PC</b><span>추가 장비 · 설치 · 관리</span></div><div class="ar" style="border-left-color:#B8C2D0"></div><div class="fb"><b>서버</b></div></div>'
    our = ('<div class="flow" style="margin-top:8px"><div class="fb"><b>설비 · 센서</b><span>모터 · 펌프 · 팬</span></div><div class="ar"></div><div class="fb dark" style="flex:1.5"><b>지능형 제어반</b><span>PLC 제어 + 데이터 수집</span></div><div class="ar"></div>'
           '<div class="fb"><b>MQTT · TLS</b><span>암호화 전송</span></div><div class="ar"></div><div class="fb"><b>DataHub</b><span>클라우드 / 사내 서버</span></div><div class="ar"></div><div class="fb"><b>대시보드 · API</b><span>MES · AI 연동</span></div></div>')
    pts = ['모터 권선온도 U·V·W', '베어링 온도', '회전속도', '전압 · 전류 · 전력량', '진동', '대기 온습도', '운전 상태신호']
    return page('Intelligent Control Panel', '35년 제어반 기술 위에,<br><b>설비 데이터를 더했습니다</b>', '<div class="row top" style="margin-top:22px"><div style="flex:1">'
        '<p class="lead" style="margin-top:0;font-size:16px">지능형 제어반은 PLC로 설비를 제어하면서 운전 데이터를 함께 수집하고, 별도 수집장비 없이 클라우드나 고객사 서버까지 안전하게 연결합니다. 기존 제어반과 같은 방식으로 설계·제작하며, 필요한 현장에 선택 적용합니다.</p>'
        '<div style="margin-top:16px;font-size:13px;font-weight:700;color:#8A94A6">일반적인 데이터 수집 구성</div>' + gen +
        '<div style="margin-top:14px;font-size:13px;font-weight:700;color:#1857A5">동인엔시스 지능형 제어반 — 별도 수집장비 없음</div>' + our +
        '<div style="margin-top:16px">' + ''.join(f'<span class="pill">{x}</span>' for x in pts) + '</div>'
        '<div class="grid2" style="margin-top:6px">'
        '<div class="gc"><h3>제어 권한은 현장 PLC에</h3><p>인터록과 최종 제어는 PLC가 보유하고, 서버는 설비를 직접 제어하지 않습니다.</p></div>'
        '<div class="gc"><h3>표준 데이터 구조 · REST API</h3><p>설비가 늘어나도 같은 구조로 저장하고, MES · AI · 디지털트윈에 바로 연동합니다.</p></div></div></div>'
        f'<div style="width:420px"><img class="ph" src="{SITE}/img/field-panel.jpg" style="width:420px;height:470px;object-position:left center"><div class="cap">펌프실에 설치된 지능형 제어반 · 이해를 돕기 위한 연출 이미지</div></div></div>')


def icp2():
    steps = [('STEP 1 · 1주', '현장 분석', '대상 설비 · 기존 제어반 · 수집 포인트 확인'), ('STEP 2 · 5주', '제어반 제작', '설계 · 제작 · 배선 · PLC 프로그램 · 공장검사'),
             ('STEP 3 · 2주', '서버 구성', 'MQTT/TLS 연결 · DataHub · 대시보드 설정'), ('STEP 4 · 2~4주', '시운전 · 안정화', '현장 시운전 · 알람 기준 설정 · 운영 교육')]
    st = ''.join(f'<div class="fb" style="text-align:left;padding:14px 16px"><span style="color:#E83E30;font-weight:800;font-size:12px">{a}</span><b style="font-size:16px;margin:3px 0 4px">{b}</b><span style="font-size:12.5px;line-height:1.45;display:block">{c}</span></div>' + ('<div class="ar"></div>' if i < 3 else '') for i, (a, b, c) in enumerate(steps))
    return page('Intelligent Control Panel · 도입', '제어반 교체만으로<br><b>데이터 기반 설비 관리를 시작합니다</b>',
        '<div class="row" style="margin-top:24px">' + stat('24<sup>h</sup>', '설비 상태 기록', '온도 · 전류 · 진동 · 회전속도를<br>자동 수집해 이력으로 보관')
        + stat('<span style="font-size:34px">알람</span>', '이상 징후 먼저 통보', '기준을 벗어나면 웹 · 모바일로 알려<br>고장으로 번지기 전에 대응')
        + stat('1<sup>면</sup>', '제어반 하나로', '제어반 교체와 데이터 구축을<br>별도 수집장비 없이 한 번에', True) + '</div>'
        f'<div class="flow" style="margin-top:20px">{st}<div style="flex:none;width:150px;text-align:center"><div style="font-size:12px;color:#5A6577;font-weight:700">표준 구축 기간</div><div style="font-size:30px;font-weight:800;color:#1857A5">9~15주</div></div></div>'
        '<div class="row" style="margin-top:20px">'
        '<div class="box" style="flex:1;padding:16px 20px"><h3 class="s">구축 방식</h3>' + lis(['<b>클라우드형</b> — 별도 서버 없이 빠르게, 여러 현장을 한 화면에서', '<b>온프레미스형</b> — 고객사 서버 · 사내망, 외부 인터넷 없이 운영']) + '</div>'
        '<div class="box" style="flex:1;padding:16px 20px"><h3 class="s">적용 분야</h3>' + lis(['조선·해양 · 수소·에너지 · 제조 · 데이터센터', '펌프 · 송풍기 · 팬 · 압축기 · 컨베이어 · 크레인']) + '</div>'
        '<div class="box navy" style="flex:1;padding:16px 20px"><h3 class="s" style="color:#8FC1FF">단계 도입 · 지원사업</h3>' + lis(['설비 1~2대로 시작해 같은 구조로 확대', '스마트공장 공급기업 — 구성안 · 신청 자료 지원']) + '</div></div>',
        '※ 기준값 알람은 도입 직후부터 사용합니다. 정상 운전 데이터를 학습하는 AI 이상탐지는 PoC 단계(2026)이며, 실데이터 기반 예지보전으로 고도화할 계획입니다(2027). 구축 기간은 현장 조건에 따라 달라질 수 있습니다.')


def history():
    # 연혁: 2020년 이후를 자세히, 그 이전은 한 줄로 (홈페이지 회사소개 연혁 기준)
    J = [('2026', ['<span class="hl"><b>지능형 제어반 출시</b> · 산업설비 데이터 인프라 사업 진출</span>', '산업통상자원부 혁신프리미어 1000 선정 · 수소전문기업 등록', '중소벤처기업부 스마트공장 공급기업 등록', '액화수소충전소 제어시스템 관련 특허 5건 등록']),
         ('2025', ['ISO 45001 안전보건경영시스템 인증', '벤처기업 · 메인비즈 · 이노비즈 인증 · 예비수소전문기업 선정']),
         ('2024', ['SK E&amp;S 액화수소충전소 VFD · PLC · UPS 제어시스템 공급', '부산시 전략산업선도기업 · 지역특화 레전드50+ 선정', '국립한국해양대학교 산학협력 가족회사 협약']),
         ('2023', ['충남병원선 · 경남청정호 하이브리드 추진 통합제어 공급 · 양산 제2공장 준공', '해양수산부 「안전기반 소형 수소추진 기술개발 및 실증」 참여', '부산시 히든챔피언 · 서비스 강소기업 선정']),
         ('2022', ['해양수산부 국가대표 혁신기업 선정 · 부산시 수소동맹 참여기업', '우수기술기업(TCB) T-4 인증']),
         ('2021', ['해양수산부 「전기복합 추진어선 핵심 기자재 기술개발」 참여']),
         ('2020', ['친환경기술연구소 설립 (기업부설연구소)', 'Danfoss Drive · Soft Starter, ABB 저압 배전 Agency']),
         ('1991<br>~2018', ['1991 회사 설립 · 1997 법인 전환 (Siemens Agency) · 2001 Fuji Electric Agency', '2006 산업용·해상용 전기제어시스템 사업 개시 · 2008~09 제1·2공장 건립', '2014 국립한국해양대학교 MOU · 2018 ISO 9001 · 14001 인증 · 엔에스타워 건립'])]
    # 인증·선정: 홈페이지 인증 항목 + 자료실 인증서 전부
    Cs = [('혁신프리미어 1000', '산업통상자원부 · 2026', 1), ('수소전문기업', '산업통상자원부 · 2026', 1), ('스마트공장 공급기업', '중소벤처기업부 · 2026', 1),
          ('ISO 9001 · 14001 · 45001', '품질 · 환경 · 안전보건 경영시스템', 0), ('기업부설연구소', '친환경기술연구소 · 2020', 0), ('벤처 · 이노비즈 · 메인비즈', '중소벤처기업부 · 2025', 0),
          ('국가대표 혁신기업', '해양수산부 · 2022', 0), ('지역특화 레전드50+', '부산광역시 · 2024', 0), ('전략산업선도기업', '부산광역시 · 미래모빌리티 · 2024', 0),
          ('히든챔피언', '부산광역시 · 2023', 0), ('서비스 강소기업', '부산광역시 · 2023', 0), ('강소기업', '고용노동부 · 2024', 0),
          ('우수기술기업 T-4', '기술신용평가(TCB) · 2022', 0), ('특허 등록 5건', '특허청 · 액화수소충전소 제어시스템', 0), ('수소동맹 참여기업', '부산광역시 · 2022', 0)]
    tl = '<div class="tl tl2">' + ''.join(f'<div class="r"><div class="y">{y}</div><div class="t">{"<br>".join(t)}</div></div>' for y, t in J) + '</div>'
    g = '<div class="grid3">' + ''.join(f'<div class="gc{" dark" if d else ""}"><h3>{a}</h3><p>{b}</p></div>' for a, b, d in Cs) + '</div>'
    return page('History · Certification', '연혁 · 인증', f'<div class="row top" style="margin-top:20px"><div style="flex:1">{tl}</div><div style="width:600px">{g}</div></div>',
        '※ 연혁 · 인증은 홈페이지 회사소개(donginensis.com/company.html) 기준이며, 인증서 원본은 자료실에서 확인할 수 있습니다.')


def contact(person):
    qr = segno.make('https://donginensis.com/?qr=sp', error='m')
    qsvg = f'{ROOT}/out/qr_sales.svg'; qr.save(qsvg, scale=10, border=0, dark='#111B2E')
    p = f'<br>{person}' if person else ''
    return f'''<div class="page" style="background:#0F3F7E;color:#fff;padding:0">
<img src="{LOGOW}" style="position:absolute;left:82px;top:72px;height:32px">
<div style="position:absolute;left:82px;top:210px;width:900px"><div style="font-size:46px;font-weight:800;line-height:1.24">설계에서 시운전까지,<br><span style="color:#8FC1FF">제어시스템은 동인엔시스와 함께.</span></div>
<div style="font-size:17px;color:#BFD3EC;margin-top:20px;line-height:1.6">사양서 · 도면 · I/O 리스트를 보내 주시면 검토 후 구성안과 견적을 드립니다.<br>기존 설비의 지능형 제어반 적용 가능성 진단도 함께 해 드립니다.</div></div>
<div style="position:absolute;right:82px;top:200px;background:#fff;border-radius:12px;padding:14px;text-align:center"><img src="{qsvg}" style="width:130px;height:130px;display:block"><div style="font-size:11.5px;color:#0F3F7E;margin-top:8px;font-weight:700">donginensis.com</div></div>
<div style="position:absolute;left:82px;right:82px;top:540px;border-top:1px solid rgba(191,211,236,.35);padding-top:26px;display:flex;gap:60px">
<div style="flex:1"><div class="tag" style="color:#8FC1FF">OFFICES</div><p style="font-size:14px;line-height:1.7;color:#D6E4F5;margin-top:6px">본사 부산광역시 부산진구 진연로9번길 47 (양정동)<br>친환경기술연구소 부산광역시 부산진구 진연로9번길 39, 엔에스타워 8층<br>양산 1·2공장 경상남도 양산시 상북면 공원로 107 · 103-5<br>기장공장 부산광역시 기장군 정관읍 달음산길 20</p></div>
<div style="width:440px"><div class="tag" style="color:#8FC1FF">CONTACT</div><p style="font-size:14px;line-height:1.7;color:#D6E4F5;margin-top:6px">TEL 051-862-3668 · FAX 051-862-3325<br>E-mail dongin@donginmne.com<br>Web donginensis.com{p}</p></div></div>
<div style="position:absolute;left:82px;top:767px;font-size:12px;color:#8FC1FF">설비를 제어하고, 데이터를 연결하다.</div></div>'''


def build(vname, to=None, person=None):
    v = VARIANTS[vname]
    # 실적 우선 구성: 표지 → 한눈에 → 대표 실적 → 실적 상세 → 고객 → 역량(사업·공정·공장) → 지능형 제어반 2장 → 개요·연혁 → 연락처
    P = [cover(v, to), glance(), highlights(v)] + [REFS[k]() for k in v['order']] + [ref_list(), customers(), scope(), service(), factory(), icp(), icp2(), overview(), history(), contact(person)]
    P = [p.replace('{num}', f'{i + 1:02d}') for i, p in enumerate(P)]
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(P)}</body></html>', len(P)


async def render(name, html, png=False):
    hp = f'{ROOT}/out/{name}.html'; open(hp, 'w').write(html)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg = await b.new_page(viewport={'width': 1440, 'height': 810})
        await pg.goto(f'file://{hp}'); await pg.wait_for_timeout(1500)
        ov = await pg.evaluate('''()=>[...document.querySelectorAll('.page')].map((p,i)=>{let r=p.getBoundingClientRect();let m=0;p.querySelectorAll('*').forEach(e=>{if(e.closest('.foot')||e.classList.contains('foot')||e.classList.contains('note')||e.closest('.note'))return;let b=e.getBoundingClientRect();if(b.bottom-r.top>m)m=b.bottom-r.top});return [i+1,Math.round(m)]})''')
        print('max-bottom per page:', ov)
        if png: await pg.screenshot(path=f'{ROOT}/out/{name}.png', full_page=True)
        await pg.pdf(path=f'{ROOT}/out/{name}.pdf', width='20in', height='11.25in', scale=1.3333, print_background=True, margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        await b.close()


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('variant', nargs='?', default='base', choices=list(VARIANTS))
    ap.add_argument('--to', help='표지 제출처 (예: "OOO 귀중")')
    ap.add_argument('--contact', help='마지막 장 담당자 줄')
    ap.add_argument('--png', action='store_true')
    a = ap.parse_args()
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    h, n = build(a.variant, a.to, a.contact)
    asyncio.run(render(f'sales_{a.variant}', h, a.png)); print('done', n, 'pages')
