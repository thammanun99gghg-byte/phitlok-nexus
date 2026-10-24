// Full click-through of every PHITLOK NEXUS system against a throwaway server (port 3100, temp DB).
// Run against a throwaway server so test purchases never touch the real data:
//   DATA_DIR=<temp folder> PORT=3100 node server.js   then   node docs/qa/e2e.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3100';
const OUT = process.env.OUT || 'docs/screens/e2e';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const consoleProblems = [];

async function step(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, String(e.message || e).split('\n')[0].slice(0, 220)]); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

function watch(page, tag) {
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/swiftshader|GroupMarker|WebGL|GPU stall/i.test(m.text())) consoleProblems.push(`[${tag}] ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => consoleProblems.push(`[${tag}] pageerror ${e.message.slice(0, 160)}`));
  page.on('dialog', (d) => d.accept());
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
watch(page, 'desktop');

// ---------------------------------------------------------------- home
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await step('Home: hero headline + 3 photo columns (up/down/up)', async () => {
  expect((await page.textContent('#hero-title')).includes('เที่ยวพิษณุโลก') && await page.locator('#hero-rotator').count() === 1 && await page.locator('.hero-lang').count() === 6, 'headline');
  expect(await page.locator('.film__col').count() === 3, '3 columns');
  const ys = () => page.evaluate(() => [...document.querySelectorAll('.film__reel')].map((r) => new DOMMatrix(getComputedStyle(r).transform).m42));
  const a = await ys(); await page.waitForTimeout(800); const c = await ys();
  expect(c[0] < a[0] && c[1] > a[1] && c[2] < a[2], `directions ${a} -> ${c}`);
});
await step('Home: pause button stops the reel', async () => {
  await page.click('#film-toggle'); await page.mouse.move(2, 2);
  const y1 = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.film__reel')).transform).m42);
  await page.waitForTimeout(600);
  const y2 = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.film__reel')).transform).m42);
  expect(Math.abs(y2 - y1) < 0.5, 'still moving while paused');
  await page.click('#film-toggle');
});
await step('Home: theme toggle switches to dark and back', async () => {
  await page.click('#theme-toggle');
  expect(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'not dark');
  await page.click('#theme-toggle');
  expect(await page.evaluate(() => document.documentElement.dataset.theme) === 'light', 'not light');
});
await step('Home: VIP upgrade dialog buy → active → reopen shows member view', async () => {
  await page.click('#header-vip-btn');
  await page.waitForSelector('[data-vip-confirm]:not([disabled])', { timeout: 10000 });
  await page.click('[data-vip-confirm]');
  await page.waitForSelector('.vip-modal__success', { timeout: 10000 });
  await page.click('#vip-upgrade-dialog [data-vip-close]');
  await page.click('#header-vip-btn');
  await page.waitForSelector('[data-vip-go-lens]', { timeout: 10000 });
  expect((await page.textContent('#vip-modal-title')).includes('สมาชิก VIP'), 'member view');
  await page.click('#vip-upgrade-dialog [data-vip-close]');
});

// ---------------------------------------------------------------- tourist: map
await page.goto(BASE + '/app#tourist', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await step('Map: 3D canvas renders labels', async () => {
  expect(await page.locator('#map-labels .map-label').count() >= 13, 'labels');
});
await step('Map: hotel chip hides hotel labels and directory cards, then restores', async () => {
  await page.click('[data-map-layer="hotel"]');
  await page.waitForTimeout(300);
  const vis = await page.evaluate(() => [...document.querySelectorAll('.map-label--hotel')].filter((l) => getComputedStyle(l).visibility !== 'hidden').length);
  expect(vis === 0, `${vis} hotel labels visible`);
  expect(await page.locator('[data-dir-cat="hotel"][hidden]').count() === 3, 'directory not filtered');
  await page.click('[data-map-layer="hotel"]');
});
await step('Map: legend opens/closes, reset view works', async () => {
  await page.click('#map-legend-toggle');
  expect(await page.isVisible('#map-legend'), 'legend hidden');
  await page.click('#map-legend-toggle');
  expect(!(await page.isVisible('#map-legend')), 'legend still open');
  await page.click('#map-reset');
});
await step('Map: fullscreen enter and exit', async () => {
  await page.click('#map-fullscreen');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.querySelector('.map-layout').classList.contains('is-fullscreen')), 'not fullscreen');
  await page.click('#map-fullscreen');
  await page.waitForTimeout(500);
  expect(!(await page.evaluate(() => document.querySelector('.map-layout').classList.contains('is-fullscreen'))), 'still fullscreen');
});
await step('Map: clicking a label opens its place card', async () => {
  await page.evaluate(() => document.querySelector('#map-labels .map-label--heritage').click());
  await page.waitForTimeout(400);
  expect((await page.textContent('#map-card h3')).length > 3, 'card empty');
});
await step('Map card: switching language to English updates the card', async () => {
  const btn = page.locator('#map-card [data-card-lang="en"]');
  if (await btn.count()) { await btn.first().click(); await page.waitForTimeout(400); }
  expect(/[A-Za-z]{4,}/.test(await page.textContent('#map-card h3')), 'not English');
  const th = page.locator('#map-card [data-card-lang="th"]');
  if (await th.count()) await th.first().click();
});

// ---------------------------------------------------------------- tourist: lens
await step('Lens: heritage scan (Wat Yai) returns a 6-language result', async () => {
  await page.click('[data-heritage-preset="wat-yai"]');
  await page.waitForSelector('#heritage-result .heritage-body', { timeout: 20000 });
  expect(await page.locator('#heritage-result [data-audio="summary"]').count() === 1, 'no audio button');
});
await step('Lens: VIP member can request the full audio guide', async () => {
  const r = await page.evaluate(async () => {
    const id = localStorage.getItem('phitlok.visitor');
    const res = await fetch('/api/audio-guide/wat-yai?lang=th&mode=full', { headers: { 'x-visitor-id': id } });
    return res.status;
  });
  expect(r === 200, `status ${r}`);
});

// ---------------------------------------------------------------- restaurant order
async function openMenu(cat) {
  await page.evaluate((c) => document.querySelector(`[data-dir-cat="${c}"] [data-dir-menu]`).click(), cat);
  await page.waitForSelector('#menu-result [data-add]', { timeout: 15000 });
}
await step('Food order: add dish → cart has table field + dietary flags, no booking form', async () => {
  await openMenu('restaurant');
  await page.evaluate(() => document.querySelector('#menu-result [data-add]').click());
  await page.click('#open-cart');
  await page.waitForSelector('#cart-quote table', { timeout: 10000 });
  expect(await page.locator('#cart-table-input').count() === 1, 'no table field');
  expect(await page.locator('#cart-body .flag-list').count() === 1, 'no dietary flags');
  expect(await page.locator('#bk-checkin').count() === 0, 'booking form on a food order');
  expect((await page.textContent('#cart-body .eyebrow')).includes('สั่งอาหาร'), 'eyebrow');
});
await step('Food order: peanut flag → pay → kitchen ticket PN- with red allergy banner', async () => {
  await page.check('#cart-body [data-flag="no_peanut"]');
  await page.waitForTimeout(600);
  await page.click('#cart-body [data-pay]:not([disabled])');
  await page.waitForSelector('#pay-body [data-confirm]', { timeout: 10000 });
  await page.click('#pay-body [data-confirm]');
  await page.waitForSelector('#pay-body .success-hero', { timeout: 10000 });
  const title = await page.textContent('#pay-title');
  expect(/ออเดอร์ PN-\d+/.test(title), title);
  expect(await page.locator('#pay-body .ticket__warn').count() >= 1, 'no allergy banner');
  expect(await page.locator('#pay-body .ticket--booking').count() === 0, 'booking slip on food order');
  await page.click('#pay-body [data-close]');
  expect(await page.evaluate(() => document.getElementById('cart-count').hidden), 'cart not cleared');
});

// ---------------------------------------------------------------- hotel booking
await step('Hotel booking: cart shows stay form only (no table, no food flags)', async () => {
  await openMenu('hotel');
  await page.evaluate(() => document.querySelector('#menu-result [data-add]').click());
  await page.click('#open-cart');
  await page.waitForSelector('#cart-quote table', { timeout: 10000 });
  expect(await page.locator('#cart-table-input').count() === 0, 'table field on hotel booking');
  expect(await page.locator('#cart-body .flag-list').count() === 0, 'food flags on hotel booking');
  expect(await page.locator('#bk-checkin').count() === 1, 'no check-in field');
  expect((await page.textContent('#cart-body .eyebrow')).trim() === 'จองห้องพัก', 'eyebrow');
  expect(!(await page.textContent('#cart-body')).includes('โต๊ะ'), 'mentions a table');
});
await step('Hotel booking: 2 rooms × 3 nights priced correctly, dates on slip preview', async () => {
  await page.click('#cart-body [data-qty="0"][data-d="1"]');
  await page.waitForSelector('#bk-nights');
  const future = await page.evaluate(() => { const d = new Date(Date.now() + 7 * 3600000); d.setUTCDate(d.getUTCDate() + 5); return d.toISOString().slice(0, 10); });
  await page.fill('#bk-checkin', future);
  await page.dispatchEvent('#bk-checkin', 'change');
  await page.selectOption('#bk-nights', '3');
  await page.selectOption('#bk-guests', '4'); // 2 twin rooms × 2 guests
  await page.fill('#bk-note', 'ขอห้องติดกัน');
  await page.waitForTimeout(900);
  const row = await page.textContent('#cart-quote table');
  expect(row.includes('× 2 ห้อง × 3 คืน'), `breakdown: ${row.slice(0, 120)}`);
  const slip = await page.textContent('#cart-ticket');
  expect(slip.includes('เช็คอิน') && slip.includes('เช็คเอาต์') && slip.includes('3 คืน · 4 ท่าน') && slip.includes('ขอห้องติดกัน'), `slip: ${slip.slice(0, 160)}`);
});
await step('Hotel booking: past check-in date is reset to today', async () => {
  await page.fill('#bk-checkin', '2020-01-01');
  await page.dispatchEvent('#bk-checkin', 'change');
  const today = await page.evaluate(() => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10));
  expect(await page.inputValue('#bk-checkin') === today, 'past date kept');
  await page.waitForTimeout(600);
  expect(!(await page.isDisabled('#cart-body [data-pay]')), 'pay disabled');
});
await step('Hotel booking: pay → booking slip BK- (no kitchen banner, no table)', async () => {
  await page.click('#cart-body [data-pay]:not([disabled])');
  await page.waitForSelector('#pay-body [data-confirm]', { timeout: 10000 });
  expect((await page.textContent('#pay-title')).startsWith('จองห้องพักโรงแรม'), 'pay title');
  await page.click('#pay-body [data-confirm]');
  await page.waitForSelector('#pay-body .success-hero', { timeout: 10000 });
  const title = await page.textContent('#pay-title');
  expect(/จองห้องพักสำเร็จ · ใบจอง BK-\d+/.test(title), title);
  expect(await page.locator('#pay-body .ticket--booking').count() === 1, 'no booking slip');
  expect(await page.locator('#pay-body .ticket__warn').count() === 0, 'kitchen banner on booking');
  expect(!(await page.textContent('#pay-body')).includes('โต๊ะ'), 'mentions a table');
  await page.screenshot({ path: `${OUT}/e2e-booking-success.png` });
  await page.click('#pay-body [data-close]');
});
await step('Cart switch: food → hotel → food never leaks table/booking fields', async () => {
  await openMenu('restaurant');
  await page.evaluate(() => document.querySelector('#menu-result [data-add]').click());
  await openMenu('hotel');
  await page.evaluate(() => document.querySelector('#menu-result [data-add]').click());
  await page.click('#open-cart');
  await page.waitForSelector('#cart-quote table', { timeout: 10000 });
  expect(await page.locator('#bk-checkin').count() === 1 && await page.locator('#cart-table-input').count() === 0, 'hotel cart wrong');
  await page.click('#cart-body [data-close]');
  await openMenu('restaurant');
  await page.evaluate(() => document.querySelector('#menu-result [data-add]').click());
  await page.click('#open-cart');
  await page.waitForSelector('#cart-quote table', { timeout: 10000 });
  expect(await page.locator('#bk-checkin').count() === 0, 'booking form leaked into food cart');
  expect((await page.inputValue('#cart-table-input')).includes('โต๊ะ'), 'table default missing');
  await page.click('#cart-body [data-clear]');
  await page.click('#cart-body [data-close]');
});

// ---------------------------------------------------------------- wallet + saas
await step('Wallet: coupons dialog opens and closes', async () => {
  await page.click('#open-wallet');
  await page.waitForSelector('#wallet-dialog[open]');
  await page.click('#wallet-body [data-close]');
});
await step('SaaS sign-up: choose "shop", empty form shows errors; full form with pin + documents pays and pins the shop', async () => {
  await page.click('#header-signup-btn');
  await page.waitForSelector('#signup-dialog[open]');
  await page.click('[data-signup-type="shop"]');
  await page.evaluate(() => document.querySelector('[data-set="shop"] [type="submit"]').click());
  expect(((await page.textContent('#err-shopName')) || '').length > 0, 'no validation error');
  expect(((await page.textContent('[data-set="shop"] [data-err="pin"]')) || '').length > 0, 'pin not required');
  const doc = { name: 'doc.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') };
  await page.fill('#f-shop', 'ร้านทดสอบระบบริมน่าน');
  await page.selectOption('#s-price', '2');
  await page.fill('#s-highlight', 'ก๋วยเตี๋ยว');
  await page.fill('#s-seats', '20');
  await page.fill('#s-address', '12 ถ.พุทธบูชา');
  await page.fill('#s-subdistrict', 'ในเมือง');
  await page.fill('#s-postcode', '65000');
  await page.fill('#s-pin-lat', '16.82110');
  await page.fill('#s-pin-lng', '100.26300');
  await page.press('#s-pin-lng', 'Tab');
  expect((await page.inputValue('#s-district')) === 'mueang', 'pin did not set the district');
  await page.fill('#f-owner', 'ผู้ทดสอบ ระบบ');
  await page.fill('#s-idcard', '1101700230708');
  await page.fill('#f-phone', '0812345678');
  await page.fill('#s-email', 'shop@example.com');
  await page.fill('#s-ppId', '0812345678');
  await page.selectOption('#s-bank', { index: 1 });
  await page.fill('#s-accNo', '1234567890');
  await page.fill('#s-accName', 'ผู้ทดสอบ ระบบ');
  await page.check('[name="foodLicense"][value="has"]');
  for (const id of ['#s-doc-id', '#s-doc-bank', '#s-doc-front', '#s-doc-menu']) await page.setInputFiles(id, doc);
  await page.check('[data-set="shop"] [name="termsConsent"]');
  await page.check('#f-pdpa');
  await page.evaluate(() => document.querySelector('[data-set="shop"] [type="submit"]').click());
  await page.waitForSelector('#pay-body [data-confirm]', { timeout: 10000 });
  await page.click('#pay-body [data-confirm]');
  await page.waitForSelector('#pay-body .success-hero', { timeout: 10000 });
  expect((await page.textContent('#pay-title')).includes('ยินดีต้อนรับ'), 'no welcome');
  await page.click('#pay-body [data-close]');
});

// ---------------------------------------------------------------- merchant portal
await page.goto(BASE + '/app#merchant', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
async function selectMerchant(match) {
  const value = await page.evaluate((m) => [...document.querySelectorAll('#merchant-select option')].find((o) => o.textContent.includes(m))?.value, match);
  expect(value, `no merchant option ${match}`);
  await page.selectOption('#merchant-select', value);
  await page.waitForTimeout(1500);
}
await step('Hotel screen: bookings show stay slip and hotel actions', async () => {
  await selectMerchant('โยเดีย');
  const kpi = await page.textContent('#merchant-kpis');
  expect(kpi.includes('การจองวันนี้'), 'kpi wording');
  const card = page.locator('#merchant-orders .order-card').first();
  expect(await card.locator('.ticket--booking').count() === 1, 'not a booking slip');
  expect((await card.textContent()).includes('ยืนยันการจอง'), 'no confirm action');
  expect(!(await card.textContent()).includes('โต๊ะ'), 'table on hotel card');
});
await step('Hotel screen: confirm → check-in moves the booking forward', async () => {
  const id = await page.getAttribute('#merchant-orders [data-advance]', 'data-advance');
  await page.click(`#merchant-orders [data-advance="${id}"]`);
  await page.waitForTimeout(1200);
  const txt = await page.textContent(`#merchant-orders`);
  expect(txt.includes('ยืนยันห้องแล้ว'), 'status not updated');
});
await step('Restaurant screen: kitchen ticket + accept order', async () => {
  await selectMerchant('ห้อยขา');
  const card = page.locator('#merchant-orders .order-card').first();
  expect(await card.locator('.ticket--booking').count() === 0, 'booking slip in kitchen');
  expect((await card.textContent()).includes('รับออเดอร์'), 'no accept action');
  const id = await page.getAttribute('#merchant-orders [data-advance]', 'data-advance');
  await page.click(`#merchant-orders [data-advance="${id}"]`);
  await page.waitForTimeout(1200);
});
await step('Restaurant screen: shop busy/open toggle and sold-out toggle', async () => {
  await page.click('[data-m-tab="gps"]');
  await page.click('[data-shop-status="busy"]');
  await page.waitForTimeout(800);
  expect(await page.getAttribute('[data-shop-status="busy"]', 'aria-pressed') === 'true', 'busy not set');
  await page.click('[data-shop-status="open"]');
  await page.waitForTimeout(800);
  await page.click('[data-m-tab="menu"]');
  const t = page.locator('[data-toggle-item]').first();
  await t.click(); await page.waitForTimeout(800); await page.locator('[data-toggle-item]').first().click(); await page.waitForTimeout(500);
});

// ---------------------------------------------------------------- admin
await page.goto(BASE + '/app#admin', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await step('Admin: revenue / partners / calculator tabs switch panels', async () => {
  for (const t of ['partners', 'calc', 'revenue']) {
    await page.click(`#admin-tab-${t}`);
    expect(await page.isVisible(`#admin-panel-${t}`), `${t} panel hidden`);
  }
});

// ---------------------------------------------------------------- other pages
await step('Credits page lists every photo source', async () => {
  await page.goto(BASE + '/credits', { waitUntil: 'networkidle' });
  const t = await page.textContent('#photos');
  expect(t.includes('พระพุทธชินราช') && t.includes('ศาลสมเด็จพระนเรศวร'), 'missing credit rows');
});
await step('Unknown URL shows the 404 page', async () => {
  const r = await page.goto(BASE + '/no-such-page');
  expect(r.status() === 404, `status ${r.status()}`);
});

// ---------------------------------------------------------------- mobile
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await m.newPage();
watch(mp, 'mobile');
await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
await step('Mobile: menu opens and contains the VIP item', async () => {
  await mp.tap('#menu-toggle');
  expect(await mp.isVisible('#mobile-nav [data-open-vip-modal]'), 'no VIP item');
  await mp.tap('#menu-toggle');
});
await step('Mobile: hero buttons are tappable over the moving photos', async () => {
  const ok = await mp.evaluate(() => [...document.querySelectorAll('.w-hero__cta a')].every((el) => { const q = el.getBoundingClientRect(); const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return el === hit || el.contains(hit); }));
  expect(ok, 'buttons covered');
});
await mp.goto(BASE + '/app#tourist', { waitUntil: 'networkidle' });
await mp.waitForTimeout(1500);
await step('Mobile: hotel booking form fits the screen', async () => {
  await mp.evaluate(() => document.querySelector('[data-dir-cat="hotel"] [data-dir-menu]').click());
  await mp.waitForSelector('#menu-result [data-add]', { timeout: 15000 });
  await mp.evaluate(() => document.querySelector('#menu-result [data-add]').click());
  await mp.evaluate(() => document.getElementById('open-cart').click());
  await mp.waitForSelector('#bk-checkin');
  await mp.waitForTimeout(600);
  const r = await mp.evaluate(() => { const d = document.querySelector('#cart-dialog'); return { sw: d.scrollWidth, cw: d.clientWidth, vw: innerWidth, w: d.getBoundingClientRect().width }; });
  expect(r.sw <= r.cw + 1 && r.w <= r.vw, JSON.stringify(r));
  await mp.screenshot({ path: `${OUT}/e2e-mobile-booking.png`, fullPage: false });
});

await b.close();
for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? `→ ${r[2]}` : '');
console.log(`\n${results.filter((r) => r[0] === 'PASS').length}/${results.length} passed`);
console.log(consoleProblems.length ? `console problems:\n${[...new Set(consoleProblems)].join('\n')}` : 'console: clean');
