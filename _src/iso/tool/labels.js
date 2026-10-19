/* 명판·라벨: 판넬 LOT 명판(실제 크기 SVG)과 A4 라벨지 인쇄(기기·전선·판넬·출하·경고).
   라벨 프린터가 없으므로 시중 A4 라벨지에 인쇄한다. 라벨 프린터를 들이면 CSV 목록을 그 프로그램에서 불러온다. */
(function () {
  'use strict';
  var A, P, el, $, esc;

  var COMPANY = {
    ko: '㈜동인엔시스', en: 'DONG-IN ENSIS Co., Ltd.',
    addr: '부산광역시 부산진구 진연로9번길 47', tel: 'TEL 051-862-3668', origin: 'MADE IN KOREA'
  };
  // 동인엔시스 문서 서식(기록양식집)과 같은 색: 머리 남색 #0A2A55 · 강조(LOT·로고) 파랑 #1857A5 · 항목칸 #E8EEF6 · 테두리 #8A9BB0 · 글자 #263445
  var NAVY = '#0a2a55', BLUE = '#1857a5', RED = '#e83e30', LABEL = '#e8eef6', LINE = '#8a9bb0', INK = '#263445';

  // 명판 크기(가로×세로 mm). 비율이 같아 도안을 그대로 키운다.
  var NP_SIZES = { s: ['100 × 60 mm', 100, 60], m: ['120 × 72 mm', 120, 72], l: ['150 × 90 mm', 150, 90] };

  // A4 라벨지(시중 규격과 같은 칸 크기). left/top: 첫 칸 위치, hp/vp: 칸 간격(칸 크기 + 틈)
  var SHEETS = {
    l65: { name: 'A4 65칸 · 38.1×21.2mm', cols: 5, rows: 13, w: 38.1, h: 21.2, left: 4.75, top: 10.7, hp: 40.6, vp: 21.2 },
    l24: { name: 'A4 24칸 · 63.5×33.9mm', cols: 3, rows: 8, w: 63.5, h: 33.9, left: 7.2, top: 12.9, hp: 66.0, vp: 33.9 },
    l14: { name: 'A4 14칸 · 99.1×38.1mm', cols: 2, rows: 7, w: 99.1, h: 38.1, left: 4.65, top: 15.15, hp: 101.6, vp: 38.1 },
    l8: { name: 'A4 8칸 · 99.1×67.7mm', cols: 2, rows: 4, w: 99.1, h: 67.7, left: 4.65, top: 13.1, hp: 101.6, vp: 67.7 },
    l4: { name: 'A4 4칸 · 99.1×139mm', cols: 2, rows: 2, w: 99.1, h: 139, left: 4.65, top: 9.5, hp: 101.6, vp: 139 }
  };

  var KINDS = [
    { id: 'device', name: '기기 라벨', src: 'BOM 도면 기호 · 품명', sheet: 'l65', copies: 1, on: true },
    { id: 'wire', name: '전선 마커 (I/O)', src: 'I/O 주소 · Tag (전선 양끝)', sheet: 'l65', copies: 2, on: true },
    { id: 'panel', name: '판넬 표시 라벨', src: '판넬 Tag · 설명 · LOT', sheet: 'l14', copies: 1, on: true },
    { id: 'ship', name: '출하 · 포장 라벨', src: 'LOT · 고객 · 중량 · QR', sheet: 'l4', copies: 2, on: true },
    { id: 'warn', name: '감전 경고 라벨', src: '고정 문구 (국문·영문)', sheet: 'l8', copies: 1, on: false }
  ];

  var st = null;   // 화면 설정(명판 값·라벨 선택). 프로젝트 번호별로 이 PC에 기억한다.
  var stKey = '';

  function ym() { var d = new Date(); return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0'); }

  function defaults(p) {
    var std = A.P.clean(String(p.laws || '').split('/')[0]) || 'IEC 60204-1';
    return {
      np: { volt: '3상 380V 60Hz', ctrl: 'DC 24V', sccr: '', ip: 'IP54', std: std, date: /^\d{4}-\d{2}/.test(A.P.clean(p.dShip)) ? A.P.clean(p.dShip).slice(0, 7).replace('-', '.') : ym(), size: 's', qr: true, holes: true,
        dwg: [A.P.clean(p.pj), A.P.clean(p.drawRev)].filter(Boolean).join(' ') },
      per: {},
      kinds: KINDS.reduce(function (o, k) { o[k.id] = { on: k.on, sheet: k.sheet, copies: k.copies }; return o; }, {}),
      panels: {}, dx: 0, dy: 0, outline: false, preview: ''
    };
  }

  function load(p) {
    var key = 'iso-labels:' + (A.P.clean(p.pj) || '_');
    if (st && key === stKey) return;
    stKey = key;
    st = defaults(p);
    try {
      var saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && saved.np) {
        Object.assign(st.np, saved.np);
        st.per = saved.per || {};
        Object.keys(saved.kinds || {}).forEach(function (k) { if (st.kinds[k]) Object.assign(st.kinds[k], saved.kinds[k]); });
        st.panels = saved.panels || {};
        st.dx = +saved.dx || 0; st.dy = +saved.dy || 0; st.outline = !!saved.outline;
      }
    } catch (e) { /* 기억 못 해도 기본값으로 쓴다 */ }
  }
  function remember() {
    try { localStorage.setItem(stKey, JSON.stringify(st)); } catch (e) { /* 무시 */ }
  }

  // ---------------------------------------------------------------- 데이터
  function panelsOf(p) {
    return (p.panels || []).filter(function (x) { return x.tag; });
  }
  function chosenPanels(p) {
    return panelsOf(p).filter(function (x) { return st.panels[x.tag] !== false; });
  }
  function per(tag) { return st.per[tag] || (st.per[tag] = { product: '', current: '', weight: '' }); }

  function npRows(p, pn) {
    var d = per(pn.tag), np = st.np;
    var rows = [
      ['품명', 'Product', d.product || pn.desc || '제어반'],
      ['도면 Tag', 'Tag No.', pn.tag],
      ['제조번호(LOT)', 'Serial / LOT', pn.serial || '', 'lot'],
      ['정격전압', 'Rated voltage', np.volt],
      ['제어전압', 'Control voltage', np.ctrl],
      ['정격전류', 'Rated current', d.current ? withUnit(d.current, 'A') : ''],
      ['단락정격', 'SCCR', np.sccr ? withUnit(np.sccr, 'kA') : ''],
      ['보호등급', 'IP rating', np.ip],
      ['적용규격', 'Standard', np.std],
      ['중량', 'Weight', d.weight ? withUnit(d.weight, 'kg') : ''],
      ['도면번호', 'Doc. No.', np.dwg],
      ['제조년월', 'Mfg. date', np.date]
    ];
    return rows.filter(function (r) { return r[3] || r[0] === '도면 Tag' || A.P.clean(r[2]); });
  }
  function withUnit(v, u) { v = A.P.clean(v); return /[a-z]$/i.test(v) ? v : v + ' ' + u; }

  function qrText(p, pn) {
    return ['DONG-IN ENSIS', 'LOT:' + (pn.serial || ''), 'PJ:' + A.P.clean(p.pj), 'TAG:' + pn.tag, 'MFG:' + st.np.date].join('\n');
  }

  /** QR을 SVG path로(크기 size mm, 위치 x,y). 라이브러리가 없으면 '' */
  function qrPath(text, x, y, size) {
    if (typeof window.qrcode !== 'function') return '';
    var q = window.qrcode;
    if (q.stringToBytesFuncs && q.stringToBytesFuncs['UTF-8']) q.stringToBytes = q.stringToBytesFuncs['UTF-8'];
    var qr = q(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount(), m = size / (n + 2), d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += 'M' + (x + (c + 1) * m).toFixed(3) + ' ' + (y + (r + 1) * m).toFixed(3) + 'h' + m.toFixed(3) + 'v' + m.toFixed(3) + 'h-' + m.toFixed(3) + 'z';
      }
    }
    return '<rect x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#000"/>';
  }

  // 글자 폭(글자 크기 1 기준) 어림값
  function units(t) {
    var u = 0;
    String(t).split('').forEach(function (ch) {
      var c = ch.charCodeAt(0);
      u += c > 0x2e80 ? 1.0 : (ch === ' ' ? 0.3 : (/[A-Z0-9%#]/.test(ch) ? 0.64 : 0.55));
    });
    return u || 1;
  }
  function fit(t, width, max) { return Math.max(0.8, Math.min(max, width / units(t))); }

  // ---------------------------------------------------------------- 명판 SVG (도안 100×60 단위, 실제 크기로 키움)
  function nameplateSvg(p, pn) {
    var sz = NP_SIZES[st.np.size] || NP_SIZES.s, W = 100, H = 60;
    var rows = npRows(p, pn), qr = st.np.qr && typeof window.qrcode === 'function';
    var font = 'Pretendard, \'IBM Plex Sans KR\', \'Malgun Gothic\', sans-serif';
    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + sz[1] + 'mm" height="' + sz[2] + 'mm" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + font + '">');
    o.push('<title>' + esc('명판 ' + pn.tag + ' ' + (pn.serial || '')) + '</title>');
    o.push('<defs><clipPath id="np-c"><rect x="0.3" y="0.3" width="99.4" height="59.4" rx="1.6"/></clipPath></defs>');
    o.push('<rect x="0.3" y="0.3" width="99.4" height="59.4" rx="1.6" fill="#fff" stroke="' + LINE + '" stroke-width="0.35"/>');
    o.push('<g clip-path="url(#np-c)"><rect x="0" y="0" width="100" height="10" fill="' + NAVY + '"/>' +
      '</g>');
    o.push(logoNested(8, 2.4, 5.2, 'white'));
    o.push('<text x="91" y="6.5" fill="#fff" font-size="3.2" font-weight="700" letter-spacing="0.2" text-anchor="end">CONTROL PANEL</text>');
    var top = 13, bottom = 54.2, step = Math.min(3.9, (bottom - top) / rows.length);
    var vRight = qr ? 70 : 94, vx = 34;
    rows.forEach(function (r, i) {
      var y = top + step * (i + 0.72);
      var lot = r[3] === 'lot';
      o.push('<rect x="4.5" y="' + (top + step * i).toFixed(2) + '" width="28.5" height="' + step.toFixed(2) + '" fill="' + LABEL + '"/>');
      o.push('<text x="6" y="' + y.toFixed(2) + '" font-size="2.1" font-weight="700" fill="' + NAVY + '">' + esc(r[0]) +
        '<tspan dx="1" font-size="1.45" font-weight="400" fill="#55657a">' + esc(r[1]) + '</tspan></text>');
      var v = r[2] || '', fs = fit(v, vRight - vx, lot ? 3.0 : 2.4);
      o.push('<text x="' + vx + '" y="' + y.toFixed(2) + '" font-size="' + fs.toFixed(2) + '"' + (lot ? ' font-weight="700" fill="' + BLUE + '"' : ' fill="' + INK + '"') + '>' + esc(v) + '</text>');
      if (i < rows.length - 1) o.push('<line x1="6" x2="' + (vRight + 0.5) + '" y1="' + (top + step * (i + 1)).toFixed(2) + '" y2="' + (top + step * (i + 1)).toFixed(2) + '" stroke="' + LINE + '" stroke-width="0.15"/>');
    });
    if (qr) {
      o.push(qrPath(qrText(p, pn), 72.5, 13, 21));
      o.push('<text x="83" y="37" font-size="1.5" text-anchor="middle" fill="#55657a">QR · LOT 정보</text>');
      o.push('<text x="83" y="42" font-size="' + fit(pn.serial || '', 22, 2.4).toFixed(2) + '" font-weight="700" text-anchor="middle" fill="' + BLUE + '">' + esc(pn.serial || '') + '</text>');
    }
    o.push('<line x1="33" x2="33" y1="' + top + '" y2="' + bottom.toFixed(2) + '" stroke="' + LINE + '" stroke-width="0.15"/>');
    o.push('<rect x="4.5" y="' + top + '" width="' + (vRight - 4) + '" height="' + (bottom - top).toFixed(2) + '" fill="none" stroke="' + LINE + '" stroke-width="0.2"/>');
    o.push('<line x1="4" x2="96" y1="55.2" y2="55.2" stroke="' + LINE + '" stroke-width="0.15"/>');
    var foot = COMPANY.ko + ' ' + COMPANY.en + ' · ' + COMPANY.addr + ' · ' + COMPANY.tel + ' · ' + COMPANY.origin;
    o.push('<text x="50" y="58.1" font-size="' + fit(foot, 78, 1.45).toFixed(2) + '" text-anchor="middle" fill="' + INK + '">' + esc(foot) + '</text>');
    if (st.np.holes) {
      [[3.6, 5], [96.4, 5], [3.6, 57.4], [96.4, 57.4]].forEach(function (h, i) {
        o.push('<circle cx="' + h[0] + '" cy="' + h[1] + '" r="1.5" fill="' + (i < 2 ? '#fff' : 'none') + '" stroke="' + (i < 2 ? '#fff' : '' + INK + '') + '" stroke-width="0.2"/>');
      });
    }
    o.push('</svg>');
    return o.join('');
  }

  // ---------------------------------------------------------------- 라벨
  function itemsForPanel(bom, pn) {
    var has = bom.some(function (it) { return it.panel; });
    if (!has) return bom;
    return bom.filter(function (it) { return !it.panel || A.P.norm(it.panel) === A.P.norm(pn.tag); });
  }

  function lines(arr) { return { type: 'lines', lines: arr }; }

  /** 종류별 라벨 목록: {kind, panel, content} */
  function labelList(kindId) {
    var p = A.project(), out = [], k = st.kinds[kindId], copies = Math.max(1, Math.min(10, +k.copies || 1));
    var pans = chosenPanels(p), multi = panelsOf(p).length > 1;
    function push(pn, content, csv) { for (var i = 0; i < copies; i++) out.push({ kind: kindId, panel: pn ? pn.tag : '', content: content, csv: csv }); }
    if (kindId === 'device') {
      pans.forEach(function (pn) {
        itemsForPanel(A.bomItems(), pn).forEach(function (it) {
          it.tags.forEach(function (tg) {
            push(pn, lines([[tg, 0.46, 1], [it.name, 0.2, 0], multi ? [pn.tag, 0.15, 0, 1] : null]), [tg, it.name, multi ? pn.tag : '']);
          });
        });
      });
    } else if (kindId === 'wire') {
      pans.forEach(function (pn) {
        A.ioItems().filter(function (x) { return !x.panel || A.P.norm(x.panel) === A.P.norm(pn.tag); }).forEach(function (x) {
          var desc = A.P.clean(x.desc);
          push(pn, lines([[x.addr, 0.36, 1], [x.tag, 0.27, 1], [desc, 0.15, 0, 1]]), [x.addr, x.tag, desc]);
        });
      });
    } else if (kindId === 'panel') {
      pans.forEach(function (pn) {
        push(pn, lines([[pn.tag, 0.4, 1], [pn.desc, 0.2, 0], [pn.serial ? 'LOT ' + pn.serial : '', 0.15, 1, 'lot']]), [pn.tag, pn.desc, pn.serial]);
      });
    } else if (kindId === 'ship') {
      pans.forEach(function (pn) { push(pn, { type: 'ship', p: p, pn: pn }, [pn.serial, pn.tag, p.customer]); });
    } else if (kindId === 'warn') {
      pans.forEach(function (pn) { push(pn, { type: 'warn' }, ['위험 DANGER', '고압 감전주의', pn.tag]); });
    }
    return out;
  }

  /** CI 로고(벡터). variant 'white': 남색 바탕용(글자 흰색, i 점 빨강 유지). h: 높이 mm */
  function logoSvg(h, variant) {
    var L = window.ISO_LOGO_SVG;
    if (!L) return '<b style="font-size:' + (h * 0.8).toFixed(2) + 'mm;color:' + (variant === 'white' ? '#fff' : BLUE) + '">' + esc(COMPANY.ko) + '</b>';
    var vb = L.viewBox.split(/\s+/).map(Number), inner = variant === 'white' ? L.inner.replace(/#1857A5/gi, '#FFFFFF') : L.inner;
    return '<svg class="lbx-logo" width="' + (h * vb[2] / vb[3]).toFixed(2) + 'mm" height="' + h + 'mm" viewBox="' + L.viewBox + '" role="img" aria-label="동인엔시스">' + inner + '</svg>';
  }
  /** SVG(명판) 안에 넣는 로고: 좌표·높이는 명판 도안 단위 */
  function logoNested(x, y, h, variant) {
    var L = window.ISO_LOGO_SVG;
    if (!L) return '<text x="' + x + '" y="' + (y + h * 0.8) + '" font-size="' + (h * 0.8) + '" font-weight="700" fill="' + (variant === 'white' ? '#fff' : BLUE) + '">' + esc(COMPANY.ko) + '</text>';
    var vb = L.viewBox.split(/\s+/).map(Number), inner = variant === 'white' ? L.inner.replace(/#1857A5/gi, '#FFFFFF') : L.inner;
    return '<svg x="' + x + '" y="' + y + '" width="' + (h * vb[2] / vb[3]).toFixed(3) + '" height="' + h + '" viewBox="' + L.viewBox + '">' + inner + '</svg>';
  }

  /** 글줄 라벨(기기·전선·판넬): 위에 남색 띠 + 흰 로고 + 빨간 선, 아래 글 */
  function linesHtml(c, w, h, caption) {
    var bh = Math.max(3.4, Math.min(8, h * 0.2)), body = h - bh - 0.35;
    var pad = Math.min(1.6, body * 0.08), avail = body - 2 * pad, ls = c.lines.filter(function (l) { return l && A.P.clean(l[0]); });
    var sizes = ls.map(function (l) { return fit(l[0], w - 2 * pad, l[1] * h); });
    var total = sizes.reduce(function (a, b) { return a + b * 1.15; }, 0);
    var k = total > avail ? avail / total : 1;
    var color = function (l, i) { return l[3] === 'lot' ? BLUE : l[3] ? '#55657a' : i === 0 ? NAVY : '#263445'; };
    return '<div class="lbx" style="width:' + w + 'mm;height:' + h + 'mm">' +
      '<div class="lbx-band" style="height:' + bh.toFixed(2) + 'mm;padding:0 ' + (bh * 0.35).toFixed(2) + 'mm">' + logoSvg(+(bh * 0.6).toFixed(2), 'white') +
      (caption && w >= 60 ? '<span style="font-size:' + (bh * 0.36).toFixed(2) + 'mm">' + esc(caption) + '</span>' : '') + '</div>' +
      '<div class="lbx-body">' + ls.map(function (l, i) {
        return '<div style="font-size:' + (sizes[i] * k).toFixed(2) + 'mm;line-height:1.12;font-weight:' + (l[2] ? 700 : 400) +
          ';color:' + color(l, i) + ';white-space:nowrap">' + esc(l[0]) + '</div>';
      }).join('') + '</div></div>';
  }

  function warnSvg(size) {
    return '<svg width="' + size + 'mm" height="' + (size * 0.88).toFixed(2) + 'mm" viewBox="0 0 100 88" aria-hidden="true">' +
      '<path d="M50 4 L96 84 H4 Z" fill="#f7c600" stroke="#111" stroke-width="6" stroke-linejoin="round"/>' +
      '<path d="M56 24 L36 56 H50 L42 76 L66 44 H52 L60 24 Z" fill="#111"/></svg>';
  }

  function shipHtml(c, w, h) {
    var p = c.p, pn = c.pn, d = per(pn.tag), weight = d.weight ? withUnit(d.weight, 'kg') : '';
    var qr = '';
    if (typeof window.qrcode === 'function') {
      qr = '<svg width="24mm" height="24mm" viewBox="0 0 24 24">' + qrPath(qrText(p, pn), 0, 0, 24) + '</svg>';
    }
    var row = function (k, v, big) {
      return '<tr><th>' + k + '</th><td' + (big ? ' class="big"' : '') + '>' + esc(v || '') + '</td></tr>';
    };
    return '<div class="lbx-ship" style="width:' + w + 'mm;height:' + h + 'mm">' +
      '<div class="lbx-sh-h">' + logoSvg(7, 'color') + '<span><b>출하 라벨</b>SHIPPING LABEL</span></div>' +
      '<div class="lbx-sh-in"><table>' + row('고객<small>Customer</small>', p.customer) + row('프로젝트<small>Project</small>', A.P.clean(p.pj) + (p.name ? ' · ' + p.name : '')) +
      row('판넬<small>Panel</small>', pn.tag + (pn.desc ? ' · ' + pn.desc : '')) + row('LOT<small>Serial</small>', pn.serial, true) +
      row('중량<small>Weight</small>', weight) + row('납기<small>Delivery</small>', p.due) + '</table>' +
      '<div class="lbx-sh-f"><div>' + qr + '</div><div class="lbx-sh-hd">' +
      '<div><b>↑↑</b> 이쪽이 위 · THIS SIDE UP</div><div><b>!</b> 취급주의 · FRAGILE</div><div><b>☂</b> 습기주의 · KEEP DRY</div></div></div></div>' +
      '<div class="lbx-sh-a">' + esc(COMPANY.ko + ' ' + COMPANY.en + ' · ' + COMPANY.addr + ' · ' + COMPANY.tel) + '</div></div>';
  }

  function warnHtml(w, h) {
    var s = Math.min(h * 0.6, w * 0.32);
    return '<div class="lbx-warn" style="width:' + w + 'mm;height:' + h + 'mm">' + warnSvg(s) +
      '<div class="lbx-w-t"><div class="lbx-w1">위험 · DANGER</div><div class="lbx-w2">고압 감전주의</div>' +
      '<div class="lbx-w3">점검·작업 전 전원을 차단하십시오</div><div class="lbx-w4">HAZARDOUS VOLTAGE · Disconnect power before servicing</div>' +
      '<div class="lbx-w-logo">' + logoSvg(3.2, 'color') + '</div></div></div>';
  }

  var CAPTION = { device: '', wire: '', panel: 'CONTROL PANEL' };
  function labelInner(l, sh) {
    var c = l.content;
    if (c.type === 'ship') return shipHtml(c, sh.w, sh.h);
    if (c.type === 'warn') return warnHtml(sh.w, sh.h);
    return linesHtml(c, sh.w, sh.h, CAPTION[l.kind]);
  }

  // 라벨 모양(인쇄 문서와 화면 미리보기에 같이 쓴다). 남색 #0A2A55 · 파랑 #1857A5 · 빨강 #E83E30
  var LABEL_CSS = '.sheet{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}' +
    '.sheet:last-child{page-break-after:auto;break-after:auto}' +
    '.lb{position:absolute;overflow:hidden;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}' +
    '.lb.ol{outline:0.2mm dashed #9aa7b8;outline-offset:-0.1mm}' +
    '.lbx-logo{display:block;flex:none}' +
    '.lbx{display:flex;flex-direction:column;overflow:hidden;background:#fff}' +
    '.lbx-band{flex:none;display:flex;align-items:center;justify-content:space-between;background:' + NAVY + ';color:#fff;font-weight:700;letter-spacing:0.08em}' +
    '.lbx-body{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:0}' +
    '.lbx-ship{display:flex;flex-direction:column;text-align:left;font-size:3.2mm;color:#263445;border:0.3mm solid ' + LINE + '}' +
    '.lbx-sh-h{display:flex;align-items:center;justify-content:space-between;padding:3mm 4mm 2.5mm;border-bottom:0.8mm solid ' + NAVY + '}' +
    '.lbx-sh-h span{display:grid;text-align:right;font-size:2.4mm;color:#55657a;letter-spacing:0.06em}.lbx-sh-h b{font-size:4.2mm;color:' + NAVY + ';letter-spacing:0}' +
    '.lbx-sh-in{flex:1;display:flex;flex-direction:column;padding:2mm 4mm 2mm;gap:2mm;min-height:0}' +
    '.lbx-ship table{width:100%;border-collapse:collapse}.lbx-ship th{width:24mm;text-align:left;font-size:3mm;font-weight:700;color:' + INK + ';background:' + LABEL + ';padding:1.3mm 1.5mm;vertical-align:top;border:0.2mm solid ' + LINE + '}' +
    '.lbx-ship th small{display:block;font-size:2.1mm;font-weight:400;color:#55657a}.lbx-ship td{font-size:3.6mm;padding:1.3mm 1.5mm;border:0.2mm solid ' + LINE + ';word-break:keep-all}' +
    '.lbx-ship td.big{font-size:7mm;font-weight:700;color:' + BLUE + ';letter-spacing:-0.02em}' +
    '.lbx-sh-f{display:flex;gap:3mm;align-items:center;margin-top:auto}.lbx-sh-hd{display:grid;gap:1.2mm;font-size:3mm}.lbx-sh-hd b{display:inline-block;width:6mm;text-align:center;font-size:4mm;color:' + RED + '}' +
    '.lbx-sh-a{background:' + NAVY + ';color:#fff;font-size:2.1mm;padding:1.4mm 4mm;letter-spacing:0.01em}' +
    '.lbx-warn{display:flex;align-items:center;gap:3mm;padding:3mm;border:1.6mm solid #f7c600;text-align:left;background:#fff;color:#111}' +
    '.lbx-w-t{display:grid;gap:0.7mm}.lbx-w1{font-size:6mm;font-weight:800;letter-spacing:0.02em}.lbx-w2{font-size:5mm;font-weight:700;color:#c0321f}' +
    '.lbx-w3{font-size:3mm;font-weight:600}.lbx-w4{font-size:2.2mm;color:#333}.lbx-w-logo{margin-top:1mm}';

  function sheetPages(list, sh) {
    var per = sh.cols * sh.rows, pages = [];
    for (var i = 0; i < list.length; i += per) {
      var cells = list.slice(i, i + per).map(function (l, j) {
        var c = j % sh.cols, r = Math.floor(j / sh.cols);
        var x = sh.left + c * sh.hp + (+st.dx || 0), y = sh.top + r * sh.vp + (+st.dy || 0);
        return '<div class="lb' + (st.outline ? ' ol' : '') + '" style="left:' + x.toFixed(2) + 'mm;top:' + y.toFixed(2) + 'mm;width:' + sh.w + 'mm;height:' + sh.h + 'mm">' + labelInner(l, sh) + '</div>';
      });
      pages.push('<section class="sheet">' + cells.join('') + '</section>');
    }
    return pages;
  }

  function labelsDoc() {
    var p = A.project(), pages = [];
    KINDS.forEach(function (k) {
      var cfg = st.kinds[k.id];
      if (!cfg.on) return;
      var list = labelList(k.id);
      if (list.length) pages = pages.concat(sheetPages(list, SHEETS[cfg.sheet]));
    });
    return { html: A.docHtml(A.P.clean(p.pj) + ' 라벨', pages.join(''), LABEL_CSS), pages: pages.length };
  }

  function nameplateDoc() {
    var p = A.project(), sz = NP_SIZES[st.np.size] || NP_SIZES.s, gap = 6;
    var cols = Math.max(1, Math.floor((190 + gap) / (sz[1] + gap))), rows = Math.max(1, Math.floor((277 + gap) / (sz[2] + gap)));
    var pans = chosenPanels(p), pages = [];
    for (var i = 0; i < pans.length; i += cols * rows) {
      var cells = pans.slice(i, i + cols * rows).map(function (pn, j) {
        var x = 10 + (j % cols) * (sz[1] + gap), y = 10 + Math.floor(j / cols) * (sz[2] + gap);
        return '<div style="position:absolute;left:' + x + 'mm;top:' + y + 'mm">' + nameplateSvg(p, pn) + '</div>';
      });
      pages.push('<section class="sheet">' + cells.join('') + '</section>');
    }
    var css = '.sheet{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page}.sheet:last-child{page-break-after:auto}';
    return { html: A.docHtml(A.P.clean(p.pj) + ' 명판', pages.join(''), css), pages: pages.length };
  }

  // ---------------------------------------------------------------- 화면
  function setStatus(t, kind) { var s = $('lbStatus'); s.textContent = t; s.className = 'status' + (kind ? ' ' + kind : ''); }

  function doPrint(doc, what, file) {
    if (!doc.pages) { setStatus('인쇄할 ' + what + '이(가) 없습니다. 판넬·종류 선택을 확인하세요.', 'bad'); return; }
    A.printHtml(doc.html).then(function (ok) {
      setStatus(ok ? what + ' 인쇄 창을 열었습니다 (A4 ' + doc.pages + '장). 배율 100%·여백 없음으로 인쇄하세요. 인쇄 창이 안 뜨면 \'인쇄용 파일 받기\'를 쓰세요.'
        : '이 화면에서는 인쇄 창을 열 수 없습니다. \'인쇄용 파일 받기\'로 받아 크롬에서 열고 인쇄하세요.', ok ? 'ok' : 'bad');
    });
  }
  function doSave(doc, file, what) {
    if (!doc.pages) { setStatus('받을 ' + what + '이(가) 없습니다.', 'bad'); return; }
    A.saveFile(file, new Blob([doc.html], { type: 'text/html' })).then(function () {
      setStatus(file + ' 저장 — 크롬에서 열고 Ctrl+P로 인쇄합니다.', 'ok');
    }, function (e) { setStatus(A.saveErrorText(e, file), 'bad'); });
  }

  function svgZip() {
    var p = A.project(), pans = chosenPanels(p);
    if (!pans.length) { setStatus('판넬을 하나 이상 고르세요.', 'bad'); return; }
    if (!window.JSZip) { setStatus('압축 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.', 'bad'); return; }
    var zip = new window.JSZip(), pj = A.P.clean(p.pj) || '프로젝트';
    var csv = [['도면 Tag', '제조번호(LOT)'].concat(npRows(p, pans[0]).filter(function (r) { return r[0] !== '도면 Tag' && r[3] !== 'lot'; }).map(function (r) { return r[0]; }))];
    pans.forEach(function (pn) {
      zip.file(pj + '_명판_' + (pn.serial || pn.tag).replace(/[\\\/:*?"<>|]/g, '') + '.svg', '<?xml version="1.0" encoding="UTF-8"?>\n' + nameplateSvg(p, pn));
      var rows = npRows(p, pn);
      csv.push([pn.tag, pn.serial || ''].concat(csv[0].slice(2).map(function (h) {
        var r = rows.filter(function (x) { return x[0] === h; })[0]; return r ? r[2] : '';
      })));
    });
    var sz = NP_SIZES[st.np.size] || NP_SIZES.s;
    zip.file('명판_제작의뢰_안내.txt', [
      pj + ' 판넬 명판 ' + pans.length + '장', '',
      '크기: ' + sz[0] + ' (SVG 파일은 실제 크기)', '고정 구멍: ' + (st.np.holes ? '네 모서리 지름 3mm 표시' : '없음'),
      '재질·가공: 업체와 협의 (예: 알루미늄 부식 또는 아크릴 레이저 각인)', '글꼴: 업체에서 윤곽선(아웃라인) 변환 후 가공',
      'QR: ' + (st.np.qr ? '제조번호(LOT) 정보 — 축소 시 한 변 15mm 이상 유지' : '없음'), '',
      '내용 목록은 명판_내용.csv 참고. 제조번호(LOT)는 판넬마다 다르므로 파일 이름의 LOT와 판넬을 맞춰 부착합니다.'
    ].join('\r\n'));
    zip.file('명판_내용.csv', '﻿' + csv.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'));
    zip.generateAsync({ type: 'blob' }).then(function (blob) {
      var name = pj + '_명판도안_' + A.P.today() + '.zip';
      return A.saveFile(name, blob).then(function () { setStatus(name + ' 저장 — 명판 업체에 그대로 보내면 됩니다.', 'ok'); });
    }).catch(function (e) { setStatus(A.saveErrorText(e, '명판 도안'), 'bad'); });
  }
  function csvCell(v) { v = String(v === null || v === undefined ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  function labelCsv() {
    var rows = [['종류', '판넬', '줄1', '줄2', '줄3']];
    KINDS.forEach(function (k) {
      if (!st.kinds[k.id].on) return;
      labelList(k.id).forEach(function (l) { rows.push([k.name, l.panel].concat(l.csv)); });
    });
    if (rows.length < 2) { setStatus('목록이 비어 있습니다.', 'bad'); return; }
    var name = (A.P.clean(A.project().pj) || '프로젝트') + '_라벨목록_' + A.P.today() + '.csv';
    A.saveFile(name, new Blob(['﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n')], { type: 'text/csv' }))
      .then(function () { setStatus(name + ' 저장 — 라벨 프린터 프로그램에서 이 파일을 불러와 쓸 수 있습니다.', 'ok'); },
        function (e) { setStatus(A.saveErrorText(e, name), 'bad'); });
  }

  function field(id, label, value, on, opts) {
    opts = opts || {};
    var input = el('input', { type: opts.type || 'text', id: id, value: value, autocomplete: 'off', inputmode: opts.inputmode || null,
      step: opts.step || null, oninput: function (e) { on(e.target.value); } });
    return el('div', { cls: 'field' + (opts.wide ? ' wide' : '') }, [el('label', { for: id, text: label }), input]);
  }

  function projectLine(p) {
    var n = panelsOf(p).length;
    return el('div', { cls: 'pj-line' }, [
      A.isSample() ? el('span', { cls: 'chip chip-warn', text: '예시 데이터' }) : null,
      el('span', {}, [el('b', { text: A.P.clean(p.pj) || '프로젝트 번호 없음' }), ' · ' + (p.customer || '고객 미입력') + ' · 판넬 ' + n + '면']),
      el('button', { type: 'button', cls: 'btn btn-ghost btn-sm', text: '프로젝트·판넬 바꾸기 (01 탭)', onclick: function () { A.showView('pack'); } })
    ]);
  }

  function render() {
    var root = $('view-labels'), p = A.project();
    load(p);
    A.clear(root);
    root.appendChild(el('header', { cls: 'top' }, [
      el('p', { cls: 'eyebrow', text: '판넬 LOT 명판 · A4 라벨지 인쇄' }),
      el('h1', { text: '명판 · 라벨' }),
      el('p', { cls: 'lead', text: '01 탭의 프로젝트·판넬·BOM·I/O 리스트로 판넬 명판 도안과 라벨을 만듭니다. 라벨 프린터 없이 시중 A4 라벨지에 일반 프린터로 인쇄합니다.' }),
      projectLine(p)
    ]));
    if (!panelsOf(p).length) {
      root.appendChild(el('p', { cls: 'note', text: '판넬이 없습니다. 01 탭에서 판넬 Tag와 제조번호(LOT)를 먼저 입력하세요.' }));
      return;
    }
    var layout = el('div', { cls: 'layout' });
    var steps = el('div', { cls: 'steps' });
    layout.appendChild(steps);
    root.appendChild(layout);

    // 판넬 고르기
    var pickBox = el('div', { cls: 'checks' });
    panelsOf(p).forEach(function (pn, i) {
      var id = 'lb-p-' + i;
      pickBox.appendChild(el('label', { cls: 'check', for: id }, [
        el('input', { type: 'checkbox', id: id, checked: st.panels[pn.tag] !== false, onchange: function (e) { st.panels[pn.tag] = e.target.checked; remember(); refresh(); } }),
        pn.tag + (pn.serial ? ' · ' + pn.serial : ' · LOT 없음')
      ]));
    });
    var noLot = panelsOf(p).filter(function (x) { return !x.serial; }).length;
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '1' }), '판넬 고르기']),
      pickBox,
      noLot ? el('p', { cls: 'note', text: noLot + '면에 제조번호(LOT)가 없습니다. 명판·출하 라벨에 LOT가 빠지니 01 탭에서 채우세요.' }) : null
    ]));

    // 명판
    var np = st.np;
    var grid = el('div', { cls: 'grid' }, [
      field('np-volt', '정격전압', np.volt, function (v) { np.volt = v; changed(); }),
      field('np-ctrl', '제어전압', np.ctrl, function (v) { np.ctrl = v; changed(); }),
      field('np-sccr', '단락정격 (kA)', np.sccr, function (v) { np.sccr = v; changed(); }, { inputmode: 'decimal' }),
      field('np-ip', '보호등급', np.ip, function (v) { np.ip = v; changed(); }),
      field('np-std', '적용규격', np.std, function (v) { np.std = v; changed(); }),
      field('np-date', '제조년월', np.date, function (v) { np.date = v; changed(); }),
      field('np-dwg', '도면번호 (주 문서)', np.dwg, function (v) { np.dwg = v; changed(); })
    ]);
    var tb = el('tbody');
    panelsOf(p).forEach(function (pn, i) {
      var d = per(pn.tag);
      function cell(key, ph, mode) {
        return el('td', {}, [el('input', { type: 'text', value: d[key] || '', placeholder: ph, inputmode: mode || null, 'aria-label': pn.tag + ' ' + ph,
          oninput: function (e) { d[key] = e.target.value; changed(); } })]);
      }
      tb.appendChild(el('tr', {}, [el('td', { cls: 'c-mono', text: pn.tag }), el('td', { cls: 'c-mono', text: pn.serial || '—' }),
        cell('product', pn.desc || '품명'), cell('current', '정격전류 A', 'decimal'), cell('weight', '중량 kg', 'decimal')]));
    });
    var sizeSel = el('select', { id: 'np-size', onchange: function (e) { np.size = e.target.value; changed(); } });
    Object.keys(NP_SIZES).forEach(function (k) { var o = el('option', { value: k, text: NP_SIZES[k][0] }); if (k === np.size) o.selected = true; sizeSel.appendChild(o); });
    var prevSel = el('select', { id: 'np-prev', onchange: function (e) { st.preview = e.target.value; drawPreview(); } });
    panelsOf(p).forEach(function (pn) { var o = el('option', { value: pn.tag, text: pn.tag + (pn.serial ? ' · ' + pn.serial : '') }); if (pn.tag === st.preview) o.selected = true; prevSel.appendChild(o); });
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '2' }), '명판 (판넬 LOT)']),
      el('p', { cls: 'help', text: '명판에는 판넬 LOT(제조번호)와 정격을 새깁니다. 공통 값은 위에, 판넬마다 다른 값은 아래 표에 적습니다. 빈 항목은 명판에서 빠집니다.' }),
      grid,
      el('div', { cls: 'table-wrap' }, [el('table', { cls: 'tbl', id: 'npTable' }, [
        el('thead', {}, [el('tr', {}, ['도면 Tag', 'LOT', '품명', '정격전류 (A)', '중량 (kg)'].map(function (h) { return el('th', { text: h }); }))]), tb])]),
      el('div', { cls: 'grid' }, [
        el('div', { cls: 'field' }, [el('label', { for: 'np-size', text: '명판 크기' }), sizeSel]),
        el('div', { cls: 'field' }, [el('label', { for: 'np-prev', text: '미리 볼 판넬' }), prevSel])
      ]),
      el('div', { cls: 'checks' }, [
        el('label', { cls: 'check', for: 'np-qr' }, [el('input', { type: 'checkbox', id: 'np-qr', checked: np.qr, onchange: function (e) { np.qr = e.target.checked; changed(); } }), 'QR 넣기 (LOT·프로젝트·Tag)']),
        el('label', { cls: 'check', for: 'np-holes' }, [el('input', { type: 'checkbox', id: 'np-holes', checked: np.holes, onchange: function (e) { np.holes = e.target.checked; changed(); } }), '고정 구멍 표시'])
      ]),
      el('div', { cls: 'np-prev', id: 'npPreview', role: 'img', 'aria-label': '명판 미리보기' }),
      typeof window.qrcode !== 'function' ? el('p', { cls: 'note', text: 'QR 라이브러리를 불러오지 못했습니다(인터넷 연결 확인). QR 없이 만들어집니다.' }) : null,
      el('div', { cls: 'row-actions' }, [
        el('button', { type: 'button', cls: 'btn', text: '명판 인쇄 (A4 실제 크기)', onclick: function () { doPrint(nameplateDoc(), '명판'); } }),
        el('button', { type: 'button', cls: 'btn', text: '명판 도안 받기 (업체용 SVG · zip)', onclick: svgZip }),
        el('button', { type: 'button', cls: 'btn btn-ghost', text: '인쇄용 파일 받기', onclick: function () { doSave(nameplateDoc(), (A.P.clean(p.pj) || '프로젝트') + '_명판_인쇄.html', '명판'); } })
      ])
    ]));

    // 라벨
    var kb = el('tbody', { id: 'lbKinds' });
    KINDS.forEach(function (k) {
      var cfg = st.kinds[k.id];
      var sel = el('select', { 'aria-label': k.name + ' 라벨지', onchange: function (e) { cfg.sheet = e.target.value; changed(); } });
      Object.keys(SHEETS).forEach(function (s) { var o = el('option', { value: s, text: SHEETS[s].name }); if (s === cfg.sheet) o.selected = true; sel.appendChild(o); });
      kb.appendChild(el('tr', {}, [
        el('td', {}, [el('input', { type: 'checkbox', checked: cfg.on, 'aria-label': k.name + ' 인쇄', onchange: function (e) { cfg.on = e.target.checked; changed(); } })]),
        el('td', {}, [el('b', { text: k.name }), el('div', { cls: 'sub', text: k.src })]),
        el('td', {}, [sel]),
        el('td', {}, [el('input', { type: 'number', min: '1', max: '10', value: cfg.copies, 'aria-label': k.name + ' 같은 라벨 장수', cls: 'num-in',
          oninput: function (e) { cfg.copies = e.target.value; changed(); } })]),
        el('td', { cls: 'c-mono', id: 'lbCount-' + k.id })
      ]));
    });
    steps.appendChild(el('section', { cls: 'step' }, [
      el('h2', {}, [el('span', { cls: 'num', text: '3' }), '라벨 (A4 라벨지)']),
      el('p', { cls: 'help', text: '기기 라벨은 BOM의 도면 기호, 전선 마커는 I/O 리스트에서 만듭니다. 전선 마커는 양끝에 붙이도록 기본 2장씩 나옵니다(깃발형으로 붙임).' }),
      el('div', { cls: 'table-wrap' }, [el('table', { cls: 'tbl', id: 'lbTable' }, [
        el('thead', {}, [el('tr', {}, ['인쇄', '종류', '라벨지', '같은 라벨', '장수'].map(function (h) { return el('th', { text: h }); }))]), kb])]),
      el('div', { cls: 'grid' }, [
        field('lb-dx', '위치 보정 가로 (mm, +오른쪽)', st.dx, function (v) { st.dx = v; changed(); }, { type: 'number', step: '0.5' }),
        field('lb-dy', '위치 보정 세로 (mm, +아래)', st.dy, function (v) { st.dy = v; changed(); }, { type: 'number', step: '0.5' })
      ]),
      el('label', { cls: 'check', for: 'lb-ol' }, [el('input', { type: 'checkbox', id: 'lb-ol', checked: st.outline, onchange: function (e) { st.outline = e.target.checked; changed(); } }), '칸 테두리 인쇄 (일반 종이로 위치 맞춰 볼 때)']),
      el('div', { cls: 'lb-prev', id: 'lbPreview', 'aria-label': '라벨 미리보기' }),
      el('div', { cls: 'row-actions' }, [
        el('button', { type: 'button', cls: 'btn', text: '라벨 인쇄', onclick: function () { doPrint(labelsDoc(), '라벨'); } }),
        el('button', { type: 'button', cls: 'btn btn-ghost', text: '인쇄용 파일 받기', onclick: function () { doSave(labelsDoc(), (A.P.clean(p.pj) || '프로젝트') + '_라벨_인쇄.html', '라벨'); } }),
        el('button', { type: 'button', cls: 'btn btn-ghost', text: '라벨 목록 받기 (CSV, 라벨 프린터용)', onclick: labelCsv })
      ]),
      el('p', { cls: 'help', text: '라벨지는 상자에 적힌 칸 크기가 같은 제품(폼텍·애니라벨 등 A4)을 고릅니다. 처음에는 \'칸 테두리 인쇄\'를 켜고 일반 종이에 인쇄해 라벨지와 겹쳐 보고, 어긋나면 위치 보정 값을 고칩니다. 인쇄 창에서 배율은 실제 크기(100%), 여백은 없음으로 합니다.' })
    ]));

    // 오른쪽: 요약·인쇄
    layout.appendChild(el('aside', { cls: 'out' }, [el('div', { cls: 'out-card' }, [
      el('div', { cls: 'out-head' }, [el('h2', { text: '인쇄할 것' }), el('p', { cls: 'count' }, [el('b', { id: 'lbTotal', text: '0' }), '장 라벨 · A4 ', el('b', { id: 'lbPages', text: '0' }), '장'])]),
      el('ul', { cls: 'checklist', id: 'lbSummary' }),
      el('button', { type: 'button', cls: 'btn btn-primary', text: '라벨 인쇄', onclick: function () { doPrint(labelsDoc(), '라벨'); } }),
      el('button', { type: 'button', cls: 'btn', text: '명판 인쇄', onclick: function () { doPrint(nameplateDoc(), '명판'); } }),
      el('p', { cls: 'status', id: 'lbStatus', role: 'status' }),
      el('ul', { cls: 'rules' }, [
        el('li', {}, [el('b', { text: '명판' }), '업체 제작은 SVG 도안(실제 크기)을 보내고, 임시 표시는 A4 라벨지·코팅지에 인쇄합니다.']),
        el('li', {}, [el('b', { text: 'LOT' }), '명판·판넬 라벨·출하 라벨의 LOT는 01 탭의 제조번호에서 옵니다. 바꾸면 QF-04·QF-06 기록도 같이 맞춥니다.']),
        el('li', {}, [el('b', { text: '라벨 프린터' }), '들이게 되면 \'라벨 목록 받기\' CSV를 프린터 프로그램(수축튜브·케이블 마커)에 불러옵니다.'])
      ])
    ])]));
    refresh();
  }

  function drawPreview() {
    var box = $('npPreview');
    if (!box) return;
    var p = A.project(), pans = panelsOf(p);
    var pn = pans.filter(function (x) { return x.tag === st.preview; })[0] || pans[0];
    if (!pn) { box.innerHTML = ''; return; }
    box.innerHTML = nameplateSvg(p, pn).replace(/ width="[\d.]+mm" height="[\d.]+mm"/, ' width="100%"');
  }

  function refresh() {
    drawPreview();
    var total = 0, pages = 0, sum = $('lbSummary'), prev = $('lbPreview');
    if (!sum) return;
    A.clear(sum);
    A.clear(prev);
    KINDS.forEach(function (k) {
      var cfg = st.kinds[k.id], list = labelList(k.id), sh = SHEETS[cfg.sheet];
      var pg = Math.ceil(list.length / (sh.cols * sh.rows));
      var cnt = $('lbCount-' + k.id);
      if (cnt) cnt.textContent = list.length + '장' + (list.length ? ' · A4 ' + pg : '');
      if (!cfg.on) return;
      total += list.length; pages += pg;
      sum.appendChild(el('li', { cls: list.length ? 'ok' : 'off' }, [
        el('span', { cls: 'ic', 'aria-hidden': 'true', text: list.length ? '✓' : '–' }),
        el('span', { cls: 'txt' }, [el('b', { text: k.name + ' ' }), list.length ? list.length + '장 · ' + sh.name.split(' · ')[0] + ' ' + pg + '장' : (k.id === 'device' ? 'BOM 도면 기호 없음' : k.id === 'wire' ? 'I/O 리스트 없음' : '판넬 선택 없음')])
      ]));
      if (list.length) {
        var shown = list.filter(function (l, i) { return i === 0 || l.content !== list[i - 1].content; }).slice(0, k.id === 'ship' ? 1 : 3);
        var row = el('div', { cls: 'lb-row' }, [el('div', { cls: 'lb-cap', text: k.name + ' · ' + sh.w + '×' + sh.h + 'mm (실제 크기)' })]);
        shown.forEach(function (l) {
          var d = el('div', { cls: 'lb-one' });
          d.style.width = sh.w + 'mm'; d.style.height = sh.h + 'mm';
          d.innerHTML = labelInner(l, sh);
          row.appendChild(d);
        });
        prev.appendChild(row);
      }
    });
    $('lbTotal').textContent = total;
    $('lbPages').textContent = pages;
  }

  var timer = null;
  function changed() {
    remember();
    clearTimeout(timer);
    timer = setTimeout(refresh, 120);
  }

  window.IsoViews = window.IsoViews || {};
  window.IsoViews.labels = {
    show: function () {
      A = window.IsoApp; P = A.P; el = A.el; $ = A.$; esc = A.esc;
      if (!document.getElementById('lbxCss')) { var css = document.createElement('style'); css.id = 'lbxCss'; css.textContent = LABEL_CSS.replace(/\.sheet[^}]*\}/g, ''); document.head.appendChild(css); }
      render();
    },
    // 시험용
    _nameplateSvg: function (pn) { return nameplateSvg(A.project(), pn); },
    _labelsDoc: function () { return labelsDoc(); },
    LABEL_CSS: LABEL_CSS
  };
})();
