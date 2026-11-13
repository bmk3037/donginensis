"""「수소 제어시스템」 페이지(국문 hydrogen-control-system.html · 영문 en/hydrogen-control-system.html) 생성.

틀(머리·메뉴·꼬리말·문의 폼)은 PLC 프로그램 개발 페이지 생성기(build_plc_page.py)를 그대로 쓰고, 내용만 여기서 정한다.
문구를 고칠 때는 이 파일을 고치고 다시 실행한다: python3 _src/seo/build_h2_page.py

사실 확인된 내용만 쓴다.
- 실적·인증: 적용 분야(applications.html) 수소·에너지와 「주요 납품 실적」 표, 회사소개(수소전문기업 등록 2026)
- 특허 5건·해수부 과제·액화수소 전력제어: 보도자료 news-hydrogen-patents-5 / news-lh2-station-control / news-pre-hydrogen-company,
  블로그 knowledge/company.md(해수부 과제 2022.4~2026.12, 통합제어·감시·시스템 통합 담당)
- 그림은 적용 분야 페이지의 수소 분야 그림(적용 시나리오 예시)이므로 캡션에 연출 이미지라고 적는다.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_plc_page import build  # noqa: E402

NAME = 'hydrogen-control-system.html'
OG = 'https://donginensis.com/img/apps/og_h2.jpg'
IMGS = {'main': ('img/apps/h2-lh2-station.jpg', 1200, 900), 'side': ('img/apps/h2-vessel-panel-a.jpg', 1200, 900),
        'wide': ('img/apps/h2-lh2-control.jpg', 1344, 752)}

KO = dict(
    lang='ko', src='manufacturing.html', out=NAME, name=NAME, form_lang='KO', root='', imgs=IMGS, og=OG, form_type='수소 제어시스템',
    title='액화수소충전소 제어시스템 · 수소 제어 | (주)동인엔시스',
    desc='액화수소충전소 제어시스템(VFD·PLC·UPS) 공급 실적과 특허 5건을 가진 수소전문기업. 수소추진선박 시스템통합제어, 수소·에너지 설비 제어반을 설계·제작합니다.',
    keywords='액화수소, 액화수소충전소, 액화수소충전소 제어시스템, 수소충전소 제어, 수소 제어시스템, 수소추진선박, 수소전문기업, 수소 특허, 연료전지 제어, 동인엔시스',
    kicker='Hydrogen Control Systems',
    h1='액화수소충전소 제어,<br><span class="rl">상용 현장에서 검증</span>했습니다.',
    lead='(주)동인엔시스는 산업통상자원부 수소전문기업입니다. 상용 액화수소충전소에 VFD·PLC·UPS 제어시스템을 공급해 운영 실증을 이어 가고 있으며, 액화수소충전소 제어시스템 특허 5건과 수소추진선박 실증 과제 경험으로 수소 설비의 안전한 운전과 데이터 관리를 지원합니다.',
    cta=('수소 제어시스템 문의 →', 'tel:0518623668', '전화 상담 051-862-3668'),
    check_k='Check', check_h='이런 수소 설비를<br><span class="b">준비하신다면</span>',
    checks=['액화수소충전소의 펌프·기화기·배관 설비 제어시스템이 필요하다', '수소충전소 제어반을 실적 있는 업체에 맡기고 싶다',
            '수소추진선박의 연료전지·추진모터·수소탱크를 통합 제어해야 한다', '수소 설비의 운전·전력 데이터를 수집하고 관리하고 싶다',
            '외산 제어장비 의존도를 줄이고 국산 제어시스템을 쓰고 싶다', '연료전지 발전소 등 에너지 플랜트의 BOP 제어가 필요하다'],
    scope_k='Scope', scope_h='수소 제어시스템<br><span class="b">공급 범위</span>',
    img_alt='액화수소충전소 제어시스템 – 액화수소 저장설비 옆 제어반을 점검하는 엔지니어', img_cap='액화수소충전소의 제어반(이해를 돕기 위한 연출 이미지)',
    rack_alt='수소추진선박 제어반 – 수소탱크 옆에 설치된 선박용 제어반', rack_cap='수소추진선박의 제어반(이해를 돕기 위한 연출 이미지)',
    comm_alt='액화수소충전소 제어설비 – 저장탱크 옆에 설치된 제어반', comm_cap='액화수소충전소 제어설비(이해를 돕기 위한 연출 이미지)',
    scope=[('01', '액화수소충전소 제어시스템', 'VFD·PLC·UPS 제어시스템으로 충전소 설비를 제어·감시합니다. 실시간 모니터링, 에너지 효율, 안전 관리 기능을 하나의 제어 시스템으로 묶습니다.'),
           ('02', '액화수소 전력제어', '펌프·열매체유 순환 장비의 실시간 정밀 제어와 에너지 절감, 설비 보호 기술을 액화수소충전소용 지능형 전력제어 시스템으로 상용화하고 있습니다.'),
           ('03', '수소추진선박 시스템통합제어', '연료전지·추진모터·수소탱크를 통합 제어·감시합니다. 해양수산부 「안전기반 소형 수소추진선박 기술개발 및 실증」 과제에 참여하고 있습니다.'),
           ('04', '수소·에너지 플랜트 BOP 제어', '연료전지 발전소 탄소 포집·활용·저장(CCUS) 설비의 BOP 제어시스템을 공급했습니다.')],
    brand_k='Credentials', brand_h='수소 분야<br><span class="b">인증과 기술</span>',
    brands=['산업통상자원부 수소전문기업', '액화수소충전소 제어시스템 특허 5건', '해양수산부 수소추진선박 실증 과제 참여', 'ISO 45001 안전보건경영', 'Schneider Electric 공식 SI 파트너'],
    brand_note='특허 5건은 전력제어 로직, 운전 안전성, 에너지 효율 최적화, 설비 보호 알고리즘과 운전 데이터를 설계에 되돌리는 데이터 순환형 사업 구조를 다룹니다.',
    proc_k='Process', proc_h='진행 절차',
    proc=[('STEP 1', '사양 · 안전 요구 확인', '대상 설비, 운전 조건, 고객 사양서·안전 요구 확인'), ('STEP 2', '제어 설계', '운전 순서·인터록·알람, 입출력(I/O) 목록, 전력 구성'),
          ('STEP 3', '제작 · 프로그램', '제어반 제작·배선, PLC·인버터 프로그램'), ('STEP 4', '공장검사', '출하 전 동작·인터록·알람·보호 시험'),
          ('STEP 5', '설치 · 시운전', '현장 설치, 시운전, 운영 지원과 데이터 관리')],
    why_k='Why DONG-IN ENSIS', why_h='수소 설비 제어,<br><span class="b">실적과 특허로</span>',
    why=[('5', '액화수소충전소 제어시스템 특허'), ('35<sup>+</sup>', 'Years · 1991년 설립'), ('750<sup>+</sup>', '제어시스템 프로젝트')],
    why_txt=[('상용 충전소 공급 실적', '상용 액화수소충전소에 VFD·PLC·UPS 제어시스템을 공급하고 운영 실증을 이어 가고 있습니다.'),
             ('국가 과제로 검증한 기술', '해양수산부 수소추진선박 실증 과제에서 통합제어·감시·시스템 통합을 맡아 검증한 기술을 특허로 정리했습니다.'),
             ('LNG 연료가스 제어 경험', '선박 LNG 연료가스공급(FGSS)·BOG 압축기 제어시스템을 국내외 조선소에 공급하며 쌓은 가스 설비 제어 경험을 수소에 잇고 있습니다.')],
    refs_h='수소 · 에너지 주요 실적', refs_cols=('분야', '발주처 · 현장', '공급 범위'),
    refs=[('액화수소충전소', 'SK E&S 액화수소충전소', 'VFD · PLC · UPS 제어시스템 공급, 상용 충전소 운영 실증'),
          ('수소추진선박', '해양수산부 안전기반 소형 수소추진선박 기술개발 및 실증 (2022.4~2026.12)', '통합제어 · 감시 · 시스템 통합'),
          ('에너지 플랜트', 'SK 에코플랜트 · 한국남부발전 연료전지 발전소 CCUS 설비', 'CCUS 설비 BOP 제어시스템')],
    refs_note='수소 외 선박·LNG·산업 플랜트 실적은 적용 분야 페이지에서 볼 수 있습니다.',
    links=[('수소·에너지 적용 사례 →', 'applications.html#hydrogen'), ('수소 특허 5건 보도 →', 'news-hydrogen-patents-5.html'),
           ('액화수소충전소 제어시스템 보도 →', 'news-lh2-station-control.html'), ('제어반 제작 →', 'control-panel-manufacturing.html')],
    faq_k='FAQ', faq_h='자주 묻는 질문',
    faq=[('액화수소충전소 제어시스템 실적이 있나요?', '네. SK E&S 액화수소충전소에 VFD·PLC·UPS 제어시스템을 공급했고, 상용 충전소 운영 실증을 이어 가고 있습니다.'),
         ('수소 관련 인증이나 특허가 있나요?', '산업통상자원부 수소전문기업으로 등록되어 있고, 액화수소충전소 제어시스템 관련 특허 5건을 보유하고 있습니다. 특허는 전력제어 로직, 운전 안전성, 에너지 효율 최적화, 설비 보호 알고리즘 등을 다룹니다.'),
         ('액화수소충전소에서 무엇을 제어하나요?', '충전소 설비의 제어·감시를 맡습니다. 펌프·열매체유 순환 장비의 정밀 제어와 실시간 모니터링, 에너지 효율, 안전 관리 기능을 하나의 제어 시스템으로 묶습니다.'),
         ('수소추진선박 제어도 하나요?', '네. 해양수산부 「안전기반 소형 수소추진선박 기술개발 및 실증」 과제(2022.4~2026.12)에 참여해 연료전지·추진모터·수소탱크의 통합제어·감시·시스템 통합을 맡고 있습니다.'),
         ('수소 설비 데이터도 수집할 수 있나요?', '네. 제어반에서 설비를 제어하면서 운전·전력 데이터를 함께 수집하는 구조를 단계적으로 구축하고 있으며, 지능형 제어반으로 클라우드나 고객사 서버에 연결할 수 있습니다.'),
         ('기간과 비용은 어느 정도인가요?', '설비 구성, 안전 요구, 제어반 수와 사양에 따라 달라집니다. 사양서나 설비 목록을 주시면 검토 후 구성안과 함께 견적을 드립니다.')],
    iq_k='Inquiry', iq_h='수소 제어시스템<br><span class="b">문의</span>',
    iq_lead='수소 설비와 필요한 제어 범위를 남겨 주시면 담당 엔지니어가 검토 후 연락드립니다. 사양서가 있으면 함께 알려 주십시오.',
    iq_side=[('회신', '영업일 기준 1~2일 이내 연락드립니다.'), ('검토 내용', '대응 가능 여부, 권장 구성, 예상 일정'), ('전화 상담', '<a href="tel:0518623668">051-862-3668</a>')],
    f=dict(company='회사명', name='담당자명', position='부서 / 직책', phone='연락처', email='이메일', region='설비 소재지 (시·도)', region_ph='예: 울산',
           ctl='대상 설비 · 규모', ctl_ph='예: 액화수소충전소 펌프·기화기', work='문의 분야 (복수 선택)',
           works=['액화수소충전소 제어', '수소충전소 제어반', '수소추진선박 제어', '연료전지 · 에너지 플랜트', '설비 데이터 수집', '견적 요청'],
           msg='문의 내용', msg_ph='설비 구성, 사양서 유무, 희망 일정 등을 자유롭게 적어 주십시오.', submit='문의하기',
           ok='<b>문의가 접수되었습니다.</b>검토 후 영업일 기준 1~2일 이내에 연락드리겠습니다.'),
)

EN = dict(
    lang='en', src='en/manufacturing.html', out='en/' + NAME, name=NAME, form_lang='EN', root='../', imgs=IMGS, og=OG, form_type='수소 제어시스템',
    title='Liquid Hydrogen Station Control Systems | DONG-IN ENSIS',
    desc='Hydrogen control systems from a designated hydrogen specialist company in Korea: VFD, PLC and UPS control for a liquid hydrogen refueling station, five patents.',
    keywords='liquid hydrogen, liquid hydrogen station control, hydrogen refueling station control system, hydrogen control system, hydrogen-powered vessel, fuel cell control, Korea, DONG-IN ENSIS',
    kicker='Hydrogen Control Systems',
    h1='Liquid hydrogen station control,<br><span class="rl">proven at a commercial site.</span>',
    lead='DONG-IN ENSIS is a designated hydrogen specialist company (Ministry of Trade, Industry and Energy, Korea). We supplied the VFD, PLC and UPS control system for a commercial liquid hydrogen refueling station and continue its operation pilot. With five patents on liquid hydrogen station control and a hydrogen-powered vessel R&D project, we support safe operation and data management of hydrogen equipment.',
    cta=('Ask about hydrogen control →', 'tel:+82518623668', 'Call +82-51-862-3668'),
    check_k='Check', check_h='If you are planning<br><span class="b">hydrogen equipment</span>',
    checks=['You need a control system for pumps, vaporizers and piping at a liquid hydrogen station', 'You want a hydrogen station control panel from a builder with references',
            'Fuel cells, propulsion motors and hydrogen tanks on a vessel must be controlled as one system', 'You want to collect operating and power data from hydrogen equipment',
            'You want to rely less on imported control equipment', 'You need BOP control for energy plants such as fuel cell power plants'],
    scope_k='Scope', scope_h='What our hydrogen<br><span class="b">control covers</span>',
    img_alt='Liquid hydrogen station control system – engineer checking a control panel beside liquid hydrogen storage', img_cap='Control panel at a liquid hydrogen station (illustrative image)',
    rack_alt='Hydrogen vessel control panel – a marine panel installed beside hydrogen tanks', rack_cap='Control panel on a hydrogen-powered vessel (illustrative image)',
    comm_alt='Liquid hydrogen station control equipment – a control panel beside the storage tank', comm_cap='Liquid hydrogen station control equipment (illustrative image)',
    scope=[('01', 'Liquid hydrogen station control', 'A VFD, PLC and UPS control system that controls and monitors station equipment, combining real-time monitoring, energy efficiency and safety management in one system.'),
           ('02', 'Liquid hydrogen power control', 'We are commercializing an intelligent power control system for liquid hydrogen stations: precise real-time control of pumps and thermal oil circulation, energy saving and equipment protection.'),
           ('03', 'Hydrogen vessel integrated control', 'Integrated control and monitoring of fuel cells, propulsion motors and hydrogen tanks. We take part in the Ministry of Oceans and Fisheries project on safe small hydrogen-powered vessels.'),
           ('04', 'Hydrogen & energy plant BOP control', 'We supplied the BOP control system for the carbon capture, utilization and storage (CCUS) facility of a fuel cell power plant.')],
    brand_k='Credentials', brand_h='Hydrogen<br><span class="b">credentials</span>',
    brands=['Designated hydrogen specialist company', '5 patents on liquid hydrogen station control', 'Hydrogen vessel R&D project (MOF)', 'ISO 45001', 'Schneider Electric official SI partner'],
    brand_note='The five patents cover power control logic, operational safety, energy efficiency optimization, equipment protection algorithms and a data-driven business model that feeds operating data back into design.',
    proc_k='Process', proc_h='How we work',
    proc=[('STEP 1', 'Specification & safety', 'Equipment, operating conditions, your specification and safety requirements'), ('STEP 2', 'Control design', 'Sequences, interlocks, alarms, I/O list and power layout'),
          ('STEP 3', 'Build & program', 'Panel building and wiring, PLC and drive programs'), ('STEP 4', 'Factory test', 'Operation, interlock, alarm and protection tests before shipment'),
          ('STEP 5', 'Install & commission', 'Installation, commissioning, operation support and data management')],
    why_k='Why DONG-IN ENSIS', why_h='Hydrogen control<br><span class="b">backed by references and patents</span>',
    why=[('5', 'Patents on LH2 station control'), ('35<sup>+</sup>', 'Years · since 1991'), ('750<sup>+</sup>', 'Control system projects')],
    why_txt=[('A commercial station reference', 'We supplied the VFD, PLC and UPS control system for a commercial liquid hydrogen refueling station and continue its operation pilot.'),
             ('Technology proven in national R&D', 'Integrated control, monitoring and system integration for the hydrogen-powered vessel project, organized into patents.'),
             ('Experience with LNG fuel gas', 'Control systems for LNG fuel gas supply (FGSS) and BOG compressors supplied to shipyards in Korea and abroad carry over to hydrogen.')],
    refs_h='Hydrogen and energy references', refs_cols=('Field', 'Customer · site', 'Scope of supply'),
    refs=[('Liquid hydrogen station', 'SK E&S liquid hydrogen refueling station', 'VFD, PLC and UPS control system · commercial station in operation'),
          ('Hydrogen-powered vessel', 'Ministry of Oceans and Fisheries – safe small hydrogen-powered vessel R&D and demonstration (2022.4–2026.12)', 'Integrated control · monitoring · system integration'),
          ('Energy plant', 'SK ecoplant · KOSPO fuel cell power plant CCUS facility', 'BOP control system for CCUS')],
    refs_note='Marine, LNG and industrial plant references are on the Applications page.',
    links=[('Hydrogen & energy applications →', 'applications.html#hydrogen'), ('Five hydrogen patents →', 'news-hydrogen-patents-5.html'),
           ('Liquid hydrogen station control →', 'news-lh2-station-control.html'), ('Control panel manufacturing →', 'control-panel-manufacturing.html')],
    faq_k='FAQ', faq_h='Frequently asked questions',
    faq=[('Do you have liquid hydrogen station references?', 'Yes. We supplied the VFD, PLC and UPS control system for the SK E&S liquid hydrogen refueling station and continue its commercial operation pilot.'),
         ('Do you hold hydrogen certifications or patents?', 'We are a designated hydrogen specialist company (Ministry of Trade, Industry and Energy) and hold five patents related to liquid hydrogen station control systems, covering power control logic, operational safety, energy efficiency optimization and equipment protection algorithms.'),
         ('What do you control at a liquid hydrogen station?', 'We control and monitor station equipment, combining precise control of pumps and thermal oil circulation with real-time monitoring, energy efficiency and safety management in one control system.'),
         ('Do you control hydrogen-powered vessels?', 'Yes. In the Ministry of Oceans and Fisheries project on safe small hydrogen-powered vessels (2022.4–2026.12), we handle integrated control, monitoring and system integration of fuel cells, propulsion motors and hydrogen tanks.'),
         ('Can you collect data from hydrogen equipment?', 'Yes. We are building, step by step, a structure that collects operating and power data while the panel controls the equipment, and the Intelligent Control Panel connects it to the cloud or your server.'),
         ('How long does it take and what does it cost?', 'It depends on the equipment, safety requirements and the number and specification of panels. Send us your specification or equipment list and we will quote with a proposed configuration.')],
    iq_k='Inquiry', iq_h='Ask about<br><span class="b">hydrogen control</span>',
    iq_lead='Tell us about your hydrogen equipment and the control scope you need, and an engineer will review it and get back to you. Please mention if you have a specification.',
    iq_side=[('Reply', 'Within 1–2 business days.'), ('We review', 'Feasibility, recommended setup, expected schedule'), ('Phone', '<a href="tel:+82518623668">+82-51-862-3668</a>')],
    f=dict(company='Company', name='Name', position='Department / Position', phone='Phone', email='E-mail', region='Site location', region_ph='e.g. Ulsan, Korea',
           ctl='Equipment · scale', ctl_ph='e.g. LH2 station pumps and vaporizers', work='Area (select all that apply)',
           works=['Liquid hydrogen station control', 'Hydrogen station control panel', 'Hydrogen vessel control', 'Fuel cell · energy plant', 'Equipment data collection', 'Quotation'],
           msg='Message', msg_ph='Equipment, specification, preferred schedule, etc.', submit='Send inquiry',
           ok='<b>Thank you. We have received your inquiry.</b>We will contact you within 1–2 business days.'),
)

if __name__ == '__main__':
    build(KO)
    build(EN)
