/* 화면: 입력 → 문서 계획 미리보기 → zip 생성·저장 */
(function () {
  'use strict';
  var P = window.IsoProject, E = window.IsoEngine, S = window.IsoSamples, FORMS = window.ISO_FORMS;

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'cls') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'checked' || k === 'value') n[k] = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  var FIELDS_BASIC = [
    ['pj', '프로젝트 번호', 'req'], ['customer', '고객', 'req'], ['name', '프로젝트명·현장'], ['po', '계약·PO 번호'],
    ['spec', '사양서 번호·Rev'], ['due', '납기', 'date'], ['drawRev', '도면 Rev'], ['bomRev', 'BOM 번호·Rev'], ['ioRev', 'I/O 리스트 Rev'],
    ['plc', 'PLC 기종'], ['plcVer', 'PLC Ver'], ['tool', '개발도구·Ver'], ['recordRev', '작성 기록 Rev (미입력: 00)']
  ];
  var FIELDS_REQ = [
    ['laws', '적용 법규·제품규격'], ['custReq', '고객 검사·입회·기록 요구'], ['warranty', '보증기간·무상범위'],
    ['packing', '포장·운송 조건'], ['custSupply', '고객 지급품'], ['designer', '설계 책임자'],
    ['reviewer', '검토자 (설계자 외)'], ['production', '생산관리 책임자'], ['quality', '품질 담당 (입고·출하 확인)'], ['tester', '시험 담당 (FAT·SAT)'],
    ['inspector', '배선 숙련 확인자 (QF-12 승인)'], ['programmer', 'PLC 프로그램 담당'], ['meters', '계측기 관리번호 (절연·접지·멀티미터)'],
    ['witness', '고객 입회자'], ['outsourceCo', '외주 현장배선 업체'], ['previousDrawRev', '변경 전 도면 Rev (변경 시)'], ['changeReason', '도면 변경 사유'], ['changePanels', '변경 영향 판넬 Tag'], ['changeImpact', '변경 영향·수정·재검사 계획']
  ];
  var FIELDS_OPT = [['approval', '고객 승인도 필요'], ['sat', 'SAT·시운전 포함 (QF-07)'], ['outsource', '현장 배선 외주 (SF-03)']];
  var FIELDS_STD = [['stdRev', '기준표 번호·Rev'], ['stdName', '기준표 이름 (판넬 타입)']];
  var FIELDS_STORAGE = [['recordPath', '프로젝트 원본 보관 경로 (공용폴더/NAS)'], ['backupPath', '별도 저장장치의 백업 경로'], ['documentOwner', '문서관리 담당'], ['accessOwner', '접근권한 관리 담당']];

  var state = { project: {}, panels: [], bom: null, bomTotal: null, io: null, std: null, sample: false };

  // ---------------------------------------------------------------- 데이터
  function parse(kind, rows, det) {
    if (kind === 'bom' || kind === 'bomTotal') return P.parseBom(rows, det);
    if (kind === 'io') return P.parseIo(rows, det);
    return P.parseStd(rows, det);
  }
  function makeData(kind, fileName, rows, opts) {
    opts = opts || {};
    var det = P.detectColumns(rows, kind);
    return { kind: kind, fileName: fileName, rows: rows, det: det, items: parse(kind, rows, det),
      sample: !!opts.sample, wb: opts.wb || null, sheet: opts.sheet || null };
  }

  function loadSample() {
    var p = JSON.parse(JSON.stringify(S.project));
    state.panels = p.panels;
    delete p.panels;
    p.stdName = '인버터 제어반 기준표 (예시)';
    state.project = p;
    state.bom = makeData('bom', '예시_BOM.xlsx', S.bom, { sample: true });
    state.bomTotal = null;
    state.io = makeData('io', '예시_IO리스트.xlsx', S.io, { sample: true });
    state.std = makeData('std', '인버터_제어반_기준표_예시.xlsx', S.std, { sample: true });
    state.sample = true;
  }

  function clearAll() {
    $('bomBasis').value = '';
    state.project = { approval: false, sat: true, outsource: false };
    state.panels = [{ tag: '', desc: '', serial: '' }];
    state.bom = state.bomTotal = state.io = state.std = null;
    state.sample = false;
    $('sampleBar').hidden = true;
    renderAll();
    var first = $('f-pj');
    if (first) first.focus();
  }

  function readWorkbook(file) {
    return file.arrayBuffer().then(function (buf) {
      if (/\.csv$/i.test(file.name)) {
        var text;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
        catch (e) { text = new TextDecoder('euc-kr').decode(buf); }
        return XLSX.read(text.replace(/^﻿/, ''), { type: 'string' });
      }
      return XLSX.read(new Uint8Array(buf), { type: 'array' });
    });
  }
  function sheetRows(wb, name) {
    return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false, blankrows: false });
  }
  function bestSheet(wb, kind) {
    var best = wb.SheetNames[0], hits = -1;
    wb.SheetNames.forEach(function (n) {
      var d = P.detectColumns(sheetRows(wb, n), kind);
      if (d.hits > hits) { hits = d.hits; best = n; }
    });
    return best;
  }

  function onFile(kind, file) {
    if (!file) return;
    if (!window.XLSX) { setStatus('엑셀 읽기 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.', 'bad'); return; }
    readWorkbook(file).then(function (wb) {
      var sheet = bestSheet(wb, kind);
      state[kind] = makeData(kind, file.name, sheetRows(wb, sheet), { wb: wb, sheet: sheet });
      if (kind === 'std' && !state.project.stdName) state.project.stdName = file.name.replace(/\.[^.]+$/, '');
      renderData(kind);
      if (kind === 'std') renderFields();
      renderPlan();
    }).catch(function () {
      setStatus(file.name + ' 파일을 읽지 못했습니다. .xlsx, .xls, .csv 파일인지 확인하세요.', 'bad');
    });
  }

  // ---------------------------------------------------------------- 입력란
  function fieldInput(key, label, kind) {
    var id = 'f-' + key;
    var input = el('input', {
      type: kind === 'date' ? 'date' : 'text', id: id, value: state.project[key] || '', autocomplete: 'off',
      oninput: function (e) { state.project[key] = e.target.value; state.sample = false; e.target.classList.remove('invalid'); renderPlan(); }
    });
    var lab = el('label', { for: id }, [label, kind === 'req' ? el('span', { cls: 'req', text: '*' }) : null]);
    return el('div', { cls: 'field' }, [lab, input]);
  }

  function renderFields() {
    [['fieldsBasic', FIELDS_BASIC], ['fieldsReq', FIELDS_REQ], ['fieldsStd', FIELDS_STD], ['fieldsStorage', FIELDS_STORAGE]].forEach(function (g) {
      var box = $(g[0]);
      clear(box);
      g[1].forEach(function (f) { box.appendChild(fieldInput(f[0], f[1], f[2])); });
    });
    var opt = $('fieldsOpt');
    clear(opt);
    FIELDS_OPT.forEach(function (f) {
      var id = 'o-' + f[0];
      opt.appendChild(el('label', { cls: 'check', for: id }, [
        el('input', { type: 'checkbox', id: id, checked: !!state.project[f[0]],
          onchange: function (e) { state.project[f[0]] = e.target.checked; renderPlan(); } }),
        f[1]
      ]));
    });
  }

  function renderPanels() {
    var tb = $('panelTable').querySelector('tbody');
    clear(tb);
    state.panels.forEach(function (pn, i) {
      function inp(key, ph) {
        var aria = { tag: '도면 Tag', desc: '설명', serial: '제조번호' }[key] + ' (' + (i + 1) + '번째 판넬)';
        return el('input', { type: 'text', id: 'p-' + i + '-' + key, value: pn[key] || '', placeholder: ph || '', 'aria-label': aria,
          oninput: function (e) { pn[key] = e.target.value; state.sample = false; e.target.classList.remove('invalid'); renderPlan(); } });
      }
      tb.appendChild(el('tr', {}, [
        el('td', {}, [inp('tag', '예: LCP-01')]),
        el('td', {}, [inp('desc', '예: 인버터반 75kW')]),
        el('td', {}, [inp('serial', '프로젝트번호-01')]),
        el('td', {}, [el('button', { type: 'button', cls: 'btn btn-ghost btn-icon', 'aria-label': (pn.tag || '판넬') + ' 삭제', text: '✕',
          onclick: function () { state.panels.splice(i, 1); if (!state.panels.length) state.panels.push({ tag: '', desc: '', serial: '' }); renderPanels(); renderPlan(); } })])
      ]));
    });
  }

  // ---------------------------------------------------------------- 불러온 파일
  var KIND_NAME = { bom: 'BOM', bomTotal: '원본 총수량 BOM', io: 'I/O 리스트', std: '기준표' };

  function mappingBox(data) {
    var header = data.rows[data.det.headerRow] || [];
    var box = el('div', { cls: 'mapping' });
    var labels = P.LABELS[data.kind];
    Object.keys(labels).forEach(function (key) {
      var id = 'm-' + data.kind + '-' + key;
      var sel = el('select', { id: id, onchange: function (e) {
        var v = e.target.value;
        if (v === '') delete data.det.map[key]; else data.det.map[key] = +v;
        data.items = parse(data.kind, data.rows, data.det);
        renderData(data.kind);
        renderPlan();
      } });
      sel.appendChild(el('option', { value: '', text: '(없음)' }));
      header.forEach(function (h, c) {
        var o = el('option', { value: String(c), text: (P.clean(h) || '열 ' + (c + 1)) });
        if (data.det.map[key] === c) o.selected = true;
        sel.appendChild(o);
      });
      box.appendChild(el('div', { cls: 'field' }, [el('label', { for: id, text: labels[key] }), sel]));
    });
    return box;
  }

  function sheetPicker(data) {
    if (!data.wb || data.wb.SheetNames.length < 2) return null;
    var id = 's-' + data.kind;
    var sel = el('select', { id: id, onchange: function (e) {
      var d = makeData(data.kind, data.fileName, sheetRows(data.wb, e.target.value), { wb: data.wb, sheet: e.target.value });
      state[data.kind] = d;
      renderData(data.kind);
      renderPlan();
    } });
    data.wb.SheetNames.forEach(function (n) { var o = el('option', { value: n, text: n }); if (n === data.sheet) o.selected = true; sel.appendChild(o); });
    return el('div', { cls: 'field' }, [el('label', { for: id, text: '시트' }), sel]);
  }

  function table(head, rows, rowCls) {
    var thead = el('thead', {}, [el('tr', {}, head.map(function (h) { return el('th', { text: h }); }))]);
    var tbody = el('tbody');
    rows.forEach(function (r, i) {
      tbody.appendChild(el('tr', { cls: rowCls ? rowCls(i) : null }, r.map(function (c) {
        if (c && c.nodeType) return el('td', {}, [c]);
        return el('td', { text: c === null || c === undefined ? '' : String(c) });
      })));
    });
    return el('div', { cls: 'table-wrap' }, [el('table', { cls: 'tbl' }, [thead, tbody])]);
  }

  function renderData(kind) {
    var box = $(kind + 'Info');
    clear(box);
    var data = state[kind];
    if (!data) {
      var empty = { bom: 'BOM이 없으면 입고검사(QF-03)는 빈 표로 만듭니다.',
        bomTotal: '원본 총수량 BOM으로 부품별 배분의 누락·초과를 대조합니다.',
        io: 'I/O 리스트가 없으면 I/O 점검표(QF-06-1)는 번호만 있는 빈 표로 만듭니다.',
        std: '기준표가 없으면 QF-15와 FAT 성적서(QF-06)의 기준란은 비워서 만듭니다.' }[kind];
      box.appendChild(el('p', { cls: 'help', text: empty }));
      return;
    }
    var chips = [];
    if (data.sample) chips.push(el('span', { cls: 'chip chip-warn', text: '예시' }));
    var items = data.items;
    if (kind === 'bom') {
      var majors = items.filter(function (x) { return x.major; }).length;
      chips.push(el('span', { cls: 'chip', text: items.length + '행' }));
      chips.push(el('span', { cls: 'chip chip-ok', text: '주요 부품 ' + majors + '종' }));
    } else if (kind === 'io') {
      var count = {};
      items.forEach(function (x) { count[x.type || '미분류'] = (count[x.type || '미분류'] || 0) + 1; });
      chips.push(el('span', { cls: 'chip', text: items.length + '점' }));
      Object.keys(count).forEach(function (k) { chips.push(el('span', { cls: 'chip chip-ok', text: k + ' ' + count[k] })); });
    } else {
      chips.push(el('span', { cls: 'chip', text: items.length + '항목' }));
    }
    if (!items.length) chips.push(el('span', { cls: 'chip chip-bad', text: '읽은 행 없음 — 아래 열 연결을 확인하세요' }));
    box.appendChild(el('div', { cls: 'file-line' }, [el('span', { cls: 'file-name', text: data.fileName })].concat(chips).concat([
      el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '파일 빼기', onclick: function () { state[kind] = null; renderData(kind); renderPlan(); } })
    ])));
    var picker = sheetPicker(data);
    var map = mappingBox(data);
    if (picker) map.insertBefore(picker, map.firstChild);
    box.appendChild(el('details', { cls: 'more' }, [el('summary', { text: '열 연결 (' + KIND_NAME[kind] + '의 어느 열을 쓸지)' }), map]));

    if (kind === 'bomTotal') {
      box.appendChild(table(['품명', '모델·형번', '메이커', '총수량', '단위'], items.map(function (it) { return [it.name, it.model, it.maker, it.qtyText, it.unit]; })));
    } else if (kind === 'bom') {
      box.appendChild(table(['주요', '판넬', '분류', '품명', '모델·형번', '메이커', '수량·단위', '도면 기호'], items.map(function (it, i) {
        var cb = el('input', { type: 'checkbox', checked: it.major, 'aria-label': it.name + ' 주요 부품',
          onchange: function (e) { it.major = e.target.checked; renderData('bom'); renderPlan(); } });
        return [cb, it.panel, it.category, it.name, it.model, it.maker, P.clean(it.qtyText + ' ' + it.unit), it.tags.join(', ')];
      }), function (i) { return items[i].major ? null : 'minor'; }));
      box.appendChild(el('p', { cls: 'help', text: '체크한 부품이 입고검사(QF-03) 대상입니다. 부품에는 LOT 번호를 매기지 않습니다. 분류는 품명·모델로 자동으로 정했고, 체크로 바꿀 수 있습니다.' }));
    } else if (kind === 'io') {
      var shown = items.slice(0, 12).map(function (x, i) { return [i + 1, x.addr, x.tag, x.desc, x.type, x.expect]; });
      if (items.length > 12) shown.push(['', '', '', '외 ' + (items.length - 12) + '점', '', '']);
      box.appendChild(table(['No', '주소', 'Tag', '설명', '구분', '기대 동작·범위'], shown));
    } else {
      box.appendChild(table(['항목', '모델·정격·대상', '값·단위·허용범위', '방법·시험조건'], items.map(function (x) {
        return [x.item, x.target, x.value, x.method];
      })));
      if (items.some(function (x) { return /\[예시\]/.test(x.value + x.method); })) {
        box.appendChild(el('p', { cls: 'note', text: '[예시] 표시 값은 승인 전 값입니다. 실제 판넬 타입 기준표를 기술팀 총괄이 승인한 뒤 그 파일을 넣어 쓰세요.' }));
      }
    }
  }

  // ---------------------------------------------------------------- 문서 계획
  function currentProject() {
    var p = Object.assign({}, state.project);
    p.bomBasis = $('bomBasis').value;
    p.bomTotalFile = state.bomTotal ? state.bomTotal.fileName : '';
    p.panels = state.panels.map(function (x) { return { tag: P.clean(x.tag), desc: x.desc, serial: P.clean(x.serial) }; });
    return p;
  }
  function currentPlan() {
    var p = currentProject();
    var docs = P.plan(p, state.bom ? state.bom.items : [], state.io ? state.io.items : [], state.std ? state.std.items : [],
      { forms: FORMS.forms, date: P.today() });
    return { p: p, docs: docs };
  }

  function missingList() {
    var miss = [];
    if (!P.clean(state.project.pj)) miss.push('프로젝트 번호');
    if (!P.clean(state.project.customer)) miss.push('고객');
    if (!state.panels.some(function (x) { return P.clean(x.tag); })) miss.push('판넬 Tag 1개 이상');
    miss = miss.concat(P.validateInput(currentProject(), state.bom ? state.bom.items : [], $('bomBasis').value, state.io ? state.io.items : [], state.bomTotal ? state.bomTotal.items : []));
    return miss;
  }

  function renderPlan() {
    $('bomTotalWrap').hidden = $('bomBasis').value !== 'allocated';
    var r = currentPlan();
    var p = r.p, docs = r.docs;
    var tree = $('tree');
    clear(tree);
    var root = P.clean(p.pj || '프로젝트번호') + (p.name ? '_' + P.clean(p.name).replace(/\s+/g, '_') : '');
    tree.appendChild(el('div', { cls: 'root', text: root + '/' }));
    tree.appendChild(el('div', { cls: 'file index', text: '00_기록현황_' + P.clean(p.pj || '프로젝트번호') + '.xlsx' }));
    var folders = {};
    docs.forEach(function (d) { (folders[d.folder] = folders[d.folder] || []).push(d); });
    Object.keys(P.STAGE).forEach(function (f) {
      var list = folders[f] || [];
      tree.appendChild(el('div', { cls: 'folder' }, [f + '/', el('small', { text: list.length ? list.length + '개' : '빈 폴더' })]));
      list.forEach(function (d) { tree.appendChild(el('div', { cls: 'file', text: d.file })); });
    });
    $('docCount').textContent = docs.length + 1;
    $('panelCount').textContent = p.panels.filter(function (x) { return x.tag; }).length;
    var miss = missingList();
    $('missing').textContent = miss.length ? '필요한 입력: ' + miss.join(', ') : '';
    renderChecklist(p, docs.length + 1);
    var filled = FIELDS_REQ.filter(function (f) { return P.clean(state.project[f[0]]); }).length;
    $('moreReqSum').textContent = '고객 요구 · 담당자 (' + filled + '/' + FIELDS_REQ.length + ' 입력)';
  }

  function renderChecklist(p, total) {
    var list = $('checklist');
    clear(list);
    var warns = 0;
    function item(kind, title, text) {
      if (kind === 'warn') warns++;
      list.appendChild(el('li', { cls: kind }, [
        el('span', { cls: 'ic', 'aria-hidden': 'true', text: kind === 'ok' ? '✓' : (kind === 'warn' ? '!' : '–') }),
        el('span', { cls: 'txt' }, [el('b', { text: title + ' ' }), text])
      ]));
    }
    var nPanels = p.panels.filter(function (x) { return x.tag; }).length;
    item(P.clean(p.pj) && P.clean(p.customer) ? 'ok' : 'off', '프로젝트', P.clean(p.pj) ? P.clean(p.pj) : '번호·고객 입력 필요');
    item(P.clean(p.recordPath) ? 'off' : 'warn', '원본 보관', P.clean(p.recordPath) ? '입력 경로의 권한·백업 확인 필요' : '공용폴더/NAS 경로 미확정 — 확정 후 기록');
    var noLot = p.panels.filter(function (x) { return x.tag && !x.serial; }).length;
    if (!nPanels) item('off', '판넬', 'Tag 입력 필요');
    else if (noLot) item('warn', '판넬 LOT', noLot + '면 제조번호 비어 있음 — 명판·QF-04에 쓸 번호를 채우세요');
    else item('ok', '판넬', nPanels + '면 · LOT(제조번호) 입력됨');
    if (p.bomBasis === 'allocated') {
      var totalErrors = P.compareBom(state.bom ? state.bom.items : [], state.bomTotal ? state.bomTotal.items : []);
      item(totalErrors.length ? 'warn' : 'ok', '총수량 대조', totalErrors.length ? '원본·배분 수량 확인 필요' : '업로드한 원본과 배분 합계 일치 — 승인본 여부 별도 확인');
    }
    [['bom', 'BOM', '행', '없으면 QF-03 빈 표'], ['io', 'I/O 리스트', '점', '없으면 QF-06-1 빈 표'], ['std', '시험 기준표', '항목', '없으면 기준란 빈칸']].forEach(function (d) {
      var data = state[d[0]];
      if (!data) item('off', d[1], d[3]);
      else if (data.sample && !state.sample) item('warn', d[1], '예시 파일 사용 중 — 실제 파일로 바꾸세요');
      else if (d[0] === 'std' && data.items.some(function (x) { return /\[예시\]/.test(x.value + x.method); })) item('warn', d[1], '[예시] 값 포함 — 승인된 기준표로 바꾸세요');
      else item('ok', d[1], data.items.length + d[2]);
    });
    $('mDocCount').textContent = total;
    $('mWarn').textContent = warns ? '확인 ' + warns + '건' : (missingList().length ? '입력 필요' : '준비됨');
  }

  // ---------------------------------------------------------------- 저장
  var dlPromise = (window.claude && typeof window.claude.use === 'function') ? window.claude.use('downloads') : null;

  function saveFile(name, data) {
    if (dlPromise) {
      return dlPromise.then(function (dl) {
        if (!dl) { var e = new Error('unavailable'); e.code = 'unavailable'; throw e; }
        return dl.save({ filename: name, data: data });
      });
    }
    var url = URL.createObjectURL(data);
    var a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return Promise.resolve({ status: 'saved' });
  }

  function saveError(e, what) {
    var code = e && e.code;
    if (code === 'declined') return setStatus(what + ' 저장을 취소했습니다.', '');
    if (code === 'rate_limited') return setStatus('저장 창이 이미 열려 있습니다. 그 창을 먼저 닫으세요.', 'bad');
    if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') {
      return setStatus('이 화면에서는 파일 저장을 쓸 수 없습니다. 생성기 HTML 파일을 PC에서 크롬으로 열어 쓰세요.', 'bad');
    }
    setStatus(what + '을(를) 저장하지 못했습니다: ' + ((e && e.message) || code || '알 수 없는 오류'), 'bad');
  }

  function setStatus(text, kind) {
    var s = $('genStatus');
    s.textContent = text;
    s.className = 'status' + (kind ? ' ' + kind : '');
  }

  function libsReady() {
    if (window.ExcelJS && window.JSZip) return true;
    setStatus('엑셀·압축 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.', 'bad');
    return false;
  }

  function generate() {
    var miss = missingList();
    if (miss.length) {
      if (!P.clean(state.project.pj)) $('f-pj').classList.add('invalid');
      if (!P.clean(state.project.customer)) $('f-customer').classList.add('invalid');
      if (!state.panels.some(function (x) { return P.clean(x.tag); })) { var t = $('p-0-tag'); if (t) t.classList.add('invalid'); }
      if (miss.indexOf('BOM 수량 기준 선택') >= 0) $('bomBasis').classList.add('invalid');
      setStatus('묶음을 만들지 못했습니다. 필요한 입력: ' + miss.slice(0, 3).join(', ') + (miss.length > 3 ? ' 외 ' + (miss.length - 3) + '건' : ''), 'bad');
      // 비어 있는 첫 칸으로 이동(휴대폰에서는 오른쪽 안내가 안 보이므로)
      var first = document.querySelector('#view-pack .invalid');
      if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus({ preventScroll: true }); }
      else { var mi = $('missing'); if (mi) mi.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return;
    }
    if (!libsReady()) return;
    var r = currentPlan();
    var date = P.today();
    var btn = $('btnGen');
    btn.disabled = true;
    $('btnGenM').disabled = true;
    $('progress').hidden = false;
    $('progressBar').style.width = '0%';
    setStatus('문서를 만드는 중…', '');
    P.generate({
      ExcelJS: window.ExcelJS, JSZip: window.JSZip, engine: E, forms: FORMS, logo: window.ISO_LOGO,
      projectJson: projectJson(),
      onProgress: function (done, total) {
        $('progressBar').style.width = Math.round(done / total * 100) + '%';
        setStatus('문서를 만드는 중… ' + done + ' / ' + total, '');
      }
    }, r.p, r.docs, date).then(function (out) {
      setStatus(out.count + '개 문서를 묶었습니다. 저장 창에서 확인하세요.', '');
      return saveFile(out.name, out.data).then(function () {
        setStatus(out.name + ' 저장 — ' + out.count + '개 문서', 'ok');
      }, function (e) { saveError(e, '문서 묶음'); });
    }).catch(function (e) {
      setStatus('문서를 만들지 못했습니다: ' + ((e && e.message) || e), 'bad');
    }).then(function () {
      btn.disabled = false;
      $('btnGenM').disabled = false;
      $('progress').hidden = true;
    });
  }

  function sampleFile(kind) {
    if (!libsReady()) return;
    var src = { bom: [S.bom, '예시_BOM.xlsx', 'BOM'], bomTotal: [[['품명', '모델', '메이커', '수량', '단위']], '프로젝트_총수량_BOM_양식.xlsx', '총수량 BOM'], io: [S.io, '예시_IO리스트.xlsx', 'I/O 리스트'],
      std: [S.std, '시험기준표_양식_예시.xlsx', '기준표'] }[kind];
    var wb = new window.ExcelJS.Workbook();
    var ws = wb.addWorksheet(src[2]);
    src[0].forEach(function (r) { ws.addRow(r); });
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF6' } };
    ws.columns.forEach(function (col, i) {
      var w = 8;
      src[0].forEach(function (r) { w = Math.max(w, Math.min(48, E.units(r[i] === undefined ? '' : r[i], 10) + 2)); });
      col.width = w;
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    wb.xlsx.writeBuffer().then(function (buf) {
      return saveFile(src[1], new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    }).then(function () { setStatus(src[1] + ' 저장', 'ok'); }, function (e) { saveError(e, src[1]); });
  }

  // ---------------------------------------------------------------- 연결
  function wireDrops() {
    Array.prototype.forEach.call(document.querySelectorAll('.drop'), function (d) {
      var kind = d.getAttribute('data-kind');
      var input = d.querySelector('input[type="file"]');
      input.addEventListener('change', function () { onFile(kind, input.files[0]); input.value = ''; });
      d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('over'); });
      d.addEventListener('dragleave', function () { d.classList.remove('over'); });
      d.addEventListener('drop', function (e) {
        e.preventDefault();
        d.classList.remove('over');
        if (e.dataTransfer && e.dataTransfer.files.length) onFile(kind, e.dataTransfer.files[0]);
      });
      var lab = d.querySelector('label');
      lab.setAttribute('tabindex', '0');
      lab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
      var sb = d.querySelector('[data-sample]');
      sb.addEventListener('click', function () { sampleFile(sb.getAttribute('data-sample')); });
    });
  }

  function renderAll() {
    renderFields();
    renderPanels();
    renderData('bom');
    renderData('bomTotal');
    renderData('io');
    renderData('std');
    renderPlan();
  }

  function start() {
    loadSample();
    $('bomBasis').value = 'perPanel';   // 예시 BOM은 판넬 1면당 수량
    renderAll();
    wireDrops();
    $('btnClear').addEventListener('click', clearAll);
    $('bomBasis').addEventListener('change', function () { $('bomBasis').classList.remove('invalid'); renderPlan(); });
    $('btnSaveProject').addEventListener('click', function () {
      var blob = new Blob([projectJson()], {type: 'application/json'});
      if (blob.size > 20 * 1024 * 1024) { setStatus('프로젝트 저장 파일이 20MB를 초과합니다. BOM·I/O·기준표를 필요한 시트만 있는 파일로 바꿔 저장하세요.', 'bad'); return; }
      saveFile((P.clean(state.project.pj) || '프로젝트') + '_입력_' + Date.now() + '.json', blob)
        .then(function () { setStatus('프로젝트 입력을 저장했습니다. 실제 작성 엑셀도 별도로 보관하세요.', 'ok'); }, function (e) { saveError(e, '프로젝트'); });
    });
    $('fileProject').addEventListener('change', function (event) {
      var input = event.target, file = input.files[0];
      input.value = '';
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { setStatus('프로젝트 파일은 20MB 이하만 불러올 수 있습니다.', 'bad'); return; }
      file.text().then(function (text) {
        var saved = P.readProject(text);
        state = saved.state;
        $('bomBasis').value = saved.bomBasis;
        $('sampleBar').hidden = !state.sample;
        renderAll();
        setStatus('저장한 프로젝트를 불러왔습니다. 생성 전 변경·승인 기준을 확인하세요.', 'ok');
      }).catch(function (e) { setStatus('불러오기 실패: ' + e.message, 'bad'); });
    });
    $('btnAddPanel').addEventListener('click', function () {
      state.panels.push({ tag: '', desc: '', serial: '' });
      renderPanels();
      renderPlan();
      var t = $('p-' + (state.panels.length - 1) + '-tag');
      if (t) t.focus();
    });
    $('btnSerial').addEventListener('click', function () {
      var pj = P.clean(state.project.pj) || '프로젝트번호';
      state.panels.forEach(function (x, i) { x.serial = pj + '-' + String(i + 1).padStart(2, '0'); });
      renderPanels();
      renderPlan();
    });
    $('btnGen').addEventListener('click', generate);
    $('btnGenM').addEventListener('click', generate);
    wireTabs();
  }

  /** 프로젝트 입력 저장 파일(묶음 zip에도 00_프로젝트정보_*.json으로 들어감). 원본 엑셀 통째(wb)는 빼고 읽은 표만 둔다. */
  function projectJson() {
    function slim(d) { return d ? { kind: d.kind, fileName: d.fileName, rows: d.rows, det: d.det, items: d.items, sample: d.sample } : null; }
    var st = { project: state.project, panels: state.panels, bom: slim(state.bom), bomTotal: slim(state.bomTotal), io: slim(state.io), std: slim(state.std), sample: state.sample };
    return JSON.stringify({ format: 'DI-ISO-PROJECT', version: 1, savedAt: new Date().toISOString(), bomBasis: $('bomBasis').value, state: st }, null, 1);
  }
  /** 다른 도구(현황판)에서 저장 파일 내용을 넣어 01 탭을 그 프로젝트로 바꾼다 */
  function loadProjectText(text) {
    var saved = P.readProject(text);
    state = saved.state;
    $('bomBasis').value = saved.bomBasis || '';
    $('sampleBar').hidden = !state.sample;
    renderAll();
  }

  // ---------------------------------------------------------------- 다른 도구(명판·라벨, FAT, 현황판)와 공유
  function saveErrorText(e, what) {
    var code = e && e.code;
    if (code === 'declined') return what + ' 저장을 취소했습니다.';
    if (code === 'rate_limited') return '저장 창이 이미 열려 있습니다. 그 창을 먼저 닫으세요.';
    if (code === 'unavailable' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') {
      return '이 화면에서는 파일 저장을 쓸 수 없습니다. 도구 HTML 파일을 PC에서 크롬으로 열어 쓰세요.';
    }
    return what + '을(를) 저장하지 못했습니다: ' + ((e && e.message) || code || '알 수 없는 오류');
  }

  /** 인쇄용 HTML을 숨은 틀에 넣고 인쇄 창을 연다. 인쇄 창을 못 열면 false. */
  function printHtml(html) {
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
    document.body.appendChild(f);
    var w = f.contentWindow, d = w.document;
    d.open(); d.write(html); d.close();
    var ready = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
    var wait = new Promise(function (r) { setTimeout(r, 2500); });
    return Promise.race([ready, wait]).then(function () {
      return new Promise(function (resolve) {
        setTimeout(function () {
          var ok = true;
          try { w.focus(); w.print(); } catch (e) { ok = false; }
          setTimeout(function () { f.remove(); }, 60000);
          resolve(ok);
        }, 200);
      });
    });
  }

  var VIEWS = ['pack', 'labels', 'fat', 'dash'];
  function showView(name) {
    if (VIEWS.indexOf(name) < 0) name = 'pack';
    VIEWS.forEach(function (v) {
      var on = v === name;
      $('view-' + v).hidden = !on;
      var t = $('tab-' + v);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    try { localStorage.setItem('iso-tool-view', name); } catch (e) { /* 저장 안 돼도 됨 */ }
    var mod = window.IsoViews && window.IsoViews[name];
    if (mod && mod.show) mod.show();
  }
  function wireTabs() {
    var tabs = VIEWS.map(function (v) { return $('tab-' + v); });
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { showView(t.getAttribute('data-view')); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (j === null) return;
        e.preventDefault();
        j = (j + tabs.length) % tabs.length;
        tabs[j].focus();
        showView(tabs[j].getAttribute('data-view'));
      });
    });
    var first = (location.hash || '').slice(1);
    if (VIEWS.indexOf(first) < 0) { try { first = localStorage.getItem('iso-tool-view') || 'pack'; } catch (e) { first = 'pack'; } }
    showView(first);
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /** 인쇄용 문서(A4). 화면에서 열면 안내 띠가 보이고 인쇄 때는 숨는다. */
  function docHtml(title, body, css, orient) {
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap">' +
      '<style>@page{size:A4 ' + (orient || 'portrait') + ';margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}' +
      'body{font-family:"Pretendard","IBM Plex Sans KR","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif;color:#1d2735;' +
      '-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.screen-note{font-size:13px;padding:10px 16px;background:#0a2a55;color:#fff;border-bottom:3px solid #e83e30}' +
      '@media screen{body{background:#e9edf2}.sheet{margin:10mm auto;box-shadow:0 1px 6px rgba(0,0,0,.2);background:#fff}}' +
      '@media print{.screen-note{display:none}}' + (css || '') + '</style></head><body>' +
      '<div class="screen-note">인쇄: Ctrl+P → 배율 <b>실제 크기(100%)</b>, 여백 <b>없음</b>, 배경 그래픽 켜기. PDF로 저장하려면 대상에서 \'PDF로 저장\'을 고릅니다.</div>' +
      body + '</body></html>';
  }

  window.IsoApp = {
    esc: esc, docHtml: docHtml,
    $: $, el: el, clear: clear, P: P, E: E, S: S, FORMS: FORMS,
    saveFile: saveFile, saveErrorText: saveErrorText, printHtml: printHtml, showView: showView,
    readWorkbook: readWorkbook, sheetRows: sheetRows,
    state: function () { return state; },
    project: currentProject,
    plan: currentPlan,
    bomItems: function () { return state.bom ? state.bom.items : []; },
    ioItems: function () { return state.io ? state.io.items : []; },
    isSample: function () { return !!state.sample; },
    projectJson: projectJson, loadProjectText: loadProjectText
  };

  window.IsoViews = window.IsoViews || {};
  // 명판·라벨, FAT, 현황판 스크립트가 등록된 뒤 시작한다
  setTimeout(function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }, 0);
})();
