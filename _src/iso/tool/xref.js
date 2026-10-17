/* 타사 → 슈나이더 대체: 지멘스·LS 같은 타사 형번 목록을 넣으면 대응표에서 슈나이더 대체 모델·LP를 찾아
   분류별 할인율로 원가를 계산하고, 00 견적서 품목에 원가를 채워 넘긴다(단가는 견적서 탭의 마진으로 계산).
   대응표(LP 포함)와 할인율은 이 브라우저에만 보관한다. 홈페이지 공개본이므로 대응표·단가를 코드에 넣지 않는다. */
(function () {
  'use strict';
  var TABLE_KEY = 'iso-xref-table', RATE_KEY = 'iso-xref-rates', ORIG_KEY = 'iso-xref-orig';

  function clean(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim(); }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v === null || v === undefined ? '' : v).replace(/[,\s₩원\\]|ea$/gi, '');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }
  function won(n) { return n === null || n === undefined || !isFinite(n) ? '' : Math.round(n).toLocaleString('ko-KR'); }
  /** 형번 비교용: 대문자, 공백·하이픈·점·슬래시 빼기 (6ES7231-4HF32-0XB0 = 6es7231 4hf32 0xb0) */
  function key(s) { return String(s === null || s === undefined ? '' : s).toUpperCase().replace(/[\s\-\.\/_]/g, ''); }
  /** 마지막 '-' 뒤(지멘스 버전 0XB0 등)를 뺀 비교값. 하이픈이 없으면 null */
  function looseKey(s) { var t = clean(s), i = t.lastIndexOf('-'); return i > 3 ? key(t.slice(0, i)) : null; }
  function lines(s) { return String(s === null || s === undefined ? '' : s).replace(/[ \t\u00a0]+/g, ' ').replace(/ ?\r?\n ?/g, '\n').trim(); }
  function hnorm(s) { return String(s === null || s === undefined ? '' : s).toLowerCase().replace(/[\s_\-\.\/()·:\[\]\\']/g, ''); }

  /** 엑셀에서 복사한 탭 구분 글. 여러 줄 셀("DC전원↵14 D/I")은 따옴표로 감싸여 온다. */
  function parseTsv(text) {
    var rows = [], row = [], cell = '', i = 0, s = String(text || '').replace(/\r\n?/g, '\n'), quoted = false;
    while (i < s.length) {
      var c = s[i];
      if (quoted) {
        if (c === '"' && s[i + 1] === '"') { cell += '"'; i += 2; continue; }
        if (c === '"') { quoted = false; i++; continue; }
        cell += c; i++; continue;
      }
      if (c === '"' && cell === '') { quoted = true; i++; continue; }
      if (c === '\t') { row.push(cell); cell = ''; i++; continue; }
      if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
      cell += c; i++;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return clean(x); }); });
  }

  // ---------------------------------------------------------------- 대응표
  var TABLE_HEAD = ['분류', '타사 메이커', '타사 형번', '품목명', '타사 사양', '대체 메이커', '슈나이더 모델', '배수', 'LP', '비고', '확인필요'];
  var TABLE_FIELDS = ['group', 'fromMaker', 'from', 'name', 'fromSpec', 'toMaker', 'to', 'ratio', 'lp', 'note', 'check'];
  // 앞에서부터 맞춰 본다: '대체 메이커'가 '메이커'보다, '타사 사양'이 '사양'보다 먼저
  var TSYN = [
    ['ratio', ['배수', '대체수량', '수량배수']],
    ['toMaker', ['대체메이커', '대응메이커']],
    ['to', ['슈나이더', 'schneider', '대체모델', '대응모델', '대체품', '모델명']],
    ['from', ['타사형번', '타사모델', '기존형번', '기존모델', '규격', '형번', '품번', 'partno', 'orderno']],
    ['fromMaker', ['타사메이커', '메이커', '재질', '브랜드', '제조사', 'maker', 'brand']],
    ['fromSpec', ['타사사양', '하이사', '사양']],
    ['name', ['품목명', '품명', '품목']],
    ['lp', ['lp', 'listprice', '정가', '리스트가', '리스트']],
    ['group', ['분류', '구분', '제품군', '할인그룹']],
    ['check', ['확인필요']],
    ['note', ['remark', '비고', '주의', '참고']]
  ];
  function classify(text, syn, used) {
    var h = hnorm(text);
    if (!h || h.length > 24) return null;
    for (var i = 0; i < syn.length; i++) {
      var k = syn[i][0];
      if (used[k] !== undefined) continue;
      for (var j = 0; j < syn[i][1].length; j++) {
        var w = syn[i][1][j];
        if (/[가-힣]/.test(w) || w.length >= 5 ? h.indexOf(w) >= 0 : h === w || h.indexOf(w + '(') === 0) return k;
      }
    }
    return null;
  }
  function detect(rows, syn, need) {
    var best = null;
    for (var r = 0; r < Math.min(rows.length, 30); r++) {
      var used = {}, hits = 0;
      (rows[r] || []).forEach(function (cell, c) { var k = classify(cell, syn, used); if (k) { used[k] = c; hits++; } });
      if (need(used) && (!best || hits > best.hits)) best = { headerRow: r, map: used, hits: hits };
    }
    return best;
  }
  /** 슈나이더 모델로 할인 분류 짐작(대응표에 분류가 없을 때) */
  function groupOf(model) {
    var m = key(model);
    if (!m) return '';
    if (/^(TM\d|TMC|BMX|BME|LMC|TSX)/.test(m)) return 'PLC';
    if (/^(HMI|PFX|GP\d|SP5|PS\d|XBT)/.test(m)) return 'HMI';
    if (/^ATV/.test(m)) return '인버터';
    if (/^ATS/.test(m)) return '소프트스타터';
    if (/^(LXM|BCH|BMH|BSH)/.test(m)) return '서보';
    return '기타';
  }
  function makerOf(model) { return /^(PFX|GP\d|SP5|PS5)/.test(key(model)) ? 'Pro-face' : 'Schneider'; }
  function entryFrom(o) {
    var e = {};
    TABLE_FIELDS.forEach(function (f) { e[f] = f === 'note' || f === 'fromSpec' ? lines(o[f]) : clean(o[f]); });
    var lp = num(o.lp), ratio = num(o.ratio);
    e.lp = lp === null ? '' : String(Math.round(lp));
    e.ratio = ratio && ratio > 0 ? String(ratio) : '1';
    if (!e.group) e.group = groupOf(e.to);
    if (!e.toMaker && e.to) e.toMaker = makerOf(e.to);
    e.check = /^(y|yes|o|v|✓|예|확인|필요)/i.test(e.check) ? 'Y' : '';
    return e;
  }
  /** 대응표 시트(행 배열) → 항목. 머리글에 타사 형번(규격)과 슈나이더 모델 또는 LP가 있어야 한다. */
  function parseTable(rows) {
    var det = detect(rows, TSYN, function (u) { return u.from !== undefined && (u.to !== undefined || u.lp !== undefined); });
    if (!det) return null;
    var m = det.map, out = [];
    for (var r = det.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [], o = {};
      Object.keys(m).forEach(function (k) { o[k] = row[m[k]]; });
      if (!clean(o.from)) continue;
      out.push(entryFrom(o));
    }
    return { entries: out, map: m };
  }
  function tableAoa(entries) {
    return [TABLE_HEAD].concat(entries.map(function (e) {
      return TABLE_FIELDS.map(function (f) { var v = e[f]; return (f === 'lp' || f === 'ratio') && num(v) !== null ? num(v) : v || ''; });
    }));
  }
  function indexTable(entries) {
    var exact = {}, loose = {};
    entries.forEach(function (e) {
      var k = key(e.from), lk = looseKey(e.from);
      (exact[k] = exact[k] || []).push(e);
      if (lk) (loose[lk] = loose[lk] || []).push(e);
    });
    return { exact: exact, loose: loose };
  }
  /** 형번으로 대응표 찾기: 같은 형번(하이픈·대소문자 무시) → 끝 버전만 다른 형번('유사') */
  function lookup(code, idx) {
    var k = key(code);
    if (!k) return { how: 'none', entries: [] };
    if (idx.exact[k]) return { how: 'exact', entries: idx.exact[k] };
    var lk = looseKey(code);
    if (lk && idx.loose[lk]) return { how: 'loose', entries: idx.loose[lk] };
    if (!lk) {
      var hits = Object.keys(idx.loose).filter(function (x) { return x.length >= 8 && k.indexOf(x) === 0 && k.length - x.length <= 5; });
      if (hits.length === 1) return { how: 'loose', entries: idx.loose[hits[0]] };
    }
    return { how: 'none', entries: [] };
  }

  // ---------------------------------------------------------------- 타사 품목 목록
  var ISYN = [
    ['qty', ['수량', 'qty', "q'ty", 'quantity', 'pcs']],
    ['maker', ['메이커', '제조사', '브랜드', '재질', 'maker', 'brand']],
    ['code', ['형번', '규격', '품번', '모델', '타입', 'partno', 'orderno', 'model', 'type', 'spec']],
    ['name', ['품목명', '품명', '품목', '명칭', 'item', 'name']]
  ];
  function looksCode(s) { var t = clean(s); return t.length >= 5 && /\d/.test(t) && /[a-z]/i.test(t) && !/\s{2,}/.test(t) && t.split(' ').length <= 2; }
  /** 붙여 넣은 표·엑셀 시트 → [{name, maker, code, qty}]. 머리글이 없으면 형번처럼 생긴 칸과 마지막 숫자 칸을 쓴다. */
  function parseInput(rows) {
    var det = detect(rows, ISYN, function (u) { return u.code !== undefined; }), out = [];
    if (det && det.hits >= 2) {
      var m = det.map;
      for (var r = det.headerRow + 1; r < rows.length; r++) {
        var row = rows[r] || [], g = function (k) { return m[k] === undefined ? '' : row[m[k]]; };
        var code = clean(g('code'));
        if (!code || /^(합\s*계|소\s*계|총\s*계|total)$/i.test(code)) continue;
        var qn = num(g('qty'));
        out.push({ name: clean(g('name')), maker: clean(g('maker')), code: code, qty: qn === null ? 1 : qn });
      }
      return out;
    }
    rows.forEach(function (row) {
      var cells = (row || []).map(clean), ci = -1, qty = null;
      for (var i = 0; i < cells.length; i++) if (looksCode(cells[i])) { ci = i; break; }
      if (ci < 0) return;
      for (var j = cells.length - 1; j > ci; j--) { var n = num(cells[j]); if (n !== null && n > 0) { qty = n; break; } }
      out.push({ name: ci > 0 && !/^\d+$/.test(cells[ci - 1]) ? cells[ci - 1] : '', maker: '', code: cells[ci], qty: qty === null ? 1 : qty });
    });
    return out;
  }

  // ---------------------------------------------------------------- 변환·원가
  function unitCost(lp, rate) {
    var l = num(lp), d = num(rate);
    if (l === null || d === null || d < 0 || d >= 100) return null;
    return Math.round(l * (1 - d / 100));
  }
  /** 타사 품목 → 결과 행. 대응표에 한 형번이 여러 줄이면(예: CPU + 아날로그 출력 모듈) 줄마다 한 행. */
  function convert(inputs, entries) {
    var idx = indexTable(entries), out = [];
    inputs.forEach(function (inp) {
      var hit = lookup(inp.code, idx);
      if (!hit.entries.length) { out.push(row(inp, null, 'none')); return; }
      hit.entries.forEach(function (e) { out.push(row(inp, e, e.to ? hit.how : 'nosub')); });
    });
    return out;
  }
  function row(inp, e, how) {
    var ratio = e ? num(e.ratio) || 1 : 1;
    return { name: inp.name || (e && e.name) || '', maker: inp.maker || (e && e.fromMaker) || '', code: inp.code, inQty: inp.qty,
      how: how, src: e, to: e ? e.to : '', toMaker: e ? e.toMaker : '', lp: e ? e.lp : '', group: e ? e.group : '',
      qty: String(+(inp.qty * ratio).toFixed(3)), note: e ? e.note : '', check: !!(e && e.check), fromSpec: e ? e.fromSpec : '' };
  }
  function rowCost(r, rates) {
    var c = r.to ? unitCost(r.lp, rates[r.group || '기타']) : null, qn = num(r.qty);
    return { unit: c, amount: c !== null && qn !== null ? c * qn : null, lpAmount: num(r.lp) !== null && qn !== null ? num(r.lp) * qn : null };
  }
  /** 결과 행 → 견적서 품목(원가만 채움, 단가는 견적서 탭이 마진으로 계산) */
  function toItems(rows, rates, withOrig) {
    var items = [], skipped = [];
    rows.forEach(function (r) {
      var c = rowCost(r, rates);
      if (!r.to || c.unit === null || !num(r.qty)) { skipped.push(r); return; }
      var nm = r.name || r.group || '대체품';
      items.push({ bom: true, name: withOrig && r.code ? nm + ' (기존 ' + r.code + ')' : nm, spec: r.to, maker: r.toMaker || makerOf(r.to),
        qty: String(num(r.qty)), unit: 'EA', cost: String(c.unit), price: '' });
    });
    return { items: items, skipped: skipped };
  }
  /** 결과 행에서 고친 모델·LP·분류를 대응표에 반영(없던 형번이면 새 줄) */
  function upsert(entries, r) {
    var ratio = num(r.qty) && r.inQty ? num(r.qty) / r.inQty : 1;
    var o = { group: r.group, fromMaker: r.maker, from: r.code, name: r.name, fromSpec: r.fromSpec, toMaker: r.toMaker,
      to: r.to, ratio: ratio > 0 && Math.abs(ratio - Math.round(ratio)) < 1e-9 ? Math.round(ratio) : 1, lp: r.lp, note: r.note, check: r.check ? 'Y' : '' };
    var e = r.src && entries.indexOf(r.src) >= 0 ? r.src : null;
    if (e && r.how === 'loose') e = null; // 유사 형번은 원래 줄을 두고 이 형번을 따로 적는다
    if (e) {
      var ne = entryFrom(Object.assign({}, e, { to: o.to, lp: o.lp, group: o.group, ratio: o.ratio, toMaker: o.to === e.to ? e.toMaker : '' }));
      Object.keys(ne).forEach(function (k) { e[k] = ne[k]; });
    } else { e = entryFrom(o); entries.push(e); }
    r.src = e; r.how = 'exact'; r.toMaker = e.toMaker; r.group = e.group;
    return e;
  }
  function changedFromTable(r) {
    var e = r.src;
    if (!r.to) return false;
    if (!e || r.how === 'loose' || r.how === 'nosub') return true;
    return clean(e.to) !== clean(r.to) || num(e.lp) !== num(r.lp) || clean(e.group) !== clean(r.group) ||
      Math.abs((num(r.qty) || 0) - r.inQty * (num(e.ratio) || 1)) > 1e-9;
  }

  var api = { parseTsv: parseTsv, parseTable: parseTable, parseInput: parseInput, convert: convert, lookup: lookup, indexTable: indexTable,
    unitCost: unitCost, rowCost: rowCost, toItems: toItems, upsert: upsert, tableAoa: tableAoa, groupOf: groupOf, key: key, changedFromTable: changedFromTable };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------------------------------------------------------------- 화면 (00 견적서 탭 2단계 안)
  var A, el, $, table = null, rates = {}, rows = [], mounted = false;
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function msg(text, kind) { var s = $('xMsg'); s.textContent = text; s.className = 'status' + (kind ? ' ' + kind : ''); }
  function keepTable() { return store(TABLE_KEY, JSON.stringify(table)); }
  function today() { var d = new Date(); return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }

  function groups() {
    var g = {};
    (table ? table.entries : []).forEach(function (e) { if (e.to) g[e.group || '기타'] = 1; });
    rows.forEach(function (r) { if (r.to) g[r.group || '기타'] = 1; });
    Object.keys(rates).forEach(function (k) { if (num(rates[k]) !== null) g[k] = 1; });
    return Object.keys(g).sort();
  }
  function renderTableInfo() {
    var box = $('xTableInfo');
    A.clear(box);
    if (!table) {
      box.appendChild(el('span', { cls: 'sub', text: '대응표 없음 — 타사 형번 · 슈나이더 모델 · LP 열이 있는 엑셀을 등록하세요(머리글: 규격 또는 타사 형번, 모델명 또는 슈나이더 모델, LP, 분류, 배수, 비고). 「대응표 엑셀 받기」로 빈 서식을 받을 수 있습니다.' }));
      return;
    }
    var n = table.entries.length, sub = table.entries.filter(function (e) { return e.to; }).length;
    box.appendChild(el('span', { cls: 'chip chip-ok', text: '대응표' }));
    box.appendChild(el('span', { cls: 'file-name', text: ' ' + table.name }));
    box.appendChild(el('span', { cls: 'sub', text: ' · ' + n + '개 형번 (대체품 있음 ' + sub + ')' + (table.dirty ? ' · 이 브라우저에서 고친 줄 ' + table.dirty + '개 — 「대응표 엑셀 받기」로 공용 폴더에 보관하세요' : '') }));
  }
  function renderRates() {
    var box = $('xRates');
    A.clear(box);
    var gs = groups();
    if (!gs.length) return;
    box.appendChild(el('span', { cls: 'x-rates-h', text: '할인율 (LP 대비 %, 분류별)' }));
    gs.forEach(function (g) {
      var id = 'xr-' + g.replace(/[^\w가-힣]/g, '_'), hint = el('span', { cls: 'sub' });
      var inp = el('input', { type: 'text', id: id, cls: 'num-in', inputmode: 'decimal', value: rates[g] || '', placeholder: '0',
        oninput: function () { rates[g] = inp.value; store(RATE_KEY, JSON.stringify(rates)); setHint(); refreshCosts(); } });
      function setHint() { var d = num(inp.value); hint.textContent = d !== null && d >= 0 && d < 100 ? '→ LP × ' + +(1 - d / 100).toFixed(4) : '비어 있으면 원가 계산 안 함'; inp.classList.toggle('invalid', inp.value !== '' && !(d !== null && d >= 0 && d < 100)); }
      setHint();
      box.appendChild(el('span', { cls: 'q-inline' }, [el('label', { for: id, text: g }), inp, el('span', { text: '%' }), hint]));
    });
  }

  var HOW = { exact: ['일치', 'chip-ok'], loose: ['끝 버전만 다름 · 확인', 'chip-warn'], none: ['대응표에 없음', 'chip-bad'], nosub: ['대체품 없음', 'chip-bad'] };
  function renderRows() {
    var tb = $('xTable').querySelector('tbody');
    A.clear(tb);
    $('xResult').hidden = !rows.length;
    rows.forEach(function (r, i) {
      var tr = el('tr', { cls: r.to ? null : 'x-miss' });
      function inp(k, cls, label) {
        var x = el('input', { type: 'text', value: r[k] || '', cls: cls || null, 'aria-label': (i + 1) + '행 ' + label, inputmode: /x-n/.test(cls || '') ? 'decimal' : null,
          oninput: function () {
            var prev = r[k];
            r[k] = x.value;
            if (k === 'to') { // 분류를 직접 고치지 않았으면 모델로 다시 짐작
              r.toMaker = r.src && clean(r.src.to) === clean(x.value) ? r.src.toMaker : makerOf(x.value);
              if (!r.group || r.group === groupOf(prev)) { r.group = groupOf(x.value); tr.querySelector('.x-group').value = r.group; }
              tr.classList.toggle('x-miss', !r.to);
            }
            if (k === 'to' || k === 'group') renderRates();
            updateRow(r); renderSum();
          } });
        return el('td', {}, [x]);
      }
      var how = HOW[r.how] || HOW.none, chips = [el('span', { cls: 'chip ' + how[1], text: how[0] })];
      if (r.check) chips.push(el('span', { cls: 'chip chip-warn', text: '확인 필요' }));
      var save = el('button', { type: 'button', cls: 'btn btn-ghost btn-sm x-save', text: '대응표에 저장', hidden: true,
        onclick: function () {
          if (!table) table = { name: '이 브라우저에서 만든 대응표', entries: [], dirty: 0 };
          upsert(table.entries, r); table.dirty = (table.dirty || 0) + 1; keepTable();
          renderTableInfo(); renderRows(); renderSum();
          msg(r.code + ' → ' + r.to + ' 을(를) 대응표에 저장했습니다(이 브라우저). 다른 직원과 같이 쓰려면 「대응표 엑셀 받기」로 공용 폴더의 대응표를 바꾸세요.', 'ok');
        } });
      [el('td', { cls: 'c-no', text: String(i + 1) }),
        el('td', { cls: 'x-from' }, [el('b', { text: r.code }), el('span', { cls: 'sub', text: [r.maker, r.name].filter(Boolean).join(' · ') })]),
        el('td', { cls: 'x-num', text: String(+r.inQty.toFixed(3)) }),
        el('td', { cls: 'x-how' }, chips),
        inp('to', 'x-to', '슈나이더 모델'),
        inp('qty', 'x-n x-qty', '대체 수량'),
        inp('group', 'x-group', '분류'),
        inp('lp', 'x-n x-lp', 'LP'),
        el('td', { cls: 'x-num x-rate' }),
        el('td', { cls: 'x-num x-unit' }),
        el('td', { cls: 'x-num x-amt' }),
        el('td', { cls: 'x-note' }, [r.note ? el('span', { text: r.note }) : null, el('div', {}, [save])])
      ].forEach(function (td) { tr.appendChild(td); });
      r._tr = tr;
      tb.appendChild(tr);
      updateRow(r);
    });
    renderSum();
  }
  function updateRow(r) {
    if (!r._tr) return;
    var c = rowCost(r, rates), d = num(rates[r.group || '기타']);
    r._tr.querySelector('.x-rate').textContent = r.to && d !== null ? d + '%' : '';
    r._tr.querySelector('.x-unit').textContent = won(c.unit);
    r._tr.querySelector('.x-amt').textContent = won(c.amount);
    r._tr.querySelector('.x-save').hidden = !changedFromTable(r);
    r._tr.classList.toggle('x-norate', !!r.to && c.unit === null);
  }
  function refreshCosts() { rows.forEach(updateRow); renderSum(); }
  function renderSum() {
    var box = $('xSum');
    A.clear(box);
    if (!rows.length) return;
    var lp = 0, cost = 0, ok = 0, miss = 0, norate = 0;
    rows.forEach(function (r) {
      var c = rowCost(r, rates);
      if (!r.to) { miss++; return; }
      if (c.unit === null) { norate++; return; }
      ok++; lp += c.lpAmount || 0; cost += c.amount || 0;
    });
    box.appendChild(el('span', {}, [el('b', { text: '원가 합계 ' + won(cost) + ' 원' }), ' · LP 합계 ' + won(lp) + ' 원 · 원가 계산 ' + ok + '행']));
    if (norate) box.appendChild(el('span', { cls: 'x-warn', text: ' · LP·할인율 빈 행 ' + norate }));
    if (miss) box.appendChild(el('span', { cls: 'x-warn', text: ' · 대체품 못 찾음 ' + miss + '행 (모델·LP를 적으면 넣을 수 있음)' }));
  }

  function run(inputs, from) {
    if (!inputs.length) { msg(from + '에서 형번을 찾지 못했습니다. 형번(규격)과 수량 열을 복사해 붙여 넣으세요.', 'bad'); return; }
    rows = convert(inputs, table ? table.entries : []);
    renderRates(); renderRows();
    var miss = rows.filter(function (r) { return !r.to; }).length, loose = rows.filter(function (r) { return r.how === 'loose'; }).length;
    msg(from + ': 타사 ' + inputs.length + '품목 → 대체 ' + (rows.length - miss) + '행' + (loose ? ' (끝 버전만 다른 형번 ' + loose + '행 — 사양 확인)' : '') +
      (miss ? '. 못 찾은 ' + miss + '행은 슈나이더 모델·LP를 적고 「대응표에 저장」하면 다음부터 자동으로 찾습니다.' : '.') + (table ? '' : ' 대응표가 없습니다 — 먼저 대응표 엑셀을 등록하세요.'), miss || !table ? '' : 'ok');
  }
  function onTableFile(file) {
    if (!file) return;
    if (!window.XLSX) { msg('엑셀 읽기 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.', 'bad'); return; }
    A.readWorkbook(file).then(function (wb) {
      var best = null;
      wb.SheetNames.forEach(function (n) {
        var t = parseTable(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true, blankrows: false }));
        if (t && t.entries.length && (!best || t.entries.length > best.entries.length)) best = t;
      });
      if (!best) throw new Error('타사 형번(규격)과 슈나이더 모델(모델명) 또는 LP 머리글을 찾지 못했습니다.');
      var lost = table && table.dirty ? table.dirty : 0;
      table = { name: file.name, entries: best.entries, dirty: 0 };
      var ok = keepTable();
      renderTableInfo(); renderRates();
      if (rows.length) run(rows.reduce(function (a, r) { if (!a.some(function (x) { return x.code === r.code; })) a.push({ name: r.name, maker: r.maker, code: r.code, qty: r.inQty }); return a; }, []), '새 대응표로 다시 찾기');
      else msg('대응표를 등록했습니다: ' + best.entries.length + '개 형번' + (ok ? ' (이 브라우저에 기억).' : ' (이번 화면에서만 — 브라우저 저장 공간 없음).') + (lost ? ' 이전에 이 브라우저에서 고친 ' + lost + '줄은 새 표로 바뀌었습니다.' : '') + ' 분류별 할인율을 적으세요.', 'ok');
    }).catch(function (e) { msg('대응표를 읽지 못했습니다: ' + ((e && e.message) || e), 'bad'); });
  }
  function saveTable() {
    if (!window.XLSX) { msg('엑셀 라이브러리를 불러오지 못했습니다.', 'bad'); return; }
    var ws = XLSX.utils.aoa_to_sheet(tableAoa(table ? table.entries : []));
    ws['!cols'] = [8, 11, 22, 18, 26, 11, 18, 6, 11, 30, 8].map(function (w) { return { wch: w }; });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '대응표');
    var name = '타사-슈나이더_대응표_' + today() + '.xlsx';
    A.saveFile(name, new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).then(function () {
      if (table) { table.dirty = 0; keepTable(); renderTableInfo(); }
      msg(name + ' 저장' + (table ? ' — LP가 들어 있으니 회사 공용 폴더(영업)에만 두세요.' : ' — 빈 서식입니다. 줄을 채워 「대응표 엑셀 등록」으로 넣으세요.'), 'ok');
    }, function (e) { msg(A.saveErrorText(e, '대응표'), 'bad'); });
  }
  function addToQuote() {
    var t = toItems(rows, rates, $('xOrig').checked);
    if (!t.items.length) { msg('넣을 행이 없습니다. 슈나이더 모델·LP·할인율이 모두 있어야 원가가 계산됩니다.', 'bad'); return; }
    var Q = window.IsoViews && window.IsoViews.quote;
    Q.addCosted(t.items, '타사 → 슈나이더 대체');
    msg('견적서 품목에 ' + t.items.length + '행을 넣었습니다(원가 = LP × (1 − 할인율)).' + (t.skipped.length ? ' 원가를 못 구한 ' + t.skipped.length + '행은 넣지 않았습니다.' : ''), 'ok');
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    A = window.IsoApp; el = A.el; $ = A.$;
    try { var t = JSON.parse(load(TABLE_KEY) || 'null'); if (t && Array.isArray(t.entries)) table = { name: String(t.name || '대응표'), entries: t.entries.map(entryFrom), dirty: t.dirty || 0 }; } catch (e) { table = null; }
    try { var r = JSON.parse(load(RATE_KEY) || 'null'); if (r && typeof r === 'object') rates = r; } catch (e) { rates = {}; }
    if (load(ORIG_KEY) === '0') $('xOrig').checked = false;
    $('xOrig').addEventListener('change', function () { store(ORIG_KEY, this.checked ? '1' : '0'); });
    $('xTableFile').addEventListener('change', function () { onTableFile(this.files[0]); this.value = ''; });
    $('xTableSave').addEventListener('click', saveTable);
    $('xGo').addEventListener('click', function () { run(parseInput(parseTsv($('xPaste').value)), '붙여 넣은 표'); });
    $('xFile').addEventListener('change', function () {
      var f = this.files[0]; this.value = '';
      if (!f) return;
      A.readWorkbook(f).then(function (wb) {
        var best = [];
        wb.SheetNames.forEach(function (n) { var l = parseInput(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true, blankrows: false })); if (l.length > best.length) best = l; });
        run(best, f.name);
      }).catch(function (e) { msg('엑셀을 읽지 못했습니다: ' + ((e && e.message) || e), 'bad'); });
    });
    $('xAdd').addEventListener('click', addToQuote);
    $('xClear').addEventListener('click', function () { rows = []; $('xPaste').value = ''; renderRows(); renderRates(); msg('', ''); });
    renderTableInfo(); renderRates(); renderRows();
  }

  window.IsoXref = { mount: mount, _api: api, _rows: function () { return rows; } };
})();
