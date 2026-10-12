/* 회사 연간 기록: 프로젝트와 상관없이 회사 단위로 정해진 때 해야 하는 기록(위험성평가·내부심사·경영검토·교정·교육 등)의
   기한을 시행일부터 15개월 동안 계산해 보여 주고, 계획표 엑셀·캘린더 파일(.ics)로 내보내며,
   공용 저장소의 회사기록 폴더에서 '양식번호_연월' 파일을 찾아 완료를 표시한다. */
(function () {
  'use strict';
  var A, el, $;
  var MONTHS = 15;
  var cfg = null;
  var found = null;      // 회사기록 폴더에서 찾은 파일 이름 목록(null이면 폴더 안 고름)
  var view = { owner: '', show: 'open' };

  // 규칙 종류: once(시행일+일수) · monthly · quarterly(3·6·9·12월) · half(6·12월) · yearly(월) · fromStart(시행일+개월)
  // 계측기 교정 기한(cal)은 명단의 최근 교정일·주기로 따로 만든다(calTasks)
  var RULES = [
    { code: 'QF-13', task: '매뉴얼·양식집 Rev.00 배포 기록, 이전 초안 사용중지 표시', kind: 'once', days: 7 },
    { code: 'SF-04', task: '안전보건관리담당자 선임(또는 위탁) 증빙·관리감독자 지정', kind: 'once', days: 14 },
    { code: 'SF-01', task: '최초 공정 위험성평가 (시행일부터 1개월 이내, 법정)', kind: 'once', days: 30, legal: true },
    { code: 'EF-01', task: '최초 환경측면 중요도 평가', kind: 'once', days: 30 },
    { code: 'MF-04', task: '최초 조직상황·이해관계자·위험과 기회 검토', kind: 'once', days: 30 },
    { code: 'MF-05', task: '최초 적용 법규·요구사항 등록과 준수평가', kind: 'once', days: 30 },
    { code: 'QF-11', task: '계측기·시험 설비 등록, 교정 유효기한 확인', kind: 'once', days: 30 },
    { code: 'QF-12', task: '제조·검사 인원 자격(업무범위) 승인 등록', kind: 'once', days: 30 },
    { code: 'QF-10', task: '현재 거래 공급자·외주업체 승인 목록 정리', kind: 'once', days: 30 },
    { code: 'MF-06', task: '근로자 협의 (분기 1회, 기존 회의 안건 가능)', kind: 'quarterly' },
    { code: 'QF-13-2', task: '백업 표본 복구 확인 (분기 1회)', kind: 'quarterly' },
    // 일용직을 쓴 달은 다음 달 15일까지 근로내용확인신고(고용보험·산재보험) — 양식 없이 신고 접수증을 회사기록에 둔다
    { code: '근로내용', task: '일용직 근로내용확인신고 (일용직 쓴 달만, 다음 달 15일까지)', kind: 'next15', owner: '경영관리', legal: true },
    // 6·12월 반기 점검 때 한자리에서: 이행점검·담당자/관리감독자 평가·교육·예산·목표 실적·법규 최신성
    { code: 'SF-08', task: '반기 안전보건 이행점검 (예산 집행·교육 실적 포함)', kind: 'half', legal: true },
    { code: 'SF-04', task: '안전보건관리담당자·관리감독자 반기 평가', kind: 'half', legal: true },
    { code: 'MF-03', task: '목표 반기 실적 (반기 점검 때)', kind: 'half' },
    { code: 'MF-05', task: '법규 최신성 반기 확인 (반기 점검 때)', kind: 'half', key: '최신성' },
    { code: 'SF-05', task: '안전보건교육 연간 계획 수립', kind: 'yearly', month: 1, key: '계획' },
    { code: 'SF-06', task: '건강진단 대상자 확정·수검 계획', kind: 'yearly', month: 1 },
    { code: 'SF-07', task: '안전보건 예산 편성', kind: 'yearly', month: 1, key: '편성' },
    { code: 'MF-03', task: '연간 목표·실행계획 수립', kind: 'yearly', month: 1 },
    { code: 'MF-06', task: '비상대응 훈련 (연 1회)', kind: 'fromStart', months: 2, key: '훈련' },
    { code: 'QF-10', task: '공급자·외주 연간 재평가', kind: 'yearly', month: 12 },
    { code: 'SF-09', task: '외주(수급인) 안전보건 역량 연간 평가', kind: 'yearly', month: 12 },
    { code: 'QF-11', task: '계측기 교정 현황 연간 확인', kind: 'yearly', month: 12 },
    { code: 'QF-12', task: '법정 의무교육: 직장 내 성희롱 예방·장애인 인식개선 (연 1회, 전 직원)', kind: 'yearly', month: 11, key: '의무교육', legal: true },
    { code: 'QF-12', task: '교육·자격 연간 실적 정리', kind: 'yearly', month: 12 },
    { code: 'QF-14', task: '고객 만족 의견 연간 정리', kind: 'yearly', month: 12 },
    { code: 'MF-01', task: '내부심사 (연 1회, 심사 전 완료)', kind: 'audit', before: 42, month: 12, day: 15 },
    { code: 'MF-02', task: '경영검토 (연 1회, 내부심사 후)', kind: 'audit', before: 21, month: 12, day: 31 },
    { code: 'SF-01', task: '정기 위험성평가 (연 1회)', kind: 'fromStart', months: 12, legal: true },
    { code: 'EF-01', task: '환경측면 연간 재평가', kind: 'fromStart', months: 12 },
    { code: 'MF-04', task: '조직상황·위험과 기회 연간 검토', kind: 'fromStart', months: 12 },
    { code: 'MF-05', task: '법규 준수평가 (연 1회)', kind: 'fromStart', months: 12, key: '준수평가' }
  ];

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function endOfMonth(y, m) { return new Date(y, m + 1, 0); }   // m: 0부터
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function dday(d) { return Math.round((d - today()) / 86400000); }

  function form(code) {
    return (A.FORMS.forms || {})[code] || (A.FORMS.common || []).filter(function (f) { return f.code === code; })[0] || null;
  }
  function owner(code) { var f = form(code); return f ? f.owner : ''; }
  function title(code) { var f = form(code); return f ? code + ' ' + f.title : code; }

  /** 시행일부터 15개월 동안의 할 일 목록 */
  function tasks() {
    var start = parse(cfg.start) || new Date(2026, 9, 1), end = new Date(start.getFullYear(), start.getMonth() + MONTHS, 0);
    var audit = parse(cfg.audit), out = [];
    function push(r, due, period) {
      if (due < start || due > end) return;
      out.push({ code: r.code, task: r.task, owner: r.owner || owner(r.code), due: due, period: period, legal: !!r.legal,
        file: r.code + '_' + due.getFullYear() + pad(due.getMonth() + 1) + (r.key ? '_' + r.key : ''), key: r.key || '', freq: freqText(r) });
    }
    RULES.forEach(function (r) {
      var y, m, d;
      if (r.kind === 'once') push(r, addDays(start, r.days), '');
      else if (r.kind === 'fromStart') { d = new Date(start); d.setMonth(d.getMonth() + r.months); d = addDays(d, -1); push(r, d, ''); }
      else {
        for (var k = 0; k < MONTHS + 1; k++) {
          y = start.getFullYear(); m = start.getMonth() + k;
          d = endOfMonth(y, m);
          var mm = d.getMonth() + 1;
          if (r.kind === 'monthly') push(r, d, d.getFullYear() + '.' + pad(mm));
          else if (r.kind === 'next15') push(r, new Date(d.getFullYear(), d.getMonth() + 1, 15), d.getFullYear() + '.' + pad(mm) + ' 사용분');
          else if (r.kind === 'quarterly' && mm % 3 === 0) push(r, d, d.getFullYear() + ' ' + (mm / 3) + '분기');
          else if (r.kind === 'half' && (mm === 6 || mm === 12)) push(r, d, d.getFullYear() + (mm === 6 ? ' 상반기' : ' 하반기'));
          else if (r.kind === 'yearly' && mm === r.month) push(r, d, String(d.getFullYear()));
          else if (r.kind === 'audit' && !audit && mm === r.month) push(r, new Date(d.getFullYear(), mm - 1, r.day), String(d.getFullYear()));
        }
        if (r.kind === 'audit' && audit) push(r, addDays(audit, -r.before), '사후심사 대비');
      }
    });
    calTasks().forEach(function (c) { push(c, c.due, c.period); });
    if (audit && audit >= start && audit <= end) {
      out.push({ code: '인증', task: 'ISO 사후심사 (인증기관)', owner: '품질 / 대표이사', due: audit, period: '', legal: false, file: '', freq: '인증기관 일정', audit: true });
    }
    out.sort(function (a, b) { return a.due - b.due || a.code.localeCompare(b.code); });
    out.forEach(function (t) { t.done = isDone(t); });
    return out;
  }
  function freqText(r) {
    return { once: '최초 1회', monthly: '매월', quarterly: '분기', half: '반기 (6·12월)', yearly: '연 1회 (' + r.month + '월)',
      fromStart: r.months === 12 ? '연 1회 (시행일 기준)' : '연 1회', audit: '연 1회 (심사 전)', next15: '매월 (다음 달 15일)', cal: '교정 주기 ' + r.months + '개월' }[r.kind] || '';
  }
  function isDone(t) {
    if (t.file && (cfg.done || {})[t.file]) return true;   // 화면에서 '완료' 누른 것
    if (!found || !t.file) return null;
    var ym = t.file.slice(t.code.length + 1, t.code.length + 7), y = ym.slice(0, 4), m = ym.slice(4);
    return found.some(function (n) {
      var u = n.toUpperCase();
      return u.indexOf(t.code.toUpperCase()) >= 0 && (u.indexOf(ym) >= 0 || u.indexOf(y + '-' + m) >= 0 || u.indexOf(y + '.' + m) >= 0) &&
        (!t.key || n.indexOf(t.key) >= 0);
    });
  }

  // ---------------------------------------------------------------- 명단 (한 번 입력)
  // 엑셀에서 복사한 줄(탭) 또는 쉼표로 나눈 줄. '#'으로 시작하는 줄과 빈 줄은 건너뛴다.
  var LISTS = [
    ['staff', '직원 명단', '성명, 고용구분(정규직/기간제/일용직), 업무(사무·설계·영업 / 제조·시험·시운전 등), 관리감독자면 O',
      '홍길동, 정규직, 제조, O\n김철수, 정규직, 설계\n이영희, 일용직, 제조'],
    ['suppliers', '공급자·외주 명단', '업체명, 구분(부품/외함/현장배선/기타), 공급 범위',
      '○○전기, 부품, 차단기·인버터\n○○판넬, 외함, 판넬 외함 제작\n○○전설, 현장배선, 현장 배선공사'],
    ['instruments', '계측기·시험설비 명단', '관리번호, 명칭·모델, 최근 교정일(YYYY-MM-DD), 주기(개월, 비우면 12), 구분(비우면 계측기)',
      'M-01, 절연저항계 (모델·SN), 2026-09-15, 12\nM-02, 접지저항계, 2026-03-10, 12\nT-01, 토크렌치, 2026-06-01, 12, 토크렌치·공구']
  ];
  function rows(key) {
    return String((cfg.lists || {})[key] || '').split(/\r?\n/).map(function (l) { return l.trim(); })
      .filter(function (l) { return l && l.charAt(0) !== '#'; })
      .map(function (l) { return l.split(/\t|\s*,\s*/).map(function (x) { return x.trim(); }); })
      .filter(function (c) { return c[0]; });
  }
  var OFFICE = /사무|설계|영업|경영|회계|인사|총무|구매|대표/;
  function staff() {
    return rows('staff').map(function (c) {
      var ty = c[1] || '', job = c[2] || '';
      return { name: c[0], type: /일용/.test(ty) ? '일용직' : /기간|비정규|계약/.test(ty) ? '기간제' : /외주/.test(ty) ? '외주' : '정규직',
        job: job, office: OFFICE.test(job), sup: /^(o|y|○|v|예|관리)/i.test(c[3] || '') };
    }).filter(function (x) { return x.type !== '외주'; });
  }
  function staffCount() {
    var st = staff();
    return { all: st.length, office: st.filter(function (x) { return x.office; }).length,
      field: st.filter(function (x) { return !x.office && x.type !== '일용직'; }).length,
      temp: st.filter(function (x) { return x.type !== '정규직'; }).length, daily: st.filter(function (x) { return x.type === '일용직'; }).length,
      regular: st.filter(function (x) { return x.type === '정규직'; }).length, sups: st.filter(function (x) { return x.sup; }) };
  }
  function suppliers() {
    return rows('suppliers').map(function (c) {
      var k = c[1] || '';
      return { name: c[0], kind: /외함/.test(k) ? '외함' : /배선|현장/.test(k) ? '현장배선' : /부품|자재/.test(k) ? '부품' : (k || '기타'), scope: c[2] || '' };
    });
  }
  function instruments() {
    return rows('instruments').map(function (c) {
      var last = parse(c[2]), mo = parseInt(c[3], 10) || 12, next = null;
      if (last) { next = new Date(last); next.setMonth(next.getMonth() + mo); next = addDays(next, -1); }
      return { no: c[0], name: c[1] || '', last: last, months: mo, next: next, kind: c[4] || '계측기' };
    });
  }
  /** 교정 기한: 차기일이 기간 안에 오는 때마다 할 일 하나 */
  function calTasks() {
    var out = [], start = parse(cfg.start) || new Date(2026, 9, 1), end = new Date(start.getFullYear(), start.getMonth() + MONTHS, 0);
    instruments().forEach(function (m) {
      if (!m.next) return;
      var d = new Date(m.next), n = 0;
      while (d < start && n++ < 50) { d.setMonth(d.getMonth() + m.months); }
      while (d <= end && n++ < 80) {
        out.push({ code: 'QF-11', task: m.no + ' ' + m.name + ' 교정 (차기일)', kind: 'cal', months: m.months, key: m.no, due: new Date(d), period: '' });
        d = new Date(d); d.setMonth(d.getMonth() + m.months);
      }
    });
    return out;
  }
  function utc(d) { return d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : ''; }
  function sheetName(t) { return String(t).replace(/[\[\]:*?\/\\]/g, '').slice(0, 31); }

  // ---------------------------------------------------------------- 내보내기
  // ---------------------------------------------------------------- 양식 채워 만들기
  // 회사 공통 담당자(매뉴얼 3장 조직표 기준, 화면에서 고칠 수 있음)
  var PROFILE = [['ceo', '대표이사', '백민기 대표이사'], ['quality', '품질 (관리책임자)', '문선기 차장'], ['tech', '기술팀 총괄', '하희천 이사'],
    ['safety', '안전 담당', '왕리홍 대리'], ['env', '환경 담당', '성문기 과장'], ['production', '생산관리 (배선 숙련 확인)', ''], ['test', '시험·시운전 책임', ''], ['admin', '경영관리', ''],
    ['sales', '영업관리', ''], ['auditor', '내부심사원 (자기 업무 제외)', ''], ['nas', '공용 저장소 경로 (NAS)', ''], ['backup', '별도 백업 위치', ''],
    ['staff', '인원 (정규직 / 비정규직)', '정규직 20명 / 제조 비정규직 5명']];
  function who(role) { return A.P.clean(cfg.profile[role]) || ''; }
  function staffText() {
    var n = staffCount();
    return n.all ? '총 ' + n.all + '명 (정규직 ' + n.regular + ' · 기간제·일용 ' + n.temp + ')' : (cfg.profile.staff || '');
  }
  /** 양식 담당 글('품질 / 경영관리', '왕리홍 대리 / 현장 근로자')의 첫 담당을 이름으로 바꾼다 */
  function person(ownerText, nth) {
    var first = (String(ownerText || '').split('/')[nth || 0] || '').trim();
    var map = [[/대표/, 'ceo'], [/품질/, 'quality'], [/기술/, 'tech'], [/안전/, 'safety'], [/환경/, 'env'], [/생산관리/, 'production'], [/시험|시운전/, 'test'], [/경영관리/, 'admin'], [/영업/, 'sales']];
    for (var i = 0; i < map.length; i++) if (map[i][0].test(first) && who(map[i][1])) return who(map[i][1]);
    if (/대리|과장|차장|이사/.test(first)) return first.split('·')[0].trim();
    return first;
  }
  function ymd(d) { return iso(d); }
  function halfOf(d) { return d.getMonth() < 6 ? '상반기' : '하반기'; }
  function yearOf(t) { return String(t.due.getFullYear()); }

  // 직접 판단해 적는 칸의 작성 예시(회사 공정 기준). rows: 행 순서, each: 모든 행, one: 빈 표 첫 줄
  var FORM_EX = {
    'SF-01': { rows: [
      { 3: '지게차 유자격자 운전, 통로 구분', 8: '유도자 배치·속도 제한 표지', 9: '생산관리 / 11월' },
      { 3: '정격하중 확인, 슬링 사용 전 점검', 8: '인양 체크리스트, 하부 출입 금지', 9: '생산관리 / 11월' },
      { 3: '보안경 착용, 회전부 장갑 금지 교육', 8: '칩 비산 방지 커버', 9: '생산관리 / 12월' },
      { 3: '공구 정리, 중량 부품 2인 작업', 8: '취부 작업대 높이 조정', 9: '생산관리 / 12월' },
      { 3: '정전 상태 작업, 탈피기 사용', 8: '커터 보관함, 베임 방지 장갑', 9: '생산관리 / 11월' },
      { 3: '절단기 방호커버', 8: '해당 없으면 \'해당없음\'으로', 9: '—' },
      { 3: '환기, 가연물 제거', 8: '작업 전 소화기 위치 확인', 9: '—' },
      { 3: 'SF-02 통전 절차, 감시자 배치', 8: '시험구역 펜스·표지 설치', 9: '안전 담당 / 11월' },
      { 3: '시험 중 접근 금지, 방전 확인', 8: '시험 인터록 검토', 9: '시험 담당 / 12월' },
      { 3: '고객 작업허가, LOTO', 8: 'SF-03 사전 협의 철저', 9: '시운전 담당 / 상시' },
      { 3: '운행 전 점검, 장거리 휴식', 8: '2시간마다 휴식 규정', 9: '경영관리 / 11월' },
      { 3: '모니터 높이 조정, 휴식', 8: '스트레칭 안내 게시', 9: '경영관리 / 12월' },
      { 3: '소화기 비치·월 점검, 비상구 확보', 8: '비상훈련 연 1회 (MF-06)', 9: '안전 담당 / 11월' }] },
    'EF-01': { each: { 10: '분리배출·폐기물 위탁처리 / 환경 담당', 11: '위탁처리 확인서 / 연 1회 재평가' } },
    'SF-04': { half: true },
    'SF-05': { each: { 4: '3월·9월', 5: '3/15 · 3시간', 6: '20 / 20', 7: '없음', 8: 'QF-12 교육일지' } },
    'SF-07': { each: { 2: '세부 품목·수량', 6: '집행일 · 영수증 번호', 7: '—', 8: '지급대장 등' } },
    'SF-08': { each: { 3: '해당 양식·게시물 확인', 4: '적합', 5: '없음', 6: '—', 7: '—', 8: '—' } },
    'SF-09': { each: { 2: '서류·면담 확인', 5: '생산관리', 6: '적합', 7: '—', 8: '—' } },
    'MF-01': { each: { 2: '프로젝트 2건 표본', 3: '확인한 기록 번호 기재', 4: '적합', 5: '—', 6: '—', 7: '—' } },
    'MF-02': { each: { 2: '관련 양식 결과 요약', 3: '유지 / 개선 필요', 4: '—', 5: '—', 6: '—' } },
    'MF-03': { rows: [
      { 3: '95% 이상 / 12월', 4: 'FAT 전 자주검사 강화', 5: '품질' }, { 3: '100% / 12월', 4: '일정 주간 점검', 5: '생산관리' },
      { 3: 'AS 2건 이하', 4: 'SAT 후 만족도 확인', 5: '영업관리' }, { 3: '고위험(6~9) 개선 100%', 4: 'SF-01 대책 이행', 5: '안전 담당' },
      { 3: '이수율 100%', 4: 'SF-05 계획대로 교육', 5: '안전 담당' }, { 3: '분리배출 100%', 4: 'EF-01 관리방법 이행', 5: '환경 담당' }] },
    'MF-04': { each: { 3: '상 / 중 / 하 중 선택', 4: '대응 방안·기회', 5: '담당 / 기한', 6: '—', 7: '—' } },
    'MF-05': { each: { 3: '적용', 4: '연 1회', 6: '확인일 기재', 7: '준수', 8: '—' } },
    'MF-06': { one: { 1: '조립장 환기 불량 의견', 2: '환풍기 추가 설치', 3: '생산관리', 4: '11/30', 5: '설치 사진', 6: '다음 협의 때 공유' } },
    'QF-10': { one: { 1: '○○전기', 2: '외주', 3: '현장 배선', 8: 'SF-09 적합', 10: '납기 준수, 품질 이상 없음', 11: '다음 해 12월' } },
    'QF-11': { one: { 1: 'M-01', 2: '계측기', 3: '절연저항계 (모델·SN)', 4: '시험실', 5: 'DC 500V ±5%', 6: '1년 / 제조사 권장', 7: '2026-09-15', 8: '2027-09-14', 9: '합격', 10: '사용', 11: '교정성적서' } },
    'QF-12': { one: { 1: '○○○', 2: '정규직', 3: '배선', 4: '서명', 5: '적합', 6: '적합', 7: '적합', 9: '배선·자주검사', 10: '품질 10/20', 11: '1년 후' } },
    'QF-13-2': { one: { 1: '월말', 2: '표본 복구', 3: '프로젝트 폴더 1개', 4: '성공', 5: '복구 화면 캡처 경로', 6: '—', 7: '경영관리' } },
    'QF-14': { one: { 1: 'SAT 종료일', 2: '고객사', 3: '프로젝트 번호', 4: 'SAT 종료 의견', 5: '설문·메일', 6: '납기·품질 만족', 7: '만족', 8: '—', 9: '—', 10: '—' } },
    'SF-06': { one: { 1: '○○○ (사번)', 2: '제조', 3: '일반건강진단', 4: '1년 1회', 5: '3월', 6: '—', 7: '—', 8: '—' } }
  };

  /** 할 일 하나의 양식: 정의 복사본 + 머리 값 + 작성 예시 + 결재란 성명 */
  function formFor(t) {
    var src = (A.FORMS.company || {})[t.code];
    if (!src) return null;
    var spec = JSON.parse(JSON.stringify(src));
    var y = yearOf(t), due = ymd(t.due), plan = due + ' (예정)', start = cfg.start;
    var v = {
      '관리연도': y, '연도': y, '대상연도': y, '평가연도': y,
      '평가일': plan, '검토일': plan, '확인일': plan, '점검일': plan, '계획일': plan
    };
    var c = t.code;
    if (c === 'SF-01') Object.assign(v, { '구분': t.period === '' && /최초/.test(t.task) ? '최초' : '정기(연 1회)', '공정·범위': '제어반 설계·조립·배선·시험·시운전 전 공정 (본사 공장·고객 현장)', '평가자': who('safety') });
    if (c === 'EF-01') Object.assign(v, { '평가 구분': /최초/.test(t.task) ? '최초' : '정기(연 1회)', '평가자': who('env'), '검토자': who('quality') });
    if (c === 'SF-04') Object.assign(v, { '선임자 / 소속·직책': who('safety') ? who('safety') + ' / 안전 담당' : '' });
    if (c === 'SF-05') Object.assign(v, { '작성자': who('safety') });
    if (c === 'SF-06') Object.assign(v, { '작성자': who('admin') });
    if (c === 'SF-07') Object.assign(v, { '승인자·승인일': who('ceo') ? who('ceo') + ' / ' : '' });
    if (c === 'SF-08') Object.assign(v, { '점검 기간': y + ' ' + halfOf(t.due) + (halfOf(t.due) === '상반기' ? ' (1/1~6/30)' : ' (7/1~12/31)'), '점검자': who('safety') });
    if (c === 'SF-09') Object.assign(v, { '평가자': who('production') });
    if (c === 'MF-01') Object.assign(v, { '심사 기간': plan, '범위·기준 (규격 판본·문서·고객요구)': 'ISO 9001·14001·45001 전 범위 / DI-IMS-M-01·F-01 Rev.00 / 고객 요구(현대터보기계·아트라스콥코 등)', '부서별 심사원·일정': who('auditor') });
    if (c === 'MF-02') Object.assign(v, { '대상 기간': start + ' ~ ' + due, '참석자': ['ceo', 'quality', 'tech', 'safety', 'env'].map(who).filter(Boolean).join(', ') });
    if (c === 'MF-03') Object.assign(v, { '승인자·일자': who('ceo') ? who('ceo') + ' / ' : '' });
    if (c === 'MF-04') Object.assign(v, { '검토자': [who('ceo'), who('quality')].filter(Boolean).join(', '), '적용 범위': '제어반 설계·제조·시운전 (본사 공장·고객 현장)' });
    if (c === 'MF-05') Object.assign(v, { '평가자 / 검토자': [who('safety'), who('env')].filter(Boolean).join('·') + (who('quality') ? ' / ' + who('quality') : ''), '대상 사업장·작업': '본사 공장(설계·조립·시험), 고객 현장 시운전' });
    if (c === 'MF-06') Object.assign(v, { '구분': t.key === '훈련' ? '비상훈련' : '분기 협의', '일자·장소': plan + ' · 회의실', '진행자': who('safety'), '참석 인원 (비정규직 포함)': staffText() });
    if (c === 'QF-10') Object.assign(v, { '평가 기간': y + '.01 ~ ' + y + '.12', '평가자': who('production'), '승인자·일자': who('quality') ? who('quality') + ' / ' : '' });
    if (c === 'QF-11') Object.assign(v, { '관리 책임자 (계측기: 품질 / 설비: 생산관리)': [who('quality'), who('production')].filter(Boolean).join(' / ') });
    if (c === 'QF-12') Object.assign(v, { '교육/평가명': t.task });
    if (c === 'QF-13') Object.assign(v, { '문서관리 책임자': who('quality'), '접근권한 관리자': who('admin'), '공용 저장소 전체 경로': cfg.profile.nas || '', '별도 백업 경로·매체': cfg.profile.backup || '', '백업 담당·주기': (who('admin') ? who('admin') + ' / ' : '') + '매일 자동 백업·실패 알림 · 분기 1회 표본 복구 (QF-13-2)' });
    if (c === 'QF-13-2') Object.assign(v, { '백업 실행 담당': who('admin'), '원본 경로': cfg.profile.nas || '', '백업 위치 (물리적 분리)': cfg.profile.backup || '' });
    if (c === 'QF-14') Object.assign(v, { '담당자': who('sales') });
    // 명단(한 번 입력)으로 채우는 행·칸
    var cnt = staffCount(), st = staff(), sp = suppliers(), ins = instruments(), listed = false;
    if (c === 'SF-04' && cnt.sups.length) v['관리감독자 (성명 / 지휘하는 작업) — 지정일'] = cnt.sups.map(function (x) { return x.name + ' / ' + (x.job || '작업'); }).join(', ') + ' — 지정일: ';
    if (c === 'SF-05' && cnt.all) {
      v['대상 인원: 사무직 ( )명 · 제조·시험·시운전 ( )명 · 일용·기간제 ( )명'] = '사무직 ' + cnt.office + '명 · 제조·시험·시운전 ' + cnt.field + '명 · 일용·기간제 ' + cnt.temp + '명 (총 ' + cnt.all + '명)';
      spec.rows = spec.rows.map(function (r) {
        var n = /정기교육 \(사무/.test(r[0]) ? cnt.office : /정기교육 \(제조/.test(r[0]) ? cnt.field : /일용·1주 이하/.test(r[0]) && /채용/.test(r[0]) ? cnt.daily
          : /관리감독자 정기/.test(r[0]) ? cnt.sups.length : /성희롱|장애인/.test(r[0]) ? cnt.all : /보수교육/.test(r[0]) ? 1 : null;
        var x = r.slice(); while (x.length < 5) x.push(''); if (n !== null) x[5] = n + ' / '; return x;
      });
    }
    if (c === 'SF-06' && st.length) { listed = true; spec.rows = st.map(function (x) { return [x.name, x.office ? '사무직' : '제조·시험·시운전', '일반(국가검진 갈음)', x.office ? '2년' : '1년']; }); }
    if (c === 'QF-12' && st.length) { listed = true; spec.rows = st.map(function (x) { return [x.name, x.type, x.job]; }); }
    if (c === 'QF-12' && t.key === '의무교육') Object.assign(v, { '구분': '교육', '법정 교육 근거·이수조건': '남녀고용평등법 제13조(성희롱 예방) · 장애인고용촉진법 제5조의2(인식개선) — 연 1회, 전 직원', '교육 내용 요약': '직장 내 성희롱 예방(법령·사례·신고 절차) / 장애인 인식개선' });
    if (c === 'QF-10' && sp.length) { listed = true; spec.rows = sp.map(function (x) { return [x.name, x.kind, x.scope]; }); }
    if (c === 'QF-11' && ins.length) { listed = true; spec.rows = ins.map(function (x) { return [x.no, x.kind, x.name, '', '', x.months + '개월', utc(x.last), utc(x.next)]; }); }
    // 문서관리: 매뉴얼·양식집·WI-01 승인·시행 사실은 그대로 채운다
    if (c === 'QF-13' && spec.rows) spec.rows = spec.rows.map(function (r) {
      var x = r.slice(); x[3] = (who('ceo') || '대표이사') + ' ' + start.replace(/-/g, '.'); x[4] = start.replace(/-/g, '.'); x[5] = '전 부서 (공용 저장소 읽기전용)';
      x[6] = cfg.profile.nas || ''; x[7] = '문서 이력 영구'; return x;
    });
    // 작성 예시
    var ex = FORM_EX[c], rowsEx = null;
    if (ex) {
      if (!spec.rows || !spec.rows.length) { spec.rows = [[]]; rowsEx = [ex.one || {}]; }
      else if (listed && ex.one) rowsEx = [ex.one];
      if (c === 'QF-12' && t.key === '의무교육') rowsEx = [{ 4: '서명' }];   // 교육만: 평가 3칸은 비워 둔다
      else if (ex.rows) rowsEx = ex.rows;
      else if (ex.each) rowsEx = spec.rows.map(function () { return ex.each; });
      else if (ex.half) {
        var h = halfOf(t.due) === '상반기';
        rowsEx = spec.rows.map(function () { var o = {}; o[h ? 3 : 5] = '실적·증거 기록 번호'; o[h ? 4 : 6] = '적합'; o[7] = '없음'; o[8] = who('ceo') ? who('ceo') + ' 확인' : '대표 확인'; return o; });
      }
    }
    if (rowsEx) { spec.example = { rows: rowsEx }; spec.notes = (spec.notes || []).concat(["회색 기울임 글은 작성 예시입니다. 그대로 쓸 내용이면 글자색을 검정으로 바꾸고 기울임을 풀면 기록이 됩니다. 아니면 덮어쓰거나 지웁니다. '(예정)' 날짜는 실제 한 날로 고칩니다."]); }
    // 작성·검토·승인이 같은 사람이 되지 않게: 작성이 대표면 두 번째 담당이 작성, 작성이 품질이면 기술팀 총괄이 검토
    var writer = person(src.owner);
    if (writer && writer === who('ceo') && String(src.owner).indexOf('/') > 0) writer = person(src.owner, 1);
    var reviewer = writer && writer === who('quality') ? who('tech') : who('quality');
    var sign = { '작성': writer, '검토': reviewer, '승인': who('ceo') };
    if (spec.sign && spec.sign.length) spec.sign.forEach(function (lab) {
      if (/승인|대표/.test(lab)) sign[lab] = who('ceo'); else if (/검토/.test(lab)) sign[lab] = reviewer;
      else if (/확인/.test(lab)) sign[lab] = c === 'SF-04' ? who('safety') : reviewer; else if (/작성/.test(lab)) sign[lab] = writer;
    });
    var name = (t.file || t.code) + '_' + (src.title || '').replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, '').slice(0, 20) + '.xlsx';
    var specs = [spec], valuesList = [v];
    var outs = sp.filter(function (x) { return x.kind !== '부품'; });
    if (c === 'SF-09' && outs.length) {
      specs = []; valuesList = [];
      outs.forEach(function (x) {
        var s2 = JSON.parse(JSON.stringify(spec)); s2.sheet = sheetName('SF-09 ' + x.name);
        specs.push(s2);
        valuesList.push(Object.assign({}, v, { '업체명': x.name, '작업 내용 (외함 제작·현장 배선·기타)': x.kind + (x.scope ? ' — ' + x.scope : ''),
          '작업 장소 (당사·고객 현장)': x.kind === '현장배선' ? '고객 현장' : x.kind === '외함' ? '업체 공장 (당사 입고)' : '', '평가일': plan }));
      });
    }
    return { spec: spec, specs: specs, values: v, valuesList: valuesList, sign: sign, name: name };
  }

  function buildBuffer(t) {
    var f = formFor(t);
    if (!f) return Promise.resolve(null);
    var wb = A.E.buildWorkbook(window.ExcelJS, f.specs, { valuesList: f.valuesList, rev: A.FORMS.rev, date: A.FORMS.date, effective: A.FORMS.effective, logo: window.ISO_LOGO, signNames: f.sign });
    return wb.xlsx.writeBuffer().then(function (buf) { return { name: f.name, buf: buf }; });
  }
  function makeOne(t) {
    if (!window.ExcelJS) { setStatus('엑셀 라이브러리를 불러오지 못했습니다.', 'bad'); return; }
    buildBuffer(t).then(function (r) {
      if (!r) { setStatus(t.code + '는 양식이 없습니다.', 'bad'); return; }
      return A.saveFile(r.name, new Blob([r.buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).then(function () {
        setStatus(r.name + ' 저장 — 회사기록 폴더에 이 이름 그대로 두면 완료 확인이 자동으로 됩니다.', 'ok');
      });
    }).catch(function (e) { setStatus(A.saveErrorText(e, t.code + ' 양식'), 'bad'); });
  }
  function makeSoon() {
    if (!window.ExcelJS || !window.JSZip) { setStatus('엑셀·압축 라이브러리를 불러오지 못했습니다.', 'bad'); return; }
    var list = tasks().filter(function (t) { return !t.audit && t.done !== true && dday(t.due) <= 30; });
    if (!list.length) { setStatus('30일 안에 할 일이 없습니다.', 'ok'); return; }
    var zip = new window.JSZip(), n = 0;
    list.reduce(function (ch, t) { return ch.then(function () { return buildBuffer(t).then(function (r) { if (r) { zip.file(r.name, r.buf); n++; } }); }); }, Promise.resolve())
      .then(function () { return zip.generateAsync({ type: 'blob' }); })
      .then(function (blob) {
        var name = '회사기록_양식_' + iso(today()).replace(/-/g, '') + '_30일.zip';
        return A.saveFile(name, blob).then(function () { setStatus(name + ' 저장 — 양식 ' + n + '개 (기한 지남·30일 이내)', 'ok'); });
      }).catch(function (e) { setStatus(A.saveErrorText(e, '양식 묶음'), 'bad'); });
  }

  function setStatus(t, kind) { var s = $('anStatus'); if (!s) return; s.textContent = t; s.className = 'status' + (kind ? ' ' + kind : ''); }

  function exportXlsx() {
    if (!window.ExcelJS) { setStatus('엑셀 라이브러리를 불러오지 못했습니다.', 'bad'); return; }
    var list = tasks(), wb = new window.ExcelJS.Workbook(), ws = wb.addWorksheet('연간 기록 계획');
    ws.addRow(['동인엔시스 회사 연간 기록 계획 (통합경영 DI-IMS-M-01 Rev.00, 시행 ' + cfg.start + ')']);
    ws.addRow(['기한이 지난 미완료는 붉게 표시됩니다. 기록 파일은 공용 저장소 회사기록 폴더에 \'저장 파일명\'으로 시작하게 저장합니다.']);
    ws.addRow([]);
    var head = ['기한', '양식', '할 일', '담당', '주기', '기간', '저장 파일명 (앞부분)', '상태', '완료일', '확인자'];
    ws.addRow(head);
    list.forEach(function (t) {
      ws.addRow([t.due, t.code, t.task + (t.legal ? ' ★법정' : ''), t.owner, t.freq, t.period, t.file, t.done ? '완료' : t.audit ? '' : '미완료', '', '']);
    });
    ws.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF1857A5' } };
    ws.getRow(2).font = { size: 9, color: { argb: 'FF55657A' } };
    var hr = ws.getRow(4);
    hr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hr.eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1857A5' } }; });
    [12, 9, 46, 22, 16, 13, 22, 9, 11, 11].forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
    ws.getColumn(1).numFmt = 'yyyy-mm-dd';
    var last = 4 + list.length;
    for (var r = 5; r <= last; r++) {
      ws.getCell('H' + r).dataValidation = { type: 'list', allowBlank: true, formulae: ['"미완료,완료,해당없음"'] };
      ws.getRow(r).alignment = { vertical: 'middle', wrapText: true };
    }
    ws.addConditionalFormatting({ ref: 'A5:J' + last, rules: [{ type: 'expression', priority: 1,
      formulae: ['AND($H5="미완료",$A5<TODAY())'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF8D7DA' } } } }] });
    ws.views = [{ state: 'frozen', ySplit: 4 }];
    ws.autoFilter = { from: 'A4', to: 'J4' };
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    var name = '회사_연간기록계획_' + cfg.start.replace(/-/g, '') + '.xlsx';
    wb.xlsx.writeBuffer().then(function (buf) {
      return A.saveFile(name, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    }).then(function () { setStatus(name + ' 저장', 'ok'); }, function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }

  function icsText() {
    function esc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
    function fold(line) {
      var out = [], cur = '', bytes = 0;
      Array.from(line).forEach(function (ch) {
        var b = new TextEncoder().encode(ch).length;
        if (bytes + b > 73) { out.push(cur); cur = ' '; bytes = 1; }
        cur += ch; bytes += b;
      });
      out.push(cur);
      return out.join('\r\n');
    }
    function ymd(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DONG-IN ENSIS//ISO Record Tools//KO', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:동인엔시스 ISO 연간 기록'];
    tasks().forEach(function (t, i) {
      var next = addDays(t.due, 1);
      lines.push('BEGIN:VEVENT', 'UID:dongin-iso-' + ymd(t.due) + '-' + t.code + '-' + i + '@donginensis.com', 'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ymd(t.due), 'DTEND;VALUE=DATE:' + ymd(next),
        fold('SUMMARY:' + esc('[ISO] ' + (t.code !== '인증' ? t.code + ' ' : '') + t.task + (t.owner ? ' — ' + t.owner.split('/')[0].trim() : ''))),
        fold('DESCRIPTION:' + esc(title(t.code) + (t.file ? '\n저장 파일명: ' + t.file + '_….xlsx (회사기록 폴더)' : '') + '\n주기: ' + t.freq)),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P7D', fold('DESCRIPTION:' + esc('[ISO] 7일 뒤 기한: ' + t.task)), 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
  function exportIcs() {
    var name = '동인엔시스_ISO_연간기록_' + cfg.start.replace(/-/g, '') + '.ics';
    A.saveFile(name, new Blob([icsText()], { type: 'text/calendar' })).then(function () {
      setStatus(name + ' 저장 — 구글 캘린더(설정 → 가져오기)나 아웃룩에서 열면 일정과 7일 전 알림이 들어갑니다.', 'ok');
    }, function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }

  /** 일용직 투입 당일 채용 시 교육 + 작업 범위 기록(QF-12) */
  function dailySpec(date, names) {
    var src = (A.FORMS.company || {})['QF-12'];
    var spec = JSON.parse(JSON.stringify(src));
    var boss = who('production') || '생산관리 책임자';
    spec.rows = names.map(function (n) { return [n, '일용직', '제조 (조립·배선 보조)', '', '', '', '', '', '숙련자(' + boss + ') 지도 아래 작업 · 독립작업·통전 작업 금지']; });
    spec.example = { rows: [{ 4: '서명' }] };
    var v = { '교육/평가명': '채용 시 안전보건교육 (일용직, 투입 전)', '구분': '교육', '일자·시간': date + ' 작업 전 · 1시간',
      '장소': '본사 공장', '강사·평가자': boss + (who('safety') ? ' / ' + who('safety') : ''),
      '법정 교육 근거·이수조건': '산업안전보건법 제29조, 시행규칙 별표4 — 일용근로자 채용 시 1시간 이상 (투입 전)',
      '교육 내용 요약': '작업장 위험요인(감전·협착·중량물·베임) · 보호구 착용 · 통전 시험 구역 출입 금지·LOTO 표지 · 정리정돈 · 사고 시 보고·비상연락 · 작업 중지 권리' };
    var sign = { '작성': boss, '검토': who('safety') || who('quality'), '승인': who('ceo') };
    return { spec: spec, values: v, sign: sign };
  }
  function makeDaily(date, text) {
    var names = String(text || '').split(/\r?\n|,/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!date || !names.length) { setStatus('투입일과 일용직 성명을 한 명 이상 적어 주세요.', 'bad'); return; }
    var f = dailySpec(date, names);
    var wb = A.E.buildWorkbook(window.ExcelJS, [f.spec], { values: f.values, rev: A.FORMS.rev, date: A.FORMS.date, effective: A.FORMS.effective, logo: window.ISO_LOGO, signNames: f.sign });
    var name = 'QF-12_' + date.replace(/-/g, '') + '_일용직투입교육_' + names.length + '명.xlsx';
    wb.xlsx.writeBuffer().then(function (buf) {
      return A.saveFile(name, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    }).then(function () { setStatus(name + ' 저장 — 출력해 교육 후 서명받고 회사기록에 둡니다. 다음 달 15일까지 근로내용확인신고 대상입니다.', 'ok'); },
      function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }

  // ---------------------------------------------------------------- 회사 설정 파일 (담당자·명단·기준 날짜)
  // 한 사람이 입력해 공용 저장소(접근권한 관리 폴더)에 두면 다른 PC에서도 불러와 같은 값으로 양식을 만든다.
  function exportCfg() {
    var data = { type: 'dongin-iso-company', version: 1, saved: iso(today()), start: cfg.start, audit: cfg.audit, profile: cfg.profile, lists: cfg.lists, done: cfg.done || {} };
    var name = '00_회사설정_ISO기록도구_' + iso(today()).replace(/-/g, '') + '.json';
    A.saveFile(name, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })).then(function () {
      setStatus(name + ' 저장 — 직원 명단이 들어 있으니 접근권한이 관리되는 회사 폴더에만 둡니다.', 'ok');
    }, function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }
  function importCfg(file) {
    if (!file) return;
    file.text().then(function (txt) {
      var d = JSON.parse(txt);
      if (!d || d.type !== 'dongin-iso-company') throw new Error('회사 설정 파일이 아닙니다');
      if (d.start) cfg.start = d.start;
      if (d.audit !== undefined) cfg.audit = d.audit;
      Object.keys(d.profile || {}).forEach(function (k) { cfg.profile[k] = String(d.profile[k] || ''); });
      Object.keys(d.lists || {}).forEach(function (k) { cfg.lists[k] = String(d.lists[k] || ''); });
      cfg.done = Object.assign(cfg.done || {}, d.done || {});
      save(); render();
      setStatus(file.name + ' 불러옴 — 담당자·명단·기준 날짜를 적용했습니다.', 'ok');
    }).catch(function (e) { setStatus('불러오지 못했습니다: ' + (e && e.message || e), 'bad'); });
  }

  // ---------------------------------------------------------------- 화면
  function save() { try { localStorage.setItem('iso-annual', JSON.stringify(cfg)); } catch (e) { /* 무시 */ } }

  function render() {
    var root = $('view-annual');
    A.clear(root);
    root.appendChild(el('header', { cls: 'top' }, [
      el('p', { cls: 'eyebrow', text: '회사 단위 기록 · 법정 안전보건 · 내부심사 · 경영검토' }),
      el('h1', { text: '회사 연간 기록' }),
      el('p', { cls: 'lead', text: '프로젝트와 상관없이 정해진 때 해야 하는 기록의 기한을 시행일부터 15개월 동안 보여 줍니다. 캘린더 파일로 내보내면 기한 7일 전에 알림이 옵니다. 회사기록 폴더를 고르면 저장된 파일로 완료를 확인합니다.' })
    ]));
    var layout = el('div', { cls: 'layout' }), steps = el('div', { cls: 'steps' });
    layout.appendChild(steps);
    root.appendChild(layout);

    function dateField(id, label, key) {
      return el('div', { cls: 'field' }, [el('label', { for: id, text: label }),
        el('input', { type: 'date', id: id, value: cfg[key] || '', onchange: function (e) { cfg[key] = e.target.value; save(); refresh(); } })]);
    }
    var drop = el('div', { cls: 'drop', id: 'anDrop' }, [
      el('input', { type: 'file', id: 'anDir', webkitdirectory: '', directory: '', multiple: '', onchange: function (e) {
        found = Array.prototype.map.call(e.target.files, function (f) { return f.name; });
        e.target.value = '';
        refresh();
        setStatus('회사기록 폴더에서 파일 ' + found.length + '개를 확인했습니다.', 'ok');
      } }),
      el('label', { for: 'anDir' }, [el('b', { text: '회사기록 폴더 고르기' }), ' (완료 확인)']),
      found ? el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '폴더 확인 지우기', onclick: function () { found = null; refresh(); } }) : null
    ]);
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '1' }), '기준 날짜']),
      el('div', { cls: 'grid' }, [dateField('an-start', '매뉴얼 시행일', 'start'), dateField('an-audit', 'ISO 사후심사 예정일 (인증기관 통보 후)', 'audit')]),
      el('p', { cls: 'help', text: '사후심사 예정일을 넣으면 내부심사는 6주 전, 경영검토는 3주 전으로 기한이 잡힙니다. 비우면 12월 중순·말로 잡습니다.' }),
      drop,
      el('p', { cls: 'help', text: '완료 확인 규칙: 회사기록 폴더에 \'양식번호_연월\'로 시작하는 이름으로 저장합니다. 예) SF-08_202612_반기점검.xlsx, MF-06_202611_근로자협의.pdf. 같은 이름이 있으면 완료로 봅니다.' })
    ]));
    var prof = el('div', { cls: 'grid' });
    PROFILE.forEach(function (f) {
      var id = 'an-p-' + f[0];
      prof.appendChild(el('div', { cls: 'field' }, [el('label', { for: id, text: f[1] }),
        el('input', { type: 'text', id: id, value: cfg.profile[f[0]] || '', oninput: function (e) { cfg.profile[f[0]] = e.target.value; save(); } })]));
    });
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '2' }), '회사 공통 담당자 (한 번 입력)']),
      el('p', { cls: 'help', text: '양식을 받을 때 담당자·평가자·결재란(작성·검토·승인), 저장 경로가 이 값으로 채워집니다. 기본값은 매뉴얼 조직표의 이름입니다.' }),
      prof
    ]));
    var listBox = el('div', { cls: 'an-lists' });
    LISTS.forEach(function (L) {
      var id = 'an-l-' + L[0], info = el('p', { cls: 'help an-lcount', id: id + '-n' });
      listBox.appendChild(el('div', { cls: 'field an-list' }, [
        el('label', { for: id, text: L[1] }),
        el('p', { cls: 'help', text: '한 줄에 하나: ' + L[2] }),
        el('textarea', { id: id, rows: '5', spellcheck: 'false', placeholder: '예)\n' + L[3], value: (cfg.lists || {})[L[0]] || '',
          oninput: function (e) { cfg.lists[L[0]] = e.target.value; save(); listInfo(); refresh(); } }),
        info
      ]));
    });
    var dayDate = el('input', { type: 'date', id: 'an-day-date', value: iso(today()) });
    var dayNames = el('textarea', { id: 'an-day-names', rows: '3', spellcheck: 'false', placeholder: '예)\n김일용\n박일용' });
    listBox.appendChild(el('div', { cls: 'sign-box an-day' }, [
      el('p', { cls: 'sign-h', text: '일용직 투입 교육 기록 (투입하는 날마다)' }),
      el('p', { cls: 'help', text: '제조 일용직은 사람이 바뀌므로 투입 당일 작업 전에 채용 시 교육(1시간 이상)을 하고 이 기록을 남깁니다. 이름만 적으면 교육 내용·법정 근거·작업 범위(숙련자 지도 아래 작업)가 채워진 QF-12가 만들어집니다.' }),
      el('div', { cls: 'grid' }, [el('div', { cls: 'field' }, [el('label', { for: 'an-day-date', text: '투입일' }), dayDate])]),
      el('div', { cls: 'field an-list' }, [el('label', { for: 'an-day-names', text: '일용직 성명 (한 줄에 한 명)' }), dayNames]),
      el('button', { type: 'button', cls: 'btn btn-primary', text: '일용직 투입 교육 기록 받기 (QF-12)', onclick: function () { makeDaily(dayDate.value, dayNames.value); } })
    ]));
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '3' }), '명단 (한 번 입력)']),
      el('p', { cls: 'help', text: '엑셀 표에서 복사해 붙여 넣어도 됩니다(열 순서만 맞추기). 명단은 이 PC에만 저장되고 어디로도 보내지 않습니다. 양식을 받으면 교육 대상 인원(SF-05), 건강진단 대상·주기(SF-06), 교육·역량 명단(QF-12), 관리감독자(SF-04), 공급자 평가(QF-10), 외주업체별 안전보건 평가(SF-09), 계측기 대장(QF-11)이 채워지고, 계측기 교정 기한이 할 일에 들어갑니다.' }),
      listBox
    ]));
    var ownerSel = el('select', { id: 'an-owner', onchange: function (e) { view.owner = e.target.value; refresh(); } });
    var showSel = el('select', { id: 'an-show', onchange: function (e) { view.show = e.target.value; refresh(); } },
      [['open', '남은 일'], ['all', '전체'], ['90', '앞으로 90일']].map(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (o[0] === view.show) op.selected = true; return op; }));
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '4' }), '할 일과 기한']),
      el('p', { cls: 'help', text: '\'양식 받기\'를 누르면 그 기록 양식이 담당자·기간·결재란이 채워지고 직접 판단할 칸에 회색 기울임 예시가 들어간 채로 저장됩니다. 기록을 작성·서명해 회사기록 폴더에 저장했으면 줄 끝의 \'완료\'를 누릅니다(잘못 누르면 \'취소\'). 회사기록 폴더를 고르면 파일 이름으로도 확인됩니다.' }),
      el('div', { cls: 'dash-bar' }, [
        el('div', { cls: 'field' }, [el('label', { for: 'an-owner', text: '담당' }), ownerSel]),
        el('div', { cls: 'field' }, [el('label', { for: 'an-show', text: '보기' }), showSel])
      ]),
      el('div', { cls: 'table-wrap an-table' }, [el('table', { cls: 'tbl' }, [
        el('thead', {}, [el('tr', {}, ['기한', '', '할 일 · 양식 받기', '담당', '완료'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', { id: 'anBody' })])])
    ]));
    layout.appendChild(el('aside', { cls: 'out' }, [el('div', { cls: 'out-card' }, [
      el('div', { cls: 'out-head' }, [el('h2', { text: '요약' }), el('p', { cls: 'count' }, [el('b', { id: 'anTotal', text: '0' }), '건 / 15개월'])]),
      el('ul', { cls: 'checklist', id: 'anSum' }),
      el('div', { cls: 'an-quicks', id: 'anQuick' }),
      el('div', { id: 'anDoneBar' }),
      el('button', { type: 'button', cls: 'btn btn-primary', text: '캘린더에 넣기 (.ics)', onclick: exportIcs }),
      el('button', { type: 'button', cls: 'btn', text: '30일 안에 할 양식 한꺼번에 받기 (zip)', onclick: makeSoon }),
      el('button', { type: 'button', cls: 'btn', text: '연간 계획표 엑셀 받기', onclick: exportXlsx }),
      el('button', { type: 'button', cls: 'btn', text: '회사 설정 저장 (.json)', onclick: exportCfg }),
      el('label', { cls: 'btn an-import', for: 'anCfgFile' }, ['회사 설정 불러오기']),
      el('input', { type: 'file', id: 'anCfgFile', accept: '.json', hidden: true, onchange: function (e) { importCfg(e.target.files[0]); e.target.value = ''; } }),
      el('p', { cls: 'status', id: 'anStatus', role: 'status' }),
      el('ul', { cls: 'rules' }, [
        el('li', {}, [el('b', { text: '★법정' }), '위험성평가·반기 이행점검은 산업안전보건법·중대재해처벌법 의무입니다. 기한을 넘기지 않습니다.']),
        el('li', {}, [el('b', { text: '캘린더' }), '구글 캘린더: 설정 → 가져오기/내보내기 → 파일 선택. 공용 캘린더에 넣으면 담당자 모두 알림을 받습니다.']),
        el('li', {}, [el('b', { text: '양식' }), '각 기록은 통합 기록양식집(DI-IMS-F-01) 엑셀의 해당 시트로 작성합니다.'])
      ])
    ])]));
    listInfo();
    refresh();
  }

  function listInfo() {
    var n = staffCount(), sp = suppliers(), ins = instruments();
    var txt = {
      staff: n.all ? n.all + '명 — 사무직 ' + n.office + ' · 제조·시험·시운전 ' + (n.all - n.office) + ' · 기간제·일용 ' + n.temp + ' · 관리감독자 ' + n.sups.length : '',
      suppliers: sp.length ? sp.length + '곳 — 외주(외함·현장배선 등) ' + sp.filter(function (x) { return x.kind !== '부품'; }).length + '곳은 SF-09 평가 시트가 업체별로 만들어짐' : '',
      instruments: ins.length ? ins.length + '대 — 교정일 확인 ' + ins.filter(function (x) { return x.next; }).length + '대' + (ins.some(function (x) { return !x.last; }) ? ' · 교정일 형식(YYYY-MM-DD) 확인 필요 ' + ins.filter(function (x) { return !x.last; }).length + '대' : '') : ''
    };
    LISTS.forEach(function (L) { var p = $('an-l-' + L[0] + '-n'); if (p) p.textContent = txt[L[0]] ? '읽은 내용: ' + txt[L[0]] : ''; });
  }

  function refresh() {
    var list = tasks(), tb = $('anBody');
    if (!tb) return;
    var owners = [];
    list.forEach(function (t) { var o = (t.owner || '').split('/')[0].trim(); if (o && owners.indexOf(o) < 0) owners.push(o); });
    var sel = $('an-owner');
    A.clear(sel);
    sel.appendChild(el('option', { value: '', text: '모든 담당' }));
    owners.forEach(function (o) { var op = el('option', { value: o, text: o }); if (o === view.owner) op.selected = true; sel.appendChild(op); });
    var shown = list.filter(function (t) {
      if (view.owner && (t.owner || '').indexOf(view.owner) < 0) return false;
      if (view.show === 'open') return t.done !== true && !(t.audit && dday(t.due) < 0);
      if (view.show === '90') return dday(t.due) >= 0 && dday(t.due) <= 90;
      return true;
    });
    A.clear(tb);
    var lastMonth = '';
    shown.forEach(function (t) {
      var mk = t.due.getFullYear() + '년 ' + (t.due.getMonth() + 1) + '월';
      if (mk !== lastMonth) { tb.appendChild(el('tr', { cls: 'an-month' }, [el('td', { colspan: '5', text: mk })])); lastMonth = mk; }
      var dd = dday(t.due);
      var late = t.done !== true && !t.audit && dd < 0;
      tb.appendChild(el('tr', { cls: late ? 'an-late' : t.done ? 'an-done' : '' }, [
        el('td', { cls: 'c-mono', text: iso(t.due).slice(5).replace('-', '/') }),
        el('td', {}, [el('span', { cls: 'chip ' + (t.done ? 'chip-ok' : late ? 'chip-bad' : dd <= 14 ? 'chip-warn' : ''), text: t.done ? '완료' : dd === 0 ? '오늘' : dd > 0 ? 'D-' + dd : (-dd) + '일 지남' })]),
        el('td', {}, [
          el('div', { cls: 'an-task' }, [el('b', { cls: 'c-mono', text: t.code }), ' ', el('span', { text: t.task }), t.legal ? el('span', { cls: 'chip chip-bad an-legal', text: '★법정' }) : null]),
          el('div', { cls: 'an-meta' }, [
            (A.FORMS.company || {})[t.code] ? el('button', { type: 'button', cls: 'btn btn-sm an-get', text: '양식 받기', 'aria-label': t.code + ' ' + t.task + ' 양식 받기', onclick: function () { makeOne(t); } }) : null,
            el('span', { cls: 'sub', text: t.freq + (t.period ? ' · ' + t.period : '') + (t.file ? ' · 파일명 ' + t.file + '…' : '') })])
        ]),
        el('td', { text: t.owner }),
        el('td', { cls: 'an-done-cell' }, t.audit || !t.file ? [el('span', { text: '—' })] : (cfg.done || {})[t.file] ? [
          el('span', { cls: 'chip chip-ok', text: '완료 ' + String(cfg.done[t.file]).slice(5).replace('-', '/') }),
          el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '취소', 'aria-label': t.code + ' 완료 취소', onclick: function () { delete cfg.done[t.file]; save(); refresh(); } })
        ] : [
          t.done === true ? el('span', { cls: 'chip chip-ok', text: '파일 있음' }) : null,
          t.done !== true ? el('button', { type: 'button', cls: 'btn btn-sm an-mark', text: '완료', 'aria-label': t.code + ' ' + t.task + ' 완료 표시', onclick: function () {
            cfg.done = cfg.done || {}; cfg.done[t.file] = iso(today()); save(); refresh();
            setStatus(t.code + ' 완료로 표시해 \'남은 일\'에서 뺐습니다. 다시 보거나 취소하려면 보기를 \'전체\'로 바꾸세요. 작성한 기록은 회사기록 폴더에 \'' + t.file + '\'로 시작하는 이름으로 둡니다.', 'ok');
          } }) : null
        ])
      ]));
    });
    if (!shown.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '5', cls: 'empty', text: '해당하는 할 일이 없습니다.' })]));
    // 요약
    var sum = $('anSum');
    A.clear(sum);
    function li(kind, t1, t2) { sum.appendChild(el('li', { cls: kind }, [el('span', { cls: 'ic', 'aria-hidden': 'true', text: kind === 'ok' ? '✓' : kind === 'warn' ? '!' : '–' }), el('span', { cls: 'txt' }, [el('b', { text: t1 + ' ' }), t2])])); }
    var real = list.filter(function (t) { return !t.audit; });
    var late = real.filter(function (t) { return t.done !== true && dday(t.due) < 0; });
    var soon = real.filter(function (t) { return t.done !== true && dday(t.due) >= 0 && dday(t.due) <= 30; });
    var nextLegal = real.filter(function (t) { return t.legal && t.done !== true && dday(t.due) >= 0; })[0];
    li(late.length ? 'warn' : 'ok', '기한 지남', late.length ? late.length + '건 — ' + late.slice(0, 2).map(function (t) { return t.code; }).join(', ') + (late.length > 2 ? ' 외' : '') : '없음');
    li(soon.length ? 'warn' : 'ok', '30일 이내', soon.length + '건');
    if (nextLegal) li('warn', '다음 법정 기한', nextLegal.code + ' ' + iso(nextLegal.due) + ' (D-' + dday(nextLegal.due) + ')');
    li('ok', '완료', real.filter(function (t) { return t.done; }).length + '건 (\'완료\' 버튼' + (found ? ' + 회사기록 폴더 파일' : '') + ')');
    // 지금 받아야 할 양식: 기한 지남 + 다음 법정 + 14일 이내 (최대 6개)
    var urgent = late.concat(nextLegal ? [nextLegal] : []).concat(real.filter(function (t) { return t.done !== true && dday(t.due) >= 0 && dday(t.due) <= 14; }));
    var seen = {}, quick = $('anQuick');
    urgent = urgent.filter(function (t) { var k = t.file || t.code; if (seen[k] || !(A.FORMS.company || {})[t.code]) return false; seen[k] = 1; return true; }).slice(0, 6);
    A.clear(quick);
    if (urgent.length) quick.appendChild(el('p', { cls: 'sign-h', text: '지금 받아야 할 양식' }));
    urgent.forEach(function (t) {
      var dd = dday(t.due);
      quick.appendChild(el('button', { type: 'button', cls: 'btn an-quick' + (t.legal ? ' legal' : ''), onclick: function () { makeOne(t); } }, [
        el('b', { text: t.code + ' 양식 받기' }), el('span', { text: t.task }),
        el('small', { text: (dd < 0 ? (-dd) + '일 지남' : 'D-' + dd) + ' · ' + iso(t.due) + (t.legal ? ' · ★법정' : '') })]));
    });
    $('anTotal').textContent = real.length;
    // 완료 표시 모아 보기·한 번에 취소 (실수로 누른 경우)
    var bar = $('anDoneBar'), nDone = Object.keys(cfg.done || {}).length;
    A.clear(bar);
    if (nDone) bar.appendChild(el('div', { cls: 'an-donebar' }, [
      el('span', { text: '완료 표시 ' + nDone + '건' }),
      el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '완료한 것 보기', onclick: function () { view.show = 'all'; $('an-show').value = 'all'; refresh(); var b = $('anBody'); if (b) b.scrollIntoView({ block: 'start' }); } }),
      el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '완료 표시 모두 취소', onclick: function () {
        if (!window.confirm('완료 표시 ' + nDone + '건을 모두 취소할까요? (작성한 파일은 지워지지 않습니다)')) return;
        cfg.done = {}; save(); refresh(); setStatus('완료 표시를 모두 취소했습니다.', 'ok');
      } })
    ]));
  }

  window.IsoViews = window.IsoViews || {};
  window.IsoViews.annual = {
    show: function () {
      A = window.IsoApp; el = A.el; $ = A.$;
      if (!cfg) window.IsoViews.annual._load();
      render();
    },
    /** 다른 탭(01 묶음)이 회사 담당자·명단을 기본값으로 쓰게 한다 */
    company: function () {
      if (!cfg) { this._load(); }
      return { profile: cfg.profile, staff: staff(), suppliers: suppliers(), instruments: instruments() };
    },
    _load: function () {
      cfg = { start: '2026-10-01', audit: '', profile: {}, lists: {} };
      try { Object.assign(cfg, JSON.parse(localStorage.getItem('iso-annual') || '{}')); } catch (e) { /* 기본값 */ }
      cfg.profile = cfg.profile || {}; cfg.lists = cfg.lists || {}; cfg.done = cfg.done || {};
      PROFILE.forEach(function (f) { if (cfg.profile[f[0]] === undefined) cfg.profile[f[0]] = f[2]; });
    },
    _tasks: function () { return tasks(); }, _form: function (i) { return buildBuffer(tasks()[i]); }, _formFor: function (i) { return formFor(tasks()[i]); }, _ics: function () { return icsText(); }, _setFound: function (l) { found = l; refresh(); }, _setLists: function (o) { Object.assign(cfg.lists, o); render(); }, _daily: function (d, n) { var f = dailySpec(d, n); return A.E.buildWorkbook(window.ExcelJS, [f.spec], { values: f.values, rev: A.FORMS.rev, date: A.FORMS.date, logo: window.ISO_LOGO, signNames: f.sign }).xlsx.writeBuffer().then(function (b) { return Array.from(new Uint8Array(b)); }); }
  };
})();
