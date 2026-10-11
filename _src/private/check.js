// 비공개(잠금) 자료 폴더가 정해진 비밀번호로 열리는지 확인
// 사용: PRIVATE_PASS='파트너 비밀번호' INTERNAL_PASS='내부 비밀번호' node _src/private/check.js
//   files/ 아래의 모든 index.bin(암호화된 목록)을 찾아 비밀번호로 풀어 봅니다. 하나라도 안 열리면 종료 코드 1.
//   규칙: 파트너용 잠금 폴더(files/private, files/innov/private 등)는 모두 PRIVATE_PASS 하나,
//        내부 자료실(files/internal, 대표 전용)은 INTERNAL_PASS 하나. INTERNAL_PASS가 없으면 내부 자료실은 건너뜁니다.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ITER = 600000;
const PASS = { private: process.env.PRIVATE_PASS, internal: process.env.INTERNAL_PASS };
if (!PASS.private) { console.error('PRIVATE_PASS 환경변수에 비밀번호를 넣어 주세요.'); process.exit(1); }
let pass = PASS.private;
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
  const internal = rel.split(path.sep).slice(0, 2).join('/') === 'files/internal';
  if (internal && !PASS.internal) { console.log(`SKIP ${rel}/  INTERNAL_PASS 없음`); continue; }
  pass = internal ? PASS.internal : PASS.private;
  try {
    const docs = JSON.parse(open(fs.readFileSync(idx)).toString('utf8')).docs || [];
    let missing = 0;
    for (const d of docs) { try { if (open(fs.readFileSync(path.join(dir, d.id + '.bin'))).length !== d.size) missing++; } catch (e) { missing++; } }
    console.log(`${missing ? 'FAIL' : 'OK  '} ${rel}/  자료 ${docs.length}건${missing ? ` (안 열리는 파일 ${missing}건)` : ''}`);
    if (missing) bad++;
  } catch (e) { console.log(`FAIL ${rel}/  비밀번호가 맞지 않거나 형식 오류`); bad++; }
}
if (bad) { console.error('비밀번호가 맞지 않는 폴더가 있습니다. 해당 비밀번호로 다시 암호화하세요 (_src/private/README.md).'); process.exit(1); }
console.log('모든 비공개 폴더가 정해진 비밀번호로 열립니다.');
