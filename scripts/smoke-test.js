'use strict';
/*
 * End-to-end smoke test against a throwaway database — PHITLOK NEXUS v2.0
 * Usage: npm test
 */
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'phitlok-test-'));
delete process.env.GEMINI_API_KEY; // exercise the deterministic fallback path

const app = require('../server');
const { crc16, buildPayload } = require('../src/promptpay');

const VISITOR = '0b6f6a2e-1c1d-4e1f-9a5b-2f3c4d5e6f70';
let base;
let passed = 0;

async function call(method, url, { body, form, headers = {} } = {}) {
  const h = { 'x-visitor-id': VISITOR, ...headers };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + url, { method, headers: h, body: payload });
  let json = null;
  try { json = await res.json(); } catch { /* static */ }
  return { status: res.status, json, headers: res.headers };
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

const PNG_1PX = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b40000000049454e44ae426082', 'hex');

(async () => {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  console.log(`PHITLOK NEXUS v2.0 smoke test → ${base}\n`);

  await test('PromptPay CRC16-CCITT matches reference vector ("123456789" → 29B1)', () => {
    assert.equal(crc16('123456789'), '29B1');
    const p = buildPayload('0812345678', 9900);
    assert.match(p, /^000201010212/);
    assert.ok(p.includes('01130066812345678'));
    assert.ok(p.includes('540599.00'));
    assert.equal(crc16(p.slice(0, -4)), p.slice(-4));
  });

  await test('Every data-lucide icon name exists in the pinned lucide 0.460.0', () => {
    // Mirrors lucide's own toPascalCase: it lowercases everything after the first letter of each part,
    // so "TrendingUp" becomes "Trendingup" and is not found — kebab-case ("trending-up") is required.
    const known = new Set(require('./data/lucide-0.460.0-icons.json').icons);
    const toPascal = (s) => s.replace(/(\w)(\w*)(_|-|\s*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase());
    const files = [];
    (function walk(dir) {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) { if (f !== 'assets') walk(p); } else if (/\.(html|js)$/.test(f)) files.push(p);
      }
    })(path.join(__dirname, '..', 'public'));
    const bad = [];
    let checked = 0;
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      for (const [, value] of src.matchAll(/data-lucide="([^"]+)"/g)) {
        // Template expressions such as ${isHotel ? 'bed' : 'utensils'} contribute each quoted literal.
        const names = value.includes('${') ? [...value.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]) : [value];
        for (const n of names) {
          checked++;
          if (!known.has(toPascal(n))) bad.push(`${path.relative(process.cwd(), f)}: ${n}`);
        }
      }
    }
    assert.ok(checked > 0, 'found no data-lucide attributes to check');
    assert.deepEqual(bad, [], `unknown lucide icons: ${bad.join(', ')}`);
  });

  await test('GET / serves the app with security headers', async () => {
    const r = await fetch(base + '/');
    assert.equal(r.status, 200);
    assert.ok(r.headers.get('content-security-policy').includes("default-src 'self'"));
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-powered-by'), null);
  });

  await test('All main HTML routes (/, /app, /app.html, /credits, /credits.html) return 200 OK with Light/Dark theme toggle & no empty "–" metrics', async () => {
    for (const [url, marker] of [
      ['/', 'w-hero'],
      ['/app', 'map-canvas'],
      ['/app.html', 'map-canvas'],
      ['/credits', 'sources-title'],
      ['/credits.html', 'sources-title']
    ]) {
      const r = await fetch(base + url);
      assert.equal(r.status, 200, url);
      const html = await r.text();
      assert.ok(html.includes(marker), `${url} contains ${marker}`);
      assert.ok(html.includes('id="theme-toggle"'), `${url} contains Light/Dark theme toggle button`);
      assert.ok(html.includes('lucide@0.460.0'), `${url} pins lucide@0.460.0 instead of @latest`);
      assert.ok(!html.includes('lucide@latest'), `${url} does not use lucide@latest`);
    }
    const homeHtml = await (await fetch(base + '/')).text();
    assert.ok(homeHtml.includes('13 แห่ง') && homeHtml.includes('ข้อมูลสาธิต'), 'Home stats strip labels demo data');
    assert.ok(homeHtml.includes('id="hero-confirmed">8 แห่ง<'), 'Home confirmed partners shows 8 แห่ง (not 0)');
    assert.ok(homeHtml.includes('id="header-vip-btn"'), 'Home header has VIP upgrade button');
    assert.ok(homeHtml.includes('id="scroll-cue"'), 'Home has floating scroll cue');
    assert.ok(!/<dd[^>]*>–<\/dd>/.test(homeHtml), 'No empty dash in home page <dd> stats');
    // v2.4 X1/X3: no coordinates on the home hero; the hero shows Phra Phuttha Chinnarat with an on-image credit.
    assert.ok(!homeHtml.includes('GPS: 16.8239, 100.2624'), 'Home hero has no GPS coordinate chip');
    assert.ok(homeHtml.includes('/assets/photos/phra-phuttha-chinnarat.jpg') && homeHtml.includes('href="/credits#photos"'), 'Home film strip starts with Phra Phuttha Chinnarat and links to the photo credits');
    const creditsPage = await (await fetch(base + '/credits')).text();
    for (const photo of ['Phra_Phuttha_Chinnarat_(I).jpg', 'Wat_Phra_Si_Rattana_Mahathat', 'Chan_Royal_Palace', 'Wat_Nang_Phaya', 'Wat_Ratcha_Burana', 'Phitsanulok_City_Pillar_Shrine_1.jpg', 'King_Naresuan_Shine_-_panoramio.jpg']) {
      assert.ok(creditsPage.includes(photo), `credits page lists the source of ${photo}`);
    }
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'public/assets/photos/phra-phuttha-chinnarat.jpg')), 'Phra Phuttha Chinnarat photo is stored locally');
    const appHtml = await (await fetch(base + '/app')).text();
    assert.ok(appHtml.includes('id="map-labels-toggle"'), '/app has 3D map labels toggle button');
    assert.ok(appHtml.includes('id="header-vip-btn"'), '/app header has VIP upgrade button');
    assert.ok(appHtml.includes('id="scroll-cue"'), '/app has floating scroll cue');
    // The AI badge only appears when a model is really configured (app.js shows it from /api/init-data).
    assert.ok(appHtml.includes('id="ai-badge" hidden'), '/app does not claim AI before the server confirms a model')
    const creditsHtml = await (await fetch(base + '/credits')).text();
    assert.ok(!creditsHtml.includes('ทีม สจล.'), 'credits.html does not claim KMITL team affiliation');
    assert.ok(creditsHtml.includes('สมาชิก 3 คน'), 'credits.html lists 3-member team');
    const missing = await fetch(base + '/does-not-exist');
    assert.equal(missing.status, 404);
  });

  await test('GET /api/init-data → 200 with 13 real pins, partnerStatus="demo", and zero Unsplash stock URLs', async () => {
    const r = await call('GET', '/api/init-data');
    assert.equal(r.status, 200);
    assert.equal(r.json.landmarks.length, 5);
    assert.equal(r.json.merchants.length, 8);
    assert.ok(r.json.merchants.every((m) => m.partnerStatus === 'demo'), 'all merchants start with partnerStatus: demo');
    assert.ok(r.json.menuItems.every((i) => i.isSample === true), 'all seeded menu items marked as sample');
    assert.ok(!JSON.stringify(r.json.merchants).includes('images.unsplash.com'), 'no Unsplash stock photos used as real shop photos');
    assert.ok(!JSON.stringify(r.json.merchants).includes('081234500'), 'no fake 081234500x phone numbers in merchants');
    const cityPillar = r.json.landmarks.find((l) => l.id === 'city-pillar');
    assert.ok(cityPillar, 'city-pillar landmark exists');
    assert.ok(cityPillar.imageUrl.includes('city-pillar.jpg') || cityPillar.imageUrl.includes('Phitsanulok_City_Pillar_Shrine'), 'city-pillar uses authentic Phitsanulok City Pillar Shrine photo');
    assert.ok(!cityPillar.imageUrl.includes('Phra_Phuttha_Chinnarat') && !cityPillar.imageUrl.includes('wat-yai.jpg'), 'city-pillar does not use Phra Phuttha Chinnarat photo');
    assert.equal(r.json.originGps.lat, 16.8228);
    assert.equal(r.json.originGps.lng, 100.2612);
    assert.ok(!JSON.stringify(r.json.merchants).includes('phone'), 'merchant phone numbers are never exposed');
  });

  await test('GET /api/metrics → 200 with 4 revenue streams, 8 active partners, 48 VIP passes, and 340 heritage scans', async () => {
    const r = await call('GET', '/api/metrics');
    assert.equal(r.status, 200);
    assert.equal(r.json.totals.saas.activeMerchants, 8);
    assert.equal(r.json.totals.saas.activeRestaurants, 5);
    assert.equal(r.json.totals.hotelSaas.activeHotels, 3);
    assert.equal(r.json.totals.vip.passesSold, 48);
    assert.equal(r.json.counters.heritageScans, 340);
    assert.equal(r.json.daily.length, 14);
    assert.equal(r.json.partners.length, 8);
  });

  let couponCode;
  await test('POST /api/scan-heritage (preset wat-yai) → OCR + RAG + 6 languages + 15% coupons', async () => {
    const r = await call('POST', '/api/scan-heritage', { body: { preset: 'wat-yai' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.matched, true);
    assert.equal(r.json.landmark.id, 'wat-yai');
    for (const lang of ['th', 'en', 'zh', 'ja', 'ko', 'fr']) {
      assert.ok(r.json.landmark.summary[lang].length > 25, `summary ${lang}`);
    }
    assert.ok(r.json.reward.issued.length >= 2);
    couponCode = r.json.reward.issued.find((c) => c.merchantId === 1).code;
  });

  await test('All 5 heritage presets resolve with Fine Arts Dept references & 6-language audio guide', async () => {
    for (const id of ['wat-yai', 'chan-palace', 'wat-nang-phaya', 'wat-ratchaburana', 'city-pillar']) {
      const r = await call('POST', '/api/scan-heritage', { body: { preset: id } });
      assert.equal(r.status, 200);
      assert.equal(r.json.landmark.id, id);
      assert.ok(r.json.landmark.fineArtsRef);
      for (const lang of ['th', 'en', 'zh', 'ja', 'ko', 'fr']) {
        const g = await call('GET', `/api/audio-guide/${id}?lang=${lang}&mode=summary`);
        assert.equal(g.status, 200);
        assert.ok(g.json.text.length > 30);
      }
    }
  });

  let menu;
  await test('POST /api/scan-menu (preset hoi-kha) → 6-language digital menu with allergen tags', async () => {
    const r = await call('POST', '/api/scan-menu', { body: { preset: 'hoi-kha' } });
    assert.equal(r.status, 200);
    menu = r.json;
    assert.ok(menu.items.some((i) => i.allergens.includes('peanut')));
    assert.ok(menu.items.every((i) => i.name.th && i.name.en && i.name.zh && i.name.ja && i.name.ko && i.name.fr));
  });

  let orderNo;
  await test('POST /api/checkout (order) → 15% coupon + 3% fee, PromptPay QR; confirm creates order with red Thai allergy alert', async () => {
    const before = (await call('GET', '/api/metrics')).json.totals;
    const items = [{ id: menu.items[0].id, qty: 1 }, { id: menu.items[1].id, qty: 2 }];
    const r = await call('POST', '/api/checkout', {
      body: {
        type: 'order',
        merchantId: menu.merchant.id,
        items,
        flags: ['no_peanut'],
        guestLang: 'fr',
        couponCode,
        tableTh: 'โต๊ะ 4 / สั่งล่วงหน้า'
      }
    });
    assert.equal(r.status, 200);
    const sub = menu.items[0].priceSatang + menu.items[1].priceSatang * 2;
    const disc = Math.floor(sub * 0.15);
    const fee = Math.round((sub - disc) * 0.03);
    assert.equal(r.json.breakdown.discountSatang, disc);
    assert.equal(r.json.breakdown.feeSatang, fee);
    assert.equal(r.json.amountSatang, sub - disc + fee);
    assert.equal(r.json.demoMode, true);
    assert.equal(r.json.qr.playable, false, 'Without DEMO_PROMPTPAY_ID, no payable QR is generated');
    assert.equal(r.json.qr.dataUrl, null);
    assert.equal(r.json.qr.target, 'QR ตัวอย่าง ห้ามโอนเงิน');
    const c = await call('POST', `/api/checkout/${r.json.checkoutId}/confirm`);
    assert.equal(c.status, 200);
    orderNo = c.json.order.orderNo;
    assert.equal(c.json.order.ticket.tableTh, 'โต๊ะ 4 / สั่งล่วงหน้า');
    assert.ok(c.json.order.ticket.warningsTh[0].includes('แพ้ถั่วลิสง'));
    const after = (await call('GET', '/api/metrics')).json.totals;
    assert.equal(after.orders.count, before.orders.count + 1);
  });

  await test('Merchant Portal: status toggle (open/busy) and 1-click menu item out-of-stock toggle work', async () => {
    const st1 = await call('POST', '/api/merchants/1/status', { body: { shopStatus: 'busy' } });
    assert.equal(st1.status, 200);
    assert.equal(st1.json.shopStatus, 'busy');
    const st2 = await call('POST', '/api/merchants/1/status', { body: { shopStatus: 'open' } });
    assert.equal(st2.status, 200);
    assert.equal(st2.json.shopStatus, 'open');

    const itemId = menu.items[0].id;
    const t1 = await call('POST', `/api/merchants/1/menu/${itemId}/toggle`, { body: { available: false } });
    assert.equal(t1.status, 200);
    assert.equal(t1.json.available, false);
    const t2 = await call('POST', `/api/merchants/1/menu/${itemId}/toggle`, { body: { available: true } });
    assert.equal(t2.status, 200);
    assert.equal(t2.json.available, true);
  });

  await test('Hotel booking: check-in/nights/guests priced per night → booking slip BK- (no table, no kitchen banners)', async () => {
    const init = (await call('GET', '/api/init-data')).json;
    const hotel = init.merchants.find((m) => m.slug === 'imperial-hotel');
    // the suite sleeps 3, so 2 suites hold 5 guests; a twin room sleeps 2
    const room = init.menuItems.find((i) => i.merchantId === hotel.id && i.room?.tier === 'suite');
    const twin = init.menuItems.find((i) => i.merchantId === hotel.id && i.room?.bed === 'twin');
    assert.ok(room && twin && room.room.maxGuests === 3 && twin.room.maxGuests === 2, 'room types carry their own guest limits');
    const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    const plus = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    const checkIn = plus(today, 3);
    const body = {
      merchantId: hotel.id, items: [{ id: room.id, qty: 2 }], couponCode: 'none', guestLang: 'ja',
      flags: ['no_peanut'], tableTh: 'โต๊ะ 4 / สั่งล่วงหน้า',
      booking: { checkIn, nights: 3, guests: 5, note: 'ขอห้องติดกัน' }
    };
    const q = await call('POST', '/api/quote', { body });
    assert.equal(q.status, 200, JSON.stringify(q.json));
    assert.equal(q.json.breakdown.subtotalSatang, room.priceSatang * 2 * 3, 'room price × rooms × nights');
    assert.equal(q.json.breakdown.lines[0].nights, 3);
    assert.equal(q.json.ticketPreview.kind, 'booking');
    assert.equal(q.json.ticketPreview.checkOut, plus(checkIn, 3));
    assert.ok(!('tableTh' in q.json.ticketPreview) && !q.json.ticketPreview.warningsTh, 'a booking has no table number or kitchen banners');
    for (const bad of [{ checkIn: plus(today, -1) }, { checkIn: plus(today, 400) }, { checkIn: '2027-02-30' }, { nights: 0 }, { nights: 15 }, { guests: 7 }]) {
      const r = await call('POST', '/api/quote', { body: { ...body, booking: { ...body.booking, ...bad } } });
      assert.equal(r.status, 400, `booking ${JSON.stringify(bad)} must be rejected`);
    }
    const tooMany = await call('POST', '/api/quote', { body: { ...body, items: [{ id: twin.id, qty: 2 }] } });
    assert.equal(tooMany.status, 400, '2 twin rooms cannot take 5 guests');
    const co = await call('POST', '/api/checkout', { body: { type: 'order', ...body } });
    assert.equal(co.status, 200);
    assert.ok(co.json.title.startsWith('จองห้องพักโรงแรม'));
    const c = await call('POST', `/api/checkout/${co.json.checkoutId}/confirm`);
    assert.equal(c.status, 200);
    assert.match(c.json.order.orderNo, /^BK-\d+$/);
    assert.equal(c.json.order.ticket.kind, 'booking');
    assert.equal(c.json.order.ticket.guests, 5);
    assert.equal(c.json.order.ticket.note, 'ขอห้องติดกัน');
    const dash = await call('GET', `/api/merchants/${hotel.id}/dashboard`);
    assert.ok(dash.json.orders.some((o) => o.orderNo === c.json.order.orderNo && o.ticket.kind === 'booking'), 'booking reaches the hotel screen');
    assert.match(orderNo, /^PN-\d+$/, 'food orders keep kitchen tickets');
  });

  await test('POST /api/checkout (VIP pass 99฿) & Hotel SaaS (499฿) work + auto 15% VIP cart discount', async () => {
    const r = await call('POST', '/api/checkout', { body: { type: 'vip_pass' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.amountSatang, 9900);
    const c = await call('POST', `/api/checkout/${r.json.checkoutId}/confirm`);
    assert.equal(c.status, 200);

    // Verify VIP holder automatically gets 15% VIP-15% privilege discount in quote
    const q = await call('POST', '/api/quote', {
      body: {
        merchantId: menu.merchant.id,
        items: [{ id: menu.items[0].id, qty: 2 }],
        couponCode: 'VIP-15%'
      }
    });
    assert.equal(q.status, 200);
    assert.equal(q.json.breakdown.coupon.code, 'VIP-15%');
    assert.equal(q.json.breakdown.discountSatang, Math.floor((menu.items[0].priceSatang * 2) * 0.15));

    const h = await call('POST', '/api/checkout', {
      body: {
        type: 'hotel_saas',
        merchant: { shopName: 'โรงแรมริมน้ำพิษณุโลก', ownerName: 'คุณบี', phone: '0812345678', category: 'stay', nearest: 'wat-yai', pdpaConsent: true }
      }
    });
    assert.equal(h.status, 200);
    assert.equal(h.json.amountSatang, 49900);
    const hc = await call('POST', `/api/checkout/${h.json.checkoutId}/confirm`);
    assert.equal(hc.status, 200);
    assert.equal(hc.json.merchant.kind, 'hotel');
  });

  server.close();
  console.log(`\n${passed} checks passed${process.exitCode ? ' — SOME FAILED' : ''}`);
  try { fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true }); } catch { /* locked */ }
})();
