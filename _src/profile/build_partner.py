"""IT 파트너용 소개서 (스마트팩토리 · MES · AI 기업 대상, 8장)

사용법
  python3 build_partner.py            # → out/partner_KR.pdf
  python3 build_partner.py --png      # 확인용 PNG도 저장

디자인(글꼴 · 색 · 표 · 카드)은 영업용 회사소개서(build_sales.py)와 같은 것을 씁니다.
문구는 홈페이지 IT기업 협업 페이지(partner.html)와 FAQ를 기준으로 하며, 구현이 확인되지 않은 기능은 '원칙 · 협의'로만 씁니다.
"""
import asyncio, os, argparse
import segno
import build_sales as bs
from build_sales import page, lis, stat, ROOT, SITE, LOGOW, X

bs.FOOT = 'DONG-IN ENSIS · IT 파트너 제안서 · 스마트공장 · AI 팩토리 현장 연동(OT) 파트너'

CSS = bs.CSS + """
.pain{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px}
.pain div{border:1px solid #E2E7EE;border-radius:12px;padding:18px 20px;background:#fff;font-size:16px;font-weight:700;line-height:1.45}
.pain div span{display:block;font-size:12px;font-weight:800;color:#E83E30;letter-spacing:1px;margin-bottom:6px}
.role{display:flex;gap:18px;margin-top:24px;align-items:stretch}
.role>div{flex:1;border-radius:14px;padding:22px 26px}
.role .k{font-size:12px;font-weight:800;letter-spacing:2px}
.role h3{font-size:22px;margin:4px 0 12px}
.role li{font-size:15px;margin-bottom:8px}
.plus{flex:none!important;width:46px;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;color:#1857A5;padding:0!important}
.fb.red{background:#E83E30;border-color:#E83E30;color:#fff} .fb.red span{color:#FFE1DD}
.mono{font-family:Consolas,monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;background:#0A2A55;color:#D6E4F5;border-radius:12px;padding:16px 18px;line-height:1.55;white-space:pre}
.mono b{color:#8FC1FF;font-weight:400}
.model{flex:1;border:1px solid #E2E7EE;border-radius:12px;padding:20px 22px;background:#fff}
.model .no{font-size:12px;font-weight:800;color:#E83E30;letter-spacing:1px}
.model h3{font-size:20px;margin:4px 0 6px}
.model p{font-size:14px;color:#4A5568;line-height:1.5;margin-bottom:10px}
"""


def cover():
    return f'''<div class="page" style="background:#0A2A55;color:#fff;padding:0">
<img src="{SITE}/img/apps/mfg-auto.jpg" style="position:absolute;left:0;top:0;width:1440px;height:810px;object-fit:cover;object-position:right center">
<div class="ovl" style="background:linear-gradient(90deg,#0A2A55 0%,rgba(10,42,85,.97) 36%,rgba(10,42,85,.86) 54%,rgba(10,42,85,.30) 100%)"></div>
<img src="{LOGOW}" style="position:absolute;left:82px;top:72px;height:32px">
<div style="position:absolute;left:82px;top:220px;width:820px">
<div style="font-size:14px;font-weight:700;letter-spacing:4px;color:#8FC1FF">PARTNER PROPOSAL 2026 · FOR IT COMPANIES</div>
<div style="font-size:56px;font-weight:800;line-height:1.2;margin-top:18px;letter-spacing:-1px">PLC 연동과 현장 시공은 맡기고,<br>플랫폼에만 집중하세요.</div>
<div style="width:510px;height:5px;background:#E83E30;margin-top:16px"></div>
<div style="font-size:22px;font-weight:700;margin-top:24px">스마트공장 · AI 팩토리 프로젝트의 현장 연동(OT) 구간을 맡습니다</div>
<div style="font-size:17.5px;color:#BFD3EC;margin-top:10px;line-height:1.55;font-weight:500">MES · AI · 디지털트윈 솔루션 기업을 위한 제안 — 제어반 설계 · 제작 · 설치부터 PLC 연동, 표준 데이터 API까지</div></div>
<div style="position:absolute;left:82px;right:82px;top:745px;display:flex;justify-content:space-between;font-size:13px;color:#BFD3EC"><span>㈜동인엔시스 · Since 1991 · 스마트공장 공급기업</span><span>donginensis.com/partner.html</span></div></div>'''


def pains():
    P = [('PLC', '현장마다 PLC 기종과 통신 방식이 제각각이다'), ('GATEWAY', '데이터 수집용 게이트웨이 설치 · 유지가 부담된다'),
         ('SAFETY', '제어반 개조 시 전기 안전 책임을 지기 어렵다'), ('DATA', '수집 데이터가 설비마다 형식이 달라 정리가 안 된다'),
         ('FIELD', '현장 설치 · 시운전 인력이 부족하다'), ('SITE', '플랫폼은 있는데 적용할 제조 현장이 필요하다')]
    return page('Pain Points', '스마트공장 · AI 팩토리 프로젝트가<br><b>늘 현장에서 늦어졌다면</b>',
        '<p class="lead">MES · AI · 디지털트윈 솔루션은 준비됐는데, 설비 데이터를 가져오는 현장 연동(OT) 구간에서 일정과 비용이 늘어나는 경우가 많습니다.</p>'
        '<div class="pain">' + ''.join(f'<div><span>{k}</span>{t}</div>' for k, t in P) + '</div>'
        f'<div class="row" style="margin-top:22px"><img class="ph" src="{X("svc_mfg1.jpg")}" style="flex:1;height:190px"><img class="ph" src="{SITE}/img/field-panel.jpg" style="flex:1;height:190px"><img class="ph" src="{SITE}/img/apps/mfg-vibration.jpg" style="flex:1;height:190px"></div>',
        '판넬 제작 · 펌프실 지능형 제어반 · 설비 데이터 확인 (일부 이해를 돕기 위한 연출 이미지)')


def roles():
    us = ['제어반 설계 · 제작 · 설치 · 시운전', 'PLC · 인버터 · 센서 연동', '암호화 데이터 전송 · DataHub (클라우드 · 온프레미스)', '표준 데이터 모델 + REST API · WebSocket', '전기 안전 · 현장 시공 · 유지보수 책임']
    it = ['MES · ERP · EAM 연동', 'AI 분석 · 예지보전 모델', '디지털트윈 · 대시보드', '고객 대상 플랫폼 운영', '제조 고객 영업 · 서비스']
    return page('Role Split', '현장은 동인엔시스가,<br><b>플랫폼은 귀사가</b>',
        '<p class="lead">동인엔시스는 현장 쪽(OT)을 맡고, 신뢰할 수 있는 설비 데이터를 표준 API로 넘깁니다. 귀사는 지금의 솔루션을 그대로 쓰면 됩니다.</p>'
        '<div class="role"><div style="background:#0F3F7E;color:#fff"><div class="k" style="color:#8FC1FF">DONG-IN ENSIS · 현장 데이터 · OT</div><h3>설비에서 API까지</h3>'
        + lis(us).replace('<ul>', '<ul class="w">') + '</div><div class="plus">+</div>'
        '<div style="background:#F5F7FA"><div class="k" style="color:#1857A5">IT PARTNER · 플랫폼 · 서비스</div><h3>API에서 고객 가치까지</h3>' + lis(it) + '</div></div>'
        '<div class="grid2" style="margin-top:18px"><div class="gc"><h3>제어 권한은 현장 PLC에</h3><p>인터록과 최종 제어는 현장 PLC가 보유하고, 서버는 설비를 직접 제어하지 않습니다.</p></div>'
        '<div class="gc"><h3>책임 구간이 분명합니다</h3><p>제어반 개조 · 설치에 따르는 전기 안전과 현장 작업은 35년 제어반 기업이 책임지고 수행합니다.</p></div></div>'
        '<div class="ms" style="margin-top:18px"><div><b>35년</b><span>제어반 설계 · 제작 · 시운전</span></div><div><b>750<span style="font-size:16px;color:#E83E30">+</span></b><span>선박 · 에너지 · 플랜트 제어시스템 프로젝트</span></div><div><b>9~15주</b><span>지능형 제어반 표준 구축 기간 (현장 조건에 따라 변동)</span></div><div><b>1면</b><span>현장에는 제어반 하나만 설치 · 별도 수집장비 없음</span></div></div>'
    ).replace('<ul class="w">', '<ul class="w" style="color:#D6E4F5">')


def connect():
    flow = ('<div class="flow" style="margin-top:6px"><div class="fb"><b>설비 · 센서</b><span>모터 · 펌프 · 팬 · 압축기</span></div><div class="ar"></div>'
            '<div class="fb dark" style="flex:1.4"><b>지능형 제어반</b><span>PLC 실시간 제어 + 데이터 수집</span></div><div class="ar"></div>'
            '<div class="fb red"><b>MQTT · TLS</b><span>암호화 전송</span></div><div class="ar"></div>'
            '<div class="fb"><b>DataHub</b><span>표준 구조 · 시계열 저장</span></div><div class="ar"></div>'
            '<div class="fb"><b>REST API · WebSocket</b><span>귀사 MES · AI · 디지털트윈</span></div></div>')
    return page('How It Connects', '설비에서 귀사 플랫폼까지,<br><b>끊김 없이 연결합니다</b>',
        '<p class="lead">신규 설비는 지능형 제어반의 PLC가 데이터를 바로 보내고, 이미 설치된 설비도 같은 데이터 구조로 들어옵니다.</p>' + flow +
        '<div class="row" style="margin-top:22px">'
        '<div class="box" style="flex:1"><div class="tag">NEW EQUIPMENT</div><h3>신규 설비 — 게이트웨이 없이</h3>' + lis(['지능형 제어반의 PLC가 제어하면서 운전 데이터를 수집', 'MQTT로 클라우드 · 고객사 서버에 직접 전송', '수집장비 · 산업용 PC 추가 없음']) + '</div>'
        '<div class="box" style="flex:1"><div class="tag">EXISTING · 3RD-PARTY PLC</div><h3>기존 · 타사 PLC — 읽기 전용 연결</h3>' + lis(['미쓰비시 · LS · 지멘스 등 이미 설치된 PLC는 데이터를 읽기만 함', 'OPC UA → Modbus TCP → 제조사 전용 프로토콜(게이트웨이) 순으로 선택', '기종 · 통신 방식은 현장 분석에서 확인해 프로젝트별 제안']) + '</div>'
        '<div class="box navy" style="flex:1"><div class="tag">SECURITY</div><h3>보안과 구축 방식</h3>' + lis(['현장 – 서버 구간 TLS 암호화', '클라우드형 또는 온프레미스형(고객사 서버 · 사내망)', '네트워크 구성은 고객사 보안 정책에 맞춰 협의']) + '</div></div>'
        '<div style="margin-top:18px;font-size:13px;font-weight:700;color:#8A94A6">참고 — 일반적인 데이터 수집 구성 (업체 여러 곳이 나눠 맡는 구조)</div>'
        '<div class="flow" style="margin-top:6px"><div class="fb"><b>설비 · 센서</b></div><div class="ar" style="border-left-color:#B8C2D0"></div><div class="fb"><b>제어 PLC</b></div><div class="ar" style="border-left-color:#B8C2D0"></div><div class="fb" style="border:2px dashed #E83E30"><b style="color:#E83E30">별도 게이트웨이 · 산업용 PC</b><span>추가 장비 · 설치 · 관리 지점</span></div><div class="ar" style="border-left-color:#B8C2D0"></div><div class="fb"><b>SCADA · 서버</b></div><div class="ar" style="border-left-color:#B8C2D0"></div><div class="fb"><b>귀사 플랫폼</b></div></div>')


def data():
    js = ('{\n  <b>"site_id"</b>: "PLANT-01",\n  <b>"equipment_id"</b>: "PUMP-01",\n  <b>"timestamp"</b>: "2026-10-07T09:30:00+09:00",\n  <b>"status"</b>: "warning",\n  <b>"sensors"</b>: [\n'
          '    { <b>"id"</b>: "bearing_temp", <b>"value"</b>: 48.2,\n      <b>"unit"</b>: "°C", <b>"status"</b>: "normal" },\n'
          '    { <b>"id"</b>: "vibration", <b>"value"</b>: 4.8,\n      <b>"unit"</b>: "mm/s", <b>"status"</b>: "warning" }\n  ]\n}')
    tb = ('<table class="sm"><tr><th style="width:150px">제공 방식</th><th>내용</th></tr>'
          '<tr><td class="k">REST API</td><td>설비 · 센서 목록, 최신값, 기간별 이력, 알람 이력 조회</td></tr>'
          '<tr><td class="k">WebSocket</td><td>측정값 · 상태 변경을 실시간으로 수신</td></tr>'
          '<tr><td class="k">CSV</td><td>기간별 이력 내보내기 (테스트 · 분석용)</td></tr></table>')
    return page('Data Delivery', '설비가 달라도<br><b>데이터 구조는 같습니다</b>',
        '<div class="row top" style="margin-top:22px"><div style="flex:1">'
        '<p class="lead" style="margin-top:0">설비 → 센서 → 실시간값 → 상태의 표준 구조로 제공해, 설비가 늘어나도 연동 코드를 다시 만들 필요가 없습니다.</p>'
        f'<div style="margin-top:16px">{tb}</div>'
        '<div class="gc dark" style="margin-top:16px;padding:16px 20px"><h3 style="font-size:17px">통신이 끊겨도 데이터는 남습니다</h3><p style="font-size:13.5px;line-height:1.55">끊긴 동안의 측정값은 제어반에 보관했다가, 연결이 복구되면 오래된 순서대로 자동 재전송합니다. 측정 시각은 현장에서 기록하고 메시지마다 순번을 붙여, 서버에서 중복과 누락을 가려냅니다.</p></div>'
        '<div class="gc" style="margin-top:12px;padding:14px 20px"><h3 style="font-size:15.5px">버전 관리되는 자체 OT 데이터 규격</h3><p>MQTT 토픽 구조 · 메시지 형식 · 표준 Tag 이름 규칙 — 세부 규격 문서는 NDA 체결 후 제공합니다.</p></div></div>'
        f'<div style="width:520px"><div class="tag" style="margin-bottom:8px">DATA SAMPLE · 구조 설명용</div><div class="mono">{js}</div>'
        '<div class="cap" style="margin-top:10px">샘플 JSON · 24시간 시계열 CSV · 데이터 연동 개요서(2쪽): donginensis.com/partner.html#dev</div></div></div>',
        '※ 엔드포인트 · 인증 방식 · 갱신 주기 등 세부 규격은 기술 미팅에서 협의합니다. 실제 항목과 값은 현장과 프로젝트에 따라 달라질 수 있습니다.')


def models():
    M = [('MODEL 01', 'OT 구간 전담', '귀사 프로젝트에서 제어반 · PLC · 현장 설치를 동인엔시스가 맡습니다.', ['제어반 설계 · 제작 · 설치', 'PLC · 인버터 · 센서 연동', '현장 시운전 · 유지보수']),
         ('MODEL 02', '데이터 연동', '지능형 제어반이 수집한 설비 데이터를 표준 API로 귀사 플랫폼에 제공합니다.', ['표준 데이터 구조', 'REST API · WebSocket', 'MES · AI · 디지털트윈 연결']),
         ('MODEL 03', '공동 제안 · 영업', '제조 고객과 지원사업을 함께 발굴하고 공동으로 제안합니다.', ['제조 고객 공동 발굴', '정부 지원사업 공동 참여', '시연 장비 활용 공동 영업'])]
    return page('Partnership Model', '세 가지 방식으로<br><b>함께합니다</b>',
        '<div class="row" style="margin-top:24px">' + ''.join(f'<div class="model"><div class="no">{a}</div><h3>{b}</h3><p>{c}</p>{lis(d)}</div>' for a, b, c, d in M) + '</div>'
        '<div class="row" style="margin-top:18px">'
        '<div class="box navy" style="flex:1.2"><div class="tag">GOVERNMENT PROGRAMS</div><h3>지원사업을 함께 활용합니다</h3>'
        + lis(['중소벤처기업부 <b style="color:#fff">스마트공장 공급기업</b> 등록 — 구성안 · 신청 자료 공동 준비', '산업통상자원부 AI 팩토리 전문기업 선정 · 데이터바우처 · AI바우처 공급기업 등록 준비 중', '혁신프리미어 1000(산업통상자원부, 2026) 선정 기업']) + '</div>'
        '<div class="box" style="flex:1"><div class="tag">DEMO</div><h3>시연 장비로 먼저 검증</h3>' + lis(['샘플 데이터로 귀사 시스템에서 구조 확인', '시연 장비 · 테스트 데이터로 실제 연동 검증', '검증 범위 · 일정은 기술 미팅에서 결정']) + '</div></div>')


def trust():
    pills = ['설계 · 제작 · PLC · FAT · 시운전 일괄 수행', '양산 1 · 2공장 · 기장공장 · FAT 테스트 라인', 'ISO 9001 · 14001 · 45001', 'Schneider Electric 공식 SI 파트너', 'ABB · Fuji Electric · Eaton · Danfoss 공급', '액화수소충전소 제어시스템 특허 5건 (특허청)']
    return page('Why DONG-IN ENSIS', '35년간 제어반을 만든 회사가<br><b>현장 데이터를 책임집니다</b>',
        '<div class="row six" style="margin-top:22px">' + bs.STATS6 + '</div>'
        '<div style="margin-top:18px">' + ''.join(f'<span class="pill">{x}</span>' for x in pills) + '</div>'
        f'<div class="row" style="margin-top:12px"><img class="ph" src="{X("fac_yangsan2.jpg")}" style="flex:1;height:210px"><img class="ph" src="{X("ship_engroom.jpg")}" style="flex:1;height:210px"><img class="ph" src="{X("ref_hmg1.jpg")}" style="flex:1;height:210px;object-position:center top"><img class="ph" src="{SITE}/img/sites/lh2-panel-overview.jpg" style="flex:1;height:210px"></div>',
        '양산 2공장 · 선박 기관실 제어반 · 해외 생산라인 제어반 · 액화수소충전소 제어시스템')


def process():
    S = [('STEP 1', '협업 문의', '귀사 솔루션과 대상 프로젝트 공유'), ('STEP 2', '기술 미팅', '연동 범위 · 역할 분담 협의, 세부 규격 제공 (필요 시 NDA)'),
         ('STEP 3', '시연 · 테스트', '시연 장비와 테스트 데이터로 연동 검증'), ('STEP 4', '공동 프로젝트', '고객 현장 적용, 공동 제안 · 수행')]
    st = ''.join(f'<div class="fb" style="text-align:left;padding:16px 18px;background:rgba(255,255,255,.06);border-color:rgba(191,211,236,.35);color:#fff"><span style="color:#FF8A80;font-weight:800;font-size:12px">{a}</span><b style="font-size:18px;margin:4px 0 6px">{b}</b><span style="font-size:13px;line-height:1.5;display:block;color:#D6E4F5">{c}</span></div>' + ('<div class="ar" style="border-left-color:#8FC1FF"></div>' if i < 3 else '') for i, (a, b, c) in enumerate(S))
    qr = segno.make('https://donginensis.com/partner.html?utm_source=partner_deck&utm_medium=pdf', error='m')
    qsvg = f'{ROOT}/out/qr_partner.svg'; qr.save(qsvg, scale=10, border=0, dark='#111B2E')
    return f'''<div class="page" style="background:#0F3F7E;color:#fff;padding:0">
<img src="{LOGOW}" style="position:absolute;left:82px;top:72px;height:32px">
<div style="position:absolute;left:82px;top:170px;width:960px"><div style="font-size:14px;font-weight:700;letter-spacing:4px;color:#8FC1FF">PROCESS · CONTACT</div>
<div style="font-size:44px;font-weight:800;line-height:1.24;margin-top:14px">현장 데이터가 필요한 프로젝트,<br><span style="color:#8FC1FF">기술 미팅부터 시작하세요.</span></div></div>
<div style="position:absolute;right:82px;top:170px;background:#fff;border-radius:12px;padding:14px;text-align:center"><img src="{qsvg}" style="width:130px;height:130px;display:block"><div style="font-size:11.5px;color:#0F3F7E;margin-top:8px;font-weight:700">IT기업 협업 안내</div></div>
<div class="flow" style="position:absolute;left:82px;right:82px;top:360px;margin:0">{st}</div>
<div style="position:absolute;left:82px;right:82px;top:560px;border-top:1px solid rgba(191,211,236,.35);padding-top:24px;display:flex;gap:60px">
<div style="flex:1"><div class="tag" style="color:#8FC1FF">RESOURCES</div><p style="font-size:14px;line-height:1.7;color:#D6E4F5;margin-top:6px">데이터 연동 개요서 · 샘플 JSON · 시계열 CSV · 보안 구성 안내<br>donginensis.com/partner.html#dev</p></div>
<div style="width:460px"><div class="tag" style="color:#8FC1FF">CONTACT</div><p style="font-size:14px;line-height:1.7;color:#D6E4F5;margin-top:6px">TEL 051-862-3668 · E-mail dongin@donginmne.com<br>Web donginensis.com<br>㈜동인엔시스 · 부산광역시 부산진구 진연로9번길 47</p></div></div>
<div style="position:absolute;left:82px;top:767px;font-size:12px;color:#8FC1FF">설비를 제어하고, 데이터를 연결하다.</div></div>'''


def build():
    P = [cover(), pains(), roles(), connect(), data(), models(), trust(), process()]
    P = [p.replace('{num}', f'{i + 1:02d}') for i, p in enumerate(P)]
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{"".join(P)}</body></html>', len(P)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--png', action='store_true'); a = ap.parse_args()
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    h, n = build()
    asyncio.run(bs.render('partner_KR', h, a.png)); print('done', n, 'pages')
