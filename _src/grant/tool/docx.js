/* 워드(DOCX) 만들기·채우기 — 브라우저 안에서만.
   1) 회사 서식 문서: 통합경영 매뉴얼(DI-IMS-M-01)에서 본문만 비운 틀(window.GRANT_TEMPLATE, base64)에
      본문 XML 을 넣는다. 스타일 id: 제목 1 = "1", 제목 2 = "2", 표지 제목 = "a3", 글머리표 문단 = "a4"(numId 2).
   2) 기관 양식 채우기: 표에서 라벨 칸을 찾아 오른쪽(또는 아래) 칸에 값을 쓰고, "년 월 일" 빈칸을 날짜로 바꾼다. */
(function () {
  'use strict';

  var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var INK = '263445', HEAD = '1857A5', ZEBRA = 'F0F5FB', LINE = 'D3DDE8', MUTED = '5A6577';
  var CONTENT_TW = 9638;            // 본문 폭(twip) = A4 210mm - 좌우 20mm
  var EMU_PER_MM = 36000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function rpr(o) {
    o = o || {};
    var x = '<w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/>';
    if (o.bold) x += '<w:b/><w:bCs/>';
    if (o.color !== null) x += '<w:color w:val="' + (o.color || INK) + '"/>';
    x += '<w:sz w:val="' + Math.round((o.size || 10.5) * 2) + '"/>';
    if (o.highlight) x += '<w:highlight w:val="yellow"/>';
    return '<w:rPr>' + x + '</w:rPr>';
  }
  function runs(text, o) {
    return String(text == null ? '' : text).split('\n').map(function (line, i) {
      return (i ? '<w:r>' + rpr(o) + '<w:br/></w:r>' : '') + '<w:r>' + rpr(o) + '<w:t xml:space="preserve">' + esc(line) + '</w:t></w:r>';
    }).join('');
  }
  function ppr(o) {
    o = o || {};
    var x = '';
    if (o.style) x += '<w:pStyle w:val="' + o.style + '"/>';
    if (o.keepNext) x += '<w:keepNext/>';
    if (o.num) x += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>';
    if (o.rule) x += '<w:pBdr><w:bottom w:val="single" w:sz="24" w:space="1" w:color="E83E30"/></w:pBdr>';
    x += '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 100 : o.after) + '" w:line="276" w:lineRule="auto"/>';
    if (o.indent) x += '<w:ind w:left="' + o.indent + '" w:right="' + o.indent + '"/>';
    if (o.align) x += '<w:jc w:val="' + o.align + '"/>';
    return '<w:pPr>' + x + '</w:pPr>';
  }
  function cellXml(text, o) {
    o = o || {};
    var tc = '<w:tcPr><w:tcW w:w="' + o.w + '" w:type="dxa"/>'
      + (o.span > 1 ? '<w:gridSpan w:val="' + o.span + '"/>' : '')
      + '<w:tcBorders><w:top w:val="single" w:sz="6" w:color="' + LINE + '"/><w:left w:val="single" w:sz="6" w:color="' + LINE + '"/>'
      + '<w:bottom w:val="single" w:sz="6" w:color="' + LINE + '"/><w:right w:val="single" w:sz="6" w:color="' + LINE + '"/></w:tcBorders>'
      + '<w:shd w:val="clear" w:color="auto" w:fill="' + (o.fill || 'FFFFFF') + '"/>'
      + '<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar>'
      + '<w:vAlign w:val="center"/></w:tcPr>';
    var body = o.raw != null ? o.raw
      : '<w:p>' + ppr({ after: 0, align: o.align }) + runs(text, { size: 9.5, bold: o.bold, color: o.head ? 'FFFFFF' : INK }) + '</w:p>';
    return '<w:tc>' + tc + body + '</w:tc>';
  }

  /* ---------------------------------------------------------------- 회사 서식 문서 */

  function Doc(title) {
    this.title = title || '';
    this.body = [];
    this.media = [];          // {name, data(Uint8Array), rid}
    this.picId = 10;
    this.photoNo = 0;
  }
  Doc.prototype.p = function (text, o) { o = o || {}; this.body.push('<w:p>' + ppr(o) + runs(text, o) + '</w:p>'); };
  Doc.prototype.heading = function (text, level) {
    this.body.push('<w:p>' + ppr({ style: level === 2 ? '2' : '1', keepNext: true, after: level === 2 ? 100 : 160 }) + '<w:r><w:t xml:space="preserve">' + esc(text) + '</w:t></w:r></w:p>');
  };
  Doc.prototype.para = function (text) {
    var self = this;
    String(text || '').split(/\n\s*\n/).forEach(function (chunk) { if (chunk.trim()) self.p(chunk.trim()); });
  };
  Doc.prototype.note = function (text) { this.p(text, { highlight: true }); };
  Doc.prototype.bullets = function (items) {
    var self = this;
    items.forEach(function (it) {
      if (String(it).trim()) self.body.push('<w:p>' + ppr({ style: 'a4', num: true }) + runs(it, { color: null }) + '</w:p>');
    });
  };
  Doc.prototype.pageBreak = function () { this.body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>'); };
  Doc.prototype.table = function (spec) {
    var head = spec.head || [], rows = spec.rows || [];
    var n = head.length || (rows[0] ? rows[0].length : 0);
    if (!n) return;
    var widths = spec.widths && spec.widths.length === n ? spec.widths : head.map(function () { return 1; });
    var sum = widths.reduce(function (a, b) { return a + b; }, 0);
    var tw = widths.map(function (w) { return Math.round(CONTENT_TW * w / sum); });
    var x = '<w:tbl><w:tblPr><w:tblW w:w="' + CONTENT_TW + '" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>'
      + tw.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>';
    if (head.length) {
      x += '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>'
        + head.map(function (h, j) { return cellXml(h, { w: tw[j], fill: HEAD, head: true, bold: true, align: 'center' }); }).join('') + '</w:tr>';
    }
    rows.forEach(function (row, i) {
      var total = spec.total && i === rows.length - 1;
      var fill = (spec.zebra !== false && i % 2 === 1) || total ? ZEBRA : 'FFFFFF';
      x += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + tw.map(function (w, j) {
        var v = row[j] == null ? '' : row[j];
        var num = typeof v === 'number' || /^-?[\d,]+(\.\d+)?\s*(%|원)?$/.test(String(v).trim());
        if (typeof v === 'number') v = v.toLocaleString('ko-KR');
        return cellXml(v, { w: w, fill: fill, bold: total, align: spec.center ? 'center' : (num ? 'right' : null) });
      }).join('') + '</w:tr>';
    });
    x += '</w:tbl>';
    this.body.push(x);
    if (spec.note) this.p(spec.note, { size: 9, color: MUTED, before: 60, after: 60 });
    else this.body.push('<w:p>' + ppr({ after: 60 }) + '</w:p>');
  };
  Doc.prototype.addImage = function (bytes, ext) {
    var name = 'grant' + (this.media.length + 1) + '.' + ext;
    var rid = 'rIdG' + (this.media.length + 1);
    this.media.push({ name: name, data: bytes, rid: rid });
    return rid;
  };
  Doc.prototype.imageRun = function (rid, wmm, hmm) {
    var cx = Math.round(wmm * EMU_PER_MM), cy = Math.round(hmm * EMU_PER_MM), id = ++this.picId;
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/>'
      + '<wp:docPr id="' + id + '" name="그림 ' + id + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
      + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + id + '" name="img' + id + '"/><pic:cNvPicPr/></pic:nvPicPr>'
      + '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
      + '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
      + '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  };
  /* photos: [{bytes(Uint8Array jpeg), w, h, caption}] — 한 줄에 perRow 장, 사진 칸 + 설명 칸 */
  Doc.prototype.photos = function (photos, perRow) {
    perRow = perRow || 2;
    if (!photos.length) return;
    var cellTw = Math.floor(CONTENT_TW / perRow), cellMm = cellTw / 56.7;
    for (var s = 0; s < photos.length; s += perRow) {
      var chunk = photos.slice(s, s + perRow);
      var x = '<w:tbl><w:tblPr><w:tblW w:w="' + CONTENT_TW + '" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>';
      for (var j = 0; j < perRow; j++) x += '<w:gridCol w:w="' + cellTw + '"/>';
      x += '</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>';
      var caps = '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
      for (j = 0; j < perRow; j++) {
        var ph = chunk[j];
        if (!ph) { x += cellXml('', { w: cellTw }); caps += cellXml('', { w: cellTw, fill: ZEBRA }); continue; }
        var inner = cellMm - 5, boxH = inner * 0.75;
        var pw = ph.w / ph.h >= inner / boxH ? inner : boxH * ph.w / ph.h;
        var rid = this.addImage(ph.bytes, 'jpeg');
        x += cellXml('', { w: cellTw, raw: '<w:p>' + ppr({ after: 0, align: 'center' }) + this.imageRun(rid, pw, pw * ph.h / ph.w) + '</w:p>' });
        this.photoNo += 1;
        caps += cellXml('[사진 ' + this.photoNo + '] ' + ph.caption, { w: cellTw, fill: ZEBRA, align: 'center' });
      }
      this.body.push(x + '</w:tr>' + caps + '</w:tr></w:tbl>');
      this.body.push('<w:p>' + ppr({ after: 60 }) + '</w:p>');
    }
  };
  /* 매뉴얼 표지와 같은 배치: 로고 → 제목 → 빨간 선 → 부제 → 항목 표 → 결재란 → 날짜 */
  Doc.prototype.cover = function (c) {
    this.body.push('<w:p>' + ppr({ before: 2200, align: 'center' }) + this.imageRun('rId7', 95.25, 18.52) + '</w:p>');
    this.body.push('<w:p>' + ppr({ style: 'a3', align: 'center' }) + runs(c.title, { size: 20, bold: true }) + '</w:p>');
    this.body.push('<w:p>' + ppr({ rule: true, indent: 2800 }) + '</w:p>');
    var self = this;
    (c.subtitles || []).forEach(function (s) { if (s) self.p(s, { align: 'center' }); });
    this.p('');
    if (c.items && c.items.length) this.table({ head: ['항목', '내용'], rows: c.items, widths: [40, 130] });
    var sign = c.sign || {};
    var roles = ['작성', '검토', '승인'].filter(function (r) { return (sign[r] || '').trim(); });
    if (roles.length) {
      this.table({ head: ['구분'].concat(roles), rows: [['담당'].concat(roles.map(function (r) { return sign[r]; })),
        ['서명'].concat(roles.map(function () { return ''; })), ['일자'].concat(roles.map(function () { return ''; }))],
        widths: [25].concat(roles.map(function () { return 145 / roles.length; })), center: true, zebra: false });
    }
    if (c.date) { this.p(''); this.p(''); this.p(c.date, { align: 'center', size: 11 }); }
    this.pageBreak();
  };

  function b64ToBytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  Doc.prototype.toBlob = async function () {
    var zip = await JSZip.loadAsync(b64ToBytes(window.GRANT_TEMPLATE));
    var docXml = await zip.file('word/document.xml').async('string');
    docXml = docXml.replace('<w:body>', '<w:body>' + this.body.join(''));
    zip.file('word/document.xml', docXml);
    // 머리말: "문서명", 꼬리말: "동인엔시스 | 문서명 | 페이지 N / 전체 M"
    var hdr = await zip.file('word/header1.xml').async('string');
    zip.file('word/header1.xml', hdr.replace(/(<w:t[^>]*>)[^<]*(<\/w:t>)/, '$1 ' + esc(this.title) + '$2'));
    var ftr = await zip.file('word/footer1.xml').async('string');
    zip.file('word/footer1.xml', ftr.replace(/(<w:t[^>]*>)[^<]*(<\/w:t>)/, '$1동인엔시스 | ' + esc(this.title) + ' | 페이지 $2'));
    if (this.media.length) {
      var rels = await zip.file('word/_rels/document.xml.rels').async('string');
      var add = this.media.map(function (m) {
        zip.file('word/media/' + m.name, m.data);
        return '<Relationship Id="' + m.rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>';
      }).join('');
      zip.file('word/_rels/document.xml.rels', rels.replace('</Relationships>', add + '</Relationships>'));
      var ct = await zip.file('[Content_Types].xml').async('string');
      if (ct.indexOf('Extension="jpeg"') < 0) ct = ct.replace('<Default ', '<Default Extension="jpeg" ContentType="image/jpeg"/><Default ');
      zip.file('[Content_Types].xml', ct);
    }
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  };

  /* ---------------------------------------------------------------- 기관 양식 채우기 */

  function norm(s) { return String(s || '').replace(/[\s:：*·ㆍ　()（）]/g, ''); }
  function wq(el, name) { return Array.prototype.filter.call(el.childNodes, function (c) { return c.namespaceURI === W && c.localName === name; }); }
  function textOf(el) {
    var t = [];
    Array.prototype.forEach.call(el.getElementsByTagNameNS(W, 't'), function (n) { t.push(n.textContent); });
    return t.join('');
  }
  function tableGrid(tbl) {
    var rows = [];
    wq(tbl, 'tr').forEach(function (tr) {
      var cells = [];
      wq(tr, 'tc').forEach(function (tc) {
        var pr = wq(tc, 'tcPr')[0];
        var vm = pr && wq(pr, 'vMerge')[0];
        cells.push({ el: tc, text: textOf(tc).trim(), cont: !!(vm && vm.getAttributeNS(W, 'val') !== 'restart') });
      });
      rows.push(cells);
    });
    return rows;
  }

  async function openForm(file) {
    var zip = await JSZip.loadAsync(await file.arrayBuffer());
    var xml = await zip.file('word/document.xml').async('string');
    var dom = new DOMParser().parseFromString(xml, 'application/xml');
    return { name: file.name, zip: zip, dom: dom };
  }

  /* 빈칸 후보: 라벨 칸(30자 이하) 오른쪽 칸이 비었으면 right, 아니면 바로 아래 칸이 비었으면 down */
  function scanForm(form) {
    var out = [], seen = {};
    Array.prototype.forEach.call(form.dom.getElementsByTagNameNS(W, 'tbl'), function (tbl, ti) {
      var g = tableGrid(tbl);
      g.forEach(function (row, r) {
        row.forEach(function (cell, c) {
          if (!cell.text || cell.text.length > 30 || cell.cont) return;
          var right = row[c + 1], below = g[r + 1] && g[r + 1][c];
          var dir = right && !right.text ? 'right' : (below && !below.text && !below.cont ? 'down' : null);
          if (!dir) return;
          var key = norm(cell.text);
          seen[key] = (seen[key] || 0) + 1;
          out.push({ label: cell.text, key: key, nth: seen[key], dir: dir, table: ti, row: r, col: c });
        });
      });
    });
    var body = textOf(form.dom.documentElement);
    var dates = body.match(/(\d{4}|\s{2,})\s*년\s{2,}월\s{2,}일/g) || [];
    return { blanks: out, dates: dates.filter(function (d, i) { return dates.indexOf(d) === i; }) };
  }

  function setCellText(tc, value) {
    var ps = wq(tc, 'p');
    var first = ps[0];
    var sampleR = first && first.getElementsByTagNameNS(W, 'r')[0];
    var rPr = sampleR && wq(sampleR, 'rPr')[0];
    for (var i = 1; i < ps.length; i++) tc.removeChild(ps[i]);
    Array.prototype.slice.call(first.childNodes).forEach(function (n) { if (!(n.namespaceURI === W && n.localName === 'pPr')) first.removeChild(n); });
    var doc = tc.ownerDocument;
    String(value).split('\n').forEach(function (line, k) {
      var p = first;
      if (k) { p = first.cloneNode(false); var pp = wq(first, 'pPr')[0]; if (pp) p.appendChild(pp.cloneNode(true)); tc.appendChild(p); }
      var r = doc.createElementNS(W, 'w:r');
      if (rPr) r.appendChild(rPr.cloneNode(true));
      var t = doc.createElementNS(W, 'w:t');
      t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
      t.textContent = line;
      r.appendChild(t);
      p.appendChild(r);
    });
  }

  /* fills: [{table,row,col,dir,value}], replaces: [{from,to}] → {blob, applied, failed} */
  async function fillForm(form, fills, replaces) {
    var applied = 0, failed = [];
    var tbls = form.dom.getElementsByTagNameNS(W, 'tbl');
    fills.forEach(function (f) {
      var g = tableGrid(tbls[f.table]);
      var row = g[f.row], target = f.dir === 'down' ? g[f.row + 1] && g[f.row + 1][f.col] : row && row[f.col + 1];
      if (!target) { failed.push(f.label + ': 칸을 찾지 못함'); return; }
      setCellText(target.el, f.value);
      applied++;
    });
    (replaces || []).forEach(function (rp) {
      var n = 0;
      Array.prototype.forEach.call(form.dom.getElementsByTagNameNS(W, 'p'), function (p) {
        var rs = p.getElementsByTagNameNS(W, 'r'), txt = textOf(p);
        if (txt.indexOf(rp.from) < 0 || !rs.length) return;
        var ts = p.getElementsByTagNameNS(W, 't');
        ts[0].textContent = txt.split(rp.from).join(rp.to);
        ts[0].setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
        for (var i = ts.length - 1; i > 0; i--) ts[i].parentNode.removeChild(ts[i]);
        n++;
      });
      if (n) applied++; else failed.push('"' + rp.from.trim() + '" 문장을 찾지 못함');
    });
    form.zip.file('word/document.xml', new XMLSerializer().serializeToString(form.dom));
    var blob = await form.zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return { blob: blob, applied: applied, failed: failed };
  }

  window.GrantDocx = { Doc: Doc, openForm: openForm, scanForm: scanForm, fillForm: fillForm, norm: norm };
})();
