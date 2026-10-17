// 타사 → 슈나이더 대체(xref.js) 검증: node _src/iso/tool/check_xref.cjs
// 값은 모두 가상의 예시다(실제 LP·할인율은 저장소에 넣지 않는다).
const assert = require('node:assert/strict');
const X = require('./xref.js');

// 회사 대응표처럼 생긴 시트: 규격 = 타사 형번, 모델명 = 슈나이더, 재질 = 타사 메이커, 여러 줄 사양
const sheet = [
  ['NO', '품목명', '규격', '재질', '단위', '2025년 입고수량', '하이사', '', '모델명', 'LP', 'Remark'],
  [1, 'PLC(AI8)', '6ES7231-4HF32-0XB0', 'SIEMENS', 'EA', 67, '', '', 'TM3AI8', 100000, ''],
  [2, 'PLC(CPU)', '6ES7215-1AG40-0XB0', 'SIEMENS', 'EA', 3, 'A/O 2CH', '', 'TM221CE24T', '200,000', 'A/O 없음'],
  [3, 'PLC(CPU)', '6ES7215-1AG40-0XB0', 'SIEMENS', 'EA', '', '', '', 'TM3AQ2', 50000, '아날로그 출력 추가'],
  [4, 'HMI', '6AV2123-2GB03-0AX0', 'SIEMENS', 'EA', 42, '7인치', '', 'PFXET6400WAD', 300000, ''],
  [5, 'SOFTSTARTER', '3RW4028-1BB14', 'SIEMENS', 'EA', 12, '', '', '', '', ''],
];
const t = X.parseTable(sheet);
assert.ok(t, '머리글을 찾아야 함');
assert.equal(t.entries.length, 5);
assert.equal(t.entries[0].from, '6ES7231-4HF32-0XB0');
assert.equal(t.entries[0].to, 'TM3AI8');
assert.equal(t.entries[0].fromMaker, 'SIEMENS');
assert.equal(t.entries[0].group, 'PLC');
assert.equal(t.entries[1].lp, '200000');
assert.equal(t.entries[3].group, 'HMI');
assert.equal(t.entries[3].toMaker, 'Pro-face');
assert.equal(t.entries[4].to, '');

// 내려받은 대응표(우리 서식)를 다시 읽으면 같은 내용
const again = X.parseTable(X.tableAoa(t.entries));
assert.deepEqual(again.entries, t.entries);

// 엑셀에서 복사한 글: 따옴표로 감싼 여러 줄 셀
const tsv = '품목명\t규격\t재질\t수량\n' +
  'PLC(AI8)\t6ES7231-4HF32-0XB0\tSIEMENS\t67\n' +
  'PLC(CPU)\t6ES7215-1AG40-0XB0\tSIEMENS\t"3"\n' +
  '"KTP\n700"\t6av2123 2gb03 0ax0\tSIEMENS\t2\n' +
  'PLC(AI8) 신버전\t6ES7231-4HF32-0XB1\tSIEMENS\t1\n' +
  '없는 것\t6ES7999-9ZZ99-0XB0\tSIEMENS\t4\n' +
  'SOFTSTARTER\t3RW4028-1BB14\tSIEMENS\t1\n';
const rows = X.parseTsv(tsv);
assert.equal(rows.length, 7);
assert.equal(rows[3][0], 'KTP\n700');
const inputs = X.parseInput(rows);
assert.equal(inputs.length, 6);
assert.equal(inputs[1].qty, 3);

const out = X.convert(inputs, t.entries);
// AI8 1 + CPU 2(CPU + AO 모듈) + HMI 1 + 유사 1 + 없음 1 + 대체품 없음 1
assert.equal(out.length, 7);
assert.equal(out[0].how, 'exact');
assert.deepEqual(out.slice(1, 3).map(r => r.to), ['TM221CE24T', 'TM3AQ2']);
assert.equal(out[2].qty, '3');
assert.equal(out[3].how, 'exact'); // 공백·대소문자 달라도 일치
assert.equal(out[4].how, 'loose'); // 끝 버전만 다름
assert.equal(out[5].how, 'none');
assert.equal(out[6].how, 'nosub');

// 원가 = LP × (1 − 할인율)
assert.equal(X.unitCost(100000, 40), 60000);
assert.equal(X.unitCost('200,000', '35.5'), 129000);
assert.equal(X.unitCost(100000, ''), null);
assert.equal(X.unitCost(100000, 100), null);
const rates = {PLC: '40'}; // HMI 할인율은 비워 둠
const c = X.rowCost(out[0], rates);
assert.equal(c.unit, 60000);
assert.equal(c.amount, 60000 * 67);

const items = X.toItems(out, rates, true);
// PLC 4행(AI8·CPU·AO·유사)만, HMI(할인율 없음)·없음·대체품 없음은 빠짐
assert.equal(items.items.length, 4);
assert.equal(items.skipped.length, 3);
assert.equal(items.items[0].spec, 'TM3AI8');
assert.equal(items.items[0].cost, '60000');
assert.equal(items.items[0].qty, '67');
assert.equal(items.items[0].maker, 'Schneider');
assert.ok(items.items[0].name.includes('6ES7231-4HF32-0XB0'));
assert.equal(X.toItems(out, rates, false).items[0].name, 'PLC(AI8)');

// 못 찾은 형번에 모델·LP를 적고 대응표에 저장하면 다음부터 찾는다
const entries = t.entries.map(e => ({...e}));
const miss = {...out[5], to: 'TM3DI16', lp: '90000', group: 'PLC', qty: '8'};
assert.ok(X.changedFromTable(miss));
X.upsert(entries, miss);
assert.equal(entries.length, 6);
assert.equal(entries[5].ratio, '2'); // 4개 → 8개
assert.ok(!X.changedFromTable(miss));
const re = X.convert([{code: '6ES7999-9ZZ99-0XB0', qty: 1, name: ''}], entries);
assert.equal(re[0].to, 'TM3DI16');
assert.equal(re[0].qty, '2');
// 유사 형번을 저장하면 원래 줄은 두고 새 형번 줄을 더한다
const loose = {...X.convert([inputs[3]], entries)[0]};
assert.equal(loose.how, 'loose');
X.upsert(entries, loose);
assert.equal(entries.length, 7);
assert.equal(entries[0].from, '6ES7231-4HF32-0XB0');

// 머리글 없이 형번·수량만 붙여 넣기
const bare = X.parseInput(X.parseTsv('6ES7231-4HF32-0XB0\t5\nPLC(CPU)\t6ES7215-1AG40-0XB0\t2'));
assert.deepEqual(bare.map(x => [x.code, x.qty]), [['6ES7231-4HF32-0XB0', 5], ['6ES7215-1AG40-0XB0', 2]]);
assert.equal(bare[1].name, 'PLC(CPU)');
// 대응표 없이 기본 대응으로 찾기(모델명만, LP는 브라우저에 기억한 값)
const auto = X.convert(X.parseInput(X.parseTsv('6ES7214-1AG40-0XB0\t2\n6ES7214-1HG40-0XB0\t1\n6ES7231-5PF32-0XB0\t3\n6ES7241-1CH32-0XB0\t2\n' +
  '6SL3210-5BE21-5UV0\t1\n6SL3210-5BE31-8UV0\t1\n6SL3210-1KE22-6UF1\t1\n3RW4028-1BB14\t1\n6AV2123-2GB03-0AX0\t1\n6SL3210-5BB23-0UV1\t1\nABC-12345\t1')), [], {TM221CE24T: '100000'});
assert.deepEqual(auto.map(r => [r.how, r.to, r.qty]), [
  ['auto', 'TM221CE24T', '2'], ['auto', 'TM221ME16R', '1'], ['auto', 'TM3DM24R', '1'], ['auto', 'TM3TI4', '6'], ['port', '', '0'],
  ['auto', 'ATV320U15N4B', '1'], ['auto', 'ATV630D18N4', '1'], ['auto', 'ATV320D11N4B', '1'], ['auto', 'ATS22D47Q', '1'], ['auto', 'PFXET6400WAD', '1'],
  ['none', '', '1'], ['none', '', '1']]);
assert.equal(auto[0].lp, '100000'); // 기억한 LP
assert.equal(auto[0].group, 'PLC');
assert.equal(auto[5].group, '인버터');
assert.equal(auto[8].group, '소프트스타터');
assert.ok(auto[6].desc.includes('18.5kW'));
assert.ok(!X.changedFromTable(auto[0]));
assert.ok(X.changedFromTable({...auto[0], to: 'TM221CE40T'}));
// 대응표가 있으면 대응표가 먼저
assert.equal(X.convert([{code: '6ES7231-4HF32-0XB0', qty: 1, name: ''}], t.entries)[0].how, 'exact');
// 내장 포트 행은 견적에 넣지 않고 건너뜀 목록에도 없음
const ti = X.toItems(auto, {PLC: '40'}, false);
assert.equal(ti.items.length, 1);
assert.equal(ti.items[0].cost, '60000');
assert.ok(!ti.skipped.some(r => r.how === 'port'));
// LP 시트
assert.deepEqual(X.parseLp([['슈나이더 모델', 'LP'], ['TM3AQ2', '120,000'], ['', 5]]), {TM3AQ2: '120000'});
console.log('xref ok');
