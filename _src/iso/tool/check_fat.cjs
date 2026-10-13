const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const P = require('./project.js');
const forms = JSON.parse(fs.readFileSync(path.join(__dirname, 'dist/forms.json'), 'utf8'));
const clone = d => JSON.parse(JSON.stringify(d));
let project = clone(require('./samples.js').project);
project.pj = 'FAKE-FAT-01'; project.panels = [{tag: 'TEST-01', serial: 'FAKE-FAT-01-01', desc: '가상 판넬'}];
let bom = [], io = [{addr: 'I0.0', tag: 'TEST-IO', desc: '가상 입력', type: 'DI', expect: 'ON 확인', panel: 'TEST-01'}], std = [];
const storage = new Map(), downloads = [], status = {};
let rejectSave = false, rejectArchive = false, rejectCurrent = false;
const app = {
  P, FORMS: forms, project: () => project, bomItems: () => bom,
  plan: () => ({p: project, docs: P.plan(project, bom, io, std, {forms: forms.forms})}),
  $: () => status, esc: String,
  saveFile: async (name, blob) => { if (rejectSave) throw new Error('가상 저장 취소'); downloads.push({name, text: await blob.text()}); },
  saveErrorText: e => e.message
};
const window = {IsoApp: app, skipRender: true};
const code = fs.readFileSync(path.join(__dirname, 'fat.js'), 'utf8')
  .replace('var A, el, $, esc;', 'var A = window.IsoApp, el, $ = A.$, esc = A.esc;')
  .replace('function render() {', 'function render() { if (window.skipRender) return;')
  .replace('window.IsoViews = window.IsoViews || {};', 'window.testFat = {fresh, basisIssues, readRecord, load, restart, loadJson, workbook, reportHtml, fileBase, panelProgress, stats, set: d => {cur = d; tag = d.tag;}, get: () => cur}; window.IsoViews = window.IsoViews || {};');
vm.runInNewContext(code, {window, Blob, localStorage: {getItem: k => storage.get(k) || null, setItem: (k, v) => {if ((rejectArchive && k.includes(':previous:')) || (rejectCurrent && !k.includes(':previous:'))) throw new Error('quota'); storage.set(k, v);}}});
const F = window.testFat, key = () => 'iso-fat:' + project.pj + ':TEST-01';
let initial = F.fresh(project, 'TEST-01');
assert.equal(F.basisIssues(initial, project, 'TEST-01').length, 0);
initial.items.forEach(x => {x.result = '가상 실측'; x.judge = '합격'; x.t = '2026-10-11 10:00';});
initial.io.forEach(x => {x.result = 'ON 확인'; x.judge = '합격'; x.by = '가상 시험자'; x.t = '2026-10-11 10:00';});
initial.tester = '가상 시험자';
assert.equal(F.stats(initial).verdict, '합격');
for (const field of ['customer', 'name', 'po', 'spec', 'drawRev', 'bomRev', 'bomBasis', 'ioRev', 'plc', 'plcVer', 'stdRev', 'stdName']) {
  const old = project[field]; project[field] = 'CHANGED';
  assert.ok(F.basisIssues(initial, project, 'TEST-01').length, field);
  assert.equal(F.stats(initial).verdict, '재시험 필요');
  project[field] = old;
}
project.panels[0].serial = 'NEW-LOT';
assert.ok(F.basisIssues(initial, project, 'TEST-01').length);
assert.equal(initial.lot, 'FAKE-FAT-01-01');
project.panels[0].serial = initial.lot;
project.recordRev = '99'; // 기록 파일의 Rev만 바꿔도 실측값을 폐기하지 않는다.
assert.equal(F.basisIssues(initial, project, 'TEST-01').length, 0);
io[0].expect = '변경 동작'; assert.ok(F.basisIssues(initial, project, 'TEST-01').length); io[0].expect = 'ON 확인';
io.push({...io[0], addr: 'I0.1'}); assert.ok(F.basisIssues(initial, project, 'TEST-01').length); io.pop();
bom.push({name: '가상 부품', model: 'FAKE-01', maker: '', qty: 1, unit: 'EA', tags: [], panel: 'TEST-01'});
assert.ok(F.basisIssues(initial, project, 'TEST-01').some(x => x.includes('BOM'))); bom = [];
const changedRows = clone(initial); changedRows.items.pop();
assert.ok(F.basisIssues(changedRows, project, 'TEST-01').length);
const foreign = {...clone(initial), pj: 'FAKE-OTHER'};
assert.throws(() => F.readRecord(JSON.stringify(foreign), project), /수주번호/);
for (const change of [{version: 99}, {items: [null]}, {io: [{}]}, {date: {}}, {basis: null}, {items: [{...initial.items[0], judge: 'UNKNOWN'}]}]) {
  assert.throws(() => F.readRecord(JSON.stringify({...clone(initial), ...change}), project));
}
const legacy = {...clone(initial), version: 1}; delete legacy.basis;
assert.ok(F.basisIssues(F.readRecord(JSON.stringify(legacy), project), project, 'TEST-01').length);
storage.set(key(), JSON.stringify(initial)); F.load(project, 'TEST-01');
project.drawRev = 'Rev.NEW';
assert.equal(F.panelProgress(project, 'TEST-01'), '재시험 필요');
assert.throws(() => F.workbook(), /시험 기준/);
assert.throws(() => F.reportHtml(), /시험 기준/);
assert.equal(F.get().lot, initial.lot);
assert.ok(F.fileBase().includes('_Rev'));
(async () => {
  const prior = storage.get(key());
  rejectSave = true;
  await F.restart(); assert.equal(storage.get(key()), prior); assert.equal(F.get().items[0].judge, '합격');
  rejectSave = false;
  rejectArchive = true;
  await F.restart(); assert.equal(storage.get(key()), prior); assert.equal(F.get().items[0].judge, '합격');
  rejectArchive = false;
  await F.restart();
  assert.equal(JSON.parse(downloads.at(-1).text).items[0].judge, '합격');
  assert.ok(downloads.at(-1).name.includes('이전기록'));
  assert.ok([...storage.entries()].some(([k, text]) => k.includes(':previous:') && JSON.parse(text).items[0].judge === '합격'));
  assert.ok(F.get().items.every(x => !x.judge && !x.result));
  assert.equal(F.basisIssues(F.get(), project, 'TEST-01').length, 0);
  assert.equal(F.get().basis.drawRev, 'Rev.NEW');
  assert.notEqual(F.fileBase(), initial.pj + '_FAT_' + initial.tag + '_' + initial.date.replace(/-/g, ''));
  const beforeImport = storage.get(key());
  await F.loadJson({text: async () => JSON.stringify(foreign)});
  assert.equal(storage.get(key()), beforeImport);
  assert.ok(status.textContent.includes('수주번호'));
  rejectSave = true;
  await F.loadJson({text: async () => JSON.stringify(initial)});
  assert.equal(storage.get(key()), beforeImport);
  rejectSave = false;
  await F.loadJson({text: async () => JSON.stringify(initial)});
  assert.equal(downloads.at(-1).text, beforeImport);
  assert.equal(F.get().basis.drawRev, initial.basis.drawRev);
  assert.equal(F.stats().verdict, '재시험 필요');
  storage.set(key(), '{broken'); F.load(project, 'TEST-01');
  assert.equal(F.panelProgress(project, 'TEST-01'), '저장 기록 확인 필요');
  assert.throws(() => F.workbook(), /시험 기준/);
  await F.restart(); assert.equal(downloads.at(-1).text, '{broken');
  assert.equal(F.basisIssues(F.get(), project, 'TEST-01').length, 0);
  rejectCurrent = true;
  const retained = storage.get(key());
  await F.restart();
  assert.equal(storage.get(key()), retained);
  assert.ok(status.textContent.includes('저장하지 못했습니다'));
  console.log('PASS: FAT basis snapshots, revision/LOT/BOM/I-O changes, foreign and malformed JSON rejection, legacy records, stale export blocking, backup before restart/import, cancelled-save preservation');
})().catch(e => { console.error(e); process.exitCode = 1; });
