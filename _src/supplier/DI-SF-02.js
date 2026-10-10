// 스마트공장 구축 패키지 상세 설명서 (Basic · Standard · AI Advanced)
// DI-SF-01 「13. 구축 패키지」를 공급기업 등록·제안용으로 상세화한 문서
require('./common')({ DOC_NO: 'DI-SF-02', REV: 'Rev.00', TITLE: '스마트공장 구축 패키지 상세 설명서' }, H => {
  const {
    Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak,
    BLUE, RED, INK, GRAY, W, LOGO, DOC_NO, REV, TITLE,
    run, para, p, bullet, h1, h2, label, table, cellList, gap, stepTable, flowBox, arrowRow,
  } = H;

  const chain = arr => para(arr.flatMap((t, i) => i ? [run('  →  ', { color: RED, bold: true, size: 19 }), run(t, { size: 19 })] : [run(t, { size: 19, bold: true })]), { after: 0, line: 300 });
  const kv = rows => table([2400, W - 2400], null, rows, { keyCol: true });
  const strong = t => [para([run(t, { bold: true, color: BLUE, size: 19 })], { after: 0 })];
  const half = (a, b) => table([W / 2, W / 2], null, [[cellList(a), cellList(b)]]);
  const note = t => para([run(t, { size: 17, color: GRAY })], { after: 60 });
  // 기능 비교표 기호
  const mark = s => [para([run(s === 'O' ? '●' : s === 'D' ? '△' : '—', { bold: true, color: s === 'O' ? BLUE : s === 'D' ? INK : GRAY, size: 19 })], { align: AlignmentType.CENTER, after: 0 })];
  const cmpTable = rows => table([2500, W - 2500 - 3 * 1150, 1150, 1150, 1150], ['기능', '내용', 'Basic', 'Standard', 'AI Advanced'],
    rows.map(([f, d, a, b, c]) => [f, d, mark(a), mark(b), mark(c)]), { keyCol: true, center: [2, 3, 4] });

  // 패키지 상세 공통 블록
  const pkg = (name, en, sub, spec) => [
    h1(`${spec.no}. ${name} 패키지`, true),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [new TableRow({ cantSplit: true, children: [new TableCell({
        width: { size: W, type: WidthType.DXA },
        borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 24, color: BLUE } },
        shading: { fill: 'EAF1FA', type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 140, bottom: 140, left: 260, right: 260 },
        children: [
          para([run(`${name}`, { size: 26, bold: true, color: BLUE }), run(`   ${en}`, { size: 19, color: GRAY })], { after: 60 }),
          para([run(sub, { size: 20, bold: true, color: '111B2E' })], { after: 0 }),
        ],
      })] })],
    }),
    gap(100),
    h2(`${spec.no}.1 적용 대상 및 전제조건`),
    table([2400, W - 2400], null, [
      ['대상 기업', spec.target],
      ['현장 전제조건', cellList(spec.precond)],
      ['도입 목표', cellList(spec.goal)],
    ], { keyCol: true }),
    h2(`${spec.no}.2 공급 범위`),
    table([W / 2, W / 2], ['포함', '미포함 (상위 패키지 또는 별도 협의)'], [[cellList(spec.incl), cellList(spec.excl)]]),
    h2(`${spec.no}.3 구성 요소`),
    table([2400, W - 2400], ['구분', '내용'], spec.comp, { keyCol: true }),
    h2(`${spec.no}.4 수집 데이터 및 제공 화면`),
    table([2400, W - 2400], null, [
      ['수집 데이터', spec.data],
      ['제공 화면', cellList(spec.screens)],
      ['Alarm / Event', spec.alarm],
    ], { keyCol: true }),
    h2(`${spec.no}.5 구축 절차`),
    p(`DI-SF-01 「8. 스마트공장 구축 수행범위」의 7단계 중 다음 단계를 수행한다.`),
    table([2000, 3000, W - 5000], ['단계', '수행 여부', '주요 업무'], spec.steps.map(([s, y, w]) => [s, y, w]), { center: [1] }),
    h2(`${spec.no}.6 참고 구축기간`),
    table([2400, W - 2400], null, [
      ['참고 기간', spec.period],
      ['산정 전제', spec.periodBase],
    ], { keyCol: true }),
    note('※ 참고 기간은 현장진단 전 견적용 범위이며, 설비 수·PLC 기종·네트워크 상태·데이터 축적 필요기간에 따라 현장진단 후 확정한다.'),
    h2(`${spec.no}.7 주요 산출물`),
    half(spec.outsA, spec.outsB),
    h2(`${spec.no}.8 성과지표(KPI) 예시`),
    table([2000, W - 2000], ['분야', 'KPI'], spec.kpi, { keyCol: true }),
    h2(`${spec.no}.9 유지보수 및 기술지원`),
    half(spec.maintA, spec.maintB),
    h2(`${spec.no}.10 상위 패키지 전환`),
    p(spec.upgrade),
  ];

  const cover = [
    gap(1300),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 300, height: 58 } })] }),
    para([run('스마트공장 구축 패키지 상세 설명서', { size: 26, bold: true, color: GRAY })], { align: AlignmentType.CENTER, after: 80 }),
    para([run('Basic · Standard · AI Advanced', { size: 36, bold: true, color: '111B2E' })], { align: AlignmentType.CENTER, after: 120 }),
    para([run('Smart Manufacturing Data Solution 도입 패키지별 공급 범위·구성·절차·산출물', { size: 22, color: INK })], { align: AlignmentType.CENTER, after: 120 }),
    new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: 3000, right: 3000 }, spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 1 } }, children: [] }),
    para([run('설비를 제어하고, 데이터를 연결하다.', { size: 22, bold: true, color: BLUE })], { align: AlignmentType.CENTER, after: 500 }),
    table([2400, W - 2400], ['항목', '내용'], [
      ['문서번호', `${DOC_NO} ${REV}`],
      ['관련 문서', '스마트공장 공급기업 솔루션 설명서 (DI-SF-01) · 산업설비 OT 데이터 활용서비스 설명서 (DI-DS-01) · AI바우처 공급기업 솔루션 설명서 (DI-AV-01)'],
      ['솔루션명', 'Smart Manufacturing Data Solution'],
      ['패키지', 'Basic / Standard / AI Advanced'],
      ['공급기업', '㈜동인엔시스 (DONG-IN ENSIS)'],
      ['작성 / 시행일', '2026.10.10 작성 / 시행: 대표 승인일'],
    ], { keyCol: true }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const body = [
    h1('1. 문서 목적'),
    p('본 문서는 DONG-IN ENSIS의 스마트공장 솔루션(Smart Manufacturing Data Solution)을 수요기업의 스마트공장 수준에 맞춰 공급하기 위한 3개 구축 패키지의 상세 공급 범위를 정의한다. DI-SF-01 「13. 구축 패키지」 표를 상세화한 것으로, 공급기업 등록 서류, 수요기업 제안 및 사업계획 수립 시 패키지별 범위 기준으로 사용한다.'),
    p('각 패키지는 하위 패키지의 범위를 모두 포함하며(Basic → Standard → AI Advanced 순으로 범위가 넓어짐), 수요기업은 현재 수준에 맞는 패키지로 시작해 데이터가 축적되는 대로 상위 패키지로 확장할 수 있다.'),

    h1('2. 패키지 개요'),
    table([1900, 2500, 2800, W - 7200], ['패키지', '대상 기업', '도입 목표', '솔루션 구성 Level'], [
      [strong('Basic'), '스마트공장을 처음 도입하는 제조기업', '설비 운전 데이터를 자동으로 모으고, 상태를 보고, 이상 시 알린다', 'Level 1 ~ 4 (기본)'],
      [strong('Standard'), '데이터 표준화와 MES·ERP 연계가 필요한 고도화 기업', '설비·제조사별로 다른 데이터를 표준 제조데이터로 만들어 상위 시스템에 연결한다', 'Level 1 ~ 4 (전체)'],
      [strong('AI Advanced'), 'AI 이상감지·설비 상태 모니터링·디지털 트윈 연계까지 원하는 기업', '표준 데이터를 기반으로 이상 징후를 먼저 찾고, 설비 상태를 점수화하며, 디지털 트윈에 데이터를 공급한다', 'Level 1 ~ 5'],
    ], { center: [3] }),
    gap(60),
    note('※ Level 구분은 DI-SF-01 「5. 솔루션 구성」 기준: Level 1 Field/Control · 2 OT Connectivity · 3 DataHub · 4 Monitoring · 5 AI/Digital Twin'),

    h1('3. 패키지 선정 기준'),
    p('현장진단(STEP 1)에서 다음 항목을 확인하여 수요기업과 협의 후 패키지를 결정한다.'),
    table([3200, 2000, 2000, W - 7200], ['진단 항목', 'Basic', 'Standard', 'AI Advanced'], [
      ['설비 제어 방식', 'PLC 또는 단독 제어기', 'PLC (기종 혼재 가능)', 'PLC + 센서·DAQ 확장 가능'],
      ['현재 데이터 저장', '없음 또는 수기 기록', '일부 저장, 통합 안 됨', '시계열 저장 가능'],
      ['MES · ERP 보유', '없음 / 도입 예정', '보유 또는 동시 도입', '보유'],
      ['데이터 활용 목적', '설비 상태 확인, 이상 알림', '설비·공정 데이터 통합, 상위 시스템 연계', '예지보전, 상태진단, 디지털 트윈·AI'],
      ['정상 운전 데이터', '불필요', '불필요', 'AI 학습용 정상 운전 데이터 확보 가능 (구축 중 축적 가능)'],
      ['권장 설비 규모', '설비 1 ~ 10대', '설비 5 ~ 50대, 라인 단위', '핵심 설비 선정 후 단계 확대'],
    ], { keyCol: true }),

    h1('4. 패키지 기능 비교', true),
    p('● 포함   △ 부분 포함 또는 선택   — 미포함'),
    cmpTable([
      ['PLC 데이터 수집', 'PLC·VFD·EOCR·센서의 운전 데이터 자동 수집', 'O', 'O', 'O'],
      ['Multi-Vendor 수집', '제조사가 다른 PLC·기기 공통 수집 (Modbus·MQTT·OPC UA)', 'D', 'O', 'O'],
      ['기존 설비 Gateway 연동', 'Legacy 설비를 Gateway로 연결', 'D', 'O', 'O'],
      ['설비 Monitoring', '설비 운전상태·실시간 Trend 화면', 'O', 'O', 'O'],
      ['Historical Data', '운전 데이터 시계열 저장·과거 조회', 'O', 'O', 'O'],
      ['Alarm / Event', '기준값 초과·이상상태 Alarm 생성 및 이력', 'O', 'O', 'O'],
      ['Tag Mapping · 데이터 표준화', 'Raw Tag를 표준 Tag·공통 데이터 구조로 변환', '—', 'O', 'O'],
      ['Energient Industrial DataHub', '수집·정제·표준화·저장·품질관리 플랫폼', '—', 'O', 'O'],
      ['PWA Dashboard', 'PC·Tablet·Mobile 대시보드', 'D', 'O', 'O'],
      ['REST API', '표준 데이터를 외부 시스템에 제공', '—', 'O', 'O'],
      ['MES / ERP 연계', 'REST API 기반 상위 시스템 데이터 연계', '—', 'O', 'O'],
      ['데이터 품질관리', '수집률·누락률·정합성 점검', '—', 'O', 'O'],
      ['Feature Engineering', '운전 조건별 Feature 설계·생성', '—', '—', 'O'],
      ['AI 이상감지', '정상 패턴 학습 기반 Anomaly Score 산출', '—', '—', 'O'],
      ['Condition Monitoring · Health Index', '설비 상태등급·Health Index·추세', '—', '—', 'O'],
      ['예지보전 지원', '이상 추세 기반 정비 시점 판단·리포트', '—', '—', 'O'],
      ['Digital Twin 연계', '디지털 트윈에 표준 데이터 실시간 공급', '—', 'D', 'O'],
      ['Cloud–Edge 하이브리드', '엣지 추론으로 네트워크 단절 시에도 판단', '—', '—', 'D'],
    ]),
    gap(60),
    note('※ Basic의 △: 설비·기종이 2종 이하인 경우 기본 포함, 초과 시 Standard 권장. PWA Dashboard는 Basic에서 설비 상태·Trend·Alarm 기본 화면만 제공.'),
    note('※ AI Advanced의 AI 이상감지는 PoC → 실증 → 상용 순으로 단계 적용하며, 학습용 정상 운전 데이터 축적 기간이 필요하다.'),

    // ---------- Basic ----------
    ...pkg('Basic', 'Smart Factory Starter Package', '설비 데이터를 자동으로 모으고, 상태를 보고, 이상 시 알립니다.', {
      no: 5,
      target: '스마트공장을 처음 도입하는 제조기업. PLC 또는 제어기기로 설비를 운전하고 있으나 운전 데이터를 저장·활용하지 않는 현장.',
      precond: ['대상 설비에 PLC 또는 통신 가능한 제어기기(VFD·EOCR 등)가 있을 것', '설비와 서버(또는 클라우드) 사이 네트워크 연결이 가능할 것', '대상 설비·기종 2종 이하 권장 (초과 시 Standard)'],
      goal: ['수기 기록을 없애고 설비 운전 데이터 자동 수집', '설비 운전상태와 주요 값을 화면에서 실시간 확인', '기준값 초과·이상 시 Alarm 발생과 이력 보관', '상위 패키지 확장을 위한 데이터 축적 시작'],
      incl: ['PLC·VFD·EOCR 데이터 자동 수집 (단일 통신 방식)', '설비 운전상태·실시간 Trend Monitoring', 'Historical Data 시계열 저장·조회', '기준값 Alarm / Event 생성·이력', '기본 Dashboard (설비 상태·Trend·Alarm)', '통신·수집 시험, 사용자 교육'],
      excl: ['Tag 표준화·Standard Tag Dictionary', 'Energient Industrial DataHub', 'REST API·MES/ERP 연계', 'Multi-Vendor·Gateway 다수 연동', 'AI 이상감지·Health Index', 'PLC·센서·제어반 하드웨어, 현장 공사'],
      comp: [
        ['현장 (Level 1·2)', 'PLC·VFD·EOCR 등 기존 제어기기 활용 · 필요 시 지능형 제어반 또는 데이터 수집 Gateway 1식'],
        ['통신', 'Modbus TCP 또는 MQTT 중 1종 (현장 기기에 맞춰 선정)'],
        ['데이터 저장 (Level 3 기본)', '시계열 DB (고객 서버 또는 클라우드) · Raw Data 저장'],
        ['화면 (Level 4 기본)', '설비 상태 화면, 실시간·과거 Trend, Alarm 목록 (PC 기준, 모바일 열람 가능)'],
        ['소프트웨어', '데이터 수집 프로그램, 기본 Dashboard, Alarm 기능'],
      ],
      data: 'Running / Stop, Current, Voltage, Power, RPM, Temperature, Pressure, Operating Hour, Alarm 등 설비당 Tag 20점 내외',
      screens: ['설비별 운전상태 (Running / Stop / Alarm)', '실시간 Trend (Current·Power·Temperature 등)', '과거 Trend 조회 (기간 선택)', 'Alarm 목록·확인'],
      alarm: '기준값(상·하한) Alarm, 통신 두절 Alarm · 발생시간·대상설비·값 기록',
      steps: [
        ['STEP 1 현장진단', '수행', '대상 설비·PLC 현황, 네트워크, 수집 항목 확인'],
        ['STEP 2 To-Be 설계', '간이 수행', '수집 Tag List, 통신 방식, 화면 구성 정의'],
        ['STEP 3 설비연동', '수행', 'PLC·VFD 연결, 수집 프로그램, 수집 시험'],
        ['STEP 4 DataHub 구축', '기본 저장만', '시계열 DB 구축·Raw Data 저장 (표준화 제외)'],
        ['STEP 5 Visualization', '기본 화면', '설비 상태·Trend·Alarm 화면'],
        ['STEP 6 AI 활용', '미수행', '—'],
        ['STEP 7 시험 및 검수', '수행', '통신·수집·Alarm·화면 시험'],
      ],
      period: '약 4 ~ 6주',
      periodBase: '설비 5대 · PLC 1기종 · Tag 100점 이내 · 기존 네트워크 사용 기준',
      outsA: ['현장진단보고서', 'PLC Tag List', '통신·수집 시험결과서'],
      outsB: ['Dashboard', '사용자 매뉴얼', '구축완료보고서'],
      kpi: [
        ['데이터', '데이터 자동수집률, 수기입력 감소율'],
        ['설비관리', '설비 이상발견시간, Alarm 대응시간'],
        ['운영', '설비 가동시간 기록률'],
      ],
      maintA: ['PLC·통신 장애지원', '데이터 수집상태 확인'],
      maintB: ['Dashboard 기술지원', '사용자 교육'],
      upgrade: 'Basic에서 수집한 Raw Data와 Tag List는 Standard 전환 시 그대로 사용한다. Standard 전환은 Tag Mapping·표준화와 DataHub 구축, API 연계를 추가하는 방식으로 진행하며, 기존 수집 구성은 재구축하지 않는다.',
    }),

    // ---------- Standard ----------
    ...pkg('Standard', 'Smart Factory Data Standard Package', '설비·제조사별로 다른 데이터를 표준 제조데이터로 만들어 MES·ERP에 연결합니다.', {
      no: 6,
      target: '스마트공장 고도화 제조기업. 설비 데이터가 일부 수집되고 있으나 제조사별 Tag·단위·통신이 달라 통합·활용이 어렵고, MES·ERP·품질 시스템과 연계가 필요한 현장.',
      precond: ['대상 설비·라인의 PLC 및 데이터 Source 목록 확정 가능', '연계 대상 MES·ERP 등 상위 시스템과 인터페이스 협의 가능', '고객 서버 또는 클라우드 중 DataHub 설치 위치 결정'],
      goal: ['설비·제조사별로 다른 데이터를 공통 데이터 구조로 표준화', 'DataHub에서 수집·정제·표준화·저장·품질관리 일원화', 'REST API로 MES·ERP·고객 시스템에 표준 데이터 제공', 'AI·Digital Twin이 사용할 수 있는 제조데이터 자산 확보'],
      incl: ['Basic 전체 범위', 'Multi-Vendor OT 데이터 자동수집 (Modbus TCP/RTU·MQTT·OPC UA)', '기존 설비 Gateway 연동', 'Tag Mapping·표준 Tag Dictionary·표준 데이터 구조', 'Energient Industrial DataHub 구축', 'PWA Dashboard (PC·Tablet·Mobile)', 'REST API 제공 및 MES/ERP 연계 1종', '데이터 품질관리 (수집률·누락률·정합성)', '관리자 교육'],
      excl: ['Feature Engineering·AI 이상감지', 'Condition Monitoring·Health Index', 'Digital Twin 연계 (데이터 제공 범위는 협의)', 'MES/ERP 자체 개발·개조', 'PLC·센서·제어반 하드웨어, 현장 공사', '클라우드 사용료'],
      comp: [
        ['현장 (Level 1·2)', '신규 설비: PLC → MQTT 직접 전송 · 기존 설비: Gateway → MQTT · 통신 2종 이상 혼용'],
        ['DataHub (Level 3)', 'Energient Industrial DataHub: 실시간 수집, Raw 저장, Tag Mapping, 정제, 표준화, Timestamp·Quality 관리, 시계열 저장, Equipment 관리, Alarm/Event, REST API'],
        ['화면 (Level 4)', 'PWA Dashboard: 설비·라인별 상태, 실시간·과거 Trend, Alarm/Event, 운전시간, 데이터 품질 현황'],
        ['연계', 'REST API Specification 제공 · MES/ERP 연계 1종 (추가 연계는 협의)'],
        ['표준', '표준 데이터 구조: Equipment ID · Tag ID · Timestamp · Value · Unit · Quality · Source'],
      ],
      data: 'Basic 항목 + Energy, Flow, Vibration, Load Pattern, 생산 카운트·Cycle Time 등 공정 데이터 · 설비당 Tag 50점 내외',
      screens: ['라인·설비 계층별 상태 화면', '실시간·과거 Trend (다중 Tag 비교)', 'Alarm / Event 관리 (확인·이력·통계)', '운전시간·가동률', '데이터 수집·품질 현황'],
      alarm: '기준값 Alarm, 통신 두절, 데이터 품질 Alarm (누락·정체) · Alarm Code·Level·관련 Tag·확인상태 관리',
      steps: [
        ['STEP 1 현장진단', '수행', '공정·설비·PLC·네트워크 현황, 데이터 활용목적·KPI 정의'],
        ['STEP 2 To-Be 설계', '수행', 'Architecture, 수집범위, Tag List, 통신 설계, 데이터 표준 정의'],
        ['STEP 3 설비연동', '수행', 'PLC·VFD·Sensor·Gateway 연결, MQTT/Modbus/OPC UA 연계'],
        ['STEP 4 DataHub 구축', '수행', 'DataHub 구축, Tag Mapping, 표준화, Historical Data 관리'],
        ['STEP 5 Visualization', '수행', 'PWA Dashboard, Trend, Monitoring, Alarm/Event'],
        ['STEP 6 AI 활용', '미수행', '— (AI Advanced에서 수행)'],
        ['STEP 7 시험 및 검수', '수행', '통신·수집·정합성·Alarm·Dashboard·API 시험, FAT/SAT'],
      ],
      period: '약 8 ~ 12주',
      periodBase: '설비 20대 · PLC 2 ~ 3기종 · Tag 500점 이내 · MES/ERP 연계 1종 기준',
      outsA: ['요구사항 정의서', '현장진단보고서', 'As-Is / To-Be 구성도', 'Network Architecture', 'Data Source List', 'PLC Tag List', 'Tag Mapping Table', '표준 Tag Dictionary'],
      outsB: ['DB Schema', 'JSON Schema', 'API Specification', 'DataHub', 'Dashboard', '데이터 품질검증 결과서', 'FAT/SAT Report', '사용자·관리자 매뉴얼', '구축완료보고서'],
      kpi: [
        ['데이터', '데이터 자동수집률, 데이터 누락률, 실시간 데이터 확보율, 표준화 Tag 비율'],
        ['설비관리', '설비가동률, 비가동시간, 설비 이상발견시간'],
        ['생산', '생산성, Cycle Time, 설비 대기시간'],
        ['연계', 'MES/ERP 수기입력 감소율, API 연계 항목 수'],
      ],
      maintA: ['PLC·통신 장애지원', '데이터 수집상태 확인', 'Tag Mapping 수정', '데이터 품질 점검'],
      maintB: ['Dashboard 기술지원', 'API 연계지원', '사용자·관리자 교육', '시스템 개선 및 고도화'],
      upgrade: 'Standard의 표준 데이터 구조와 DataHub는 AI Advanced의 학습·추론 데이터 기반이 된다. AI Advanced 전환 시 Feature Engineering과 AI Engine, 상태진단 화면을 추가하며, 정상 운전 데이터 축적을 위해 Standard 운영 기간을 학습 데이터 확보 기간으로 활용한다.',
    }),

    // ---------- AI Advanced ----------
    ...pkg('AI Advanced', 'Smart Factory AI Package', '표준 데이터로 이상 징후를 먼저 찾고, 설비 상태를 점수화하며, 디지털 트윈에 데이터를 공급합니다.', {
      no: 7,
      target: '제조 AI 활용기업. 설비 데이터 기반 예지보전, 설비 상태진단, 디지털 트윈·AI 플랫폼 연계를 원하는 현장. Standard 수준의 데이터 인프라를 보유했거나 동시에 구축하는 기업.',
      precond: ['Standard 범위의 DataHub·표준 데이터 구조 보유 또는 동시 구축', 'AI 학습용 정상 운전 데이터 확보 가능 (구축 기간 중 축적 포함)', '핵심 대상 설비 선정 (Motor·Pump·Compressor·Fan 등 회전기기 우선)', '필요 시 센서·DAQ 추가 설치 협의'],
      goal: ['정상 운전 패턴을 학습해 이상 징후를 조기 탐지', '설비별 Health Index·상태등급으로 상태 기반 보전 체계 구축', '이상 추세 기반 점검·정비 시점 판단 (예지보전)', '디지털 트윈·AI 플랫폼에 표준 데이터 실시간 공급'],
      incl: ['Standard 전체 범위', 'Feature Engineering (운전 조건별 Feature 설계·생성)', 'AI 이상감지 (비지도 학습, Anomaly Score)', 'Condition Monitoring · Health Index · 상태등급', '조기 경보 및 예지보전 지원 (이력·리포트)', 'Digital Twin 연계 (표준 데이터 실시간 API 제공)', 'AI 모델 학습·현장 적용·튜닝, 성과검증'],
      excl: ['Digital Twin 플랫폼 자체 구축·3D 모델링', 'AI가 설비를 직접 제어하는 폐루프 제어 (실증 중, 별도 협의)', 'PLC·센서·DAQ·제어반 하드웨어, 현장 공사', '클라우드 사용료', '공급 기간 이후 AI 모델 장기 운영 (유지보수 계약)'],
      comp: [
        ['데이터 (Level 1 ~ 3)', 'Standard 구성 + 필요 시 고정밀 데이터 수집장치(DAQ)로 전기 파형 수집 · Feature 저장'],
        ['AI Engine (Level 5)', '비지도 학습 이상탐지 · Anomaly Score · Health Index · 상태등급 (Normal / Warning / Abnormal)'],
        ['화면 (Level 4·5)', 'PWA Dashboard + 설비 상태진단 화면 (Health Index 추세, 이상 발생 이력, 예지보전 리포트)'],
        ['연계', 'REST API로 MES·ERP·Digital Twin·AI Platform에 표준 데이터 및 AI 결과 제공'],
        ['공급 형태', '구축형(On-Premise) · 클라우드형 · 하이브리드(Edge) 중 선택 (DI-AV-01 「10. 공급 형태」 기준)'],
      ],
      data: 'Standard 항목 + 진동, 전류 파형(DAQ), 운전 조건 구분 데이터 · AI 대상 설비당 Feature 10 ~ 30종',
      screens: ['Standard 전체 화면', '설비 상태진단 (Health Index·상태등급·추세)', '이상 발생 이력·Anomaly Score Trend', '예지보전 리포트 (점검 권고·근거 데이터)', '에너지 분석 (설비별 전력·원단위)'],
      alarm: 'Standard Alarm + AI 경보 (Warning / Abnormal) · 대상설비·관련 Tag·Anomaly Score·발생시간 · 임계값 조정 가능',
      steps: [
        ['STEP 1 현장진단', '수행', 'Standard 항목 + 대상설비·고장 이력 분석, AI 적용 목표·KPI 정의'],
        ['STEP 2 To-Be 설계', '수행', 'Standard 항목 + AI 적용 계획, Feature 설계 방향, 센서·DAQ 추가 검토'],
        ['STEP 3 설비연동', '수행', 'Standard 항목 + 센서·DAQ 연동'],
        ['STEP 4 DataHub 구축', '수행', 'Standard 항목 + Feature 저장 구조'],
        ['STEP 5 Visualization', '수행', 'Standard 항목 + 상태진단·예지보전 화면'],
        ['STEP 6 AI 활용', '수행', '정제·Feature 구축 → AI 학습 → 현장 적용·튜닝 → 성과검증 (DI-AV-01 STEP 3 ~ 6)'],
        ['STEP 7 시험 및 검수', '수행', 'Standard 시험 + AI 성능 검증 (탐지 리드타임·오경보율)'],
      ],
      period: '약 12 ~ 16주 + 정상 운전 데이터 축적 기간',
      periodBase: 'Standard 기준 + AI 대상 설비 5대 · 학습 데이터 축적 4 ~ 8주 (기존 데이터 보유 시 단축) · PoC → 실증 단계 적용',
      outsA: ['Standard 전체 산출물', 'AI 적용 계획서', 'KPI 정의서', '정제 데이터셋', 'Feature 정의서'],
      outsB: ['AI 모델 · 모델 학습 결과서', '알람 기준표', '적용 결과서', '성과검증 보고서', '모델 운영 매뉴얼'],
      kpi: [
        ['AI 성능', '이상 탐지 리드타임, 오경보율'],
        ['설비관리', '비가동시간, 돌발고장 건수, 고장 대응시간'],
        ['보전', '예방정비율, 상태 기반 정비 비율'],
        ['에너지', '설비별 전력사용량, 에너지 원단위'],
        ['데이터', '데이터 자동수집률, 누락률, Feature 생성률'],
      ],
      maintA: ['Standard 유지보수 전체', 'AI 모델 재학습 (운전 조건·설비 변경 시)', '경보 임계값 조정'],
      maintB: ['AI 성능 모니터링·리포트', 'Digital Twin·AI Platform 연계지원', '모델 운영 교육'],
      upgrade: 'AI Advanced 이후에는 대상 설비 확대, 에너지 최적운전(실증 중인 폐루프 제어), Digital Twin 고도화를 별도 과제로 진행한다. AI바우처·데이터바우처 사업과 연계할 경우 DI-AV-01·DI-DS-01의 범위를 적용한다.',
    }),

    h1('8. 공급 형태', true),
    table([2400, 2400, 2400, W - 7200], ['형태', 'Basic', 'Standard', 'AI Advanced'], [
      ['구축형 (On-Premise)', '고객 서버 설치', '고객 서버에 DataHub 설치', '고객 서버에 DataHub·AI Engine 설치'],
      ['클라우드형', '클라우드 수집·화면', '클라우드 DataHub·Dashboard', '클라우드 학습·분석·Dashboard'],
      ['하이브리드 (Edge)', '—', '엣지 수집 + 클라우드 저장', '클라우드 학습 + 현장 엣지 추론 (네트워크 단절 시에도 판단)'],
    ], { keyCol: true }),
    gap(60),
    p('데이터 외부 반출이 어려운 현장은 구축형, 초기 투자 부담을 줄이려면 클라우드형, 네트워크가 불안정하거나 현장 판단이 필요한 경우 하이브리드를 권장한다.'),

    h1('9. 업그레이드 경로'),
    p('패키지는 포함 관계로 설계되어 하위 패키지에서 구축한 구성을 재사용하며 상위 패키지로 확장한다.'),
    new Table({
      width: { size: 6400, type: WidthType.DXA }, columnWidths: [6400], alignment: AlignmentType.CENTER,
      rows: [
        flowBox('Basic', 'PLC 데이터 수집 · Monitoring · Historical Data · Alarm'),
        arrowRow('Tag 표준화 · DataHub · API 추가 (수집 구성 재사용)'),
        flowBox('Standard', 'OT 자동수집 · 데이터 표준화 · DataHub · Dashboard · API · MES/ERP 연계', true),
        arrowRow('Feature · AI Engine · 상태진단 추가 (표준 데이터 재사용)'),
        flowBox('AI Advanced', 'AI 이상감지 · Condition Monitoring · 예지보전 · Digital Twin 연계', true),
      ],
    }),
    gap(80),
    table([2900, W - 2900], ['전환', '유지되는 자산'], [
      ['Basic → Standard', '수집 프로그램·통신 구성, Raw Data, Tag List, Alarm 기준, 사용자 교육 내용'],
      ['Standard → AI Advanced', 'DataHub, 표준 Tag Dictionary, 표준 데이터 구조, Dashboard, API, 축적된 시계열 데이터 (AI 학습 데이터로 사용)'],
    ], { keyCol: true }),

    h1('10. 가격 산정 기준'),
    table([2400, W - 2400], null, [
      ['가격유형', '주문협의제 (패키지별 기본 범위 + 산정 요소에 따른 견적)'],
      ['공통 산정 요소', '대상 설비 수량, PLC 및 데이터 Source 수, PLC 기종 수, Tag 수, 데이터 수집주기, 화면 수, 프로젝트 수행기간'],
      ['Standard 추가 요소', '표준화 Tag 수, 연계 시스템 수 (MES·ERP 등), Gateway 수, DataHub 설치 형태'],
      ['AI Advanced 추가 요소', 'AI 대상 설비 수, Feature 수, 센서·DAQ 추가 여부, 학습 데이터 축적 기간, 공급 형태(On-Premise·Cloud·Edge)'],
      ['세부 단가', 'DONG-IN ENSIS 「가격정책 및 단가표 (DI-DS-02)」를 기준으로 산정하며, 정부 지원사업 적용 시 해당 사업의 공급 단가 기준을 따른다.'],
    ], { keyCol: true }),

    h1('11. 공급 범위 제외 (공통)'),
    p('별도 협의가 없는 경우 다음 항목은 모든 패키지의 공급 범위에서 제외하며, 필요시 별도 계약한다.'),
    half(['PLC, VFD, 센서, DAQ 등 하드웨어 구매', '제어반 제작 (지능형 제어반은 별도 견적)', '현장 전기·통신 공사'],
      ['고객 생산설비 개조', 'MES/ERP 자체 개발·개조', '클라우드 사용료', '공급 기간 이후 장기 운영 (유지보수 계약)']),

    h1('12. 유지보수 및 기술지원 요약'),
    table([2900, 2200, 2200, W - 7300], ['지원 항목', 'Basic', 'Standard', 'AI Advanced'], [
      ['PLC·통신 장애지원', mark('O'), mark('O'), mark('O')],
      ['데이터 수집상태 확인', mark('O'), mark('O'), mark('O')],
      ['Tag Mapping 수정', mark('—'), mark('O'), mark('O')],
      ['데이터 품질 점검', mark('—'), mark('O'), mark('O')],
      ['Dashboard 기술지원', mark('O'), mark('O'), mark('O')],
      ['API 연계지원', mark('—'), mark('O'), mark('O')],
      ['AI 모델 재학습·임계값 조정', mark('—'), mark('—'), mark('O')],
      ['사용자·관리자 교육', mark('O'), mark('O'), mark('O')],
      ['시스템 개선 및 고도화', mark('D'), mark('O'), mark('O')],
    ], { keyCol: true, center: [1, 2, 3] }),
    gap(60),
    note('※ 유지보수 기간·범위는 구축 계약에 포함된 무상 기간 이후 별도 유지보수 계약으로 운영한다.'),

    h1('13. 패키지 핵심 문구'),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [new TableRow({ cantSplit: true, children: [new TableCell({
        width: { size: W, type: WidthType.DXA },
        borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 24, color: RED } },
        shading: { fill: 'EAF1FA', type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        children: [
          para([run('Basic으로 데이터를 모으고, Standard로 표준 제조데이터를 만들고, AI Advanced로 설비의 이상을 먼저 찾습니다.', { size: 22, bold: true, color: '111B2E' })], { after: 120, line: 340 }),
          para([run('제조기업의 수준에 맞춰 시작하고, 쌓인 데이터 위에서 단계적으로 확장합니다.', { size: 20, color: BLUE })], { after: 0 }),
        ],
      })] })],
    }),
  ];

  return { cover, body };
});
