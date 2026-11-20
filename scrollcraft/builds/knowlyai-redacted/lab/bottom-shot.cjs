const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  await p.goto(process.argv[2], { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: process.argv[3] });
  await b.close();
})();
