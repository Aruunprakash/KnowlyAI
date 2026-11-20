const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const out = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto('http://localhost:4512/', { waitUntil: 'networkidle' });
    await p.waitForSelector('html.sc-ready'); await p.waitForTimeout(600);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    // scroll to the redaction's held end state
    const y = await p.evaluate(() => { const a = document.getElementById('redaction'); return a.offsetTop + (a.offsetHeight - innerHeight) * 0.97; });
    await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(900);
    const bar = p.locator('.rx-s--x').first();
    const before = await p.evaluate(() => ({ tally: document.querySelector('.rx-tally').innerText.replace(/\s+/g, ' '), focusable: [...document.querySelectorAll('.rx-s--x')].map(e => e.tabIndex) }));
    await bar.click(); await p.waitForTimeout(250);
    const clicked = await p.evaluate(() => ({ pressed: document.querySelector('.rx-s--x').getAttribute('aria-pressed'), foot: document.getElementById('rx-foot').innerText }));
    if (w === 1440) await p.screenshot({ path: 'lab/live/lift.png' });
    await bar.press('Escape'); await p.waitForTimeout(100);
    await p.locator('.rx-s--x').nth(1).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    const keyed = await p.evaluate(() => document.querySelectorAll('.rx-s--x')[1].getAttribute('aria-pressed'));
    out[w] = { overflow, before, clicked, keyed, errs };
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
