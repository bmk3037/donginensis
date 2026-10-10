// 비공개(잠금) 자료 폴더가 모두 같은 비밀번호로 열리는지 확인
// 사용: PRIVATE_PASS='비밀번호' node _src/private/check.js
//   files/ 아래의 모든 index.bin(암호화된 목록)을 찾아 비밀번호로 풀어 봅니다. 하나라도 안 열리면 종료 코드 1.
//   규칙: 비공개 파일·폴더는 몇 개든 비밀번호 하나(파트너 자료실 비밀번호)로 통일합니다.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ITER = 600000;
const pass = process.env.PRIVATE_PASS;
if (!pass) { console.error('PRIVATE_PASS 환경변수에 비밀번호를 넣어 주세요.'); process.exit(1); }
const root = path.join(__dirname, '..', '..', 'files');

const open = buf => {
  if (buf.subarray(0, 6).toString() !== 'DIENC1') throw new Error('format');
  const salt = buf.subarray(6, 22), iv = buf.subarray(22, 34), body = buf.subarray(34);
  const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, 'sha256');
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.setAuthTag(body.subarray(-16));
  return Buffer.concat([d.update(body.subarray(0, -16)), d.final()]);
};
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : (e.name === 'index.bin' ? [path.join(dir, e.name)] : []));

let bad = 0;
for (const idx of walk(root)) {
  const dir = path.dirname(idx), rel = path.relative(path.join(__dirname, '..', '..'), dir);
  try {
    const docs = JSON.parse(open(fs.readFileSync(idx)).toString('utf8')).docs || [];
    let missing = 0;
    for (const d of docs) { try { if (open(fs.readFileSync(path.join(dir, d.id + '.bin'))).length !== d.size) missing++; } catch (e) { missing++; } }
    console.log(`${missing ? 'FAIL' : 'OK  '} ${rel}/  자료 ${docs.length}건${missing ? ` (안 열리는 파일 ${missing}건)` : ''}`);
    if (missing) bad++;
  } catch (e) { console.log(`FAIL ${rel}/  비밀번호가 맞지 않거나 형식 오류`); bad++; }
}
if (bad) { console.error('비밀번호가 다른 폴더가 있습니다. 모두 같은 비밀번호로 다시 암호화하세요 (_src/private/README.md).'); process.exit(1); }
console.log('모든 비공개 폴더가 같은 비밀번호로 열립니다.');
