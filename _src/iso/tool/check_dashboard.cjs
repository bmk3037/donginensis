const assert = require('node:assert/strict');
const D = require('./dash.js');
const approved = {stage: '5 FAT·출하', status: '승인', done: '2026-10-11', by: '가상 확인자', evidence: '승인본.pdf', evidenceExists: true, exists: true};
assert.equal(D.recordDone(approved), true);
for (const change of [{done: ''}, {by: ''}, {evidence: ''}, {evidenceExists: false}, {evidenceExists: null}, {by: '예) 확인자'}, {done: '예) 2026-10-11'}]) {
  assert.equal(D.recordDone({...approved, ...change}), false);
  assert.ok(D.recordIssues({...approved, ...change}).length);
}
assert.equal(D.recordDone({...approved, status: '완료', evidence: ''}), false);
assert.equal(D.recordDone({...approved, exists: false}), true); // 승인된 대체 기록이 선택 폴더에 있는 경우
const na = {...approved, stage: '8 NCR·AS', status: '해당없음', evidence: '', evidenceExists: null, reason: '이번 프로젝트 부적합 발생 없음', exists: false};
assert.equal(D.recordDone(na), true);
for (const change of [{reason: ''}, {reason: '예) 발생 없음'}, {by: ''}, {done: ''}]) assert.equal(D.recordDone({...na, ...change}), false);
for (const status of ['미작성', '작성중', '보류', '불합격', '검토대기']) assert.equal(D.recordDone({...approved, status}), false);
const pr = D.summarize({records: [approved, {...na, reason: ''}], panels: []});
assert.equal(pr.total, 2);
assert.equal(pr.doneN, 1);
assert.equal(pr.current, 'NCR·AS');
assert.equal(pr.left[0].issues[0], '해당없음 사유 없음');
assert.equal(D.summarize({records: Array.from({length: 200}, (_, i) => ({...approved, by: i ? '확인자' : ''})), panels: []}).pct, 99);
assert.equal(D.summarize({records: [], panels: []}).current, '기록 없음');
const headers = ['단계', '양식', '문서', '판넬', '파일 위치', '담당', '상태', '확인일', '확인자', '승인 증거·대체 기록 경로', '해당없음 사유'];
const parsed = D.parseIndex([['프로젝트 번호', 'FAKE-01'], headers, ['8 NCR·AS', 'QF-09', '부적합', '전체', '08/기록.xlsx', '품질', '해당없음', '2026-10-11', '가상 확인자', '', '발생 없음']]);
assert.equal(parsed.pj, 'FAKE-01');
assert.equal(D.recordDone(parsed.records[0]), true);
assert.equal(D.parseIndex([headers, ['1 수주', 'PF-00', '', '', '', '', '예) 승인']]).records[0].status, '미작성');
for (const text of ['불합격 10/11', '보류 10/11', '합격 (일부 미완료)', '합격 대기']) {
  assert.equal(D.panelState({fat: text, ship: '승인 10/12'}), text.startsWith('불합격') ? 'FAT 불합격' : 'FAT 보류·미완료');
}
assert.equal(D.panelState({fat: '합격 10/11', ship: ''}), 'FAT 합격 기록');
assert.equal(D.panelState({fat: '10/11', ship: ''}), 'FAT 판정 확인 필요');
assert.equal(D.panelState({fat: '합격 10/11', ship: '승인 대기'}), '출하 보류');
assert.equal(D.panelState({fat: '합격 10/11', ship: '승인 10/12'}), '출하 기록');
assert.equal(D.panelState({fat: '예) 합격 10/11', ship: ''}), '제작');
console.log('PASS: approval evidence, N/A confirmation, NCR/AS scope, incomplete percentages, FAT failure and hold states');

// 폴더 입력 경로에서도 증거 유무가 집계에 반영되는지 확인한다.
const fs = require('node:fs'), vm = require('node:vm');
const P = require('./project.js');
const app = {P, el: (tag, attrs, children) => ({tag, attrs, children: children || []}), readWorkbook: async file => file.workbook, sheetRows: wb => wb.rows};
const window = {IsoApp: app};
const code = fs.readFileSync(require.resolve('./dash.js'), 'utf8')
  .replace('var A, el, $;', 'var A = window.IsoApp, el = window.IsoApp.el, $;')
  .replace('window.IsoViews = window.IsoViews || {};', 'window.testLoad = loadFiles; window.testVc = vcLine; window.IsoViews = window.IsoViews || {};');
vm.runInNewContext(code, {window});
const vc = {managed: true, latestRev: '2', latestVer: '1.0', recRev: '', recVer: '', revs: ['2'], issues: [], notes: []};
for (const chip of window.testVc({vc}).children[0].children) {
  assert.ok(chip.attrs.text.includes('기록 버전 미입력'));
  assert.ok(!chip.attrs.cls.includes('chip-ok'));
}
assert.ok(window.testVc({vc: {...vc, recRev: '2', recVer: '1.0'}}).children[0].children.every(x => x.attrs.cls.includes('chip-ok')));
const approvalRows = [['프로젝트 번호', 'FAKE-02'], headers, ['5 FAT·출하', 'QF-06', 'FAT', 'TEST-01', '05_FAT출하/성적서.xlsx', '가상 품질', '승인', '2026-10-11', '가상 확인자', '05_FAT출하\\승인본.pdf', '']];
const index = {path: '테스트/00_기록현황_FAKE-02.xlsx', file: {lastModified: 1, workbook: {SheetNames: ['기록현황'], rows: approvalRows}}};
const evidence = {path: '테스트/05_FAT출하/승인본.pdf', file: {}};
(async () => {
  let result = await window.testLoad([index]);
  assert.equal(result.projects[0].doneN, 0);
  assert.ok(result.projects[0].left[0].issues.includes('선택 폴더에 승인 증거 파일 없음'));
  result = await window.testLoad([index, evidence]);
  assert.equal(result.projects[0].doneN, 1);
  assert.equal(result.projects[0].missing, 0); // 대체 승인 원본이 있으므로 생성 파일 부재는 완료를 막지 않는다.
  approvalRows[2][9] = '05_FAT출하/승인본.pdf';
  assert.equal((await window.testLoad([index, evidence])).projects[0].doneN, 1);
  approvalRows[2][9] = '예) 05_FAT출하/승인본.pdf';
  assert.equal((await window.testLoad([index, evidence])).projects[0].doneN, 0);
  console.log('PASS: selected-folder evidence resolution, Windows separators, alternative approved records, example exclusion');
})().catch(e => { console.error(e); process.exitCode = 1; });
