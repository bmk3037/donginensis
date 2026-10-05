// 동인엔시스 문서서식(통합경영 매뉴얼 DI-IMS-M-01 기준) 공통 생성기
// 사용: node <문서>.js [글꼴] [출력.docx]  — Word 원본은 'Malgun Gothic', PDF용은 'Pretendard'
const fs = require('fs');
const path = require('path');
const docx = require('docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, WidthType, ShadingType, BorderStyle, PageNumber,
  LevelFormat, HeadingLevel, PageBreak, VerticalAlign,
} = docx;

const FONT = process.argv[2] || 'Malgun Gothic';
const BLUE = '1857A5', RED = 'E83E30', INK = '263445', GRAY = '6B7686', ROW = 'F0F5FB', LINE = 'C9D3E0';
const W = 9638; // 본문 폭(DXA): A4 11906 - 좌우 1134
const LOGO = fs.readFileSync(path.join(__dirname, '..', 'iso', 'logo.png'));

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, color: o.color || INK, italics: o.italics });
const para = (children, o = {}) => new Paragraph({
  children: (Array.isArray(children) ? children : [children]).map(c => typeof c === 'string' ? run(c) : c),
  alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 100, line: o.line ?? 300 },
  indent: o.indent, border: o.border, numbering: o.numbering, keepNext: o.keepNext,
});
const p = (t, o) => para(t, o);
const bullet = (t, lvl = 0) => para(t, { numbering: { reference: 'dot', level: lvl }, after: 40 });
const h1 = (t, brk) => new Paragraph({
  heading: HeadingLevel.HEADING_1, keepNext: true, pageBreakBefore: !!brk,
  spacing: { before: 320, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
  children: [new TextRun({ text: t, font: FONT, size: 26, bold: true, color: BLUE })],
});
const h2 = t => new Paragraph({
  heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 220, after: 80 },
  children: [new TextRun({ text: t, font: FONT, size: 22, bold: true, color: INK })],
});
const label = t => para([run(t, { bold: true, color: BLUE })], { after: 40, keepNext: true });

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (content, width, o = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA }, borders, verticalAlign: o.valign || VerticalAlign.CENTER,
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  columnSpan: o.span,
  margins: { top: 70, bottom: 70, left: 110, right: 110 },
  children: (Array.isArray(content) ? content : [content]).map(c =>
    c instanceof Paragraph ? c : para([run(c, { bold: o.bold, color: o.color, size: o.size || 19 })], { align: o.align, after: 0, line: 276 })),
});
// 머리행(파랑) + 줄무늬 행
const table = (widths, head, rows, o = {}) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: widths,
  rows: [
    ...(head ? [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { fill: BLUE, color: 'FFFFFF', bold: true, align: AlignmentType.CENTER })) })] : []),
    ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], {
      fill: o.keyCol && i === 0 ? ROW : (ri % 2 === 1 && !o.keyCol ? ROW : undefined),
      bold: o.keyCol && i === 0, align: o.center && o.center.includes(i) ? AlignmentType.CENTER : undefined,
      valign: VerticalAlign.TOP,
    })) })),
  ],
});
const cellList = items => items.map(t => para(t, { numbering: { reference: 'dot', level: 0 }, after: 0, line: 276 }));
const gap = (after = 120) => para('', { after });

// STEP 표: 주요 업무 | 산출물
const stepTable = (works, outs) => table([W / 2, W / 2], ['주요 업무', '산출물'],
  [[cellList(works), outs ? cellList(outs) : [p('—', { after: 0 })]]]);

// 아키텍처 흐름 상자
const flowBox = (title, sub, strong) => new TableRow({ cantSplit: true, children: [new TableCell({
  width: { size: 6400, type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: strong ? 12 : 4, color: BLUE }, bottom: { style: BorderStyle.SINGLE, size: strong ? 12 : 4, color: BLUE }, left: { style: BorderStyle.SINGLE, size: strong ? 12 : 4, color: BLUE }, right: { style: BorderStyle.SINGLE, size: strong ? 12 : 4, color: BLUE } },
  shading: { fill: strong ? 'E3EDF8' : 'FFFFFF', type: ShadingType.CLEAR, color: 'auto' },
  margins: { top: 90, bottom: 90, left: 120, right: 120 },
  children: [
    para([run(title, { bold: true, color: strong ? BLUE : INK, size: 20 })], { align: AlignmentType.CENTER, after: sub ? 20 : 0, line: 276, keepNext: true }),
    ...(sub ? [para([run(sub, { color: GRAY, size: 18 })], { align: AlignmentType.CENTER, after: 0, line: 276, keepNext: true })] : []),
  ],
})] });
const arrowRow = t => new TableRow({ cantSplit: true, children: [new TableCell({
  width: { size: 6400, type: WidthType.DXA },
  borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
  margins: { top: 10, bottom: 10, left: 0, right: 0 },
  children: [para([run('▼', { color: BLUE, size: 16 }), ...(t ? [run('   ' + t, { color: GRAY, size: 17 })] : [])], { align: AlignmentType.CENTER, after: 0, line: 240, keepNext: true })],
})] });

module.exports = (meta, content) => {
  const { DOC_NO, REV, TITLE } = meta;
  const OUT = process.argv[3] || `${DOC_NO}_${REV.replace('.', '')}.docx`;
  const H = { ...docx, FONT, BLUE, RED, INK, GRAY, ROW, LINE, W, LOGO, DOC_NO, REV, TITLE, run, para, p, bullet, h1, h2, label, border, borders, cell, table, cellList, gap, stepTable, flowBox, arrowRow };
  const { cover, body } = content(H);
  const doc = new Document({
    creator: '㈜동인엔시스', title: TITLE,
    styles: { default: { document: { run: { font: FONT, size: 20, color: INK } } } },
    numbering: { config: [{ reference: 'dot', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1020, left: 1134, header: 708, footer: 708 } } },
      headers: { default: new Header({ children: [para([run(`${TITLE} | ${DOC_NO} ${REV}`, { size: 16, color: GRAY })], { align: AlignmentType.RIGHT, after: 0 })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        run(`동인엔시스 | ${DOC_NO} ${REV} | 페이지 `, { size: 18, color: GRAY }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: GRAY }),
        run(' / 전체 ', { size: 18, color: GRAY }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: GRAY }),
      ] })] }) },
      children: [...cover, ...body],
    }],
  });
  
  return Packer.toBuffer(doc).then(b => { fs.writeFileSync(OUT, b); console.log('wrote', OUT); });
  
};
