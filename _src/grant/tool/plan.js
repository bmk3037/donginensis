/* 사업계획서 읽기 (AI 없이, 이 브라우저 안에서만) ─ .hwp · .hwpx · .docx · .pdf
   1) 글자와 표를 꺼낸다 → blocks: [{ p: '문단' } | { tbl: [['칸', …], …] }]
   2) 표의 「이름칸 → 값칸」, 「이름: 값」 문장, 성과지표·세부과제 표, 목적·기대효과 단락을 찾아 프로젝트(JSON 불러오기와 같은 모양)로 만든다.
   양식마다 칸 이름이 달라 다 찾지는 못한다. 찾은 칸과 못 찾은 칸을 함께 돌려주어 화면에서 확인하게 한다. */
window.GrantPlan = (function () {
  'use strict';

  /* ================================================================ 1. 글자·표 꺼내기 */

  async function read(file) {
    var buf = new Uint8Array(await file.arrayBuffer());
    var head = Array.from(buf.subarray(0, 8)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    if (head === 'd0cf11e0a1b11ae1') return { kind: 'HWP', blocks: await hwp(buf) };
    if (head.slice(0, 8) === '504b0304') {
      var zip = await JSZip.loadAsync(buf);
      if (zip.file('word/document.xml')) return { kind: 'DOCX', blocks: await docx(zip) };
      if (Object.keys(zip.files).some(function (n) { return /^Contents\/section\d+\.xml$/i.test(n); })) return { kind: 'HWPX', blocks: await hwpx(zip) };
      throw new Error('워드(.docx)나 한글(.hwpx) 파일이 아닙니다');
    }
    if (head.slice(0, 8) === '25504446') return { kind: 'PDF', blocks: await pdf(buf) };
    throw new Error('한글(.hwp·.hwpx), 워드(.docx), PDF 만 읽을 수 있습니다');
  }

  var kids = function (el, name) { return Array.prototype.filter.call(el.children, function (c) { return !name || c.localName === name; }); };
  function grid(rows, cols) { var g = []; for (var r = 0; r < rows; r++) { g.push([]); for (var c = 0; c < cols; c++) g[r].push(''); } return g; }

  /* ---------------------------------------------------------------- 워드 (.docx) */
  async function docx(zip) {
    var doc = new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'), 'application/xml');
    var body = doc.getElementsByTagNameNS('*', 'body')[0], out = [];
    function ptext(p) {
      var s = '';
      p.querySelectorAll('*').forEach(function (n) {
        if (n.localName === 't') s += n.textContent;
        else if (n.localName === 'tab') s += '\t';
        else if (n.localName === 'br' || n.localName === 'cr') s += '\n';
      });
      return s;
    }
    function table(tbl) {
      var rows = [];
      kids(tbl, 'tr').forEach(function (tr) {
        var row = [];
        kids(tr).forEach(function (tc) {
          if (tc.localName === 'sdt') tc = tc.getElementsByTagNameNS('*', 'tc')[0] || tc;
          if (tc.localName !== 'tc') return;
          var parts = [];
          walk(tc, parts, out);
          row.push(parts.join('\n'));
          var span = tc.getElementsByTagNameNS('*', 'gridSpan')[0];
          for (var k = 1; span && k < +span.getAttribute('w:val'); k++) row.push('');
        });
        rows.push(row);
      });
      return rows;
    }
    // 문단은 parts 에 글자로, 표는 out 에 표로(칸 안의 표 글자는 그 칸에도 남김)
    function walk(el, parts, sink) {
      kids(el).forEach(function (c) {
        if (c.localName === 'p') parts.push(ptext(c));
        else if (c.localName === 'tbl') { var t = table(c); sink.push({ tbl: t }); parts.push(t.map(function (r) { return r.join(' '); }).join('\n')); }
        else if (c.localName === 'sdt' || c.localName === 'sdtContent' || c.localName === 'customXml') walk(c, parts, sink);
      });
    }
    (function top(el) {
      kids(el).forEach(function (c) {
        if (c.localName === 'p') out.push({ p: ptext(c) });
        else if (c.localName === 'tbl') out.push({ tbl: table(c) });
        else if (c.localName === 'sdt' || c.localName === 'sdtContent' || c.localName === 'customXml') top(c);
      });
    })(body);
    return out;
  }

  /* ---------------------------------------------------------------- 한글 개방형 (.hwpx) */
  async function hwpx(zip) {
    var names = Object.keys(zip.files).filter(function (n) { return /^Contents\/section\d+\.xml$/i.test(n); })
      .sort(function (a, b) { return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10); });
    var out = [];
    function ttext(t) {
      var s = '';
      t.childNodes.forEach(function (n) {
        if (n.nodeType === 3) s += n.nodeValue;
        else if (n.localName === 'tab') s += '\t';
        else if (n.localName === 'lineBreak') s += '\n';
        else s += n.textContent;
      });
      return s;
    }
    // 문단 하나: 글자는 이어 붙이고, 문단 안의 표·글상자는 따로
    function para(p, parts, sink) {
      var s = '', inner = [];
      kids(p, 'run').forEach(function (run) {
        kids(run).forEach(function (c) {
          if (c.localName === 't') s += ttext(c);
          else if (c.localName === 'tbl') inner.push(c);
          else c.querySelectorAll('subList').forEach(function (sl) { if (!sl.closest('tbl')) kids(sl, 'p').forEach(function (q) { para(q, parts, sink); }); });
        });
      });
      parts.push(s);
      inner.forEach(function (t) { var g = table(t, sink); sink.push({ tbl: g }); if (parts.cell) parts.push(g.map(function (r) { return r.join(' '); }).join('\n')); });
    }
    function table(tbl, sink) {
      var rows = +tbl.getAttribute('rowCnt') || 0, cols = +tbl.getAttribute('colCnt') || 0, cells = [];
      kids(tbl, 'tr').forEach(function (tr, ri) {
        kids(tr, 'tc').forEach(function (tc, ci) {
          var addr = kids(tc, 'cellAddr')[0], parts = [];
          parts.cell = true;
          kids(tc, 'subList').forEach(function (sl) { kids(sl, 'p').forEach(function (q) { para(q, parts, sink); }); });
          var r = addr ? +addr.getAttribute('rowAddr') : ri, c = addr ? +addr.getAttribute('colAddr') : ci;
          cells.push({ r: r, c: c, s: parts.join('\n') });
          rows = Math.max(rows, r + 1); cols = Math.max(cols, c + 1);
        });
      });
      var g = grid(rows, cols);
      cells.forEach(function (x) { g[x.r][x.c] = x.s; });
      return g;
    }
    for (var i = 0; i < names.length; i++) {
      var doc = new DOMParser().parseFromString(await zip.file(names[i]).async('string'), 'application/xml');
      kids(doc.documentElement, 'p').forEach(function (p) {
        var parts = [], sink = [];
        para(p, parts, sink);
        // 문단 글자(글상자 글 포함) → 그 문단의 표 순서로
        parts.forEach(function (s) { if (s.trim()) out.push({ p: s }); });
        sink.forEach(function (b) { out.push(b); });
      });
    }
    return out;
  }

  /* ---------------------------------------------------------------- 한글 (.hwp, 한글 5.0 바이너리) */
  // 복합 문서(CFB) 안의 FileHeader·BodyText/SectionN 을 꺼내 압축을 풀고, 레코드에서 문단 글자와 표 칸을 읽는다.
  function cfb(u8) {
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    var ss = 1 << dv.getUint16(30, true), ms = 1 << dv.getUint16(32, true);
    var nFat = dv.getUint32(44, true), dirStart = dv.getUint32(48, true), cutoff = dv.getUint32(56, true);
    var miniFatStart = dv.getUint32(60, true), difatStart = dv.getUint32(68, true);
    var off = function (i) { return (i + 1) * ss; };
    var fatSecs = [];
    for (var i = 0; i < 109 && fatSecs.length < nFat; i++) fatSecs.push(dv.getUint32(76 + i * 4, true));
    for (var d = difatStart, guard = 0; fatSecs.length < nFat && d < 0xFFFFFFFA && guard++ < 1e5; d = dv.getUint32(off(d) + ss - 4, true))
      for (var j = 0; j < ss / 4 - 1 && fatSecs.length < nFat; j++) fatSecs.push(dv.getUint32(off(d) + j * 4, true));
    var fat = [];
    fatSecs.forEach(function (s) { for (var k = 0; k < ss / 4; k++) fat.push(dv.getUint32(off(s) + k * 4, true)); });
    function chain(start, table) { var out = [], n = start, g = 0; while (n < 0xFFFFFFFA && g++ < 1e6) { out.push(n); n = table[n]; } return out; }
    function big(start, size) {
      var secs = chain(start, fat), b = new Uint8Array(secs.length * ss);
      secs.forEach(function (s, k) { b.set(u8.subarray(off(s), off(s) + ss), k * ss); });
      return size == null ? b : b.subarray(0, size);
    }
    var dir = big(dirStart), ddv = new DataView(dir.buffer), ents = [];
    for (var e = 0; e + 128 <= dir.length; e += 128) {
      var nl = ddv.getUint16(e + 64, true), name = '';
      for (var c = 0; c + 2 < nl; c += 2) name += String.fromCharCode(ddv.getUint16(e + c, true));
      ents.push({ name: name, type: dir[e + 66], left: ddv.getUint32(e + 68, true), right: ddv.getUint32(e + 72, true),
                  child: ddv.getUint32(e + 76, true), start: ddv.getUint32(e + 116, true), size: ddv.getUint32(e + 120, true) });
    }
    var root = ents[0], mini = root.size ? big(root.start, root.size) : new Uint8Array(0);
    var mfBytes = miniFatStart < 0xFFFFFFFA ? big(miniFatStart) : new Uint8Array(0), mdv = new DataView(mfBytes.buffer), minifat = [];
    for (var m = 0; m + 4 <= mfBytes.length; m += 4) minifat.push(mdv.getUint32(m, true));
    function data(ent) {
      if (ent.size >= cutoff) return big(ent.start, ent.size);
      var secs = chain(ent.start, minifat), b = new Uint8Array(secs.length * ms);
      secs.forEach(function (s, k) { b.set(mini.subarray(s * ms, s * ms + ms), k * ms); });
      return b.subarray(0, ent.size);
    }
    function children(ent) {
      var out = [], stack = [ent.child], g = 0;
      while (stack.length && g++ < 1e5) { var i = stack.pop(); if (i >= ents.length || i === 0xFFFFFFFF) continue; var x = ents[i]; out.push(x); stack.push(x.left, x.right); }
      return out;
    }
    return { root: root, children: children, data: data };
  }
  async function inflateRaw(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 한글(.hwp) 압축을 풀 수 없습니다. 크롬·엣지 최신판을 쓰거나 한글에서 .hwpx 로 저장해 넣으세요');
    var s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function hwp(u8) {
    var f = cfb(u8), top = f.children(f.root);
    var fh = top.filter(function (e) { return e.name === 'FileHeader'; })[0];
    if (!fh) throw new Error('한글 문서가 아닙니다');
    var h = f.data(fh), prop = new DataView(h.buffer, h.byteOffset).getUint32(36, true);
    if (prop & 2) throw new Error('암호가 걸린 한글 문서입니다. 한글에서 암호를 풀고 저장한 뒤 넣으세요');
    if (prop & 4) throw new Error('배포용 한글 문서라 글자를 꺼낼 수 없습니다. 한글에서 PDF 로 저장해 넣으세요');
    var body = top.filter(function (e) { return e.name === 'BodyText'; })[0];
    if (!body) throw new Error('본문(BodyText)이 없는 한글 문서입니다');
    var secs = f.children(body).filter(function (e) { return /^Section\d+$/.test(e.name); })
      .sort(function (a, b) { return +a.name.slice(7) - +b.name.slice(7); });
    var out = [];
    for (var i = 0; i < secs.length; i++) {
      var raw = f.data(secs[i]);
      records(prop & 1 ? await inflateRaw(raw) : raw, out);
    }
    return out;
  }
  var TBL = (0x74 << 24) | (0x62 << 16) | (0x6c << 8) | 0x20;    // 'tbl '
  function paraText(b) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), s = '', n = b.length >> 1;
    for (var i = 0; i < n;) {
      var c = dv.getUint16(i * 2, true);
      if (c >= 32) { s += String.fromCharCode(c); i++; continue; }
      if (c === 0 || c === 10 || c === 13 || (c >= 24 && c <= 31)) { if (c === 10) s += '\n'; else if (c === 30 || c === 31) s += ' '; i++; continue; }
      if (c === 9) s += '\t';
      i += 8;                                                    // 확장·인라인 컨트롤은 8글자 자리
    }
    return s;
  }
  function records(u8, out) {
    var dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), p = 0, stack = [];
    function cellOf() { for (var k = stack.length - 1; k >= 0; k--) if (stack[k].tbl && stack[k].cur) return stack[k].cur; return null; }
    function close(t) {
      if (!t.tbl) return;
      var g = grid(Math.max(t.rows, 1 + Math.max.apply(null, t.cells.map(function (x) { return x.r; }).concat(0))),
                   Math.max(t.cols, 1 + Math.max.apply(null, t.cells.map(function (x) { return x.c; }).concat(0))));
      t.cells.forEach(function (x) { g[x.r][x.c] = x.parts.join('\n'); });
      out.push({ tbl: g });
      var host = cellOf();
      if (host) host.parts.push(g.map(function (r) { return r.join(' '); }).join('\n'));
    }
    while (p + 4 <= u8.length) {
      var hd = dv.getUint32(p, true), tag = hd & 0x3ff, level = (hd >>> 10) & 0x3ff, size = hd >>> 20;
      p += 4;
      if (size === 0xfff) { size = dv.getUint32(p, true); p += 4; }
      var rec = u8.subarray(p, p + size); p += size;
      while (stack.length && level <= stack[stack.length - 1].level) close(stack.pop());
      var t = stack[stack.length - 1];
      if (tag === 71 && rec.length >= 4) {                       // CTRL_HEADER
        var id = new DataView(rec.buffer, rec.byteOffset, rec.length).getUint32(0, true);
        stack.push(id === TBL ? { level: level, tbl: true, rows: 0, cols: 0, cells: [], cur: null } : { level: level });
      } else if (tag === 77 && t && t.tbl && rec.length >= 8) {  // TABLE: 줄·칸 수
        var tv = new DataView(rec.buffer, rec.byteOffset, rec.length);
        t.rows = tv.getUint16(4, true); t.cols = tv.getUint16(6, true);
      } else if (tag === 72 && t && t.tbl && level === t.level + 1) {   // LIST_HEADER = 칸 하나 시작
        var lv = new DataView(rec.buffer, rec.byteOffset, rec.length), c = -1, r = -1;
        if (rec.length >= 12) { c = lv.getUint16(8, true); r = lv.getUint16(10, true); }
        if (!(c >= 0 && c < (t.cols || 999) && r >= 0 && r < (t.rows || 999))) {      // 칸 위치를 못 읽으면 차례대로
          var k = t.cells.length; c = t.cols ? k % t.cols : k; r = t.cols ? Math.floor(k / t.cols) : 0;
        }
        t.cur = { r: r, c: c, parts: [] };
        t.cells.push(t.cur);
      } else if (tag === 67) {                                  // PARA_TEXT
        var s = paraText(rec), host = cellOf();
        if (host) host.parts.push(s); else out.push({ p: s });
      }
    }
    while (stack.length) close(stack.pop());
  }

  /* ---------------------------------------------------------------- PDF (pdf.js 를 처음 쓸 때 받아 옴) */
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (ok, ng) {
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
      s.onerror = function () { ng(new Error('PDF 읽기 프로그램을 받지 못했습니다. 인터넷 연결을 확인하세요')); };
      document.head.appendChild(s);
    });
  }
  // 표 테두리 선(그림 명령)을 모아 칸 경계를 만들고, 글자를 그 칸에 넣는다. 선이 없는 쪽은 넓은 간격으로 칸을 나눈다.
  async function pdf(u8) {
    var lib = await loadPdfJs(), doc = await lib.getDocument({ data: u8 }).promise, out = [], chars = 0;
    for (var n = 1; n <= doc.numPages; n++) {
      var page = await doc.getPage(n);
      var items = (await page.getTextContent()).items.filter(function (it) { return it.str != null; }).map(function (it) {
        var h = Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || 10;
        return { s: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: h };
      });
      items.forEach(function (it) { chars += it.s.trim().length; });
      var tables = pdfTables(lib, await page.getOperatorList());
      // 글자 → 표 칸, 나머지는 줄
      var loose = [];
      items.forEach(function (it) {
        if (!it.s.trim()) { loose.push(it); return; }
        var cx = it.x + Math.min(it.w, it.h) / 2, cy = it.y + it.h * 0.35;
        var t = tables.filter(function (t) { return cx > t.x0 && cx < t.x1 && cy > t.y0 && cy < t.y1; })[0];
        if (!t) { loose.push(it); return; }
        var c = idx(t.xs, cx), r = t.ys.length - 2 - idx(t.ys, cy);
        (t.cell[r + ',' + c] = t.cell[r + ',' + c] || []).push(it);
      });
      var blocks = [];
      tables.forEach(function (t) {
        var g = grid(t.ys.length - 1, t.xs.length - 1), any = false;
        Object.keys(t.cell).forEach(function (k) { var rc = k.split(','); g[+rc[0]][+rc[1]] = lines(t.cell[k]).map(function (l) { return l.text; }).join(' ').replace(/([-/~]) (?=\d)/g, '$1'); any = true; });
        // 빈 줄·빈 칸 정리 (선만 있는 줄)
        g = g.filter(function (row) { return row.some(function (x) { return x.trim(); }); });
        var keep = g.length ? g[0].map(function (_, ci) { return g.some(function (row) { return row[ci].trim(); }); }) : [];
        g = g.map(function (row) { return row.filter(function (_, ci) { return keep[ci]; }); });
        if (any && g.length) blocks.push({ y: t.y1, tbl: g.length === 1 && g[0].length === 1 ? null : g, p: g.length === 1 && g[0].length === 1 ? g[0][0] : null });
      });
      lines(loose).forEach(function (l) {
        if (l.cells.length > 1) blocks.push({ y: l.y, row: l.cells });
        else if (l.text) blocks.push({ y: l.y, p: l.text });
      });
      blocks.sort(function (a, b) { return b.y - a.y; });
      var run = null;
      blocks.forEach(function (bl) {
        if (bl.row) { if (!run) out.push(run = { tbl: [] }); run.tbl.push(bl.row); return; }
        run = null;
        out.push(bl.tbl ? { tbl: bl.tbl } : { p: bl.p });
      });
    }
    if (chars < 40 * doc.numPages) throw new Error('글자가 거의 없는 PDF(스캔한 그림)입니다. 한글·워드 원본이나 글자가 있는 PDF 를 넣으세요');
    return out;
  }
  function idx(edges, v) { for (var i = 0; i < edges.length - 1; i++) if (v < edges[i + 1]) return i; return edges.length - 2; }
  // 글자 조각 → 줄 (같은 높이), 줄 안에서 넓게 떨어진 곳은 칸 나눔
  function lines(items) {
    var ls = [];
    items.forEach(function (it) {
      var l = ls.filter(function (l) { return Math.abs(l.y - it.y) < Math.max(l.h, it.h) * 0.5; })[0];
      if (!l) ls.push(l = { y: it.y, h: it.h, items: [] });
      l.items.push(it);
    });
    ls.sort(function (a, b) { return b.y - a.y; });
    return ls.map(function (l) {
      l.items.sort(function (a, b) { return a.x - b.x; });
      var cells = [''], end = null, gapSpace = false;
      l.items.forEach(function (it) {
        if (!it.s.trim()) { gapSpace = true; if (end != null) end = Math.max(end, it.x + it.w); return; }
        var gap = end == null ? 0 : it.x - end;
        if (end != null && gap > l.h * 1.2) cells.push('');
        else if (end != null && (gapSpace || gap > l.h * 0.3) && !/\s$/.test(cells[cells.length - 1])) cells[cells.length - 1] += ' ';
        cells[cells.length - 1] += it.s;
        end = it.x + it.w; gapSpace = /\s$/.test(it.s);
      });
      // 숫자와 단위 글꼴이 달라 생긴 틈 「2026 년」 → 「2026년」
      cells = cells.map(function (c) { return c.trim().replace(/(\d) (?=[년월일개곳명대초회건원%])/g, '$1'); }).filter(Boolean);
      return { y: l.y, cells: cells, text: cells.join(' ') };
    });
  }
  // 그림 명령에서 가로·세로 선(얇은 사각형, 직선, 사각형 테두리)을 모아 서로 닿는 것끼리 표 하나로 묶는다
  function pdfTables(lib, ops) {
    var O = lib.OPS, segs = [], pending = [], ctm = [1, 0, 0, 1, 0, 0], stack = [];
    // 칠하거나 그은 경로만 선으로 본다 (자르기(clip) 경로는 버림)
    var PAINT = [O.stroke, O.closeStroke, O.fill, O.eoFill, O.fillStroke, O.eoFillStroke, O.closeFillStroke, O.closeEOFillStroke];
    var mul = function (m, a) { return [m[0] * a[0] + m[2] * a[1], m[1] * a[0] + m[3] * a[1], m[0] * a[2] + m[2] * a[3], m[1] * a[2] + m[3] * a[3], m[0] * a[4] + m[2] * a[5] + m[4], m[1] * a[4] + m[3] * a[5] + m[5]]; };
    var pt = function (x, y) { return [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]]; };
    function seg(a, b) {
      var dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]);
      if (dy < 1.2 && dx > 4) pending.push({ h: true, y: (a[1] + b[1]) / 2, a: Math.min(a[0], b[0]), b: Math.max(a[0], b[0]) });
      else if (dx < 1.2 && dy > 4) pending.push({ h: false, x: (a[0] + b[0]) / 2, a: Math.min(a[1], b[1]), b: Math.max(a[1], b[1]) });
    }
    for (var i = 0; i < ops.fnArray.length; i++) {
      var fn = ops.fnArray[i], args = ops.argsArray[i];
      if (fn === O.save) stack.push(ctm.slice());
      else if (fn === O.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === O.transform) ctm = mul(ctm, args);
      else if (PAINT.indexOf(fn) >= 0) { segs = segs.concat(pending); pending = []; }
      else if (fn === O.endPath) pending = [];
      else if (fn === O.constructPath) {
        var sub = args[0], co = args[1], k = 0, cur = null, start = null;
        for (var j = 0; j < sub.length; j++) {
          var op = sub[j];
          if (op === O.rectangle) {
            var x = co[k++], y = co[k++], w = co[k++], h = co[k++];
            var p1 = pt(x, y), p2 = pt(x + w, y), p3 = pt(x + w, y + h), p4 = pt(x, y + h);
            var thin = Math.abs(w) < 2.5 || Math.abs(h) < 2.5;
            if (thin) seg(Math.abs(w) < 2.5 ? [(p1[0] + p2[0]) / 2, p1[1]] : [p1[0], (p1[1] + p4[1]) / 2], Math.abs(w) < 2.5 ? [(p3[0] + p4[0]) / 2, p3[1]] : [p2[0], (p2[1] + p3[1]) / 2]);
            else { seg(p1, p2); seg(p2, p3); seg(p3, p4); seg(p4, p1); }
          } else if (op === O.moveTo) { cur = start = pt(co[k++], co[k++]); }
          else if (op === O.lineTo) { var q = pt(co[k++], co[k++]); if (cur) seg(cur, q); cur = q; }
          else if (op === O.curveTo) { k += 6; cur = pt(co[k - 2], co[k - 1]); }
          else if (op === O.curveTo2 || op === O.curveTo3) { k += 4; cur = pt(co[k - 2], co[k - 1]); }
          else if (op === O.closePath) { if (cur && start) seg(cur, start); cur = start; }
        }
      }
    }
    if (segs.length > 4000) return [];
    // 닿는 선끼리 묶기
    var par = segs.map(function (_, i) { return i; });
    var find = function (i) { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
    var touch = function (h, v) { return v.x >= h.a - 2 && v.x <= h.b + 2 && h.y >= v.a - 2 && h.y <= v.b + 2; };
    for (var a = 0; a < segs.length; a++) for (var b = a + 1; b < segs.length; b++) {
      var A = segs[a], B = segs[b];
      if (A.h !== B.h ? touch(A.h ? A : B, A.h ? B : A) : false) par[find(a)] = find(b);
    }
    var groups = {};
    segs.forEach(function (sg, i) { (groups[find(i)] = groups[find(i)] || []).push(sg); });
    var uniq = function (vs) { vs.sort(function (a, b) { return a - b; }); return vs.filter(function (v, i) { return !i || v - vs[i - 1] > 1.5; }); };
    return Object.keys(groups).map(function (k) {
      var g = groups[k], hs = g.filter(function (x) { return x.h; }), vs = g.filter(function (x) { return !x.h; });
      if (hs.length < 2 || vs.length < 2) return null;
      var ys = uniq(hs.map(function (x) { return x.y; })), xs = uniq(vs.map(function (x) { return x.x; }));
      if (ys.length < 2 || xs.length < 2) return null;
      return { xs: xs, ys: ys, x0: xs[0], x1: xs[xs.length - 1], y0: ys[0], y1: ys[ys.length - 1], cell: {} };
    }).filter(Boolean);
  }

  /* ================================================================ 2. 칸 찾기 */

  var clean = function (s) { return String(s == null ? '' : s).replace(/[ \t 　]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim(); };
  // 칸 이름 비교용: 띄어쓰기·기호·번호 머리 지움
  var key = function (s) {
    return clean(s).replace(/^(\(?\d{1,2}[.)]\s*)+/, '').replace(/^[①-⑳ⅰ-ⅹⅠ-Ⅹ○●◦□■▶▷※\-*·ㆍ]+/, '')
      .replace(/[\s·ㆍ:：()（）[\]<>「」『』*※\-_/]/g, '');
  };

  var LABELS = [
    ['사업.사업명', /^(지원)?사업명(칭)?$|^공고명$|^지원사업$/],
    ['사업.과제명', /^(사업)?과제명(칭)?(국문|한글)?$|^과제$|^사업과제$/],
    ['사업.주관기관', /^(전담|전문|운영|주관|담당)기관(명)?$|^주관전담기관$/],
    ['사업.협약번호', /^(협약|과제|관리|접수)번호$/],
    ['사업.사업기간', /^(총)?(사업|수행|협약|개발|과제|사업수행|지원)기간$/],
    ['사업.사업비.정부지원금', /^(정부|국고)?(지원금|출연금|보조금)$|^정부지원(사업비|금액)?$|^국비$/],
    ['사업.사업비.자부담_현금', /^(기업|민간|자기|자)?부담(금)?현금$|^현금$/],
    ['사업.사업비.자부담_현물', /^(기업|민간|자기|자)?부담(금)?현물$|^현물$/],
    ['사업.사업비.총사업비', /^총사업비$|^사업비(합계|총계|총액)$/],
    ['기업.기업명', /^(기업|업체|회사|법인|신청기업|신청업체|수행기관|주관기관|기관)명$|^상호$|^신청기업$/],
    ['기업.대표자', /^대표(자|이사)(명|성명)?$|^대표$/],
    ['기업.사업자등록번호', /^사업자(등록)?번호$/],
    ['기업.주소', /^(본사|회사|사업장|기업)?(주소|소재지)$/],
    ['기업.담당자', /^(실무|과제)?(담당자|책임자)(명|성명)?$|^실무자$/],
    ['기업.연락처', /^(담당자)?(연락처|전화(번호)?|휴대(폰|전화)|핸드폰|tel|TEL)$/],
    ['문장.추진목적', /^(사업|과제|개발|추진)?(목적|목표및?필요성)$|^추진배경및?목적$/],
    ['문장.기대효과', /^기대효과$/],
    ['문장.향후계획', /^(향후|사업화|활용|확산)(계획|방안)$/],
  ];
  function labelOf(s) {
    var k = key(s);
    if (!k || k.length > 18) return null;
    for (var i = 0; i < LABELS.length; i++) if (LABELS[i][1].test(k)) return LABELS[i][0];
    return null;
  }

  // 돈: 단위(천원·백만원) 반영, 원 단위 숫자 문자열
  function money(s, unit) {
    var m = clean(s).replace(/\s/g, '').match(/-?[\d,]+(\.\d+)?/);
    if (!m) return '';
    var v = parseFloat(m[0].replace(/,/g, ''));
    if (!isFinite(v)) return '';
    var u = /백만원/.test(s) ? 1e6 : /천원/.test(s) ? 1e3 : /만원/.test(s) ? 1e4 : /원/.test(s) ? 1 : unit;
    return String(Math.round(v * u));
  }
  function unitIn(text) { var m = /단위\s*[:：]?\s*(백만원|천원|만원|원)/.exec(text); return m ? { 백만원: 1e6, 천원: 1e3, 만원: 1e4, 원: 1 }[m[1]] : 0; }
  // 날짜 두 개(시작 ~ 종료). 일이 없으면 시작은 1일, 종료는 그 달 말일
  function dates(s) {
    var re = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*(?:[.\-/월]\s*(?:(\d{1,2})\s*[.일]?)?)?/g, m, out = [];
    while ((m = re.exec(s)) && out.length < 2) out.push([+m[1], +m[2], m[3] ? +m[3] : 0]);
    if (out.length < 2) return null;
    var f = function (d, end) {
      var day = d[2] || (end ? new Date(d[0], d[1], 0).getDate() : 1);
      return d[0] + '-' + String(d[1]).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    };
    return { 시작: f(out[0], false), 종료: f(out[1], true) };
  }

  function extract(blocks) {
    var found = {}, src = {};
    function put(path, v, how) {
      v = typeof v === 'string' ? clean(v) : v;
      if (v === '' || v == null || found[path] != null) return;
      found[path] = v; src[path] = how;
    }
    function value(path, raw, unit) {
      var v = clean(raw);
      if (!v || labelOf(v)) return;
      if (path === '사업.사업기간') { var d = dates(v); if (d) { put('사업.사업기간.시작', d.시작); put('사업.사업기간.종료', d.종료); } return; }
      if (/^사업\.사업비\./.test(path)) { var mny = money(v, unit || 1); if (mny && +mny > 0) put(path, mny); else if (mny === '0') put(path, '0'); return; }
      if (path === '기업.사업자등록번호') { var b = /\d{3}-\d{2}-\d{5}/.exec(v); if (b) put(path, b[0]); return; }
      if (path === '기업.연락처') { var ph = /0\d{1,2}[-)\s.]?\d{3,4}[-\s.]?\d{4}/.exec(v); if (ph) put(path, ph[0]); return; }
      if (/^문장\./.test(path)) { put(path, v); return; }
      put(path, v.split('\n')[0]);
    }

    var text = blocks.map(function (b) { return b.p != null ? b.p : b.tbl.map(function (r) { return r.join(' '); }).join('\n'); }).join('\n');
    var docUnit = 0;

    // 1) 표: 이름칸 → 오른쪽 값칸, 머리줄 이름 → 아래 값칸
    blocks.forEach(function (b, bi) {
      if (!b.tbl) return;
      var t = b.tbl, near = (blocks[bi - 1] && blocks[bi - 1].p) || '', tt = t.map(function (r) { return r.join(' '); }).join(' ');
      var unit = unitIn(tt) || unitIn(near) || (/사업비|지원금|부담/.test(tt) ? docUnit : 0) || 1;
      if (unitIn(tt) || unitIn(near)) docUnit = unit;
      var moneyTable = /정부|지원금|출연금|보조금/.test(tt) && /현금|현물|부담/.test(tt);
      t.forEach(function (row, ri) {
        row.forEach(function (cell, ci) {
          var path = labelOf(cell);
          if (!path) {
            // 사업비 표의 「합계·계·총계」
            if (moneyTable && /^(합계|총계|계|총액)$/.test(key(cell))) path = '사업.사업비.총사업비';
            else return;
          }
          // 오른쪽 값
          for (var cj = ci + 1; cj < row.length; cj++) { if (clean(row[cj])) { if (!labelOf(row[cj])) value(path, row[cj], unit); break; } }
          // 아래 값 (머리줄 표: 이름칸 아래가 값)
          if (found[path] == null && !(path === '사업.사업기간' && found['사업.사업기간.시작'])) {
            for (var rj = ri + 1; rj < t.length; rj++) {
              var v = t[rj][ci];
              if (clean(v)) { if (!labelOf(v)) value(path, v, unit); break; }
            }
          }
        });
      });
      // 「사업비」 한 칸에 「정부지원금 21,000,000원, 자부담 현금 …」처럼 적은 경우
      t.forEach(function (row) { row.forEach(function (cell) { inline(cell, unit); }); });
    });

    // 2) 문단: 「이름 : 값」, 사업비 문장
    blocks.forEach(function (b) {
      if (b.p == null) return;
      clean(b.p).split('\n').forEach(function (line) {
        var m = /^(.{1,24}?)\s*[:：]\s*(.+)$/.exec(line.replace(/^[\s○●◦□■▶▷※\-*·ㆍ]+/, ''));
        if (m) { var path = labelOf(m[1]); if (path && !/^문장\./.test(path)) value(path, m[2], docUnit || 1); }
        inline(line, docUnit || 1);
      });
    });
    function inline(s, unit) {
      var v = clean(s);
      if (v.length > 300) return;
      var pairs = [['사업.사업비.정부지원금', /(?:정부\s*지원금|정부\s*출연금|국고\s*보조금|보조금|지원금)\s*[:：]?\s*([\d,]+(?:\.\d+)?\s*(?:백만원|천원|만원|원)?)/],
                   ['사업.사업비.자부담_현금', /(?:자부담|기업\s*부담금?|민간\s*부담금?)?\s*현금\s*[:：]?\s*([\d,]+(?:\.\d+)?\s*(?:백만원|천원|만원|원)?)/],
                   ['사업.사업비.자부담_현물', /(?:자부담|기업\s*부담금?|민간\s*부담금?)?\s*현물\s*[:：]?\s*([\d,]+(?:\.\d+)?\s*(?:백만원|천원|만원|원)?)/],
                   ['사업.사업비.총사업비', /(?:총\s*사업비|총)\s*[:：]?\s*([\d,]+(?:\.\d+)?\s*(?:백만원|천원|만원|원))/]];
      pairs.forEach(function (x) { var m = x[1].exec(v); if (m && /\d/.test(m[1])) value(x[0], m[1], unit); });
    }

    // 3) 사업자등록번호 · 사업기간은 표·이름이 없어도 문서 어디서든
    if (found['기업.사업자등록번호'] == null) { var bz = /\b\d{3}-\d{2}-\d{5}\b/.exec(text); if (bz) put('기업.사업자등록번호', bz[0]); }
    if (found['사업.사업기간.시작'] == null) {
      var pm = /(사업|수행|협약|개발)\s*기간[^\n]{0,8}?(20\d{2}[^\n]{4,40})/.exec(text);
      var d = pm && dates(pm[2]); if (d) { put('사업.사업기간.시작', d.시작); put('사업.사업기간.종료', d.종료); }
    }
    // 사업명: 이름칸이 없으면 첫머리 제목 「2026년 ○○ 지원사업 사업계획서」
    if (found['사업.사업명'] == null) {
      blocks.slice(0, 12).some(function (b) {
        var m = b.p != null && /^(.{4,60}?사업)\s*(?:\(?[^()]*\)?\s*)?(?:사업)?(?:계획서|신청서)/.exec(clean(b.p).split('\n')[0]);
        if (m) put('사업.사업명', m[1].replace(/\s*(지원)?과제$/, ''), 'title');
        return !!m;
      });
    }
    // 주관기관이 우리 회사 이름이면 전담기관이 아니므로 비움
    if (found['사업.주관기관'] && found['기업.기업명'] && key(found['사업.주관기관']) === key(found['기업.기업명'])) { delete found['사업.주관기관']; }
    // 총사업비가 없으면 합으로
    var gv = +found['사업.사업비.정부지원금'] || 0, ca = +found['사업.사업비.자부담_현금'] || 0, ki = +found['사업.사업비.자부담_현물'] || 0;
    if (found['사업.사업비.총사업비'] == null && gv) put('사업.사업비.총사업비', String(gv + ca + ki), 'sum');

    // 4) 목적·기대효과·향후계획: 제목 문단 다음의 글
    var SEC = [['문장.추진목적', /(추진|사업|개발|과제)?\s*(목적|배경\s*및\s*필요성|필요성)/], ['문장.기대효과', /기대\s*효과/], ['문장.향후계획', /(향후|사업화|활용|확산)\s*(계획|방안|전략)/]];
    var heading = function (s) { var c = clean(s); return c.length <= 40 && /^(\d+(\.\d+)*[.)]?|[IVXⅠ-Ⅹ]+[.)]|[가-하][.)]|제\s*\d+\s*[장절]|[□■◆◇▶▣])\s*\S/.test(c); };
    SEC.forEach(function (sec) {
      if (found[sec[0]] != null) return;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        if (b.p == null || clean(b.p).length > 40 || !sec[1].test(clean(b.p))) continue;
        var body = [];
        for (var j = i + 1; j < blocks.length && body.join(' ').length < 700; j++) {
          var x = blocks[j];
          if (x.p != null) { if (heading(x.p) && body.length) break; if (clean(x.p) && !heading(x.p)) body.push(clean(x.p).replace(/^[\s○●◦□■▶▷※\-*·ㆍ]+/, '')); }
          else if (x.tbl.length && x.tbl[0].length === 1) x.tbl.forEach(function (r) { if (clean(r[0])) body.push(clean(r[0])); });   // 상자 하나로 된 글
          else if (body.length) break;
        }
        if (body.length) { put(sec[0], body.join('\n').slice(0, 800), 'section'); break; }
      }
    });

    // 5) 세부과제 · 성과지표 표
    var tasks = [], kpis = [];
    blocks.forEach(function (b) {
      if (!b.tbl || b.tbl.length < 2) return;
      var t = b.tbl, hi = -1, col = {};
      for (var r = 0; r < Math.min(3, t.length) && hi < 0; r++) {
        var c = {};
        t[r].forEach(function (cell, ci) {
          var k = key(cell);
          if (!k || k.length > 14) return;
          if (/^(성과)?지표(명)?$|^성과지표|^평가(지표|항목)$|^정량지표|^목표지표$|^성과목표$/.test(k) && c.kpi == null) c.kpi = ci;
          else if ((/목표(치|값)?|최종목표/.test(k) || /^20\d{2}\s*년?$/.test(clean(cell))) && c.goal == null) c.goal = ci;
          else if (/^단위$/.test(k)) c.unit = ci;
          else if (/^(세부)?과제(명)?$|^세부과제|^개발과제|^추진과제/.test(k) && c.task == null) c.task = ci;
          else if (/(추진|개발|세부|주요|수행)(내용|방법)|^내용$/.test(k) && c.body == null) c.body = ci;
          else if (/^(번호|no|순번|구분)$/i.test(k) && c.no == null) c.no = ci;
        });
        if ((c.kpi != null && c.goal != null) || (c.task != null && (c.body != null || c.kpi != null))) { hi = r; col = c; }
      }
      if (hi < 0) return;
      for (var ri = hi + 1; ri < t.length; ri++) {
        var row = t[ri], g = function (i) { return i == null ? '' : clean(row[i] || ''); };
        if (col.kpi != null && g(col.kpi) && !labelOf(g(col.kpi))) {
          var goal = g(col.goal), m = /^([\d.,]+)\s*(.*)$/.exec(goal.replace(/^(목표|최종)\s*/, ''));
          kpis.push({ 과제: g(col.task), 지표: g(col.kpi).split('\n')[0], 목표: m ? m[1].replace(/,/g, '') : goal, 단위: g(col.unit) || (m ? m[2].trim() : '') });
        }
        if (col.task != null && g(col.task) && !/합계|소계|^계$/.test(g(col.task))) {
          var name = g(col.task).replace(/^(T\d+|\d+)[.)\s]*/, '').split('\n')[0], ex = tasks.filter(function (x) { return x.이름 === name; })[0];
          if (!ex) tasks.push(ex = { 이름: name, 내용: '' });
          if (col.body != null && g(col.body)) ex.내용 = clean((ex.내용 ? ex.내용 + '\n' : '') + g(col.body).replace(/^[\s○●◦□■▶▷※\-*·ㆍ]+/gm, ''));
        }
      }
    });
    // 표가 없으면 「T1. 과제명: 내용」, 「세부과제 1 : 과제명」 문단
    if (!tasks.length) blocks.forEach(function (b) {
      if (b.p == null) return;
      var m = /^\s*(?:T\s*(\d+)|세부\s*과제\s*(\d+))\s*[.)]?\s*[:：.]?\s*([^:：\n]{2,60})(?:[:：]\s*(.+))?$/.exec(clean(b.p));
      if (m) tasks.push({ 이름: clean(m[3]), 내용: clean(m[4] || '') });
    });
    var 과제목록 = tasks.map(function (x, i) { return { id: 'T' + (i + 1), 이름: x.이름, 내용: x.내용, 성과지표: [] }; });
    kpis.forEach(function (k) {
      var host = k.과제 && 과제목록.filter(function (x) { return x.이름 && (k.과제.indexOf(x.이름) >= 0 || x.이름.indexOf(k.과제) >= 0); })[0];
      if (!host && 과제목록.length === kpis.length) host = 과제목록[kpis.indexOf(k)];
      if (!host) { host = 과제목록.filter(function (x) { return !x.성과지표.length; })[0]; }
      if (!host) { host = { id: 'T' + (과제목록.length + 1), 이름: k.과제 || '', 내용: '', 성과지표: [] }; 과제목록.push(host); }
      host.성과지표.push({ 지표: k.지표, 목표: k.목표, 단위: k.단위 });
    });

    // 결과
    var project = { 사업: { 사업기간: {}, 사업비: {} }, 기업: {}, 문장: {}, 과제목록: 과제목록 };
    Object.keys(found).forEach(function (p) {
      var parts = p.split('.'), o = project;
      for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
      o[parts[parts.length - 1]] = found[p];
    });
    return { project: project, found: found, tasks: 과제목록.length, kpis: kpis.length };
  }

  return {
    read: read, extract: extract,
    parse: async function (file) { var r = await read(file); var x = extract(r.blocks); x.kind = r.kind; x.blocks = r.blocks; return x; },
  };
})();
