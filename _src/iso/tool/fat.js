/* FAT 시험 입력: 현장(태블릿)에서 항목·I/O 점별 결과와 판정을 누르면
   QF-06·QF-06-1 엑셀과 고객 제출용 성적서(인쇄·PDF)가 함께 나온다. 판정 시각은 자동으로 남는다. */
(function () {
  'use strict';
  var A, el, $, esc;
  var JUDGE = ['합격', '불합격', '보류', '해당없음'];
  var IO_JUDGE = ['합격', '불합격', '해당없음'];
  var KIND = ['FAT (공장 인수시험)', '자체시험', '재시험', 'SAT (현장)'];

  var cur = null;      // 지금 시험 중인 판넬 기록
  var tag = '';        // 선택한 판넬 Tag
  var ioFilter = 'all';

  function now() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function todayIso() { return now().slice(0, 10); }
  function key(p, t) { return 'iso-fat:' + (A.P.clean(p.pj) || '_') + ':' + t; }

  function panelsOf(p) { return (p.panels || []).filter(function (x) { return x.tag; }); }

  /** 01 탭과 같은 계획에서 이 판넬의 QF-06·QF-06-1 행·머리값을 가져온다 */
  function template(t) {
    var plan = A.plan(), docs = plan.docs;
    var d06 = docs.filter(function (d) { return d.code === 'QF-06' && d.panel === t; })[0];
    var d061 = docs.filter(function (d) { return d.code === 'QF-06-1' && d.panel === t; })[0];
    var rows06 = (d06 && d06.rows) || A.FORMS.forms['QF-06'].rows || [];
    var rows061 = (d061 && d061.rows) || [];
    return { p: plan.p, v06: d06 ? d06.values : {}, v061: d061 ? d061.values : {}, rows06: rows06, rows061: rows061 };
  }

  function fresh(p, t) {
    var tp = template(t), pn = panelsOf(p).filter(function (x) { return x.tag === t; })[0] || {};
    return {
      format: 'DI-ISO-FAT', version: 1, pj: A.P.clean(p.pj), tag: t, lot: pn.serial || '', desc: pn.desc || '',
      date: todayIso(), kind: KIND[0], tester: p.tester || '', witness: p.witness || '', meters: p.meters || '', place: '당사 공장',
      items: tp.rows06.map(function (r) { return { item: r[0] || '', method: r[1] || '', std: r[2] || '', result: '', judge: '', evidence: '', retest: '', t: '' }; }),
      io: tp.rows061.map(function (r) { return { no: r[0], addr: r[1] || '', desc: r[2] || '', type: r[3] || '', expect: r[4] || '', result: '', judge: '', by: '', note: '', t: '' }; }),
      started: now(), updated: ''
    };
  }

  function load(p, t) {
    var data = null;
    try { data = JSON.parse(localStorage.getItem(key(p, t)) || 'null'); } catch (e) { data = null; }
    cur = data && data.format === 'DI-ISO-FAT' ? data : fresh(p, t);
    var pn = panelsOf(p).filter(function (x) { return x.tag === t; })[0];
    if (pn) { cur.lot = pn.serial || cur.lot; cur.desc = pn.desc || cur.desc; }
  }
  function save() {
    cur.updated = now();
    try { localStorage.setItem(key(A.project(), cur.tag), JSON.stringify(cur)); } catch (e) { /* 이 PC에 못 남겨도 파일 저장으로 보관 */ }
    var s = $('fatSaved');
    if (s) s.textContent = '이 기기에 자동 저장 ' + cur.updated.slice(11);
  }

  // ---------------------------------------------------------------- 집계
  function stats(d) {
    d = d || cur;
    var it = d.items, io = d.io;
    function cnt(list, j) { return list.filter(function (x) { return x.judge === j; }).length; }
    var s = {
      itemsDone: it.filter(function (x) { return x.judge; }).length, items: it.length,
      ioDone: io.filter(function (x) { return x.judge; }).length, io: io.length,
      fail: cnt(it, '불합격') + cnt(io, '불합격'), hold: cnt(it, '보류'),
      ioPass: cnt(io, '합격'), ioFail: cnt(io, '불합격'), ioNa: cnt(io, '해당없음')
    };
    s.verdict = (s.itemsDone < s.items || s.ioDone < s.io) ? '미완료' : s.fail ? '불합격' : s.hold ? '보류' : '합격';
    s.needNote = it.filter(function (x) { return x.judge === '불합격' && !A.P.clean(x.retest); }).length +
      io.filter(function (x) { return x.judge === '불합격' && !A.P.clean(x.note); }).length;
    return s;
  }
  function verdictCls(v) { return v === '합격' ? 'ok' : v === '미완료' ? 'off' : 'bad'; }

  // ---------------------------------------------------------------- 출력: 엑셀
  function workbook() {
    var p = A.project(), tp = template(cur.tag), s = stats();
    var f06 = JSON.parse(JSON.stringify(A.FORMS.forms['QF-06'])), f061 = JSON.parse(JSON.stringify(A.FORMS.forms['QF-06-1']));
    f06.rows = cur.items.map(function (x) {
      return [x.item, x.method, x.std, x.result, x.judge, x.evidence, x.retest + (x.t ? (x.retest ? ' · ' : '') + '판정 ' + x.t.slice(5) : '')];
    });
    f061.rows = cur.io.map(function (x) { return [x.no, x.addr, x.desc, x.type, x.expect, x.result, x.judge, x.by || cur.tester, x.note]; });
    f061.blank = 1;
    var line = '종합 판정: ' + s.verdict + ' (시험 항목 ' + s.itemsDone + '/' + s.items + ', I/O ' + s.ioDone + '/' + s.io + ' · 불합격 ' + s.fail + '건) · ' +
      cur.kind + ' · FAT 시험 입력 화면 기록 ' + (cur.updated || now()) + '. 서명은 자필 또는 전자 승인 증거로 한다.';
    f06.notes = [line].concat(f06.notes || []);
    f061.notes = [line].concat(f061.notes || []);
    var tl = cur.date + ' / ' + (cur.tester || '');
    var v06 = Object.assign({}, tp.v06, {
      '판넬 번호(제조번호)': cur.tag + (cur.lot ? ' / ' + cur.lot : ''), '시험일 / 시험자': tl,
      '계측기 관리번호': cur.meters, '고객 입회자·서명 또는 승인메일': cur.witness
    });
    var v061 = Object.assign({}, tp.v061, {
      '판넬 번호(제조번호)': cur.tag + (cur.lot ? ' / ' + cur.lot : ''), '시험일 / 시험자': tl, '고객 입회자': cur.witness
    });
    return A.E.buildWorkbook(window.ExcelJS, [f06, f061], { valuesList: [v06, v061], rev: A.FORMS.rev, date: A.FORMS.date, logo: window.ISO_LOGO });
  }
  function fileBase() {
    return (cur.pj || '프로젝트') + '_FAT_' + cur.tag.replace(/[\\\/:*?"<>|\s]/g, '') + '_' + cur.date.replace(/-/g, '');
  }
  function saveXlsx() {
    if (!window.ExcelJS) { setStatus('엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.', 'bad'); return; }
    var name = fileBase() + '_QF-06.xlsx';
    workbook().xlsx.writeBuffer().then(function (buf) {
      return A.saveFile(name, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    }).then(function () {
      setStatus(name + ' 저장 — 프로젝트 폴더 05_FAT출하에 넣고 00_기록현황의 QF-06 상태를 바꿉니다.', 'ok');
    }, function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }

  // ---------------------------------------------------------------- 출력: 고객 제출용 성적서
  function reportHtml() {
    var p = A.project(), s = stats(), tp = template(cur.tag);
    var td = function (v, cls) { return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(v || '') + '</td>'; };
    var jcls = function (j) { return j === '합격' ? 'j-ok' : j === '불합격' ? 'j-bad' : j === '보류' ? 'j-hold' : 'j-na'; };
    var info = [
      ['고객 Customer', p.customer], ['프로젝트 Project', A.P.clean(p.pj) + (p.name ? ' · ' + p.name : '')],
      ['판넬 Panel', cur.tag + (cur.desc ? ' · ' + cur.desc : '')], ['제조번호(LOT) Serial', cur.lot],
      ['도면 Rev / PLC Ver', [p.drawRev, p.plcVer].filter(Boolean).join(' / ')], ['시험 기준 Test spec.', p.stdRev || 'QF-15'],
      ['시험 구분 Test type', cur.kind], ['시험일 · 장소 Date · Place', cur.date + ' · ' + (cur.place || '')],
      ['시험자 Tested by', cur.tester], ['고객 입회 Witness', cur.witness],
      ['계측기 Instruments', cur.meters]
    ];
    var infoRows = '';
    for (var i = 0; i < info.length; i += 2) {
      infoRows += '<tr><th>' + esc(info[i][0]) + '</th>' + td(info[i][1]) + (info[i + 1] ? '<th>' + esc(info[i + 1][0]) + '</th>' + td(info[i + 1][1]) : '<th></th><td></td>') + '</tr>';
    }
    var itemRows = cur.items.map(function (x, i) {
      return '<tr><td class="c">' + (i + 1) + '</td>' + td(x.item, 'b') + td(x.method) + td(x.std) + td(x.result) + '<td class="c ' + jcls(x.judge) + '">' + esc(x.judge || '미판정') + '</td></tr>';
    }).join('');
    var ioRows = cur.io.map(function (x) {
      return '<tr><td class="c">' + esc(x.no) + '</td>' + td(x.addr, 'mono') + td(x.desc) + td(x.type, 'c') + td(x.expect) + td(x.result) + '<td class="c ' + jcls(x.judge) + '">' + esc(x.judge || '미판정') + '</td></tr>';
    }).join('');
    var fails = cur.items.filter(function (x) { return x.judge === '불합격' || x.judge === '보류'; }).map(function (x) { return '<li><b>' + esc(x.item) + '</b> ' + esc(x.judge) + ' — ' + esc(x.retest || '조치 미기재') + '</li>'; })
      .concat(cur.io.filter(function (x) { return x.judge === '불합격'; }).map(function (x) { return '<li><b>' + esc(x.addr + ' ' + x.desc) + '</b> 불합격 — ' + esc(x.note || '조치 미기재') + '</li>'; }));
    var logo = window.ISO_LOGO ? '<img src="data:image/png;base64,' + window.ISO_LOGO + '" alt="동인엔시스" class="logo">' : '<b>㈜동인엔시스</b>';
    var vcls = s.verdict === '합격' ? 'v-ok' : s.verdict === '미완료' ? 'v-na' : 'v-bad';
    var body =
      '<div class="rep">' +
      '<header class="rh">' + logo + '<div class="rt"><h1>FAT 시험 성적서</h1><p>Factory Acceptance Test Report</p></div>' +
      '<div class="rno">DI-QF-06 · Rev.' + esc(A.FORMS.rev) + '<br>' + esc(fileBase()) + '</div></header>' +
      '<table class="info">' + infoRows + '</table>' +
      '<div class="verdict ' + vcls + '"><span>종합 판정 Result</span><b>' + esc(s.verdict) + '</b>' +
      '<em>시험 항목 ' + s.itemsDone + '/' + s.items + ' · I/O ' + s.ioPass + ' 합격 / ' + s.ioFail + ' 불합격 / ' + s.ioNa + ' 해당없음 (총 ' + s.io + '점)</em></div>' +
      '<h2>1. 시험 항목 Test items (QF-06)</h2>' +
      '<table class="grid"><thead><tr><th class="w-no">No</th><th>항목</th><th>조건·방법</th><th>기준</th><th>결과</th><th class="w-j">판정</th></tr></thead><tbody>' + itemRows + '</tbody></table>' +
      (fails.length ? '<h2>불합격·보류 및 조치 Nonconformities</h2><ul class="fails">' + fails.join('') + '</ul>' : '') +
      (cur.io.length ? '<h2>2. I/O 점검 I/O check (QF-06-1)</h2><table class="grid io"><thead><tr><th class="w-no">No</th><th>주소</th><th>Tag·설명</th><th>구분</th><th>기대 동작</th><th>결과</th><th class="w-j">판정</th></tr></thead><tbody>' + ioRows + '</tbody></table>' : '') +
      '<h2>확인 Signatures</h2><table class="sign"><tr><th>시험자 Tested by</th><th>품질 확인 Quality</th><th>고객 입회 Witness</th></tr>' +
      '<tr><td>' + esc(cur.tester) + '</td><td>' + esc(p.quality || '') + '</td><td>' + esc(cur.witness) + '</td></tr>' +
      '<tr class="sg"><td>서명 / 일자</td><td>서명 / 일자</td><td>서명 / 일자</td></tr></table>' +
      '<p class="fine">이 성적서는 ㈜동인엔시스 통합경영 기록양식 QF-06·QF-06-1의 결과를 옮긴 것입니다. 시험 기준은 승인된 QF-15(' + esc(p.stdRev || '') + ')를 따릅니다. 판정 시각은 입력 시 자동 기록되었습니다.</p>' +
      '</div><footer class="pf">㈜동인엔시스 DONG-IN ENSIS · 부산광역시 부산진구 진연로9번길 47 · TEL 051-862-3668 · ' + esc(fileBase()) + '</footer>';
    var css = '@page{size:A4 portrait;margin:12mm 12mm 16mm}' +
      '.rep{font-size:9.5pt;line-height:1.45}.rh{display:flex;align-items:center;gap:6mm;border-bottom:1.2mm solid #0a2a55;padding-bottom:3mm;margin-bottom:4mm}' +
      '.logo{height:9mm}.rt{flex:1}.rt h1{margin:0;font-size:17pt;color:#1857a5;letter-spacing:-0.02em}.rt p{margin:0;color:#55657a;font-size:9pt}' +
      '.rno{font-size:7.5pt;color:#55657a;text-align:right}' +
      'table{width:100%;border-collapse:collapse;margin-bottom:3mm}th,td{border:0.25mm solid #8a9bb0;padding:1.2mm 2mm;vertical-align:middle;word-break:keep-all;overflow-wrap:anywhere}' +
      '.info th{background:#e8eef6;color:#1d2735;text-align:left;font-weight:600;width:20%;font-size:8.5pt}.info td{width:30%}' +
      '.grid thead th{background:#1857a5;color:#fff;font-weight:600;font-size:8.5pt}.grid td{font-size:8.5pt}.grid.io td{font-size:7.8pt;padding:0.8mm 1.5mm}' +
      '.grid thead{display:table-header-group}.grid tr{break-inside:avoid}' +
      '.c{text-align:center}.b{font-weight:600}.mono{font-family:Consolas,monospace}.w-no{width:9mm}.w-j{width:17mm}' +
      '.j-ok{color:#1d6b45;font-weight:700}.j-bad{color:#c0321f;font-weight:700;background:#fde7e4}.j-hold{color:#8a5a00;font-weight:700;background:#fbf0d6}.j-na{color:#55657a}' +
      '.verdict{display:flex;align-items:center;gap:5mm;border:0.6mm solid;padding:3mm 4mm;margin:2mm 0 4mm}.verdict span{font-size:9pt;font-weight:600}' +
      '.verdict b{font-size:18pt}.verdict em{font-style:normal;color:#55657a;font-size:8.5pt;margin-left:auto}' +
      '.v-ok{border-color:#1d6b45}.v-ok b{color:#1d6b45}.v-bad{border-color:#c0321f}.v-bad b{color:#c0321f}.v-na{border-color:#8a9bb0}.v-na b{color:#55657a}' +
      'h2{font-size:11pt;color:#0a2a55;margin:5mm 0 2mm;border-left:1.2mm solid #1857a5;padding-left:2mm;break-after:avoid}' +
      '.fails{margin:0 0 3mm;padding-left:5mm;font-size:8.5pt}.sign{break-inside:avoid}.sign th{background:#e8eef6;width:33.3%}.sign td{text-align:center;height:8mm}.sign .sg td{height:16mm;vertical-align:bottom;color:#8a9bb0;font-size:7.5pt}' +
      '.fine{font-size:7.5pt;color:#55657a}.pf{position:fixed;bottom:-10mm;left:0;right:0;text-align:center;font-size:7pt;color:#8a9bb0}' +
      '@media screen{.rep{max-width:186mm;margin:8mm auto;background:#fff;padding:12mm;box-shadow:0 1px 6px rgba(0,0,0,.2)}.pf{position:static;margin-bottom:8mm}}';
    return A.docHtml('FAT 성적서 ' + cur.tag, body, css);
  }

  function printReport() {
    A.printHtml(reportHtml()).then(function (ok) {
      setStatus(ok ? '성적서 인쇄 창을 열었습니다. PDF로 내려면 대상에서 \'PDF로 저장\'을 고릅니다. 인쇄 창이 안 뜨면 \'성적서 파일 받기\'를 쓰세요.'
        : '이 화면에서는 인쇄 창을 열 수 없습니다. \'성적서 파일 받기\'로 받아 크롬에서 열고 인쇄하세요.', ok ? 'ok' : 'bad');
    });
  }
  function saveReport() {
    var name = fileBase() + '_성적서.html';
    A.saveFile(name, new Blob([reportHtml()], { type: 'text/html' })).then(function () {
      setStatus(name + ' 저장 — 크롬에서 열고 Ctrl+P → PDF로 저장하면 고객 제출본이 됩니다.', 'ok');
    }, function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }
  function saveJson() {
    save();
    var name = fileBase() + '_시험기록.json';
    A.saveFile(name, new Blob([JSON.stringify(cur, null, 1)], { type: 'application/json' })).then(function () {
      setStatus(name + ' 저장 — 다른 기기에서 \'시험 기록 불러오기\'로 이어서 입력합니다.', 'ok');
    }, function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }
  function loadJson(file) {
    if (!file) return;
    file.text().then(function (text) {
      var d = JSON.parse(text);
      if (!d || d.format !== 'DI-ISO-FAT' || !Array.isArray(d.items) || !Array.isArray(d.io) || typeof d.tag !== 'string') throw new Error('FAT 시험 기록 파일이 아닙니다.');
      var p = A.project();
      if (!panelsOf(p).some(function (x) { return x.tag === d.tag; })) throw new Error('지금 프로젝트에 ' + d.tag + ' 판넬이 없습니다. 01 탭에서 같은 프로젝트를 먼저 불러오세요.');
      tag = d.tag;
      cur = d;
      save();
      render();
      setStatus(d.tag + ' 시험 기록을 불러왔습니다 (마지막 입력 ' + (d.updated || '-') + ').', 'ok');
    }).catch(function (e) { setStatus('불러오기 실패: ' + e.message, 'bad'); });
  }

  // ---------------------------------------------------------------- 화면
  function setStatus(t, kind) { var s = $('fatStatus'); if (!s) return; s.textContent = t; s.className = 'status' + (kind ? ' ' + kind : ''); }

  function judgeGroup(options, value, label, onPick) {
    var g = el('div', { cls: 'jg', role: 'radiogroup', 'aria-label': label });
    options.forEach(function (o) {
      g.appendChild(el('button', {
        type: 'button', role: 'radio', 'aria-checked': value === o ? 'true' : 'false', cls: 'jb jb-' + ({ '합격': 'ok', '불합격': 'bad', '보류': 'hold', '해당없음': 'na' }[o]),
        text: o, onclick: function () { onPick(value === o ? '' : o); }
      }));
    });
    return g;
  }

  function input(value, ph, label, on, cls) {
    return el('input', { type: 'text', value: value || '', placeholder: ph || '', 'aria-label': label, cls: cls || null, oninput: function (e) { on(e.target.value); } });
  }

  function itemCard(x, i) {
    var card = el('div', { cls: 'fat-item' + (x.judge ? ' done j-' + x.judge : '') });
    card.appendChild(el('div', { cls: 'fi-h' }, [el('span', { cls: 'fi-no', text: String(i + 1) }), el('b', { text: x.item }),
      x.t ? el('small', { cls: 'fi-t', text: '판정 ' + x.t.slice(11) }) : null]));
    card.appendChild(el('dl', { cls: 'fi-std' }, [el('dt', { text: '조건·방법' }), el('dd', { text: x.method || '—' }),
      el('dt', { text: '기준' }), el('dd', { text: x.std || '기준표(QF-15) 값 없음' })]));
    card.appendChild(el('div', { cls: 'fi-in' }, [
      input(x.result, '실측값·동작 결과 (예: 520 MΩ, 정상 동작)', x.item + ' 결과', function (v) { x.result = v; save(); }),
      judgeGroup(JUDGE, x.judge, x.item + ' 판정', function (j) { x.judge = j; x.t = j ? now() : ''; save(); renderItems(i); refreshSummary(); }),
      input(x.evidence, '계측기·사진 번호', x.item + ' 증거', function (v) { x.evidence = v; save(); }, 'fi-ev')
    ]));
    if (x.judge === '불합격' || x.judge === '보류' || x.retest) {
      card.appendChild(input(x.retest, '불합격·보류 조치와 재시험 (예: 단자 재체결 후 재시험 합격 · NCR-001)', x.item + ' 조치', function (v) { x.retest = v; save(); refreshSummary(); },
        'fi-retest' + (x.judge === '불합격' && !A.P.clean(x.retest) ? ' invalid' : '')));
    }
    return card;
  }

  function ioRow(x) {
    var tr = el('tr', { cls: x.judge ? 'j-' + x.judge : '' }, [
      el('td', { cls: 'c-mono', text: String(x.no) }), el('td', { cls: 'c-mono', text: x.addr }),
      el('td', {}, [el('div', { text: x.desc }), x.expect ? el('div', { cls: 'sub', text: '기대: ' + x.expect }) : null]),
      el('td', { text: x.type }),
      el('td', {}, [input(x.result, '결과', x.addr + ' 결과', function (v) { x.result = v; save(); })]),
      el('td', {}, [judgeGroup(IO_JUDGE, x.judge, x.addr + ' ' + x.desc + ' 판정', function (j) {
        x.judge = j; x.t = j ? now() : ''; x.by = j ? cur.tester : ''; save(); renderIo(); refreshSummary();
        var nb = document.querySelector('#fatIoBody [aria-label="' + (x.addr + ' ' + x.desc + ' 판정').replace(/"/g, '\\"') + '"] .jb');
        if (nb) nb.focus();
      })]),
      el('td', {}, [x.judge === '불합격' || x.note ? input(x.note, '조치·비고', x.addr + ' 비고', function (v) { x.note = v; save(); refreshSummary(); }, x.judge === '불합격' && !A.P.clean(x.note) ? 'invalid' : null) : null])
    ]);
    return tr;
  }

  function renderIo() {
    var tb = $('fatIoBody');
    if (!tb) return;
    A.clear(tb);
    var list = cur.io.filter(function (x) {
      return ioFilter === 'all' || (ioFilter === 'left' ? !x.judge : x.judge === '불합격');
    });
    list.forEach(function (x) { tb.appendChild(ioRow(x)); });
    if (!list.length) tb.appendChild(el('tr', {}, [el('td', { colspan: '7', cls: 'empty', text: ioFilter === 'left' ? '남은 점이 없습니다.' : ioFilter === 'fail' ? '불합격 점이 없습니다.' : 'I/O 리스트가 없습니다. 01 탭에서 I/O 리스트를 넣으세요.' })]));
    Array.prototype.forEach.call(document.querySelectorAll('.fat-filter .btn'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-f') === ioFilter ? 'true' : 'false');
    });
  }

  function refreshSummary() {
    var s = stats(), box = $('fatSummary');
    if (!box) return;
    A.clear(box);
    function li(kind, title, text) {
      box.appendChild(el('li', { cls: kind }, [el('span', { cls: 'ic', 'aria-hidden': 'true', text: kind === 'ok' ? '✓' : kind === 'warn' ? '!' : '–' }),
        el('span', { cls: 'txt' }, [el('b', { text: title + ' ' }), text])]));
    }
    li(s.itemsDone === s.items ? 'ok' : 'off', '시험 항목', s.itemsDone + ' / ' + s.items);
    li(s.ioDone === s.io ? 'ok' : 'off', 'I/O 점검', s.ioDone + ' / ' + s.io + (s.io ? ' (합격 ' + s.ioPass + ')' : ''));
    if (s.fail) li('warn', '불합격', s.fail + '건 — 조치·재시험 기록 필요');
    if (s.needNote) li('warn', '조치 미기재', s.needNote + '건');
    if (!A.P.clean(cur.tester)) li('warn', '시험자', '이름을 적으세요');
    var v = $('fatVerdict');
    v.textContent = s.verdict;
    v.className = 'verdict-b ' + verdictCls(s.verdict);
    var pct = s.items + s.io ? Math.round((s.itemsDone + s.ioDone) / (s.items + s.io) * 100) : 0;
    $('fatBar').style.width = pct + '%';
    $('fatPct').textContent = pct + '%';
    var pb = document.querySelector('.fat-panels [aria-pressed="true"] small');
    if (pb) pb.textContent = (cur.lot || 'LOT 없음') + ' · ' + pct + '%';
  }

  function panelProgress(p, t) {
    try {
      var d = JSON.parse(localStorage.getItem(key(p, t)) || 'null');
      if (!d || d.format !== 'DI-ISO-FAT') return '시작 전';
      var s = stats(d), tot = s.items + s.io;
      return tot ? Math.round((s.itemsDone + s.ioDone) / tot * 100) + '% · ' + s.verdict : '시작 전';
    } catch (e) { return ''; }
  }

  function render() {
    var root = $('view-fat'), p = A.project(), pans = panelsOf(p);
    A.clear(root);
    root.appendChild(el('header', { cls: 'top' }, [
      el('p', { cls: 'eyebrow', text: 'QF-06 자체시험·FAT 성적서 · QF-06-1 I/O 점검표' }),
      el('h1', { text: 'FAT 시험 입력' }),
      el('p', { cls: 'lead', text: '태블릿이나 노트북으로 시험하면서 결과를 적고 판정을 누릅니다. 끝나면 QF-06 엑셀(기록 보관)과 고객 제출용 성적서(PDF)가 함께 나옵니다. 입력은 이 기기에 자동 저장됩니다.' }),
      el('div', { cls: 'pj-line' }, [
        A.isSample() ? el('span', { cls: 'chip chip-warn', text: '예시 데이터' }) : null,
        el('span', {}, [el('b', { text: A.P.clean(p.pj) || '프로젝트 번호 없음' }), ' · ' + (p.customer || '고객 미입력')]),
        el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '프로젝트 바꾸기 (01 탭)', onclick: function () { A.showView('pack'); } })
      ])
    ]));
    if (!pans.length) { root.appendChild(el('p', { cls: 'note', text: '판넬이 없습니다. 01 탭에서 판넬과 I/O 리스트를 먼저 넣으세요.' })); return; }
    if (!pans.some(function (x) { return x.tag === tag; })) tag = pans[0].tag;
    if (!cur || cur.tag !== tag || cur.pj !== A.P.clean(p.pj)) load(p, tag);

    var pick = el('div', { cls: 'fat-panels', role: 'group', 'aria-label': '시험할 판넬' });
    pans.forEach(function (pn) {
      pick.appendChild(el('button', { type: 'button', cls: 'btn fat-pn', 'aria-pressed': pn.tag === tag ? 'true' : 'false',
        onclick: function () { tag = pn.tag; load(A.project(), tag); render(); } }, [el('b', { text: pn.tag }), el('small', { text: (pn.serial || 'LOT 없음') + ' · ' + panelProgress(p, pn.tag) })]));
    });
    root.appendChild(pick);

    var layout = el('div', { cls: 'layout' }), steps = el('div', { cls: 'steps' });
    layout.appendChild(steps);
    root.appendChild(layout);

    var kindSel = el('select', { id: 'fat-kind', onchange: function (e) { cur.kind = e.target.value; save(); } });
    KIND.forEach(function (k) { var o = el('option', { value: k, text: k }); if (k === cur.kind) o.selected = true; kindSel.appendChild(o); });
    function fld(id, label, keyName, type) {
      return el('div', { cls: 'field' }, [el('label', { for: id, text: label }),
        el('input', { type: type || 'text', id: id, value: cur[keyName] || '', oninput: function (e) { cur[keyName] = e.target.value; save(); refreshSummary(); } })]);
    }
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '1' }), '시험 정보 · ' + cur.tag + (cur.lot ? ' / ' + cur.lot : '')]),
      el('div', { cls: 'grid' }, [
        fld('fat-date', '시험일', 'date', 'date'),
        el('div', { cls: 'field' }, [el('label', { for: 'fat-kind', text: '시험 구분' }), kindSel]),
        fld('fat-tester', '시험자', 'tester'), fld('fat-witness', '고객 입회자', 'witness'),
        fld('fat-meters', '계측기 관리번호', 'meters'), fld('fat-place', '장소', 'place')
      ]),
      el('p', { cls: 'help', text: '시험자·입회자·계측기 기본값은 01 탭의 담당자 입력에서 옵니다. 판정 버튼을 누른 시각이 자동으로 남습니다(나중에 몰아서 적지 않기 위해).' })
    ]));

    var items = el('div', { cls: 'fat-items', id: 'fatItems' });
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '2' }), '시험 항목 (QF-06)']),
      el('p', { cls: 'help', text: '기준은 승인된 시험 기준표(QF-15)에서 옵니다. 실측값을 적고 판정을 누르세요. 불합격·보류는 조치와 재시험 결과를 꼭 적습니다.' }),
      items
    ]));

    var filters = el('div', { cls: 'fat-filter', role: 'group', 'aria-label': 'I/O 보기' }, [['all', '전체'], ['left', '남은 점'], ['fail', '불합격']].map(function (f) {
      return el('button', { type: 'button', cls: 'btn btn-sm', 'data-f': f[0], 'aria-pressed': ioFilter === f[0] ? 'true' : 'false', text: f[1], onclick: function () { ioFilter = f[0]; renderIo(); } });
    }));
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '3' }), 'I/O 점검 (QF-06-1)']),
      el('p', { cls: 'help', text: '점마다 실제로 확인한 뒤 판정을 누릅니다. 확인자는 시험자로 자동 기록됩니다. 한꺼번에 합격 처리하는 버튼은 일부러 두지 않았습니다.' }),
      filters,
      el('div', { cls: 'table-wrap fat-io' }, [el('table', { cls: 'tbl' }, [
        el('thead', {}, [el('tr', {}, ['No', '주소', 'Tag · 설명', '구분', '결과', '판정', '조치·비고'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', { id: 'fatIoBody' })])])
    ]));

    layout.appendChild(el('aside', { cls: 'out' }, [el('div', { cls: 'out-card' }, [
      el('div', { cls: 'out-head' }, [el('h2', { text: '시험 진행' }), el('p', { cls: 'count' }, [el('b', { id: 'fatPct', text: '0%' }), ' 입력'])]),
      el('div', { cls: 'progress' }, [el('span', { id: 'fatBar' })]),
      el('div', { cls: 'verdict-row' }, [el('span', { text: '종합 판정' }), el('b', { id: 'fatVerdict', cls: 'verdict-b' })]),
      el('ul', { cls: 'checklist', id: 'fatSummary' }),
      el('button', { type: 'button', cls: 'btn btn-primary', text: '성적서 엑셀 받기 (QF-06·06-1)', onclick: saveXlsx }),
      el('div', { cls: 'row-actions' }, [
        el('button', { type: 'button', cls: 'btn', text: '고객 제출용 성적서 인쇄·PDF', onclick: printReport }),
        el('button', { type: 'button', cls: 'btn btn-ghost', text: '성적서 파일 받기', onclick: saveReport })
      ]),
      el('div', { cls: 'row-actions' }, [
        el('button', { type: 'button', cls: 'btn btn-ghost', text: '시험 기록 저장 (.json)', onclick: saveJson }),
        el('label', { cls: 'btn btn-ghost file-btn', for: 'fatFile' }, ['시험 기록 불러오기', el('input', { type: 'file', id: 'fatFile', accept: '.json', onchange: function (e) { loadJson(e.target.files[0]); e.target.value = ''; } })])
      ]),
      el('p', { cls: 'status', id: 'fatStatus', role: 'status' }),
      el('p', { cls: 'saved', id: 'fatSaved', text: cur.updated ? '이 기기에 자동 저장 ' + cur.updated.slice(11) : '' }),
      el('ul', { cls: 'rules' }, [
        el('li', {}, [el('b', { text: '보관' }), 'QF-06 엑셀은 프로젝트 폴더 05_FAT출하에, 서명한 성적서 PDF는 같은 폴더와 고객 제출본으로 둡니다.']),
        el('li', {}, [el('b', { text: '다른 기기' }), '태블릿과 PC가 다르면 \'시험 기록 저장\' 파일을 옮겨 불러옵니다.']),
        el('li', {}, [el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '이 판넬 입력 처음부터 다시', onclick: function () {
          if (!window.confirm(cur.tag + ' 시험 입력을 모두 지우고 처음부터 시작할까요? (저장한 파일은 그대로 있습니다)')) return;
          try { localStorage.removeItem(key(A.project(), cur.tag)); } catch (e) { /* 무시 */ }
          cur = fresh(A.project(), cur.tag);
          render();
        } })])
      ])
    ])]));
    renderItems();
    renderIo();
    refreshSummary();
  }

  /** 시험 항목 카드를 다시 그린다. focusIdx: 판정을 누른 카드(같은 버튼에 초점 유지) */
  function renderItems(focusIdx) {
    var box = $('fatItems');
    if (!box) return;
    A.clear(box);
    cur.items.forEach(function (x, i) { box.appendChild(itemCard(x, i)); });
    if (focusIdx !== undefined) {
      var card = box.children[focusIdx];
      var b = card && (card.querySelector('.jb[aria-checked="true"]') || card.querySelector('.jb'));
      if (b) b.focus();
    }
  }

  window.IsoViews = window.IsoViews || {};
  window.IsoViews.fat = {
    show: function () { A = window.IsoApp; el = A.el; $ = A.$; esc = A.esc; render(); },
    _cur: function () { return cur; }, _report: function () { return reportHtml(); }, _stats: function () { return stats(); }
  };
})();
