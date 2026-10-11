/* DI-IMS-F-01 양식 배치 엔진 (build_forms.py의 자바스크립트판).
 * 양식 내용(FORMS)은 forms_data.py에서 build_tool.py가 JSON으로 넣어 준다.
 * 브라우저에서는 전역 ExcelJS, node 테스트에서는 require('exceljs')를 쓴다. */
(function (root) {
  'use strict';

  var C = {
    FONT: 'Malgun Gothic', BLUE: '1857A5', INK: '263445', LINE: '8A9BB0',
    LABEL: 'E8EEF6', PRE: 'F4F6F9', WHITE: 'FFFFFF', EX: '7A8699', NEG: 'F8D7DA', WARN: 'FFF3CD'
  };
  var NEGATIVE = ['불합격', '보류', '부적합', '미흡', '미준수', '미확인', '실패', '사용금지', '중지·개선',
    '재교육·동행', 'C 발주중지', '중요', '미작성'];
  var TARGET_W = { landscape: 140, portrait: 95 };
  var PRINT_H = { landscape: 505, portrait: 750 };
  var SIDE = { style: 'thin', color: { argb: 'FF' + C.LINE } };
  var BOX = { top: SIDE, left: SIDE, bottom: SIDE, right: SIDE };
  var DEFAULT_SIGN = ['작성', '검토', '승인'];
  var ATTACH = '첨부·대체 기록 번호와 보관 경로 / 적용 제외(해당없음) 사유 / 미결 확인 :';

  function argb(c) { return 'FF' + c; }

  function units(text, size) {
    size = size || 10;
    var total = 0;
    var s = String(text);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var code = s.charCodeAt(i);
      if (code >= 0x1100) total += 1.7;
      else if (ch === ' ') total += 0.6;
      else total += 1.0;
    }
    return total * size / 10;
  }

  function nLines(text, width, size) {
    if (text === null || text === undefined || text === '') return 1;
    var usable = Math.max(width - 1.5, 3);
    return String(text).split('\n').reduce(function (acc, part) {
      return acc + Math.max(1, Math.ceil(units(part, size) / usable));
    }, 0);
  }

  function textHeight(text, width, size, minimum, pad) {
    size = size || 10; minimum = minimum === undefined ? 18 : minimum; pad = pad === undefined ? 6 : pad;
    return Math.max(minimum, nLines(text, width, size) * size * 1.35 + pad);
  }

  function colL(n) {
    var s = '';
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }

  function combinations(arr, k) {
    var out = [];
    (function rec(start, picked) {
      if (picked.length === k) { out.push(picked.slice()); return; }
      for (var i = start; i < arr.length; i++) { picked.push(arr[i]); rec(i + 1, picked); picked.pop(); }
    })(0, []);
    return out;
  }

  function docNo(code) { return 'DI-' + code; }

  function Sheet(wb, spec, opt) {
    this.spec = spec;
    this.opt = opt || {};
    this.orient = spec.orient || 'landscape';
    this.mode = spec.mode || 'single';
    this.ws = wb.addWorksheet(spec.sheet, { views: [{ showGridLines: false }] });
    var raw = spec.cols.map(function (c) { return c[1]; });
    var sum = raw.reduce(function (a, b) { return a + b; }, 0);
    var k = TARGET_W[this.orient] / sum;
    this.widths = raw.map(function (w) { return Math.round(w * k * 10) / 10; });
    this.n = this.widths.length;
    for (var i = 0; i < this.n; i++) this.ws.getColumn(i + 1).width = this.widths[i];
    this.row = 1;
    this.heights = {};
  }

  Sheet.prototype.width = function (c1, c2) {
    var s = 0;
    for (var i = c1; i <= c2; i++) s += this.widths[i - 1];
    return s;
  };

  Sheet.prototype.setH = function (r, h) {
    this.heights[r] = h;
    this.ws.getRow(r).height = h;
  };

  Sheet.prototype.cell = function (r, c1, c2, value, o) {
    o = o || {};
    c2 = c2 || c1;
    if (c2 > c1) this.ws.mergeCells(r, c1, r, c2);
    for (var c = c1; c <= c2; c++) {
      var x = this.ws.getCell(r, c);
      x.font = { name: C.FONT, size: o.size || 10, bold: !!o.bold, color: { argb: argb(o.color || C.INK) } };
      x.alignment = { horizontal: o.h || 'left', vertical: o.v || 'middle', wrapText: true };
      if (o.bg) x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(o.bg) } };
      if (o.border !== false) x.border = BOX;
      if (o.fmt) x.numFmt = o.fmt;
    }
    if (value !== null && value !== undefined && value !== '') {
      var m = this.ws.getCell(r, c1);
      m.value = (typeof value === 'string' && value.charAt(0) === '=') ? { formula: value.slice(1) } : value;
    }
    return this.ws.getCell(r, c1);
  };

  Sheet.prototype.dvList = function (addresses, options) {
    var rule = {
      type: 'list', allowBlank: true, formulae: ['"' + options.join(',') + '"'],
      showErrorMessage: true, errorStyle: 'warning', error: '목록에서 고르십시오: ' + options.join(', ')
    };
    var ws = this.ws;
    addresses.forEach(function (a) { ws.getCell(a).dataValidation = rule; });
  };

  Sheet.prototype.dvWhole = function (addresses, lo, hi) {
    var rule = {
      type: 'whole', operator: 'between', allowBlank: true, formulae: [lo, hi],
      showErrorMessage: true, error: lo + '~' + hi + ' 사이 정수를 입력하십시오.'
    };
    var ws = this.ws;
    addresses.forEach(function (a) { ws.getCell(a).dataValidation = rule; });
  };

  // ---------- 머리 ----------
  Sheet.prototype.header = function () {
    var s = this.spec;
    this.setH(1, 22);
    if (this.opt.logoId !== undefined) {
      this.ws.addImage(this.opt.logoId, { tl: { col: 0, row: 0 }, ext: { width: 95, height: 18 }, editAs: 'oneCell' });
    }
    this.setH(2, 28);
    this.cell(2, 1, this.n, s.title, { size: 16, bold: true, color: C.BLUE, border: false });
    var line = s.docLine || ('동인엔시스 | ' + docNo(s.code) + ' | Rev.' + this.opt.rev + ' | 제정 ' + this.opt.date + ' | 시행 ' + (this.opt.effective || this.opt.date) + ' (대표 승인)');
    if (s.owner) line += '   ·   담당: ' + s.owner + ' | 작성: ' + s.when;
    this.setH(3, textHeight(line, this.width(1, this.n), 9, 16, 2));
    this.cell(3, 1, this.n, line, { size: 9, border: false });
    this.row = 4;
  };

  Sheet.prototype.spanFor = function (c1, c2, label) {
    var need = Math.min(units(label, 9) + 1.5, 16);
    var end = c1;
    while (this.width(c1, end) < need && end < c2 - 1) end += 1;
    return end;
  };

  Sheet.prototype.score = function (groups, labels) {
    var total = 0, widths = [], self = this;
    groups.forEach(function (g, i) {
      var label = labels[i];
      var le = self.spanFor(g[0], g[1], label);
      var lw = self.width(g[0], le), vw = self.width(le + 1, g[1]);
      widths.push(lw + vw);
      total += Math.max(0, 18 - vw) * 3;
      total += Math.max(0, lw - (units(label, 9) + 8));
      total += (nLines(label, lw, 9) - 1) * 4;
    });
    var avg = widths.reduce(function (a, b) { return a + b; }, 0) / widths.length;
    total += widths.reduce(function (a, w) { return a + Math.abs(w - avg); }, 0) * 0.3;
    return total;
  };

  Sheet.prototype.groups = function (labels) {
    var k = labels.length, n = this.n;
    if (k === 1) return [[1, n]];
    var cutsPool = [];
    for (var i = 2; i < n; i++) cutsPool.push(i);
    var best = null, bestG = null, self = this;
    combinations(cutsPool, k - 1).forEach(function (cuts) {
      var bounds = [1].concat(cuts).concat([n + 1]);
      var g = [];
      for (var j = 0; j < k; j++) g.push([bounds[j], bounds[j + 1] - 1]);
      if (g.some(function (x) { return x[1] - x[0] < 1; })) return;
      var sc = self.score(g, labels);
      if (best === null || sc < best) { best = sc; bestG = g; }
    });
    return bestG;
  };

  Sheet.prototype.packedFields = function () {
    var per = (this.orient === 'landscape' && this.n >= 6) ? 3 : 2;
    if (per === 3) {
      var sample = ['프로젝트 번호', '프로젝트 번호', '프로젝트 번호'];
      var g = this.groups(sample), self = this;
      var narrow = Math.min.apply(null, g.map(function (x) {
        return self.width(self.spanFor(x[0], x[1], sample[0]) + 1, x[1]);
      }));
      if (narrow < 17) per = 2;
    }
    var out = [], buf = [];
    function flush() { while (buf.length) out.push(buf.splice(0, per)); }
    (this.spec.fields || []).forEach(function (frow) {
      if (frow.length === 1) { flush(); out.push(frow); } else { buf = buf.concat(frow); }
    });
    flush();
    return out;
  };

  Sheet.prototype.fields = function () {
    var rows = this.packedFields();
    if (!rows.length) return;
    this.setH(this.row, 4);
    this.row += 1;
    var values = this.opt.values || {};
    var self = this, ws = this.ws;
    rows.forEach(function (frow) {
      var groups = self.groups(frow.map(function (f) { return f[0]; }));
      var r = self.row, h = 20;
      groups.forEach(function (g, i) {
        var f = frow[i], label = f[0];
        var le = self.spanFor(g[0], g[1], label);
        self.cell(r, g[0], le, label, { size: 9, bg: C.LABEL });
        var val = values[label], fex = (self.spec.fieldExamples || {})[label];
        self.cell(r, le + 1, g[1], val === undefined ? null : val, { size: 10, bg: C.WHITE });
        if ((val === undefined || val === null || val === '') && fex) {
          var fc = ws.getCell(r, le + 1);
          fc.value = '예) ' + fex;
          fc.font = { name: C.FONT, size: 9, italic: true, color: { argb: argb(C.EX) } };
          val = fc.value;
        }
        if (f[1] && f[1].length) self.dvList([colL(le + 1) + r], f[1]);
        h = Math.max(h, textHeight(label, self.width(g[0], le), 9, 20, 4));
        if (val) h = Math.max(h, textHeight(val, self.width(le + 1, g[1]), 10, 20, 4));
      });
      self.setH(r, h);
      self.row += 1;
    });
  };

  Sheet.prototype.notes = function () {
    var ns = this.spec.notes || [];
    if (!ns.length) return;
    this.setH(this.row, 5);
    this.row += 1;
    var self = this, w = this.width(1, this.n);
    ns.forEach(function (t) {
      self.cell(self.row, 1, self.n, t, { size: 9, border: false });
      self.setH(self.row, textHeight(t, w, 9, 14, 2));
      self.row += 1;
    });
  };

  // ---------- 표 ----------
  Sheet.prototype.rowHeight = function (data, base) {
    var rh = base, self = this;
    data.forEach(function (v, i) {
      if (v !== null && v !== undefined && v !== '' && String(v).charAt(0) !== '=') {
        rh = Math.max(rh, textHeight(v, self.widths[i], 9.5, base, 6));
      }
    });
    return rh;
  };

  Sheet.prototype.blankRows = function (headerH, base, rows) {
    var minimum = this.spec.blank || 0;
    if (this.mode !== 'register') return minimum;
    var cap = PRINT_H[this.orient];
    var top = 0, self = this;
    Object.keys(this.heights).forEach(function (k) { top += self.heights[k]; });
    var pre = rows.reduce(function (a, d) { return a + self.rowHeight(d, base); }, 0);
    var tail = this.spec.sign === null ? 0 : 6 + 16 + 28 + 16;
    for (var k = 1; k < 50; k++) {
      var room = k * cap - (k - 1) * headerH - top - pre - tail;
      var n = Math.floor(room / base);
      if (n >= minimum) return Math.max(n - 1, minimum);
    }
    return minimum;
  };

  Sheet.prototype.table = function () {
    var s = this.spec, ws = this.ws, self = this;
    this.setH(this.row, 5);
    this.row += 1;
    var hr = this.row;
    this.headerRow = hr;
    var h = 26;
    s.cols.forEach(function (c, i) {
      self.cell(hr, i + 1, null, c[0], { size: 9.5, bold: true, color: C.WHITE, bg: C.BLUE, h: 'center' });
      h = Math.max(h, textHeight(c[0], self.widths[i], 9.5, 26, 6));
    });
    this.setH(hr, h);
    var first = hr + 1;
    var base = s.row_h || 24;
    var data = (s.rows || []).slice();
    var nBlank = this.blankRows(h, base, data);
    for (var b = 0; b < nBlank; b++) data.push([]);
    data.forEach(function (d, k) {
      var r = first + k, rh = base;
      for (var i = 1; i <= self.n; i++) {
        var v = d[i - 1];
        if (v === '' || v === undefined) v = null;
        var pre = v !== null && String(v).charAt(0) !== '=';
        self.cell(r, i, null, v, { size: 9.5, bg: pre ? C.PRE : C.WHITE, h: self.widths[i - 1] <= 7 ? 'center' : 'left' });
        if (pre) rh = Math.max(rh, textHeight(v, self.widths[i - 1], 9.5, base, 6));
      }
      self.setH(r, rh);
    });
    var last = first + data.length - 1;
    this.first = first; this.last = last;
    // 작성 예시: 지정한 행의 빈칸에 회색 기울임 '예)' 글을 넣는다(실제 기록 아님, 덮어써 작성)
    // ex.rows: 행마다 {열: 글} (원래 행 수만큼), ex.cells: ex.row 한 행
    var ex = s.example, exRows = ex ? (ex.rows || (ex.cells ? [] : null)) : null;
    if (ex && ex.cells && !ex.rows) exRows[ex.row || 0] = ex.cells;
    (exRows || []).forEach(function (cells, k) {
      if (!cells || k >= data.length) return;
      var er = first + k, erh = ws.getRow(er).height || base;
      Object.keys(cells).forEach(function (col) {
        var c = ws.getCell(er, +col), t = cells[col];
        if (!t || (c.value !== null && c.value !== undefined && c.value !== '') || (s.formulas || {})[col]) return;
        c.value = '예) ' + t;
        c.font = { name: C.FONT, size: 9, italic: true, color: { argb: argb(C.EX) } };
        erh = Math.max(erh, textHeight(c.value, self.widths[+col - 1], 9, base, 6));
      });
      self.setH(er, erh);
    });
    function colCells(col) {
      var out = [];
      for (var r = first; r <= last; r++) out.push(colL(col) + r);
      return out;
    }
    var formulas = s.formulas || {};
    Object.keys(formulas).forEach(function (col) {
      for (var r = first; r <= last; r++) {
        var c = ws.getCell(r, +col);
        c.value = { formula: formulas[col].replace(/\{r\}/g, r).replace(/^=/, '') };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.PRE) } };
      }
    });
    var formats = s.formats || {};
    Object.keys(formats).forEach(function (col) {
      for (var r = first; r <= last; r++) ws.getCell(r, +col).numFmt = formats[col];
    });
    var dv = s.dv || {};
    Object.keys(dv).forEach(function (col) {
      var opts = dv[col];
      if (Array.isArray(opts)) self.dvList(colCells(+col), opts);
      else self.dvWhole(colCells(+col), opts.whole[0], opts.whole[1]);
      for (var r = first; r <= last; r++) {
        ws.getCell(r, +col).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
    });
    var negCols = Object.keys(dv).concat(Object.keys(formulas));
    var seen = {};
    negCols.forEach(function (col) {
      if (seen[col]) return;
      seen[col] = 1;
      var L = colL(+col);
      var cond = 'OR(' + NEGATIVE.map(function (w) { return L + first + '="' + w + '"'; }).join(',') + ')';
      ws.addConditionalFormatting({
        ref: L + first + ':' + L + last,
        rules: [{ type: 'expression', priority: 1, formulae: [cond],
          style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: argb(C.NEG) } } } }]
      });
    });
    var risk = s.risk_cf || {};
    Object.keys(risk).forEach(function (col) {
      var L = colL(+col), red = risk[col][0], yellow = risk[col][1];
      ws.addConditionalFormatting({
        ref: L + first + ':' + L + last,
        rules: [
          { type: 'expression', priority: 1, formulae: ['AND(ISNUMBER(' + L + first + '),' + L + first + '>=' + red + ')'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: argb(C.NEG) } } } },
          { type: 'expression', priority: 2, formulae: ['AND(ISNUMBER(' + L + first + '),' + L + first + '>=' + yellow + ')'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: argb(C.WARN) } } } }]
      });
    });
    (s.due_cf || []).forEach(function (col) {
      var L = colL(+col);
      ws.addConditionalFormatting({
        ref: L + first + ':' + L + last,
        rules: [
          { type: 'expression', priority: 1, formulae: ['AND(ISNUMBER(' + L + first + '),' + L + first + '<TODAY())'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: argb(C.NEG) } } } },
          { type: 'expression', priority: 2, formulae: ['AND(ISNUMBER(' + L + first + '),' + L + first + '<TODAY()+30)'],
            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: argb(C.WARN) } } } }]
      });
    });
    this.row = last + 1;
  };

  // ---------- 결재란 ----------
  /** 결재란 성명: '검토(품질)'처럼 괄호가 붙은 구분도 '검토'로 찾는다. 서명·일자는 비워 둔다. */
  function signName(names, label) {
    if (!names) return null;
    var v = names[label] || names[String(label).replace(/\s*\(.*\)$/, '')];
    return v ? String(v) : null;
  }

  Sheet.prototype.sign = function () {
    var labels = this.spec.sign === undefined ? DEFAULT_SIGN : this.spec.sign;
    if (labels === null) return;
    var ws = this.ws, self = this;
    this.setH(this.row, 6);
    this.row += 1;
    var r = this.row;
    var groups = [], c = this.n;
    while (groups.length < 4 && c >= 1) {
      var end = c;
      while (this.width(c, end) < 10 && c > 1) c -= 1;
      groups.push([c, end]);
      c -= 1;
    }
    groups.reverse();
    var leftEnd = groups[0][0] - 1;
    if (leftEnd >= 1 && this.width(1, leftEnd) < 24) {
      this.cell(r, 1, this.n, ATTACH, { size: 9, bg: C.WHITE, v: 'top' });
      this.setH(r, 30);
      r += 1;
      groups[0] = [1, groups[0][1]];
      leftEnd = 0;
    }
    var heads = ['구분'].concat(labels);
    var spec = [['', 16], ['성명·서명', 28], ['일자', 16]];
    spec.forEach(function (row, k) {
      var rr = r + k;
      self.setH(rr, row[1]);
      groups.forEach(function (g, j) {
        if (k === 0) self.cell(rr, g[0], g[1], heads[j], { size: 9, bold: true, bg: C.LABEL, h: 'center' });
        else if (j === 0) self.cell(rr, g[0], g[1], row[0], { size: 9, bg: C.LABEL, h: 'center' });
        else self.cell(rr, g[0], g[1], k === 1 ? signName(self.opt.signNames, heads[j]) : null, { size: 10, bg: C.WHITE, h: 'center' });
      });
    });
    if (leftEnd >= 1) {
      ws.mergeCells(r, 1, r + 2, leftEnd);
      for (var rr = r; rr < r + 3; rr++) {
        for (var cc = 1; cc <= leftEnd; cc++) {
          var x = ws.getCell(rr, cc);
          x.border = BOX;
          x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.WHITE) } };
        }
      }
      var m = ws.getCell(r, 1);
      m.value = ATTACH;
      m.font = { name: C.FONT, size: 9, color: { argb: argb(C.INK) } };
      m.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    }
    this.row = r + 3;
  };

  // ---------- 인쇄 ----------
  Sheet.prototype.page = function () {
    var s = this.spec, ws = this.ws;
    var setup = {
      paperSize: 9, orientation: this.orient, fitToPage: true, fitToWidth: 1,
      fitToHeight: this.mode === 'single' ? 1 : 0, horizontalCentered: true,
      margins: { left: 0.45, right: 0.45, top: 0.5, bottom: 0.55, header: 0.25, footer: 0.25 },
      printArea: 'A1:' + colL(this.n) + (this.row - 1)
    };
    if (this.mode !== 'single' && this.headerRow) {
      setup.printTitlesRow = this.headerRow + ':' + this.headerRow;
      ws.views = [{ state: 'frozen', ySplit: this.headerRow, showGridLines: false }];
    }
    ws.pageSetup = setup;
    var foot = s.footer || (docNo(s.code) + ' Rev.' + this.opt.rev);
    ws.headerFooter = { oddFooter: '&C&"Malgun Gothic,Regular"&8동인엔시스 | ' + foot + ' | 페이지 &P / 전체 &N' };
  };

  Sheet.prototype.build = function () {
    this.header();
    this.fields();
    this.notes();
    if (this.spec.rows !== undefined || this.spec.blank) this.table();
    this.sign();
    this.page();
    return this;
  };

  /** 양식 한 장짜리 엑셀 파일(ArrayBuffer)을 만든다.
   *  spec: FORMS의 양식 정의(복사본에 rows 등을 덮어써도 된다)
   *  opt: {values: {항목명: 값}, rev, date, logo(base64 PNG)} */
  function buildWorkbook(ExcelJS, specs, opt) {
    var wb = new ExcelJS.Workbook();
    wb.creator = '동인엔시스';
    var logoId;
    if (opt.logo) logoId = wb.addImage({ base64: opt.logo, extension: 'png' });
    specs.forEach(function (spec, i) {
      var o = Object.assign({}, opt, { logoId: logoId, values: (opt.valuesList ? opt.valuesList[i] : opt.values) });
      new Sheet(wb, spec, o).build();
    });
    return wb;
  }

  var api = { Sheet: Sheet, buildWorkbook: buildWorkbook, units: units, textHeight: textHeight, colL: colL, C: C };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IsoEngine = api;
})(this);
