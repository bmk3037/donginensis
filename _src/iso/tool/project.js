/* 프로젝트 정보·BOM·I/O 리스트·기준표를 읽어 양식 묶음을 만든다(화면과 무관한 부분). */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- 공통
  function norm(s) {
    return String(s === null || s === undefined ? '' : s).toLowerCase().replace(/[\s_\-\.\/()·:\[\]]/g, '');
  }
  function clean(s) {
    return String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim();
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }
  function safeName(s) {
    return clean(s).replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 40);
  }

  // ---------------------------------------------------------------- 열 찾기
  var SYN = {
    bom: [
      ['qty', ['수량', 'qty', 'quantity', '개수', 'ea']],
      ['unit', ['단위', 'unit', 'uom']],
      ['tag', ['tag', '태그', '도면기호', '부품기호', '위치기호', '기호', '심볼', 'symbol', 'device', 'reference', 'ref']],
      ['panel', ['판넬', 'panel', '반명', 'cubicle']],
      ['maker', ['메이커', '제조사', '제작사', '브랜드', 'maker', 'manufacturer', 'brand', 'mfr']],
      ['model', ['모델', '형번', '형식', 'model', 'partno', 'partnumber', 'orderno', '주문번호', '규격', 'catalog', 'catno', 'pn']],
      ['name', ['품명', '품목', '명칭', '부품명', '내용', 'description', 'desc', 'item', 'name']]
    ],
    io: [
      ['panel', ['판넬', 'panel', '반명', 'cubicle']],
      ['addr', ['주소', 'address', 'addr', '번지', '채널', 'channel', 'point', 'io']],
      ['type', ['구분', 'type', '타입', '종류', '신호형태']],
      ['tag', ['tag', '태그', '심볼', 'symbol', '변수', 'variable']],
      ['expect', ['기대', '동작', 'range', '범위', '스케일', 'scale', '비고', 'remark', 'note']],
      ['desc', ['설명', 'description', 'comment', '코멘트', '내용', '명칭', '신호명', '기능', 'signal', 'name']]
    ],
    std: [
      ['item', ['항목', 'item', '시험항목']],
      ['method', ['방법', '시험조건', '조건', 'method']],
      ['source', ['근거', '자료', '출처', 'source']],
      ['value', ['값', '기준', '허용', 'value', 'criteria']],
      ['target', ['모델', '정격', '대상', 'target']]
    ]
  };
  var LABELS = {
    bom: { name: '품명', model: '모델·형번', maker: '메이커', qty: '수량', unit: '단위', tag: '도면 기호(Tag)', panel: '판넬' },
    io: { addr: '주소', tag: 'Tag', desc: '설명', type: '구분', expect: '기대 동작·범위', panel: '판넬' },
    std: { item: '항목', target: '모델·정격·대상', value: '값·단위·허용범위', method: '방법·시험조건', source: '근거자료' }
  };
  SYN.bomTotal = SYN.bom;
  LABELS.bomTotal = LABELS.bom;

  function classifyHeader(cellText, kind, used) {
    var h = norm(cellText);
    if (!h) return null;
    var list = SYN[kind];
    for (var i = 0; i < list.length; i++) {
      var key = list[i][0];
      if (used[key] !== undefined) continue;
      var syns = list[i][1];
      for (var j = 0; j < syns.length; j++) {
        var s = syns[j];
        var korean = /[가-힣]/.test(s);
        if (korean || s.length >= 4) { if (h.indexOf(s) >= 0) return key; }
        else if (h === s || (s.length === 3 && h.indexOf(s) === 0)) return key;
      }
    }
    return null;
  }

  /** 앞쪽 12행에서 머리글 행을 찾고 열 연결을 정한다. */
  function detectColumns(rows, kind) {
    var best = { headerRow: 0, map: {}, hits: 0 };
    for (var r = 0; r < Math.min(rows.length, 12); r++) {
      var used = {}, hits = 0;
      (rows[r] || []).forEach(function (cell, c) {
        var key = classifyHeader(cell, kind, used);
        if (key) { used[key] = c; hits++; }
      });
      if (hits > best.hits) best = { headerRow: r, map: used, hits: hits };
    }
    return best;
  }

  // ---------------------------------------------------------------- BOM
  // 분류 규칙: 품명+모델을 소문자로 붙인 글에서 차례로 찾는다(먼저 맞는 분류가 우선).
  var CATS = [
    ['외함', [/외함|함체|enclosure|cabinet/]],
    ['인버터', [/인버터|inverter|\bvfd\b|\bvsd\b|드라이브|\batv\d|\bacs\d{3}|\bfr-[af]\d|\bsv\d{4}/]],
    ['차단기', [/차단기|누전|breaker|\bmccb\b|\belcb?\b|\bmcb\b|\bmpcb\b|\bezc\d|\bnsx\d|\bgv[23]\w|\bic60|acti9|\babn\d|\bsbn\d/]],
    ['HMI', [/\bhmi|터치\s*패널|touch\s*panel|\bgp-\d/]],
    ['PLC', [/\bplc\b|\bcpu\b|\bm2[2-6]\d\b|\btm2\d{2}[a-z]|\btm3[a-z]|modicon|입출력\s*모듈|통신\s*모듈|아날로그\s*모듈/]],
    ['안전부품', [/비상\s*정지|emergency|e-stop|안전\s*릴레이|safety|\bxps|preventa/]],
    ['접촉기·보호계전기', [/eocr|접촉기|contactor|\blc1[df]\w|열동|overload|\blrd\d|(^|\s)mc(\s|$)/]],
    ['전원장치', [/smps|power\s*supply|파워\s*서플라이|\babl8|전원\s*장치|정류기/]]
  ];
  var METHOD = {
    '외함': '도면 치수·가공·도장·접지점',
    '인버터': '모델·용량·전압 명판 대조, 외관',
    'PLC': '모델 대조, 외관',
    'HMI': '모델 대조, 외관·화면',
    '안전부품': '모델·인증 표시 대조, 외관',
    '차단기': '모델·정격(AF/AT) 대조, 외관',
    '접촉기·보호계전기': '모델·코일전압·정격 대조, 외관',
    '전원장치': '모델·출력전압·용량 대조, 외관',
    '기타': '모델·수량 대조, 외관'
  };

  function classify(name, model) {
    var s = (' ' + String(name) + ' ' + String(model) + ' ').toLowerCase();
    for (var i = 0; i < CATS.length; i++) {
      var ks = CATS[i][1];
      for (var j = 0; j < ks.length; j++) if (ks[j].test(s)) return CATS[i][0];
    }
    return '기타';
  }

  /** "K1~K8", "Q11, Q12" 같은 기호 목록을 낱개로 나눈다. */
  function splitTags(text) {
    var out = [];
    clean(text).split(/[,;\/]+|\s+/).forEach(function (t) {
      t = t.trim();
      if (!t) return;
      var m = t.match(/^([A-Za-z가-힣\-]*)(\d+)\s*[~∼]\s*([A-Za-z가-힣\-]*)(\d+)$/);
      if (m && (m[3] === '' || m[3] === m[1])) {
        var a = +m[2], b = +m[4];
        if (b >= a && b - a < 60) { for (var k = a; k <= b; k++) out.push(m[1] + k); return; }
      }
      out.push(t);
    });
    return out;
  }

  function parseBom(rows, det) {
    var m = det.map, items = [];
    for (var r = det.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      var get = function (k) { return m[k] === undefined ? '' : clean(row[m[k]]); };
      var name = get('name'), model = get('model');
      if (!name && !model) continue;
      var qtyRaw = get('qty');
      var qtyNum = /^(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/.test(qtyRaw) ? Number(qtyRaw.replace(/,/g, '')) : NaN;
      var cat = classify(name, model);
      items.push({
        name: name, model: model, maker: get('maker'), unit: get('unit'), qtyText: qtyRaw,
        qty: isFinite(qtyNum) ? qtyNum : null, tags: splitTags(get('tag')), panel: get('panel'),
        category: cat, major: cat !== '기타'
      });
    }
    return items;
  }

  // ---------------------------------------------------------------- I/O
  function ioType(typeText, addr) {
    var t = norm(typeText);
    var exact = { di: 'DI', do: 'DO', ai: 'AI', ao: 'AO', 디지털입력: 'DI', 디지털출력: 'DO', 아날로그입력: 'AI', 아날로그출력: 'AO' };
    if (exact[t]) return exact[t];
    if (/통신|comm|modbus|ethernet|profinet|canopen|rs485/.test(t)) return '통신';
    if (/인터록|interlock/.test(t)) return '인터록';
    if (/알람|alarm/.test(t)) return '알람';
    if (/^d?i(nput)?$|입력/.test(t) && !/아날로그|analog/.test(t)) return 'DI';
    if (/^d?o(utput)?$|출력/.test(t) && !/아날로그|analog/.test(t)) return 'DO';
    if (/analog.*in|아날로그.*입력/.test(t)) return 'AI';
    if (/analog.*out|아날로그.*출력/.test(t)) return 'AO';
    var a = String(addr || '').toUpperCase().replace(/\s/g, '');
    if (/^%?IW/.test(a)) return 'AI';
    if (/^%?QW/.test(a)) return 'AO';
    if (/^%?I[XB]?\d/.test(a) || /^X[0-9A-F]+$/.test(a)) return 'DI';
    if (/^%?Q[XB]?\d/.test(a) || /^Y[0-9A-F]+$/.test(a)) return 'DO';
    return clean(typeText);
  }

  function parseIo(rows, det) {
    var m = det.map, pts = [];
    for (var r = det.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      var get = function (k) { return m[k] === undefined ? '' : clean(row[m[k]]); };
      var addr = get('addr'), tag = get('tag'), desc = get('desc');
      if (!addr && !tag && !desc) continue;
      pts.push({ addr: addr, tag: tag, desc: desc, type: ioType(get('type'), addr), expect: get('expect'), panel: get('panel') });
    }
    return pts;
  }

  // ---------------------------------------------------------------- 기준표(QF-15)
  function parseStd(rows, det) {
    var m = det.map, out = [];
    for (var r = det.headerRow + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      var get = function (k) { return m[k] === undefined ? '' : clean(row[m[k]]); };
      if (!get('item')) continue;
      out.push({ item: get('item'), target: get('target'), value: get('value'), method: get('method'), source: get('source') });
    }
    return out;
  }

  var QF06_FROM_STD = {
    '외관·구성·명판': ['외관·구성·명판', '명판·표시'],
    '외함·보호등급': ['외함·보호등급', '전원·단락·IP'],
    '공간·연면거리': ['공간·연면거리'],
    '기계적 동작': ['기계적 동작'],
    '보호기기 설정값': ['보호기기 설정값'],
    '절연저항': ['절연저항'],
    '내전압': ['내전압'],
    '보호접지 연속성': ['보호접지 연속성', '접지 연속성'],
    '전원·상순': ['전원·상순', '전원·단락·IP'],
    'I/O·통신': ['I/O·통신'],
    '인터록·비상정지': ['인터록·비상정지'],
    '인버터·PLC': ['인버터·PLC'],
    '알람·보호': ['알람·보호']
  };

  function stdFind(std, names) {
    for (var i = 0; i < names.length; i++) {
      for (var j = 0; j < std.length; j++) if (norm(std[j].item) === norm(names[i])) return std[j];
    }
    return null;
  }

  // ---------------------------------------------------------------- 문서 계획
  var STAGE = {
    '01_수주고객': '1 수주', '02_설계기준': '2 설계', '03_구매입고': '3 구매·입고', '04_제작': '4 제작',
    '05_FAT출하': '5 FAT·출하', '06_SAT인수': '6 SAT·인수', '07_PLC': '7 PLC', '08_NCR_AS': '8 NCR·AS'
  };

  function itemsForPanel(bom, panel) {
    var hasPanelCol = bom.some(function (it) { return it.panel; });
    if (!hasPanelCol) return bom;
    return bom.filter(function (it) { return !it.panel || norm(it.panel) === norm(panel.tag); });
  }

  function compareBom(bom, total) {
    if (!total || !total.length) return ['프로젝트 원본 총수량 BOM을 불러오세요'];
    var errors = [], expected = new Map(), allocated = new Map();
    [['원본', total, expected], ['배분', bom, allocated]].forEach(function (source) {
      source[1].forEach(function (it, i) {
        if (typeof it.qty !== 'number' || !Number.isFinite(it.qty) || it.qty <= 0) { errors.push(source[0] + ' BOM ' + (i + 1) + '행: 대조할 양수 수량과 단위를 분리해 입력'); return; }
        var key = JSON.stringify([it.name, it.model, it.maker, it.unit].map(function (x) { return clean(x).toLowerCase(); }));
        var group = source[2].get(key);
        if (!group) { group = {qty: 0, label: [it.name, it.model, it.maker, it.unit].filter(Boolean).join(' ')}; source[2].set(key, group); }
        group.qty += it.qty;
        if (!Number.isFinite(group.qty) || group.qty > Number.MAX_SAFE_INTEGER) errors.push(source[0] + ' BOM: 수량 합계가 계산 가능한 범위를 초과합니다');
      });
    });
    new Set(Array.from(expected.keys()).concat(Array.from(allocated.keys()))).forEach(function (key) {
      var original = expected.get(key), assigned = allocated.get(key);
      var want = original ? original.qty : 0, got = assigned ? assigned.qty : 0;
      // shortcut: 소수 수량은 절대 오차 1e-9 허용; 더 정밀한 단위에는 십진수 연산을 적용한다.
      var tolerance = Number.isInteger(want) && Number.isInteger(got) ? 0 : 1e-9;
      if (Math.abs(want - got) > tolerance) errors.push('BOM 수량 대조: ' + (original || assigned).label + ' — 원본 ' + want + ' / 배분 ' + got);
    });
    return errors;
  }

  function validateInput(p, bom, basis, io, total) {
    var errors = [], panels = (p.panels || []).filter(function (x) { return clean(x.tag); });
    var tags = panels.map(function (x) { return norm(x.tag); });
    var serials = panels.map(function (x) { return clean(x.serial); }).filter(Boolean);
    if (clean(p.previousDrawRev) && (!clean(p.drawRev) || !clean(p.changeReason) || !clean(p.changePanels) || !clean(p.changeImpact))) errors.push('도면 변경 시 새 Rev·변경 사유·대상 판넬·영향/재검사 계획 입력');
    if (clean(p.previousDrawRev) && clean(p.previousDrawRev) === clean(p.drawRev)) errors.push('변경 전·후 도면 Rev가 같습니다');
    if (clean(p.previousDrawRev) && clean(p.changePanels) && clean(p.changePanels) !== '전체' && splitTags(p.changePanels).some(function (tag) { return tags.indexOf(norm(tag)) < 0; })) errors.push('도면 변경 대상에 등록되지 않은 판넬이 있습니다 (Tag 목록 또는 전체 입력)');
    if (new Set(tags).size !== tags.length) errors.push('판넬 Tag 중복');
    if (new Set(serials).size !== serials.length) errors.push('제조번호 중복');
    if (bom.length && basis !== 'perPanel' && basis !== 'allocated') errors.push('BOM 수량 기준 선택');
    bom.forEach(function (it, i) {
      var row = 'BOM ' + (i + 1) + '행: ';
      if ((!clean(it.qtyText) && it.qty === null) || ((it.major || it.qty !== null || /^[+-]?[\d.,]+$/.test(clean(it.qtyText))) && (!Number.isFinite(Number(it.qty)) || Number(it.qty) <= 0))) errors.push(row + '양수 수량 필요');
      if (basis === 'allocated' && !clean(it.panel)) errors.push(row + '총수량을 판넬별 배분하고 판넬 열 입력');
      if (clean(it.panel) && tags.indexOf(norm(it.panel)) < 0) errors.push(row + '등록되지 않은 판넬');
    });
    if (basis === 'allocated') errors = errors.concat(compareBom(bom, total));
    (io || []).forEach(function (point, i) {
      if (clean(point.panel) && tags.indexOf(norm(point.panel)) < 0) errors.push('I/O ' + (i + 1) + '행: 등록되지 않은 판넬');
    });
    return errors;
  }

  function readProject(text) {
    var saved = JSON.parse(text);
    if (!saved || saved.format !== 'DI-ISO-PROJECT' || saved.version !== 1 || !saved.state) throw new Error('지원하는 프로젝트 저장 파일이 아닙니다.');
    var data = saved.state;
    if (data.bomTotal === undefined) data.bomTotal = null;
    if (!data.project || typeof data.project !== 'object' || Array.isArray(data.project) || !Array.isArray(data.panels) || !data.panels.length) throw new Error('프로젝트·판넬 정보가 잘못되었습니다.');
    if (Object.keys(data.project).some(function (key) { return data.project[key] !== null && ['string', 'boolean', 'number'].indexOf(typeof data.project[key]) < 0; }) || typeof data.sample !== 'boolean') throw new Error('프로젝트 입력값이 잘못되었습니다.');
    data.panels.forEach(function (x) {
      if (!x || ['tag', 'desc', 'serial'].some(function (key) { return typeof x[key] !== 'string'; })) throw new Error('판넬 정보가 잘못되었습니다.');
    });
    ['bom', 'bomTotal', 'io', 'std'].forEach(function (kind) {
      var value = data[kind];
      if (value !== null && (!value || !Array.isArray(value.items) || !Array.isArray(value.rows) || !value.det)) throw new Error(kind + ' 원본 데이터가 잘못되었습니다.');
      if (!value) return;
      if (value.kind !== kind || typeof value.fileName !== 'string' || typeof value.sample !== 'boolean' || value.rows.some(function (row) { return !Array.isArray(row) || row.some(function (cell) { return cell !== null && ['string', 'number', 'boolean'].indexOf(typeof cell) < 0; }); })) throw new Error(kind + ' 원본 행이 잘못되었습니다.');
      var det = value.det, header = value.rows[det.headerRow] || [];
      if (!Number.isInteger(det.headerRow) || det.headerRow < 0 || det.headerRow >= Math.max(1, value.rows.length) || !det.map || typeof det.map !== 'object' || Array.isArray(det.map) || Object.keys(det.map).some(function (key) { return !Object.prototype.hasOwnProperty.call(LABELS[kind], key) || !Number.isInteger(det.map[key]) || det.map[key] < 0 || det.map[key] >= header.length; })) throw new Error(kind + ' 열 연결이 잘못되었습니다.');
      if (value.wb && (!Array.isArray(value.wb.SheetNames) || !value.wb.Sheets || typeof value.wb.Sheets !== 'object' || value.wb.SheetNames.some(function (name) { return typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(value.wb.Sheets, name) || !value.wb.Sheets[name] || typeof value.wb.Sheets[name] !== 'object'; }) || value.wb.SheetNames.indexOf(value.sheet) < 0)) throw new Error(kind + ' 시트 정보가 잘못되었습니다.');
      var items = { bom: parseBom, bomTotal: parseBom, io: parseIo, std: parseStd }[kind](value.rows, det);
      if (kind === 'bom') {
        if (value.items.length !== items.length || value.items.some(function (item) { return !item || typeof item.major !== 'boolean'; })) throw new Error('BOM 주요 부품 선택이 잘못되었습니다.');
        items.forEach(function (item, i) { item.major = value.items[i].major; });
      }
      // 저장된 계산값 대신 원본 행으로 다시 읽고, 사용자 주요 부품 선택만 유지한다.
      value.items = items;
    });
    if (['', 'perPanel', 'allocated'].indexOf(saved.bomBasis) < 0) throw new Error('BOM 수량 기준이 잘못되었습니다.');
    return saved;
  }

  // ---------------------------------------------------------------- 일정(예정일)
  var SCHEDULE = [['dOrder', '수주'], ['dDesign', '설계 승인'], ['dMaterial', '자재 입고'], ['dWiring', '배선 완료'],
    ['dFat', 'FAT'], ['dShip', '출하'], ['dSat', 'SAT·인수']];
  function md(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(d)); return m ? (+m[2]) + '/' + (+m[3]) : clean(d); }
  /** '수주 10/1 · 설계 승인 10/8 · … · 납기 11/20' (full: 연도 포함) */
  function scheduleText(p, full) {
    var out = SCHEDULE.filter(function (s) { return clean(p[s[0]]); }).map(function (s) { return s[1] + ' ' + (full ? clean(p[s[0]]) : md(p[s[0]])); });
    if (clean(p.due)) out.push('납기 ' + (full ? clean(p.due) : md(p.due)));
    return out.join(' · ');
  }

  /** 생성할 문서 목록. 각 문서: {folder, file, code, panel, values, rows, blankMin} */
  function plan(p, bom, io, std, opts) {
    opts = opts || {};
    var date = opts.date || today();
    var pj = clean(p.pj) || 'PJ';
    var panels = (p.panels || []).filter(function (x) { return clean(x.tag); });
    var tags = panels.map(function (x) { return clean(x.tag); });
    var tagList = tags.join(', ') + (tags.length ? ' (' + tags.length + '면)' : '');
    var stdRev = clean(p.stdRev);
    var docs = [];

    function file(code, panel) { return pj + '_' + code + (panel ? '_' + safeName(panel) : '') + '_' + date + '_Rev' + safeName(clean(p.recordRev) || '00') + '.xlsx'; }
    function add(folder, code, panel, values, rows, blankMin) {
      var d = { folder: folder, code: code, panel: panel || '', file: file(code, panel), values: values || {}, rows: rows, blankMin: blankMin };
      docs.push(d);
      return d;
    }
    function pv(panel) { return clean(panel.tag) + (clean(panel.serial) ? ' / ' + clean(panel.serial) : ''); }

    // 02 설계
    var qf02 = { folder: '02_설계기준', file: file('QF-02') };
    var qf15 = { folder: '02_설계기준', file: file('QF-15') };

    // 01 PF-00
    // 계약·입력으로 해당 없는 줄은 '해당없음 (자동: 사유)'로 미리 채운다(작성 예시도 넣지 않음)
    function NA(why) { return '해당없음 (자동: ' + why + ')'; }
    function tplRows(code) { return ((opts.forms && opts.forms[code] && opts.forms[code].rows) || []).map(function (r) { return r.slice(); }); }

    var pfRows = [
      ['수주', '계약 요구·규격·납기·보증·포장 조건 합의 / 미합의 해결', '01_수주고객 (PO·사양서·견적서)'],
      ['설계', 'QF-02 입력·검토·검증 / QF-15 기술기준 승인 / 고객 승인도(해당 시)', '02_설계기준 / QF-02, QF-15'],
      ['구매·입고', 'QF-10 승인 공급자 발주 / QF-03 판정 (부품 LOT 미부여)', '03_구매입고 / QF-03'],
      ['제작', 'QF-16 공정 이동 / QF-05 작업자 검사·숙련자 확인 / 변경 반영', '04_제작 / QF-16, QF-05 ×' + tags.length],
      ['출하', 'QF-06 합격 · 최종 PLC(QF-08) · 포장 확인(QF-16) · 출하 영향 NCR 종결 또는 고객 특채 서면 · 판넬 LOT 출하 기록(QF-04)', '05_FAT출하 / QF-06, QF-06-1, SF-02 ×' + tags.length + ', QF-04'],
      ['SAT·인수', 'QF-07 기능·미결 종결·고객 인수 / SF-02·SF-03 해당 시', p.sat ? '06_SAT인수 / QF-07' + (p.outsource ? ', SF-03' : '') : ''],
      ['종료', '최종 도면·PLC 백업 · 납품자료 · 고객재산 반환 · 보증 개시일 확정', '07_PLC / QF-08']
    ];
    if (!p.sat) { pfRows[5][3] = '해당없음'; pfRows[5][4] = NA('SAT·시운전 계약 범위 아님'); }
    add('01_수주고객', 'PF-00', '', {
      '프로젝트 번호': pj, '고객': p.customer, '프로젝트명·현장': p.name, '판넬 번호·수량': tagList,
      '계약·PO 번호': p.po, '사양서 번호·Rev': p.spec, '납기': p.due, '적용 법규·제품규격': p.laws,
      '고객 검사·입회·기록 요구': p.custReq, '고객 승인도 필요 여부': p.approval ? '필요' : '불필요',
      '보증기간·기산일·무상범위': p.warranty, '포장·운송 조건': p.packing, '고객 지급품': p.custSupply
    }, pfRows);

    function makerList(items) {
      var ms = [];
      items.forEach(function (it) { if (it.major && it.maker && ms.indexOf(it.maker) < 0) ms.push(it.maker); });
      return ms.join(', ');
    }

    add(qf02.folder, 'QF-02', '', {
      '프로젝트 번호': pj, '판넬 번호': tagList, '설계 책임자': p.designer, '검토자(설계자 외)': p.reviewer,
      '입력자료 목록·Rev': [p.spec ? '고객 사양서 ' + p.spec : '', p.po ? 'PO ' + p.po : '', p.drawRev ? '도면 ' + p.drawRev : '', p.bomRev ? 'BOM ' + p.bomRev : '', p.ioRev ? 'I/O ' + p.ioRev : '']
        .filter(Boolean).join(' / '),
      '법규·규격·환경조건': p.laws, '단계 일정': scheduleText(p),
      '고객 승인도 필요 여부': p.approval ? '필요' : '불필요',
      '검토·검증·유효성 확인 방법': '설계검증: 입출력 대조·용량/보호협조 검토·논리시험 / 유효성: FAT(QF-06·QF-06-1)' + (p.sat ? '·SAT(QF-07)' : '') + '·고객 인수'
    }, tplRows('QF-02').map(function (r) {
      if (r[0] === '고객 승인도' && !p.approval) r[3] = NA('고객 승인도 불필요 계약');
      if (r[0] === '변경' && !clean(p.previousDrawRev)) r[3] = NA('도면 변경 없음 — 변경하면 이 줄에 작성');
      if (r[0] === '부품 대체') r[3] = NA('부품 대체 없음 — 대체하면 이 줄에 작성');
      return r;
    }));

    if (clean(p.previousDrawRev)) {
      var design = docs.filter(function (d) { return d.code === 'QF-02'; })[0];
      design.rows = design.rows || tplRows('QF-02');
      design.rows.push(['도면 변경', p.previousDrawRev + ' → ' + p.drawRev + ': ' + (p.changeReason || ''), '영향 판넬: ' + (p.changePanels || '미확인'), '', p.changeImpact || '영향·재검사 판단 필요', '', '검토·승인 전 관련 작업 보류']);
    }

    // QF-15: 기준표 + 주요 부품 모델별 토크 행
    var stdRows = std.map(function (s) { return [s.item, s.target, s.value, s.method, s.source]; });
    var majorModels = [];
    bom.forEach(function (it) {
      if (!it.major || it.category === '외함' || !it.model) return;
      if (majorModels.some(function (m) { return m.model === it.model; })) return;
      majorModels.push(it);
    });
    majorModels.forEach(function (it) {
      var hit = std.filter(function (s) { return /토크/.test(s.item) && it.model && norm(s.target).indexOf(norm(it.model)) >= 0; })[0];
      stdRows.push(['단자 체결 토크', it.model + ' (' + it.name + ')', hit ? hit.value : '', hit ? hit.method : '제조사 설명서 값 기재', hit ? hit.source : '']);
    });
    add(qf15.folder, 'QF-15', '', {
      '프로젝트 번호': pj, '판넬 번호': tagList, '고객': p.customer, '기준 Rev': stdRev,
      '적용 고객사양·법규·제품규격 판본': [p.spec, p.laws].filter(Boolean).join(' / '),
      '입력자료·도면 Rev': [p.drawRev ? '도면 ' + p.drawRev : '', p.bomRev ? 'BOM ' + p.bomRev : '', p.ioRev ? 'I/O 리스트 ' + p.ioRev : ''].filter(Boolean).join(' / '),
      '설계자 / 검토자': [p.designer, p.reviewer].filter(Boolean).join(' / ')
    }, stdRows.length ? stdRows : undefined, 2);

    // 03 입고
    var agg = [];
    panels.forEach(function (panel) {
      itemsForPanel(bom, panel).forEach(function (it) {
        if (!it.major) return;
        var key = JSON.stringify([it.name, it.model, it.maker, it.unit || '']);
        var a = agg.filter(function (x) { return x.key === key; })[0];
        if (!a) { a = { key: key, it: it, qty: 0, text: [], lots: [] }; agg.push(a); }
        var lot = clean(panel.serial) || clean(panel.tag);
        if (a.lots.indexOf(lot) < 0) a.lots.push(lot);
        if (it.qty !== null) a.qty += it.qty; else a.text.push(it.qtyText);
      });
    });
    var qf03Rows = agg.map(function (a) {
      var it = a.it;
      var qty = a.text.length ? (a.qty ? a.qty + ' + ' : '') + a.text.join(', ') : String(a.qty);
      return [clean(it.name + ' ' + it.model) + (it.maker ? ' (' + it.maker + ')' : ''), clean(qty + ' ' + (it.unit || '')) + ' / ', a.lots.join(', '), METHOD[it.category] || METHOD['기타']];
    });
    add('03_구매입고', 'QF-03', '', {
      '프로젝트 번호': pj, '검사기준(QF-15 번호)': stdRev || 'QF-15', '고객 지급품 여부': p.custSupply,
      '발주서·입고번호': p.po ? '고객 PO ' + p.po + ' / 입고번호: ' : '', '공급자': makerList(bom), '검사자': p.quality
    }, qf03Rows, 2);

    var perPanel = {};
    panels.forEach(function (panel) {
      var t = clean(panel.tag);
      perPanel[t] = { f16: 'QF-16_' + t, f02s: 'SF-02_' + t };
    });

    function fatWhen() {
      var d = clean(p.dFat) ? md(p.dFat) + ' (예정)' : '';
      return d || clean(p.tester) ? [d, clean(p.tester)].join(' / ') : '';
    }

    // 04 제작: 공정 이동표의 담당 작업자·도면 Rev는 입력값으로 채운다(일자·판정은 현장에서)
    function qf16Rows() {
      var tpl = (opts.forms && opts.forms['QF-16'] && opts.forms['QF-16'].rows) || [];
      var who = { '입고·불출': p.production, '외함 준비·가공': p.wirer || p.production, '부품 취부': p.wirer, '배선': p.wirer,
        '숙련자 배선 확인': p.inspector, '자체시험·FAT': p.tester, '포장·출하': p.production };
      var when = { '입고·불출': p.dMaterial, '외함 준비·가공': p.dMaterial, '배선': p.dWiring, '숙련자 배선 확인': p.dWiring,
        '자체시험·FAT': p.dFat, '포장·출하': p.dShip };
      return tpl.map(function (r) {
        var row = r.slice();
        row[2] = clean(when[row[0]]) ? '예정 ' + md(when[row[0]]) : '';
        row[3] = clean(who[row[0]]); row[4] = clean(p.drawRev);
        return row;
      });
    }

    // 04 제작
    panels.forEach(function (panel) {
      var t = clean(panel.tag);
      add('04_제작', 'QF-16', t, {
        '프로젝트 번호': pj, '판넬 번호(제조번호)': pv(panel), '제조 수량': '1',
        '착수·완료 예정일': [p.dMaterial ? '착수 ' + md(p.dMaterial) : '', p.dShip ? '출하 ' + md(p.dShip) : '', p.due ? '납기 ' + md(p.due) : ''].filter(Boolean).join(' · '),
        '승인 도면 Rev / QF-15': [p.drawRev, stdRev].filter(Boolean).join(' / '), '생산관리 책임자': p.production
      }, qf16Rows());
      add('04_제작', 'QF-05', t, {
        '프로젝트 번호': pj, '판넬 번호(제조번호)': pv(panel), '도면 Rev': p.drawRev, 'QF-15 번호': stdRev,
        '숙련 확인자 / 확인일': p.inspector ? p.inspector + ' / ' : '', '작업자 / 검사일': p.wirer ? p.wirer + ' / ' : ''
      });
    });

    // 05 FAT·출하
    var qf06Template = (opts.forms && opts.forms['QF-06'] && opts.forms['QF-06'].rows) || [];
    panels.forEach(function (panel) {
      var t = clean(panel.tag);
      var fatRows = qf06Template.map(function (r) {
        var row = r.slice();
        var s = stdFind(std, QF06_FROM_STD[row[0]] || [row[0]]);
        if (s) {
          if (s.method) row[1] = s.method;
          row[2] = s.value;
        }
        return row;
      });
      add('05_FAT출하', 'QF-06', t, {
        '프로젝트 번호': pj, '판넬 번호(제조번호)': pv(panel),
        '도면 Rev / QF-15 번호': [p.drawRev, stdRev].filter(Boolean).join(' / '),
        'PLC Ver / SF-02 번호': [p.plcVer, perPanel[t].f02s].filter(Boolean).join(' / '),
        '시험일 / 시험자': fatWhen(), '계측기 관리번호': p.meters,
        '고객 입회자·서명 또는 승인메일': p.witness
      }, fatRows.length ? fatRows : undefined);
      var pts = io.filter(function (x) { return !x.panel || norm(x.panel) === norm(t); });
      var ioRows = pts.map(function (x, i) {
        return [i + 1, x.addr, clean(x.tag + ' ' + x.desc), x.type, x.expect];
      });
      add('05_FAT출하', 'QF-06-1', t, {
        '프로젝트 번호': pj, '판넬 번호(제조번호)': pv(panel), 'PLC Ver': p.plcVer, 'I/O 리스트 Rev': p.ioRev,
        '시험일 / 시험자': fatWhen(), '고객 입회자': p.witness
      }, ioRows.length ? ioRows : undefined, 2);
      add('05_FAT출하', 'SF-02', t, {
        '프로젝트 번호': pj, '현장': '공장 FAT', '판넬·전원 범위': pv(panel) + ' 주회로·제어회로',
        '작업일': clean(p.dFat) ? md(p.dFat) + ' (예정)' : '', '작업책임자': p.tester, '시험자': p.tester, '감시자': p.watcher, '위험성평가 번호': 'SF-01 (시험·통전 작업)',
        '작업모드': '시험 통전 (FAT)', '허가·현장요구': '공장 시험구역 출입 통제·표지'
      });
    });

    // 판넬 LOT·출하 이력: LOT는 판넬에만 부여(제조번호 = 판넬 LOT)
    var lotRows = panels.map(function (panel) {
      return [clean(panel.serial), clean(clean(panel.tag) + ' ' + (panel.desc || '')),
        [p.drawRev, p.plcVer].filter(Boolean).join(' / ')];
    });
    add('05_FAT출하', 'QF-04', '', {
      '프로젝트 번호': pj, '고객': p.customer, '프로젝트명·현장': p.name, '판넬 수량': tags.length ? tags.length + '면' : '',
      '작성자': p.production, '품질 확인자': p.quality
    }, lotRows.length ? lotRows : undefined, 2);

    // 06 SAT
    if (p.sat) {
      add('06_SAT인수', 'QF-07', '', {
        '프로젝트 번호': pj, '현장': p.name, '판넬 번호': tagList, '고객': p.customer,
        '도면 Rev / PLC 최종 Ver': [p.drawRev, p.plcVer].filter(Boolean).join(' / '),
        '시운전일 / 담당': clean(p.dSat) || clean(p.tester) ? [clean(p.dSat) ? md(p.dSat) + ' (예정)' : '', clean(p.tester)].join(' / ') : '',
        'SF-02 / SF-03 번호': 'SF-02 (현장 통전)' + (p.outsource ? ' / SF-03 (외주 현장 배선)' : '')
      }, tplRows('QF-07').map(function (r) {
        if (r[0] === '현장 배선(외주)' && !p.outsource) { r[2] = NA('외주 현장 배선 없음'); r[3] = '해당없음'; }
        return r;
      }));
      if (p.outsource) add('06_SAT인수', 'SF-03', '', {
        '현장': p.name, '작업내용': '현장 배선 (외주)', '업체': p.outsourceCo, '당사 책임자': p.production
      });
    }

    // 07 PLC
    var hmi = bom.filter(function (it) { return it.category === 'HMI'; }).map(function (it) { return it.model; });
    var inv = bom.filter(function (it) { return it.category === '인버터'; }).map(function (it) { return it.model; });
    add('07_PLC', 'QF-08', '', {
      '프로젝트 번호': pj, '판넬 번호': tagList,
      'PLC·HMI 기종': [p.plc].concat(hmi).filter(Boolean).join(' / '), '개발도구·Ver': p.tool, '담당자': p.programmer,
      '복원 대상 (PLC·HMI·인버터 파라미터)': ['PLC 프로그램', hmi.length ? 'HMI 화면' : '', inv.length ? '인버터 파라미터(' + inv.join(', ') + ')' : '']
        .filter(Boolean).join(' / ')
    }, p.plcVer ? [[p.plcVer, '', '개발']] : undefined, 2);

    // 08 NCR·AS: 빈 양식
    add('08_NCR_AS', 'QF-09', '', { '프로젝트·판넬 LOT·공정': pj });
    docs[docs.length - 1].file = file('QF-09');
    return docs;
  }

  /** 기록 현황표(감사 대응) 행 */
  function indexRows(p, docs, forms) {
    var rows = [];
    docs.forEach(function (d) {
      var spec = forms[d.code] || {};
      rows.push([STAGE[d.folder], d.code, spec.title || '', d.panel || '전체', d.folder + '/' + d.file, spec.owner || '', '미작성']);
    });
    var ev = [
      ['01_수주고객', '고객 PO·사양서·견적서', '영업관리'],
      ['02_설계기준', '승인 도면(회로도·BOM·단자대도) 최종 Rev', '설계']
    ];
    if (p.approval) ev.push(['02_설계기준', '고객 승인도 제출·회신', '설계']);
    ev.push(['03_구매입고', '발주서(ERP)·주요 부품 성적서', '생산관리']);
    ev.push(['05_FAT출하', '포장 사진·납품서', '생산관리']);
    if (p.sat) ev.push(['06_SAT인수', '고객 인수 확인(서명·메일)', '시운전 담당']);
    ev.push(['07_PLC', '출하·SAT 최종 PLC·HMI·파라미터 백업 파일', '프로그램']);
    ev.forEach(function (e) { rows.push([STAGE[e[0]], '증빙', e[1], '전체', e[0] + '/', e[2], '미작성']); });
    var order = Object.keys(STAGE).map(function (k) { return STAGE[k]; });
    rows.sort(function (a, b) { return order.indexOf(a[0]) - order.indexOf(b[0]); });
    return rows;
  }

  function indexSpec(p, docs, forms, date) {
    return {
      sheet: '기록현황', code: 'REC', title: '프로젝트 기록 현황 (감사 대응)',
      docLine: '동인엔시스 | 프로젝트 기록 현황 | ISO 기록 묶음 생성기로 ' + date + ' 생성',
      footer: '프로젝트 기록 현황 ' + clean(p.pj),
      orient: 'landscape', mode: 'register',
      cols: [['단계', 10], ['양식', 9], ['문서', 24], ['판넬', 9], ['파일 위치', 40], ['담당', 14], ['상태', 10], ['확인일', 10], ['확인자', 10], ['승인 증거·대체 기록 경로', 30], ['해당없음 사유', 18]],
      fields: [[['프로젝트 번호', null], ['고객', null]], [['프로젝트명·현장', null], ['판넬', null]], [['계약·PO 번호', null], ['납기', null]],
        [['판넬 LOT (제조번호)', null]], [['담당 (설계 / 생산 / 품질 / 시험)', null]], [['일정 (예정일)', null]],
        [['도면 Rev / PLC Ver', null], ['생성일', null]], [['BOM 번호·Rev', null], ['I/O 리스트 Rev', null]],
        [['BOM 수량 기준', null], ['총수량 BOM 원본파일', null]], [['프로젝트 원본 보관 경로', null]], [['별도 백업 경로', null]], [['문서관리 담당', null], ['접근권한 관리 담당', null]]],
      notes: ['이 묶음의 기록과 별도 증빙 목록입니다. 상태·확인일·확인자를 실제 사실대로 기록합니다. 승인 상태는 승인자·일시·기록 버전을 확인할 수 있는 원본 증거 경로가 필요하며, 이 표의 입력만으로 전자승인이 되지 않습니다.',
        '해당없음은 사유·확인자를 남깁니다. 고객/ERP 대체 기록은 필수 항목·승인·추적성을 확인하고 원본 번호·Rev·경로를 연결합니다. 공통기록참조 시트에서 공급자·교정·자격·안전·환경·경영 기록을 찾습니다.',
        '감사 때는 이 표 순서대로 수주 → 설계 → 입고 → 제작 → FAT → 출하(판넬 LOT, QF-04) → SAT 기록을 보여 줍니다.'],
      rows: indexRows(p, docs, forms), blank: 2, row_h: 20,
      dv: { '7': ['미작성', '작성중', '검토대기', '승인', '불합격', '보류', '해당없음'] }, formats: { '8': 'yyyy-mm-dd' },
      sign: ['작성', '검토(품질)', '승인']
    };
  }

  /** 직접 적는 칸의 작성 예시(열 번호는 1부터). 판넬 1면 기준으로 1번 판넬 문서와 공통 문서에만 넣는다.
   *  rows: 양식 행 순서대로 한 행씩, each: 행마다 같은 예시(목록형), fields: 비어 있는 머리 항목 */
  function exRows(list) { return list.map(function (r) { var o = {}; r.forEach(function (v, k) { if (v !== null) o[k + r.start] = v; }); return o; }); }
  function at(start, arr) { arr.start = start; return arr; }
  var EXAMPLES = {
    'PF-00': { rows: exRows([
      at(4, ['승인', '없음', '영업관리 김○○', '10/05']), at(4, ['승인', '없음', '기술팀 하○○', '10/08']),
      at(4, ['승인', '없음', '품질 문○○', '10/14']), at(4, ['승인', '없음', '생산관리 박○○', '10/22']),
      at(4, ['승인', '없음 (NCR-26-001 종결)', '품질 문○○', '10/28']), at(4, ['승인', '미결 1건 11/15까지 (고객 합의 메일)', '품질 문○○', '11/06']),
      at(4, ['승인', '없음', '대표이사 ○○○', '11/20'])]),
      fields: { '미합의 사항·해결': '없음 (질의 2건 10/03 메일 회신)', '수주 가능 판단': '가능', '수주검토 확인자·일자': '영업관리 김○○ 10/05' } },
    'QF-02': { rows: exRows([
      at(3, ['사양서 체크리스트 대조', '사양서 Rev.B 대조 완료, 질의 2건 회신(10/03)', '없음', '이○○ 10/04', '승인 10/05, 공용폴더 배포']),
      at(3, ['회로도↔BOM↔단자대도 상호 대조', '불일치 3건 수정 → Rev.1', 'BOM 수량 정정', '이○○ 10/07', '승인 10/08, Rev.0 회수']),
      at(3, ['고객 제출·코멘트 반영', '10/06 제출, 코멘트 2건 반영, 10/09 승인 메일', '없음', '김○○ 10/09', '승인본 배포']),
      at(3, ['용량·보호협조 계산, 논리 시뮬레이션', '계산서·시뮬레이션 결과 첨부', '없음', '하○○ 10/10', '승인 10/10']),
      at(3, ['FAT·SAT 결과 확인', 'FAT 10/25 합격, SAT 11/05 인수', '없음', '문○○ 11/06', '—']),
      at(3, ['변경 영향 검토', 'Rev.1→Rev.2 냉각팬 MPCB 변경, 2면 영향', 'QF-05·QF-06 재검사', '하○○ 10/18', '승인 10/18, Rev.1 회수']),
      at(3, ['정격·치수 비교표', 'GV2ME08→GV2ME10 동등품, 고객 승인 메일', 'BOM Rev.2', '하○○ 10/16', '승인 10/16'])]) },
    'QF-15': { each: { 5: '제조사 설명서 / 고객 사양서 p.○', 6: '적용', 7: 'Rev.0 승인 10/05 하○○' },
      fields: { '승인자·승인일 / 고객 승인 증거': '하○○ 10/05 / 고객 승인 메일 10/09' } },
    'QF-03': { each: { 5: '모델·정격 일치, 외관 이상 없음', 6: '합격', 7: '성적서 첨부 (해당 시)', 8: '문○○ 10/12' },
      fields: { '입고일·검사일': '10/12 / 10/12', '관련 성적서·인증서': '인버터 시험성적서, 차단기 인증서' } },
    'QF-16': { rows: exRows([
      at(3, ['10/12 · 1식', null, null, 'QF-03 입고 0012', 'QF-03 합격', '→ 외함 준비', '없음']),
      at(3, ['10/13 · 1면', null, null, '외함 입고 0013', '치수·접지점 적합', '→ 부품 취부', '없음']),
      at(3, ['10/15 · 1면', null, null, '—', 'BOM·배치도 대조 적합', '→ 배선', '없음']),
      at(3, ['10/17~10/20', null, null, '—', 'QF-05 작업자 검사 적합', '→ 숙련자 확인', '냉각팬 MPCB 교체 (도면 Rev.2)']),
      at(3, ['10/21', null, null, '—', 'QF-05 숙련자 확인 적합', '→ 시험', '선번 1건 수정 후 재검사']),
      at(3, ['10/25', null, null, '—', 'QF-06 합격, SF-02 적합', '→ 포장', '없음']),
      at(3, ['10/28', null, null, '—', '포장 확인 적합, PF-00 출하 승인', '→ 운송', '없음'])]) },
    'QF-05': { rows: exRows([
      at(3, ['적합', '적합', '없음', '—']), at(3, ['적합', '적합', '없음', '—']), at(3, ['적합', '적합', '없음', '—']),
      at(3, ['적합', '적합', '없음', '—']), at(3, ['적합', '적합', '토크렌치 TW-02 (QF-11 유효)', '—']), at(3, ['적합', '적합', '없음', '—']),
      at(3, ['부적합', '—', 'X1-12 선번 누락 → 부착', '10/21 정○○ 적합']), at(3, ['적합', '적합', '없음', '—']),
      at(3, ['적합', '적합', '없음', '—']), at(3, ['적합', '적합', '없음', '—']), at(3, ['적합', '적합', '없음', '—']),
      at(3, ['적합', '적합', '없음', '—'])]),
      fields: { '작업자 / 검사일': '이○○ / 10/20', '숙련 확인자 / 확인일': '정○○ / 10/21' } },
    'QF-06': { rows: exRows([
      at(4, ['BOM·도면과 일치, 명판·경고표시 부착', '합격', '육안 · 사진 3장', '—']),
      at(4, ['개스킷·글랜드·팬필터 이상 없음', '합격', '육안', '—']),
      at(4, ['부스바 최소 이격 22 mm', '합격', '줄자 M-05', '—']),
      at(4, ['핸들 인터록·차단기 조작 정상', '합격', '조작 확인', '—']),
      at(4, ['MCCB Ir 200 A, EOCR 18 A = 설정표', '합격', '설정표 대조', '—']),
      at(4, ['주회로-PE 520 MΩ (DC 500 V, 1분)', '합격', 'M-01 절연저항계', '—']),
      at(4, ['고객 요구 없음 (QF-15 근거)', '해당없음', '—', '—']),
      at(4, ['0.04 Ω (10 A)', '합격', 'M-02 접지저항계', '—']),
      at(4, ['R-S-T 정상, 381 V / DC 24.1 V', '합격', 'M-03 멀티미터', '—']),
      at(4, ['QF-06-1 30점: 합격 29, 해당없음 1', '합격', 'QF-06-1 첨부', '—']),
      at(4, ['비상정지 시 인버터 정지, 수동 리셋 후 재기동', '합격', '시나리오 표', '—']),
      at(4, ['파라미터 V1.0 일치, Force 해제 확인', '합격', 'QF-08 V1.0', '—']),
      at(4, ['인버터 고장·과열 알람 HMI 표시', '합격', 'HMI 화면 사진', '—'])]) },
    'QF-06-1': { byType: {
      DI: { 6: '입력 ON/OFF 확인', 7: '합격' }, DO: { 6: '출력 ON → 대상 기기 동작', 7: '합격' },
      AI: { 6: '4 mA→0, 20 mA→최대 표시', 7: '합격' }, AO: { 6: '0·50·100% 출력 측정 일치', 7: '합격' },
      '': { 6: '통신·값 갱신 확인', 7: '합격' } }, by: 8,
      fields: { 'Force·시뮬레이션 해제 확인자·시각': '최○○ 15:30' } },
    'SF-02': { rows: exRows([
      at(3, ['적합 (Q0 잠금 L-01)', '최○○ 09:00', '없음']), at(3, ['적합', '최○○ 09:10', '없음']),
      at(3, ['적합 (감시자 배치)', '최○○ 09:20', '없음']), at(3, ['승인', '최○○ 09:25', '없음']),
      at(3, ['해당없음 (수정 없음)', '—', '—']), at(3, ['해당없음', '—', '—']), at(3, ['적합, 잠금 해제·복구', '최○○ 16:40', '없음'])]),
      fields: { '작업일': '10/25', '감시자': '박○○', '작업모드': '시험 통전', '허가·현장요구': '공장 시험구역 출입 통제',
        '통전 승인자·시각': '최○○ 09:25', '종료 확인자·시각': '최○○ 16:40' } },
    'QF-04': { each: { 4: '10/21', 5: '합격 10/25', 6: '10/28 품질 문○○', 7: '고객 현장 압축기실', 8: '11/05', 9: '없음' } },
    'QF-07': { rows: exRows([
      at(3, ['운송 손상 없음, 앵커 고정 사진', '합격', '없음', '—', '고객 김○○']),
      at(3, ['외주 배선 검사표 첨부', '합격', '없음', '—', '고객 김○○']),
      at(3, ['현장 절연 300 MΩ, 접지 0.1 Ω', '합격', '없음', '—', '고객 김○○']),
      at(3, ['전압·상순 정상 (SF-02)', '합격', '없음', '—', '고객 김○○']),
      at(3, ['현장 30점 확인 (QF-06-1)', '합격', 'AI 1점 스케일 조정 / 최○○ / 11/04', '11/04 재확인 합격', '고객 김○○']),
      at(3, ['부하 운전 2시간 이상 없음', '합격', '없음', '—', '고객 김○○']),
      at(3, ['비상정지·재시작 정상', '합격', '없음', '—', '고객 김○○']),
      at(3, ['교육 3명 참석, 자료 인계', '합격', '없음', '—', '인수 메일 11/06']),
      at(3, ['PLC V1.1 백업 (QF-08)', '합격', '없음', '—', 'USB 전달 11/06'])]),
      fields: { '고객 인수 확인자·서명 또는 메일': '고객 설비팀 김○○ 인수 메일 11/06' } },
    'SF-03': { rows: exRows([
      at(3, ['박○○', '외주 소장 ○○○', '양측 서명 11/01', '—']), at(3, ['최○○ (통전 승인)', '외주 소장', '양측 서명', '—']),
      at(3, ['박○○', '외주 소장', '양측 서명', '—']), at(3, ['박○○', '외주 작업자 3명 교육', '교육일지 첨부', '—']),
      at(3, ['박○○', '외주 소장', '비상연락망 공유', '—']), at(3, ['박○○ 11/02·11/03', '—', '지적 1건(정리정돈) 조치', '—']),
      at(3, ['박○○', '외주 소장', '외주 배선 검사 합격', '종료 11/03'])]),
      fields: { '작업 기간 / 인원': '11/01~11/03 / 3명', '외주 책임자': '외주 소장 ○○○', '고객 현장책임자': '고객 설비팀 김○○',
        '작업허가·현장규칙': '고객 작업허가서 발급, 현장 안전수칙 서명', '필요 자격·교육·보호구': '전기기능사, 안전교육, 절연장갑·안전모' } },
    'QF-08': { each: { 2: '10/18', 4: '정○○ 최초 작성', 5: '전체 (신규)', 6: 'QF-06 FAT', 7: '하○○ 10/24', 8: '07_PLC/V1.0', 9: '출하 시 USB 전달' } },
    'QF-09': { rows: exRows([
      at(3, ['박○○', '10/21', '재체결 사진', '재검사 적합', '문○○ 10/21']), at(3, ['이○○', '10/23', '원인 분석서', '유사 판넬 2면 점검 이상 없음', '문○○ 10/23']),
      at(3, ['하○○', '10/30', 'WI-01 개정·교육 기록', '1개월간 재발 없음', '문○○ 11/30']), at(3, ['정○○', '10/21', 'QF-05 재검사', '적합', '문○○ 10/21']),
      at(3, ['김○○', '10/22', '통보 메일', '고객 회신 확인', '문○○ 10/22']), at(3, ['문○○', '11/30', '점검 기록', '재발 0건', '문○○ 11/30'])]),
      fields: { 'NCR 번호': 'NCR-26-001', '구분': '공정', '발생일 / 발견자': '10/21 / 정○○', '내용·증거': 'TB2-14 단자 체결 누락 (사진)',
        '격리·작업중지·고객통보': '해당 판넬 시험 보류, 고객 통보 10/22', '처분 (수정·반품·폐기·특채)': '수정 (재체결 후 재검사)',
        '특채 시 고객 승인 증거': '해당없음', 'AS: 보증 판정·교체부품(QF-04 이력)': '해당없음 (출하 전)' } }
  };
  /** 문서 하나의 예시: 원래 행(d.rows 또는 양식 행) 수만큼 */
  function exampleFor(d, spec, p) {
    var e = EXAMPLES[d.code];
    if (!e) return null;
    var rows = spec.rows || [], list = [];
    if (e.rows) list = e.rows.slice(0, rows.length);
    else if (e.byType) list = rows.map(function (r) { var o = Object.assign({}, e.byType[r[3]] || e.byType['']); o[e.by] = clean(p.tester) || '최○○'; return o; });
    else if (e.each) list = rows.map(function () { return e.each; });
    list = list.map(function (cells, k) {
      return (rows[k] || []).some(function (v) { return /^해당없음 \(자동/.test(clean(v)); }) ? null : cells;
    });
    return { rows: list, fields: e.fields || {} };
  }
  var EXAMPLE_NOTE = '회색 기울임 글은 작성 예시입니다(판넬 1면 기준, 실제 기록 아님). 그대로 쓸 내용이면 글자색을 검정으로 바꾸고 기울임을 풀면 기록이 됩니다. 아니면 실제 내용으로 덮어쓰고, 해당 없는 예시는 지웁니다.';

  function commonSpec(common, date) {
    return {
      sheet: '공통기록참조', code: 'REC-COMMON', title: '공통 기록 및 감사 증빙 참조',
      docLine: '동인엔시스 | 공통 기록 참조 | ' + date + ' 생성', orient: 'landscape', mode: 'register',
      cols: [['양식', 10], ['문서', 27], ['담당', 17], ['작성·확인 시점', 28], ['원본 번호·Rev·보관 경로', 38], ['상태', 13], ['확인자·확인일 / 해당없음 사유', 27], ['보존 기준', 25]],
      fields: [[['프로젝트 번호', null], ['고객', null]]],
      notes: ['공통 기록은 프로젝트마다 다시 만들지 않고 관리 중인 원본을 연결합니다. 현재 프로젝트에 해당하는 범위·유효성·승인 증거를 확인한 뒤 상태를 바꿉니다. 미확인은 미이행 판정이 아니라 아직 증거를 확인하지 않은 상태입니다.',
        '양식집의 작성 시점·보존 기준을 표시한 참조 목록입니다. 고객·법규가 더 엄격하면 승인된 기준을 적용합니다. 개인정보 원본은 권한이 제한된 저장소에 보관하고 이 표에는 관리번호·접근 가능한 경로만 연결합니다.'],
      rows: common.map(function (s) { return [s.code, s.title, s.owner, s.when, '', '미확인', '', s.keep]; }),
      blank: 0, row_h: 24, dv: {'6': ['미확인', '확인중', '유효 기록 확인', '갱신 필요', '해당없음']}, sign: ['작성', '검토(품질)', '승인']
    };
  }

  // 결재란 작성자: '작성자'를 비우면 문서별 담당자를 쓴다
  var WRITER = {
    'PF-00': 'production', 'QF-02': 'designer', 'QF-15': 'designer', 'QF-03': 'production', 'QF-04': 'production',
    'QF-05': 'wirer', 'QF-06': 'tester', 'QF-06-1': 'tester', 'SF-02': 'tester', 'QF-07': 'tester',
    'QF-08': 'programmer', 'QF-16': 'production', 'SF-03': 'production', 'QF-09': 'production', 'REC': 'documentOwner'
  };
  function signNames(p, code) {
    return {
      '작성': clean(p.signWriter) || clean(p[WRITER[code]]),
      '검토': clean(p.signReviewer), '승인': clean(p.signApprover)
    };
  }

  /** 문서 묶음(zip)을 만든다. env: {ExcelJS, JSZip, engine, forms, logo, onProgress} */
  function generate(env, p, docs, date) {
    var zip = new env.JSZip();
    var bundleId = new Date().toISOString().replace(/[^0-9]/g, '');
    var root = clean(p.pj) + (p.name ? '_' + safeName(p.name) : '') + '_Rev' + safeName(clean(p.recordRev) || '00') + '_' + bundleId;
    var F = env.forms.forms;
    var firstPanel = ((p.panels || []).filter(function (x) { return clean(x.tag); })[0] || {}).tag;
    firstPanel = firstPanel ? clean(firstPanel) : '';
    var jobs = docs.map(function (d) {
      var spec = JSON.parse(JSON.stringify(F[d.code]));
      if (d.rows) spec.rows = d.rows;
      if (d.blankMin !== undefined) spec.blank = d.blankMin;
      var ex = env.examples !== false && (!d.panel || d.panel === firstPanel) ? exampleFor(d, spec, p) : null;
      if (ex) {
        spec.example = { rows: ex.rows };
        spec.fieldExamples = ex.fields;
        spec.notes = (spec.notes || []).concat([EXAMPLE_NOTE]);
      }
      return { path: root + '/' + d.folder + '/' + d.file, spec: spec, values: d.values, sign: signNames(p, d.code) };
    });
    var idx = indexSpec(p, docs, F, date);
    jobs.unshift({
      path: root + '/00_기록현황_' + clean(p.pj) + '.xlsx', spec: idx, sign: signNames(p, 'REC'),
      specs: [idx, commonSpec(env.forms.common || [], date)],
      values: {
        '프로젝트 번호': clean(p.pj), '고객': p.customer, '프로젝트명·현장': p.name,
        '판넬': (p.panels || []).map(function (x) { return x.tag; }).filter(Boolean).join(', '),
        '도면 Rev / PLC Ver': [p.drawRev, p.plcVer].filter(Boolean).join(' / '), '생성일': date,
        '계약·PO 번호': p.po, '납기': p.due,
        '판넬 LOT (제조번호)': (p.panels || []).filter(function (x) { return x.tag; }).map(function (x) { return clean(x.tag) + ' ' + (clean(x.serial) || '(LOT 없음)'); }).join(', '),
        '담당 (설계 / 생산 / 품질 / 시험)': [p.designer, p.production, p.quality, p.tester].map(function (v) { return clean(v) || '-'; }).join(' / '),
        '일정 (예정일)': scheduleText(p, true),
        'BOM 번호·Rev': p.bomRev, 'I/O 리스트 Rev': p.ioRev,
        'BOM 수량 기준': {perPanel: '판넬 1면당 수량', allocated: '프로젝트 총수량의 판넬별 배분'}[p.bomBasis] || '', '총수량 BOM 원본파일': p.bomTotalFile,
        '프로젝트 원본 보관 경로': p.recordPath, '별도 백업 경로': p.backupPath,
        '문서관리 담당': p.documentOwner, '접근권한 관리 담당': p.accessOwner
      }
    });
    ['01_수주고객', '02_설계기준', '03_구매입고', '04_제작', '05_FAT출하', '06_SAT인수', '07_PLC', '08_NCR_AS']
      .forEach(function (f) { zip.folder(root + '/' + f); });
    // 도면·PLC는 하위 폴더로 승인본·작업본·구본을 나눠 둔다(QF-02·QF-08과 연결)
    var pjn = clean(p.pj);
    ['02_설계기준/도면_승인본', '02_설계기준/도면_작업중', '02_설계기준/도면_구본', '02_설계기준/고객승인도',
      '07_PLC/릴리스', '07_PLC/작업중', '07_PLC/구본'].forEach(function (f) { zip.folder(root + '/' + f); });
    zip.file(root + '/02_설계기준/도면관리_방법.txt', [
      pjn + ' 설계 도면 관리 (QF-02)', '',
      '도면_승인본: 검토·승인을 마친 도면만 둔다. PDF(배포용)와 DWG(원본)를 같은 Rev로 함께 둔다.',
      '  파일명: ' + pjn + '_회로도_Rev1.pdf / ' + pjn + '_회로도_Rev1.dwg (BOM·단자대도·배치도도 같은 규칙)',
      '  승인본 폴더는 읽기전용으로 두고, 바꿀 때는 새 Rev로만 올린다.',
      '도면_작업중: 설계자가 고치는 중인 파일. 현장·제작에 배포하지 않는다.',
      '도면_구본: 새 Rev가 승인되면 이전 Rev를 옮긴다(지우지 않음). 현장 출력본도 회수해 폐기한다.',
      '고객승인도: 고객 제출본·코멘트·승인 메일.',
      '',
      'Rev가 바뀌면 QF-02 \'변경\' 행(사유·영향·재검증)을 적고, 이 도구 01 탭의 도면 Rev를 바꿔 묶음을 다시 만든다.',
      '현장·제작은 항상 도면_승인본의 최신 Rev만 쓴다(QF-16 도면 Rev 칸으로 확인).'
    ].join('\r\n'));
    zip.file(root + '/07_PLC/PLC관리_방법.txt', [
      pjn + ' PLC·HMI·인버터 파라미터 관리 (QF-08)', '',
      '릴리스: 시험(FAT·SAT)을 통과해 판넬에 들어간 버전만 둔다. 버전마다 폴더 하나.',
      '  폴더명: V1.0_20261025_FAT / V1.1_20261105_SAT',
      '  안에 넣을 것: Machine Expert 프로젝트(.project), 내보낸 압축본(Archive), HMI 화면, 인버터 파라미터, 변경 내용 메모',
      '작업중: 개발·현장 수정 중인 파일. 판넬에 넣기 전에 시험하고 릴리스로 옮긴다.',
      '구본: 이전 릴리스(지우지 않음).',
      '',
      '버전을 올리면 QF-08에 한 줄(Ver·일자·변경 내용·재시험·승인자·경로)을 적는다.',
      'FAT 성적서(QF-06)와 명판·QF-04의 PLC Ver가 릴리스 폴더의 최신 버전과 같아야 한다.',
      '출하·SAT 후 최종 릴리스는 별도 저장장치(백업)에도 복사한다(QF-13).'
    ].join('\r\n'));

    // 프로젝트 입력 정보: 공용 저장소에서 기록 현황판·다른 담당자가 불러 쓴다
    if (env.projectJson) zip.file(root + '/00_프로젝트정보_' + safeName(clean(p.pj)) + '.json', env.projectJson);
    var done = 0;
    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        var specs = job.specs || [job.spec];
        specs.forEach(function (spec) { spec.notes = ['초안·미승인: 작업 사용 금지. 실제 수행·검토·승인 증거 확인 필요. 기록 Rev ' + (clean(p.recordRev) || '00')].concat(spec.notes || []); });
        var wb = env.engine.buildWorkbook(env.ExcelJS, specs, {
          values: job.values, rev: env.forms.rev, date: env.forms.date, logo: env.logo, signNames: job.sign
        });
        return wb.xlsx.writeBuffer().then(function (buf) {
          zip.file(job.path, buf);
          done++;
          if (env.onProgress) env.onProgress(done, jobs.length);
        });
      });
    }, Promise.resolve()).then(function () {
      return zip.generateAsync({ type: env.zipType || 'blob', compression: 'DEFLATE' });
    }).then(function (out) {
      return { data: out, name: clean(p.pj) + '_ISO기록_' + date + '_Rev' + safeName(clean(p.recordRev) || '00') + '_' + bundleId + '.zip', count: jobs.length };
    });
  }

  var api = {
    norm: norm, clean: clean, today: today, detectColumns: detectColumns, LABELS: LABELS, SYN: SYN,
    parseBom: parseBom, parseIo: parseIo, parseStd: parseStd, classify: classify, METHOD: METHOD,
    splitTags: splitTags, plan: plan, signNames: signNames, SCHEDULE: SCHEDULE, scheduleText: scheduleText, generate: generate, indexSpec: indexSpec, commonSpec: commonSpec, STAGE: STAGE, validateInput: validateInput, compareBom: compareBom, readProject: readProject
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IsoProject = api;
})(this);
