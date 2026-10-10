// 비밀번호 자료실(members.html) 암호화 도구
// 사용: PRIVATE_PASS='비밀번호' node _src/private/encrypt.js <원본 폴더>
//       PRIVATE_OUT=files/innov/private PRIVATE_PASS='비밀번호' node _src/private/encrypt.js <원본 폴더>   ← 자료실 '혁신제품' 잠금 자료
//       PRIVATE_OUT=files/internal PRIVATE_PASS="$INTERNAL_PASS" node _src/private/encrypt.js <원본 폴더>   ← 내부 자료실(internal.html, 대표 전용 · 파트너와 다른 비밀번호)
//   <원본 폴더>에는 docs.json(목록)과 그 안에 적힌 파일들이 있어야 합니다. 원본 폴더는 저장소 밖에 둡니다.
//   docs.json은 자료 배열이거나, 폴더를 함께 적는 {"folders":[{"path","desc","uses"}], "docs":[…]} 형식(내부 자료실)입니다.
// 결과: index.bin(암호화된 목록)과 무작위 이름의 암호화 파일을 만듭니다. 기존 폴더가 같은 비밀번호로 열리면
//       내용이 그대로인 자료는 기존 암호화 파일을 그대로 두고, 새로 넣거나 바뀐 자료만 새로 암호화합니다
//       (저장소 기록 용량 절약). 목록에서 빠진 자료의 파일은 지웁니다. 전부 새로 하려면 PRIVATE_FULL=1.
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
const derive = s => crypto.pbkdf2Sync(pass, s, ITER, 32, 'sha256');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const open = (buf, k) => {
  if (!buf.subarray(0, 6).equals(MAGIC)) throw new Error('format');
  const iv = buf.subarray(22, 34), body = buf.subarray(34);
  const d = crypto.createDecipheriv('aes-256-gcm', k, iv);
  d.setAuthTag(body.subarray(body.length - 16));
  return Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]);
};

// 기존 폴더가 같은 비밀번호로 열리면 salt(=키)를 이어 쓰고, 내용(sha256)이 같은 기존 파일을 다시 씁니다.
let salt = null, key = null;
const reuse = new Map();  // sha256 → 기존 id
const idxPath = path.join(outDir, 'index.bin');
if (!process.env.PRIVATE_FULL && fs.existsSync(idxPath)) {
  try {
    const ib = fs.readFileSync(idxPath), s = ib.subarray(6, 22), k = derive(s);
    for (const d of JSON.parse(open(ib, k).toString('utf8')).docs || []) {
      try { const b = fs.readFileSync(path.join(outDir, d.id + '.bin')); if (b.subarray(6, 22).equals(s)) reuse.set(sha(open(b, k)), d.id); } catch (e) {}
    }
    salt = Buffer.from(s); key = k;
  } catch (e) { reuse.clear(); }  // 비밀번호가 바뀌었거나 형식이 다르면 전부 새로 암호화
}
if (!key) { salt = crypto.randomBytes(16); key = derive(salt); }

const seal = buf => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]);
  return Buffer.concat([MAGIC, salt, iv, body]);
};

const src = JSON.parse(fs.readFileSync(path.join(srcDir, 'docs.json'), 'utf8'));
const docs = Array.isArray(src) ? src : src.docs;
const folders = Array.isArray(src) ? null : (src.folders || []);  // 폴더 목록(빈 폴더 표시 · 공통 서류 참조)
for (const f of folders || []) for (const u of f.uses || []) if (!docs.some(d => d.file === u)) { console.error(`폴더 '${f.path}'의 uses에 적은 파일이 목록에 없습니다: ${u}`); process.exit(1); }
for (const d of docs) fs.accessSync(path.join(srcDir, d.file));  // 원본이 빠졌으면 아무것도 바꾸기 전에 멈춤
fs.mkdirSync(outDir, { recursive: true });

let fresh = 0;
const list = docs.map(d => {
  const data = fs.readFileSync(path.join(srcDir, d.file)), h = sha(data);
  let id = reuse.get(h);
  if (!id) { id = crypto.randomBytes(8).toString('hex'); fs.writeFileSync(path.join(outDir, id + '.bin'), seal(data)); reuse.set(h, id); fresh++; }
  return { group: d.group, title: d.title, desc: d.desc, name: d.file, type: d.type, id, size: data.length };
});
fs.writeFileSync(path.join(outDir, 'index.bin'), seal(Buffer.from(JSON.stringify(folders ? { v: 1, folders, docs: list } : { v: 1, docs: list }), 'utf8')));
const keep = new Set(list.map(d => d.id + '.bin').concat('index.bin'));
let removed = 0;
for (const f of fs.readdirSync(outDir)) if (!keep.has(f)) { fs.rmSync(path.join(outDir, f), { recursive: true, force: true }); removed++; }
console.log(`암호화 완료: 자료 ${list.length}건 (새로 암호화 ${fresh}건 · 그대로 ${list.length - fresh}건 · 지운 파일 ${removed}개) → ${path.relative(process.cwd(), outDir)}`);
