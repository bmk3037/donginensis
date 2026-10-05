// 사용: NODE_PATH=$(npm root -g) node _src/innov/render.js  → files/innov/DI-IN-01_Rev00.pdf (+ 미리보기 PNG는 인자로 경로 지정 시)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(__dirname, 'DI-IN-01.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(__dirname, '../../files/innov/DI-IN-01_Rev00.pdf'), format: 'A4', printBackground: true, pageRanges: '1' });
  if (process.argv[2]) await p.screenshot({ path: process.argv[2], fullPage: false });
  const over = await p.evaluate(() => document.body.scrollHeight > 1123 + 2);
  console.log('ok', over ? 'OVERFLOW' : 'fits');
  await b.close();
})();
