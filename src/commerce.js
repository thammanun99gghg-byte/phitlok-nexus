'use strict';
/*
 * Commerce engine (v2.0 — 4 revenue streams, 6 languages, restaurant + hotel support).
 * Every price, discount and fee is computed on the server from SQLite rows.
 */
const crypto = require('node:crypto');
const { transaction } = require('./db');
const { PRICING, gpsTo3D, haversineM, SHORT_NAMES } = require('./seed-data');
const { buildKitchenTicket, sanitizeFlags, LANGS } = require('./tickets');
const { buildQr, maskTarget } = require('./promptpay');

const PLATFORM_PROMPTPAY_ID = (process.env.DEMO_PROMPTPAY_ID || process.env.PROMPTPAY_ID || '').trim();
const CHECKOUT_TTL_MS = 15 * 60 * 1000;
const VIP_DAYS = 7;
const MAX_LINES = 30;
const MAX_QTY = 20;

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const nowIso = () => new Date().toISOString();
const parse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

function bumpMetric(db, key, by = 1) {
  db.prepare(`INSERT INTO platform_metrics (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = value + excluded.value, updated_at = excluded.updated_at`).run(key, by, nowIso());
}

// ---------- row mappers ----------
// Merchants who sign up later have no curated short name: drop the parenthetical part of each name.
function shortFromName(name) {
  return Object.fromEntries(Object.entries(name).map(([k, v]) => [k, String(v).split(/ \(|（/)[0].trim()]));
}

function publicMerchant(row) {
  const lat = Number(row.lat) || 16.8228;
  const lng = Number(row.lng) || 100.2612;
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind || (row.category === 'stay' ? 'hotel' : 'restaurant'),
    name: parse(row.name_json, {}),
    shortName: SHORT_NAMES[row.slug] || shortFromName(parse(row.name_json, {})),
    blurb: parse(row.blurb_json, {}),
    category: row.category,
    nearest: row.nearest,
    distanceM: row.distance_m,
    lat,
    lng,
    x: row.x,
    z: row.z,
    imageUrl: row.image_url || '/assets/photos/hoi-kha-noodles.jpg',
    fallbackImage: row.fallback_image || '/assets/photos/hoi-kha-noodles.jpg',
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    googleEarthUrl: `https://earth.google.com/web/search/${lat},${lng}`,
    plan: row.plan,
    monthlyFeeSatang: row.monthly_fee_satang,
    roomRateSatang: row.room_rate_satang || 0,
    stampCouponPercent: row.stamp_coupon_percent,
    featured: !!row.featured,
    partnerStatus: row.partner_status || 'demo',
    shopStatus: row.shop_status || 'open',
    createdAt: row.created_at
  };
}

function publicItem(row) {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    code: row.code,
    name: parse(row.name_json, {}),
    desc: parse(row.desc_json, {}),
    imageUrl: row.image_url || '/assets/photos/hoi-kha-noodles.jpg',
    fallbackImage: row.fallback_image || '/assets/photos/hoi-kha-noodles.jpg',
    priceSatang: row.price_satang,
    unit: row.unit,
    category: row.category,
    allergens: parse(row.allergens_json, []),
    spicy: row.spicy,
    vegetarian: !!row.vegetarian,
    halal: !!row.halal,
    available: row.available !== 0,
    isSample: (row.source || 'seed') === 'seed',
    source: row.source
  };
}

function publicCoupon(row, merchantsById) {
  const m = merchantsById ? merchantsById[row.merchant_id] : null;
  return {
    code: row.code,
    merchantId: row.merchant_id,
    merchantName: m ? parse(m.name_json, {}) : null,
    kind: row.kind,
    value: row.value,
    minSpendSatang: row.min_spend_satang,
    source: row.source,
    status: row.status,
    createdAt: row.created_at
  };
}

// ---------- visitors ----------
function ensureVisitor(db, visitorId) {
  db.prepare('INSERT OR IGNORE INTO visitors (id, vip_until, created_at) VALUES (?, NULL, ?)').run(visitorId, nowIso());
  return db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
}

function visitorState(db, visitorId) {
  const v = ensureVisitor(db, visitorId);
  const merchantsById = Object.fromEntries(db.prepare('SELECT * FROM merchants').all().map((m) => [m.id, m]));
  const coupons = db.prepare("SELECT * FROM coupons WHERE visitor_id = ? ORDER BY status = 'active' DESC, id DESC").all(visitorId);
  const stamps = db.prepare('SELECT landmark_id, created_at FROM stamps WHERE visitor_id = ?').all(visitorId);
  const vipActive = !!v.vip_until && Date.parse(v.vip_until) > Date.now();
  return {
    vip: { active: vipActive, until: v.vip_until },
    stamps: stamps.map((s) => ({ landmarkId: s.landmark_id, at: s.created_at })),
    coupons: coupons.map((c) => publicCoupon(c, merchantsById))
  };
}

function newCouponCode() {
  return 'PN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function issueStampRewards(db, visitorId, landmarkId) {
  return transaction(db, () => {
    ensureVisitor(db, visitorId);
    const r = db.prepare('INSERT OR IGNORE INTO stamps (visitor_id, landmark_id, created_at) VALUES (?, ?, ?)').run(visitorId, landmarkId, nowIso());
    const merchants = db.prepare("SELECT * FROM merchants WHERE stamp_coupon_percent > 0 AND status = 'active'").all();
    const issued = [];
    for (const m of merchants) {
      const has = db.prepare("SELECT 1 FROM coupons WHERE visitor_id = ? AND merchant_id = ? AND source = 'heritage_stamp'").get(visitorId, m.id);
      if (has) continue;
      const code = newCouponCode();
      db.prepare(`INSERT INTO coupons (code, visitor_id, merchant_id, kind, value, min_spend_satang, source, status, created_at)
        VALUES (?, ?, ?, 'percent', ?, 0, 'heritage_stamp', 'active', ?)`).run(code, visitorId, m.id, m.stamp_coupon_percent, nowIso());
      issued.push({ code, merchantId: m.id, merchantName: parse(m.name_json, {}), percent: m.stamp_coupon_percent });
    }
    return { newStamp: r.changes > 0, issued };
  });
}

// ---------- order pricing ----------
const SCAN_ITEM_RE = /^scan:([0-9a-f-]{36}):(\d{1,3})$/;

function resolveLine(db, merchantId, rawId) {
  if (typeof rawId === 'number' || (typeof rawId === 'string' && /^\d{1,9}$/.test(rawId))) {
    const row = db.prepare('SELECT * FROM menu_items WHERE id = ? AND merchant_id = ? AND active = 1').get(Number(rawId), merchantId);
    if (!row) return null;
    if (row.available === 0) throw new HttpError(409, `เมนู "${parse(row.name_json, {}).th}" ของหมดชั่วคราว กรุณาเลือกเมนูอื่น`);
    const it = publicItem(row);
    return { key: String(it.id), name: it.name, unit: it.unit, priceSatang: it.priceSatang, allergens: it.allergens, spicy: it.spicy, vegetarian: it.vegetarian ? 1 : 0 };
  }
  const m = typeof rawId === 'string' ? rawId.match(SCAN_ITEM_RE) : null;
  if (!m) return null;
  const scan = db.prepare('SELECT * FROM menu_scans WHERE id = ? AND merchant_id = ?').get(m[1], merchantId);
  if (!scan) return null;
  const item = parse(scan.items_json, [])[Number(m[2])];
  if (!item) return null;
  return { key: rawId, name: item.name, unit: item.unit, priceSatang: item.priceSatang, allergens: item.allergens, spicy: item.spicy, vegetarian: item.vegetarian ? 1 : 0 };
}

function couponDiscount(coupon, subtotal) {
  if (subtotal < coupon.min_spend_satang) return 0;
  if (coupon.kind === 'percent') return Math.floor((subtotal * coupon.value) / 100);
  return Math.min(coupon.value, subtotal);
}

function quoteOrder(db, visitorId, body) {
  const merchantId = Number(body.merchantId);
  const merchant = db.prepare("SELECT * FROM merchants WHERE id = ? AND status = 'active'").get(merchantId);
  if (!merchant) throw new HttpError(404, 'ไม่พบร้านค้าหรือโรงแรมนี้');
  if (merchant.shop_status === 'busy') {
    throw new HttpError(409, 'ขณะนี้ร้านคิวเต็มชั่วคราว กรุณารอสักครู่หรือเลือกร้านอื่น');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) throw new HttpError(400, 'ตะกร้าว่าง กรุณาเลือกเมนูหรือห้องพักก่อน');
  if (body.items.length > MAX_LINES) throw new HttpError(400, 'รายการในตะกร้ามากเกินไป');

  const lines = [];
  for (const raw of body.items) {
    const qty = Number(raw && raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new HttpError(400, `จำนวนต่อรายการต้องอยู่ระหว่าง 1–${MAX_QTY}`);
    const line = resolveLine(db, merchantId, raw.id);
    if (!line) throw new HttpError(400, 'มีเมนูที่ไม่ถูกต้องหรือไม่ได้อยู่ในร้านนี้');
    const existing = lines.find((l) => l.key === line.key);
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    else lines.push({ ...line, qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.priceSatang * l.qty, 0);

  ensureVisitor(db, visitorId);
  const couponRows = db.prepare("SELECT * FROM coupons WHERE visitor_id = ? AND merchant_id = ? AND status = 'active'").all(visitorId, merchantId);
  const coupons = couponRows.map((c) => ({ row: c, discount: couponDiscount(c, subtotal) }));

  let chosen = null;
  const requested = typeof body.couponCode === 'string' ? body.couponCode : 'auto';
  if (requested === 'auto') {
    chosen = coupons.filter((c) => c.discount > 0).sort((a, b) => b.discount - a.discount)[0] || null;
  } else if (requested !== 'none' && requested !== '') {
    chosen = coupons.find((c) => c.row.code === requested) || null;
    if (!chosen) throw new HttpError(400, 'คูปองไม่ถูกต้องหรือใช้ไปแล้ว');
    if (chosen.discount === 0) throw new HttpError(400, 'ยอดสั่งซื้อยังไม่ถึงขั้นต่ำของคูปองนี้');
  }

  const discount = chosen ? chosen.discount : 0;
  const net = subtotal - discount;
  const isHotel = merchant.kind === 'hotel' || merchant.category === 'stay';
  const feeRate = isHotel ? PRICING.hotelFeeRate : PRICING.restaurantFeeRate;
  const fee = Math.round(net * feeRate);
  const flags = sanitizeFlags(body.flags);
  const guestLang = LANGS.includes(body.guestLang) ? body.guestLang : 'en';
  const merchantName = parse(merchant.name_json, {});
  const rawTable = body.tableTh || body.tableLabel;
  const tableLabel = typeof rawTable === 'string' && rawTable.trim()
    ? rawTable.trim().slice(0, 60)
    : (isHotel ? 'จองห้องพักด่วน / Check-in วันนี้' : 'โต๊ะ 4 / สั่งล่วงหน้า');

  const warnings = [];
  const ticketPreview = buildKitchenTicket({ orderNo: 'PREVIEW', tableTh: tableLabel, tableLabel, merchantName, lines, flags, guestLang });
  ticketPreview.lines.forEach((l) => {
    if (l.notesTh.length) warnings.push(`${l.nameGuest}: ร้านจะปรับสูตรตามข้อจำกัดอาหารของคุณ (${l.notesTh.join(', ')})`);
  });

  return {
    merchant,
    lines,
    flags,
    guestLang,
    tableLabel,
    couponRow: chosen ? chosen.row : null,
    breakdown: {
      merchantId,
      merchantKind: isHotel ? 'hotel' : 'restaurant',
      merchantName,
      lines: lines.map((l) => ({ id: l.key, name: l.name, unit: l.unit, qty: l.qty, unitPriceSatang: l.priceSatang, lineTotalSatang: l.priceSatang * l.qty })),
      subtotalSatang: subtotal,
      coupon: chosen ? { code: chosen.row.code, kind: chosen.row.kind, value: chosen.row.value, source: chosen.row.source } : null,
      discountSatang: discount,
      feeRate,
      feeSatang: fee,
      totalSatang: net + fee,
      availableCoupons: coupons.map((c) => ({
        code: c.row.code, kind: c.row.kind, value: c.row.value, minSpendSatang: c.row.min_spend_satang,
        source: c.row.source, discountSatang: c.discount, eligible: c.discount > 0
      }))
    },
    ticketPreview,
    warnings
  };
}

// ---------- merchant SaaS sign-up ----------
const CATEGORIES = ['food', 'cafe', 'souvenir', 'tour', 'stay'];

function validateMerchantForm(db, f) {
  const clean = (s, max) => (typeof s === 'string' ? s.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max) : '');
  const shopName = clean(f.shopName, 80);
  const ownerName = clean(f.ownerName, 80);
  const phone = clean(f.phone, 20).replace(/[\s-]/g, '');
  const errors = {};
  if (shopName.length < 2) errors.shopName = 'กรุณากรอกชื่อร้านหรือโรงแรม (อย่างน้อย 2 ตัวอักษร)';
  if (ownerName.length < 2) errors.ownerName = 'กรุณากรอกชื่อผู้ติดต่อ';
  if (!/^0\d{8,9}$/.test(phone)) errors.phone = 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก';
  if (!CATEGORIES.includes(f.category)) errors.category = 'กรุณาเลือกประเภทธุรกิจ';
  const landmark = db.prepare('SELECT * FROM landmarks WHERE id = ?').get(f.nearest);
  if (!landmark) errors.nearest = 'กรุณาเลือกโบราณสถานที่ใกล้เคียง';
  if (f.pdpaConsent !== true) errors.pdpaConsent = 'ต้องยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนสมัคร';
  if (Object.keys(errors).length) throw new HttpError(422, 'ข้อมูลไม่ครบถ้วน', { fields: errors });
  return { shopName, ownerName, phone, category: f.category, landmark, marketingConsent: f.marketingConsent === true };
}

function placeNearGps(landmark) {
  const angle = Math.random() * Math.PI * 2;
  const dLat = Math.sin(angle) * 0.0014;
  const dLng = Math.cos(angle) * 0.0014;
  const lat = +(landmark.lat + dLat).toFixed(4);
  const lng = +(landmark.lng + dLng).toFixed(4);
  const pos = gpsTo3D(lat, lng);
  const distanceM = haversineM(lat, lng, landmark.lat, landmark.lng);
  return { lat, lng, x: pos.x, z: pos.z, distanceM: Math.max(80, distanceM) };
}

// ---------- checkout ----------
async function createCheckout(db, visitorId, body) {
  ensureVisitor(db, visitorId);
  const id = crypto.randomUUID();
  const created = nowIso();
  const expires = new Date(Date.now() + CHECKOUT_TTL_MS).toISOString();
  let amount, breakdown, target, merchantId = null, payload, title;

  if (body.type === 'vip_pass') {
    const v = db.prepare('SELECT vip_until FROM visitors WHERE id = ?').get(visitorId);
    if (v.vip_until && Date.parse(v.vip_until) > Date.now()) throw new HttpError(409, 'คุณมี VIP Heritage Pass ที่ยังใช้งานได้อยู่แล้ว');
    amount = PRICING.vipPassSatang;
    target = PLATFORM_PROMPTPAY_ID;
    title = 'Phitsanulok VIP Heritage Pass (99฿)';
    const voucherTotal = PRICING.vipVouchers.reduce((s, v) => s + v.valueSatang * v.count, 0);
    breakdown = { lines: [{ label: 'Phitsanulok VIP Heritage Pass (1 ทริป / 7 วัน)', amountSatang: amount }], totalSatang: amount, voucherValueSatang: voucherTotal };
    payload = {};
  } else if (body.type === 'order') {
    const q = quoteOrder(db, visitorId, body);
    amount = q.breakdown.totalSatang;
    merchantId = q.merchant.id;
    target = q.merchant.promptpay_id;
    const isHotel = q.merchant.kind === 'hotel' || q.merchant.category === 'stay';
    title = `${isHotel ? 'จองห้องพักโรงแรม' : 'สั่งอาหารล่วงหน้า'} — ${parse(q.merchant.name_json, {}).th}`;
    breakdown = q.breakdown;
    payload = {
      items: q.lines.map((l) => ({ id: l.key, qty: l.qty })),
      flags: q.flags,
      guestLang: q.guestLang,
      tableLabel: q.tableLabel,
      couponCode: q.couponRow ? q.couponRow.code : 'none'
    };
  } else if (body.type === 'saas' || body.type === 'hotel_saas') {
    const form = validateMerchantForm(db, body.merchant || {});
    const pos = placeNearGps(form.landmark);
    const slug = 'm-' + crypto.randomBytes(5).toString('hex');
    const isHotel = body.type === 'hotel_saas' || form.category === 'stay';
    const kind = isHotel ? 'hotel' : 'restaurant';
    const plan = isHotel ? 'hotel_saas' : 'restaurant_saas';
    const feeSatang = isHotel ? PRICING.hotelSaasMonthlySatang : PRICING.saasMonthlySatang;
    const name = {
      th: form.shopName, en: form.shopName, zh: form.shopName,
      ja: form.shopName, ko: form.shopName, fr: form.shopName
    };
    const blurb = {
      th: `พาร์ทเนอร์ใหม่ในเครือข่าย PHITLOK NEXUS (${isHotel ? 'โรงแรมที่พัก' : 'ร้านอาหาร/ของฝาก'})`,
      en: 'Verified PHITLOK NEXUS Partner',
      zh: 'PHITLOK NEXUS 认证合作伙伴',
      ja: 'PHITLOK NEXUS 認定パートナー',
      ko: 'PHITLOK NEXUS 인증 파트너',
      fr: 'Partenaire certifié PHITLOK NEXUS'
    };
    const defaultImg = isHotel ? '/assets/photos/yodia-heritage.jpg' : '/assets/photos/hoi-kha-noodles.jpg';
    const defaultFallback = isHotel ? '/assets/photos/yodia-heritage.jpg' : '/assets/photos/hoi-kha-noodles.jpg';
    const demoTarget = (process.env.DEMO_PROMPTPAY_ID || '').trim();
    const r = db.prepare(`INSERT INTO merchants
      (slug, kind, name_json, blurb_json, category, nearest, distance_m, lat, lng, x, z,
       image_url, fallback_image, plan, monthly_fee_satang, room_rate_satang, stamp_coupon_percent,
       featured, promptpay_id, partner_status, status, shop_status, owner_name, phone, marketing_consent, pdpa_consent_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, 1, ?, 'demo', 'pending', 'open', ?, ?, ?, ?, ?)`)
      .run(
        slug, kind, JSON.stringify(name), JSON.stringify(blurb), form.category, form.landmark.id,
        pos.distanceM, pos.lat, pos.lng, pos.x, pos.z, defaultImg, defaultFallback,
        plan, feeSatang, isHotel ? 140000 : 0, demoTarget, form.ownerName, form.phone,
        form.marketingConsent ? 1 : 0, created, created
      );
    merchantId = Number(r.lastInsertRowid);
    amount = feeSatang;
    target = demoTarget;
    title = isHotel ? 'Hotel Partner SaaS (499฿/เดือน)' : 'Restaurant Partner SaaS (199฿/เดือน)';
    breakdown = {
      lines: [{ label: `${title} — ${form.shopName}`, amountSatang: amount }],
      totalSatang: amount
    };
    payload = { merchantId, isHotel };
  } else {
    throw new HttpError(400, 'ประเภทการชำระเงินไม่ถูกต้อง');
  }

  const resolvedTarget = (process.env.DEMO_PROMPTPAY_ID || target || '').trim();

  db.prepare(`INSERT INTO checkouts (id, type, visitor_id, merchant_id, payload_json, breakdown_json, amount_satang, promptpay_target, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`)
    .run(id, body.type, visitorId, merchantId, JSON.stringify(payload), JSON.stringify(breakdown), amount, resolvedTarget || 'DEMO-NO-PROMPTPAY', created, expires);

  let qrResult;
  if (resolvedTarget) {
    const qr = await buildQr(resolvedTarget, amount);
    qrResult = {
      playable: true,
      dataUrl: qr.dataUrl,
      payload: qr.payload,
      target: maskTarget(resolvedTarget)
    };
  } else {
    qrResult = {
      playable: false,
      dataUrl: null,
      payload: 'DEMO-MODE-NO-TRANSFER (ยังไม่ได้ตั้งค่า DEMO_PROMPTPAY_ID)',
      target: 'QR ตัวอย่าง ห้ามโอนเงิน'
    };
  }

  return {
    checkoutId: id,
    type: body.type,
    title,
    amountSatang: amount,
    breakdown,
    qr: qrResult,
    expiresAt: expires,
    demoMode: true
  };
}

function confirmCheckout(db, visitorId, checkoutId) {
  return transaction(db, () => {
    const co = db.prepare('SELECT * FROM checkouts WHERE id = ? AND visitor_id = ?').get(checkoutId, visitorId);
    if (!co) throw new HttpError(404, 'ไม่พบรายการชำระเงิน');
    if (co.status === 'paid') throw new HttpError(409, 'รายการนี้ชำระเงินแล้ว');
    if (Date.parse(co.expires_at) < Date.now()) {
      db.prepare("UPDATE checkouts SET status = 'expired' WHERE id = ?").run(co.id);
      throw new HttpError(410, 'QR หมดอายุแล้ว กรุณาสร้างรายการใหม่');
    }
    const paidAt = nowIso();
    const payload = parse(co.payload_json, {});
    const result = { type: co.type, checkoutId: co.id, amountSatang: co.amount_satang };
    const insTx = db.prepare(`INSERT INTO transactions (type, visitor_id, merchant_id, checkout_id, gross_satang, platform_revenue_satang, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);

    if (co.type === 'vip_pass') {
      const until = new Date(Date.now() + VIP_DAYS * 86400000).toISOString();
      db.prepare('UPDATE visitors SET vip_until = ? WHERE id = ?').run(until, visitorId);
      const issued = [];
      for (const v of PRICING.vipVouchers) {
        const m = db.prepare('SELECT * FROM merchants WHERE slug = ?').get(v.merchant);
        if (!m) continue;
        for (let i = 0; i < v.count; i++) {
          const code = newCouponCode();
          db.prepare(`INSERT INTO coupons (code, visitor_id, merchant_id, kind, value, min_spend_satang, source, status, created_at)
            VALUES (?, ?, ?, 'fixed', ?, ?, 'vip_pass', 'active', ?)`).run(code, visitorId, m.id, v.valueSatang, v.minSpendSatang, paidAt);
          issued.push({ code, merchantName: parse(m.name_json, {}), valueSatang: v.valueSatang, minSpendSatang: v.minSpendSatang });
        }
      }
      insTx.run('vip_pass', visitorId, null, co.id, co.amount_satang, co.amount_satang, paidAt);
      result.vip = { until, vouchers: issued };
    } else if (co.type === 'order') {
      const q = quoteOrder(db, visitorId, { merchantId: co.merchant_id, ...payload });
      if (q.breakdown.totalSatang !== co.amount_satang) throw new HttpError(409, 'ราคาหรือคูปองมีการเปลี่ยนแปลง กรุณาสร้างรายการชำระเงินใหม่');
      if (q.couponRow) db.prepare("UPDATE coupons SET status = 'used', used_at = ? WHERE id = ?").run(paidAt, q.couponRow.id);
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM orders').get();
      const orderNo = `PN-${1001 + n}`;
      const ticket = buildKitchenTicket({
        orderNo,
        tableTh: q.tableLabel,
        tableLabel: q.tableLabel,
        merchantName: q.breakdown.merchantName,
        lines: q.lines,
        flags: q.flags,
        guestLang: q.guestLang
      });
      const b = q.breakdown;
      const r = db.prepare(`INSERT INTO orders (order_no, checkout_id, merchant_id, visitor_id, ticket_json, guest_lang, subtotal_satang,
        discount_satang, fee_satang, total_satang, coupon_code, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`)
        .run(orderNo, co.id, co.merchant_id, visitorId, JSON.stringify(ticket), q.guestLang, b.subtotalSatang, b.discountSatang,
          b.feeSatang, b.totalSatang, b.coupon ? b.coupon.code : null, paidAt);
      insTx.run('order', visitorId, co.merchant_id, co.id, b.totalSatang, b.feeSatang, paidAt);
      result.order = { id: Number(r.lastInsertRowid), orderNo, ticket, breakdown: b };
    } else if (co.type === 'saas' || co.type === 'hotel_saas') {
      db.prepare("UPDATE merchants SET status = 'active', created_at = ? WHERE id = ? AND status = 'pending'").run(paidAt, co.merchant_id);
      const m = db.prepare('SELECT * FROM merchants WHERE id = ?').get(co.merchant_id);
      const txType = m && m.kind === 'hotel' ? 'hotel_saas' : 'saas_subscription';
      insTx.run(txType, visitorId, co.merchant_id, co.id, co.amount_satang, co.amount_satang, paidAt);
      result.merchant = publicMerchant(m);
    }

    db.prepare("UPDATE checkouts SET status = 'paid', paid_at = ? WHERE id = ?").run(paidAt, co.id);
    return result;
  });
}

module.exports = {
  HttpError, bumpMetric, publicMerchant, publicItem, publicCoupon, ensureVisitor, visitorState,
  issueStampRewards, quoteOrder, createCheckout, confirmCheckout, CATEGORIES, parse, PLATFORM_PROMPTPAY_ID
};
