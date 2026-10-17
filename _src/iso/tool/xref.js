/* 타사 → 슈나이더 대체: 지멘스·LS 같은 타사 형번 목록을 넣으면 대응표에서 슈나이더 대체 모델·LP를 찾아
   분류별 할인율로 원가를 계산하고, 00 견적서 품목에 원가를 채워 넘긴다(단가는 견적서 탭의 마진으로 계산).
   대응표(LP 포함)와 할인율은 이 브라우저에만 보관한다. 홈페이지 공개본이므로 대응표·단가를 코드에 넣지 않는다. */
(function () {
  'use strict';
  var TABLE_KEY = 'iso-xref-table', RATE_KEY = 'iso-xref-rates', ORIG_KEY = 'iso-xref-orig', LP_KEY = 'iso-xref-lp';

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
  /** LP 시트(슈나이더 모델 · LP, 타사 형번 없음) → { 모델키: LP } */
  function parseLp(rows) {
    var det = detect(rows, TSYN, function (u) { return u.to !== undefined && u.lp !== undefined && u.from === undefined; }), out = {};
    if (!det) return out;
    for (var r = det.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [], to = clean(row[det.map.to]), lp = num(row[det.map.lp]);
      if (to && lp !== null && lp > 0) out[key(to)] = String(Math.round(lp));
    }
    return out;
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
  /** 형번 칸 점수: 찾을 수 있는 형번이면 크게, 'PLC(AI8)' 같은 품명(괄호·쉼표)은 낮게 */
  function codeScore(s, known) {
    var t = clean(s);
    if (!t) return 0;
    if (known && known(t)) return 100;
    if (!looksCode(t)) return 0;
    var sc = 10;
    if (/[(),]/.test(t)) sc -= 9;
    if (/-/.test(t)) sc += 4;
    if (/^\d/.test(t)) sc += 2;
    if (/^[a-z0-9\-\.\/ ]+$/i.test(t)) sc += 2;
    if (t.length >= 10) sc += 2;
    return sc;
  }
  /** 붙여 넣은 표·엑셀 시트 → [{name, maker, code, qty}]. 머리글이 없으면 형번 칸(모든 줄에서 점수가 가장 높은 열)과
      그 오른쪽 첫 숫자 칸(수량)을 쓴다. known(형번)은 대응표·기본 대응에서 찾을 수 있는지 알려 준다. */
  function parseInput(rows, known) {
    known = known || function (c) { return !!builtin(c); };
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
    var width = rows.reduce(function (w, r) { return Math.max(w, (r || []).length); }, 0), best = -1, bestSc = 0;
    for (var c = 0; c < width; c++) {
      var sc = rows.reduce(function (a, r) { return a + codeScore((r || [])[c], known); }, 0);
      if (sc > bestSc) { bestSc = sc; best = c; }
    }
    rows.forEach(function (row) {
      var cells = (row || []).map(clean);
      if (cells.length === 1) { // 손으로 친 「형번 수량」 한 줄(형번 안의 띄어쓰기는 그대로)
        var hm = /^(.+?)[\s,]+(\d+(?:\.\d+)?)\s*(?:ea|개)?$/i.exec(cells[0]);
        cells = hm && codeScore(hm[1], known) ? [hm[1], hm[2]] : cells[0].split(/[\s,]+/);
      }
      var ci = -1, top = 0; // 줄마다 점수가 가장 높은 칸, 같으면 전체에서 고른 열
      cells.forEach(function (v, c) { var sc = codeScore(v, known); if (sc && c === best) sc += 3; if (sc > top) { top = sc; ci = c; } });
      if (ci < 0) return;
      var qty = null, name = '';
      for (var j = ci + 1; j < cells.length; j++) { var n = num(cells[j]); if (n !== null) { if (n > 0) qty = n; break; } }
      for (var i = ci - 1; i >= 0; i--) if (cells[i] && num(cells[i]) === null) { name = cells[i]; break; }
      out.push({ name: name, maker: '', code: cells[ci], qty: qty === null ? 1 : qty });
    });
    return out;
  }

  // ---------------------------------------------------------------- 기본 대응(대응표 없이 자동으로 찾기)
  // 지멘스 S7-1200·KTP·V20·G120C·3RW 형번을 사양으로 풀어 슈나이더 대체 모델을 고른다. 모델명만 두고 LP는 넣지 않는다.
  // 회사 대응표에 같은 형번이 있으면 대응표가 먼저다.
  var CPU_NOTE = '프로그램 호환 안 됨(새로 작성) · 통신 Profinet → 이더넷(Modbus TCP·EtherNet/IP)';
  var CPU = {
    // 1211C·1212C (6·8 D/I, 4·6 D/O, 2 A/I)
    '1211A': ['CPU 1211C DC/DC/DC', [['TM221CE16T']]], '1211B': ['CPU 1211C AC/DC/RLY', [['TM221CE16R']]], '1211H': ['CPU 1211C DC/DC/RLY', [['TM221ME16R']]],
    '1212A': ['CPU 1212C DC/DC/DC', [['TM221CE16T']]], '1212B': ['CPU 1212C AC/DC/RLY', [['TM221CE16R']]], '1212H': ['CPU 1212C DC/DC/RLY', [['TM221ME16R']]],
    // 1214C (14 D/I, 10 D/O, 2 A/I)
    '1214A': ['CPU 1214C DC/DC/DC', [['TM221CE24T']]], '1214B': ['CPU 1214C AC/DC/RLY', [['TM221CE24R']]],
    '1214H': ['CPU 1214C DC/DC/RLY', [['TM221ME16R', 1, 'DC24V 전원 릴레이 CPU(8 D/I · 8 D/O) — TM3DM24R과 1조'], ['TM3DM24R', 1, '16 D/I · 8 D/O RLY 확장 — 합계 24 D/I · 16 D/O. AC 220V가 있으면 TM221CE24R 1대로 가능']], true],
    // 1215C·1217C (+ 2 A/O)
    '1215A': ['CPU 1215C DC/DC/DC', [['TM221CE24T'], ['TM3AQ2', 1, 'A/O 2CH (TM221에 아날로그 출력 없음)']]],
    '1215B': ['CPU 1215C AC/DC/RLY', [['TM221CE24R'], ['TM3AQ2', 1, 'A/O 2CH (TM221에 아날로그 출력 없음)']]],
    '1215H': ['CPU 1215C DC/DC/RLY', [['TM221ME16R', 1, 'DC24V 전원 릴레이 CPU — 확장 2개와 1조'], ['TM3DM24R', 1, '16 D/I · 8 D/O RLY 확장'], ['TM3AQ2', 1, 'A/O 2CH']], true],
    '1217A': ['CPU 1217C DC/DC/DC', [['TM221CE24T', 1, '1217C 고속(1MHz 차동) 입력은 없음 — 고속 계수 쓰면 확인'], ['TM3AQ2', 1, 'A/O 2CH']], true]
  };
  var MOD = {
    '6ES72211BF': ['SM1221 8 D/I', [['TM3DI8']]],
    '6ES72211BH': ['SM1221 16 D/I', [['TM3DI16']]],
    '6ES72221BF': ['SM1222 8 D/O TR', [['TM3DQ8T']]],
    '6ES72221BH': ['SM1222 16 D/O TR', [['TM3DQ16T']]],
    '6ES72221HF': ['SM1222 8 D/O RLY', [['TM3DQ8R']]],
    '6ES72221HH': ['SM1222 16 D/O RLY', [['TM3DQ16R']]],
    '6ES72221XF': ['SM1222 8 D/O RLY 전환접점', [['TM3DQ8R', 1, '전환(c) 접점 아님 — a접점 8점']], true],
    '6ES72231BH': ['SM1223 8 D/I · 8 D/O TR', [['TM3DI8'], ['TM3DQ8T']]],
    '6ES72231BL': ['SM1223 16 D/I · 16 D/O TR', [['TM3DI16'], ['TM3DQ16T']]],
    '6ES72231PH': ['SM1223 8 D/I · 8 D/O RLY', [['TM3DM24R', 1, '16 D/I · 8 D/O RLY — 상위 호환(D/I 8점 여유)']]],
    '6ES72231PL': ['SM1223 16 D/I · 16 D/O RLY', [['TM3DM24R', 1, '16 D/I · 8 D/O RLY'], ['TM3DQ8R', 1, '8 D/O RLY — 합계 16 D/I · 16 D/O']]],
    '6ES72314HD': ['SM1231 4 A/I', [['TM3AI4']]],
    '6ES72314HF': ['SM1231 8 A/I', [['TM3AI8']]],
    '6ES72315ND': ['SM1231 4 A/I 16bit', [['TM3AI4', 1, '분해능 낮음(16bit → 12bit) — 정밀 계측이면 확인']], true],
    '6ES72315PD': ['SM1231 4 RTD', [['TM3TI4', 1, 'RTD(PT100/PT1000) · 열전대 4CH']]],
    '6ES72315PF': ['SM1231 8 RTD', [['TM3TI4', 2, 'TM3TI4 2개(4CH × 2) — TM3TI8T는 PT100 미지원']]],
    '6ES72315QD': ['SM1231 4 TC', [['TM3TI4', 1, '열전대 4CH']]],
    '6ES72315QF': ['SM1231 8 TC', [['TM3TI8T', 1, '열전대 8CH']]],
    '6ES72324HB': ['SM1232 2 A/O', [['TM3AQ2']]],
    '6ES72324HD': ['SM1232 4 A/O', [['TM3AQ4']]],
    '6ES72344HE': ['SM1234 4 A/I · 2 A/O', [['TM3AM6']]],
    '6AV21232DB': ['KTP400 Basic PN 4.3인치', [['PFXET6400WAD', 1, '7인치 — Pro-face ET6000에 4.3인치 없음']], true],
    '6AV21232GB': ['KTP700 Basic PN 7인치', [['PFXET6400WAD', 1, 'Pro-face 7인치 WIDE']]],
    '6AV21232GA': ['KTP700 Basic DP 7인치', [['PFXET6400WAD', 1, 'Pro-face 7인치 WIDE — Profibus 없음(이더넷·시리얼)']], true],
    '6AV21232JB': ['KTP900 Basic PN 9인치', [['PFXET6500WAD', 1, 'Pro-face 10.1인치 WIDE']]],
    '6AV21232MB': ['KTP1200 Basic PN 12인치', [['PFXET6600WAD', 1, 'Pro-face 12.1인치 WIDE']]],
    '6AV21232MA': ['KTP1200 Basic DP 12인치', [['PFXET6600WAD', 1, 'Pro-face 12.1인치 WIDE — Profibus 없음(이더넷·시리얼)']], true]
  };
  // CM1241·CB1241: S7-1200 CPU에는 시리얼 포트가 없어 붙이는 모듈. TM221은 CPU에 RS232/RS485 포트가 있다.
  var PORT = { '6ES72411CH': 'CM/CB1241 RS422/485', '6ES72411AH': 'CM1241 RS232' };
  var PORT_NOTE = 'TM221 CPU 내장 시리얼 포트(RS232/RS485) 사용 — 추가 품목 없음. CPU 1대에 포트 2개가 필요하면 TMC2SL1(TM221C 컴팩트형만), RS422(4선)는 안 됨';
  // 인버터: ATV320(책형, 0.18~15kW) · 18.5kW 이상 ATV630. [kW, 모델]
  var ATV3 = [[0.37, 'ATV320U04N4B'], [0.55, 'ATV320U06N4B'], [0.75, 'ATV320U07N4B'], [1.1, 'ATV320U11N4B'], [1.5, 'ATV320U15N4B'], [2.2, 'ATV320U22N4B'],
    [3, 'ATV320U30N4B'], [4, 'ATV320U40N4B'], [5.5, 'ATV320U55N4B'], [7.5, 'ATV320U75N4B'], [11, 'ATV320D11N4B'], [15, 'ATV320D15N4B'],
    [18.5, 'ATV630D18N4'], [22, 'ATV630D22N4'], [30, 'ATV630D30N4'], [37, 'ATV630D37N4'], [45, 'ATV630D45N4'], [55, 'ATV630D55N4']];
  var ATV1 = [[0.18, 'ATV320U02M2B'], [0.37, 'ATV320U04M2B'], [0.55, 'ATV320U06M2B'], [0.75, 'ATV320U07M2B'], [1.1, 'ATV320U11M2B'], [1.5, 'ATV320U15M2B'], [2.2, 'ATV320U22M2B']];
  // G120C 형번은 전류 코드라 kW를 표로 둔다(LO 정격)
  var G120C = { '118': 0.55, '123': 0.75, '132': 1.1, '143': 1.5, '158': 2.2, '175': 3, '188': 4, '213': 5.5, '217': 7.5, '226': 11, '232': 15, '238': 18.5 };
  // 소프트스타터 3RW30·3RW40 크기 → 400V kW, ATS22(제어 220V) [kW, 모델]
  var RW = { '13': 1.5, '14': 3, '16': 4, '17': 5.5, '18': 7.5, '24': 5.5, '26': 11, '27': 15, '28': 18.5, '36': 22, '37': 30, '38': 37, '46': 45, '47': 55 };
  var ATS = [[7.5, 'ATS22D17Q'], [15, 'ATS22D32Q'], [22, 'ATS22D47Q'], [30, 'ATS22D62Q'], [37, 'ATS22D75Q'], [45, 'ATS22D88Q'], [55, 'ATS22C11Q']];
  function pick(list, kw) { for (var i = 0; i < list.length; i++) if (list[i][0] >= kw - 1e-6) return list[i][1]; return null; }
  // 형번의 kW 코드는 두 자리라 18.5kW가 '18'로 적힌다 → 가까운 표준 출력으로 맞춘다
  var KW_STD = [0.12, 0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90];
  function kwStd(kw) { for (var i = 0; i < KW_STD.length; i++) if (Math.abs(KW_STD[i] - kw) / KW_STD[i] < 0.05) return KW_STD[i]; return kw; }
  function kwText(kw) { return +kw.toFixed(2) + 'kW'; }
  /** 기본 대응 찾기 → { desc, items: [[모델, 배수, 비고]], check } · { desc, port: true } · null */
  function builtin(code) {
    var k = key(code), m;
    if ((m = /^6ES721([1-7])1([ABH])/.exec(k)) && CPU['121' + m[1] + m[2]]) { var c = CPU['121' + m[1] + m[2]]; return { desc: c[0], items: c[1].map(function (x) { return [x[0], x[1] || 1, x[2] || CPU_NOTE]; }), check: !!c[2] }; }
    var p10 = k.slice(0, 10);
    if (MOD[p10]) return { desc: MOD[p10][0], items: MOD[p10][1].map(function (x) { return [x[0], x[1] || 1, x[2] || '']; }), check: !!MOD[p10][2] };
    if (PORT[p10]) return { desc: PORT[p10], port: true, note: PORT_NOTE };
    if ((m = /^6SL32105B([EB])(\d)(\d\d)/.exec(k))) { // V20: 출력(HO) kW = 두 자리 × 10^(첫 자리 − 3)
      var kw = kwStd(Number(m[3]) * Math.pow(10, Number(m[2]) - 3)), three = m[1] === 'E', to = pick(three ? ATV3 : ATV1, kw);
      var d = 'V20 ' + (three ? '3상 400V ' : '단상 230V ') + kwText(kw);
      return to ? { desc: d, items: [[to, 1, 'kW 기준 대체 — 정격전류·과부하·옵션(필터·제동저항) 확인']], check: false } : { desc: d, items: [], check: true };
    }
    if ((m = /^6SL32101KE(\d{3})/.exec(k)) && G120C[m[1]]) {
      var kw2 = G120C[m[1]];
      return { desc: 'G120C 3상 400V ' + kwText(kw2) + '(LO)', items: [[pick(ATV3, kw2), 1, 'kW(LO 정격) 기준 — 중부하(HO)·통신(Profinet 등)·안전기능(STO) 확인']], check: true };
    }
    if ((m = /^3RW[34]0(\d\d)/.exec(k)) && RW[m[1]]) {
      var kw3 = RW[m[1]], ctl = /1BB0/.test(k) ? ' · 지멘스 제어전압 24V → ATS22는 제어 220V' : '';
      return { desc: '소프트스타터 ' + k.slice(0, 7) + ' 약 ' + kwText(kw3) + '(400V)', items: [[pick(ATS, kw3), 1, 'kW 기준 대체(ATS22, 제어 220V)' + ctl + ' — 정격전류 확인']], check: true };
    }
    return null;
  }

  // ---------------------------------------------------------------- 변환·원가
  function unitCost(lp, rate) {
    var l = num(lp), d = num(rate);
    if (l === null || d === null || d < 0 || d >= 100) return null;
    return Math.round(l * (1 - d / 100));
  }
  /** 타사 품목 → 결과 행. 대응표에 한 형번이 여러 줄이면(예: CPU + 아날로그 출력 모듈) 줄마다 한 행. */
  function convert(inputs, entries, lps) {
    var idx = indexTable(entries), out = [];
    lps = lps || {};
    inputs.forEach(function (inp) {
      var hit = lookup(inp.code, idx);
      if (hit.entries.length) { hit.entries.forEach(function (e) { out.push(row(inp, e, e.to ? hit.how : 'nosub', lps)); }); return; }
      var b = builtin(inp.code);
      if (!b) { out.push(row(inp, null, 'none', lps)); return; }
      if (b.port) { var pr = row(inp, null, 'port', lps); pr.desc = b.desc; pr.note = b.note; pr.qty = '0'; out.push(pr); return; }
      if (!b.items.length) { var nr = row(inp, null, 'none', lps); nr.desc = b.desc; out.push(nr); return; }
      b.items.forEach(function (x) {
        var e = entryFrom({ from: inp.code, to: x[0], ratio: x[1], note: x[2], check: b.check ? 'Y' : '' });
        var r = row(inp, e, 'auto', lps);
        r.src = null; r.desc = b.desc; r.auto = { to: r.to, qty: r.qty };
        out.push(r);
      });
    });
    return out;
  }
  function row(inp, e, how, lps) {
    var ratio = e ? num(e.ratio) || 1 : 1, to = e ? e.to : '';
    return { name: inp.name || (e && e.name) || '', maker: inp.maker || (e && e.fromMaker) || '', code: inp.code, inQty: inp.qty, desc: '',
      how: how, src: e, to: to, toMaker: e ? e.toMaker : '', lp: (e && e.lp) || (to && lps && lps[key(to)]) || '', group: e ? e.group : '',
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
      if (r.how === 'port' && !r.to) return;
      if (!r.to || c.unit === null || !num(r.qty)) { skipped.push(r); return; }
      var nm = r.name || r.desc || r.group || '대체품';
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
    if (r.how === 'auto') return clean(r.to) !== clean(r.auto.to) || num(r.qty) !== num(r.auto.qty);
    if (!e || r.how === 'loose' || r.how === 'nosub') return true;
    return clean(e.to) !== clean(r.to) || num(e.lp) !== num(r.lp) || clean(e.group) !== clean(r.group) ||
      Math.abs((num(r.qty) || 0) - r.inQty * (num(e.ratio) || 1)) > 1e-9;
  }

  var api = { builtin: builtin, parseLp: parseLp, parseTsv: parseTsv, parseTable: parseTable, parseInput: parseInput, convert: convert, lookup: lookup, indexTable: indexTable,
    unitCost: unitCost, rowCost: rowCost, toItems: toItems, upsert: upsert, tableAoa: tableAoa, groupOf: groupOf, key: key, changedFromTable: changedFromTable };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------------------------------------------------------------- 화면 (00 견적서 탭 2단계 안)
  var A, el, $, table = null, rates = {}, lps = {}, rows = [], mounted = false;
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function msg(text, kind) { var s = $('xMsg'); s.textContent = text; s.className = 'status' + (kind ? ' ' + kind : ''); }
  function keepTable() { return store(TABLE_KEY, JSON.stringify(table)); }
  function keepLp() { return store(LP_KEY, JSON.stringify(lps)); }
  /** 모델별 LP를 이 브라우저에 기억하고, 같은 모델의 다른 행에도 채운다 */
  function setLp(model, v, from) {
    var k = key(model), n = num(v);
    if (!k || n === null || n <= 0) return;
    lps[k] = String(Math.round(n)); keepLp();
    rows.forEach(function (o) {
      if (o === from || key(o.to) !== k || num(o.lp) === num(lps[k])) return;
      o.lp = lps[k];
      if (o._tr) { o._tr.querySelector('.x-lp').value = o.lp; updateRow(o); }
    });
  }
  function today() { var d = new Date(); return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }

  function groups() {
    var g = {};
    (table ? table.entries : []).forEach(function (e) { if (e.to) g[e.group || '기타'] = 1; });
    rows.forEach(function (r) { if (r.to) g[r.group || '기타'] = 1; });
    Object.keys(rates).forEach(function (k) { if (num(rates[k]) !== null) g[k] = 1; });
    return Object.keys(g).sort();
  }
  function lpInfo() { var n = Object.keys(lps).length; return n ? ' 기억한 LP ' + n + '개 모델.' : ' LP는 모델마다 한 번 적으면 기억합니다.'; }
  function renderTableInfo() {
    var box = $('xTableInfo');
    A.clear(box);
    if (!table) {
      box.appendChild(el('span', { cls: 'sub', text: '회사 대응표 없음 — 기본 대응으로 찾습니다.' + lpInfo() }));
      return;
    }
    var n = table.entries.length, sub = table.entries.filter(function (e) { return e.to; }).length;
    box.appendChild(el('span', { cls: 'chip chip-ok', text: '대응표' }));
    box.appendChild(el('span', { cls: 'file-name', text: ' ' + table.name }));
    box.appendChild(el('span', { cls: 'sub', text: ' · ' + n + '개 형번 (대체품 있음 ' + sub + ')' + (table.dirty ? ' · 이 브라우저에서 고친 줄 ' + table.dirty + '개 — 「대응표 · LP 엑셀 받기」로 공용 폴더에 보관하세요' : '') + ' · 표에 없는 지멘스 형번은 기본 대응으로 찾습니다.' + lpInfo() }));
  }
  function renderRates() {
    var box = $('xRates');
    A.clear(box);
    var gs = groups();
    if (!gs.length) return;
    box.appendChild(el('span', { cls: 'x-rates-h', text: '할인율 (LP 대비 %, 분류별)' }));
    gs.forEach(function (g) {
      var id = 'xr-' + g.replace(/[^\w가-힣]/g, '_'), hint = el('span', { cls: 'sub' });
      var inp = el('input', { type: 'text', id: id, cls: 'num-in', inputmode: 'decimal', value: rates[g] || '', placeholder: '예: 45',
        oninput: function () { rates[g] = inp.value; store(RATE_KEY, JSON.stringify(rates)); setHint(); refreshCosts(); } });
      function setHint() { var d = num(inp.value); hint.textContent = d !== null && d >= 0 && d < 100 ? '→ LP × ' + +(1 - d / 100).toFixed(4) : '비어 있으면 원가 계산 안 함'; inp.classList.toggle('invalid', inp.value !== '' && !(d !== null && d >= 0 && d < 100)); }
      setHint();
      box.appendChild(el('span', { cls: 'q-inline' }, [el('label', { for: id, text: g }), inp, el('span', { text: '%' }), hint]));
    });
  }

  var HOW = { exact: ['대응표', 'chip-ok'], loose: ['대응표 · 끝 버전 다름', 'chip-warn'], auto: ['자동', 'chip-ok'], port: ['추가 없음', 'chip-ok'],
    none: ['못 찾음', 'chip-bad'], nosub: ['대체품 없음', 'chip-bad'] };
  function renderRows() {
    var tb = $('xTable').querySelector('tbody');
    A.clear(tb);
    $('xResult').hidden = !rows.length;
    rows.forEach(function (r, i) {
      var tr = el('tr', { cls: r.to || r.how === 'port' ? null : 'x-miss' });
      function inp(k, cls, label) {
        var x = el('input', { type: 'text', value: r[k] || '', cls: cls || null, 'aria-label': (i + 1) + '행 ' + label, inputmode: /x-n/.test(cls || '') ? 'decimal' : null,
          oninput: function () {
            var prev = r[k];
            r[k] = x.value;
            if (k === 'to') { // 분류를 직접 고치지 않았으면 모델로 다시 짐작
              r.toMaker = r.src && clean(r.src.to) === clean(x.value) ? r.src.toMaker : makerOf(x.value);
              if (!r.group || r.group === groupOf(prev)) { r.group = groupOf(x.value); tr.querySelector('.x-group').value = r.group; }
              tr.classList.toggle('x-miss', !r.to && r.how !== 'port');
              if (!num(r.lp) && lps[key(r.to)]) { r.lp = lps[key(r.to)]; tr.querySelector('.x-lp').value = r.lp; }
            }
            if (k === 'lp') setLp(r.to, x.value, r);
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
          msg(r.code + ' → ' + r.to + ' 을(를) 대응표에 저장했습니다(이 브라우저). 다른 직원과 같이 쓰려면 「대응표 · LP 엑셀 받기」로 공용 폴더의 대응표를 바꾸세요.', 'ok');
        } });
      [el('td', { cls: 'c-no', text: String(i + 1) }),
        el('td', { cls: 'x-from' }, [el('b', { text: r.code }), el('span', { cls: 'sub', text: [r.maker, r.name, r.desc].filter(Boolean).join(' · ') })]),
        el('td', { cls: 'x-num', text: String(+r.inQty.toFixed(3)) }),
        el('td', { cls: 'x-how' }, chips),
        inp('to', 'x-to', '슈나이더 모델'),
        inp('qty', 'x-n x-qty', '대체 수량'),
        inp('group', 'x-group', '분류'),
        inp('lp', 'x-n x-lp', 'LP'),
        el('td', { cls: 'x-num x-rate' }),
        el('td', { cls: 'x-num x-unit' }),
        el('td', { cls: 'x-num x-amt' }),
        el('td', { cls: 'x-note' }, [r.note ? el('span', { text: r.note }) : null, el('div', {}, [save])]),
        el('td', { cls: 'c-act' }, [el('button', { type: 'button', cls: 'btn btn-icon', text: '×', 'aria-label': (i + 1) + '행 지우기',
          onclick: function () { rows.splice(rows.indexOf(r), 1); renderRows(); renderRates(); } })])
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
    var lp = 0, cost = 0, ok = 0, miss = 0, norate = 0, port = 0;
    rows.forEach(function (r) {
      var c = rowCost(r, rates);
      if (!r.to && r.how === 'port') { port++; return; }
      if (!r.to) { miss++; return; }
      if (c.unit === null) { norate++; return; }
      ok++; lp += c.lpAmount || 0; cost += c.amount || 0;
    });
    box.appendChild(el('span', {}, [el('b', { text: '원가 합계 ' + won(cost) + ' 원' }), ' · LP 합계 ' + won(lp) + ' 원 · 원가 계산 ' + ok + '행']));
    if (port) box.appendChild(el('span', { text: ' · CPU 내장 포트로 대체(추가 없음) ' + port + '행' }));
    if (norate) box.appendChild(el('span', { cls: 'x-warn', text: ' · LP·할인율 빈 행 ' + norate + ' (LP는 모델마다 한 번만 적으면 기억)' }));
    if (miss) box.appendChild(el('span', { cls: 'x-warn', text: ' · 대체품 못 찾음 ' + miss + '행 (모델·LP를 적으면 넣을 수 있음)' }));
  }

  function run(inputs, from) {
    if (!inputs.length) { msg(from + '에서 형번을 찾지 못했습니다. 형번(규격)과 수량 열을 복사해 붙여 넣으세요.', 'bad'); return; }
    rows = convert(inputs, table ? table.entries : [], lps);
    renderRates(); renderRows();
    var cnt = function (f) { return rows.filter(f).length; };
    var miss = cnt(function (r) { return !r.to && r.how !== 'port'; }), loose = cnt(function (r) { return r.how === 'loose'; }),
      auto = cnt(function (r) { return r.how === 'auto'; }), chk = cnt(function (r) { return r.check; }), nolp = cnt(function (r) { return r.to && !num(r.lp); });
    msg(from + ': 타사 ' + inputs.length + '품목 → 대체 ' + cnt(function (r) { return r.to; }) + '행' + (auto ? ' (기본 대응 ' + auto + '행)' : '') +
      (loose ? ' · 끝 버전만 다른 형번 ' + loose + '행' : '') + (chk ? ' · 사양 확인 필요 ' + chk + '행' : '') + '.' +
      (nolp ? ' LP가 빈 ' + nolp + '행은 LP를 적으세요(모델마다 한 번 적으면 기억).' : '') +
      (miss ? ' 못 찾은 ' + miss + '행은 슈나이더 모델·LP를 적고 「대응표에 저장」하면 다음부터 자동으로 찾습니다.' : ''), miss || nolp ? '' : 'ok');
  }
  function onTableFile(file) {
    if (!file) return;
    if (!window.XLSX) { msg('엑셀 읽기 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.', 'bad'); return; }
    A.readWorkbook(file).then(function (wb) {
      var best = null, lpIn = {};
      wb.SheetNames.forEach(function (n) {
        var aoa = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true, blankrows: false });
        var t = parseTable(aoa);
        if (t && t.entries.length && (!best || t.entries.length > best.entries.length)) best = t;
        Object.assign(lpIn, parseLp(aoa));
      });
      if (best) best.entries.forEach(function (e) { if (e.to && num(e.lp)) lpIn[key(e.to)] = e.lp; });
      var nLp = Object.keys(lpIn).length;
      if (nLp) { Object.assign(lps, lpIn); keepLp(); }
      if (!best) {
        if (!nLp) throw new Error('타사 형번(규격)과 슈나이더 모델(모델명) 또는 LP 머리글을 찾지 못했습니다.');
        renderTableInfo(); refillLp();
        msg('LP ' + nLp + '개 모델을 불러왔습니다(이 브라우저에 기억).', 'ok');
        return;
      }
      var lost = table && table.dirty ? table.dirty : 0;
      table = { name: file.name, entries: best.entries, dirty: 0 };
      var ok = keepTable();
      renderTableInfo(); renderRates();
      if (rows.length) run(rows.reduce(function (a, r) { if (!a.some(function (x) { return x.code === r.code; })) a.push({ name: r.name, maker: r.maker, code: r.code, qty: r.inQty }); return a; }, []), '새 대응표로 다시 찾기');
      else msg('대응표를 등록했습니다: ' + best.entries.length + '개 형번' + (ok ? ' (이 브라우저에 기억).' : ' (이번 화면에서만 — 브라우저 저장 공간 없음).') + (lost ? ' 이전에 이 브라우저에서 고친 ' + lost + '줄은 새 표로 바뀌었습니다.' : '') + ' 분류별 할인율을 적으세요.', 'ok');
    }).catch(function (e) { msg('대응표를 읽지 못했습니다: ' + ((e && e.message) || e), 'bad'); });
  }
  /** 대응표나 기본 대응에서 찾을 수 있는 형번인지 */
  function known() {
    var idx = indexTable(table ? table.entries : []);
    return function (c) { return lookup(c, idx).entries.length > 0 || !!builtin(c); };
  }
  function refillLp() { rows.forEach(function (r) { if (r.to && !num(r.lp) && lps[key(r.to)]) { r.lp = lps[key(r.to)]; if (r._tr) r._tr.querySelector('.x-lp').value = r.lp; } updateRow(r); }); renderSum(); }
  function saveTable() {
    if (!window.XLSX) { msg('엑셀 라이브러리를 불러오지 못했습니다.', 'bad'); return; }
    var ws = XLSX.utils.aoa_to_sheet(tableAoa(table ? table.entries : []));
    ws['!cols'] = [8, 11, 22, 18, 26, 11, 18, 6, 11, 30, 8].map(function (w) { return { wch: w }; });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '대응표');
    // 모델별 LP(기본 대응으로 찾은 모델 포함) — 다른 PC에서 「대응표 · LP 엑셀 등록」하면 같이 들어간다
    var lpWs = XLSX.utils.aoa_to_sheet([['슈나이더 모델', 'LP']].concat(Object.keys(lps).sort().map(function (k) { return [k, num(lps[k])]; })));
    lpWs['!cols'] = [{ wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, lpWs, 'LP');
    var name = '타사-슈나이더_대응표_' + today() + '.xlsx';
    A.saveFile(name, new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).then(function () {
      if (table) { table.dirty = 0; keepTable(); renderTableInfo(); }
      msg(name + ' 저장' + (table || Object.keys(lps).length ? ' — LP가 들어 있으니 회사 공용 폴더(영업)에만 두세요. 다른 PC에서는 이 파일을 「대응표 · LP 엑셀 등록」하면 대응표·LP가 함께 들어갑니다.' : ' — 빈 서식입니다. 줄을 채워 「대응표 · LP 엑셀 등록」으로 넣으세요.'), 'ok');
    }, function (e) { msg(A.saveErrorText(e, '대응표'), 'bad'); });
  }
  function addToQuote() {
    var t = toItems(rows, rates, $('xOrig').checked);
    if (!t.items.length) { msg('넣을 행이 없습니다. 슈나이더 모델·LP·할인율이 모두 있어야 원가가 계산됩니다.', 'bad'); return; }
    var Q = window.IsoViews && window.IsoViews.quote;
    Q.addCosted(t.items, '타사 → 슈나이더 대체');
    msg('견적서 품목에 ' + t.items.length + '행을 넣었습니다(원가 = LP × (1 − 할인율)).' + (t.skipped.length ? ' 모델·LP·할인율이 빠진 ' + t.skipped.length + '행은 넣지 않았습니다.' : ''), 'ok');
  }

  function mount() {
    if (mounted) return;
    mounted = true;
    A = window.IsoApp; el = A.el; $ = A.$;
    try { var t = JSON.parse(load(TABLE_KEY) || 'null'); if (t && Array.isArray(t.entries)) table = { name: String(t.name || '대응표'), entries: t.entries.map(entryFrom), dirty: t.dirty || 0 }; } catch (e) { table = null; }
    try { var r = JSON.parse(load(RATE_KEY) || 'null'); if (r && typeof r === 'object') rates = r; } catch (e) { rates = {}; }
    try { var l = JSON.parse(load(LP_KEY) || 'null'); if (l && typeof l === 'object') lps = l; } catch (e) { lps = {}; }
    if (load(ORIG_KEY) === '0') $('xOrig').checked = false;
    $('xOrig').addEventListener('change', function () { store(ORIG_KEY, this.checked ? '1' : '0'); });
    $('xTableFile').addEventListener('change', function () { onTableFile(this.files[0]); this.value = ''; });
    $('xTableSave').addEventListener('click', saveTable);
    $('xGo').addEventListener('click', function () { run(parseInput(parseTsv($('xPaste').value), known()), '붙여 넣은 표'); });
    $('xFile').addEventListener('change', function () {
      var f = this.files[0]; this.value = '';
      if (!f) return;
      A.readWorkbook(f).then(function (wb) {
        var best = [];
        wb.SheetNames.forEach(function (n) { var l = parseInput(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true, blankrows: false }), known()); if (l.length > best.length) best = l; });
        run(best, f.name);
      }).catch(function (e) { msg('엑셀을 읽지 못했습니다: ' + ((e && e.message) || e), 'bad'); });
    });
    $('xAdd').addEventListener('click', addToQuote);
    $('xClear').addEventListener('click', function () { rows = []; $('xPaste').value = ''; renderRows(); renderRates(); msg('', ''); });
    renderTableInfo(); renderRates(); renderRows();
  }

  window.IsoXref = { mount: mount, _api: api, _rows: function () { return rows; } };
})();
