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
  var RULES = [
    { code: 'QF-13', task: '매뉴얼·양식집 Rev.00 배포 기록, 이전 초안 사용중지 표시', kind: 'once', days: 7 },
    { code: 'SF-04', task: '안전보건관리담당자 선임(또는 위탁) 증빙 확인', kind: 'once', days: 14 },
    { code: 'SF-01', task: '최초 공정 위험성평가 (시행일부터 1개월 이내, 법정)', kind: 'once', days: 30, legal: true },
    { code: 'EF-01', task: '최초 환경측면 중요도 평가', kind: 'once', days: 30 },
    { code: 'MF-04', task: '최초 조직상황·이해관계자·위험과 기회 검토', kind: 'once', days: 30 },
    { code: 'MF-05', task: '최초 적용 법규·요구사항 등록과 준수평가', kind: 'once', days: 30 },
    { code: 'QF-11', task: '계측기·시험 설비 등록, 교정 유효기한 확인', kind: 'once', days: 30 },
    { code: 'QF-12', task: '제조·검사 인원 자격(업무범위) 승인 등록', kind: 'once', days: 30 },
    { code: 'QF-10', task: '현재 거래 공급자·외주업체 승인 목록 정리', kind: 'once', days: 30 },
    { code: 'MF-06', task: '근로자 협의 (월 1회)', kind: 'monthly' },
    { code: 'QF-13-2', task: '백업 표본 복구 확인 (월 1회)', kind: 'monthly' },
    { code: 'MF-03', task: '목표 분기 실적 점검', kind: 'quarterly' },
    { code: 'MF-05', task: '법규 최신성 분기 확인', kind: 'quarterly' },
    { code: 'SF-07', task: '안전보건 예산 분기 집행 확인', kind: 'quarterly' },
    { code: 'SF-08', task: '반기 안전보건 이행점검', kind: 'half', legal: true },
    { code: 'SF-04', task: '안전보건관리담당자 반기 직무 평가', kind: 'half' },
    { code: 'SF-05', task: '안전보건교육 반기 실적 확인', kind: 'half' },
    { code: 'SF-05', task: '안전보건교육 연간 계획 수립', kind: 'yearly', month: 1, key: '계획' },
    { code: 'SF-06', task: '건강진단 대상자 확정·수검 계획', kind: 'yearly', month: 1 },
    { code: 'SF-07', task: '안전보건 예산 편성', kind: 'yearly', month: 1, key: '편성' },
    { code: 'MF-03', task: '연간 목표·실행계획 수립', kind: 'yearly', month: 1 },
    { code: 'MF-06', task: '비상대응 훈련 (연 1회)', kind: 'fromStart', months: 2, key: '훈련' },
    { code: 'QF-10', task: '공급자·외주 연간 재평가', kind: 'yearly', month: 12 },
    { code: 'SF-09', task: '외주(수급인) 안전보건 역량 연간 평가', kind: 'yearly', month: 12 },
    { code: 'QF-11', task: '계측기 교정 현황 연간 확인', kind: 'yearly', month: 12 },
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
      out.push({ code: r.code, task: r.task, owner: owner(r.code), due: due, period: period, legal: !!r.legal,
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
          else if (r.kind === 'quarterly' && mm % 3 === 0) push(r, d, d.getFullYear() + ' ' + (mm / 3) + '분기');
          else if (r.kind === 'half' && (mm === 6 || mm === 12)) push(r, d, d.getFullYear() + (mm === 6 ? ' 상반기' : ' 하반기'));
          else if (r.kind === 'yearly' && mm === r.month) push(r, d, String(d.getFullYear()));
          else if (r.kind === 'audit' && !audit && mm === r.month) push(r, new Date(d.getFullYear(), mm - 1, r.day), String(d.getFullYear()));
        }
        if (r.kind === 'audit' && audit) push(r, addDays(audit, -r.before), '사후심사 대비');
      }
    });
    if (audit && audit >= start && audit <= end) {
      out.push({ code: '인증', task: 'ISO 사후심사 (인증기관)', owner: '품질 / 대표이사', due: audit, period: '', legal: false, file: '', freq: '인증기관 일정', audit: true });
    }
    out.sort(function (a, b) { return a.due - b.due || a.code.localeCompare(b.code); });
    out.forEach(function (t) { t.done = isDone(t); });
    return out;
  }
  function freqText(r) {
    return { once: '최초 1회', monthly: '매월', quarterly: '분기', half: '반기 (6·12월)', yearly: '연 1회 (' + r.month + '월)',
      fromStart: r.months === 12 ? '연 1회 (시행일 기준)' : '연 1회', audit: '연 1회 (심사 전)' }[r.kind] || '';
  }
  function isDone(t) {
    if (!found || !t.file) return null;
    var ym = t.file.slice(t.code.length + 1, t.code.length + 7), y = ym.slice(0, 4), m = ym.slice(4);
    return found.some(function (n) {
      var u = n.toUpperCase();
      return u.indexOf(t.code.toUpperCase()) >= 0 && (u.indexOf(ym) >= 0 || u.indexOf(y + '-' + m) >= 0 || u.indexOf(y + '.' + m) >= 0) &&
        (!t.key || n.indexOf(t.key) >= 0);
    });
  }

  // ---------------------------------------------------------------- 내보내기
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
    var ownerSel = el('select', { id: 'an-owner', onchange: function (e) { view.owner = e.target.value; refresh(); } });
    var showSel = el('select', { id: 'an-show', onchange: function (e) { view.show = e.target.value; refresh(); } },
      [['open', '남은 일'], ['all', '전체'], ['90', '앞으로 90일']].map(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (o[0] === view.show) op.selected = true; return op; }));
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '2' }), '할 일과 기한']),
      el('div', { cls: 'dash-bar' }, [
        el('div', { cls: 'field' }, [el('label', { for: 'an-owner', text: '담당' }), ownerSel]),
        el('div', { cls: 'field' }, [el('label', { for: 'an-show', text: '보기' }), showSel])
      ]),
      el('div', { cls: 'table-wrap an-table' }, [el('table', { cls: 'tbl' }, [
        el('thead', {}, [el('tr', {}, ['기한', '', '양식', '할 일', '담당', '주기', '저장 파일명', '상태'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', { id: 'anBody' })])])
    ]));
    layout.appendChild(el('aside', { cls: 'out' }, [el('div', { cls: 'out-card' }, [
      el('div', { cls: 'out-head' }, [el('h2', { text: '요약' }), el('p', { cls: 'count' }, [el('b', { id: 'anTotal', text: '0' }), '건 / 15개월'])]),
      el('ul', { cls: 'checklist', id: 'anSum' }),
      el('button', { type: 'button', cls: 'btn btn-primary', text: '캘린더에 넣기 (.ics)', onclick: exportIcs }),
      el('button', { type: 'button', cls: 'btn', text: '연간 계획표 엑셀 받기', onclick: exportXlsx }),
      el('p', { cls: 'status', id: 'anStatus', role: 'status' }),
      el('ul', { cls: 'rules' }, [
        el('li', {}, [el('b', { text: '★법정' }), '위험성평가·반기 이행점검은 산업안전보건법·중대재해처벌법 의무입니다. 기한을 넘기지 않습니다.']),
        el('li', {}, [el('b', { text: '캘린더' }), '구글 캘린더: 설정 → 가져오기/내보내기 → 파일 선택. 공용 캘린더에 넣으면 담당자 모두 알림을 받습니다.']),
        el('li', {}, [el('b', { text: '양식' }), '각 기록은 통합 기록양식집(DI-IMS-F-01) 엑셀의 해당 시트로 작성합니다.'])
      ])
    ])]));
    refresh();
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
      if (mk !== lastMonth) { tb.appendChild(el('tr', { cls: 'an-month' }, [el('td', { colspan: '8', text: mk })])); lastMonth = mk; }
      var dd = dday(t.due);
      var late = t.done !== true && !t.audit && dd < 0;
      tb.appendChild(el('tr', { cls: late ? 'an-late' : t.done ? 'an-done' : '' }, [
        el('td', { cls: 'c-mono', text: iso(t.due).slice(5).replace('-', '/') }),
        el('td', {}, [el('span', { cls: 'chip ' + (t.done ? 'chip-ok' : late ? 'chip-bad' : dd <= 14 ? 'chip-warn' : ''), text: t.done ? '완료' : dd === 0 ? '오늘' : dd > 0 ? 'D-' + dd : (-dd) + '일 지남' })]),
        el('td', { cls: 'c-mono', text: t.code }),
        el('td', {}, [el('span', { text: t.task }), t.legal ? el('span', { cls: 'chip chip-bad an-legal', text: '★법정' }) : null]),
        el('td', { text: t.owner }), el('td', { cls: 'sub', text: t.freq + (t.period ? ' · ' + t.period : '') }),
        el('td', { cls: 'c-mono', text: t.file }),
        el('td', { text: t.done === true ? '파일 있음' : t.done === false ? '파일 없음' : '—' })
      ]));
    });
    if (!shown.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '8', cls: 'empty', text: '해당하는 할 일이 없습니다.' })]));
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
    li(found ? 'ok' : 'off', '완료 확인', found ? real.filter(function (t) { return t.done; }).length + '건 파일 확인' : '회사기록 폴더를 고르면 확인');
    $('anTotal').textContent = real.length;
  }

  window.IsoViews = window.IsoViews || {};
  window.IsoViews.annual = {
    show: function () {
      A = window.IsoApp; el = A.el; $ = A.$;
      if (!cfg) {
        cfg = { start: '2026-10-01', audit: '' };
        try { Object.assign(cfg, JSON.parse(localStorage.getItem('iso-annual') || '{}')); } catch (e) { /* 기본값 */ }
      }
      render();
    },
    _tasks: function () { return tasks(); }, _ics: function () { return icsText(); }, _setFound: function (l) { found = l; refresh(); }
  };
})();
