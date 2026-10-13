// 데이터바우처 공급기업 서비스 설명서 (산업설비 OT 데이터 수집·가공·표준화·분석 서비스)
require('./common')({ DOC_NO: 'DI-DS-01', REV: 'Rev.00', TITLE: '산업설비 OT 데이터 활용서비스 설명서' }, H => {
  const {
    Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak,
    BLUE, RED, INK, GRAY, W, LOGO, DOC_NO, REV, TITLE,
    run, para, p, bullet, h1, h2, label, table, cellList, gap, stepTable, flowBox, arrowRow,
  } = H;

  // ---------- 표지 ----------
  const cover = [
    gap(1400),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 300, height: 58 } })] }),
    para([run(TITLE, { size: 36, bold: true, color: '111B2E' })], { align: AlignmentType.CENTER, after: 120 }),
    para([run('Industrial OT Data Engineering Service', { size: 22, color: GRAY })], { align: AlignmentType.CENTER, after: 120 }),
    new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: 3000, right: 3000 }, spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 1 } }, children: [] }),
    para([run('산업설비 OT 데이터 수집 · 가공 · 표준화 · 분석 서비스', { size: 21 })], { align: AlignmentType.CENTER, after: 60 }),
    para([run('데이터 활용서비스 공급기업 서비스 소개서', { size: 19, color: GRAY })], { align: AlignmentType.CENTER, after: 500 }),
    table([2400, W - 2400], ['항목', '내용'], [
      ['문서번호', `${DOC_NO} ${REV}`],
      ['서비스명', '산업설비 OT 데이터 수집·가공·표준화·분석 서비스'],
      ['영문명', 'Industrial OT Data Engineering Service'],
      ['공급기업', '㈜동인엔시스 (DONG-IN ENSIS)'],
      ['가격유형', '주문협의제'],
      ['작성 / 시행일', '2026.10.05 작성 / 시행: 대표 승인일'],
    ], { keyCol: true }),
    gap(160),
    para([run('※ 본 문서는 데이터 활용서비스 공급기업 등록과 고객 안내를 위한 서비스 설명서이다. 세부 단가는 별도의 「산업설비 OT 데이터 활용서비스 가격정책 및 단가표」를 따른다.', { size: 18, color: GRAY })], { after: 0 }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
  
  // ---------- 본문 ----------
  const body = [
    h1('1. 서비스명'),
    table([2400, W - 2400], null, [
      ['서비스명', '산업설비 OT 데이터 수집·가공·표준화·분석 서비스'],
      ['영문명', 'Industrial OT Data Engineering Service'],
      ['공급기업', 'DONG-IN ENSIS (㈜동인엔시스)'],
    ], { keyCol: true }),
  
    h1('2. 서비스 개요'),
    p('본 서비스는 제조 및 산업현장에서 PLC, VFD, EOCR, 계측기, 센서 등 OT(Operational Technology) 설비에서 발생하는 운전 데이터를 수집하고, 데이터 정제·가공·표준화·품질검증을 수행하여 AI, 디지털 트윈, 설비 모니터링, MES/ERP 등에서 활용할 수 있는 산업 데이터로 구축하는 데이터 활용 서비스이다.'),
    p('산업현장의 설비 데이터는 제조사, 통신 프로토콜, Tag 명칭, 단위 및 저장방식이 서로 달라 AI 및 IT 시스템에서 직접 활용하기 어려운 경우가 많다.'),
    p('DONG-IN ENSIS는 산업제어 및 PLC 엔지니어링 경험을 기반으로 설비와 데이터 시스템 사이의 OT 데이터 엔지니어링을 수행하여, 고객이 보유한 설비 운전 데이터를 표준화된 데이터 자산으로 전환한다.'),
  
    h1('3. 서비스 대상'),
    table([2400, W - 2400], ['구분', '대상 설비'], [
      ['생산설비', '제조공장 생산설비, 생산설비 및 Test Bench'],
      ['회전기기', 'Pump / Motor / Fan, Compressor, 기타 회전기기'],
      ['조선·해양', '선박 및 조선기자재 시험설비'],
      ['에너지', '수소·가스·에너지 설비'],
      ['유틸리티', 'Utility 및 산업플랜트 설비'],
    ], { keyCol: true }),
  
    h1('4. 주요 데이터 소스'),
    table([2400, W - 2400], ['구분', '항목'], [
      ['제어기기', 'PLC, VFD, EOCR, HMI, 계측기'],
      ['센서 데이터', '전류, 전압, 전력, 회전수(RPM), 온도, 압력, 진동, 운전상태, Alarm/Event, 운전시간'],
      ['주요 통신', 'Modbus TCP/RTU, MQTT, OPC UA, Ethernet 기반 산업통신'],
    ], { keyCol: true }),
  
    h1('5. 서비스 수행범위'),
    p('서비스는 기획·설계부터 데이터 분석까지 7단계로 수행하며, 단계별 산출물을 고객에게 제공한다.'),
    table([1500, 3400, W - 4900], ['단계', '내용', '핵심 산출물'], [
      ['STEP 1', '데이터 활용 기획·설계', '데이터 요구사항 정의서, Tag List'],
      ['STEP 2', 'OT 데이터 수집·생성', 'Raw Data, 수집 시험결과'],
      ['STEP 3', '데이터 정제·가공', '정제 데이터, Data Quality 결과'],
      ['STEP 4', 'Tag Mapping 및 표준화', 'Tag Mapping Table, 데이터 Schema'],
      ['STEP 5', '데이터 저장 및 구조화', '표준화 데이터셋, DB Schema'],
      ['STEP 6', '데이터 API 및 외부 활용 연계', 'REST API, API Specification'],
      ['STEP 7', '데이터 분석 및 AI 활용 데이터 구축', '분석 결과, Feature Dataset'],
    ], { center: [0] }),
  
    h2('STEP 1. 데이터 활용 기획·설계'),
    p('고객의 설비 및 데이터 활용 목적을 분석하여 데이터 수집 및 활용계획을 수립한다.'),
    stepTable(['대상설비 분석', '데이터 활용목적 정의', 'PLC 및 설비 Tag 분석', '필요 데이터 식별', '데이터 수집주기 정의', '데이터 구조 및 저장방식 설계'],
      ['데이터 요구사항 정의서', '데이터 수집계획', 'Tag List', '시스템 구성도']),
  
    h2('STEP 2. OT 데이터 수집·생성'),
    p('PLC, VFD, EOCR 및 센서에서 발생하는 설비 데이터를 자동으로 수집한다.'),
    stepTable(['PLC/VFD/센서 데이터 연계', '통신설정', '데이터 자동수집', 'MQTT/Modbus 기반 데이터 전송', '수집주기 설정', 'Timestamp 생성'],
      ['Raw Data', '데이터 수집 결과', '통신 및 수집 시험결과']),
  
    h2('STEP 3. 데이터 정제·가공'),
    p('산업설비에서 수집된 Raw Data를 분석 및 활용 가능한 형태로 변환한다.'),
    stepTable(['Null 및 Missing Data 처리', '이상값 검토', '단위 변환', 'Timestamp 정합', '데이터 Type 변환', '중복 데이터 제거', 'Machine-readable 데이터 변환'],
      ['정제 데이터', '데이터 가공 규칙', 'Data Quality 결과']),
  
    h2('STEP 4. Tag Mapping 및 표준화'),
    p('설비 및 제조사마다 다른 Tag 명칭을 공통 데이터 구조로 변환한다.'),
    table([2400, W - 2400], ['구분', '예시'], [
      ['PLC Raw Tag', [para([new TextRun({ text: 'MTR01_TEMP_DE', font: 'Consolas', size: 19, color: INK })], { after: 0 })]],
      ['Standard Tag', [para([new TextRun({ text: 'equipment.motor.bearing.temperature.de', font: 'Consolas', size: 19, color: BLUE, bold: true })], { after: 0 })]],
    ], { keyCol: true }),
    gap(80),
    label('표준 데이터 포함 정보'),
    table([1376, 1377, 1377, 1377, 1377, 1377, 1377], null, [
      ['Equipment ID', 'Tag ID', 'Timestamp', 'Value', 'Unit', 'Quality', 'Source'],
    ], { center: [0, 1, 2, 3, 4, 5, 6] }),
    gap(80),
    stepTable(['설비·제조사별 Tag 명칭 분석', '공통 데이터 구조로 Tag Mapping', '표준 Tag 체계 및 Schema 정의'],
      ['Tag Mapping Table', '표준 Tag Dictionary', '데이터 Schema']),
  
    h2('STEP 5. 데이터 저장 및 구조화'),
    p('정제·표준화된 데이터를 시계열 기반 데이터 저장구조로 구축한다.'),
    stepTable(['Time-series 데이터 구조화', '설비별 데이터 구분', 'Historical Data 관리', '데이터 조회구조 구축', '데이터 품질상태 관리'],
      ['표준화 데이터셋', 'DB Schema', '데이터 저장 결과']),
  
    h2('STEP 6. 데이터 API 및 외부 활용 연계'),
    p('표준화된 데이터를 외부 시스템에서 활용할 수 있도록 API 형태로 제공한다.'),
    table([W / 2, W / 2], ['활용 대상', '산출물'], [[
      cellList(['PWA Dashboard', 'AI 분석', 'Digital Twin', 'MES', 'ERP', '고객 자체 시스템']),
      cellList(['REST API', 'JSON Schema', 'API Specification']),
    ]]),
  
    h2('STEP 7. 데이터 분석 및 AI 활용 데이터 구축'),
    p('수집·가공된 설비 데이터를 기반으로 설비상태 분석 및 AI 모델 적용을 위한 Feature Dataset을 구축한다. 필요한 경우 이상감지 모델과 연계할 수 있다.'),
    table([W], ['주요 분석'], [[cellList(['운전상태 분석', 'Trend 분석', '설비 Load 분석', '온도/전류/전력 변화 분석', '이상구간 식별', 'AI 학습·추론용 Feature Dataset 구축'])]]),
  
    h1('6. 서비스 아키텍처', true),
    p('설비에서 발생한 데이터는 DONG-IN ENSIS의 OT 데이터 엔지니어링을 거쳐 표준 데이터로 저장되고, API를 통해 각 활용 시스템에 제공된다.'),
    new Table({
      width: { size: 6400, type: WidthType.DXA }, columnWidths: [6400], alignment: AlignmentType.CENTER,
      rows: [
        flowBox('산업설비', 'PLC / VFD / EOCR / Sensor'),
        arrowRow('Modbus TCP / MQTT / OPC UA'),
        flowBox('DONG-IN ENSIS OT Data Engineering', '수집 → 정제 → 가공 → Tag Mapping → 표준화 → 품질검증', true),
        arrowRow(),
        flowBox('Energient Industrial DataHub', 'Database / REST API'),
        arrowRow(),
        flowBox('활용 시스템', 'PWA / AI / Digital Twin / MES / ERP'),
      ],
    }),
  
    h1('7. 주요 산출물'),
    p('프로젝트 수행 후 고객에게 다음 결과물을 제공한다.'),
    table([900, 5338, 3400], ['No.', '산출물', '관련 단계'], [
      ['1', '데이터 요구사항 정의서', 'STEP 1'],
      ['2', '대상설비 및 데이터 Source List', 'STEP 1'],
      ['3', 'Tag List', 'STEP 1'],
      ['4', 'Tag Mapping Table', 'STEP 4'],
      ['5', '데이터 수집 결과', 'STEP 2'],
      ['6', '정제·가공 데이터', 'STEP 3'],
      ['7', '표준화 데이터셋', 'STEP 5'],
      ['8', 'Data Dictionary', 'STEP 4'],
      ['9', 'DB Schema', 'STEP 5'],
      ['10', 'JSON Schema', 'STEP 6'],
      ['11', 'API Specification', 'STEP 6'],
      ['12', '데이터 품질검증 결과', 'STEP 3'],
      ['13', '데이터 분석 결과', 'STEP 7'],
      ['14', '최종 데이터 활용 결과보고서', '전체'],
    ], { center: [0, 2] }),
  
    h1('8. 서비스 차별성'),
    table([2900, W - 2900], ['구분', '내용'], [
      ['OT 엔지니어링 기반 데이터 서비스', '일반적인 IT 데이터 가공 서비스와 달리, PLC·VFD·제어반·센서 및 산업통신에 대한 OT 엔지니어링 역량을 기반으로 데이터 발생단계부터 직접 접근한다.'],
      ['End-to-End Data Engineering', '단순 데이터 전처리가 아니라 설비 → PLC → 데이터 수집 → 가공 → 표준화 → 저장 → API → AI 활용까지 연결한다.'],
      ['Multi-Vendor 대응', 'Schneider Electric, Siemens, ABB, Fuji Electric 등 다양한 산업제어기기의 데이터를 고객사의 데이터 표준에 맞춰 통합할 수 있도록 구성한다.'],
      ['AI·Digital Twin 활용을 고려한 데이터 구축', '수집된 데이터를 단순 저장하는 데 그치지 않고, 향후 AI 이상감지·예지보전 및 Digital Twin 등에 활용할 수 있도록 데이터 구조를 설계한다.'],
    ], { keyCol: true }),
  
    h1('9. 적용 기대효과'),
    ...['수작업 설비 데이터 취득 자동화', '분산된 산업설비 데이터 통합', '제조사별 상이한 Tag 표준화', '데이터 품질 및 정합성 향상', 'AI 분석이 가능한 제조 데이터 확보', '설비상태 모니터링 기반 구축', '예지보전 데이터 기반 확보', 'Digital Twin 및 MES/ERP 연계 기반 구축'].map(t => bullet(t)),
  
    h1('10. 서비스 가격정책'),
    table([2400, W - 2400], null, [
      ['가격유형', '주문협의제'],
      ['산정 기준', '대상설비 수량, PLC 및 데이터 Source 수, Tag 수, 데이터 수집주기, 데이터 가공범위, 표준화 범위, 분석범위 및 프로젝트 수행기간'],
      ['세부 단가', 'DONG-IN ENSIS의 「산업설비 OT 데이터 활용서비스 가격정책 및 단가표」를 기준으로 산정한다.'],
    ], { keyCol: true }),
  
    h1('11. 서비스 범위 제외'),
    p('별도 협의가 없는 경우 다음 항목은 데이터 활용서비스 범위에서 제외한다.'),
    table([W / 2, W / 2], null, [
      [cellList(['PLC 및 VFD 등 제어기기 구매', '센서 및 계측기 구매', '제어반 제작비', '현장 전기공사']),
       cellList(['생산설비 개조', '고객 MES/ERP 전체 개발', 'AI 모델의 장기간 상용운영 고도화', '별도 클라우드 사용료'])],
    ]),
    gap(80),
    p('필요시 해당 항목은 데이터 활용서비스와 구분하여 별도 계약한다.'),
  ];

  return { cover, body };
});
