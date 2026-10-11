const assert = require('node:assert/strict');
const P = require('./project.js');
const catalog = require('./dist/forms.json');
const rows = [['품명', '모델', '수량'], ['외함', 'BOX', 1]];
const det = P.detectColumns(rows, 'bom');
const bom = {kind: 'bom', fileName: 'BOM.xlsx', sample: false, rows, det, items: P.parseBom(rows, det)};
const saved = {format: 'DI-ISO-PROJECT', version: 1, bomBasis: 'perPanel', state: {
  project: {pj: 'ORDER-A', customer: '가상 고객'}, panels: [{tag: 'P-01', desc: '', serial: 'A-01'}],
  bom, io: null, std: null, sample: false
}};
function restore(value) { return P.readProject(JSON.stringify(value)); }
assert.equal(restore(saved).state.bom.items[0].model, 'BOX');
const stale = JSON.parse(JSON.stringify(saved));
stale.state.bom.items[0].model = 'STALE';
stale.state.bom.items[0].major = false;
assert.equal(restore(stale).state.bom.items[0].model, 'BOX');
assert.equal(restore(stale).state.bom.items[0].major, false);
for (const bad of [
  {...bom, rows: [null]}, {...bom, det: {headerRow: 0}},
  {...bom, det: {headerRow: 0, map: {qty: 99}}}, {...bom, wb: {}}, {...bom, kind: 'io'}
]) assert.throws(() => restore({...saved, state: {...saved.state, bom: bad}}));
assert.throws(() => restore({...saved, state: {...saved.state, project: {pj: {}}}}));
for (const count of [1, 3, 7]) {
  const p = {pj: 'ORDER-' + count, panels: Array.from({length: count}, (_, i) => ({tag: 'P-' + i, serial: 'LOT-' + count + '-' + i}))};
  const docs = P.plan(p, bom.items, [], [], {date: '20261011'});
  assert.equal(docs.filter(x => x.code === 'QF-05').length, count);
  assert.equal(docs.find(x => x.code === 'QF-04').rows.length, count);
  assert.ok(docs.every(x => x.file.startsWith(p.pj + '_')));
  assert.equal(P.validateInput(p, bom.items, 'perPanel').length, 0);
  assert.ok(P.validateInput(p, bom.items, 'allocated').length);
}
const p = {...saved.state.project, panels: saved.state.panels, sat: true, outsource: true,
  drawRev: '02', previousDrawRev: '01', changeReason: '배선 변경', changePanels: 'P-01', changeImpact: '재배선·재시험', bomRev: 'BOM-A Rev.03', ioRev: 'IO-A Rev.02'};
assert.equal(P.validateInput(p, bom.items, 'perPanel', [{panel: 'P-01'}]).length, 0);
assert.ok(P.validateInput(p, bom.items, 'perPanel', [{panel: 'UNKNOWN'}]).length);
assert.ok(P.validateInput({...p, changePanels: 'UNKNOWN'}, [], '').length);
assert.equal(P.validateInput({...p, changePanels: '전체'}, [], '').length, 0);
const docs = P.plan(p, bom.items, [], [], {forms: catalog.forms, date: '20261011'});
assert.ok(docs.find(x => x.code === 'QF-02').values['입력자료 목록·Rev'].includes(p.bomRev));
assert.ok(docs.find(x => x.code === 'QF-15').values['입력자료·도면 Rev'].includes(p.bomRev));
assert.ok(docs.find(x => x.code === 'SF-02').values['판넬·전원 범위'].includes('A-01'));
for (const doc of docs) {
  const form = catalog.forms[doc.code];
  const fields = form.fields.flat().map(x => x[0]);
  assert.ok(Object.keys(doc.values).every(key => fields.includes(key)), doc.code + ': unmapped field');
  assert.ok((doc.rows || []).every(row => row.length <= form.cols.length), doc.code + ': row overflow');
}
const common = P.commonSpec(catalog.common, '20261011');
assert.equal(new Set([...Object.keys(catalog.forms), ...catalog.common.map(x => x.code)]).size, 35);
assert.ok(common.rows.some(row => row[0] === 'QF-13-2'));
assert.ok(common.rows.some(row => row[0] === 'MF-01'));
assert.ok(common.rows.every(row => row[4] === '' && row[5] === '미확인' && row[6] === ''));
assert.ok(P.indexSpec(p, docs, catalog.forms, '20261011').dv['7'].includes('검토대기'));
const totalRows = [['품명', '모델', '메이커', '수량', '단위'], ['차단기', 'A-B', 'MAKER', 3, 'EA'], ['외함', 'BOX', 'MAKER', 1, 'EA']];
const assignedRows = [['품명', '모델', '메이커', '수량', '단위', '판넬'], ['차단기', 'A-B', 'MAKER', 1, 'EA', 'P-01'], ['차단기', 'A-B', 'MAKER', 2, 'EA', 'P-02'], ['외함', 'BOX', 'MAKER', 1, 'EA', 'P-01']];
function parseBom(rows, kind = 'bom') { return P.parseBom(rows, P.detectColumns(rows, kind)); }
const totals = parseBom(totalRows, 'bomTotal'), assigned = parseBom(assignedRows);
assert.equal(P.compareBom(assigned, totals).length, 0);
for (const bad of [
  assigned.slice(0, 2), [...assigned, {...assigned[0]}],
  assigned.map((x, i) => i ? x : {...x, model: 'AB'}),
  assigned.map((x, i) => i ? x : {...x, unit: 'M'}),
  assigned.map((x, i) => i ? x : {...x, qty: null}), []
]) assert.ok(P.compareBom(bad, totals).length, 'must reject missing/extra/mismatched allocation');
assert.ok(P.compareBom(assigned, []).length);
assert.ok(P.compareBom(assigned, [{...totals[0], qty: null}]).length);
assert.equal(P.compareBom([{...totals[0], qty: .1}, {...totals[0], qty: .2}], [{...totals[0], qty: .3}]).length, 0);
assert.ok(P.compareBom([{...totals[0], qty: 1000000001}], [{...totals[0], qty: 1000000000}]).length);
for (const qty of ['', '1.2.3', '1,2', '-1']) {
  const item = parseBom([totalRows[0], ['차단기', 'A-B', 'MAKER', qty, 'EA']])[0];
  assert.equal(item.qty, null);
  assert.ok(P.validateInput(p, [item], 'perPanel').length);
}
assert.equal(parseBom([totalRows[0], ['차단기', 'A-B', 'MAKER', '1,000.5', 'EA']])[0].qty, 1000.5);
const allocationProject = {...p, panels: [...p.panels, {tag: 'P-02', desc: '', serial: 'A-02'}]};
assert.equal(P.validateInput(allocationProject, assigned, 'allocated', [], totals).length, 0);
const quantityDocs = P.plan(allocationProject, assigned, [], [], {forms: catalog.forms, date: '20261011'});
assert.ok(quantityDocs.find(x => x.code === 'QF-03').rows.some(row => row[1] === '3 EA / '));
assert.ok(P.validateInput(allocationProject, assigned, 'allocated').length);
const totalData = {kind: 'bomTotal', fileName: 'ORIGINAL.xlsx', sample: false, rows: totalRows, det: P.detectColumns(totalRows, 'bomTotal'), items: totals};
assert.equal(restore({...saved, state: {...saved.state, bomTotal: totalData}}).state.bomTotal.items[0].qty, 3);
assert.equal(restore(saved).state.bomTotal, null);
console.log('PASS: project restore, variable panel count, revision/LOT mapping, unknown panel blocking, complete form catalog');
console.log('PASS: original BOM reconciliation, missing/extra parts, units, decimal quantities, strict numeric parsing');
