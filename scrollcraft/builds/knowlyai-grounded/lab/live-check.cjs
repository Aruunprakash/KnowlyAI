// Drives the page against a running API and captures the live states.
// Usage: node lab/live-check.cjs <page url> <out dir> [width height]
const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  const [url, out, w = '1440', h = '900'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.CH || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}/hero.png` });
  const hero = await page.evaluate(() => ({
    api: document.getElementById('rd-api').textContent,
    tele: [...document.querySelectorAll('.tele__v')].map((n) => n.textContent),
  }));

  await page.evaluate(() => document.getElementById('ask').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/ask-idle.png` });

  const q = process.env.Q || 'what is cross validation for?';
  await page.fill('#ask-input', q);
  await page.press('#ask-input', 'Enter');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/ask-streaming.png` });
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.getElementById('ask-status').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/ask-done.png`, fullPage: false });
  const hover = await page.$('.live__ans .ans__cite');
  if (hover) { await hover.hover(); await page.waitForTimeout(250); await page.screenshot({ path: `${out}/ask-hover.png` }); }

  const done = await page.evaluate(() => ({
    status: document.getElementById('ask-status').textContent,
    result: document.getElementById('ask-results').innerText.slice(0, 300),
  }));
  console.log(JSON.stringify({ hero, done, errors }, null, 2));
  await browser.close();
})();
