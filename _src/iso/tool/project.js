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
    bom: { name: '품명', model: '모델·형번', maker: '메이커', qty: '수량', tag: '도면 기호(Tag)', panel: '판넬' },
    io: { addr: '주소', tag: 'Tag', desc: '설명', type: '구분', expect: '기대 동작·범위', panel: '판넬' },
    std: { item: '항목', target: '모델·정격·대상', value: '값·단위·허용범위', method: '방법·시험조건', source: '근거자료' }
  };

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
    '인버터': '모델·용량·전압 명판 대조, 외관, S/N',
    'PLC': '모델 대조, 외관, S/N',
    'HMI': '모델 대조, 외관·화면, S/N',
    '안전부품': '모델·인증 표시 대조, 외관',
    '차단기': '모델·정격(AF/AT) 대조, 외관, LOT',
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
      var qtyRaw = get('qty') || '1';
      var qtyNum = /^[\d.,]+$/.test(qtyRaw) ? parseFloat(qtyRaw.replace(/,/g, '')) : NaN;
      var cat = classify(name, model);
      items.push({
        name: name, model: model, maker: get('maker'), qtyText: qtyRaw,
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
    '01_수주고객': '1 수주', '02_설계기준': '2 설계', '03_구매입고LOT': '3 구매·입고', '04_제작': '4 제작',
    '05_FAT출하': '5 FAT·출하', '06_SAT인수': '6 SAT·인수', '07_PLC': '7 PLC', '08_NCR_AS': '8 NCR·AS'
  };

  function itemsForPanel(bom, panel) {
    var hasPanelCol = bom.some(function (it) { return it.panel; });
    if (!hasPanelCol) return bom;
    return bom.filter(function (it) { return !it.panel || norm(it.panel) === norm(panel.tag); });
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

    function file(code, panel) { return pj + '_' + code + (panel ? '_' + safeName(panel) : '') + '_' + date + '.xlsx'; }
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
    var pfRows = [
      ['수주', '계약 요구·규격·납기·보증·포장 조건 합의 / 미합의 해결', '01_수주고객 (PO·사양서·견적서)'],
      ['설계', 'QF-02 입력·검토·검증 / QF-15 기술기준 승인 / 고객 승인도(해당 시)', '02_설계기준 / QF-02, QF-15'],
      ['구매·입고', 'QF-10 승인 공급자 발주 / QF-03 판정 / QF-04 추적', '03_구매입고LOT / QF-03, QF-04 ×' + tags.length],
      ['제작', 'QF-16 공정 이동 / QF-05 작업자 검사·숙련자 확인 / 변경 반영', '04_제작 / QF-16, QF-05 ×' + tags.length],
      ['출하', 'QF-06 합격 · 최종 PLC(QF-08) · 포장 확인(QF-16) · 출하 영향 NCR 종결 또는 고객 특채 서면', '05_FAT출하 / QF-06, QF-06-1, SF-02 ×' + tags.length],
      ['SAT·인수', 'QF-07 기능·미결 종결·고객 인수 / SF-02·SF-03 해당 시', p.sat ? '06_SAT인수 / QF-07' + (p.outsource ? ', SF-03' : '') : ''],
      ['종료', '최종 도면·PLC 백업 · 납품자료 · 고객재산 반환 · 보증 개시일 확정', '07_PLC / QF-08']
    ];
    add('01_수주고객', 'PF-00', '', {
      '프로젝트 번호': pj, '고객': p.customer, '프로젝트명·현장': p.name, '판넬 번호·수량': tagList,
      '계약·PO 번호': p.po, '사양서 번호·Rev': p.spec, '납기': p.due, '적용 법규·제품규격': p.laws,
      '고객 검사·입회·기록 요구': p.custReq, '고객 승인도 필요 여부': p.approval ? '필요' : '불필요',
      '보증기간·기산일·무상범위': p.warranty, '포장·운송 조건': p.packing, '고객 지급품': p.custSupply
    }, pfRows);

    add(qf02.folder, 'QF-02', '', {
      '프로젝트 번호': pj, '판넬 번호': tagList, '설계 책임자': p.designer, '검토자(설계자 외)': p.reviewer,
      '입력자료 목록·Rev': [p.spec ? '고객 사양서 ' + p.spec : '', p.po ? 'PO ' + p.po : '', p.drawRev ? '도면 ' + p.drawRev : '']
        .filter(Boolean).join(' / '),
      '법규·규격·환경조건': p.laws, '단계 일정': p.due ? '납기 ' + p.due : '',
      '고객 승인도 필요 여부': p.approval ? '필요' : '불필요',
      '검토·검증·유효성 확인 방법': '설계검증: 입출력 대조·용량/보호협조 검토·논리시험 / 유효성: FAT(QF-06·QF-06-1)' + (p.sat ? '·SAT(QF-07)' : '') + '·고객 인수'
    });

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
      '입력자료·도면 Rev': [p.drawRev ? '도면 ' + p.drawRev : '', p.ioRev ? 'I/O 리스트 ' + p.ioRev : ''].filter(Boolean).join(' / '),
      '설계자 / 검토자': [p.designer, p.reviewer].filter(Boolean).join(' / ')
    }, stdRows.length ? stdRows : undefined, 2);

    // 03 입고
    var agg = [];
    panels.forEach(function (panel) {
      itemsForPanel(bom, panel).forEach(function (it) {
        if (!it.major) return;
        var key = it.name + '|' + it.model + '|' + it.maker;
        var a = agg.filter(function (x) { return x.key === key; })[0];
        if (!a) { a = { key: key, it: it, qty: 0, text: [] }; agg.push(a); }
        if (it.qty !== null) a.qty += it.qty; else a.text.push(it.qtyText);
      });
    });
    var qf03Rows = agg.map(function (a) {
      var it = a.it;
      var qty = a.text.length ? (a.qty ? a.qty + ' + ' : '') + a.text.join(', ') : String(a.qty);
      return [clean(it.name + ' ' + it.model) + (it.maker ? ' (' + it.maker + ')' : ''), qty + ' / ', '', METHOD[it.category] || METHOD['기타']];
    });
    add('03_구매입고LOT', 'QF-03', '', {
      '프로젝트 번호': pj, '검사기준(QF-15 번호)': stdRev || 'QF-15', '고객 지급품 여부': p.custSupply
    }, qf03Rows, 2);

    var perPanel = {};
    panels.forEach(function (panel) {
      var t = clean(panel.tag);
      var f16 = 'QF-16_' + t, f02s = 'SF-02_' + t;
      perPanel[t] = { f16: f16, f02s: f02s };
      var lotRows = [];
      itemsForPanel(bom, panel).forEach(function (it) {
        if (!it.major || it.category === '외함') return;
        var label = clean(it.name + ' ' + it.model);
        if (it.tags.length) it.tags.forEach(function (tg) { lotRows.push([label, '', '', tg]); });
        else for (var k = 0; k < Math.min(it.qty || 1, 20); k++) lotRows.push([label, '', '', '']);
      });
      add('03_구매입고LOT', 'QF-04', t, {
        '프로젝트 번호': pj, '고객': p.customer, '판넬 번호(제조번호)': pv(panel),
        '납품처·납품일': [p.name, p.due].filter(Boolean).join(' / '), '관련 QF-16 번호': f16
      }, lotRows, 2);
    });

    // 04 제작
    panels.forEach(function (panel) {
      var t = clean(panel.tag);
      add('04_제작', 'QF-16', t, {
        '프로젝트 번호': pj, '판넬 번호(제조번호)': pv(panel), '제조 수량': '1',
        '착수·완료 예정일': p.due ? '납기 ' + p.due : '',
        '승인 도면 Rev / QF-15': [p.drawRev, stdRev].filter(Boolean).join(' / '), '생산관리 책임자': p.production
      });
      add('04_제작', 'QF-05', t, {
        '프로젝트 번호': pj, '판넬 번호(제조번호)': pv(panel), '도면 Rev': p.drawRev, 'QF-15 번호': stdRev
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
        'PLC Ver / SF-02 번호': [p.plcVer, perPanel[t].f02s].filter(Boolean).join(' / ')
      }, fatRows.length ? fatRows : undefined);
      var pts = io.filter(function (x) { return !x.panel || norm(x.panel) === norm(t); });
      var ioRows = pts.map(function (x, i) {
        return [i + 1, x.addr, clean(x.tag + ' ' + x.desc), x.type, x.expect];
      });
      add('05_FAT출하', 'QF-06-1', t, {
        '프로젝트 번호': pj, '판넬 번호(제조번호)': pv(panel), 'PLC Ver': p.plcVer, 'I/O 리스트 Rev': p.ioRev
      }, ioRows.length ? ioRows : undefined, 2);
      add('05_FAT출하', 'SF-02', t, {
        '프로젝트 번호': pj, '현장': '공장 FAT', '판넬·전원 범위': t + ' 주회로·제어회로'
      });
    });

    // 06 SAT
    if (p.sat) {
      add('06_SAT인수', 'QF-07', '', {
        '프로젝트 번호': pj, '현장': p.name, '판넬 번호': tagList, '고객': p.customer,
        '도면 Rev / PLC 최종 Ver': p.drawRev ? p.drawRev + ' / ' : ''
      });
      if (p.outsource) add('06_SAT인수', 'SF-03', '', { '현장': p.name, '작업내용': '현장 배선 (외주)' });
    }

    // 07 PLC
    var hmi = bom.filter(function (it) { return it.category === 'HMI'; }).map(function (it) { return it.model; });
    var inv = bom.filter(function (it) { return it.category === '인버터'; }).map(function (it) { return it.model; });
    add('07_PLC', 'QF-08', '', {
      '프로젝트 번호': pj, '판넬 번호': tagList,
      'PLC·HMI 기종': [p.plc].concat(hmi).filter(Boolean).join(' / '), '개발도구·Ver': p.tool,
      '복원 대상 (PLC·HMI·인버터 파라미터)': ['PLC 프로그램', hmi.length ? 'HMI 화면' : '', inv.length ? '인버터 파라미터(' + inv.join(', ') + ')' : '']
        .filter(Boolean).join(' / ')
    }, p.plcVer ? [[p.plcVer, '', '개발']] : undefined, 2);

    // 08 NCR·AS: 빈 양식
    add('08_NCR_AS', 'QF-09', '', { '프로젝트·판넬·LOT·공정': pj });
    docs[docs.length - 1].file = pj + '_QF-09_양식_빈칸.xlsx';
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
    ev.push(['03_구매입고LOT', '발주서(ERP)·주요 부품 성적서', '생산관리']);
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
      cols: [['단계', 10], ['양식', 9], ['문서', 24], ['판넬', 9], ['파일 위치', 40], ['담당', 14], ['상태', 9], ['완료일', 10], ['확인자', 10]],
      fields: [[['프로젝트 번호', null], ['고객', null]], [['프로젝트명·현장', null], ['판넬', null]], [['도면 Rev / PLC Ver', null], ['생성일', null]]],
      notes: ['이 묶음에 들어 있는 기록과 따로 보관할 증빙 목록입니다. 기록을 작성하면 상태를 바꾸고 완료일·확인자를 적습니다. 미작성은 붉게 표시됩니다.',
        '감사 때는 이 표 순서대로 수주 → 설계 → 입고 LOT → 제작 → FAT → 출하 → SAT 기록을 보여 줍니다. 해당없음은 사유를 확인자 칸에 함께 적습니다.'],
      rows: indexRows(p, docs, forms), blank: 2, row_h: 20,
      dv: { '7': ['미작성', '작성중', '완료', '해당없음'] }, formats: { '8': 'yyyy-mm-dd' },
      sign: ['작성', '검토(품질)', '승인']
    };
  }

  /** 문서 묶음(zip)을 만든다. env: {ExcelJS, JSZip, engine, forms, logo, onProgress} */
  function generate(env, p, docs, date) {
    var zip = new env.JSZip();
    var root = clean(p.pj) + (p.name ? '_' + safeName(p.name) : '');
    var F = env.forms.forms;
    var jobs = docs.map(function (d) {
      var spec = JSON.parse(JSON.stringify(F[d.code]));
      if (d.rows) spec.rows = d.rows;
      if (d.blankMin !== undefined) spec.blank = d.blankMin;
      return { path: root + '/' + d.folder + '/' + d.file, spec: spec, values: d.values };
    });
    var idx = indexSpec(p, docs, F, date);
    jobs.unshift({
      path: root + '/00_기록현황_' + clean(p.pj) + '.xlsx', spec: idx,
      values: {
        '프로젝트 번호': clean(p.pj), '고객': p.customer, '프로젝트명·현장': p.name,
        '판넬': (p.panels || []).map(function (x) { return x.tag; }).filter(Boolean).join(', '),
        '도면 Rev / PLC Ver': [p.drawRev, p.plcVer].filter(Boolean).join(' / '), '생성일': date
      }
    });
    ['01_수주고객', '02_설계기준', '03_구매입고LOT', '04_제작', '05_FAT출하', '06_SAT인수', '07_PLC', '08_NCR_AS']
      .forEach(function (f) { zip.folder(root + '/' + f); });
    var done = 0;
    return jobs.reduce(function (chain, job) {
      return chain.then(function () {
        var wb = env.engine.buildWorkbook(env.ExcelJS, [job.spec], {
          values: job.values, rev: env.forms.rev, date: env.forms.date, logo: env.logo
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
      return { data: out, name: clean(p.pj) + '_ISO기록_' + date + '.zip', count: jobs.length };
    });
  }

  var api = {
    norm: norm, clean: clean, today: today, detectColumns: detectColumns, LABELS: LABELS, SYN: SYN,
    parseBom: parseBom, parseIo: parseIo, parseStd: parseStd, classify: classify, METHOD: METHOD,
    splitTags: splitTags, plan: plan, generate: generate, indexSpec: indexSpec, STAGE: STAGE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IsoProject = api;
})(this);
