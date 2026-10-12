
/* 견적서: 회사 견적서 양식(엑셀)에 품목·금액을 채워 같은 양식으로 견적서를 만들고,
   수주되면 부품 행만 BOM으로 01 기록 묶음 생성기에 넘긴다.
   원가·단가·금액은 이 탭과 견적서 엑셀에만 남기고 ISO 쪽(프로젝트 저장 파일·묶음 zip)으로는 넘기지 않는다. */
(function () {
  'use strict';
  var A, el, $;
  var DRAFT_KEY = 'iso-quote-draft', TPL_KEY = 'iso-quote-template', LASTNO_KEY = 'iso-quote-lastno';
  // 회사 견적서 갑지(동인엔시스_견적서_*.xlsx)에 적힌 그대로
  var COMPANY = ' 사업자등록번호 605-81-27818 | 대표이사  백민기\n\n    부산광역시 부산진구 진연로9번길 47(양정동)\n\n' +
    '     Tel.  051-862-3668   |   Fax.  051-862-3325\n\n          E-mail.   dongin@donginmne.com\n\n         www.donginensis.com';
  var FOOTER = [
    '  ISO 9001:2015 | ISO 14001:2015 | ISO 45001:2018 인증(Smart Factory & DX Solution Provider)',
    '   | 산업 자동화 | Plant & Factory Automation, Process Control, Condition Monitoring, Industrial AI & Data Analytics, Edge Computing ',
    '   | 산업용 제어 판넬 설계 및 제작 | Electric Control Panel, Small/Compact & Explosion-Proof Enclosure,Smart Factory Infrastructure ',
    '   | 조선/해양 | Electrical Propulsion, Energy Storage System(ESS), Smart Ship&Digital Twin, Marine Data Management System',
    '   | 주요 취급 브랜드 | ABB, Danfoss, Fuji, Ex-tech, nVent ERICO, ROSSI, Schneider, SIEMENS,Phoenix Contact,Weidmüller,Corvus Energy,Eaton'
  ];
  // 부품이 아닌 행(BOM에서 뺌): 인건비·이윤·설계·시운전·운송·설치 등
  var NON_PART = /인건비|노무비|이윤|공과|잡비|일반관리|관리비|설계비|설계\s*용역|엔지니어링|시운전|시험비|test\s*비|운송|운반|배송|설치|공사|교육|출장|경비|할인|네고|nego|man\s*\/?\s*day|프로그램\s*(작성|개발)|프로그래밍|용역/i;

  var FIELDS = [
    ['to', '수신 (고객사)', 'req'], ['attn', '참조 (고객 담당)'], ['tel', 'TEL.'], ['fax', 'Fax.'],
    ['date', '견적일자', 'date'], ['no', '문서번호'], ['person', '담당자 (당사)'], ['valid', '유효기간'],
    ['title', '제목', 'wide']
  ];
  var TERMS = [['delivery', '납품기한'], ['incoterm', '인도조건'], ['payment', '결제조건']];

  var q = null, tpl = null, built = false, saveTimer = null, isoArm = 0, lockWired = false;

  // ---------------------------------------------------------------- 공통
  function clean(s) { return String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim(); }
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v === null || v === undefined ? '' : v).replace(/[,\s₩원\\]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }
  function won(n) { return n === null || n === undefined || !isFinite(n) ? '' : Math.round(n).toLocaleString('ko-KR'); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function yymmdd(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? m[1].slice(2) + m[2] + m[3] : ''; }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /** 엑셀 NUMBERSTRING(n,1)과 같은 한글 금액: 12,345,000 → 일천이백삼십사만오천 */
  function hangul(n) {
    n = Math.floor(Math.abs(n || 0));
    if (!n) return '영';
    var D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'], S = ['', '십', '백', '천'], B = ['', '만', '억', '조', '경'];
    var out = '', g = 0;
    while (n > 0) {
      var part = n % 10000, s = '', d = 0;
      n = Math.floor(n / 10000);
      while (part > 0) { var x = part % 10; if (x) s = D[x] + S[d] + s; part = Math.floor(part / 10); d++; }
      if (s) out = s + B[g] + out;
      g++;
    }
    return out;
  }

  function suggestNo(dateIso) {
    var last = load(LASTNO_KEY) || '', ymd = yymmdd(dateIso || todayIso());
    if (/\d{6}/.test(last)) return last.replace(/\d{6}/, ymd);
    return ymd ? ymd + '-01' : '';
  }
  function blank() {
    var d = todayIso();
    return { to: '', attn: '', tel: '', fax: '', date: d, no: suggestNo(d), person: '', valid: '발행일로부터 30일', title: '',
      delivery: '', incoterm: '귀사 지정(국내) 도착도', payment: '현금', notes: '현장 설치 공사비 제외 입니다.',
      items: [], profitPct: '', floor1000: true, costCols: false, form: 'std', panelTags: '', qtyBasis: 'total', pj: '' };
  }
  function blankItem() { return { bom: true, name: '', spec: '', maker: '', qty: '1', unit: 'EA', cost: '', price: '' }; }
  function hasText(it) { return !!(clean(it.name) || clean(it.spec)); }

  // ---------------------------------------------------------------- 금액
  function amount(it) { var a = num(it.qty), b = num(it.price); return a !== null && b !== null ? a * b : null; }
  function profitLine(sub) {
    var pct = num(q.profitPct);
    if (!pct) return null;
    var amt = Math.round(sub * pct / 100 / 1000) * 1000;
    return { bom: false, name: '기업이윤 및 공과잡비 ' + pct + '%', spec: '', maker: '', qty: '1', unit: '식', cost: '', price: String(amt), auto: true };
  }
  /** 견적서에 찍힐 행(내용 있는 품목 + 이윤 행) */
  function outLines() {
    var lines = q.items.filter(hasText);
    var sub = lines.reduce(function (s, it) { return s + (amount(it) || 0); }, 0);
    var p = profitLine(sub);
    return p ? lines.concat([p]) : lines;
  }
  function totals() {
    var lines = outLines(), sum = 0, cost = 0, costSale = 0, missing = 0;
    lines.forEach(function (it) {
      var a = amount(it);
      if (a === null) { if (!it.auto) missing++; return; }
      sum += a;
      var c = num(it.cost), qn = num(it.qty);
      if (c !== null && qn !== null) { cost += c * qn; costSale += a; }
    });
    var supply = q.floor1000 ? Math.floor(sum / 1000) * 1000 : Math.round(sum);
    var vat = Math.round(supply * 0.1);
    return { lines: lines, sum: sum, supply: supply, vat: vat, total: supply + vat, cost: cost, costSale: costSale, missing: missing };
  }

  // ---------------------------------------------------------------- 엑셀에서 품목 읽기
  var QSYN = [
    ['qty', ['수량', 'qty', 'quantity', '개수', 'pieces', 'pcs', "q'ty"]],
    ['unit', ['단위', 'unit', 'uom']],
    ['amount', ['금액', 'amount', 'total']],
    ['price', ['단가', '판매가', '견적가', '특가', 'unitprice', 'price']],
    ['cost', ['원가', '매입가', '입고가', '구매가', '매입단가', 'cost']],
    ['maker', ['메이커', '제조사', '제작사', '브랜드', 'maker', 'manufacturer', 'brand', 'mfr']],
    ['name', ['품명', '품목', '명칭', '부품명', '자재명', 'type', 'item', 'name']],
    ['spec', ['규격', '사양', '모델', '형번', '형식', 'description', 'desc', 'spec', 'model', 'partno', 'partnumber', 'reference']]
  ];
  function hnorm(s) { return String(s === null || s === undefined ? '' : s).toLowerCase().replace(/[\s_\-\.\/()·:\[\]\\]/g, ''); }
  function classifyHead(text, used) {
    var h = hnorm(text);
    if (!h || h.length > 24) return null;
    for (var i = 0; i < QSYN.length; i++) {
      var k = QSYN[i][0];
      if (used[k] !== undefined) continue;
      for (var j = 0; j < QSYN[i][1].length; j++) {
        var s = QSYN[i][1][j];
        if (/[가-힣]/.test(s) || s.length >= 4 ? h.indexOf(s) >= 0 : h === s) {
          if (k === 'amount' && s === 'total' && h !== 'total') continue;
          return k;
        }
      }
    }
    return null;
  }
  function detectCols(rows) {
    var best = { headerRow: -1, map: {}, hits: 0 };
    for (var r = 0; r < Math.min(rows.length, 40); r++) {
      var used = {}, hits = 0;
      (rows[r] || []).forEach(function (cell, c) { var k = classifyHead(cell, used); if (k) { used[k] = c; hits++; } });
      if (hits > best.hits && (used.name !== undefined || used.spec !== undefined)) best = { headerRow: r, map: used, hits: hits };
    }
    var m = best.map;
    // '품 명 및 규 격'처럼 두 칸을 합친 머리글: 품명 오른쪽 빈 머리글 칸을 규격으로
    if (best.hits && m.name !== undefined && m.spec === undefined) {
      var head = rows[best.headerRow] || [];
      if (!clean(head[m.name + 1]) && rows.slice(best.headerRow + 1, best.headerRow + 40).some(function (r) { return clean((r || [])[m.name + 1]); })) m.spec = m.name + 1;
    }
    if (best.hits && m.name === undefined) { m.name = m.spec; delete m.spec; }
    return best;
  }
  var SKIP_ROW = /^(합\s*계|소\s*계|총\s*계|total|subtotal|sum)$/i;
  function itemsFromRows(rows, det) {
    var m = det.map, out = [];
    for (var r = det.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      var get = function (k) { return m[k] === undefined ? '' : row[m[k]]; };
      var name = clean(get('name')), spec = clean(get('spec'));
      if (!name && !spec) continue;
      if (SKIP_ROW.test(name) || SKIP_ROW.test(spec)) continue;
      var qty = get('qty'), price = num(get('price')), amt = num(get('amount')), qn = num(qty);
      if (price === null && amt !== null && qn) price = amt / qn;
      var cost = num(get('cost'));
      out.push({ bom: !NON_PART.test(name + ' ' + spec), name: name, spec: spec, maker: clean(get('maker')),
        qty: qty === '' || qty === null || qty === undefined ? '1' : clean(qty), unit: clean(get('unit')),
        cost: cost === null ? '' : String(Math.round(cost)), price: price === null ? '' : String(Math.round(price)) });
    }
    return out;
  }
  function importItems(list, from) {
    if (!list.length) { setStatus(from + '에서 품목을 찾지 못했습니다. 품명·모델(규격)·수량 머리글이 있는지 확인하세요.', 'bad'); return; }
    q.items = q.items.filter(hasText).concat(list);
    renderItems();
    changed();
    var off = list.filter(function (it) { return !it.bom; }).length;
    setStatus(from + '에서 ' + list.length + '개 품목을 넣었습니다' + (off ? ' (인건비·이윤 등 ' + off + '행은 BOM 제외로 표시)' : '') + '. 단가·수량을 확인하세요.', 'ok');
  }
  function onImportFile(file) {
    if (!file) return;
    if (!window.XLSX) { setStatus('엑셀 읽기 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.', 'bad'); return; }
    A.readWorkbook(file).then(function (wb) {
      var best = null;
      wb.SheetNames.forEach(function (n) {
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true, blankrows: false });
        var det = detectCols(rows);
        if (det.hits && (!best || det.hits > best.det.hits)) best = { rows: rows, det: det, name: n };
      });
      importItems(best ? itemsFromRows(best.rows, best.det) : [], file.name);
    }).catch(function (e) { setStatus('엑셀을 읽지 못했습니다: ' + ((e && e.message) || e), 'bad'); });
  }
  function onPaste() {
    var text = $('qPaste').value;
    var rows = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return l.split('\t'); });
    if (!rows.length) return;
    var det = detectCols(rows.slice(0, 1));
    if (det.hits < 2) { // 머리글 없이 붙여 넣음: 품명, 규격, 메이커, 수량, 단위, 단가 순서
      det = { headerRow: -1, map: { name: 0, spec: 1, maker: 2, qty: 3, unit: 4, price: 5 }, hits: 6 };
    }
    importItems(itemsFromRows(rows, det), '붙여 넣은 표');
    $('qPaste').value = '';
    $('qPasteBox').hidden = true;
  }

  // ---------------------------------------------------------------- 화면
  function setStatus(text, kind) { var s = $('qStatus'); s.textContent = text; s.className = 'status' + (kind ? ' ' + kind : ''); }

  function field(def, group) {
    var k = def[0], id = 'q-' + k;
    var input = el('input', { type: def[2] === 'date' ? 'date' : 'text', id: id, value: q[k] || '', autocomplete: 'off',
      oninput: function () { q[k] = input.value; if (k === 'date' && yymmdd(input.value)) syncNoDate(); input.classList.remove('invalid'); changed(); } });
    return el('div', { cls: 'field' + (def[2] === 'wide' ? ' wide' : '') }, [
      el('label', { for: id }, [def[1], def[2] === 'req' ? el('span', { cls: 'req', text: '*' }) : null]), input]);
  }
  function syncNoDate() {
    var ymd = yymmdd(q.date);
    if (/\d{6}/.test(q.no || '')) { q.no = q.no.replace(/\d{6}/, ymd); $('q-no').value = q.no; }
  }

  function renderFields() {
    A.clear($('qFields'));
    FIELDS.forEach(function (d) { $('qFields').appendChild(field(d)); });
    A.clear($('qTerms'));
    TERMS.forEach(function (d) { $('qTerms').appendChild(field(d)); });
    $('q-notes').value = q.notes || '';
    $('q-profit').value = q.profitPct || '';
    $('q-floor').checked = q.floor1000 !== false;
    $('q-costCols').checked = !!q.costCols;
    $('q-panels').value = q.panelTags || '';
    $('q-basis').value = q.qtyBasis || 'total';
    $('q-pj').value = q.pj || '';
  }

  function cellInput(it, k, cls, label) {
    var inp = el('input', { type: 'text', value: it[k] || '', cls: cls || null, 'aria-label': label, inputmode: cls === 'q-n' ? 'decimal' : null,
      oninput: function () { it[k] = inp.value; updateRow(it); changed(); } });
    return el('td', {}, [inp]);
  }
  function renderItems() {
    var tb = $('qTable').querySelector('tbody');
    A.clear(tb);
    if (!q.items.length) q.items.push(blankItem());
    q.items.forEach(function (it, i) {
      var cb = el('input', { type: 'checkbox', checked: it.bom, 'aria-label': (i + 1) + '행 BOM 포함',
        onchange: function () { it.bom = cb.checked; tr.classList.toggle('q-nonbom', !it.bom); changed(); } });
      var tr = el('tr', { cls: it.bom ? null : 'q-nonbom' }, [
        el('td', { cls: 'c-no', text: String(i + 1) }),
        el('td', { cls: 'c-bom' }, [cb]),
        cellInput(it, 'name', null, (i + 1) + '행 품명'),
        cellInput(it, 'spec', null, (i + 1) + '행 규격·모델'),
        cellInput(it, 'maker', null, (i + 1) + '행 메이커'),
        cellInput(it, 'qty', 'q-n', (i + 1) + '행 수량'),
        cellInput(it, 'unit', null, (i + 1) + '행 단위'),
        cellInput(it, 'cost', 'q-n', (i + 1) + '행 원가'),
        cellInput(it, 'price', 'q-n', (i + 1) + '행 단가'),
        el('td', { cls: 'q-amt' }),
        el('td', { cls: 'q-mg' }),
        el('td', { cls: 'c-act' }, [
          el('button', { type: 'button', cls: 'btn btn-icon', text: '↑', 'aria-label': (i + 1) + '행 위로', disabled: i === 0,
            onclick: function () { var t = q.items[i - 1]; q.items[i - 1] = it; q.items[i] = t; renderItems(); changed(); } }),
          el('button', { type: 'button', cls: 'btn btn-icon', text: '×', 'aria-label': (i + 1) + '행 삭제',
            onclick: function () { q.items.splice(i, 1); renderItems(); changed(); } })])
      ]);
      it._tr = tr;
      tb.appendChild(tr);
      updateRow(it);
    });
  }
  function updateRow(it) {
    if (!it._tr) return;
    var a = amount(it), c = num(it.cost), p = num(it.price);
    it._tr.querySelector('.q-amt').textContent = won(a);
    var mg = it._tr.querySelector('.q-mg');
    if (c !== null && p) { var r = (p - c) / p * 100; mg.textContent = r.toFixed(1) + '%'; mg.className = 'q-mg' + (r < 10 ? ' low' : ''); }
    else { mg.textContent = ''; mg.className = 'q-mg'; }
  }

  function renderSummary() {
    var t = totals(), box = $('qSum');
    A.clear(box);
    function row(label, value, cls) { box.appendChild(el('dt', { text: label })); box.appendChild(el('dd', { cls: cls || null, text: value })); }
    row('품목 합계', won(t.sum) + ' 원');
    if (q.floor1000 && t.sum !== t.supply) row('천원 미만 절사', '−' + won(t.sum - t.supply) + ' 원');
    row('공급가', won(t.supply) + ' 원');
    row('부가세 10%', won(t.vat) + ' 원');
    row('총계', won(t.total) + ' 원', 'grand');
    box.appendChild(el('p', { cls: 'q-words', text: t.supply ? '일금 ' + hangul(t.supply) + '원정 (₩' + won(t.supply) + ', 부가세 별도)' : '' }));
    var mb = $('qMargin');
    A.clear(mb);
    if (t.cost) {
      var m = t.costSale - t.cost;
      mb.appendChild(el('p', {}, [el('b', { text: '마진 (화면 전용) ' }), won(m) + ' 원 · ' + (t.costSale ? (m / t.costSale * 100).toFixed(1) : '0') + '%']));
      mb.appendChild(el('p', { cls: 'sub', text: '원가를 적은 행 기준: 원가 ' + won(t.cost) + ' / 견적 ' + won(t.costSale) + (t.supply !== t.sum ? ' · 절사 전' : '') }));
    }
    mb.hidden = !t.cost;
    var lines = q.items.filter(hasText);
    $('qCount').textContent = lines.length;
    $('qBomCount').textContent = lines.filter(function (it) { return it.bom; }).length;
    $('qMissing').textContent = t.missing ? '단가·수량이 숫자가 아닌 행 ' + t.missing + '개 (금액 빠짐)' : '';
  }

  function renderTpl() {
    var useTpl = q.form === 'tpl' && !!tpl;
    $('q-form-std').checked = !useTpl;
    $('q-form-tpl').checked = useTpl;
    $('q-form-tpl').disabled = !tpl;
    var info = $('qTplInfo');
    A.clear(info);
    if (tpl) {
      info.appendChild(el('span', { cls: 'chip chip-ok', text: '등록됨' }));
      info.appendChild(el('span', { cls: 'file-name', text: ' ' + tpl.name }));
      if (tpl.found) info.appendChild(el('span', { cls: 'sub', text: ' · ' + tpl.found }));
    } else {
      info.appendChild(el('span', { cls: 'sub', text: '등록한 엑셀 양식 없음 — 예전 견적서 엑셀을 등록하면 그 배치 그대로도 만들 수 있고, 들어 있는 직인 그림을 가져옵니다.' }));
    }
    $('qTplClear').hidden = !tpl;
    var sb = $('qSealBox');
    A.clear(sb);
    if (seal) {
      sb.appendChild(el('img', { src: 'data:image/' + (seal.ext === 'jpeg' ? 'jpeg' : 'png') + ';base64,' + seal.data, alt: '등록된 직인', width: '44', height: '44' }));
      sb.appendChild(el('span', { cls: 'sub', text: seal.builtin ? '회사 직인(기본 등록) · 표준 양식 대표자 (인) 칸에 찍힘' : '직접 고른 직인 · 이 브라우저에만 보관' }));
      sb.appendChild(el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '직인 빼기', onclick: function () { keepSeal(null); setStatus('직인 없이 (인) 표시만 넣습니다.', ''); } }));
    } else {
      sb.appendChild(el('span', { cls: 'sub', text: '직인 빼고 만듦 — (인) 표시만 들어갑니다.' }));
    }
    var fileIn = el('input', { type: 'file', accept: '.png,.jpg,.jpeg', 'aria-label': '직인 그림 고르기', onchange: function () { onSealFile(fileIn.files[0]); fileIn.value = ''; } });
    sb.appendChild(el('span', { cls: 'btn btn-ghost btn-sm file-btn', text: seal ? '직인 그림 바꾸기' : '직인 그림 고르기' }, [fileIn]));
    if (!seal || !seal.builtin) sb.appendChild(el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '기본 직인으로', onclick: function () { store(SEAL_KEY, null); loadCompany(); renderTpl(); setStatus('회사 기본 직인을 씁니다.', 'ok'); } }));
  }
  function onSealFile(file) {
    if (!file) return;
    file.arrayBuffer().then(function (buf) {
      var u8 = new Uint8Array(buf), png = !!pngSize(u8), jpg = u8[0] === 0xff && u8[1] === 0xd8;
      if (!png && !jpg) throw new Error('png 또는 jpg 그림만 쓸 수 있습니다.');
      if (u8.length > 600 * 1024) throw new Error('600KB 이하 그림을 쓰세요.');
      keepSeal({ data: b64(buf), ext: png ? 'png' : 'jpeg' }, file.name);
    }).catch(function (e) { setStatus('직인 그림을 읽지 못했습니다: ' + e.message, 'bad'); });
  }
  function renderCompany() {
    var box = $('qCoFields');
    A.clear(box);
    CO_FIELDS.forEach(function (f) {
      var id = 'qco-' + f[0];
      var inp = el('input', { type: 'text', id: id, value: co[f[0]] || '', autocomplete: 'off',
        oninput: function () { co[f[0]] = inp.value; store(CO_KEY, JSON.stringify(co)); } });
      box.appendChild(el('div', { cls: 'field' + (f[0] === 'addr' || f[0] === 'bizItem' ? ' wide' : '') }, [el('label', { for: id, text: f[1] }), inp]));
    });
  }

  function changed() {
    renderSummary();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { store(DRAFT_KEY, JSON.stringify(slimQuote())); }, 400);
  }
  function slimQuote() {
    var o = JSON.parse(JSON.stringify(q, function (k, v) { return k === '_tr' ? undefined : v; }));
    return o;
  }

  function build() {
    $('qFile').addEventListener('change', function () { onImportFile(this.files[0]); this.value = ''; });
    var d = document.querySelector('#view-quote .q-drop');
    d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('over'); });
    d.addEventListener('dragleave', function () { d.classList.remove('over'); });
    d.addEventListener('drop', function (e) { e.preventDefault(); d.classList.remove('over'); if (e.dataTransfer && e.dataTransfer.files.length) onImportFile(e.dataTransfer.files[0]); });
    var lab = d.querySelector('label');
    lab.setAttribute('tabindex', '0');
    lab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('qFile').click(); } });
    $('qPasteOpen').addEventListener('click', function () { $('qPasteBox').hidden = false; $('qPaste').focus(); });
    $('qPasteGo').addEventListener('click', onPaste);
    $('qPasteClose').addEventListener('click', function () { $('qPasteBox').hidden = true; });
    $('qAdd').addEventListener('click', function () {
      q.items.push(blankItem()); renderItems(); changed();
      var ins = $('qTable').querySelectorAll('tbody tr:last-child input[type="text"]'); if (ins[0]) ins[0].focus();
    });
    $('qClearItems').addEventListener('click', function () {
      if ($('qClearItems').dataset.arm !== '1') { $('qClearItems').dataset.arm = '1'; $('qClearItems').textContent = '한 번 더 누르면 모두 지움'; setTimeout(function () { $('qClearItems').dataset.arm = ''; $('qClearItems').textContent = '품목 모두 지우기'; }, 4000); return; }
      $('qClearItems').dataset.arm = ''; $('qClearItems').textContent = '품목 모두 지우기';
      q.items = []; renderItems(); changed();
    });
    // 단가 = 원가 ÷ 0.8 (마진 20%). 20처럼 1 이상을 적으면 마진 %로 보고 1 − 20/100으로 나눈다.
    function divisor() {
      var d = num($('q-mul').value);
      if (d === null || d <= 0 || d >= 100) return null;
      return d < 1 ? d : 1 - d / 100;
    }
    function mulHint() { var d = divisor(); $('qMulHint').textContent = d ? '마진 ' + +((1 - d) * 100).toFixed(1) + '%' : '0.8 또는 20처럼'; }
    $('q-mul').addEventListener('input', mulHint);
    $('qMarkup').addEventListener('click', function () {
      var d = divisor();
      if (!d) { $('q-mul').classList.add('invalid'); setStatus('나눌 값을 적으세요: 0.8(= 마진 20%) 또는 마진 % 숫자 20.', 'bad'); return; }
      $('q-mul').classList.remove('invalid');
      var n = 0;
      q.items.forEach(function (it) { var c = num(it.cost); if (c !== null && c > 0) { it.price = String(Math.round(c / d / 100) * 100); n++; } });
      renderItems(); changed();
      setStatus(n ? n + '개 행의 단가를 원가 ÷ ' + +d.toFixed(4) + '(마진 ' + +((1 - d) * 100).toFixed(1) + '%, 100원 단위 반올림)로 계산했습니다. 원가가 없는 행은 그대로입니다.' : '원가를 적은 행이 없습니다. 원가 칸을 먼저 채우세요.', n ? 'ok' : '');
    });
    $('q-notes').addEventListener('input', function () { q.notes = this.value; changed(); });
    $('q-profit').addEventListener('input', function () { q.profitPct = this.value; changed(); });
    $('q-floor').addEventListener('change', function () { q.floor1000 = this.checked; changed(); });
    $('q-costCols').addEventListener('change', function () { q.costCols = this.checked; changed(); });
    $('q-panels').addEventListener('input', function () { q.panelTags = this.value; changed(); });
    $('q-basis').addEventListener('change', function () { q.qtyBasis = this.value; changed(); });
    $('q-pj').addEventListener('input', function () { q.pj = this.value; changed(); });
    $('qTplFile').addEventListener('change', function () { onTemplateFile(this.files[0]); this.value = ''; });
    $('qTplClear').addEventListener('click', function () { tpl = null; store(TPL_KEY, null); q.form = 'std'; renderTpl(); changed(); setStatus('등록한 양식을 지웠습니다. 표준 양식으로 만듭니다(직인은 그대로 보관).', ''); });
    ['q-form-std', 'q-form-tpl'].forEach(function (id) { $(id).addEventListener('change', function () { q.form = $('q-form-tpl').checked && tpl ? 'tpl' : 'std'; renderTpl(); changed(); }); });
    $('qCoReset').addEventListener('click', function () { store(CO_KEY, null); loadCompany(); renderCompany(); setStatus('공급자 정보를 기본값(사업자등록증 기준)으로 되돌렸습니다.', ''); });
    $('qMake').addEventListener('click', makeQuote);
    $('qSave').addEventListener('click', saveQuoteFile);
    $('qOpen').addEventListener('change', function () { openQuoteFile(this.files[0]); this.value = ''; });
    $('qNew').addEventListener('click', function () {
      if ($('qNew').dataset.arm !== '1') { $('qNew').dataset.arm = '1'; $('qNew').textContent = '한 번 더 누르면 새 견적'; setTimeout(function () { $('qNew').dataset.arm = ''; $('qNew').textContent = '새 견적'; }, 4000); return; }
      $('qNew').dataset.arm = ''; $('qNew').textContent = '새 견적';
      q = blank(); renderAll(); changed(); setStatus('새 견적을 시작합니다. 이전 견적은 저장 파일(.json)로 보관하세요.', '');
    });
    $('qToIso').addEventListener('click', sendToIso);
    $('qBomXlsx').addEventListener('click', saveBomXlsx);
    built = true;
  }
  function renderAll() { renderFields(); renderItems(); renderSummary(); renderTpl(); renderCompany(); }

  // ---------------------------------------------------------------- 견적 저장·불러오기
  function fileBase() {
    var s = function (t) { return A.P.clean(t).replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, '').slice(0, 30); };
    return '동인엔시스_견적서_' + (s(q.to) || '고객') + '_' + (s(q.title) || '제목') + '_' + (yymmdd(q.date) || yymmdd(todayIso()));
  }
  function saveQuoteFile() {
    var blob = new Blob([JSON.stringify({ format: 'DI-QUOTE', version: 1, savedAt: new Date().toISOString(), quote: slimQuote() }, null, 1)], { type: 'application/json' });
    A.saveFile(fileBase() + '.json', blob).then(function () { setStatus('견적 입력을 저장했습니다(원가·단가 포함 — 영업 폴더에 보관).', 'ok'); }, function (e) { setStatus(A.saveErrorText(e, '견적'), 'bad'); });
  }
  function openQuoteFile(file) {
    if (!file) return;
    file.text().then(function (text) {
      var o = JSON.parse(text);
      if (!o || o.format !== 'DI-QUOTE' || !o.quote || !Array.isArray(o.quote.items)) throw new Error('견적 저장 파일이 아닙니다.');
      var base = blank();
      Object.keys(base).forEach(function (k) { if (o.quote[k] !== undefined && typeof o.quote[k] === typeof base[k]) base[k] = o.quote[k]; });
      base.items = o.quote.items.filter(function (it) { return it && typeof it === 'object'; }).map(function (it) {
        var b = blankItem();
        Object.keys(b).forEach(function (k) { if (it[k] !== undefined) b[k] = k === 'bom' ? !!it[k] : String(it[k]); });
        return b;
      });
      q = base; renderAll(); changed();
      setStatus(file.name + ' 을(를) 불러왔습니다.', 'ok');
    }).catch(function (e) { setStatus('불러오기 실패: ' + e.message, 'bad'); });
  }

  // ---------------------------------------------------------------- 견적서 양식(엑셀)
  function b64(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a.buffer; }

  function onTemplateFile(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { setStatus('양식은 .xlsx 파일만 쓸 수 있습니다(.xls는 엑셀에서 .xlsx로 저장 후).', 'bad'); return; }
    file.arrayBuffer().then(function (buf) {
      var wb = new ExcelJS.Workbook();
      return wb.xlsx.load(buf).then(function () {
        var ws = pickSheet(wb);
        if (!ws) throw new Error('품목표 머리글(NO·품명·수량·단가)을 찾지 못했습니다.');
        var L = locate(ws);
        var found = ['수신', '견적일자', '문서번호', '제목', '공급가', '부가세', '총계'].filter(function (k) { return L.labels[k]; });
        tpl = { name: file.name, data: b64(buf), found: '품목 칸 ' + (L.end - L.head) + '줄 · ' + found.join('·') };
        var ok = store(TPL_KEY, JSON.stringify(tpl));
        renderTpl();
        setStatus('견적서 양식을 등록했습니다' + (ok ? ' (이 브라우저에 기억)' : ' (이번 화면에서만 — 브라우저 저장 공간 없음)') + '. 품목이 칸보다 많으면 줄을 늘려 만듭니다.', 'ok');
      });
    }).catch(function (e) { setStatus('양식을 읽지 못했습니다: ' + ((e && e.message) || e), 'bad'); });
  }

  function cellText(c) {
    var v = c.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
      if (v.richText) return v.richText.map(function (t) { return t.text; }).join('');
      if (v.formula || v.sharedFormula) return v.result === undefined || v.result === null ? '' : String(v.result);
      if (v.text) return String(v.text);
      if (v instanceof Date) return '';
    }
    return String(v);
  }
  function formulaOf(c) { var v = c.value; return v && typeof v === 'object' && v.formula ? String(v.formula) : ''; }
  function merges(ws) {
    var out = [];
    Object.keys(ws._merges || {}).forEach(function (k) { var m = ws._merges[k] && ws._merges[k].model; if (m) out.push({ top: m.top, left: m.left, bottom: m.bottom, right: m.right }); });
    return out;
  }
  function mergeAt(ws, r, c) {
    var ms = ws.__m || (ws.__m = merges(ws));
    for (var i = 0; i < ms.length; i++) { var m = ms[i]; if (r >= m.top && r <= m.bottom && c >= m.left && c <= m.right) return m; }
    return null;
  }
  function headRow(ws) {
    for (var r = 1; r <= Math.min(ws.rowCount, 120); r++) {
      var cols = {}, row = ws.getRow(r);
      for (var c = 1; c <= Math.min(ws.columnCount, 30); c++) {
        var t = cellText(row.getCell(c)).replace(/\s/g, '').toLowerCase();
        if (!t) continue;
        if (cols.no === undefined && (t === 'no' || t === 'no.' || t === '순번')) cols.no = c;
        else if (cols.name === undefined && /품명/.test(t)) cols.name = c;
        else if (cols.qty === undefined && /^수량/.test(t)) cols.qty = c;
        else if (cols.unit === undefined && /^단위/.test(t)) cols.unit = c;
        else if (cols.price === undefined && /^단가/.test(t)) cols.price = c;
        else if (cols.amount === undefined && /^금액/.test(t)) cols.amount = c;
        else if (cols.spec === undefined && /규격|모델|사양/.test(t)) cols.spec = c;
      }
      if (cols.name && cols.qty && cols.price) { cols.row = r; return cols; }
    }
    return null;
  }
  function pickSheet(wb) {
    var hit = null;
    wb.worksheets.forEach(function (ws) { if (!hit && headRow(ws)) hit = ws; });
    return hit;
  }
  /** 양식에서 칸 위치를 찾는다: 머리글 행, 품목 영역, 이름표 옆 값 칸, 합계 칸 */
  function locate(ws) {
    ws.__m = null;
    var H = headRow(ws), L = { head: H.row, cols: H, labels: {}, cond: {} };
    if (!H.amount) H.amount = H.price + 1;
    var nm = mergeAt(ws, H.row, H.name);
    if (!H.spec && nm && nm.right > H.name) H.spec = H.name + 1;
    var lastCol = H.amount;
    function right(r, c) { var m = mergeAt(ws, r, c); return ws.getCell(r, (m ? m.right : c) + 1); }
    var LABELS = [['수신', /^수신(처)?$/], ['참조', /^참조$/], ['TEL', /^(tel\.?|전화(번호)?)$/], ['FAX', /^(fax\.?|팩스)$/],
      ['견적일자', /^(견적)?일자$|^견적일$/], ['문서번호', /^(문서|견적)번호$/], ['담당자', /^담당(자)?$/], ['유효기간', /^유효기간$/], ['제목', /^(제목|건명)$/],
      ['공급가', /^공급가(액)?$/], ['부가세', /^부가(세|가치세)$/], ['총계', /^(총계|합계금액|총합계)$/]];
    var maxR = Math.min(ws.rowCount, 300);
    for (var r = 1; r <= maxR; r++) {
      for (var c = 1; c <= lastCol; c++) {
        var cell = ws.getCell(r, c);
        if (cell.isMerged && cell.master !== cell) continue;
        var raw = cellText(cell), t = raw.replace(/\s/g, '').toLowerCase(), f = formulaOf(cell);
        if (/NUMBERSTRING/i.test(f) || /^일금/.test(t)) { if (!L.words) { L.words = cell; L.wordsRow = r; } continue; }
        if (/^※/.test(t)) {
          if (/납품|납기/.test(t) && !L.cond.delivery) L.cond.delivery = cell;
          else if (/인도/.test(t) && !L.cond.incoterm) L.cond.incoterm = cell;
          else if (/결제|지불/.test(t) && !L.cond.payment) L.cond.payment = cell;
          continue;
        }
        if (/☞/.test(raw) && r > H.row && !L.notes) { L.notes = cell; continue; }
        if (!t || t.length > 8) continue;
        for (var i = 0; i < LABELS.length; i++) {
          var k = LABELS[i][0];
          if (L.labels[k] || !LABELS[i][1].test(t)) continue;
          if ((k === '공급가' || k === '부가세' || k === '총계') !== (r > H.row)) continue;
          L.labels[k] = right(r, c);
          break;
        }
      }
    }
    if (L.words) { // 같은 줄의 숫자 금액 칸(₩ 표시 서식 또는 다른 수식 칸)
      var row = ws.getRow(L.wordsRow);
      for (var cc = 1; cc <= lastCol; cc++) {
        var x = row.getCell(cc);
        if (x === L.words || (x.isMerged && x.master !== x)) continue;
        if (/₩|#,##0/.test(x.numFmt || '') || formulaOf(x)) { L.wordsAmt = x; break; }
      }
    }
    // 품목 영역 끝: 머리글 아래에서 비고·합계·조건 칸이 처음 나오는 줄 바로 위
    var stops = [L.notes, L.labels['공급가'], L.labels['부가세'], L.labels['총계'], L.cond.delivery, L.cond.incoterm, L.cond.payment]
      .filter(Boolean).map(function (c) { return Number(c.row); }).filter(function (n) { return n > H.row; });
    merges(ws).forEach(function (m) { if (m.top > H.row && m.left <= 1 && m.right >= Math.max(4, lastCol - 1)) stops.push(m.top); });
    L.end = stops.length ? Math.min.apply(null, stops) - 1 : H.row + 30;
    L.lastCol = lastCol;
    return L;
  }

  function colL(c) { var s = ''; while (c > 0) { var m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
  function setVal(cell, v) { var t = cell.isMerged ? cell.master : cell; t.value = v; }
  function copyStyle(from, to) { to.style = JSON.parse(JSON.stringify(from.style || {})); }

  /** 품목 줄이 모자라면 품목 영역 끝에 줄을 끼워 넣는다(아래 병합·인쇄 영역도 함께 내린다). */
  function growRows(ws, L, need) {
    var add = need - (L.end - L.head);
    if (add <= 0) return 0;
    var at = L.end + 1, ms = merges(ws), below = ms.filter(function (m) { return m.top >= at; });
    below.forEach(function (m) { ws.unMergeCells(m.top, m.left, m.bottom, m.right); });
    var model = ws.getRow(Math.max(L.head + 1, L.end - 1));
    for (var i = 0; i < add; i++) ws.insertRow(at, [], 'n');
    for (var r = at; r < at + add; r++) {
      var row = ws.getRow(r);
      row.height = model.height;
      for (var c = 1; c <= L.lastCol; c++) copyStyle(model.getCell(c), row.getCell(c));
    }
    below.forEach(function (m) { ws.mergeCells(m.top + add, m.left, m.bottom + add, m.right); });
    var pa = ws.pageSetup && ws.pageSetup.printArea;
    if (pa) ws.pageSetup.printArea = String(pa).replace(/(\$?[A-Z]+\$?)(\d+)(?!.*\d)/, function (s, col, n) { return col + (Number(n) + add); });
    ws.__m = null;
    return add;
  }

  function fill(wb, ws) {
    var L = locate(ws), H = L.cols, t = totals(), lines = t.lines;
    // 양식에 남아 있을 수 있는 다른 시트(이전 견적 메모 등)는 빼고 만든다
    wb.worksheets.slice().forEach(function (s) { if (s !== ws) wb.removeWorksheet(s.id); });
    // 인쇄 영역 밖(오른쪽) 이전 산출 메모를 지운다
    ws.eachRow({ includeEmpty: false }, function (row) {
      row.eachCell({ includeEmpty: false }, function (cell, c) { if (c > L.lastCol + 1 && !(cell.isMerged && cell.master !== cell)) cell.value = null; });
    });
    var add = growRows(ws, L, lines.length);
    if (add) L = locate(ws);
    H = L.cols;
    var first = L.head + 1, last = L.end;
    // 이름·규격 칸이 합쳐진 줄은 풀어서 두 칸으로(규격을 따로 적기 위해)
    if (H.spec) {
      var ref = ws.getRow(Math.min(first + 1, last));
      for (var r0 = first; r0 <= last; r0++) {
        var m = mergeAt(ws, r0, H.name);
        if (m && m.top === r0 && m.bottom === r0 && m.right >= H.spec) {
          ws.unMergeCells(m.top, m.left, m.bottom, m.right); ws.__m = null;
          copyStyle(ref.getCell(H.name), ws.getCell(r0, H.name)); copyStyle(ref.getCell(H.spec), ws.getCell(r0, H.spec));
        }
      }
    }
    // 품목 줄 서식 정리: 이전 견적의 강조색·취소선·숨김을 없애고 둘째 품목 줄 서식으로 맞춘다(첫 줄 위 굵은 선은 유지)
    var ref = ws.getRow(Math.min(first + 1, last)), refH = Math.max(ref.height || 0, 21), styles = [], tops = [];
    for (var c1 = 1; c1 <= L.lastCol; c1++) {
      var st = JSON.parse(JSON.stringify(ref.getCell(c1).style || {}));
      delete st.fill;
      if (st.font) { delete st.font.color; st.font.strike = false; }
      styles[c1] = st;
      tops[c1] = ws.getCell(first, c1).border && ws.getCell(first, c1).border.top;
    }
    for (var r = first; r <= last; r++) {
      var rowR = ws.getRow(r), used = r < first + lines.length;
      if (used) { rowR.hidden = false; if (!rowR.height || rowR.height < refH) rowR.height = refH; }
      for (var c = 1; c <= L.lastCol; c++) {
        var x = ws.getCell(r, c);
        if (x.isMerged && x.master !== x) continue;
        x.value = null;
        x.style = JSON.parse(JSON.stringify(styles[c]));
        if (r === first && tops[c]) x.border = Object.assign({}, x.border, { top: tops[c] });
      }
    }
    var P = colL(H.price), Q = colL(H.qty), G = colL(H.amount);
    lines.forEach(function (it, i) {
      var r = first + i, qn = num(it.qty), pn = num(it.price), a = amount(it);
      if (H.no) setVal(ws.getCell(r, H.no), i + 1);
      setVal(ws.getCell(r, H.name), H.spec ? clean(it.name) : [clean(it.name), clean(it.spec)].filter(Boolean).join(' '));
      if (H.spec) setVal(ws.getCell(r, H.spec), [clean(it.spec), clean(it.maker) && !H.maker ? '(' + clean(it.maker) + ')' : ''].filter(Boolean).join(' '));
      setVal(ws.getCell(r, H.qty), qn !== null ? qn : clean(it.qty));
      if (H.unit) setVal(ws.getCell(r, H.unit), clean(it.unit));
      setVal(ws.getCell(r, H.price), pn !== null ? pn : (clean(it.price) || null));
      setVal(ws.getCell(r, H.amount), { formula: 'IF(' + P + r + '="","",' + Q + r + '*' + P + r + ')', result: a === null ? '' : a });
    });
    var rng = G + first + ':' + G + last;
    var sup = L.labels['공급가'], vat = L.labels['부가세'], tot = L.labels['총계'];
    if (sup) {
      var S = sup.address;
      setVal(sup, { formula: q.floor1000 ? 'IF(SUM(' + rng + ')=0,"",ROUNDDOWN(SUM(' + rng + '),-3))' : 'IF(SUM(' + rng + ')=0,"",SUM(' + rng + '))', result: t.supply });
      if (vat) setVal(vat, { formula: 'IF(' + S + '="","",' + S + '*10%)', result: t.vat });
      if (tot) setVal(tot, { formula: 'IF(' + S + '="","",' + S + '+' + (vat ? vat.address : S + '*1.1') + ')', result: t.total });
      if (L.words) setVal(L.words, { formula: 'IF(' + S + '="","","일금 " & NUMBERSTRING(' + S + ',1) & "원정")', result: '일금 ' + hangul(t.supply) + '원정' });
      if (L.wordsAmt) setVal(L.wordsAmt, { formula: 'IF(' + S + '="","",' + S + ')', result: t.supply });
    }
    var lab = L.labels;
    if (lab['수신']) setVal(lab['수신'], clean(q.to));
    if (lab['참조']) setVal(lab['참조'], clean(q.attn));
    if (lab.TEL) setVal(lab.TEL, clean(q.tel));
    if (lab.FAX) setVal(lab.FAX, clean(q.fax));
    if (lab['견적일자']) { var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.date || ''); setVal(lab['견적일자'], dm ? new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3])) : clean(q.date)); }
    if (lab['문서번호']) setVal(lab['문서번호'], clean(q.no));
    if (lab['담당자']) setVal(lab['담당자'], clean(q.person));
    if (lab['유효기간']) setVal(lab['유효기간'], clean(q.valid));
    if (lab['제목']) setVal(lab['제목'], clean(q.title));
    [['delivery', '납품기한'], ['incoterm', '인도조건'], ['payment', '결제조건']].forEach(function (d) {
      var cell = L.cond[d[0]];
      if (!cell) return;
      var old = cellText(cell), head = old.indexOf(':') >= 0 ? old.slice(0, old.indexOf(':') + 1) : '※ ' + d[1] + ' :';
      setVal(cell, head + ' ' + clean(q[d[0]]));
    });
    if (L.notes) {
      var old = cellText(L.notes), indent = (/^([ 　]*)☞/.exec(old) || ['', ''])[1];
      var notes = String(q.notes || '').split('\n').map(function (s) { return s.replace(/^\s*☞\s*/, '').trim(); }).filter(Boolean);
      setVal(L.notes, notes.map(function (s) { return indent + '☞ ' + s; }).join('\n') || null);
    }
    if (q.costCols) writeCostCols(ws, L, lines);
    return { ws: ws, rows: lines.length, added: add };
  }

  /** 인쇄 영역 오른쪽에 원가·마진(내부 참고). 엑셀 파일을 고객에게 그대로 보내지 않을 때만 켠다. */
  function writeCostCols(ws, L, lines) {
    var c0 = L.lastCol + 2, first = L.head + 1;
    var head = ws.getCell(L.head - 1 > 0 ? L.head - 1 : 1, c0);
    head.value = '■ 단가 산출 참고 (인쇄 영역 외)';
    head.font = { bold: true, size: 9, color: { argb: 'FFC00000' } };
    ['품명', '원가', '단가', '마진율'].forEach(function (h, i) {
      var c = ws.getCell(L.head, c0 + i); c.value = h; c.font = { bold: true, size: 9 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    });
    var C = colL(c0 + 1), U = colL(c0 + 2), M = colL(c0 + 3);
    lines.forEach(function (it, i) {
      var r = first + i, cost = num(it.cost), price = num(it.price);
      ws.getCell(r, c0).value = clean(it.name);
      ws.getCell(r, c0 + 1).value = cost;
      ws.getCell(r, c0 + 2).value = price;
      ws.getCell(r, c0 + 3).value = { formula: 'IF(OR(' + C + r + '="",' + U + r + '=""),"",(' + U + r + '-' + C + r + ')/' + U + r + ')', result: cost !== null && price ? (price - cost) / price : '' };
      ws.getCell(r, c0 + 1).numFmt = ws.getCell(r, c0 + 2).numFmt = '#,##0';
      ws.getCell(r, c0 + 3).numFmt = '0.0%';
      [0, 1, 2, 3].forEach(function (k) { ws.getCell(r, c0 + k).font = { size: 9 }; });
    });
    ws.getColumn(c0).width = 24;
    [1, 2, 3].forEach(function (k) { ws.getColumn(c0 + k).width = 12; });
  }

  /** 회사 양식 파일이 없을 때: 회사 갑지와 같은 배치를 새로 그린다(로고 포함, 직인 없음). */
  function defaultTemplate(nRows) {
    var wb = new ExcelJS.Workbook();
    wb.creator = '㈜동인엔시스';
    var ws = wb.addWorksheet('갑지', { views: [{ showGridLines: false }] });
    var widths = [6.78, 19.33, 32, 6.78, 8.5, 9.78, 11.78, 2.78];
    widths.forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
    var F = function (o) { return Object.assign({ name: '맑은 고딕', size: 9 }, o || {}); };
    var thin = { style: 'thin', color: { argb: 'FF808080' } }, med = { style: 'medium' };
    var GRAY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    function put(addr, v, font, align, extra) { var c = ws.getCell(addr); c.value = v; c.font = F(font); c.alignment = Object.assign({ vertical: 'middle' }, align || {}); if (extra) Object.assign(c, extra); return c; }
    [18, 18, 13.5, 18, 18, 18, 18, 18, 16.5, 16.5, 6, 17.25, 6, 18, 21].forEach(function (h, i) { ws.getRow(i + 1).height = h; });
    ws.mergeCells('A1:C3'); put('A1', '견 적 서(Quotation)', { size: 22, bold: true }, { horizontal: 'left' });
    ws.mergeCells('D1:G3');
    if (window.ISO_LOGO) {
      var id = wb.addImage({ base64: 'data:image/png;base64,' + window.ISO_LOGO, extension: 'png' });
      ws.addImage(id, { tl: { col: 3.6, row: 0.35 }, ext: { width: 230, height: 45 }, editAs: 'oneCell' });
    }
    [['A4', '수신'], ['A5', '참조'], ['A6', 'TEL.'], ['A7', 'Fax.']].forEach(function (d, i) {
      put(d[0], d[1], { bold: true }); ws.mergeCells('B' + (4 + i) + ':C' + (4 + i)); put('B' + (4 + i), '', {}, { horizontal: 'left' });
    });
    ws.mergeCells('D4:G8'); put('D4', COMPANY.replace(/\n\n/g, '\n').replace(/\n\s+/g, '\n'), {}, { horizontal: 'right', vertical: 'middle', wrapText: true });
    put('A9', '견적일자', { bold: true }, { horizontal: 'left' }); ws.mergeCells('B9:C9'); put('B9', '', {}, { horizontal: 'left' }).numFmt = 'yyyy-mm-dd';
    put('D9', ' 문서번호', { bold: true }, { horizontal: 'left' }); ws.mergeCells('E9:G9'); put('E9', '', {}, { horizontal: 'left' });
    put('A10', '담당자', { bold: true }, { horizontal: 'left' }); ws.mergeCells('B10:C10'); put('B10', '', {}, { horizontal: 'left' });
    put('D10', ' 유효기간', { bold: true }, { horizontal: 'left' }); ws.mergeCells('E10:G10'); put('E10', '', {}, { horizontal: 'left' });
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(function (L) { ws.getCell(L + '10').border = { bottom: { style: 'hair', color: { argb: 'FF808080' } } }; ws.getCell(L + '9').border = { bottom: { style: 'hair', color: { argb: 'FF808080' } } }; });
    put('A12', '제목', { size: 10, bold: true }); ws.mergeCells('B12:G12'); put('B12', '', { size: 10, bold: true }, { horizontal: 'left', wrapText: true });
    ws.mergeCells('A14:C14'); ws.mergeCells('D14:G14');
    put('A14', '일금 원정', { size: 11, bold: true }, { horizontal: 'center' });
    put('D14', '', { size: 11, bold: true }, { horizontal: 'left' }).numFmt = '"( ₩"#,##0" ) 부가세 별도"';
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(function (L) { ws.getCell(L + '14').border = { top: med, bottom: med }; });
    var heads = [['A15', 'NO'], ['B15', '품 명 및 규 격'], ['D15', '수량'], ['E15', '단위'], ['F15', '단가'], ['G15', '금액 (₩)']];
    ws.mergeCells('B15:C15');
    heads.forEach(function (d) { put(d[0], d[1], { size: 10, bold: true }, { horizontal: 'center' }); });
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(function (L) {
      var c = ws.getCell(L + '15'); c.fill = GRAY; c.border = { top: med, bottom: med, left: L === 'A' ? undefined : thin, right: L === 'G' ? undefined : thin };
    });
    var n = Math.max(nRows, 12), r0 = 16;
    for (var r = r0; r < r0 + n; r++) {
      ws.getRow(r).height = 26.25;
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(function (L) {
        var c = ws.getCell(L + r);
        c.font = L === 'A' || L === 'D' || L === 'F' || L === 'G' ? { name: 'Arial', size: 9 } : F();
        c.alignment = { vertical: 'middle', horizontal: L === 'B' || L === 'C' ? 'left' : (L === 'F' || L === 'G' ? 'right' : 'center'), wrapText: L === 'B' || L === 'C' };
        c.border = { bottom: thin, left: L === 'A' ? undefined : (L === 'C' ? { style: 'hair', color: { argb: 'FF808080' } } : thin), right: L === 'G' ? undefined : (L === 'B' ? { style: 'hair', color: { argb: 'FF808080' } } : thin) };
        if (L === 'F' || L === 'G') c.numFmt = '#,##0_);[Red]\\(#,##0\\)';
        if (L === 'F') c.font = { name: 'Arial', size: 9, color: { argb: 'FF002060' } };
      });
    }
    var nr = r0 + n;
    ws.mergeCells('A' + nr + ':G' + (nr + 2));
    put('A' + nr, '                    ☞ ', { name: 'Arial' }, { horizontal: 'left', wrapText: true });
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(function (L) { ws.getCell(L + nr).border = { top: thin }; ws.getCell(L + (nr + 2)).border = { bottom: med }; });
    [16.5, 16.5, 16.5].forEach(function (h, i) { ws.getRow(nr + i).height = h; });
    var tr = nr + 3;
    [['※ 납품기한 : ', '공 급 가'], ['※ 인도조건 : ', '부 가 세'], ['※ 결제조건 : ', '총    계']].forEach(function (d, i) {
      var r = tr + i;
      ws.getRow(r).height = 18;
      put('A' + r, d[0], {}, { horizontal: 'left' });
      var f = put('F' + r, d[1], { size: 10, bold: true }, { horizontal: 'center' }); f.fill = GRAY;
      var g = put('G' + r, '', { size: 10, bold: true }, { horizontal: 'right' }); g.numFmt = '#,##0_ ;[Red]\\-#,##0\\ ';
      f.border = { left: med, right: thin, top: i === 0 ? med : thin, bottom: i === 2 ? med : thin };
      g.border = { left: thin, right: med, top: i === 0 ? med : thin, bottom: i === 2 ? med : thin };
    });
    var fr = tr + 4;
    ws.getRow(fr - 1).height = 5.25;
    FOOTER.forEach(function (t, i) {
      var r = fr + i;
      ws.mergeCells('A' + r + ':G' + r);
      put('A' + r, t, i === 0 ? { bold: true, color: { argb: 'FF0000FF' } } : { size: 8 }, { horizontal: 'left' });
      ws.getRow(r).height = 15;
    });
    ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.59, right: 0.39, top: 0.59, bottom: 0.59, header: 0.3, footer: 0.3 }, printArea: 'A1:G' + (fr + FOOTER.length - 1), printTitlesRow: '15:15', horizontalCentered: true };
    return wb;
  }

  function makeQuote() {
    if (!window.ExcelJS) { setStatus('엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.', 'bad'); return; }
    if (!clean(q.to)) { var f = $('q-to'); f.classList.add('invalid'); f.focus(); setStatus('수신(고객사)을 적으세요.', 'bad'); return; }
    var t = totals();
    if (!t.lines.length) { setStatus('품목을 하나 이상 넣으세요.', 'bad'); return; }
    $('qMake').disabled = true;
    setStatus('견적서를 만드는 중…', '');
    var job;
    if (q.form === 'tpl' && tpl) {
      var wb = new ExcelJS.Workbook();
      job = wb.xlsx.load(unb64(tpl.data)).then(function () { var ws = pickSheet(wb); if (!ws) throw new Error('양식에서 품목표를 찾지 못했습니다.'); return { wb: wb, out: fill(wb, ws) }; });
    } else {
      var sq = standardQuote(t);
      job = Promise.resolve({ wb: sq.wb, out: { rows: sq.rows, added: 0 } });
    }
    job.then(function (r) {
      return r.wb.xlsx.writeBuffer().then(function (buf) {
        var name = fileBase() + '.xlsx';
        if (/\d{6}/.test(q.no || '')) store(LASTNO_KEY, q.no);
        return A.saveFile(name, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).then(function () {
          setStatus(name + ' 저장 — 품목 ' + r.out.rows + '줄' + (r.out.added ? ' (양식 칸이 모자라 ' + r.out.added + '줄 늘림)' : '') + ', 공급가 ' + won(t.supply) + '원' + (q.costCols ? ' · 원가 열 포함(고객 발송 전 PDF로)' : ''), 'ok');
        });
      });
    }).catch(function (e) { setStatus(A.saveErrorText ? A.saveErrorText(e, '견적서') : '견적서를 만들지 못했습니다: ' + ((e && e.message) || e), 'bad'); })
      .then(function () { $('qMake').disabled = false; });
  }

  // ---------------------------------------------------------------- 표준 견적서(동인엔시스 CI)
  // 기록양식집(DI-IMS-F-01)과 같은 색: 머리 #1857A5 · 항목칸 #E8EEF6 · 미리 적힌 칸 #F4F6F9 · 선 #8A9BB0 · 글자 #263445 · 로고 빨강 #E83E30
  var CI = { head: 'FF1857A5', label: 'FFE8EEF6', sunken: 'FFF4F6F9', line: 'FF8A9BB0', ink: 'FF263445', red: 'FFE83E30', muted: 'FF55657A', white: 'FFFFFFFF' };
  var CO_KEY = 'iso-quote-company', SEAL_KEY = 'iso-quote-seal';
  // 사업자등록증(605-81-27818) 기준. 대표자는 현재 견적서 표기를 따름 — 화면에서 고칠 수 있다.
  var CO_FIELDS = [['bizNo', '등록번호', '605-81-27818'], ['name', '상호', '㈜동인엔시스'], ['ceo', '대표자', '백민기'],
    ['addr', '주소', '부산광역시 부산진구 진연로9번길 47 (양정동)'], ['bizType', '업태', '제조업, 도매업'],
    ['bizItem', '종목', '전기제어장치 및 자동제어반, 전기용 기계·장비 및 관련 기자재'],
    ['tel', '전화', '051-862-3668'], ['fax', '팩스', '051-862-3325'], ['mail', '이메일', 'dongin@donginmne.com'], ['web', '홈페이지', 'www.donginensis.com']];
  // 회사 직인(대표이사인) — 바탕 투명 PNG. 브라우저에서 직인을 바꾸거나 빼면 그 설정이 우선한다.
  // 직인은 견적서 비밀번호로 암호화해 둔다(AES-GCM, 키 = PBKDF2-SHA256). 비밀번호 없이는 꺼낼 수 없다.
  var SEAL_ENC = /*SEAL_ENC*/{"v":"Zft1ey/l","it":200000,"salt":"9wRj+9i9IkpeOf+fqbqDpQ==","iv":"pI41fIzOhIzKvkuk","ct":"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"};
  var UNLOCK_KEY = 'iso-quote-unlock';
  var builtinSeal = null, unlocked = false;
  var co = null, seal = null;
  function loadCompany() {
    co = {};
    var saved = {};
    try { saved = JSON.parse(load(CO_KEY) || '{}') || {}; } catch (e) { saved = {}; }
    CO_FIELDS.forEach(function (f) { co[f[0]] = typeof saved[f[0]] === 'string' ? saved[f[0]] : f[2]; });
    var s = null;
    try { s = JSON.parse(load(SEAL_KEY) || 'null'); } catch (e) { s = null; }
    seal = s && s.none ? null : (s && s.data ? s : (builtinSeal ? { data: builtinSeal, ext: 'png', builtin: true } : null));
  }

  function u8of(b) { return new Uint8Array(unb64(b)); }
  /** 비밀번호로 직인을 풀어 본다. 맞으면 이 브라우저에 풀린 상태를 기억한다. */
  function unlock(pw) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('이 브라우저는 암호 기능을 지원하지 않습니다.'));
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: u8of(SEAL_ENC.salt), iterations: SEAL_ENC.it, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8of(SEAL_ENC.iv) }, key, u8of(SEAL_ENC.ct));
    }).then(function (buf) {
      builtinSeal = b64(buf); unlocked = true;
      store(UNLOCK_KEY, JSON.stringify({ seal: builtinSeal, v: SEAL_ENC.v }));
    }, function (e) { if (e && e.name === 'OperationError') throw new Error('비밀번호가 맞지 않습니다.'); throw e; });
  }
  function storedUnlock() {
    try { var u = JSON.parse(load(UNLOCK_KEY) || 'null'); if (u && u.seal && SEAL_ENC && u.v === SEAL_ENC.v) { builtinSeal = u.seal; unlocked = true; } } catch (e) { /* 잠긴 상태 */ }
  }
  function lockAgain() {
    store(UNLOCK_KEY, null); unlocked = false; builtinSeal = null;
    if (seal && seal.builtin) seal = null;
    showLock();
  }
  function showLock() {
    var sec = $('view-quote');
    sec.classList.add('q-locked');
    $('qLock').hidden = false;
    $('qLockMsg').textContent = '';
    setTimeout(function () { var p = $('qPw'); if (p) p.focus(); }, 0);
  }

  function pngSize(u8) {
    if (u8.length < 24 || u8[0] !== 0x89 || u8[1] !== 0x50) return null;
    var w = (u8[16] << 24 | u8[17] << 16 | u8[18] << 8 | u8[19]) >>> 0, h = (u8[20] << 24 | u8[21] << 16 | u8[22] << 8 | u8[23]) >>> 0;
    return w && h ? { w: w, h: h } : null;
  }
  /** 회사 견적서 엑셀에서 직인 그림을 찾는다: 정사각형에 가까운 그림(로고는 가로로 김). */
  function findSeal(buf) {
    var wb = new ExcelJS.Workbook();
    return wb.xlsx.load(buf).then(function () {
      var best = null;
      wb.worksheets.forEach(function (ws) {
        (ws.getImages ? ws.getImages() : []).forEach(function (im) {
          var img = wb.getImage(Number(im.imageId));
          if (!img || !img.buffer) return;
          var u8 = new Uint8Array(img.buffer), d = pngSize(u8);
          if (!d) return;
          var r = d.w / d.h;
          if (r > 0.75 && r < 1.33 && (!best || d.w > best.w)) best = { w: d.w, data: b64(u8), ext: 'png' };
        });
      });
      return best;
    });
  }
  function keepSeal(s, from) {
    seal = s;
    var ok = store(SEAL_KEY, JSON.stringify(s || { none: true }));
    renderTpl();
    if (s) setStatus('직인 그림을 ' + from + '에서 가져왔습니다' + (ok ? ' (이 브라우저에만 보관)' : '') + '. 표준 양식 대표자 칸에 찍힙니다.', 'ok');
  }

  function standardQuote(t) {
    var wb = new ExcelJS.Workbook();
    wb.creator = co.name;
    var ws = wb.addWorksheet('견적서', { views: [{ showGridLines: false }] });
    [5, 17, 24, 7, 8, 11.5, 13, 12].forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
    var thin = { style: 'thin', color: { argb: CI.line } }, hair = { style: 'hair', color: { argb: CI.line } };
    var headLine = { style: 'thin', color: { argb: CI.head } }, strong = { style: 'medium', color: { argb: CI.head } };
    function font(o) { return Object.assign({ name: '맑은 고딕', size: 9, color: { argb: CI.ink } }, o || {}); }
    function fillOf(argb) { return { type: 'pattern', pattern: 'solid', fgColor: { argb: argb } }; }
    function rc(a) { var m = /^([A-H])(\d+)$/.exec(a); return { c: 'ABCDEFGH'.indexOf(m[1]) + 1, r: +m[2] }; }
    /** 칸(또는 합친 칸)에 값·서식을 넣는다. border: 바깥 테두리 {top,bottom,left,right} */
    function area(range, value, o) {
      o = o || {};
      var p = range.split(':'), a = rc(p[0]), b = rc(p[1] || p[0]);
      if (p[1] && p[1] !== p[0]) ws.mergeCells(range);
      var m = ws.getCell(a.r, a.c);
      if (value !== undefined) m.value = value;
      m.font = font(o.font);
      m.alignment = Object.assign({ vertical: 'middle', horizontal: 'left', wrapText: true, indent: o.indent || 0 }, o.align);
      if (o.fmt) m.numFmt = o.fmt;
      for (var r = a.r; r <= b.r; r++) for (var c = a.c; c <= b.c; c++) {
        var x = ws.getCell(r, c), bd = o.border || {};
        if (o.fill) x.fill = fillOf(o.fill);
        var e = {};
        if (bd.top && r === a.r) e.top = bd.top;
        if (bd.bottom && r === b.r) e.bottom = bd.bottom;
        if (bd.left && c === a.c) e.left = bd.left;
        if (bd.right && c === b.c) e.right = bd.right;
        if (Object.keys(e).length) x.border = Object.assign({}, x.border, e);
      }
      return m;
    }
    function height(r, h) { ws.getRow(r).height = h; }

    // 1. 머리: 로고 · 제목 · 색 띠
    height(1, 36); height(2, 15); height(3, 3.75); height(4, 2.25); height(5, 6);
    area('A1:H1', '견    적    서', { font: { size: 22, bold: true, color: { argb: CI.head } }, align: { horizontal: 'center' } });
    area('A2:H2', 'Q U O T A T I O N', { font: { size: 8, color: { argb: CI.muted } }, align: { horizontal: 'center' } });
    area('A3:H3', null, { fill: CI.head });
    area('A4:H4', null, { fill: CI.red });
    if (window.ISO_LOGO) {
      var logo = wb.addImage({ base64: 'data:image/png;base64,' + window.ISO_LOGO, extension: 'png' });
      ws.addImage(logo, { tl: { col: 0.08, row: 0.25 }, ext: { width: 165, height: 32 }, editAs: 'oneCell' });
    }

    // 2. 받는 쪽(왼쪽) · 공급자(오른쪽)
    [6, 7, 8, 9, 10, 11, 12].forEach(function (r) { height(r, 19); });
    if (units(co.addr) > 46) height(9, 26);
    if (units(co.bizItem) > 46) height(11, 26);
    area('A6:C6', (clean(q.to) || '') + '  귀중', { font: { size: 13, bold: true }, border: { bottom: strong } });
    var left = [['참    조', clean(q.attn)], ['T E L', clean(q.tel)], ['F A X', clean(q.fax)],
      ['견 적 일 자', dateKo(q.date)], ['견 적 번 호', clean(q.no)], ['담    당', clean(q.person)]];
    left.forEach(function (d, i) {
      var r = 7 + i;
      area('A' + r + ':B' + r, d[0], { font: { bold: true, color: { argb: CI.head } }, fill: CI.label, indent: 1, border: { bottom: hair } });
      area('C' + r, d[1], { indent: 1, border: { bottom: hair } });
    });
    area('D6:D12', '공\n\n급\n\n자', { font: { bold: true, color: { argb: CI.white } }, fill: CI.head, align: { horizontal: 'center' }, border: { top: headLine, bottom: headLine, left: headLine } });
    var right = [['등록번호', co.bizNo, { size: 11, bold: true }], ['상    호', co.name, { bold: true }], ['대 표 자', co.ceo, { bold: true }],
      ['주    소', co.addr, { size: 8.5 }], ['업    태', co.bizType, { size: 8.5 }], ['종    목', co.bizItem, { size: 8 }],
      ['연 락 처', 'Tel ' + co.tel + '  ·  Fax ' + co.fax, { size: 8.5 }]];
    right.forEach(function (d, i) {
      var r = 6 + i, last = i === right.length - 1, first = i === 0;
      var b = { bottom: last ? headLine : hair, top: first ? headLine : undefined };
      area('E' + r, d[0], { font: { bold: true, size: 8.5, color: { argb: CI.head } }, fill: CI.label, align: { horizontal: 'center' }, border: Object.assign({ left: thin, right: thin }, b) });
      if (i === 2) {
        area('F' + r + ':G' + r, d[1], { font: d[2], indent: 1, border: b });
        area('H' + r, '(인)', { font: { color: { argb: CI.muted } }, align: { horizontal: 'center' }, border: Object.assign({ right: headLine }, b) });
      } else {
        area('F' + r + ':H' + r, d[1], { font: d[2], indent: 1, border: Object.assign({ right: headLine }, b) });
      }
    });
    if (seal && seal.data) {
      var sx = seal.ext === 'jpeg' ? 'jpeg' : 'png', sid = wb.addImage({ base64: 'data:image/' + sx + ';base64,' + seal.data, extension: sx });
      ws.addImage(sid, { tl: { col: 7.38, row: 6.8 }, ext: { width: 48, height: 48 }, editAs: 'oneCell' });
    }

    // 3. 제목 · 견적 금액
    height(13, 8); height(14, 22); height(15, 6); height(16, 30); height(17, 18);
    area('A14:B14', '제    목', { font: { bold: true, color: { argb: CI.head } }, fill: CI.label, indent: 1, border: { top: headLine, bottom: headLine } });
    area('C14:H14', clean(q.title), { font: { size: 11, bold: true }, indent: 1, border: { top: headLine, bottom: headLine } });
    var box = { top: strong, bottom: strong };
    area('A16:B16', '견적금액\n(공급가액)', { font: { bold: true, color: { argb: CI.white } }, fill: CI.head, align: { horizontal: 'center' }, border: Object.assign({ left: strong }, box) });
    var words = area('C16:E16', null, { font: { size: 11, bold: true }, align: { horizontal: 'center' }, border: box });
    var amt = area('F16:H16', null, { font: { size: 11, bold: true, color: { argb: CI.head } }, align: { horizontal: 'center' }, fmt: '"₩ "#,##0" (부가세 별도)"', border: Object.assign({ right: strong }, box) });
    area('A17:H17', '아래와 같이 견적합니다.', { font: { size: 8.5, color: { argb: CI.muted } }, align: { vertical: 'bottom' } });

    // 4. 품목표
    var H = 18, heads = ['NO', '품    명', '규 격 · 모 델', '수량', '단위', '단    가', '금    액', '비고'];
    height(H, 22);
    heads.forEach(function (h, i) {
      area('ABCDEFGH'[i] + H, h, { font: { bold: true, color: { argb: CI.white } }, fill: CI.head, align: { horizontal: 'center' },
        border: { left: i ? { style: 'thin', color: { argb: 'FF5B86C0' } } : undefined, top: strong, bottom: strong } });
    });
    var lines = t.lines, n = Math.max(lines.length, 10), first = H + 1, lastItem = H + n;
    for (var i = 0; i < n; i++) {
      var r = first + i, it = lines[i], qn = it ? num(it.qty) : null, pn = it ? num(it.price) : null, am = it ? amount(it) : null;
      var nl = it ? Math.max(Math.ceil(units(it.name) / 16), Math.ceil(units(it.spec) / 30), Math.ceil(units(it.maker) / 19), 1) : 1;
      height(r, nl > 1 ? nl * 12 + 6 : 21);
      var bot = { bottom: i === n - 1 ? headLine : hair };
      var vb = function (c) { return Object.assign({ left: c ? thin : undefined }, bot); };
      area('A' + r, it ? i + 1 : null, { font: { name: 'Arial', size: 8.5 }, align: { horizontal: 'center' }, border: vb(0) });
      area('B' + r, it ? clean(it.name) : null, { border: vb(1) });
      area('C' + r, it ? clean(it.spec) : null, { border: vb(2) });
      area('D' + r, it ? (qn !== null ? qn : clean(it.qty)) : null, { font: { name: 'Arial', size: 9 }, align: { horizontal: 'center' }, border: vb(3) });
      area('E' + r, it ? clean(it.unit) : null, { align: { horizontal: 'center' }, border: vb(4) });
      area('F' + r, it ? (pn !== null ? pn : (clean(it.price) || null)) : null, { font: { name: 'Arial', size: 9 }, align: { horizontal: 'right' }, fmt: '#,##0', border: vb(5) });
      area('G' + r, it ? { formula: 'IF(F' + r + '="","",D' + r + '*F' + r + ')', result: am === null ? '' : am } : null, { font: { name: 'Arial', size: 9 }, align: { horizontal: 'right' }, fmt: '#,##0', border: vb(6) });
      area('H' + r, it ? clean(it.maker) : null, { font: { size: 8, color: { argb: CI.muted } }, align: { horizontal: 'center' }, border: vb(7) });
    }

    // 5. 합계
    var rng = 'G' + first + ':G' + lastItem, s1 = lastItem + 1, s2 = s1 + 1, s3 = s2 + 1;
    [s1, s2].forEach(function (r) { height(r, 20); });
    height(s3, 23);
    var floorNote = q.floor1000 && t.sum !== t.supply ? '천원 미만 절사' : '';
    area('A' + s1 + ':F' + s1, '공 급 가 액', { font: { bold: true, color: { argb: CI.head } }, fill: CI.sunken, align: { horizontal: 'right' }, indent: 1, border: { bottom: hair } });
    var sup = area('G' + s1, { formula: q.floor1000 ? 'IF(SUM(' + rng + ')=0,"",ROUNDDOWN(SUM(' + rng + '),-3))' : 'IF(SUM(' + rng + ')=0,"",SUM(' + rng + '))', result: t.supply },
      { font: { name: 'Arial', size: 9.5, bold: true }, align: { horizontal: 'right' }, fmt: '#,##0', fill: CI.sunken, border: { left: thin, bottom: hair } });
    area('H' + s1, floorNote, { font: { size: 7.5, color: { argb: CI.muted } }, align: { horizontal: 'center' }, fill: CI.sunken, border: { left: thin, bottom: hair } });
    area('A' + s2 + ':F' + s2, '부   가   세 (10%)', { font: { bold: true, color: { argb: CI.head } }, fill: CI.sunken, align: { horizontal: 'right' }, indent: 1 });
    area('G' + s2, { formula: 'IF(G' + s1 + '="","",G' + s1 + '*10%)', result: t.vat }, { font: { name: 'Arial', size: 9.5 }, align: { horizontal: 'right' }, fmt: '#,##0', fill: CI.sunken, border: { left: thin } });
    area('H' + s2, null, { fill: CI.sunken, border: { left: thin } });
    area('A' + s3 + ':F' + s3, '합   계 (VAT 포함)', { font: { size: 10, bold: true, color: { argb: CI.head } }, fill: CI.label, align: { horizontal: 'right' }, indent: 1, border: { top: headLine, bottom: strong } });
    area('G' + s3, { formula: 'IF(G' + s1 + '="","",G' + s1 + '+G' + s2 + ')', result: t.total }, { font: { name: 'Arial', size: 10.5, bold: true, color: { argb: CI.head } }, align: { horizontal: 'right' }, fmt: '#,##0', fill: CI.label, border: { left: thin, top: headLine, bottom: strong } });
    area('H' + s3, '원', { font: { color: { argb: CI.muted } }, align: { horizontal: 'center' }, fill: CI.label, border: { left: thin, top: headLine, bottom: strong } });
    words.value = { formula: 'IF(G' + s1 + '="","","일금 " & NUMBERSTRING(G' + s1 + ',1) & "원정")', result: '일금 ' + hangul(t.supply) + '원정' };
    amt.value = { formula: 'IF(G' + s1 + '="","",G' + s1 + ')', result: t.supply };

    // 6. 견적 조건 · 비고
    var c0 = s3 + 2;
    height(s3 + 1, 10); height(c0, 20);
    area('A' + c0 + ':H' + c0, '견 적 조 건', { font: { bold: true, color: { argb: CI.head } }, indent: 1, border: { bottom: headLine } });
    var notes = String(q.notes || '').split('\n').map(function (s) { return s.replace(/^\s*[☞※·\-]\s*/, '').trim(); }).filter(Boolean);
    var conds = [['납 품 기 한', clean(q.delivery)], ['인 도 조 건', clean(q.incoterm)], ['결 제 조 건', clean(q.payment)], ['유 효 기 간', clean(q.valid)]];
    if (notes.length) conds.push(['비    고', notes.map(function (s) { return '· ' + s; }).join('\n')]);
    conds.forEach(function (d, i) {
      var r = c0 + 1 + i, lastC = i === conds.length - 1;
      height(r, d[0] === '비    고' ? Math.max(19, notes.length * 13 + 6) : 19);
      var b = { bottom: lastC ? headLine : hair };
      area('A' + r + ':B' + r, d[0], { font: { bold: true, color: { argb: CI.head } }, fill: CI.label, indent: 1, border: b });
      area('C' + r + ':H' + r, d[1], { indent: 1, border: b });
    });

    // 7. 바닥글: 인증·사업 분야
    var f0 = c0 + conds.length + 2;
    height(f0 - 1, 10); height(f0, 15); height(f0 + 1, 50);
    area('A' + f0 + ':H' + f0, FOOTER[0].trim(), { font: { size: 8, bold: true, color: { argb: CI.head } }, border: { top: thin } });
    area('A' + (f0 + 1) + ':H' + (f0 + 1), FOOTER.slice(1).map(function (s) { return s.trim().replace(/^\|\s*/, ''); }).join('\n'), { font: { size: 7, color: { argb: CI.muted } }, align: { vertical: 'top' } });

    ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.45, bottom: 0.55, header: 0.2, footer: 0.25 }, printArea: 'A1:H' + (f0 + 1), printTitlesRow: H + ':' + H };
    ws.headerFooter = { oddFooter: '&L&8' + co.name + '  ·  ' + clean(q.no) + '&R&8&P / &N' };
    return { wb: wb, rows: lines.length };
  }
  /** 엑셀 칸 너비 단위로 대략 센 글자 폭(한글 2, 그 밖 1) */
  function units(t) { var s = clean(t), n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) > 0x2e7f ? 1.8 : 1; return n; }
  function dateKo(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[1] + '년 ' + (+m[2]) + '월 ' + (+m[3]) + '일' : clean(iso); }

  // ---------------------------------------------------------------- ISO 기록 묶음으로
  function panelTags() {
    var s = clean(q.panelTags);
    if (/^\d+$/.test(s)) { var n = Math.min(+s, 50); return n > 1 ? Array.apply(null, Array(n)).map(function () { return ''; }) : ['']; }
    var tags = s ? s.split(/[,;\n]+/).map(clean).filter(Boolean) : [];
    return tags.length ? tags : [''];
  }
  function bomParts() { return q.items.filter(function (it) { return it.bom && hasText(it); }); }
  function isoBomData(kind, rows, fileName) {
    var det = A.P.detectColumns(rows, kind);
    return { kind: kind, fileName: fileName, rows: rows, det: det, items: A.P.parseBom(rows, det), sample: false };
  }
  function qtyCell(it) { var n = num(it.qty); return n !== null ? n : clean(it.qty); }
  /** 견적 품목 → ISO BOM 행(가격 없음). 판넬이 여럿이고 총수량이면 판넬별로 고르게 나눈다. */
  function buildBom(tags) {
    var parts = bomParts(), base = '견적_' + (A.P.clean(q.no).replace(/[\\\/:*?"<>|]/g, '') || yymmdd(q.date)) + '_BOM';
    var multi = tags.length > 1 && q.qtyBasis !== 'per', uneven = [];
    if (!multi) {
      var rows = [['No', '품명', '모델·규격', '메이커', '수량', '단위']];
      parts.forEach(function (it, i) { rows.push([i + 1, clean(it.name), clean(it.spec), clean(it.maker), qtyCell(it), clean(it.unit)]); });
      return { basis: 'perPanel', bom: isoBomData('bom', rows, base + '.xlsx'), bomTotal: null, uneven: uneven, n: parts.length };
    }
    var rowsA = [['No', '판넬', '품명', '모델·규격', '메이커', '수량', '단위']], rowsT = [['품명', '모델', '메이커', '수량', '단위']], no = 0;
    parts.forEach(function (it) {
      var n = num(it.qty);
      rowsT.push([clean(it.name), clean(it.spec), clean(it.maker), n !== null ? n : clean(it.qty), clean(it.unit)]);
      if (n === null || n !== Math.floor(n) || n < tags.length || n % tags.length) uneven.push(clean(it.name) || clean(it.spec));
      if (n === null || n !== Math.floor(n)) { rowsA.push([++no, tags[0], clean(it.name), clean(it.spec), clean(it.maker), n !== null ? n : clean(it.qty), clean(it.unit)]); return; }
      var each = Math.floor(n / tags.length), rem = n % tags.length;
      tags.forEach(function (tag, i) {
        var k = each + (i < rem ? 1 : 0);
        if (k > 0) rowsA.push([++no, tag, clean(it.name), clean(it.spec), clean(it.maker), k, clean(it.unit)]);
      });
    });
    return { basis: 'allocated', bom: isoBomData('bom', rowsA, base + '_판넬별.xlsx'), bomTotal: isoBomData('bomTotal', rowsT, base + '_총수량.xlsx'), uneven: uneven, n: parts.length };
  }
  function slim(d) { return d ? { kind: d.kind, fileName: d.fileName, rows: d.rows, det: d.det, items: d.items, sample: !!d.sample } : null; }

  function sendToIso() {
    var msg = $('qIsoMsg');
    var tags = panelTags();
    if (!bomParts().length) { msg.textContent = 'BOM으로 넘길 부품 행이 없습니다. 품목표의 BOM 칸을 확인하세요.'; msg.className = 'status bad'; return; }
    if (tags.length > 1 && tags.some(function (t) { return !t; }) && q.qtyBasis !== 'per') {
      msg.textContent = '판넬이 2면 이상이면 도면 Tag를 쉼표로 적어 주세요(예: LCP-01, LCP-02). 판넬별로 BOM을 나눌 때 이 이름을 씁니다.'; msg.className = 'status bad'; $('q-panels').focus(); return;
    }
    var cur = A.state(), pj = clean(q.pj);
    var same = !cur.sample && pj && clean(cur.project.pj) === pj;
    var busy = !cur.sample && !same && (clean(cur.project.pj) || cur.bom || cur.io);
    if (busy && Date.now() - isoArm > 6000) {
      isoArm = Date.now();
      msg.textContent = '01 탭에 다른 프로젝트(' + (clean(cur.project.pj) || '번호 없음') + ') 입력이 있습니다. 새 프로젝트로 바꾸려면 한 번 더 누르세요. (먼저 01 탭에서 저장(.json)해 두면 안전합니다)';
      msg.className = 'status bad';
      return;
    }
    isoArm = 0;
    if (same) tags = cur.panels.map(function (p) { return clean(p.tag); }).filter(Boolean).length ? cur.panels.map(function (p) { return clean(p.tag); }) : tags;
    var b = buildBom(tags);
    var project, panels, io = null, std = null;
    if (same) {
      project = Object.assign({}, cur.project);
      panels = cur.panels;
      io = slim(cur.io); std = slim(cur.std);
    } else {
      project = { approval: false, sat: true, outsource: false, pj: pj, customer: clean(q.to), name: clean(q.title) };
      panels = tags.map(function (t) { return { tag: t, desc: clean(q.title), serial: '' }; });
    }
    project.bomRev = '견적 ' + clean(q.no);
    project.quoteNo = clean(q.no);
    project.quoteDate = q.date || '';
    if (!clean(project.customer)) project.customer = clean(q.to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean(q.delivery)) && !project.due) project.due = clean(q.delivery);
    var saved = { format: 'DI-ISO-PROJECT', version: 1, savedAt: new Date().toISOString(), bomBasis: b.basis,
      state: { project: project, panels: panels, bom: slim(b.bom), bomTotal: slim(b.bomTotal), io: io, std: std, sample: false } };
    try { A.loadProjectText(JSON.stringify(saved)); }
    catch (e) { msg.textContent = 'ISO 쪽으로 넘기지 못했습니다: ' + e.message; msg.className = 'status bad'; return; }
    msg.textContent = '';
    A.showView('pack');
    var gs = $('genStatus');
    if (gs) {
      gs.textContent = '견적 ' + (clean(q.no) || '') + '에서 부품 ' + b.n + '종을 BOM으로 받았습니다' + (same ? '(같은 프로젝트: 다른 입력은 그대로)' : '') +
        (b.basis === 'allocated' ? ' · 판넬 ' + tags.length + '면에 고르게 나눔' + (b.uneven.length ? ', 확인 필요: ' + b.uneven.slice(0, 3).join(', ') + (b.uneven.length > 3 ? ' 외 ' + (b.uneven.length - 3) : '') : '') : '') +
        '. 프로젝트 번호·도면 Rev·일정을 채우세요.';
      gs.className = 'status ok';
    }
    var s3 = $('h-s3'); if (s3) s3.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /** 다른 컴퓨터의 생성기로 옮길 때: 가격 없는 BOM 엑셀 */
  function saveBomXlsx() {
    if (!bomParts().length) { setStatus('BOM으로 넘길 부품 행이 없습니다.', 'bad'); return; }
    var b = buildBom(panelTags());
    var wb = new ExcelJS.Workbook();
    [[b.bom, 'BOM'], [b.bomTotal, '총수량 BOM']].forEach(function (d) {
      if (!d[0]) return;
      var ws = wb.addWorksheet(d[1]);
      d[0].rows.forEach(function (r) { ws.addRow(r); });
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF6' } };
      ws.columns.forEach(function (c, i) { c.width = [6, 14, 26, 30, 16, 8, 8][i] || 12; });
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    });
    wb.xlsx.writeBuffer().then(function (buf) {
      var name = b.bom.fileName;
      return A.saveFile(name, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).then(function () {
        setStatus(name + ' 저장 — 가격 없이 품명·모델·메이커·수량만 들어 있습니다. 01 탭 3단계에 넣으면 됩니다.', 'ok');
      });
    }).catch(function (e) { setStatus(A.saveErrorText(e, 'BOM'), 'bad'); });
  }

  window.IsoViews = window.IsoViews || {};
  window.IsoViews.quote = {
    show: function () {
      A = window.IsoApp; el = A.el; $ = A.$;
      if (!lockWired) {
        lockWired = true;
        $('qLockForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var pw = $('qPw').value, btn = $('qLockGo');
          if (!pw) { $('qLockMsg').textContent = '비밀번호를 입력하세요.'; return; }
          btn.disabled = true; $('qLockMsg').textContent = '확인 중…';
          unlock(pw).then(function () {
            $('qPw').value = ''; $('qLockMsg').textContent = '';
            $('qLock').hidden = true; $('view-quote').classList.remove('q-locked');
            if (built) { loadCompany(); renderTpl(); }
            window.IsoViews.quote.show();
          }, function (err) { $('qLockMsg').textContent = err.message; $('qPw').select(); })
            .then(function () { btn.disabled = false; });
        });
        $('qRelock').addEventListener('click', lockAgain);
        storedUnlock();
      }
      if (!unlocked) { showLock(); return; }
      $('qLock').hidden = true; $('view-quote').classList.remove('q-locked');
      if (!built) {
        try { var t = JSON.parse(load(TPL_KEY) || 'null'); if (t && t.data && t.name) tpl = t; } catch (e) { tpl = null; }
        if (!q) {
          try { var d = JSON.parse(load(DRAFT_KEY) || 'null'); if (d && Array.isArray(d.items)) { q = blank(); Object.keys(q).forEach(function (k) { if (d[k] !== undefined) q[k] = d[k]; }); } } catch (e) { q = null; }
          if (!q) q = blank();
        }
        loadCompany();
        build();
        renderAll();

      }
    },
    _q: function () { return q; }, _hangul: hangul, _detect: detectCols, _rows: itemsFromRows, _fill: fill, _default: defaultTemplate, _locate: locate, _bom: buildBom, _tpl: function (t) { if (t !== undefined) tpl = t; return tpl; }, _std: function () { return standardQuote(totals()); }, _seal: function () { return seal; }
  };
})();
