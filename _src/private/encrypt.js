// 비밀번호 자료실(members.html) 암호화 도구
// 사용: PRIVATE_PASS='비밀번호' node _src/private/encrypt.js <원본 폴더>
//       PRIVATE_OUT=files/innov/private PRIVATE_PASS='비밀번호' node _src/private/encrypt.js <원본 폴더>   ← 자료실 '혁신제품' 잠금 자료
//       PRIVATE_OUT=files/internal PRIVATE_PASS="$INTERNAL_PASS" node _src/private/encrypt.js <원본 폴더>   ← 내부 자료실(internal.html, 대표 전용 · 파트너와 다른 비밀번호)
//   <원본 폴더>에는 docs.json(목록)과 그 안에 적힌 파일들이 있어야 합니다. 원본 폴더는 저장소 밖에 둡니다.
// 결과: files/private/ 를 비우고 index.bin(암호화된 목록)과 무작위 이름의 암호화 파일을 새로 만듭니다.
// 형식: "DIENC1"(6바이트) + salt(16) + iv(12) + AES-256-GCM 암호문(+태그 16바이트), 키는 PBKDF2-SHA256 600,000회
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ITER = 600000;
const MAGIC = Buffer.from('DIENC1');
const pass = process.env.PRIVATE_PASS;
const srcDir = process.argv[2];
if (!pass || pass.length < 12) { console.error('PRIVATE_PASS 환경변수에 12자 이상 비밀번호를 넣어 주세요.'); process.exit(1); }
if (!srcDir) { console.error('원본 폴더를 지정해 주세요.'); process.exit(1); }

const outDir = process.env.PRIVATE_OUT ? path.resolve(process.env.PRIVATE_OUT) : path.join(__dirname, '..', '..', 'files', 'private');  // PRIVATE_OUT: 다른 잠금 폴더(예: files/innov/private)
const salt = crypto.randomBytes(16);
const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, 'sha256');

const seal = buf => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]);
  return Buffer.concat([MAGIC, salt, iv, body]);
};

const docs = JSON.parse(fs.readFileSync(path.join(srcDir, 'docs.json'), 'utf8'));
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const list = docs.map(d => {
  const data = fs.readFileSync(path.join(srcDir, d.file));
  const id = crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(path.join(outDir, id + '.bin'), seal(data));
  return { group: d.group, title: d.title, desc: d.desc, name: d.file, type: d.type, id, size: data.length };
});
fs.writeFileSync(path.join(outDir, 'index.bin'), seal(Buffer.from(JSON.stringify({ v: 1, docs: list }), 'utf8')));
console.log(`암호화 완료: 자료 ${list.length}건 → ${path.relative(process.cwd(), outDir)}`);
