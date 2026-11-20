// Uploads a PDF through the page's "Add a PDF" control and reports what the
// page shows afterwards. Usage: node lab/upload-check.cjs <page url> <pdf> <out.png>
const { chromium } = require('playwright-core');

(async () => {
  const [url, pdf, shot] = process.argv.slice(2);
  const browser = await chromium.launch({ channel: process.env.CH || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('ask').scrollIntoView({ block: 'start' }));
  await page.setInputFiles('#ask-file', pdf);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('ask-status').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot });
  console.log(JSON.stringify(await page.evaluate(() => ({
    status: document.getElementById('ask-status').textContent,
    sources: document.getElementById('src-list').innerText,
    small: document.getElementById('ask-small').textContent,
  })), null, 2));
  await browser.close();
})();
