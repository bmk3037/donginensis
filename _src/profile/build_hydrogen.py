import asyncio, re
from playwright.async_api import async_playwright
import os
ROOT=os.path.dirname(os.path.abspath(__file__))
C=ROOT+'/crops'; SITE=os.path.abspath(os.path.join(ROOT,'..','..'))
LOGO=f'{SITE}/img/logo_color.png'; LOGOW=f'{SITE}/img/logo_white.png'
I=lambda n:f'{C}/{n}'; A=lambda n:f'{SITE}/img/apps/{n}'
FOOT='DONG-IN ENSIS · 수소전문기업 사업분야'

CSS=f"""
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Regular.otf);font-weight:400}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-SemiBold.otf);font-weight:600}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Bold.otf);font-weight:700}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-ExtraBold.otf);font-weight:800}}
*{{box-sizing:border-box;margin:0;padding:0}} html,body{{width:1440px;background:#fff}}
.page{{position:relative;width:1440px;height:810px;overflow:hidden;font-family:P,sans-serif;color:#111B2E;padding:72px 82px 0;page-break-after:always;background:#fff;word-break:keep-all}}
.logo{{position:absolute;right:82px;top:39px;height:25px}}
.eyebrow{{display:flex;align-items:center;gap:14px;font-size:16.5px;font-weight:700;color:#1857A5;height:20px}}
.eyebrow:before{{content:"";width:32px;height:3px;background:#E83E30;display:block}}
h1{{font-size:48px;font-weight:800;line-height:1.22;margin-top:14px;letter-spacing:-0.5px}} h1 b{{color:#1857A5;font-weight:800}}
.foot{{position:absolute;left:82px;right:82px;top:767px;display:flex;justify-content:space-between;font-size:12px;color:#8A94A6}}
.note{{position:absolute;left:82px;top:728px;font-size:12px;color:#8A94A6}}
.lead{{font-size:17px;line-height:1.6;color:#4A5568;margin-top:18px;max-width:1100px}}
.row{{display:flex;gap:24px;margin-top:30px;align-items:stretch}} .row.top{{align-items:flex-start}}
.card{{flex:1;border:1px solid #E2E7EE;border-radius:12px;overflow:hidden;background:#fff}}
.card img.ph{{width:100%;height:200px;object-fit:cover;display:block}}
.card .b{{padding:18px 22px 20px}}
.tag{{font-size:11.2px;font-weight:800;color:#1857A5;letter-spacing:1px}}
h3{{font-size:21.8px;font-weight:700;margin:5px 0 8px;line-height:1.3}} h3.s{{font-size:18px;color:#1857A5;margin:0 0 6px}}
ul{{list-style:none}} li{{font-size:13.9px;line-height:1.55;padding-left:14px;position:relative;margin-bottom:6px}}
li:before{{content:"";position:absolute;left:0;top:9px;width:5px;height:5px;border-radius:50%;background:#1857A5}}
.own{{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:#5A6577;margin-bottom:4px}} .own img{{height:26px}}
table{{width:100%;border-collapse:collapse;font-size:13.5px}}
th{{text-align:left;font-size:12px;font-weight:700;color:#1857A5;background:#EAF1FA;padding:10px 14px;border-top:2px solid #1857A5}}
td{{padding:9px 14px;border-bottom:1px solid #E2E7EE;line-height:1.45;vertical-align:top}} td.k{{font-weight:600}} td.r,th.r{{text-align:right}}
.stat{{flex:1;border:1px solid #E2E7EE;border-radius:12px;padding:20px 22px;background:#fff}}
.stat .n{{font-size:40px;font-weight:800;color:#1857A5;line-height:1.1;letter-spacing:-1px}} .stat .n sup{{color:#E83E30;font-size:22px;vertical-align:top}}
.stat .l{{font-size:16px;font-weight:700;margin-top:8px}} .stat .d{{font-size:12.5px;color:#5A6577;margin-top:4px;line-height:1.5}}
.stat.dark{{background:#0F3F7E;border-color:#0F3F7E;color:#fff}} .stat.dark .n{{color:#8FC1FF}} .stat.dark .d{{color:#BFD3EC}}
.box{{background:#F5F7FA;border-radius:12px;padding:20px 24px}} .box.navy{{background:#0F3F7E;color:#fff}} .box.navy li{{color:#D6E4F5}} .box.navy li:before{{background:#8FC1FF}} .box.navy h3{{color:#fff}} .box.navy .tag{{color:#8FC1FF}}
.pill{{display:inline-block;font-size:12.5px;font-weight:600;color:#0F3F7E;background:#EAF1FA;padding:6px 14px;border-radius:20px;margin:0 8px 8px 0}}
.col{{display:flex;flex-direction:column;gap:14px}}
.blk h3.s{{font-size:16.5px}}
.ph{{object-fit:cover;border-radius:12px;display:block}}
.cap{{display:flex;align-items:center;gap:10px;font-size:12px;color:#8A94A6;margin-top:8px}} .cap img{{height:22px}}
.strip{{position:absolute;left:82px;right:82px;top:668px;display:flex;align-items:center;justify-content:space-between;border:1px solid #E2E7EE;border-radius:10px;padding:10px 24px;background:#F5F7FA}} .strip img{{height:26px}} .strip img.w{{height:20px}}
.tl{{display:flex;flex-direction:column}} .tl .r{{display:flex;gap:20px;padding:9px 0;border-bottom:1px solid #E2E7EE;align-items:flex-start}}
.tl .y{{width:84px;font-size:22px;font-weight:800;color:#1857A5;line-height:1.2}} .tl .t{{flex:1;font-size:13.9px;line-height:1.5}}
.flow{{display:flex;gap:14px;align-items:center;margin-top:30px}} .step{{flex:1;border:1px solid #E2E7EE;border-radius:12px;padding:18px 20px;background:#fff}} .step.dark{{background:#0F3F7E;border-color:#0F3F7E;color:#fff}}
.step .tag{{color:#8A94A6}} .step.dark .tag{{color:#8FC1FF}} .step h3{{font-size:18px}} .step p{{font-size:13px;line-height:1.5;color:#5A6577}} .step.dark p{{color:#D6E4F5}}
.arrow{{width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;border-left:16px solid #1857A5;flex:none}}
.grid4{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:30px}} .gc{{border:1px solid #E2E7EE;border-radius:12px;padding:16px 18px;background:#fff}} .gc.dark{{background:#0F3F7E;border-color:#0F3F7E;color:#fff}}
.gc h3{{font-size:17px;margin:0 0 4px}} .gc p{{font-size:12.5px;color:#5A6577}} .gc.dark p{{color:#BFD3EC}}
.kv{{font-size:13.5px;line-height:1.55}} .kv b{{color:#1857A5;margin-right:6px}}
.ovl{{position:absolute;inset:0}}
"""

def page(eye,title,body,num,note=None):
    n=f'<div class="note">{note}</div>' if note else ''
    return f'<div class="page"><img class="logo" src="{LOGO}"><div class="eyebrow">{eye}</div><h1>{title}</h1>{body}{n}<div class="foot"><span>{FOOT}</span><span>{num:02d}</span></div></div>'
def lis(items): return '<ul>'+''.join(f'<li>{x}</li>' for x in items)+'</ul>'
def stat(n,l,d,dark=False): return f'<div class="stat{" dark" if dark else ""}"><div class="n">{n}</div><div class="l">{l}</div><div class="d">{d}</div></div>'
def blk(h,items): return f'<div class="blk"><h3 class="s">{h}</h3>{lis(items)}</div>'
def photocard(img,tagt,title,items,h=200,own=None):
    o=f'<div class="own"><img src="{own[0]}">{own[1]}</div>' if own else ''
    t=f'<div class="tag">{tagt}</div>' if tagt else ''
    return f'<div class="card"><img class="ph" src="{img}" style="height:{h}px"><div class="b">{o}{t}<h3>{title}</h3>{lis(items)}</div></div>'
def table(h,rows,ws,aligns=None):
    al=aligns or ['']*len(h)
    th=''.join(f'<th class="{al[i]}" style="width:{w}%">{c}</th>' for i,(c,w) in enumerate(zip(h,ws)))
    tr=''.join('<tr>'+''.join(f'<td class="{al[i]}{" k" if i==0 else ""}">{c}</td>' for i,c in enumerate(r))+'</tr>' for r in rows)
    return f'<table><tr>{th}</tr>{tr}</table>'

P=[]
# 1 cover
P.append(f'''<div class="page" style="background:#0A2A55;color:#fff;padding:0">
<img src="{A('h2-lh2-station.jpg')}" style="position:absolute;left:560px;top:0;width:880px;height:810px;object-fit:cover;opacity:.9">
<div class="ovl" style="background:linear-gradient(90deg,#0A2A55 0%,#0A2A55 42%,rgba(10,42,85,.75) 58%,rgba(10,42,85,.15) 100%)"></div>
<img src="{LOGOW}" style="position:absolute;left:82px;top:72px;height:30px">
<div style="position:absolute;left:82px;top:250px;width:760px">
<div style="font-size:14px;font-weight:700;letter-spacing:4px;color:#8FC1FF">HYDROGEN BUSINESS PROFILE 2026</div>
<div style="font-size:54px;font-weight:800;line-height:1.2;margin-top:18px">수소추진선박 · 액화수소충전소<br><span style="color:#8FC1FF">지능형 제어반 · 전력 시스템</span></div>
<div style="font-size:18px;color:#D6E4F5;margin-top:24px;line-height:1.6">㈜동인엔시스 수소전문기업 사업분야<br>수소전문기업 확인 신청 · 수소사업 설명자료</div></div>
<div style="position:absolute;left:82px;right:82px;top:745px;display:flex;justify-content:space-between;font-size:12px;color:#BFD3EC"><span>㈜동인엔시스 · 대표이사 백민기 · 2026. 10</span><span>donginensis.com</span></div></div>''')

# 2 summary
P.append(page('At a Glance','35년 제어반 전문기업이,<br><b>수소 설비의 제어·전력 기술을 국산화합니다</b>',
 '<p class="lead">해상의 수소추진선박과 육상의 액화수소충전소. 두 현장의 전력·제어 경험을 지능형 제어반 → DataHub → 원격 모니터링으로 제품화하고 있습니다.</p>'
 '<div class="row">'+stat('2<sup>+3</sup>','특허 등록 2건 · 출원 3건','수소충전 · 수소추진선박 제어·전력·안전 기술')+stat('2<sup>건</sup>','해양수산부 국가 R&amp;D','전기복합 추진어선 · 안전기반 소형 수소추진선박')+stat('SK E&amp;S','액화수소충전소 공급','VFD · PLC · PDP · UPS 제어시스템 (2024)')+stat('7.5<sup>억원</sup>','2025년 수소사업 투자','3개년 평균매출액 대비 12.88% · 연구인력 6명',True)+'</div>'
 '<div style="margin-top:26px">'+''.join(f'<span class="pill">{x}</span>' for x in ['1991년 설립 · 35년','750+ 제어시스템 프로젝트','친환경기술연구소','예비 수소전문기업 (2025)','혁신프리미어 1000 (2026)','ISO 9001 · 14001 · 45001'])+'</div>'
 f'<div class="row" style="margin-top:22px"><img class="ph" src="{I("p45_06_photo.jpg")}" style="flex:1;height:190px"><img class="ph" src="{I("p20_06_photo.jpg")}" style="flex:1;height:190px"><img class="ph" src="{I("p39_05_photo.jpg")}" style="flex:1;height:190px"></div>',2,'수소연료전지 전기추진 선박(과제 선형) · SK E&S 액화수소충전소 · 충남병원선 기관실 제어반'))

# 3 company
rows=[('회사명','㈜동인엔시스 DONG-IN ENSIS CO., LTD.'),('대표이사','백민기'),('설립','1991년 10월 · 1997년 7월 법인 전환 · 2023년 사명 변경'),
 ('주요 사업','지능형 제어반 · 산업용/선박용 제어시스템 설계·제작 · 수소 설비 전기제어·전원설비(PDP·PLC·UPS·VFD) · 시스템 통합'),
 ('사업장','본사 부산광역시 부산진구 진연로9번길 47 (양정동) · 친환경기술연구소 엔에스타워 8층 (2020년 설립) · 양산 1·2공장 · 기장공장'),
 ('인력','임직원 21명 · 연구인력 6명 (2025년 기준)'),('경영시스템','ISO 9001 · ISO 14001 · ISO 45001'),
 ('인증·선정','예비 수소전문기업 (2025) · 혁신프리미어 1000 (2026) · 벤처 · 이노비즈 · 메인비즈 · 기업부설연구소'),('파트너','Schneider Electric 공식 SI 파트너 · ABB · Fuji Electric · Eaton · Danfoss')]
tb='<table style="font-size:13.5px">'+''.join(f'<tr><td class="k" style="width:120px;color:#5A6577">{k}</td><td>{v}</td></tr>' for k,v in rows)+'</table>'
P.append(page('Company Overview','회사 개요','<div class="row top"><div style="width:800px">'+tb+'</div><div class="col" style="flex:1">'
 f'<img class="ph" src="{I("p17_05_photo.jpg")}" style="width:100%;height:210px">'
 '<div class="box navy"><div class="tag">VISION</div><p style="font-size:16px;font-weight:600;line-height:1.5;margin:4px 0 12px">현장 설비 데이터로 제조·해양 산업의 DX·AX를 앞당깁니다.</p><div class="tag">MISSION</div><p style="font-size:16px;font-weight:600;line-height:1.5;margin-top:4px">설비를 제어하는 제어반에서 신뢰할 수 있는 데이터를 만들어 연결합니다.</p></div></div></div>',3))

# 4 journey
J=[('2020','친환경기술연구소 설립 · 기업부설연구소 인정'),('2021','해양수산부·KIMST 「전기복합 추진어선 핵심 기자재 기술개발」 착수 (2021.04 ~ 2025.12) · 추진모터 드라이브 · 통합 자동제어 담당'),
 ('2022','해양수산부·KIMST 「안전기반 소형 수소추진선박 기술개발 및 실증」 착수 (2022.04 ~ 2026.12) · 부산 수소동맹 참여기업 · 해양수산부 국가대표 혁신기업'),
 ('2023','충남병원선 · 경남청정호 하이브리드 추진 통합제어·감시시스템 공급'),
 ('2024','SK E&amp;S 액화수소충전소 — PDP · PLC · UPS · VFD 전기제어·전원설비 공급 (니키소코리아 협업)'),
 ('2025','예비 수소전문기업 선정 · 지원사업으로 테스트베드 · D-Hub 클라우드 · 웹 앱 개발 · 수소 제어 핵심기술 특허 5건 출원 (12월) · MASTC 시제품 연동 시험'),
 ('2026','특허 2건 등록 (5월) · 혁신프리미어 1000 선정 · 하이브리드 시범어선 통합제어 적용 · 수소전문기업 확인 신청')]
P.append(page('Hydrogen Journey','수소 사업 추진 경과','<div class="row top"><div class="tl" style="flex:1">'+''.join(f'<div class="r"><div class="y">{y}</div><div class="t">{t}</div></div>' for y,t in J)+'</div>'
 f'<div style="width:360px" class="col"><img class="ph" src="{I("p45_06_photo.jpg")}" style="width:360px;height:220px"><img class="ph" src="{I("p20_05_photo.jpg")}" style="width:360px;height:170px"><div class="cap">수소추진선박 과제 선형 · SK E&amp;S 액화수소충전소 제어반실</div></div></div>',4))

# 5 business
P.append(page('Hydrogen Business','해상과 육상, 수소 사업의 두 축을<br><b>지능형 제어반으로 연결합니다</b>',
 '<div class="row">'+photocard(I('p45_06_photo.jpg'),'해상 · HYDROGEN VESSEL','수소추진선박 전력·통합제어',['연료전지·배터리·전기추진 계통의 전력 연동과 통합제어','선박 전력·제어 패키지 · 시스템 통합 · 시운전·유지관리','안전기반 소형 수소추진선박 실증 과제 기반'],180)
 +photocard(I('p20_06_photo.jpg'),'육상 · LIQUID HYDROGEN STATION','액화수소충전소 전기제어·전원설비',['PDP · PLC · UPS · VFD 공급과 전력계통 엔지니어링','충전설비 전원 공급·운전 제어 · 설비 상태 파악','지능형 제어반 · 전원 통합관리 · 원격 모니터링'],180)
 +'<div class="card box navy" style="padding:24px 26px"><div class="tag">COMMON PLATFORM</div><h3>지능형 제어반 → DataHub<br>→ 원격 모니터링·진단</h3>'+lis(['PLC 현장 제어·인터록 + 운전 데이터 수집','MQTT/TLS 전송 · 시계열 저장 · REST 연동','이상감지 → 예지보전 → 에너지 최적운전으로 고도화','현장 제어·보호 기능은 유지하고 데이터 기능을 단계적으로 추가'])+'</div></div>',5,'※ 해상·육상 사진은 과제 선형과 현장 사진입니다.'))

# 6 lh2
P.append(page('01 · Liquid Hydrogen Station','액화수소충전소,<br><b>전기제어·전원설비에서 디지털전환까지</b>',
 f'<div class="row top"><div style="width:560px" class="col"><img class="ph" src="{I("p20_06_photo.jpg")}" style="width:560px;height:240px"><img class="ph" src="{I("p20_05_photo.jpg")}" style="width:560px;height:170px"><div class="cap"><img src="{I("p20_04_logo.jpg")}">SK E&amp;S 액화수소충전소 · 충전소 전경과 제어반실 (현장 사진)</div></div>'
 '<div class="col" style="flex:1;gap:18px">'+blk('전기제어·전원설비 공급 — 액화수소충전소 프로젝트',['PDP(전력배전반) · PLC 제어반 · UPS · VFD 공급, 전력계통 설계·엔지니어링 (니키소코리아 협업)','전원 공급·분배 · 설비 운전 제어 · 정전 대비 제어·감시 전원 유지','저장탱크 · 기화기 · 펌프 · 열매체유 순환 장비 · 배관 주변 설비의 제어·상태감시'])
 +blk('충전소 디지털전환 — 예비 수소전문기업 지원사업',['인버터 국산화용 부품 · 외함 확보, 테스트베드 구축','D-Hub 클라우드 · PWA 웹 앱 개발 — 운전 데이터 수집·모니터링','테스트베드 데이터로 이상감지 기능 검증 후 실제 현장 적용 준비'])
 +blk('권리',['특허 제10-2964564호 「수소충전용 모듈러 인출식 VFD 판넬」 (등록)','출원 「수소충전용 지능형 EOCR 기반 예측보호시스템」 · 「데이터 허브형 UPS 및 PDP 통합 전원관리 시스템」'])+'</div></div>',6))

# 7 vessel
P.append(page('02 · Hydrogen Vessel','수소추진선박,<br><b>시제품 연동과 통합제어 시험으로 사업화를 준비합니다</b>',
 '<div class="row top"><div class="col" style="flex:1;gap:18px">'+blk('국가 R&amp;D — 안전기반 소형 수소추진선박 기술개발 및 실증',['해양수산부 · KIMST · 사업기간 2022.04 ~ 2026.12 · 주관 국립한국해양대학교','공동 LS일렉트릭 · KOMERI · 한국기계연구원 · KMC · 호서대 · 부산대 · 목포해양대 · KOMSA · FOEx 등','당사 역할: 통합제어·감시시스템 · 시스템통합 엔지니어링'])
 +blk('2025년 수행 — MASTC 시제품 연동·성능 시험',['연료전지 · 배터리 · DC/DC · 인버터 · 추진용 모터 연동 시험 환경 구축','통합제어감시시스템과 감시·제어 신호 확인','선박 탑재·커미셔닝·해상 실증은 건조 일정과 연계한 후속 단계'])
 +blk('사업화 방향',['전력·제어 패키지 (배전반·제어반·전원장치) → 조선소 · 선박 시스템 공급사','통합제어·시운전 → 전기추진 시스템 통합기업 · 운영·유지관리 → 선주·운항사','특허 제10-2964558호 「수소연료전지 하이브리드 추진선박의 부하 프로파일 기반 자동제어방법」 (등록)'])+'</div>'
 f'<div style="width:560px" class="col"><img class="ph" src="{I("p45_06_photo.jpg")}" style="width:560px;height:250px"><img class="ph" src="{I("p43_04_photo.jpg")}" style="width:560px;height:160px"><div class="cap"><img src="{I("p36_10_logo.jpg")}"><img src="{I("p42_07_logo.jpg")}">과제 선형 · 추진시스템 테스트베드</div></div></div>',7))

# 8 ref-marine
P.append(page('Major Reference · Green Ship','친환경 선박 하이브리드 추진,<br><b>통합제어·감시시스템을 공급했습니다</b>','<div class="row">'
 +photocard(I('p39_04_photo.jpg'),None,'충남병원선 · G/T 330톤급',['디젤엔진 + 전기모터 하이브리드 추진','추진시스템 · 통합제어·감시시스템 공급','2023년 8월 취항 · 친환경 선박 건조 공로 표창'],220,(I('p40_06_logo.jpg'),'충청남도'))
 +photocard(I('p37_04_photo.jpg'),None,'경남청정호 · G/T 120톤급 환경정화선',['디젤엔진 + 전기모터 하이브리드 추진','추진시스템 · 통합제어·감시시스템 공급','2023년 4월 취항'],220,(I('p37_06_logo.jpg'),'경상남도'))
 +photocard(I('p36_04_photo.jpg'),None,'G/T 280톤급 항만청소선',['디젤 · LNG 엔진 하이브리드 추진','연료가스공급시스템(FGSS) 제어시스템 공급','LNG 연료 선박의 가스 안전 제어'],220,(I('p36_10_logo.jpg'),'해양수산부 여수지방해양수산청'))+'</div>',8,
 '※ 해양수산부 하이브리드 시범어선 디젤·전기모터 통합제어 적용(2026) · 국가 R&D: 전기복합 추진어선(2021~25), 안전기반 소형 수소추진선박(2022~26)'))

# 9 ref-fgss
P.append(page('Major Reference · LNG Fuel Gas Supply System','LNG 연료공급시스템(FGSS) 제어,<br><b>가스 연료 선박에서 검증했습니다</b>','<div style="margin-top:28px">'+table(['발주처 · 조선소','선박 · 설비','공급 범위'],[
 ('Jiangsu New Times Shipbuilding (NTS)','EPS-NTS 210,000 / 209,000 DWT 벌크선 13척 (Liberia · ABS)','FGSS 글리콜워터 펌프 제어 · 유압 동력 공급 시스템'),
 ('Namura Shipbuilding','95,000 DWT 벌크선 (S496 · Liberia · NK)','FGSS 글리콜워터 펌프 제어시스템'),
 ('GSI (广船国际)','HMM 8,600 CEU DF 자동차운반선 3척 (Panama · KR)','FGSS 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
 ('GSI (广船国际)','EPS/Chandris 111K DWT LNG DF 원유·제품 운반선 (Taiwan · KR)','BOG 압축기 제어 · 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
 ('—','1.2 MW 앵커 핸들링선 (EK011 · Taiwan · KR)','FGSS 글리콜 펌프 · L.O 펌프 &amp; 오일히터 제어'),
 ('삼성중공업','FGSS 시스템 시험설비','G/W(글리콜워터) 히터 제어시스템'),('Atlas Copco','LNG 밸류체인용 고성능 BOG 압축기','BOG 압축기 제어시스템 엔지니어링 · 글로벌 지원'),
 ('SB선보','LNG 운반선용 BOG 압축기','BOG 압축기 제어시스템 설계 · 공급 · 시운전')],[24,42,34])+'</div>',9,'※ LNG 연료 선박의 가스 공급·안전 제어 경험이 수소 설비 제어의 기반입니다.'))

# 10 ref-plant
feats=[(I('p20_06_photo.jpg'),I('p20_04_logo.jpg'),'SK E&amp;S 액화수소충전소','VFD · PLC · PDP 제어시스템 공급 · 상용 충전소 운영 실증'),
 (I('photo_bobst_421.jpg'),I('logo_bobst.jpg'),'밥스트코리아(BOBST) 포장기계','특수 기계 제어시스템 엔지니어링·공급 (서보·모션 제어)'),
 (I('p21_04_photo.jpg'),I('p21_06_logo.jpg'),'한국남부발전 연료전지 발전소 CCUS BOP 제어','탄소 포집·활용·저장(CCUS) 설비 BOP 제어시스템 · SK에코플랜트')]
fh=''.join(f'<div class="card" style="flex:none;width:300px"><img class="ph" src="{a}" style="height:160px;border-radius:0"><div class="b" style="padding:14px 18px 16px"><img src="{b}" style="height:26px;display:block;margin-bottom:8px"><h3 style="font-size:16.5px;margin:0 0 6px">{c}</h3><p style="font-size:12px;color:#5A6577;line-height:1.5">{d}</p></div></div>' for a,b,c,d in feats)
others=['현대자동차그룹 Metaplant America(미국) — 전기차 생산라인 통합제어시스템','동화기업 포르말린 수지 플랜트 — 전체 제어시스템 설계·제작','KOS · 고려제강(Kiswire) — 신선기·연선기·도금·열처리 라인 (한국·베트남·미국·체코·헝가리·말레이시아·중국)','KSB — 선박용 제어 콘솔 · 시스템 판넬','대한화섬 오토도퍼 · DMS 고밀도 클리너 · IGis 열가소성 스페이서 · 파워엠엔씨 SMR 핵연료 교환기 — 서보·모션 제어']
logos=['p16_32_logo.jpg','p20_04_logo.jpg','logo_bobst.jpg','logo_atlas.jpg','p21_06_logo.jpg','logo_hyundai.jpg','p18_04_logo.jpg','p19_05_logo.jpg','p19_06_logo.jpg','p22_04_logo.jpg','p29_08_logo.jpg','p33_05_logo.jpg']
P.append(page('Major Reference · Energy &amp; Plant','수소충전소에서 해외 공장까지,<br><b>에너지·산업 플랜트 제어 실적</b>','<div class="row">'+fh+'<div class="box" style="flex:1;padding:18px 22px"><h3 class="s" style="font-size:17px;color:#0F3F7E">그 외 주요 실적</h3><ul style="margin-top:8px">'+''.join(f'<li style="font-size:12.5px">{x}</li>' for x in others)+'</ul></div></div>'
 '<div class="strip">'+''.join(('<img class="w" src="%s">' if x=='p16_32_logo.jpg' else '<img src="%s">')%I(x) for x in logos)+'</div>',10))

# 11 icp
steps=[('STEP 1','수소 설비 · 센서','펌프 · 기화기 · 연료전지 · 추진모터의 온도·압력·전류·진동·운전 상태',False),('STEP 2','지능형 제어반','PLC·인버터·보호기기로 설비를 운전하고 인터록·보호 기능을 현장에서 수행. 운전 데이터 수집',True),
 ('STEP 3','암호화 전송 · DataHub','MQTT/TLS 전송, 표준 데이터 구조로 시계열 저장. 클라우드 또는 고객사 서버, REST 연동',False),('STEP 4','분석 · 서비스','이상감지 → 예지보전 → 에너지 최적운전. 테스트베드와 현장 검증을 거쳐 고도화',False)]
fl='<div class="arrow"></div>'.join(f'<div class="step{" dark" if d else ""}"><div class="tag">{a}</div><h3>{b}</h3><p>{c}</p></div>' for a,b,c,d in steps)
ben=[('안전 데이터 24시간 기록','수소 설비의 온도·압력·전류를 기록하고 기준치 이탈 시 즉시 알람'),('다운타임 최소화','운전 패턴 변화를 조기에 감지해 정지 전에 정비, 충전소·선박 가동률 확보'),('전력제어 국산화','외산 제어장비 의존을 낮추는 국산 제어반 · VFD 판넬 · 제어 알고리즘')]
P.append(page('Intelligent Control Panel','현장 제어와 데이터를<br><b>같은 방식으로 연결합니다</b>',f'<div class="flow">{fl}</div><div class="row">'+''.join(f'<div class="box" style="flex:1;background:#EAF1FA"><h3 class="s" style="font-size:17px;color:#0F3F7E">{a}</h3><p style="font-size:13px;color:#4A5568;line-height:1.5">{b}</p></div>' for a,b in ben)
 +f'</div><div class="row"><img class="ph" src="{A("h2-lh2-control.jpg")}" style="flex:1;height:150px"><img class="ph" src="{A("h2-vessel-system.jpg")}" style="flex:1;height:150px"><img class="ph" src="{A("h2-machinery.jpg")}" style="flex:1;height:150px"></div>',11,'※ 하단 이미지는 이해를 돕기 위한 연출 이미지입니다.'))

# 12 ip
P.append(page('Intellectual Property','지식재산권,<br><b>특허 등록 2건 · 출원 3건 · 상표 2건</b>','<div class="row top"><div style="flex:1">'+table(['상태','번호','명칭','일자'],[
 ('등록','제10-2964558호','수소연료전지 하이브리드 추진선박의 부하 프로파일 기반 자동제어방법','출원 2025.12.01 · 등록 2026.05.08'),('등록','제10-2964564호','수소충전용 모듈러 인출식 VFD 판넬','출원 2025.12.01 · 등록 2026.05.08'),
 ('출원','제10-2025-0187312호','수소충전용 지능형 EOCR 기반 예측보호시스템','출원 2025.12'),('출원','제10-2025-0187314호','수소충전용 데이터 허브형 UPS 및 PDP 통합 전원관리 시스템','출원 2025.12'),('출원','제10-2025-0187315호','수소추진선박용 AI 기반 ESS 위험 예측 및 제어 시스템','출원 2025.12'),
 ('상표','제40-2214640호','「(주)동인엔시스」 · 제42류','등록 2024.06.28'),('상표','제40-2178388호','「ENERGIENT SOLUTION」 · 제42류','등록 2024.04.04')],[9,22,45,24])
 +'<p style="font-size:12.5px;color:#5A6577;line-height:1.5;margin-top:12px">등록 2건은 2026.05.08 특허증 기준이며 출원 3건과 구분합니다. 안전기반 소형 수소추진선박 과제의 실증 성과를 제어·전력·안전 기술로 권리화했습니다.</p></div>'
 f'<div style="width:380px"><div style="display:flex;gap:14px"><img src="{ROOT}/patent_10-2964558.png" style="width:183px;border:1px solid #E2E7EE;border-radius:6px"><img src="{ROOT}/patent_10-2964564.png" style="width:183px;border:1px solid #E2E7EE;border-radius:6px"></div><div class="cap">특허증 제10-2964558호 · 제10-2964564호 (지식재산처, 2026.05.08)</div></div></div>',12))

# 13 rnd
P.append(page('R&amp;D Capability','연구개발 역량','<div class="row">'
 +'<div class="card"><div class="b" style="padding:22px 24px"><h3>친환경기술연구소</h3>'+lis(['2020년 설립 · 기업부설연구소 인정','수소·친환경 선박 전력제어, 예측제어, 운전 데이터 분석','전장설계 · PLC · 인버터 기술인력 확충 추진'])+'</div></div>'
 +'<div class="card"><div class="b" style="padding:22px 24px"><h3>국가 R&amp;D 수행</h3>'+lis(['해양수산부·KIMST 「전기복합 추진어선 핵심 기자재 기술개발」 (2021.04 ~ 2025.12)','해양수산부·KIMST 「안전기반 소형 수소추진선박 기술개발 및 실증」 (2022.04 ~ 2026.12)','과제 성과를 특허 5건으로 체계화 (등록 2 · 출원 3)'])+'</div></div>'
 +'<div class="card"><div class="b" style="padding:22px 24px"><h3>산학협력 · 네트워크</h3>'+lis(['국립한국해양대학교 MOU (2014) · 산학협력 가족회사 (2024) · 공동연구·기술이전','부산광역시 수소동맹 참여기업 (2022) · 국내 학술회의 발표 4건 (2025)','Schneider Electric 공식 SI 파트너'])+'</div></div></div>'
 '<div class="row">'+stat('7.54<sup>억원</sup>','2025년 수소사업 투자액','인건비 1.95억 · 안전기반 과제 4.85억 · 예비수소 사업 0.75억')+stat('12.88<sup>%</sup>','3개년 평균매출액 대비','2023 ~ 2025 평균매출액 대비 수소사업 투자 비율')+stat('21<sup>명</sup> / 6<sup>명</sup>','임직원 / 연구인력','수소추진선박 과제 참여 연구인력 6명')+'</div>',13))

# 14 rnd-projects
def proj(im,title,period,lead,co,role,memo):
    return (f'<div class="card"><img class="ph" src="{im}" style="height:170px"><div class="b"><div class="own"><img src="{I("p36_10_logo.jpg")}"><img src="{I("p42_07_logo.jpg")}">해양수산부 · 한국해양과학기술진흥원</div><h3 style="font-size:19px">{title}</h3>'
            f'<div class="kv"><div><b>사업기간</b>{period}</div><div><b>주관기관</b>{lead}</div><div><b>공동연구</b>{co}</div><div><b>당사 역할</b>{role}</div></div><p style="font-size:12.5px;color:#8A94A6;margin-top:8px">{memo}</p></div></div>')
P.append(page('National R&amp;D Projects','국가 연구개발 과제 수행 현황','<div class="row">'
 +proj(I('p43_04_photo.jpg'),'전기복합 추진어선 핵심 기자재 기술개발','2021.04.01 ~ 2025.12.31','한국선급(KR)','동인엔시스 · Electrine · 효성 · Korea R&amp;D · 한국전자기술연구원 · 국립한국해양대학교','추진모터 드라이브 시스템 · 통합 자동제어시스템','디젤엔진 + 전기모터 하이브리드 추진 · 사진은 추진시스템 테스트베드')
 +proj(I('p45_06_photo.jpg'),'안전기반 소형 수소추진선박 기술개발 및 실증','2022.04.01 ~ 2026.12.31','국립한국해양대학교','동인엔시스 · LS일렉트릭 · KOMERI · 한국기계연구원 · KMC · 호서대 · 부산대 · 목포해양대 · KOMSA · FOEx 등','통합제어·감시시스템 · 시스템통합 엔지니어링','2025년 MASTC 시제품 연동·성능 시험 환경 구축 · 과제 성과를 특허 5건으로 체계화')+'</div>',14))

# 15 academic
P.append(page('Academic &amp; Pre-Hydrogen Program','학술활동과<br><b>예비 수소전문기업 지원사업</b>','<div class="row top"><div style="flex:1"><h3 class="s" style="margin-bottom:10px">국내 학술회의 발표 (2025) · 발표자 김인수</h3>'
 +table(['학술대회','발표일','장소'],[('한국마린엔지니어링학회 2025년도 공동학술대회','2025.04.24','목포해양대학교'),('스마트 전기선박 연구회 2025년도 하계 학술발표회','2025.08.29','창원대학교'),('한국마린엔지니어링학회 2025년도 후기학술대회','2025.10.24','부산 BEXCO'),('한국해군과학기술학회 2025년 동계학술대회','2025.12.08','여수 베네치아호텔&amp;스위트')],[52,20,28])+'</div>'
 '<div class="box" style="width:480px;padding:24px 26px"><div class="tag">예비 수소전문기업 지원사업 (2025 · 산업통상자원부 · 부산광역시)</div><h3>액화수소충전소 디지털전환 과제</h3>'+lis(['인버터 국산화용 부품 · 외함 확보 및 테스트베드 구축','D-Hub 클라우드 · PWA 웹 앱 개발 — 운전 데이터 수집·모니터링','시험·인증 연계 추진 · 이상감지 기능 검증','충전소 구축 시 공급한 설비를 유지관리·진단 사업의 기반으로 활용'])+'</div></div>',15))

# 16 infra
P.append(page('Manufacturing · Quality','직접 설계하고,<br><b>직접 제작합니다</b>','<div class="row top"><div class="col" style="flex:1;gap:18px">'
 +blk('제작 거점',['양산 1공장 · 양산 2공장 (2023년 준공) · 기장공장','본사·친환경기술연구소 부산 (양정동 엔에스타워)'])+blk('품질 체계',['FAT 전용 테스트 라인 · 공장검사 후 현장 설치','CE · UL 기준 설계·제작 체계 · ISO 9001 · 14001 · 45001','친환경 추진시스템 시험: MASTC 해양 실증 기술센터(한국해양대·KR·KOMERI) — 400kW급 추진모터 드라이브 · PMS · HiL'])
 +blk('일괄 수행 범위',['설계 → 제작·배선 → PLC 프로그램 → 공장검사 → 현장 시운전 → 유지관리','Schneider Electric 공식 SI 파트너 · ABB · Fuji Electric · Eaton · Danfoss'])+'</div>'
 f'<div style="width:560px"><img class="ph" src="{I("p40_04_photo.jpg")}" style="width:560px;height:360px"><div class="cap">충남병원선 하이브리드 추진 통합제어반 · 공장검사(FAT) 현장</div></div></div>',16))

# 17 certs
Cs=[('예비 수소전문기업','산업통상자원부 · 부산광역시 · 2025',1),('혁신프리미어 1000','산업통상자원부 · 2026',1),('특허 등록 2건 · 출원 3건','수소 제어·전력·안전 기술 · 2026',1),('부산 수소동맹 참여기업','부산광역시 · 2022',1),
 ('국가대표 혁신기업','해양수산부 · 2022',0),('기업부설연구소','친환경기술연구소 · 2020',0),('우수기술기업 T-4','기술신용평가(TCB) · 2022',0),('벤처 · 이노비즈 · 메인비즈','중소벤처기업부 · 2025',0),
 ('히든챔피언 · 서비스 강소기업','부산광역시 · 2023',0),('전략산업선도기업 · 레전드50+','부산광역시 · 2024',0),('ISO 9001 · 14001 · 45001','품질 · 환경 · 안전보건 경영시스템',0),('Schneider Electric SI 파트너','ABB · Fuji Electric · Eaton · Danfoss',0)]
P.append(page('Certifications','인증 · 선정','<div class="grid4">'+''.join(f'<div class="gc{" dark" if d else ""}"><h3>{a}</h3><p>{b}</p></div>' for a,b,d in Cs)+'</div>',17))

# 18 status
P.append(page('Hydrogen Business Share','2025년 수소사업 투자,<br><b>증빙 기준으로 정리했습니다</b>','<div class="row top"><div class="col" style="flex:1;gap:18px"><div style="display:flex;gap:16px">'
 +stat('754,219,503<sup>원</sup>','2025년 수소사업 투자액','예비수소 사업 포함 원장 집계')+stat('12.88<sup>%</sup>','2023~2025 평균매출액 대비','집계안의 산술 비율')+stat('21<sup>명</sup> / 6<sup>명</sup>','전체 인력 / 과제 참여 연구인력','2025년 기준')+'</div>'
 +table(['투자 구분','금액 (원)','근거'],[('연구개발 인건비','195,000,000','연구개발비 명세서'),('안전기반 소형 수소추진선박 과제','484,598,003','과제 원장'),('예비 수소전문기업 지원사업','74,621,500','사업 원장'),('<b>합계</b>','<b>754,219,503</b>','회계 검토의견서 첨부')],[46,24,30],['','r',''])+'</div>'
 '<div class="box navy" style="width:400px;padding:24px 26px"><div class="tag">수소사업 범위 (당사 기준)</div><div style="margin-top:10px">'+lis(['해상 — 수소추진선박 전력·통합제어 (국가 R&amp;D)','육상 — 액화수소충전소 전기제어·전원설비 공급','수소 설비용 지능형 제어반 · VFD 판넬 · UPS·PDP 전원관리','수소 설비 운전 데이터 수집·모니터링 (DataHub)'])+'</div><p style="font-size:12.5px;color:#BFD3EC;line-height:1.5;margin-top:10px">수소법에 따른 수소전문기업은 수소사업 매출액 비중 또는 수소 관련 연구개발 투자 비중 중 하나를 충족하면 확인받을 수 있습니다. 투자액은 날인된 회계 검토의견서와 명세서를 함께 제출합니다.</p></div></div>',18))

# 19 roadmap
P.append(page('Roadmap 2026 H2 – 2028','각 단계의 검증 결과를<br><b>다음 단계의 제품·서비스 공급에 연결합니다</b>','<div style="margin-top:28px">'+table(['구분','2026년 하반기 · 기반·시험 정리','2027년 · 현장 검증·제품화','2028년 · 적용 확대·서비스화'],[
 ('<b>해상</b> 수소추진선박','연동시험 · 설계 산출물 정리 · 선박 탑재·시운전 연계 준비','건조 일정과 연계한 실증 · 전력·통합제어 패키지 정리','후속 선박·시험설비 제안 · 정비·진단 서비스 확대'),
 ('<b>육상</b> 액화수소충전소','테스트베드 · 데이터 연동 · 이상감지 개념 검증','실제 운영 데이터 확보 · 진단 기능·현장 적용 검증','신규·기존 충전소 적용 · 전원관리·유지관리 확대'),
 ('<b>공통</b> 지능형 제어반','신호·데이터 항목 정리 · 시험·보안·품질 계획 수립','표준 설계·소프트웨어 관리 · 검증 결과와 고객 제안 연계','반복 적용 범위 확대 · 운영 서비스 계약 검토'),
 ('<b>단계 산출물</b>','시험기록 · 연동 목록 · 데이터 수집·검증 계획','현장 검증 보고서 · 제품 사양 · 고객 공급 제안','후속 공급 실적 · 유지관리·서비스 계약'),
 ('<b>권리·지정</b>','수소전문기업 확인 · 출원 특허 3건 심사 대응','지능형 제어반 핵심특허 추가 출원 → 혁신제품 지정 추진','조달 시장 진입 · 중동·동남아 수출 검토')],[16,28,28,28])+'</div>',19,'※ 본 표는 사업계획입니다. 선박 건조 · 현장 접근 · 시험 결과 · 고객 수요에 따라 실행 시기를 조정합니다.'))

# 20 end
P.append(f'''<div class="page" style="background:#0F3F7E;color:#fff;padding:0">
<img src="{LOGOW}" style="position:absolute;left:82px;top:72px;height:30px">
<div style="position:absolute;left:82px;top:230px;width:900px"><div style="font-size:48px;font-weight:800;line-height:1.22">제어에서 데이터로,<br><span style="color:#8FC1FF">데이터에서 지능으로.</span></div>
<div style="font-size:17px;color:#BFD3EC;margin-top:20px;line-height:1.6">해상 수소추진선박의 전력·통합제어, 육상 액화수소충전소의 운전제어·디지털전환.<br>동인엔시스가 함께합니다.</div></div>
<div style="position:absolute;left:82px;right:82px;top:560px;border-top:1px solid rgba(191,211,236,.35);padding-top:28px;display:flex;gap:60px">
<div style="flex:1"><div class="tag" style="color:#8FC1FF">OFFICES</div><p style="font-size:13.5px;line-height:1.7;color:#D6E4F5;margin-top:6px">본사 부산광역시 부산진구 진연로9번길 47 (양정동)<br>친환경기술연구소 부산광역시 부산진구 진연로9번길 39, 엔에스타워 8층<br>양산 1·2공장 경상남도 양산시 상북면 공원로 107 · 103-5<br>기장공장 부산광역시 기장군 정관읍 달음산길 20</p></div>
<div style="width:420px"><div class="tag" style="color:#8FC1FF">CONTACT</div><p style="font-size:13.5px;line-height:1.7;color:#D6E4F5;margin-top:6px">대표이사 백민기<br>TEL 051-862-3668 · FAX 051-862-3325<br>E-mail plan@donginmne.com · dongin@donginmne.com<br>Web donginensis.com</p></div></div></div>''')

html=f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(P)}</body></html>'
open(f'{ROOT}/out/h2_profile.html','w').write(html)

async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg=await b.new_page(viewport={'width':1440,'height':810})
        await pg.goto(f'file://{ROOT}/out/h2_profile.html'); await pg.wait_for_timeout(1200)
        # overflow check per page
        ov=await pg.evaluate('''()=>[...document.querySelectorAll('.page')].map((p,i)=>{let r=p.getBoundingClientRect();let m=0;p.querySelectorAll('*').forEach(e=>{let b=e.getBoundingClientRect();if(b.bottom-r.top>m)m=b.bottom-r.top});return [i+1,Math.round(m)]})''')
        print('max-bottom per page:',ov)
        await pg.pdf(path=f'{ROOT}/out/h2_profile.pdf', width='20in', height='11.25in', scale=1.3333, print_background=True, margin={'top':'0','bottom':'0','left':'0','right':'0'})
        await b.close()
asyncio.run(main()); print('done', len(P))
