const assert = require('node:assert/strict');
const P = require('./project.js');
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
console.log('PASS: per-project panel documents and validated project restore');
