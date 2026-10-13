// AI바우처 공급기업 솔루션 설명서 (산업설비 AI 이상감지·예지보전 솔루션)
require('./common')({ DOC_NO: 'DI-AV-01', REV: 'Rev.00', TITLE: 'AI바우처 공급기업 솔루션 설명서' }, H => {
  const {
    Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, AlignmentType, WidthType, ShadingType, BorderStyle, PageBreak,
    BLUE, RED, INK, GRAY, W, LOGO, DOC_NO, REV, TITLE,
    run, para, p, bullet, h1, h2, label, table, cellList, gap, stepTable, flowBox, arrowRow,
  } = H;

  const chain = arr => para(arr.flatMap((t, i) => i ? [run('  →  ', { color: RED, bold: true, size: 19 }), run(t, { size: 19 })] : [run(t, { size: 19, bold: true })]), { after: 0, line: 300 });
  const kv = rows => table([2400, W - 2400], null, rows, { keyCol: true });
  const strong = t => [para([run(t, { bold: true, color: BLUE, size: 19 })], { after: 0 })];
  const half = (a, b) => table([W / 2, W / 2], null, [[cellList(a), cellList(b)]]);

  const NAME = 'Industrial AI Anomaly Detection & Predictive Maintenance';
  const SUBNAME = '산업설비 AI 이상감지·예지보전 솔루션';

  const cover = [
    gap(1300),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: 'png', data: LOGO, transformation: { width: 300, height: 58 } })] }),
    para([run('AI바우처 공급기업 솔루션 설명서', { size: 26, bold: true, color: GRAY })], { align: AlignmentType.CENTER, after: 80 }),
    para([run(SUBNAME, { size: 36, bold: true, color: '111B2E' })], { align: AlignmentType.CENTER, after: 120 }),
    para([run(NAME, { size: 22, color: INK })], { align: AlignmentType.CENTER, after: 120 }),
    new Paragraph({ alignment: AlignmentType.CENTER, indent: { left: 3000, right: 3000 }, spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 1 } }, children: [] }),
    para([run('정상 운전 패턴을 학습해 고장 징후를 먼저 찾습니다', { size: 22, bold: true, color: BLUE })], { align: AlignmentType.CENTER, after: 500 }),
    table([2400, W - 2400], ['항목', '내용'], [
      ['문서번호', `${DOC_NO} ${REV}`],
      ['솔루션명', SUBNAME],
      ['영문명', NAME],
      ['AI 유형', '시계열 이상탐지 (비지도 학습) · 설비 상태진단 · 예지보전'],
      ['공급기업', '㈜동인엔시스 (DONG-IN ENSIS)'],
      ['작성 / 시행일', '2026.10.09 작성 / 시행: 대표 승인일'],
    ], { keyCol: true }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const body = [
    h1('1. 솔루션명'),
    kv([
      ['솔루션명', SUBNAME],
      ['영문명', NAME],
      ['공급기업', 'DONG-IN ENSIS (㈜동인엔시스)'],
      ['AI 분야', '제조 · 설비 상태진단 · 이상탐지 · 예지보전 · 에너지 최적화'],
    ]),

    h1('2. 솔루션 개요'),
    p('본 솔루션은 모터, 펌프, 압축기, 팬 등 제조현장 회전설비의 운전 데이터(전류, 전력, 온도, 진동, 회전수 등)를 AI로 분석하여 이상 징후를 조기에 탐지하고, 설비 상태를 점수화하여 예지보전과 에너지 최적화에 활용하는 산업용 AI 솔루션이다.'),
    p('AI는 고장 데이터를 사람이 일일이 분류하지 않아도 정상 운전 패턴을 스스로 학습하는 비지도 학습 방식을 사용한다. 따라서 고장 이력이 적은 현장이나 특수 설비에도 적용할 수 있다.'),
    p('DONG-IN ENSIS는 PLC·제어반 엔지니어링 역량을 바탕으로 데이터 수집부터 AI 학습, 현장 적용까지 한 회사에서 수행하여, 수요기업이 AI를 실제 설비 운영에 바로 쓸 수 있도록 공급한다.'),
    table([3212, 3213, 3213], ['데이터', 'AI 분석', '현장 활용'], [
      ['PLC·센서·DAQ로 설비 운전 데이터 수집', '비지도 학습 이상탐지 · Anomaly Score · Health Index', '조기 경보 · 예지보전 · 에너지 최적화'],
    ], { center: [0, 1, 2] }),

    h1('3. 수요기업의 주요 문제'),
    table([2900, W - 2900], ['문제', '현황'], [
      ['사후정비 중심의 설비관리', '설비가 멈춘 뒤에야 원인을 찾고 정비하므로 비가동시간과 생산 손실이 크다.'],
      ['AI 학습용 고장 데이터 부족', '고장은 드물게 발생해 라벨이 붙은 고장 데이터가 거의 없어, 일반적인 지도학습 AI를 적용하기 어렵다.'],
      ['숙련자 경험에 의존', '소리·진동·온도로 이상을 판단하던 숙련자의 노하우가 기록으로 남지 않는다.'],
      ['에너지 비용 증가', '설비별 전력 사용과 비효율 운전을 파악하지 못해 에너지 절감 근거가 없다.'],
      ['현장 데이터와 AI의 단절', 'AI 솔루션을 도입해도 PLC·제어기기 데이터를 연결하지 못해 PoC에서 멈추는 경우가 많다.'],
    ], { keyCol: true }),

    h1('4. 적용 대상'),
    half(['Motor / VFD 구동 설비', 'Pump · Fan · Blower', 'Compressor', '생산라인 회전기기'],
      ['상수도·Utility 펌프 설비', '데이터센터 냉각설비(냉동기·냉각수 펌프·냉각탑 팬)', '조선·해양 및 수소·에너지 설비', '생산 및 성능 Test Bench']),

    h1('5. AI 기술 구성'),
    table([2600, W - 2600], ['구성', '내용'], [
      ['데이터 수집', 'PLC, VFD, EOCR, 센서에서 운전 데이터를 실시간 수집한다. 필요 시 고정밀 데이터 수집장치(DAQ)로 kHz 단위 전기 파형을 수집한다.'],
      ['전처리·Feature', '결측·이상값 정리, 단위·Timestamp 정합 후 운전 조건별 Feature를 생성한다.'],
      ['비지도 학습 이상탐지', '정상 운전 데이터로 설비별 정상 패턴을 학습하고, 이를 벗어나는 정도를 Anomaly Score로 산출한다.'],
      ['상태진단', 'Anomaly Score와 운전 추세를 종합해 설비 Health Index와 상태등급(Normal / Warning / Abnormal)을 제공한다.'],
      ['Cloud–Edge 하이브리드', '무거운 학습은 클라우드 또는 고객사 서버에서 수행하고, 최적화된 파라미터를 현장 엣지 컨트롤러로 보내 네트워크가 끊겨도 현장에서 판단한다.'],
      ['에너지 최적화 (실증 중)', 'AI가 찾은 최적 운전값을 현장 PLC로 되돌려 보내 모터 시스템의 전력 소비를 줄이는 폐루프 제어를 실증하고 있다.'],
    ], { keyCol: true }),

    h1('6. 시스템 Architecture'),
    p('설비 데이터는 제어반에서 수집되어 AI 학습·추론을 거쳐 경보와 상태진단으로 돌아오며, 필요 시 최적 운전값이 PLC로 다시 전달된다.'),
    new Table({
      width: { size: 6400, type: WidthType.DXA }, columnWidths: [6400], alignment: AlignmentType.CENTER,
      rows: [
        flowBox('설비 · 센서', 'Motor / Pump / Compressor / Fan · 전류 · 전력 · 온도 · 진동 · RPM'),
        arrowRow(),
        flowBox('지능형 제어반 · PLC · DAQ', '실시간 제어 · 데이터 수집 · 엣지 추론'),
        arrowRow('MQTT / TLS'),
        flowBox('DataHub', '시계열 저장 · 표준화 · Feature 생성'),
        arrowRow(),
        flowBox('AI Engine', '비지도 학습 이상탐지 · Anomaly Score · Health Index', true),
        arrowRow('REST API'),
        flowBox('활용', 'PWA Dashboard · 알람 · 예지보전 · MES/ERP · 최적 운전값 PLC 피드백'),
      ],
    }),

    h1('7. 핵심 기능'),
    table([2600, W - 2600], ['기능', '내용'], [
      ['AI 이상감지', '정상 패턴 대비 이탈 정도를 실시간으로 계산해 이상 징후를 조기에 탐지한다.'],
      ['설비 상태진단', '설비별 Health Index와 상태등급을 제공하고 추세 변화를 보여 준다.'],
      ['조기 경보', 'Warning·Abnormal 발생 시 대상설비, 관련 Tag, 발생시간과 함께 담당자에게 알린다.'],
      ['예지보전 지원', '이상 추세를 근거로 점검·정비 시점을 판단할 수 있도록 이력과 리포트를 제공한다.'],
      ['에너지 분석', '설비별 전력 사용량과 운전 조건을 비교해 비효율 운전 구간을 찾는다.'],
      ['대시보드·API', 'PC·모바일 PWA 대시보드와 REST API로 MES·ERP·고객 시스템에 결과를 연계한다.'],
    ], { keyCol: true }),
    gap(80),
    label('AI 출력 예'),
    table([1928, 1927, 1928, 1927, 1928], null, [['Normal', 'Warning', 'Abnormal', 'Anomaly Score', 'Health Index']], { center: [0, 1, 2, 3, 4] }),

    h1('8. 도입 절차'),
    p('도입은 6단계로 수행하며, 정상 운전 데이터를 충분히 확보한 뒤 AI를 학습한다.'),
    ...[
      ['STEP 1. 현장진단·목표 정의', ['대상설비·고장 이력 분석', '데이터 Source 확인', 'AI 적용 목표·KPI 정의'], ['현장진단보고서', 'AI 적용 계획서', 'KPI 정의서']],
      ['STEP 2. 데이터 연결·수집', ['PLC·VFD·센서 연동', '필요 시 센서·DAQ 추가', '실시간 수집·저장'], ['데이터 Source List', 'Tag List', '수집 시험결과']],
      ['STEP 3. 데이터 정제·Feature 구축', ['결측·이상값 처리', '운전 조건 구분', 'Feature 설계·생성'], ['정제 데이터셋', 'Feature 정의서', '데이터 품질 결과']],
      ['STEP 4. AI 모델 학습', ['정상 운전 패턴 학습', 'Anomaly Score·Health Index 산출', '임계값 초기 설정'], ['AI 모델', '모델 학습 결과서']],
      ['STEP 5. 현장 적용·튜닝', ['실시간 추론 적용', '경보 기준·임계값 조정', '대시보드·알람 연계'], ['적용 결과서', '알람 기준표', 'Dashboard']],
      ['STEP 6. 성과검증·교육', ['KPI Before/After 비교', '사용자·관리자 교육', '운영 매뉴얼 전달'], ['성과검증 보고서', '사용자 매뉴얼', '구축완료보고서']],
    ].flatMap(([t, works, outs]) => [h2(t), stepTable(works, outs)]),

    h1('9. 성과지표(KPI) 예시'),
    p('KPI는 착수 시 수요기업과 협의하여 선정하고 Before/After로 검증한다.'),
    table([2000, 3638, 4000], ['분야', 'KPI', '측정 방법'], [
      ['설비관리', '비가동시간, 고장 대응시간', '도입 전후 동일 기간 정지 이력 비교'],
      ['AI 성능', '이상 탐지 리드타임, 오경보율', '실제 이상 발생 시점 대비 경보 시점, 경보 중 오경보 비율'],
      ['보전', '예방정비율, 돌발고장 건수', '정비 이력 중 계획정비 비율, 돌발고장 건수'],
      ['에너지', '설비별 전력사용량, 에너지 원단위', '생산량 대비 전력 사용량 비교'],
      ['데이터', '데이터 자동수집률, 누락률', '수집 대상 Tag 대비 정상 수집 비율'],
    ], { keyCol: true }),

    h1('10. 공급 형태'),
    table([2400, W - 2400], ['형태', '내용'], [
      ['구축형 (On-Premise)', '고객사 서버에 DataHub·AI Engine을 설치한다. 데이터 외부 반출이 어려운 현장에 적합하다.'],
      ['클라우드형', '클라우드에서 학습·분석하고 대시보드를 제공한다. 초기 구축 부담이 적다.'],
      ['하이브리드 (Edge)', '학습은 클라우드·서버에서, 추론은 현장 엣지 컨트롤러에서 수행해 네트워크 단절 시에도 현장에서 판단한다.'],
    ], { keyCol: true }),

    h1('11. DONG-IN ENSIS의 차별성'),
    table([2900, W - 2900], ['구분', '내용'], [
      ['OT 엔지니어링 기반 AI', 'PLC, VFD, 제어반을 직접 설계·제작해 온 역량으로 데이터가 발생하는 현장부터 접근한다. AI가 PoC에서 멈추지 않고 실제 설비에 적용된다.'],
      ['고장 데이터 없이 시작', '비지도 학습으로 정상 운전 패턴만으로 학습하므로 고장 이력이 부족한 현장에도 적용할 수 있다.'],
      ['데이터부터 AI까지 단일 공급', '데이터 수집, 정제, AI 학습, 현장 적용, 경보 연계를 한 회사가 수행한다.'],
      ['Cloud–Edge 하이브리드', '현장 엣지에서 판단하므로 네트워크가 끊겨도 경보와 보호 기능이 유지된다.'],
      ['무정지 보전과 연계', '자사 특허 「모듈러 인출식 VFD 판넬」과 결합하면, 이상 징후가 잡힌 모듈만 교체해 설비 전체를 멈추지 않을 수 있다.'],
      ['검증된 산업 현장 경험', '액화수소충전소, 조선소 시험설비, 친환경 선박 등 안전 기준이 높은 현장의 제어 경험을 바탕으로 한다.'],
    ], { keyCol: true }),

    h1('12. 보안 및 데이터 관리'),
    half(['설비 제어 권한은 현장 PLC가 유지 (AI는 설비를 직접 제어하지 않음)', 'TLS 암호화 기반 MQTT 전송', '클라우드 또는 고객사 서버 중 저장 위치 선택'],
      ['수집 데이터와 학습 결과의 소유권은 수요기업에 귀속', '접근 권한 계정별 관리', '네트워크·보안 구성은 현장 환경에 맞춰 설계']),

    h1('13. 유지보수 및 모델 관리'),
    half(['AI 모델 재학습 (운전 조건·설비 변경 시)', '경보 임계값 조정', '데이터 수집상태 점검'],
      ['대시보드·API 기술지원', '사용자 교육', '기능 개선 및 고도화']),

    h1('14. 공급 범위 제외'),
    p('별도 협의가 없는 경우 다음 항목은 AI 솔루션 공급 범위에서 제외하며, 필요시 별도 계약한다.'),
    half(['PLC, VFD, 센서, DAQ 등 하드웨어 구매', '제어반 제작', '현장 전기·통신 공사'],
      ['고객 생산설비 개조', '클라우드 사용료', '공급 기간 이후 AI 모델 장기 운영']),

    h1('15. 솔루션 핵심 문구'),
    new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: [W],
      rows: [new TableRow({ cantSplit: true, children: [new TableCell({
        width: { size: W, type: WidthType.DXA },
        borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.SINGLE, size: 24, color: RED } },
        shading: { fill: 'EAF1FA', type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        children: [
          para([run('DONG-IN ENSIS는 설비를 제어하는 현장에서 데이터를 만들고, AI가 정상 운전 패턴을 학습해 고장보다 먼저 이상을 알립니다.', { size: 22, bold: true, color: '111B2E' })], { after: 120, line: 340 }),
          para([run('From control data to predictive intelligence.', { size: 20, color: BLUE, italics: true })], { after: 0 }),
        ],
      })] })],
    }),
  ];

  return { cover, body };
});
