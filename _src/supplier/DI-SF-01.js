// 스마트공장 공급기업 솔루션 설명서 (Smart Manufacturing Data Solution)
require('./common')({ DOC_NO: 'DI-SF-01', REV: 'Rev.00', TITLE: '스마트공장 공급기업 솔루션 설명서' }, H => {
  const {
    Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak,
    BLUE, RED, INK, GRAY, W, LOGO, DOC_NO, REV, TITLE,
    run, para, p, bullet, h1, h2, label, table, cellList, gap, stepTable, flowBox, arrowRow,
  } = H;

  // ---------- 스마트공장 공급기업 솔루션 설명서 ----------
  const mono = (t, o = {}) => para([new TextRun({ text: t, font: 'Consolas', size: 19, color: o.color || INK, bold: o.bold })], { after: 0 });
  const chain = arr => para(arr.flatMap((t, i) => i ? [run('  →  ', { color: RED, bold: true, size: 19 }), run(t, { size: 19 })] : [run(t, { size: 19, bold: true })]), { after: 0, line: 300 });
  const kv = rows => table([2400, W - 2400], null, rows, { keyCol: true });
  
  const cover = [
    gap(1300),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 300, height: 58 } })] }),
    para([run('스마트공장 공급기업 솔루션 설명서', { size: 26, bold: true, color: GRAY })], { align: AlignmentType.CENTER, after: 80 }),
    para([run('Smart Manufacturing Data Solution', { size: 36, bold: true, color: '111B2E' })], { align: AlignmentType.CENTER, after: 120 }),
    para([run('산업설비 OT 데이터 수집·표준화·모니터링 및 AI 연계 솔루션', { size: 22, color: INK })], { align: AlignmentType.CENTER, after: 120 }),
    new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: 3000, right: 3000 }, spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 1 } }, children: [] }),
    para([run('Control → Data → Intelligence', { size: 22, bold: true, color: BLUE })], { align: AlignmentType.CENTER, after: 500 }),
    table([2400, W - 2400], ['항목', '내용'], [
      ['문서번호', `${DOC_NO} ${REV}`],
      ['솔루션명', 'Smart Manufacturing Data Solution'],
      ['부제', '산업설비 OT 데이터 수집·표준화·모니터링 및 AI 연계 솔루션'],
      ['공급기업', '㈜동인엔시스 (DONG-IN ENSIS)'],
      ['작성 / 시행일', '2026.10.05 작성 / 시행: 대표 승인일'],
    ], { keyCol: true }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  
  const body = [
    h1('1. 솔루션명'),
    kv([
      ['솔루션명', 'Smart Manufacturing Data Solution'],
      ['부제', '산업설비 OT 데이터 수집·표준화·모니터링 및 AI 연계 솔루션'],
      ['공급기업', 'DONG-IN ENSIS (㈜동인엔시스)'],
    ]),
  
    h1('2. 솔루션 개요'),
    p('Smart Manufacturing Data Solution은 제조현장의 PLC, VFD, EOCR, 센서, 계측기 등 산업설비에서 발생하는 운전 데이터를 실시간으로 수집하고, 이를 정제·표준화·저장하여 생산설비 모니터링, 설비상태 분석, AI 이상감지, 디지털 트윈 및 MES/ERP 연계에 활용할 수 있도록 구축하는 스마트제조 솔루션이다.'),
    p('DONG-IN ENSIS는 산업제어 엔지니어링과 OT 데이터 기술을 기반으로 현장 설비와 IT·AI 시스템 사이의 데이터 연결구간을 구축한다.'),
    p('단순 모니터링 시스템 구축이 아니라, Control → Data → Intelligence 구조를 기반으로 제조설비의 데이터를 표준화된 제조데이터 자산으로 전환하는 것을 목표로 한다.'),
    table([3212, 3213, 3213], ['Control', 'Data', 'Intelligence'], [
      ['PLC·VFD·EOCR 기반 설비 제어', 'OT 데이터 수집·정제·표준화·저장', 'Monitoring · AI 이상감지 · Digital Twin'],
    ], { center: [0, 1, 2] }),
  
    h1('3. 주요 적용대상'),
    p('본 솔루션은 다음 제조설비 및 산업현장에 적용할 수 있다.'),
    table([W / 2, W / 2], null, [[
      cellList(['제조공장 생산설비', 'Motor Driven Equipment', 'Pump', 'Fan', 'Compressor', '생산 및 성능 Test Bench']),
      cellList(['조선·해양 기자재 생산설비', '수소·가스·에너지 설비', 'Wire Drawing 및 회전기기', '산업플랜트 Utility', '기존 PLC 기반 자동화설비']),
    ]]),
  
    h1('4. 고객사의 주요 문제'),
    p('제조현장에는 다음과 같은 문제가 존재한다.'),
    table([2900, W - 2900], ['문제', '현황'], [
      ['설비 데이터가 분산되어 있음', 'PLC, VFD, 계측기, 센서별로 데이터를 각각 보유하고 있으나 통합 데이터 관리체계가 없는 경우가 많다.'],
      ['실시간 데이터 활용 부족', '설비를 자동제어하고 있으나 실제 운전데이터를 장기간 저장하거나 분석하지 않는 경우가 많다.'],
      ['제조사별 데이터 구조 상이', 'PLC, VFD 및 설비 제조사별 Tag 명칭, 단위, 통신방식이 달라 상위 시스템에서 활용하기 어렵다.'],
      ['데이터와 MES·AI가 단절됨', 'MES, ERP 또는 AI 시스템을 도입하더라도 현장설비의 OT 데이터와 직접 연결되지 않아 수작업 입력이나 별도 Gateway가 필요하다.'],
      ['사후정비 중심의 설비관리', '설비 이상 발생 후 정비하는 방식에서 벗어나기 위한 데이터 기반 상태관리체계가 부족하다.'],
    ], { keyCol: true }),
  
    h1('5. 솔루션 구성'),
    p('솔루션은 현장 설비부터 AI까지 5개 Level로 구성된다.'),
    table([1300, 2400, W - 3700], ['Level', '구성', '역할'], [
      ['Level 1', 'Field / Control', '현장 설비와 제어기기에서 운전 데이터 발생'],
      ['Level 2', 'OT Connectivity', '산업설비와 데이터 플랫폼 연결'],
      ['Level 3', 'Energient Industrial DataHub', '산업설비 데이터 통합관리'],
      ['Level 4', 'Monitoring', '웹 기반 PWA Dashboard로 설비 정보 제공'],
      ['Level 5', 'AI / Digital Twin', '표준화된 제조데이터 기반 기능 확장'],
    ], { center: [0] }),
  
    h2('Level 1. Field / Control'),
    table([2400, W - 2400], null, [
      ['대상 기기', 'PLC, VFD, EOCR, Sensor, Meter, HMI, Motor / Pump / Compressor'],
      ['주요 수집데이터', 'Current, Voltage, Power, Energy, RPM, Temperature, Pressure, Flow, Vibration, Operating Status, Alarm, Running Hour'],
    ], { keyCol: true }),
  
    h2('Level 2. OT Connectivity'),
    p('산업설비와 데이터 플랫폼을 연결한다.'),
    table([2400, W - 2400], null, [
      ['지원 통신', 'Modbus TCP, Modbus RTU, MQTT, OPC UA, Ethernet 기반 산업통신'],
      ['신규설비', [chain(['PLC', 'MQTT', 'DataHub'])]],
      ['기존설비', [chain(['PLC / Legacy Equipment', 'Gateway', 'MQTT', 'DataHub'])]],
    ], { keyCol: true }),
  
    h2('Level 3. Energient Industrial DataHub'),
    p('산업설비 데이터를 통합관리한다.'),
    label('주요기능'),
    table([W / 2, W / 2], null, [[
      cellList(['실시간 데이터 수집', 'Raw Data 저장', 'Tag Mapping', '데이터 정제', '데이터 표준화', 'Timestamp 관리']),
      cellList(['데이터 Quality 관리', '시계열 데이터 저장', 'Equipment 관리', 'Historical Data 조회', 'Alarm/Event 관리', 'REST API 제공']),
    ]]),
  
    h2('Level 4. Monitoring'),
    p('웹 기반 PWA Dashboard를 통해 다음 정보를 제공한다. PC, Tablet 및 Mobile 환경에서 접근 가능하도록 구성할 수 있다.'),
    label('제공 정보'),
    table([W / 2, W / 2], null, [[
      cellList(['설비 운전상태', '실시간 Trend', 'Current / Voltage / Power', 'RPM']),
      cellList(['Temperature', 'Alarm/Event', '운전시간', 'Historical Trend']),
    ]]),
  
    h2('Level 5. AI / Digital Twin'),
    p('표준화된 제조데이터를 기반으로 다음 기능으로 확장할 수 있다.'),
    label('확장 기능'),
    table([W / 2, W / 2], null, [[
      cellList(['이상상태 탐지', '설비 Condition Monitoring', '이상 Trend 분석', '예지보전']),
      cellList(['Health Index', 'Digital Twin', 'AI Model Integration']),
    ]]),
    gap(60),
    p('초기 구축 시에는 데이터 수집·표준화와 기본 이상감지를 적용하고, 축적된 실제 데이터를 활용하여 AI 정확도를 단계적으로 고도화할 수 있다.'),
  
    h1('6. 시스템 Architecture'),
    p('현장 설비의 데이터는 OT Connectivity와 DataHub를 거쳐 표준 데이터가 되고, REST API로 각 활용 시스템에 제공된다.'),
    new Table({
      width: { size: 6400, type: WidthType.DXA }, columnWidths: [6400], alignment: AlignmentType.CENTER,
      rows: [
        flowBox('제조설비', 'Motor / Pump / Compressor / Production Equipment'),
        arrowRow(),
        flowBox('제어·계측', 'PLC / VFD / EOCR / Sensor'),
        arrowRow('Modbus TCP / MQTT / OPC UA'),
        flowBox('OT Connectivity', null, true),
        arrowRow(),
        flowBox('Energient Industrial DataHub', '수집 → 정제 → 표준화 → 저장 → 데이터 품질관리', true),
        arrowRow('REST API'),
        flowBox('활용 시스템', 'PWA / MES / ERP / AI / Digital Twin'),
      ],
    }),
  
    h1('7. 핵심 기능'),
    h2('7.1 설비 데이터 자동수집'),
    p('PLC 및 산업용 제어기기에서 데이터를 자동수집한다. 사용자가 수기로 데이터를 입력하는 방식을 최소화하고 제조현장 데이터의 실시간성을 확보한다.'),
  
    h2('7.2 제조데이터 표준화'),
    p('설비 및 제조사별 상이한 Tag를 공통 데이터 구조로 Mapping 한다.'),
    table([2400, W - 2400], ['구분', '예시'], [
      ['Raw Tag', [mono('MTR1_TEMP_DE')]],
      ['Standard Tag', [mono('equipment.motor.bearing.temperature.de', { color: BLUE, bold: true })]],
    ], { keyCol: true }),
    gap(80),
    label('표준 데이터 구조'),
    table([1376, 1377, 1377, 1377, 1377, 1377, 1377], null, [['Equipment ID', 'Tag ID', 'Timestamp', 'Value', 'Unit', 'Quality', 'Source']], { center: [0, 1, 2, 3, 4, 5, 6] }),
  
    h2('7.3 설비 상태 실시간 Monitoring'),
    p('설비의 운전상태 및 주요 데이터를 실시간으로 확인한다.'),
    table([W], null, [['예: Motor Running / Stop, Current, Power, RPM, Bearing Temperature, Winding Temperature, Alarm']]),
  
    h2('7.4 Alarm/Event 관리'),
    p('설정된 기준값 또는 설비 이상상태 발생 시 Alarm을 생성한다.'),
    table([2400, W - 2400], null, [['Alarm 정보', '발생시간, 대상설비, Alarm Code, Alarm Level, 관련 Tag, 확인상태']], { keyCol: true }),
  
    h2('7.5 제조데이터 이력관리'),
    p('설비데이터를 시계열로 저장하여 과거 운전상태 및 이상발생 시점을 추적할 수 있다.'),
  
    h2('7.6 AI 이상감지'),
    p('정상 운전데이터를 기반으로 설비 운전패턴을 분석하여 이상상태를 탐지한다.'),
    table([2400, W - 2400], null, [
      ['분석대상 예', 'Current 변화, Power 변화, Temperature 변화, RPM 변화, Load Pattern'],
      ['출력 예', 'Normal, Warning, Abnormal, Anomaly Score, Health Index'],
    ], { keyCol: true }),
  
    h2('7.7 MES/ERP 및 외부 시스템 연계'),
    p('REST API를 통해 상위 시스템과 데이터를 연계한다.'),
    table([2400, W - 2400], null, [['연계대상', 'MES, ERP, QMS, Digital Twin, AI Platform, 고객 자체 시스템']], { keyCol: true }),
  
    h1('8. 스마트공장 구축 수행범위'),
    p('구축은 현장진단부터 시험·검수까지 7단계로 수행한다.'),
    ...[
      ['STEP 1. 현장진단', ['대상공정 분석', '설비 및 PLC 현황분석', '네트워크 현황분석', '데이터 활용목적 정의', 'KPI 정의'], ['현장진단보고서', 'As-Is 구성도', '데이터 Source List']],
      ['STEP 2. To-Be 설계', ['스마트공장 Architecture 설계', '데이터 수집범위 정의', 'Tag List 작성', '통신방식 설계', '데이터 표준 정의'], ['To-Be Architecture', 'Network 구성도', 'Tag List', '데이터 Mapping 표']],
      ['STEP 3. 설비연동', ['PLC/VFD/Sensor 연결', '통신프로그램 개발', '데이터 수집시험', 'MQTT/Modbus 연계'], null],
      ['STEP 4. DataHub 구축', ['실시간 데이터 수집', 'DB 구축', 'Tag Mapping', '데이터 표준화', 'Historical Data 관리'], null],
      ['STEP 5. Visualization', ['Dashboard 구축', '실시간 Trend', '설비상태 Monitoring', 'Alarm/Event'], null],
      ['STEP 6. AI 활용 (필요 시)', ['이상감지', 'Condition Monitoring', '설비성능 분석', '예지보전 PoC'], null],
      ['STEP 7. 시험 및 검수', ['통신시험', '데이터 수집시험', '데이터 정합성 시험', 'Alarm Test', 'Dashboard Test', 'API Test', 'FAT/SAT'], null],
    ].flatMap(([t, works, outs]) => [h2(t), outs ? stepTable(works, outs) : table([W], ['주요 업무'], [[cellList(works)]])]),
  
    h1('9. 주요 산출물'),
    table([900, W / 2 - 900, 900, W / 2 - 900], ['No.', '산출물', 'No.', '산출물'], (() => {
      const L = ['요구사항 정의서', '현장진단보고서', 'As-Is / To-Be 구성도', 'Network Architecture', 'Data Source List', 'PLC Tag List', 'Tag Mapping Table', '표준 Tag Dictionary', 'DB Schema', 'JSON Schema', 'API Specification', 'Dashboard', 'DataHub', '데이터 품질검증 결과서', 'FAT/SAT Report', '사용자 매뉴얼', '관리자 매뉴얼', '교육자료', '구축완료보고서'];
      const rows = [];
      for (let i = 0; i < 10; i++) rows.push([String(i + 1), L[i], L[i + 10] ? String(i + 11) : '', L[i + 10] || '']);
      return rows;
    })(), { center: [0, 2] }),
  
    h1('10. 구축 KPI'),
    p('스마트공장 사업에서는 단순 시스템 구축보다 제조성과를 확인할 수 있도록 프로젝트별 KPI를 설정한다. 적용 가능한 KPI 예시는 다음과 같다.'),
    table([1800, W - 1800], ['분야', 'KPI 예시'], [
      ['설비관리', '설비가동률, 비가동시간, 설비 이상발견시간, 고장 대응시간, 예방정비율'],
      ['데이터', '데이터 자동수집률, 수기입력 감소율, 데이터 누락률, 실시간 데이터 확보율'],
      ['생산', '생산성, Cycle Time, 설비 대기시간, 생산량'],
      ['품질', '불량률, 이상공정 탐지시간, 품질 데이터 추적률'],
      ['에너지', '설비별 전력사용량, 생산량 대비 에너지 사용량, Peak 전력, 에너지 원단위'],
    ], { keyCol: true }),
    gap(60),
    p('프로젝트 착수 시 고객과 협의하여 적용 가능한 KPI를 선정하고 Before/After 성과를 관리한다.'),
  
    h1('11. DONG-IN ENSIS의 차별성'),
    table([2900, W - 2900], ['구분', '내용'], [
      ['OT Engineering 역량', '일반 IT 공급기업과 달리 PLC, VFD, 제어반, Motor 및 산업용 제어설비를 직접 이해하고 현장 데이터 Source부터 접근할 수 있다.'],
      ['제어와 데이터를 동시에 수행', 'Control Engineering + Data Engineering을 단일 공급기업이 수행할 수 있다.'],
      ['Multi-Vendor 대응', '다양한 산업제어기기의 데이터를 공통 데이터 구조로 통합할 수 있도록 설계한다.'],
      ['신규설비와 기존설비 모두 적용', '신규설비는 PLC에서 직접 데이터를 전송하고, 기존설비는 Gateway를 활용하여 데이터 인프라에 연결할 수 있다.'],
      ['AI 활용을 고려한 데이터 구조', '단순 Dashboard 구축이 아니라 AI·Digital Twin이 사용할 수 있는 데이터 구조를 구축한다.'],
      ['제조업 중심 산업경험', '조선·해양, 수소·에너지, 산업기계 및 플랜트 제어분야의 현장 엔지니어링 경험을 기반으로 제조현장에 적용한다.'],
    ], { keyCol: true }),
  
    h1('12. 주요 적용모델'),
    table([3000, W - 3000], ['적용모델', '데이터 흐름'], [
      ['Pump Smart Factory Package', [chain(['Pump / Motor', 'PLC', 'DataHub', 'Performance Monitoring', 'AI Condition Monitoring'])]],
      ['Compressor Smart Factory Package', [chain(['Compressor', 'Pressure / Temperature / Power / RPM', 'DataHub', 'Performance Analysis', 'AI Anomaly Detection'])]],
      ['Motor Predictive Maintenance Package', [chain(['Motor / VFD / EOCR', 'Current / Power / RPM / Temperature', 'DataHub', 'Condition Monitoring', 'Predictive Maintenance'])]],
      ['FAT Digitalization Package', [chain(['Test Equipment', 'PLC', 'Automatic Data Collection', 'DataHub', 'Test Data Management', 'Digital FAT Report'])]],
    ], { keyCol: true }),
  
    h1('13. 구축 패키지'),
    table([1800, 2600, W - 4400], ['패키지', '대상', '범위'], [
      [[para([run('Basic', { bold: true, color: BLUE, size: 19 })], { after: 0 })], '스마트공장 최초 도입 제조기업', cellList(['PLC 데이터 수집', '설비 Monitoring', 'Historical Data', 'Alarm'])],
      [[para([run('Standard', { bold: true, color: BLUE, size: 19 })], { after: 0 })], '스마트공장 고도화 제조기업', cellList(['OT 데이터 자동수집', '데이터 표준화', 'DataHub', 'Dashboard', 'API', 'MES/ERP 연계'])],
      [[para([run('AI Advanced', { bold: true, color: BLUE, size: 19 })], { after: 0 })], '제조 AI 활용기업', cellList(['Standard Package', 'AI 이상감지', 'Feature Engineering', 'Condition Monitoring', 'Digital Twin 연계'])],
    ]),
  
    h1('14. 유지보수 및 기술지원'),
    p('구축 이후 다음 지원체계를 운영한다.'),
    table([W / 2, W / 2], null, [[
      cellList(['PLC 및 통신 장애지원', '데이터 수집상태 확인', 'Tag Mapping 수정', 'Dashboard 기술지원']),
      cellList(['데이터 품질 점검', 'API 연계지원', '사용자 교육', '시스템 개선 및 고도화']),
    ]]),
  
    h1('15. 솔루션 핵심 문구'),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [new TableRow({ cantSplit: true, children: [new TableCell({
        width: { size: W, type: WidthType.DXA },
        borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 24, color: RED } },
        shading: { fill: 'EAF1FA', type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        children: [
          para([run('DONG-IN ENSIS는 제조현장의 설비를 단순히 제어하는 것을 넘어, 설비 데이터를 수집·표준화하고 AI가 활용할 수 있는 제조데이터로 연결합니다.', { size: 22, bold: true, color: '111B2E' })], { after: 120, line: 340 }),
          para([run('We connect industrial equipment data from control to intelligence.', { size: 20, color: BLUE, italics: true })], { after: 0 }),
        ],
      })] })],
    }),
  ];

  return { cover, body };
});
