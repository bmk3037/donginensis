"""지능형 제어반 데이터 연동 개요 (IT 파트너용, A4 2쪽)

사용법
  python3 build_overview.py            # → out/overview_KR.pdf  → files/partner/DONG-IN-ENSIS_Data-Integration-Overview_KR.pdf 로 복사

문구는 홈페이지 IT기업 협업 페이지(partner.html)와 FAQ 기준입니다. 구현이 확인된 기능(통신 단절 시 보관·재전송)만 '합니다'로 쓰고,
나머지 연동 방식은 '원칙 · 프로젝트별 협의'로 씁니다.
"""
import asyncio, os
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
DATE = '2026.10'

CSS = f"""
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Regular.otf);font-weight:400}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-SemiBold.otf);font-weight:600}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-Bold.otf);font-weight:700}}
@font-face{{font-family:P;src:url({ROOT}/fonts/Pretendard-ExtraBold.otf);font-weight:800}}
@page{{size:A4;margin:0}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{background:#fff;font-family:P,sans-serif;color:#111B2E;word-break:keep-all}}
.pg{{width:794px;min-height:1123px;padding:52px 58px 56px;page-break-after:always;position:relative}}
.pg:last-child{{page-break-after:auto}}
.co{{font-size:9.5px;font-weight:700;color:#5A6577;letter-spacing:.5px}}
h1{{font-size:21px;font-weight:800;color:#0F3F7E;margin-top:6px;letter-spacing:-.3px}}
.sub{{font-size:9.5px;color:#1857A5;font-weight:600;margin-top:5px}}
.lead{{font-size:9.6px;line-height:1.65;color:#324055;margin-top:12px}}
h2{{font-size:12.5px;font-weight:800;color:#1857A5;margin:18px 0 8px;page-break-after:avoid}}
.sec{{page-break-inside:avoid}}
ul{{list-style:none}} li{{font-size:9.4px;line-height:1.6;color:#324055;padding-left:11px;position:relative;margin-bottom:4px}}
li:before{{content:"·";position:absolute;left:1px;top:0;color:#1857A5;font-weight:800}}
li b{{color:#111B2E;font-weight:700}}
table{{width:100%;border-collapse:collapse;font-size:9px;margin-top:2px}}
th{{text-align:left;font-weight:700;color:#0F3F7E;background:#EAF1FA;padding:5px 8px;border-top:1.5px solid #1857A5;border-bottom:1px solid #C9D3E0}}
td{{padding:4.5px 8px;border-bottom:1px solid #E2E7EE;line-height:1.45;vertical-align:top;color:#324055}} td.k{{font-weight:600;color:#111B2E;font-family:Consolas,monospace;font-size:8.8px}} td.n{{font-weight:600;color:#111B2E}}
.note{{font-size:8.6px;color:#8A94A6;margin-top:8px;line-height:1.55}}
.dia{{display:flex;align-items:stretch;gap:0;margin:4px 0 10px;background:#F5F7FA;border:1px solid #E2E7EE;border-radius:8px;padding:12px 12px 10px}}
.pan{{border-radius:6px;padding:8px 10px 8px;position:relative}}
.pan .lb{{font-size:7.5px;font-weight:800;letter-spacing:1px;color:#5A6577;margin-bottom:6px}}
.ot{{background:#fff;border:1px dashed #B8C2D0;flex:1.55}} .it{{background:#fff;border:1px dashed #B8C2D0;flex:.8;display:flex;flex-direction:column}}
.rw{{display:flex;align-items:center;gap:6px}} .rw+.rw{{margin-top:7px}}
.bx{{flex:1;border:1px solid #D5DCE6;border-radius:5px;padding:6px 7px;text-align:center;background:#fff;min-width:0}}
.bx b{{display:block;font-size:9px;font-weight:700}} .bx span{{display:block;font-size:7.5px;color:#5A6577;margin-top:1px;line-height:1.35}}
.bx.dk{{background:#1857A5;border-color:#1857A5;color:#fff}} .bx.dk span{{color:#D6E4F5}}
.bx.rd{{background:#E83E30;border-color:#E83E30;color:#fff}} .bx.rd span{{color:#FFE1DD}}
.bx.ds{{border:1.5px dashed #1857A5}} .bx.ds b{{color:#1857A5}}
.ar{{width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid #1857A5;flex:none}}
.arl{{display:flex;flex-direction:column;align-items:center;justify-content:center;width:62px;flex:none;gap:3px}}
.arl span{{font-size:7.2px;font-weight:700;color:#E83E30;text-align:center;line-height:1.2}} .arl.b span{{color:#1857A5}}
.hub{{display:flex;align-items:center;flex:none;width:92px}} .hub .bx{{width:100%}}
.it .bx+.bx{{margin-top:7px}}
.cap{{font-size:7.6px;color:#8A94A6;margin-top:7px}}
.dl{{font-size:9.6px;font-weight:700;color:#1857A5;margin-top:6px}}
.ct{{font-size:9.6px;font-weight:700;margin-top:12px}}
.ft{{position:absolute;left:58px;right:58px;bottom:26px;display:flex;justify-content:space-between;font-size:7.8px;color:#8A94A6}}
"""


def tbl(head, rows, kcol=True):
    h = ''.join(('<th style="width:%s">%s</th>' % (w, t)) if w else ('<th>%s</th>' % t) for t, w in head)
    r = ''.join('<tr>' + ''.join(f'<td class="{"k" if kcol and i == 0 else ("n" if i == 0 else "")}">{c}</td>' for i, c in enumerate(row)) + '</tr>' for row in rows)
    return f'<table><tr>{h}</tr>{r}</table>'


def diagram():
    return ('<div class="dia">'
            '<div class="pan ot"><div class="lb">고객 현장 (OT)</div>'
            '<div class="rw"><div class="bx"><b>설비 · 센서</b><span>모터 · 펌프 · 인버터 · 온도 · 진동 · 전력</span></div><div class="ar"></div>'
            '<div class="bx dk" style="flex:1.3"><b>지능형 제어반</b><span>PLC 실시간 제어 + 데이터 수집 · 단절 시 보관 · 재전송</span></div></div>'
            '<div class="rw"><div class="bx"><b>기존 · 타사 PLC</b><span>미쓰비시 · LS · 지멘스 등 설치된 설비</span></div><div class="ar"></div>'
            '<div class="bx ds" style="flex:1.3"><b>읽기 전용 연동</b><span>OPC UA → Modbus TCP → 전용 프로토콜(게이트웨이)</span></div></div>'
            '<div class="cap">※ 신규 설비는 별도 게이트웨이 · 산업용 PC 없이 직접 연결 · 인터록과 최종 제어는 현장 PLC 보유</div></div>'
            '<div class="arl"><span>MQTT · TLS</span><div class="ar"></div><span style="color:#5A6577;font-weight:600">암호화 전송</span></div>'
            '<div class="hub"><div class="bx rd"><b>DataHub</b><span>표준 구조 · 시계열 저장<br>클라우드 / 고객사 서버</span></div></div>'
            '<div class="arl b"><span>REST API</span><div class="ar"></div><span>WebSocket</span></div>'
            '<div class="pan it"><div class="lb">클라우드 · 연동 (IT)</div>'
            '<div class="bx"><b>고객 대시보드</b><span>모니터링 · 알람</span></div>'
            '<div class="bx"><b>파트너 시스템</b><span>MES · AI · 디지털트윈</span></div></div></div>')


def page1():
    return f'''<div class="pg">
<div class="co">㈜동인엔시스 · DONG-IN ENSIS</div>
<h1>지능형 제어반 데이터 연동 개요</h1>
<div class="sub">IT 기업 · 스마트공장 공급기업 파트너용 | {DATE}</div>
<p class="lead">이 문서는 지능형 제어반이 수집한 설비 데이터를 귀사 플랫폼(MES · AI · 디지털트윈 등)과 연동할 때의 구조와 방식을 소개합니다. 필드 이름 · 갱신 주기 · 인증 방식 등 세부 규격은 기술 미팅(필요 시 NDA)에서 프로젝트별로 협의해 제공합니다.</p>
<div class="sec"><h2>1. 연결 구조</h2>{diagram()}
<ul>
<li>지능형 제어반의 PLC가 설비를 제어하면서 운전 데이터를 수집하고, MQTT 방식으로 클라우드 · 고객사 서버에 전송합니다. 통신 구간은 TLS로 암호화됩니다.</li>
<li><b>신규 설비</b>는 별도 수집 게이트웨이나 산업용 PC 없이 직접 연결합니다.</li>
<li><b>기존 · 타사 PLC</b>(미쓰비시 · LS · 지멘스 등)는 데이터를 읽기만 하며, OPC UA → Modbus TCP → 제조사 전용 프로토콜(게이트웨이) 순으로 현장에 맞는 방식을 정합니다. 기종과 통신 방식은 현장 분석에서 확인해 프로젝트별로 제안합니다.</li>
<li>서버는 설비를 직접 제어하지 않으며, 인터록과 최종 제어 권한은 현장 PLC가 보유합니다.</li>
<li><b>통신 단절 시</b>에도 설비 제어는 현장 PLC가 계속합니다. 끊긴 동안의 측정값은 제어반에 보관했다가 연결이 복구되면 오래된 순서대로 자동 재전송하며, 측정 시각은 현장에서 기록하고 메시지마다 순번을 붙여 서버에서 중복과 누락을 가려냅니다.</li>
<li><b>구축 방식</b>: 클라우드형(동인엔시스 클라우드) 또는 온프레미스형(고객사 서버 · 사내망에 DataHub · 대시보드 설치) 중 선택할 수 있으며, 두 방식 모두 같은 데이터 구조와 API로 제공됩니다.</li>
</ul></div>
<div class="sec"><h2>2. 데이터 모델</h2>
<p class="lead" style="margin-top:0;margin-bottom:6px">설비 → 센서 → 실시간값 → 상태의 공통 구조로 제공되며, 설비와 센서가 늘어나도 같은 구조가 유지됩니다.</p>
{tbl([('필드', '150px'), ('형식', '52px'), ('설명', None)], [
    ('site_id', '문자열', '현장(공장 · 선박 등) 식별자'), ('equipment_id', '문자열', '설비 식별자'), ('equipment_type', '문자열', '설비 유형 (예: pump, fan, compressor)'),
    ('timestamp', '문자열', '측정 시각, ISO 8601 (예: 2026-10-07T09:30:00+09:00) — 현장에서 기록'), ('status', '문자열', '설비 상태: normal · warning · alarm (센서 상태 중 가장 높은 단계)'),
    ('sensors[].id', '문자열', '센서 식별자'), ('sensors[].type', '문자열', '센서 종류 (예: temperature, current, vibration)'), ('sensors[].value', '숫자', '측정값'),
    ('sensors[].unit', '문자열', '단위 (예: °C, A, mm/s)'), ('sensors[].status', '문자열', '센서 상태: normal · warning · alarm'), ('sensors[].threshold', '객체', '상태 판정 기준값 {{ warning, alarm }} (설정된 경우)')])}</div>
<div class="ft"><span>DONG-IN ENSIS · 지능형 제어반 데이터 연동 개요 · {DATE}</span><span>1 / 2</span></div></div>'''


def page2():
    return f'''<div class="pg">
<div class="sec"><h2 style="margin-top:0">3. 제공 방식</h2>
{tbl([('방식', '90px'), ('용도', '70px'), ('내용', None)], [('REST API', '조회', '설비 · 센서 목록, 최신값, 기간별 이력, 알람 이력 조회'), ('WebSocket', '실시간', '측정값 · 상태 변경을 실시간으로 수신'), ('파일(CSV)', '일괄 확인', '기간별 이력 내보내기 (테스트 · 분석용)')], kcol=False)}
<p class="note">※ 엔드포인트 주소, 인증 방식(API Key 등), 호출 한도, 갱신 주기는 기술 미팅에서 협의합니다. MQTT 토픽 구조 · 메시지 형식 · 표준 Tag 이름 규칙을 정한 동인엔시스 OT 데이터 규격(버전 관리)은 NDA 체결 후 제공합니다.</p></div>
<div class="sec"><h2>4. 보안</h2><ul>
<li>현장–클라우드 구간 TLS 암호화 통신 (MQTT)</li>
<li>제어 권한은 현장 PLC에 유지 — 클라우드에서 설비를 직접 제어하지 않음</li>
<li>현장 통신 환경에 따라 LTE 회선으로 사내망과 분리 구성 가능</li>
<li>온프레미스형은 외부 인터넷 연결 없이 고객사 사내망 안에서 운영 가능 (서버는 고객사 보유 서버 활용 또는 동인엔시스 공급)</li>
<li>설치된 제어반의 PLC 모델 · 펌웨어 · 인증서 만료일을 대장으로 관리하는 것을 원칙으로 하며, 펌웨어 · 프로그램 변경은 사전 시험과 고객 승인을 거쳐 진행 (세부 운영 방식은 고객사 보안 정책에 맞춰 계약 시 협의)</li>
<li>접근 계정 · 권한, 데이터 이용 범위와 보관 기간은 고객사 · 파트너사 · 동인엔시스 간 프로젝트 계약에서 정함</li></ul></div>
<div class="sec"><h2>5. 연동 진행 절차</h2>
{tbl([('단계', '110px'), ('내용', None)], [('1. 협업 문의', '귀사 솔루션과 대상 프로젝트 공유'), ('2. 기술 미팅', '연동 범위 · 역할 분담 협의, 세부 규격 제공 (필요 시 NDA)'), ('3. 시연 · 테스트', '시연 장비와 테스트 데이터로 연동 검증'), ('4. 공동 프로젝트', '고객 현장 적용, 공동 제안 · 수행')], kcol=False)}</div>
<div class="sec"><h2>6. 샘플 데이터 · 관련 자료</h2><ul>
<li><b>sample_payload.json</b> — 설비 1대(센서 3종)의 실시간 데이터 예시</li>
<li><b>sample_timeseries.csv</b> — 펌프 1대, 24시간 · 10분 간격 시계열 예시 (진동 경고 구간 포함)</li>
<li><b>IT 파트너 제안서 (PDF, 8장)</b> — 역할 분담 · 연결 구조 · 협업 모델 · 진행 절차</li></ul>
<div class="dl">내려받기: donginensis.com/partner.html#dev</div>
<p class="note">※ 본 문서와 샘플 데이터는 구조 설명을 위한 예시이며, 실제 항목과 값은 현장과 프로젝트에 따라 달라질 수 있습니다.</p>
<div class="ct">문의 051-862-3668 · dongin@donginmne.com · donginensis.com</div></div>
<div class="ft"><span>DONG-IN ENSIS · 지능형 제어반 데이터 연동 개요 · {DATE}</span><span>2 / 2</span></div></div>'''


async def render():
    os.makedirs(f'{ROOT}/out', exist_ok=True)
    hp = f'{ROOT}/out/overview_KR.html'
    open(hp, 'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{page1()}{page2()}</body></html>')
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg = await b.new_page(viewport={'width': 794, 'height': 1123})
        await pg.goto(f'file://{hp}'); await pg.wait_for_timeout(800)
        hs = await pg.evaluate("[...document.querySelectorAll('.pg')].map(p=>p.scrollHeight)")
        print('page heights (must be <= 1123):', hs)
        await pg.pdf(path=f'{ROOT}/out/overview_KR.pdf', format='A4', print_background=True, margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
        await b.close()


if __name__ == '__main__':
    asyncio.run(render()); print('done')
