/* 예시 데이터 — 가상의 지원사업. 처음 열면 이 내용으로 화면이 채워진다(실제 사업·금액 아님). */
(function () {
  'use strict';

  function project(blank) {
    var s = blank();
    s.sample = true;
    s.사업 = { 사업명: '2026년 예시 성장사다리 지원사업', 과제명: '스마트 공정 모니터링 시스템 구축', 주관기관: '예시진흥원', 협약번호: 'EX-2026-0001',
      사업기간: { 시작: '2026-05-01', 종료: '2026-11-30' }, 사업비: { 정부지원금: 21000000, 자부담_현금: 9000000, 자부담_현물: 0, 총사업비: 30000000 } };
    s.기업 = { 기업명: '(주)예시기업', 대표자: '김예시', 사업자등록번호: '000-00-00000', 주소: '예시도 예시시 예시로 1', 담당자: '이담당', 연락처: '000-0000-0000' };
    s.청구 = { 청구일: '2026-11-30', 청구금액: 21000000, 계좌: { 은행: '예시은행', 계좌번호: '000-000000-00-000', 예금주: '(주)예시기업' } };
    s.과제목록 = [
      { id: 'T1', 이름: '설비 데이터 수집 장치 설치', 내용: '생산라인 3개 라인에 전력·진동 센서와 데이터 수집 게이트웨이 설치 (2026. 7. 14. ~ 7. 16.)\n라인별 수집 주기 1초, 게이트웨이에서 서버로 전송',
        지표: '설비 데이터 수집 라인 수', 목표: '3', 실적: '3', 단위: '개 라인' },
      { id: 'T2', 이름: '디지털트윈 모니터링 구축', 내용: '제어반·설비 3D 모델에 실시간 운전 데이터를 연동한 디지털트윈 화면 개발\n이상 알림(문자·메신저) 기능, 2026. 9. 2. 운영 시작',
        지표: '설비 비가동 시간 감소율', 목표: '10', 실적: '12', 단위: '%' },
    ];
    s.문장 = {
      추진목적: '생산 설비의 가동 상태를 실시간으로 파악하지 못해 고장 대응이 늦고 비가동 시간이 길었다. 설비 데이터를 자동 수집하고 디지털트윈 화면으로 이상을 즉시 알리는 체계를 갖춰 비가동 시간을 줄이는 것이 목적이다.',
      기대효과: '비가동 시간 감소로 생산량이 늘고 납기 준수율이 높아진다. 설비 이력 데이터가 쌓여 예방 정비 계획에 쓸 수 있다.',
      향후계획: '2027년 나머지 2개 라인으로 확대하고, 수집 데이터로 고장 예측 기능을 검토한다.',
    };
    s.결재 = { 작성: '이담당 과장', 검토: '박검토 이사', 승인: '김예시 대표이사' };
    s.증빙목록 = [
      { id: 'E01', 항목: '센서·게이트웨이 설치 사진', 관련과제: 'T1', 종류: '사진', 필수: true, 담당: '생산팀', 마감: '2026-11-20', 설명: '라인별 설치 위치와 명판이 보이게, 원본 사진 파일로' },
      { id: 'E02', 항목: '디지털트윈 실행 화면', 관련과제: 'T2', 종류: '화면 캡처', 필수: true, 담당: '개발팀', 마감: '2026-11-20', 설명: '실제 프로그램을 실행한 화면 캡처(운전·알람·문 열림 장면), 시연 영상 1편' },
      { id: 'E03', 항목: '센서 시험성적서', 관련과제: 'T1', 종류: '문서', 필수: true, 담당: '품질팀', 마감: '2026-11-20', 설명: '공급사 발행 PDF' },
      { id: 'E04', 항목: '비가동 시간 전후 비교 데이터', 관련과제: 'T2', 종류: '데이터', 필수: true, 담당: '생산팀', 마감: '2026-11-25', 설명: '사업 전 3개월과 후 1개월 비가동 시간 엑셀' },
    ];
    return s;
  }

  /* JPEG 에 EXIF 촬영일(DateTimeOriginal)을 넣는다 — 예시 사진에서 촬영일 읽기를 보여주기 위함 */
  function withExif(jpeg, when) {
    var date = when + '\u0000';                          // 'YYYY:MM:DD HH:MM:SS' + NUL = 20 bytes
    var tiff = new Uint8Array(8 + 18 + 18 + 20), v = new DataView(tiff.buffer);
    tiff.set([0x49, 0x49, 0x2A, 0x00]); v.setUint32(4, 8, true);
    v.setUint16(8, 1, true); v.setUint16(10, 0x8769, true); v.setUint16(12, 4, true); v.setUint32(14, 1, true); v.setUint32(18, 26, true); v.setUint32(22, 0, true);
    v.setUint16(26, 1, true); v.setUint16(28, 0x9003, true); v.setUint16(30, 2, true); v.setUint32(32, 20, true); v.setUint32(36, 44, true); v.setUint32(40, 0, true);
    for (var i = 0; i < 20; i++) tiff[44 + i] = date.charCodeAt(i);
    var head = [0x45, 0x78, 0x69, 0x66, 0, 0], len = 2 + head.length + tiff.length;
    var app1 = new Uint8Array(4 + head.length + tiff.length);
    app1.set([0xFF, 0xE1, len >> 8, len & 255]); app1.set(head, 4); app1.set(tiff, 4 + head.length);
    var out = new Uint8Array(jpeg.length + app1.length);
    out.set(jpeg.subarray(0, 2)); out.set(app1, 2); out.set(jpeg.subarray(2), 2 + app1.length);
    return out;
  }

  async function photo(text, color, when, name, eid) {
    var c = document.createElement('canvas');
    c.width = 1200; c.height = 900;
    var g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 1200, 900);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    for (var x = 0; x < 1200; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 900); g.stroke(); }
    g.fillStyle = '#fff'; g.font = '600 46px sans-serif';
    g.fillText('예시 사진 · ' + text, 70, 420);
    g.font = '32px sans-serif';
    g.fillText('도구 사용법 확인용 — 실제 증빙 아님', 70, 480);
    var blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.85); });
    var bytes = withExif(new Uint8Array(await blob.arrayBuffer()), when);
    return { eid: eid, file: new File([bytes], name, { type: 'image/jpeg' }) };
  }

  async function photos() {
    try {
      return [
        await photo('라인1 센서 설치', '#28598d', '2026:07:14 10:22:00', 'IMG_0714_1.jpg', 'E01'),
        await photo('라인2 센서 설치', '#2a6f78', '2026:07:15 14:05:00', 'IMG_0715_1.jpg', 'E01'),
        await photo('라인3 게이트웨이', '#3c4f96', '2026:07:16 09:40:00', 'IMG_0716_1.jpg', 'E01'),
        await photo('디지털트윈 실행 화면', '#15253f', '2026:09:02 16:30:00', 'twin_capture_0902.jpg', 'E02'),
      ];
    } catch (e) { return []; }
  }

  window.GrantSamples = { project: project, photos: photos };
})();
