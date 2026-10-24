// Click-through translation checks. Run ONLY on a throwaway database at port 3100.
// DATA_DIR=<temp> PORT=3100 node server.js
// node docs/qa/i18n-e2e.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3100';
const url = new URL(BASE);
assert(['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '3100', 'Use the temporary database server on localhost:3100 only');
const OUT = process.env.OUT || 'docs/screens/i18n';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
const pageErrors = [];
const sourceTextNotes = [];

async function noThaiUi(page, selector, lang) {
  if (lang === 'th') return;
  const leaks = await page.locator(selector).evaluate((root) => {
    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const el = node.parentElement;
      if (!el || !el.checkVisibility() || el.closest('[lang="th"], .ticket:not(.ticket--booking)')) continue;
      const text = node.textContent.trim();
      if (/[\u0e01-\u0e3a\u0e40-\u0e5b]/.test(text) && !/^(TH · )?ไทย$/.test(text)) found.push(text);
    }
    for (const el of root.querySelectorAll('[aria-label], [placeholder]')) {
      if (!el.checkVisibility() || el.closest('[lang="th"], .ticket:not(.ticket--booking)')) continue;
      for (const attr of ['aria-label', 'placeholder']) {
        const text = el.getAttribute(attr) || '';
        if (/[\u0e01-\u0e3a\u0e40-\u0e5b]/.test(text) && !/^(TH · )?ไทย$/.test(text)) found.push(`${attr}: ${text}`);
      }
    }
    return found;
  });
  // Two existing seed-data translations contain Thai fragments. Record these
  // precisely; all other Thai UI text still fails. No seed/real DB is rewritten.
  const sourceFragments = {
    zh: 'โยเดีย历史文化精品酒店（Yodia Heritage Hotel）',
    ja: 'ワット・ヤイ横のプッタบูチャー通りにある名物店。川辺で足を垂らして座り、スコータイ風トムヤム麺や軟骨スペアリブ麺を味わえます。'
  };
  const sourceText = sourceFragments[lang];
  if (sourceText && leaks.some((text) => text.includes(sourceText))) {
    const note = `${lang} seed text contains Thai in ${selector}: ${sourceText}`;
    if (!sourceTextNotes.includes(note)) sourceTextNotes.push(note);
  }
  assert.deepEqual(leaks.filter((text) => /[\u0e01-\u0e3a\u0e40-\u0e5b]/.test(sourceText ? text.replaceAll(sourceText, '') : text)), [], `${lang} Thai UI leaks in ${selector}`);
}

try {
  for (const lang of ['th', 'en', 'zh', 'ja', 'ko', 'fr']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (err) => pageErrors.push(`${lang}: ${err.message}`));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-dir-menu]');
    if (lang === 'th') {
      await page.click('#lang-btn');
      await page.click('[data-app-lang="en"]');
    }
    await page.click('#lang-btn');
    await page.click(`[data-app-lang="${lang}"]`);
    assert.equal(await page.getAttribute('html', 'lang'), lang);
    assert.equal(await page.evaluate(() => localStorage.getItem('phitlok_lang')), lang);
    await noThaiUi(page, '#view-tourist', lang);
    await page.click('#open-cart');
    await noThaiUi(page, '#cart-body', lang);
    await page.click('#cart-body [data-close]');

    for (const category of ['restaurant', 'hotel']) {
      const hotel = category === 'hotel';
      await page.locator(`[data-dir-cat="${category}"] [data-dir-menu]`).first().click();
      const result = hotel ? '#stay-result' : '#menu-result';
      await page.waitForSelector(`${result} [data-add]`);
      await noThaiUi(page, result, lang);
      if (!hotel) {
        await page.click('#menu-result [data-filter="nopeanut"]');
        await noThaiUi(page, '#menu-result', lang);
        await page.click('#menu-result [data-filter="all"]');
      }
      await page.locator(`${result} [data-add]`).first().click();
      await page.click('#open-cart');
      await page.waitForSelector('#cart-quote table');
      if (hotel) {
        await page.selectOption('#bk-nights', '3');
        await page.selectOption('#bk-guests', '2'); // the cheapest room is a twin for 2
        await page.fill('#bk-note', 'Late arrival 18:00');
        await page.waitForFunction(() => document.querySelector('#cart-ticket')?.textContent.includes('Late arrival 18:00'));
        assert.equal(await page.locator('#cart-table-input').count(), 0);
        assert.equal(await page.locator('#cart-body .flag-list').count(), 0);
        assert.equal(await page.getAttribute('#cart-ticket .ticket--booking', 'lang'), lang);
        if (lang !== 'th') assert(await page.locator('#cart-ticket [lang="th"]').count() > 0);
      } else {
        assert.equal(await page.inputValue('#cart-table-input'), lang === 'th' ? 'โต๊ะ 4 / สั่งล่วงหน้า' : '');
        await page.check('[data-flag="no_peanut"]');
        await page.waitForSelector('#cart-ticket .ticket__warn');
        assert.equal(await page.getAttribute('#cart-ticket .ticket', 'lang'), 'th');
      }
      await noThaiUi(page, '#cart-body', lang);
      await page.screenshot({ path: `${OUT}/${lang}-${category}-cart.png` });
      const checkoutResponse = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/checkout' && r.request().method() === 'POST');
      await page.click('#cart-body [data-pay]:not([disabled])');
      const checkout = await checkoutResponse;
      const request = checkout.request().postDataJSON();
      assert.equal(request.guestLang, lang);
      if (!hotel) assert.equal(request.tableTh, 'โต๊ะ 4 / สั่งล่วงหน้า');
      await page.waitForSelector('#pay-body [data-confirm]');
      await noThaiUi(page, '#pay-body', lang);
      assert.match(await page.textContent('#pay-countdown'), /^\d{2}:\d{2}$/);
      const paidResponse = page.waitForResponse((r) => /\/api\/checkout\/[^/]+\/confirm$/.test(new URL(r.url()).pathname));
      await page.click('#pay-body [data-confirm]');
      await page.waitForSelector('#pay-body .success-hero');
      const paid = await (await paidResponse).json();
      if (hotel && lang !== 'th') {
        const staffSlip = await page.evaluate(async (ticket) => {
          const { state } = await import('/js/core.js');
          const { setUiLang } = await import('/js/i18n.js');
          const { renderTicket } = await import('/js/menu.js');
          const previous = state.lang;
          try {
            state.lang = 'th'; setUiLang('th');
            const root = document.createElement('div');
            root.innerHTML = renderTicket(ticket);
            return { lang: root.querySelector('.ticket').lang, thai: !!root.querySelector('[lang="th"]'), name: root.querySelector('.ticket__th').textContent };
          } finally { state.lang = previous; setUiLang(previous); }
        }, paid.order.ticket);
        assert.equal(staffSlip.lang, lang);
        assert(staffSlip.thai);
        assert(staffSlip.name.includes(paid.order.ticket.rooms[0].nameGuest));
      }
      assert.match(await page.textContent('#pay-title'), hotel ? /BK-\d+/ : /PN-\d+/);
      await noThaiUi(page, '#pay-body', lang);
      assert.equal(await page.locator('#pay-body .ticket--booking').count(), hotel ? 1 : 0);
      if (!hotel) assert.match(await page.textContent('#pay-body .ticket__warn'), /ถั่วลิสง/);
      await page.screenshot({ path: `${OUT}/${lang}-${category}-success.png` });
      await page.click('#pay-body [data-close]');
      assert(await page.evaluate(() => document.getElementById('cart-count').hidden));
      results.push(`PASS ${lang}: ${category} menu → cart → payment → ${hotel ? 'bilingual booking' : 'Thai kitchen ticket'}`);
      console.log(results.at(-1));
    }
    // Exercise the shared VIP checkout and translated voucher receipt.
    await page.evaluate(async () => {
      const { emit } = await import('/js/core.js');
      emit('checkout:start', { type: 'vip_pass' });
    });
    await page.waitForSelector('#pay-body [data-confirm]');
    await noThaiUi(page, '#pay-body', lang);
    await page.click('#pay-body [data-confirm]');
    await page.waitForSelector('#pay-body .coupon-card');
    await noThaiUi(page, '#pay-body', lang);
    await page.click('#pay-body [data-close]');
    results.push(`PASS ${lang}: VIP checkout and vouchers`);
    console.log(results.at(-1));
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getAttribute('html', 'lang'), lang);
    await context.close();
  }
  assert.deepEqual(pageErrors, [], 'Browser runtime errors');
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, pageErrors, sourceTextNotes }, null, 2));
  for (const note of sourceTextNotes) console.log(`SOURCE NOTE: ${note}`);
  console.log(`${results.length} translation journeys passed; no browser runtime errors.`);
} finally {
  await browser.close();
}
