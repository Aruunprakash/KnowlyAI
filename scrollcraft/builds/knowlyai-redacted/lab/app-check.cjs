// Drives the app at /app/ through its main flows and captures each state.
// Usage: node lab/app-check.cjs   (static server on 4512, stub API on 8001,
// real API on 8000)
const { chromium } = require('playwright-core');
const fs = require('fs');

const BASE = 'http://localhost:4512';
const OUT = 'lab/app';
const BANNED = /GOOGLE_API_KEY|uvicorn|Degraded|Service unreachable|Check that the API/i;

function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

async function contrastOf(page, selectors) {
  const raw = await page.evaluate((sels) => sels.map((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, missing: true };
    const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 4).map(Number);
    let bgEl = el, bg = null;
    while (bgEl) {
      const c = rgb(getComputedStyle(bgEl).backgroundColor);
      if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) { bg = c.slice(0, 3); break; }
      bgEl = bgEl.parentElement;
    }
    return { sel, fg: rgb(getComputedStyle(el).color).slice(0, 3), bg: bg || [255, 255, 255] };
  }), selectors);
  return raw.map((r) => r.missing ? r : { sel: r.sel, ratio: +ratio(r.fg, r.bg).toFixed(2) });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.CH || 'msedge', headless: true });
  const report = {};

  // 1. No key: the empty state, with no backend talk anywhere.
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`${BASE}/app/`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/1-nokey.png` });
    report.nokey = { banned: BANNED.test(await p.evaluate(() => document.body.innerText)), errs };
    await p.close();
  }

  // 2. Live: sources, a streamed answer, a citation opened.
  {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(`${BASE}/app/?api=http://127.0.0.1:8001`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    await p.screenshot({ path: `${OUT}/2-live-welcome.png` });
    await p.fill('#composer', 'what is cross validation for?');
    await p.press('#composer', 'Enter');
    await p.waitForTimeout(3800);
    await p.screenshot({ path: `${OUT}/3-answer.png` });
    const marker = p.locator('article[aria-label="KnowlyAI answer"] button[aria-label^="Source"]').first();
    await marker.click();
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/4-citation.png` });
    report.live = {
      sources: await p.locator('nav[aria-label="Sources"] li').count(),
      markers: await p.locator('article[aria-label="KnowlyAI answer"] button[aria-label^="Source"]').count(),
      panel: await p.locator('aside[aria-label="Source passage"]').count(),
      openLink: await p.locator('aside a[href*="/api/documents/"]').getAttribute('href'),
      footerLinks: await p.$$eval('footer nav a', (as) => as.map((a) => a.href)),
      contrast: await contrastOf(p, [
        'h2.type-label', 'footer nav a', 'article[aria-label="Your question"] div',
        'article[aria-label="KnowlyAI answer"] p', 'time', '#composer + div p',
        'aside blockquote', 'aside p.type-label',
      ]),
      banned: BANNED.test(await p.evaluate(() => document.body.innerText)),
      errs,
    };

    // 3. Dark theme, same conversation.
    await p.click('button[aria-label="Switch to dark theme"]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/5-dark.png` });
    report.dark = {
      contrast: await contrastOf(p, [
        'h2.type-label', 'article[aria-label="KnowlyAI answer"] p', 'time', 'aside blockquote',
      ]),
    };
    await p.click('button[aria-label="Switch to light theme"]');
    await p.close();
  }

  // 4. Phone.
  {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(`${BASE}/app/?api=http://127.0.0.1:8001`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/6-phone.png` });
    await p.click('button[aria-label="Open sources"]');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/7-phone-sources.png` });
    report.phone = { overflowX: await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
    await p.close();
  }

  // 5. The pages point at each other.
  {
    const p = await browser.newPage();
    await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const landing = await p.$$eval('a.cta, a.close__cta, a.close__alt', (as) => as.map((a) => a.href));
    await p.goto(`${BASE}/console.html`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    const consoleCta = await p.$eval('#cta', (a) => a.href);
    const status = {};
    for (const url of [...new Set([...landing, consoleCta, ...report.live.footerLinks])]) {
      const r = await p.request.get(url.split('#')[0]);
      status[url] = r.status();
    }
    report.links = status;
    await p.close();
  }

  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
