// 사용 안내서(DI-IMS-G-02)에 넣을 ISO 기록 도구 화면 캡처.
//   node _src/iso/guides/capture_shots.cjs <ISO-기록생성기.html> <라이브러리 폴더>
// playwright-core와 크롬이 필요하다. CDN 라이브러리(exceljs·jszip·xlsx·qrcode-generator)는
// <라이브러리 폴더>/node_modules에서 읽는다. 예시 데이터(가상 프로젝트)만 찍는다.
const { chromium } = require(require.resolve('playwright-core', { paths: [process.argv[3]] }));
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'shots');
const NM = path.join(process.argv[3], 'node_modules');
const libs = { 'exceljs.min.js': 'exceljs/dist/exceljs.min.js', 'jszip.min.js': 'jszip/dist/jszip.min.js', 'xlsx.full.min.js': 'xlsx/dist/xlsx.full.min.js', 'qrcode.min.js': 'qrcode-generator/qrcode.js' };
function exe() {
  if (process.env.CHROME) return process.env.CHROME;
  const roots = fs.readdirSync('/opt/pw-browsers').filter(d => d.startsWith('chromium_headless_shell')).map(d => '/opt/pw-browsers/' + d);
  for (const r of roots) for (const d of fs.readdirSync(r)) { const p = path.join(r, d, 'headless_shell'); if (fs.existsSync(p)) return p; }
}
(async () => {
  const browser = await chromium.launch({ executablePath: exe(), args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
  await ctx.route('https://cdnjs.cloudflare.com/**', r => { const f = Object.keys(libs).find(k => r.request().url().endsWith(k)); return f ? r.fulfill({ path: path.join(NM, libs[f]), contentType: 'application/javascript' }) : r.abort(); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForFunction(() => window.IsoApp && document.getElementById('btnGen'));
  await page.waitForTimeout(600);
  const shot = async (sel, name, maxH) => {
    const el = await page.$(sel); await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    b.y += await page.evaluate(() => window.scrollY); b.x += await page.evaluate(() => window.scrollX);   // fullPage 좌표
    await page.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: b.x, y: b.y, width: b.width, height: Math.min(b.height, maxH || b.height) }, fullPage: true });
    console.log(name, Math.round(b.width), Math.round(Math.min(b.height, maxH || b.height)));
  };
  for (const [sel, name, h] of process.env.LIST ? JSON.parse(process.env.LIST) : []) {
    if (sel.startsWith('#tab-')) { await page.click(sel); await page.waitForTimeout(500); continue; }
    if (sel.startsWith('!')) { await page.evaluate(sel.slice(1)); await page.waitForTimeout(400); continue; }
    await shot(sel, name, h);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
