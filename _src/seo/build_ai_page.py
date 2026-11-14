"""「AI 예지보전」 페이지(국문 ai-predictive-maintenance.html · 영문 en/ai-predictive-maintenance.html) 생성.

틀(머리·메뉴·꼬리말·문의 폼)은 PLC 프로그램 개발 페이지 생성기(build_plc_page.py)를 그대로 쓰고, 내용만 여기서 정한다.
문구를 고칠 때는 이 파일을 고치고 다시 실행한다: python3 _src/seo/build_ai_page.py

사실 확인된 내용만 쓴다. AI 이상 탐지·엣지 AI·에너지 절감은 「실증(PoC) 중」으로만 쓰고 상용 기능처럼 쓰지 않는다(llms.txt 「AI 예지보전 현황」).
- 지금 쓸 수 있는 것(수집 항목·기준값 알람·통신 끊김 보관·제어 권한): 제조기업 도입 페이지(manufacturing.html) 본문·FAQ
- 실증 내용(DAQ kHz 파형, 비지도 학습, 폐루프 5% 절감 목표, 모듈러 인출식 VFD 판넬, 엣지 컨트롤러 검토): 보도자료
  news-industrial-ai-energy-saving.html(2026.04.17) · news-edge-ai-autonomous-control.html(2026.04.13)
- 디지털트윈: digital-twin.html 실제 화면 캡처(img/ai/twin-screen*.jpg, 시연용 모의 데이터)
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_plc_page import build  # noqa: E402

NAME = 'ai-predictive-maintenance.html'
OG = 'https://donginensis.com/img/ai/og_ai.jpg'
IMGS_KO = {'main': ('img/ai/twin-screen.jpg', 1600, 900), 'side': ('img/ai/ai-office-trend.jpg', 1672, 941),
           'wide': ('img/ai/ai-fan-room.jpg', 1672, 941)}
IMGS_EN = dict(IMGS_KO, main=('img/ai/twin-screen-en.jpg', 1600, 900))

KO = dict(
    lang='ko', src='manufacturing.html', out=NAME, name=NAME, form_lang='KO', root='', imgs=IMGS_KO, og=OG, form_type='AI 예지보전',
    title='AI 예지보전 · 설비 이상 탐지 실증 | (주)동인엔시스',
    desc='AI 예지보전을 제어반 데이터에서 시작합니다. 모터 온도·전류·진동 수집과 기준값 알람은 바로 쓰고, 비지도 학습 AI 이상 탐지·엣지 AI·에너지 절감은 실증 중입니다.',
    keywords='AI 예지보전, 산업용 AI, 설비 이상 탐지, 이상감지, 엣지 AI, 비지도 학습, 예지보전 솔루션, 모터 예지보전, 디지털트윈, 에너지 절감, 제조 AX, 동인엔시스',
    kicker='AI Predictive Maintenance',
    h1='AI 예지보전,<br><span class="rl">제어반 데이터</span>에서 시작합니다.',
    hero_key='AI가 판단하고, PLC가 움직입니다. 둘을 잇는 회사.',
    lead='(주)동인엔시스는 설비를 제어하는 지능형 제어반에서 모터 온도·전류·진동 데이터를 24시간 수집합니다. 기준값 알람과 디지털트윈 대시보드는 지금 쓸 수 있고, 정상 운전 패턴을 학습하는 산업용 AI 이상 탐지와 엣지 AI, 에너지 절감 제어는 현재 실증(PoC) 중입니다.',
    cta=('AI 예지보전 상담 →', 'tel:0518623668', '전화 상담 051-862-3668'),
    cta2=('디지털트윈 시연 보기 →', 'digital-twin.html', 'img/twin-thumb.jpg'), main_link=('digital-twin.html', '디지털트윈 시연 3D로 보기 →'),
    check_k='Check', check_h='이런 고민이<br><span class="b">있으시면</span>',
    checks=['AI 예지보전을 하고 싶은데 설비 데이터가 쌓여 있지 않다', '모터·펌프 고장 데이터가 거의 없어 AI 학습이 어렵다고 들었다',
            '설비 이상 탐지로 고장 전에 미리 알고 싶다', '모터 설비의 전력 사용을 줄이고 싶다',
            '네트워크가 끊겨도 현장 설비가 안전하게 돌아가야 한다', '우리 AI·MES 플랫폼에 현장 설비 데이터를 받아야 한다'],
    scope_k='Now & Pilot', scope_h='지금 쓸 수 있는 것과<br><span class="b">실증 중인 것</span>',
    img_alt='AI 예지보전 디지털트윈 – 지능형 제어반 TestBench의 모터 온도·회전속도·전류를 3D로 보여 주는 화면',
    img_cap='동인엔시스 디지털트윈 시연 화면 – 모터 권선·베어링 온도, 부하율, 회전속도를 정상·경고·위험으로 판정합니다(시연용 모의 데이터)',
    rack_alt='공장이 내려다보이는 사무실에서 설비 추세 그래프의 이상 지점을 살피는 엔지니어', rack_cap='설비 데이터 추세에서 이상 지점을 살피는 모습(이해를 돕기 위한 연출 이미지)',
    comm_alt='AI 예지보전 – 송풍기 베어링에 진동 센서를 달고 지능형 제어반으로 연결한 공조 기계실', comm_cap='송풍기 베어링의 진동 센서를 지능형 제어반에 연결한 공조 기계실(이해를 돕기 위한 연출 이미지)',
    scope=[('01', '설비 데이터 24시간 수집 · 사용 중', '지능형 제어반이 설비를 제어하면서 모터 권선·베어링 온도, 전류·전력, 진동, 회전속도를 별도 수집장비 없이 기록합니다.'),
           ('02', '기준값 알람 · 디지털트윈 · 사용 중', '설정한 기준을 벗어나면 웹·모바일 대시보드로 알립니다. 클라우드 서버 기반 디지털트윈과 대시보드를 구축해 운영하고 있습니다.'),
           ('03', '비지도 학습 AI 이상 탐지 · 실증 중', '고장 데이터 없이 정상 운전 패턴을 스스로 학습해 미세한 설비 이상을 탐지합니다. 데이터가 적은 신규 현장이나 특수 설비에도 적용할 수 있도록 실증하고 있습니다.'),
           ('04', '엣지 AI · 에너지 절감 제어 · 실증 중', '학습은 클라우드에서, 판단은 현장 엣지 컨트롤러에서 합니다. AI가 찾은 최적 운전값을 PLC로 되돌려 모터 전력을 5% 이상 줄이는 것을 목표로 실증하고 있습니다.')],
    brand_k='Data', brand_h='AI가 배우는<br><span class="b">설비 데이터</span>',
    brands=['모터 권선온도 U·V·W', '베어링 온도', '회전속도', '전압·전류·전력량', '진동', '대기 온습도', '운전 상태신호'],
    brand_note='AI 예지보전은 좋은 데이터에서 시작합니다. 지능형 제어반이 위 항목을 24시간 기록하고, 실증에서는 고정밀 데이터 수집 장치(DAQ)로 kHz 단위 전기 파형까지 수집해 분석합니다.',
    proc_k='Roadmap', proc_h='AI 예지보전 단계',
    proc=[('STEP 1 · 사용 중', '데이터 수집', '지능형 제어반으로 운전 데이터 24시간 기록'), ('STEP 2 · 사용 중', '기준값 알람', '기준을 벗어나면 대시보드로 경고·알람'),
          ('STEP 3 · 실증 중', 'AI 이상 탐지', '비지도 학습으로 정상 패턴과 다른 이상 찾기'), ('STEP 4 · 실증 중', '엣지 AI 판단', '학습한 결과를 현장 컨트롤러로 보내 즉시 판단'),
          ('STEP 5 · 실증 중', '에너지 절감 제어', '최적 운전값을 PLC로 되돌려 전력 5% 이상 절감 목표')],
    why_k='Why DONG-IN ENSIS', why_h='제어반을 만드는 회사가<br><span class="b">하는 AI</span>',
    why=[('35<sup>+</sup>', 'Years · 1991년 설립'), ('750<sup>+</sup>', '제어시스템 프로젝트'), ('5<sup>%</sup>', '모터 전력 절감 목표(실증)')],
    why_txt=[('데이터가 나오는 곳에서 시작', '센서·PLC·인버터가 들어가는 제어반을 직접 설계·제작하므로, AI에 필요한 데이터를 처음부터 제대로 모읍니다. 750건 이상은 제어시스템 프로젝트 수이며 AI 학습 데이터 건수가 아닙니다.'),
             ('AI가 판단하고, PLC가 움직입니다', 'AI는 알려 주기만 해서는 설비가 바뀌지 않습니다. 제어반과 PLC 프로그램을 직접 만드는 회사라서, AI가 찾은 운전값을 PLC로 되돌려 설비 운전에 반영하는 제어까지 잇습니다(실증 중). 인터록과 최종 제어는 현장 PLC가 맡고, 서버가 설비를 직접 제어하지 않습니다.'),
             ('멈추지 않는 정비를 목표로', '자사 특허 「모듈러 인출식 VFD 판넬」과 AI 예지보전을 결합해, 고장 징후가 잡히면 설비 전체를 멈추지 않고 해당 모듈만 교체하는 방식을 실증하고 있습니다.')],
    refs_h='AI 관련 보도자료', refs_cols=('날짜', '매체', '내용'),
    refs=[('2026.04.17', 'IT비즈뉴스', '「산업용 AI」로 제조 AX 시대 연다… 에너지 5% 절감 솔루션 실증 착수'),
          ('2026.04.13', '데일리경제', '「비지도 학습 엣지 AI」로 현장 밀착형 자율 제어 시대 주도')],
    refs_note='보도자료 전문은 아래 링크와 보도자료 목록에서 볼 수 있습니다. 실증 결과는 확인되는 대로 공개합니다.',
    links=[('디지털트윈 시연 보기 →', 'digital-twin.html'), ('산업용 AI 에너지 절감 실증 보도 →', 'news-industrial-ai-energy-saving.html'),
           ('엣지 AI 자율 제어 보도 →', 'news-edge-ai-autonomous-control.html'), ('지능형 제어반 도입 안내 →', 'manufacturing.html'),
           ('PLC 프로그램 개발 →', 'plc-programming.html'),
           ('AI·MES 기업 OT 협업 →', 'partner.html')],
    faq_k='FAQ', faq_h='자주 묻는 질문',
    faq=[('AI 예지보전을 지금 바로 쓸 수 있나요?', '설비 데이터 수집과 기준값 알람, 대시보드는 도입 직후부터 사용할 수 있습니다. 정상 운전 데이터를 학습하는 AI 이상 탐지는 현재 실증(PoC) 단계에서 고도화하고 있으며, 상용화가 끝난 기능으로 소개하지 않습니다. 실증에 관심 있는 현장은 문의해 주시면 함께 검토합니다.'),
         ('고장 데이터가 없어도 AI 예지보전이 되나요?', '실증 중인 AI는 비지도 학습 방식이라 고장 데이터를 사람이 일일이 분류할 필요 없이 정상 운전 패턴을 스스로 학습해 이상을 찾습니다. 그래서 데이터가 적은 신규 현장이나 특수 설비에도 적용할 수 있도록 실증하고 있습니다.'),
         ('엣지 AI는 무엇인가요?', '무거운 AI 학습은 클라우드에서 하고, 학습해 얻은 파라미터만 현장 엣지 컨트롤러로 보내는 구조입니다. 네트워크가 끊겨도 현장에서 바로 판단할 수 있습니다. 엣지 장치로 ABB AC500, 피닉스컨택트 AXC F 2152 등을 검토하고 있습니다.'),
         ('에너지는 얼마나 줄일 수 있나요?', 'AI가 찾은 최적 운전값을 현장 PLC로 되돌려 보내는 폐루프 제어로 산업용 모터 시스템의 전력 소비를 5% 이상 줄이는 것을 목표로 실증하고 있습니다. 확정된 절감률이 아니며, 실증으로 검증한 결과를 공개할 예정입니다.'),
         ('어떤 데이터를 수집하나요?', '모터 권선온도(U·V·W), 베어링 온도, 회전속도, 전압·전류·전력량, 진동, 대기 온습도, 운전 상태신호를 24시간 기록합니다. 실증에서는 고정밀 데이터 수집 장치(DAQ)로 kHz 단위 전기 파형도 수집합니다.'),
         ('AI 분석만 하는 솔루션과 무엇이 다른가요?', 'AI가 이상이나 더 나은 운전값을 찾아도, 설비가 실제로 바뀌려면 PLC 프로그램이 그 값을 받아 제어해야 합니다. 동인엔시스는 제어반과 PLC 프로그램을 직접 만드는 회사라서 데이터 수집부터 PLC 제어 연동까지 한 회사에서 잇습니다. AI 운전값을 PLC로 되돌리는 제어는 현재 실증 중입니다.'),
         ('AI가 설비를 직접 제어하면 위험하지 않나요?', '설비의 인터록과 최종 제어 권한은 현장 PLC가 가지며, 서버가 설비를 직접 제어하지 않습니다. 현장과 클라우드·고객사 서버 사이 통신은 TLS로 암호화합니다.'),
         ('디지털트윈은 어디서 볼 수 있나요?', '홈페이지의 디지털트윈 시연 화면에서 지능형 제어반 TestBench(제어반 2면·모터 2대)를 3D로 볼 수 있습니다. 모터 온도·회전속도·전류를 정상·경고·위험으로 판정해 보여 주며, 시연용 모의 데이터로 동작합니다.'),
         ('우리 회사 AI·MES 플랫폼과 연동할 수 있나요?', '네. 동인엔시스가 현장 설비 연동(OT) 구간을 맡고, 표준 데이터 구조와 REST API로 운전 데이터를 제공합니다. AI 분석 기업과의 협업으로도 적용할 수 있습니다.')],
    iq_k='Inquiry', iq_h='AI 예지보전<br><span class="b">상담</span>',
    iq_lead='대상 설비와 지금 관리하는 방식을 남겨 주시면 담당 엔지니어가 데이터 수집부터 적용 방안을 검토해 연락드립니다.',
    iq_side=[('회신', '영업일 기준 1~2일 이내 연락드립니다.'), ('검토 내용', '데이터 수집 구성, 알람·대시보드, 실증 참여 가능 여부'), ('전화 상담', '<a href="tel:0518623668">051-862-3668</a>')],
    f=dict(company='회사명', name='담당자명', position='부서 / 직책', phone='연락처', email='이메일', region='설비 소재지 (시·도)', region_ph='예: 경남 김해',
           ctl='대상 설비 · 현재 관리 방식', ctl_ph='예: 송풍기 5대, 수기 점검', work='관심 분야 (복수 선택)',
           works=['설비 데이터 수집', '기준값 알람 · 대시보드', 'AI 이상 탐지 실증', '에너지 절감', 'AI·MES 플랫폼 연동', '견적 요청'],
           msg='문의 내용', msg_ph='설비 구성, 고장 이력, 원하는 결과 등을 자유롭게 적어 주십시오.', submit='상담 신청',
           ok='<b>상담 신청이 접수되었습니다.</b>검토 후 영업일 기준 1~2일 이내에 연락드리겠습니다.'),
)

EN = dict(
    lang='en', src='en/manufacturing.html', out='en/' + NAME, name=NAME, form_lang='EN', root='../', imgs=IMGS_EN, og=OG, form_type='AI 예지보전',
    title='AI Predictive Maintenance & Anomaly Detection Pilot | DONG-IN ENSIS',
    desc='AI predictive maintenance that starts from control panel data. Data collection and threshold alarms work today; AI anomaly detection and edge AI are in pilot.',
    keywords='AI predictive maintenance, industrial AI, anomaly detection, edge AI, unsupervised learning, motor predictive maintenance, digital twin, energy saving, DONG-IN ENSIS',
    kicker='AI Predictive Maintenance',
    h1='AI predictive maintenance<br><span class="rl">starts from control panel data.</span>',
    hero_key='AI decides, the PLC acts. We connect the two.',
    lead='DONG-IN ENSIS collects motor temperature, current and vibration data 24/7 from the Intelligent Control Panel that controls the equipment. Threshold alarms and the digital twin dashboard are available today, while industrial AI anomaly detection that learns normal operating patterns, edge AI and energy-saving control are in pilot (PoC).',
    cta=('Ask about AI predictive maintenance →', 'tel:+82518623668', 'Call +82-51-862-3668'),
    cta2=('See the digital twin demo →', 'digital-twin.html', 'img/twin-thumb.jpg'), main_link=('digital-twin.html', 'Open the 3D digital twin demo →'),
    check_k='Check', check_h='If this<br><span class="b">sounds familiar</span>',
    checks=['You want AI predictive maintenance but have no equipment data yet', 'You were told AI is hard because you have few failure records',
            'You want to know about equipment problems before a breakdown', 'You want to cut the power used by motor-driven equipment',
            'Equipment must keep running safely even when the network drops', 'Your AI or MES platform needs equipment data from the field'],
    scope_k='Now & Pilot', scope_h='What works today<br><span class="b">and what is in pilot</span>',
    img_alt='AI predictive maintenance digital twin – screen showing motor temperature, speed and current of the Intelligent Control Panel TestBench in 3D',
    img_cap='DONG-IN ENSIS digital twin demo – motor winding and bearing temperature, load and speed judged as normal, warning or alarm (simulated demo data)',
    rack_alt='Engineer in an office overlooking the plant checking an anomaly point on equipment trend charts', rack_cap='Checking an anomaly point in equipment data trends (illustrative image)',
    comm_alt='AI predictive maintenance – HVAC plant room with vibration sensors on fan bearings wired to the Intelligent Control Panel', comm_cap='HVAC plant room: vibration sensors on fan bearings wired to the Intelligent Control Panel (illustrative image)',
    scope=[('01', 'Equipment data 24/7 · in use', 'The Intelligent Control Panel controls the equipment and records motor winding and bearing temperature, current and power, vibration and speed, with no extra gateway.'),
           ('02', 'Threshold alarms · digital twin · in use', 'When a value leaves its set range, the web and mobile dashboard raises an alert. A cloud-based digital twin and dashboard are built and in operation.'),
           ('03', 'Unsupervised AI anomaly detection · in pilot', 'Learns normal operating patterns without failure data to find subtle anomalies. We are validating it for new sites and special equipment with little data.'),
           ('04', 'Edge AI · energy-saving control · in pilot', 'Training happens in the cloud and decisions at the edge controller on site. The pilot aims to cut motor power use by 5% or more by sending AI-optimized setpoints back to the PLC.')],
    brand_k='Data', brand_h='Equipment data<br><span class="b">the AI learns from</span>',
    brands=['Motor winding temp. U·V·W', 'Bearing temperature', 'Speed', 'Voltage · current · energy', 'Vibration', 'Ambient temp. & humidity', 'Run-status signals'],
    brand_note='AI predictive maintenance starts with good data. The Intelligent Control Panel records these items 24/7, and in the pilot a high-precision data acquisition (DAQ) unit also captures electrical waveforms at kHz rates for analysis.',
    proc_k='Roadmap', proc_h='Steps to AI predictive maintenance',
    proc=[('STEP 1 · In use', 'Data collection', 'Operating data recorded 24/7 by the Intelligent Control Panel'), ('STEP 2 · In use', 'Threshold alarms', 'Warnings and alarms on the dashboard'),
          ('STEP 3 · Pilot', 'AI anomaly detection', 'Unsupervised learning finds departures from normal'), ('STEP 4 · Pilot', 'Edge AI decisions', 'Trained results sent to site controllers for instant decisions'),
          ('STEP 5 · Pilot', 'Energy-saving control', 'Optimized setpoints back to the PLC, aiming for 5%+ power saving')],
    why_k='Why DONG-IN ENSIS', why_h='AI from the company<br><span class="b">that builds the panel</span>',
    why=[('35<sup>+</sup>', 'Years · since 1991'), ('750<sup>+</sup>', 'Control system projects'), ('5<sup>%</sup>', 'Motor power saving target (pilot)')],
    why_txt=[('Starting where the data comes from', 'We design and build the panels that house the sensors, PLCs and drives, so the data AI needs is collected properly from the start. "750+" refers to control system projects delivered, not AI training data.'),
             ('AI decides, the PLC acts', 'An AI that only reports does not change how equipment runs. Because we build the panel and write the PLC program ourselves, we link AI-optimized setpoints back to the PLC and into equipment operation (in pilot). Interlocks and final control stay with the site PLC; the server never controls equipment directly.'),
             ('Aiming for maintenance without downtime', 'We are piloting our patented modular draw-out VFD panel with AI predictive maintenance, so that when a fault sign appears only the affected module is replaced without stopping the whole system.')],
    refs_h='AI press releases', refs_cols=('Date', 'Media', 'Topic'),
    refs=[('2026.04.17', 'IT Biz News', 'Opening the manufacturing AX era with industrial AI – field trial of a 5% energy-saving solution'),
          ('2026.04.13', 'Daily Economy', 'On-site autonomous control with unsupervised-learning edge AI')],
    refs_note='Full press releases are linked below and in the news list. Pilot results will be published once verified.',
    links=[('See the digital twin demo →', 'digital-twin.html'), ('Industrial AI energy-saving pilot →', 'news-industrial-ai-energy-saving.html'),
           ('Edge AI autonomous control →', 'news-edge-ai-autonomous-control.html'), ('Intelligent Control Panel for manufacturers →', 'manufacturing.html'),
           ('PLC programming →', 'plc-programming.html'),
           ('OT partnership for AI and MES companies →', 'partner.html')],
    faq_k='FAQ', faq_h='Frequently asked questions',
    faq=[('Can we use AI predictive maintenance right away?', 'Equipment data collection, threshold alarms and the dashboard work from day one. AI anomaly detection that learns from normal operating data is being advanced at the pilot (PoC) stage and is not presented as a finished commercial feature. If your site is interested in the pilot, contact us and we will review it together.'),
         ('Does AI predictive maintenance work without failure data?', 'The AI in pilot uses unsupervised learning: it learns normal operating patterns by itself, without people labeling failure data, and finds anomalies. That is why we are validating it for new sites and special equipment with little data.'),
         ('What is edge AI?', 'Heavy AI training runs in the cloud, and only the trained parameters are sent to the edge controller on site, so decisions can be made on site even if the network drops. We are evaluating controllers such as ABB AC500 and Phoenix Contact AXC F 2152 as edge devices.'),
         ('How much energy can be saved?', 'The pilot aims to cut the power use of industrial motor systems by 5% or more through closed-loop control that sends AI-optimized setpoints back to the site PLC. This is a target, not a confirmed figure; verified pilot results will be published.'),
         ('What data is collected?', 'Motor winding temperature (U·V·W), bearing temperature, speed, voltage, current and energy, vibration, ambient temperature and humidity, and run-status signals, recorded 24/7. In the pilot, a high-precision DAQ unit also captures electrical waveforms at kHz rates.'),
         ('How is this different from an AI analytics-only solution?', 'Even when AI finds an anomaly or a better setpoint, equipment only changes when a PLC program receives that value and controls with it. We build the panel and write the PLC program ourselves, so one company connects data collection through to the PLC control link. Sending AI setpoints back to the PLC is currently in pilot.'),
         ('Is it safe to let AI control equipment?', 'Interlocks and final control authority stay with the site PLC, and the server never controls equipment directly. Communication between the site and the cloud or your server is encrypted with TLS.'),
         ('Where can I see the digital twin?', 'The digital twin demo on our website shows the Intelligent Control Panel TestBench (two panel sections, two motors) in 3D. Motor temperature, speed and current are judged as normal, warning or alarm, running on simulated demo data.'),
         ('Can it connect to our AI or MES platform?', 'Yes. DONG-IN ENSIS handles the on-site equipment link (OT) and provides operating data through a standard data structure and REST API. It can also be applied together with AI analytics partners.')],
    iq_k='Inquiry', iq_h='Ask about<br><span class="b">AI predictive maintenance</span>',
    iq_lead='Tell us about your equipment and how you manage it today, and an engineer will review how to start from data collection and get back to you.',
    iq_side=[('Reply', 'Within 1–2 business days.'), ('We review', 'Data collection setup, alarms and dashboard, pilot participation'), ('Phone', '<a href="tel:+82518623668">+82-51-862-3668</a>')],
    f=dict(company='Company', name='Name', position='Department / Position', phone='Phone', email='E-mail', region='Site location', region_ph='e.g. Busan, Korea',
           ctl='Equipment · current maintenance', ctl_ph='e.g. 5 blowers, manual checks', work='Interests (select all that apply)',
           works=['Equipment data collection', 'Threshold alarms · dashboard', 'AI anomaly detection pilot', 'Energy saving', 'AI / MES platform link', 'Quotation'],
           msg='Message', msg_ph='Equipment, failure history, results you want, etc.', submit='Send inquiry',
           ok='<b>Thank you. We have received your inquiry.</b>We will contact you within 1–2 business days.'),
)

if __name__ == '__main__':
    build(KO)
    build(EN)
