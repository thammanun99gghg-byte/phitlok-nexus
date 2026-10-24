'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { LANDMARKS, MERCHANTS, MENU_ITEMS, PRICING, COST_ASSUMPTIONS } = require('./seed-data');
const { buildKitchenTicket, buildBookingTicket } = require('./tickets');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'phitlok_nexus.sqlite');
const SCHEMA_VERSION = 26; // v2.4: room types carry bed / size / guests / amenities (room_json) // v2.4: hotel bookings are booking slips (BK-, check-in/nights/guests), not kitchen tickets

const SCHEMA = `
CREATE TABLE IF NOT EXISTS landmarks (
  id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  x REAL NOT NULL,
  z REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'restaurant',
  name_json TEXT NOT NULL,
  blurb_json TEXT NOT NULL,
  category TEXT NOT NULL,
  nearest TEXT NOT NULL,
  distance_m INTEGER NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  x REAL NOT NULL,
  z REAL NOT NULL,
  image_url TEXT,
  fallback_image TEXT,
  plan TEXT NOT NULL DEFAULT 'restaurant_saas',
  monthly_fee_satang INTEGER NOT NULL,
  room_rate_satang INTEGER NOT NULL DEFAULT 0,
  stamp_coupon_percent INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 1,
  promptpay_id TEXT NOT NULL,
  partner_status TEXT NOT NULL DEFAULT 'demo',
  status TEXT NOT NULL DEFAULT 'active',
  shop_status TEXT NOT NULL DEFAULT 'open',
  owner_name TEXT,
  phone TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  pdpa_consent_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id),
  code TEXT,
  name_json TEXT NOT NULL,
  desc_json TEXT NOT NULL,
  image_url TEXT,
  fallback_image TEXT,
  price_satang INTEGER NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  allergens_json TEXT NOT NULL,
  spicy INTEGER NOT NULL DEFAULT 0,
  vegetarian INTEGER NOT NULL DEFAULT 0,
  halal INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'seed',
  active INTEGER NOT NULL DEFAULT 1,
  available INTEGER NOT NULL DEFAULT 1,
  room_json TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  vip_until TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  landmark_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(visitor_id, landmark_id)
);
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  visitor_id TEXT NOT NULL,
  merchant_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  value INTEGER NOT NULL,
  min_spend_satang INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS checkouts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  merchant_id INTEGER,
  payload_json TEXT NOT NULL,
  breakdown_json TEXT NOT NULL,
  amount_satang INTEGER NOT NULL,
  promptpay_target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL,
  checkout_id TEXT,
  merchant_id INTEGER NOT NULL,
  visitor_id TEXT,
  ticket_json TEXT NOT NULL,
  guest_lang TEXT NOT NULL DEFAULT 'en',
  subtotal_satang INTEGER NOT NULL,
  discount_satang INTEGER NOT NULL,
  fee_satang INTEGER NOT NULL,
  total_satang INTEGER NOT NULL,
  coupon_code TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('vip_pass','saas_subscription','hotel_saas','order')),
  visitor_id TEXT,
  merchant_id INTEGER,
  checkout_id TEXT,
  gross_satang INTEGER NOT NULL,
  platform_revenue_satang INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu_scans (
  id TEXT PRIMARY KEY,
  merchant_id INTEGER,
  items_json TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS platform_metrics (
  key TEXT PRIMARY KEY,
  value REAL NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_coupons_visitor ON coupons(visitor_id);
`;

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Thailand calendar day (UTC+7) of an ISO timestamp, and day arithmetic on YYYY-MM-DD strings.
const bangkokDay = (iso) => new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 10);
function addDaysYmd(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isoDaysAgo(days, rand) {
  const d = new Date(Date.now() - days * 86400000);
  d.setHours(8 + Math.floor(rand() * 12), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
  if (d.getTime() > Date.now()) d.setTime(Date.now() - Math.floor(rand() * 3600000));
  return d.toISOString();
}

function openDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');

  // Check if existing DB matches v2.0 schema version; if not, drop and rebuild cleanly.
  let currentVer = 0;
  try {
    const row = db.prepare("SELECT value FROM platform_metrics WHERE key = 'schema_version'").get();
    if (row) currentVer = row.value;
  } catch { /* fresh DB */ }

  if (currentVer !== SCHEMA_VERSION) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS transactions;
      DROP TABLE IF EXISTS orders;
      DROP TABLE IF EXISTS checkouts;
      DROP TABLE IF EXISTS coupons;
      DROP TABLE IF EXISTS stamps;
      DROP TABLE IF EXISTS visitors;
      DROP TABLE IF EXISTS menu_scans;
      DROP TABLE IF EXISTS menu_items;
      DROP TABLE IF EXISTS merchants;
      DROP TABLE IF EXISTS landmarks;
      DROP TABLE IF EXISTS platform_metrics;
      PRAGMA foreign_keys = ON;
    `);
  }

  db.exec(SCHEMA);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM merchants').get();
  if (n === 0) seed(db);
  return db;
}

function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function seed(db) {
  const rand = mulberry32(2569);
  const now = new Date().toISOString();

  transaction(db, () => {
    const insLandmark = db.prepare('INSERT INTO landmarks (id, data_json, lat, lng, x, z) VALUES (?, ?, ?, ?, ?, ?)');
    for (const lm of LANDMARKS) insLandmark.run(lm.id, JSON.stringify(lm), lm.lat, lm.lng, lm.x, lm.z);

    const insMerchant = db.prepare(`INSERT INTO merchants
      (slug, kind, name_json, blurb_json, category, nearest, distance_m, lat, lng, x, z,
       image_url, fallback_image, plan, monthly_fee_satang, room_rate_satang,
       stamp_coupon_percent, featured, promptpay_id, partner_status, status, shop_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`);

    const merchantMeta = {};
    for (const m of MERCHANTS) {
      const joined = 110 + Math.floor(rand() * 40);
      const r = insMerchant.run(
        m.slug, m.kind, JSON.stringify(m.name), JSON.stringify(m.blurb), m.category, m.nearest,
        m.distance_m, m.lat, m.lng, m.x, m.z, m.imageUrl, m.fallbackImage, m.plan,
        m.monthly_fee_satang, m.room_rate_satang || 0, m.stamp_coupon_percent, m.featured,
        (process.env.DEMO_PROMPTPAY_ID || m.promptpay_id || '').trim(),
        m.partner_status || 'demo', m.shop_status || 'open', isoDaysAgo(joined, rand)
      );
      merchantMeta[r.lastInsertRowid] = { joined, kind: m.kind, fee: m.monthly_fee_satang };
    }

    const merchantIdBySlug = Object.fromEntries(db.prepare('SELECT id, slug FROM merchants').all().map((r) => [r.slug, r.id]));
    const insItem = db.prepare(`INSERT INTO menu_items
      (merchant_id, code, name_json, desc_json, image_url, fallback_image, price_satang, unit, category,
       allergens_json, spicy, vegetarian, halal, source, active, available, room_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', 1, 1, ?, ?)`);
    for (const it of MENU_ITEMS) {
      insItem.run(
        merchantIdBySlug[it.merchant], it.code, JSON.stringify(it.name), JSON.stringify(it.desc),
        it.imageUrl, it.fallbackImage, it.price * 100, it.unit, it.category,
        JSON.stringify(it.allergens), it.spicy, it.vegetarian, it.halal, it.room ? JSON.stringify(it.room) : null, now
      );
    }

    const insTx = db.prepare(`INSERT INTO transactions
      (type, visitor_id, merchant_id, checkout_id, gross_satang, platform_revenue_satang, created_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?)`);

    // SaaS subscriptions: Stream 1 (Restaurants 199฿/mo) & Stream 2 (Hotels 499฿/mo).
    for (const [id, meta] of Object.entries(merchantMeta)) {
      const txType = meta.kind === 'hotel' ? 'hotel_saas' : 'saas_subscription';
      for (let d = meta.joined; d >= 0; d -= 30) {
        insTx.run(txType, null, Number(id), meta.fee, meta.fee, isoDaysAgo(d, rand));
      }
    }

    // Stream 3: 48 VIP Heritage Passes (99฿) sold over the last 30 days.
    for (let i = 0; i < 48; i++) {
      insTx.run('vip_pass', `seed-visitor-${i}`, null, PRICING.vipPassSatang, PRICING.vipPassSatang, isoDaysAgo(Math.floor(rand() * 30), rand));
    }

    // Stream 4: Historic food pre-orders & hotel room bookings (3-5% commission).
    const items = db.prepare('SELECT * FROM menu_items').all();
    const merchants = db.prepare('SELECT * FROM merchants WHERE featured = 1').all();
    const insOrder = db.prepare(`INSERT INTO orders
      (order_no, checkout_id, merchant_id, visitor_id, ticket_json, guest_lang, subtotal_satang, discount_satang,
       fee_satang, total_satang, coupon_code, status, created_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, ?)`);
    const langs = ['en', 'zh', 'ja', 'ko', 'fr', 'th'];
    const flagPool = [[], ['no_peanut'], ['no_spicy'], ['no_pork'], ['vegetarian'], ['no_peanut', 'no_spicy'], []];
    const ORDER_COUNT = 121;
    const seeded = [];
    for (let i = 0; i < ORDER_COUNT; i++) {
      const m = merchants[Math.floor(rand() * merchants.length)];
      const menu = items.filter((it) => it.merchant_id === m.id);
      if (!menu.length) continue;
      const lineCount = m.kind === 'hotel' ? 1 : 1 + Math.floor(rand() * 2);
      const lines = [];
      for (let l = 0; l < lineCount; l++) {
        const it = menu[Math.floor(rand() * menu.length)];
        const existing = lines.find((x) => x.item.id === it.id);
        if (existing) existing.qty += 1;
        else lines.push({ item: it, qty: m.kind === 'hotel' ? 1 : 1 + Math.floor(rand() * 2) });
      }
      const nights = m.kind === 'hotel' ? 1 + (i % 2) : 1;
      const subtotal = lines.reduce((s, x) => s + x.item.price_satang * x.qty * nights, 0);
      const feeRate = m.kind === 'hotel' ? PRICING.hotelFeeRate : PRICING.restaurantFeeRate;
      const fee = Math.round(subtotal * feeRate);
      const daysAgo = i < 5 ? 0 : Math.floor(rand() * 28);
      const tableNum = 1 + Math.floor(rand() * 9);
      seeded.push({
        m, lines, subtotal, fee, nights,
        tableLabel: `โต๊ะ ${tableNum} / สั่งล่วงหน้า`,
        created: isoDaysAgo(daysAgo, rand),
        lang: langs[Math.floor(rand() * langs.length)],
        flags: m.kind === 'hotel' ? [] : flagPool[Math.floor(rand() * flagPool.length)]
      });
    }
    seeded.sort((a, b) => a.created.localeCompare(b.created));
    seeded.forEach((o, idx) => {
      const isHotel = o.m.kind === 'hotel';
      const orderNo = `${isHotel ? 'BK' : 'PN'}-${String(1001 + idx)}`;
      const ticketLines = o.lines.map(({ item, qty }) => ({
        qty, unit: item.unit, name: JSON.parse(item.name_json), allergens: JSON.parse(item.allergens_json), spicy: item.spicy
      }));
      const checkIn = bangkokDay(o.created);
      const ticket = isHotel
        ? buildBookingTicket({
          orderNo, merchantName: JSON.parse(o.m.name_json), lines: ticketLines, guestLang: o.lang,
          booking: { checkIn, checkOut: addDaysYmd(checkIn, o.nights), nights: o.nights, guests: 2, note: '' }
        })
        : buildKitchenTicket({ orderNo, tableLabel: o.tableLabel, merchantName: JSON.parse(o.m.name_json), lines: ticketLines, flags: o.flags, guestLang: o.lang });
      const ageHours = (Date.now() - Date.parse(o.created)) / 3600000;
      const status = ageHours < 0.5 ? 'new' : ageHours < 1.5 ? 'preparing' : 'done';
      insOrder.run(orderNo, o.m.id, 'seed-visitor', JSON.stringify(ticket), o.lang, o.subtotal, o.fee, o.subtotal + o.fee, status, o.created);
      insTx.run('order', 'seed-visitor', o.m.id, o.subtotal + o.fee, o.fee, o.created);
    });

    // Live kitchen orders for Hanging-Leg Noodles (ก๋วยเตี๋ยวห้อยขา ริมน่าน) matching requirement 1.2!
    const hk = merchants.find((m) => m.slug === 'hoi-kha-noodles');
    const hkMenu = items.filter((it) => it.merchant_id === hk.id);
    const liveOrders = [
      {
        codes: [['HK01', 2], ['HK03', 1]],
        flags: ['no_peanut'],
        lang: 'en',
        tableLabel: 'โต๊ะ 4 / สั่งล่วงหน้า',
        status: 'new'
      },
      {
        codes: [['HK02', 2]],
        flags: ['no_spicy'],
        lang: 'ja',
        tableLabel: 'โต๊ะ 2 / ริมน้ำชั้นล่าง',
        status: 'preparing'
      },
      {
        codes: [['HK01', 1], ['HK03', 2]],
        flags: ['no_peanut', 'no_spicy'],
        lang: 'fr',
        tableLabel: 'โต๊ะ 7 / โซนห้อยขาริมน้ำ',
        status: 'new'
      }
    ];
    liveOrders.forEach((o, i) => {
      const lines = o.codes.map(([code, qty]) => ({ item: hkMenu.find((x) => x.code === code), qty })).filter((x) => x.item);
      const subtotal = lines.reduce((s, x) => s + x.item.price_satang * x.qty, 0);
      const fee = Math.round(subtotal * PRICING.restaurantFeeRate);
      const orderNo = `PN-${String(1001 + seeded.length + i)}`;
      const created = new Date(Date.now() - (5 - i * 2) * 60000).toISOString();
      const ticket = buildKitchenTicket({
        orderNo,
        tableLabel: o.tableLabel,
        merchantName: JSON.parse(hk.name_json),
        lines: lines.map(({ item, qty }) => ({
          qty, unit: item.unit, name: JSON.parse(item.name_json), allergens: JSON.parse(item.allergens_json), spicy: item.spicy
        })),
        flags: o.flags,
        guestLang: o.lang
      });
      insOrder.run(orderNo, hk.id, 'seed-visitor', JSON.stringify(ticket), o.lang, subtotal, fee, subtotal + fee, o.status, created);
      insTx.run('order', 'seed-visitor', hk.id, subtotal + fee, fee, created);
    });

    // Live order for Juk Kai Thai & Yodia Heritage Hotel so switching shops also shows live data
    const jk = merchants.find((m) => m.slug === 'juk-kai-thai');
    const jkMenu = items.filter((it) => it.merchant_id === jk.id);
    if (jk && jkMenu.length) {
      const lines = [{ item: jkMenu[0], qty: 2 }, { item: jkMenu[1], qty: 1 }];
      const subtotal = lines.reduce((s, x) => s + x.item.price_satang * x.qty, 0);
      const fee = Math.round(subtotal * PRICING.restaurantFeeRate);
      const orderNo = `PN-${String(1001 + seeded.length + liveOrders.length)}`;
      const created = new Date(Date.now() - 4 * 60000).toISOString();
      const ticket = buildKitchenTicket({
        orderNo,
        tableLabel: 'โต๊ะ 3 / สั่งล่วงหน้า',
        merchantName: JSON.parse(jk.name_json),
        lines: lines.map(({ item, qty }) => ({
          qty, unit: item.unit, name: JSON.parse(item.name_json), allergens: JSON.parse(item.allergens_json), spicy: item.spicy
        })),
        flags: ['no_peanut'],
        guestLang: 'zh'
      });
      insOrder.run(orderNo, jk.id, 'seed-visitor', JSON.stringify(ticket), 'zh', subtotal, fee, subtotal + fee, 'new', created);
      insTx.run('order', 'seed-visitor', jk.id, subtotal + fee, fee, created);
    }

    const yh = merchants.find((m) => m.slug === 'yodia-heritage');
    const yhMenu = items.filter((it) => it.merchant_id === yh.id);
    if (yh && yhMenu.length) {
      const lines = [{ item: yhMenu[0], qty: 1 }];
      const nights = 2;
      const subtotal = lines[0].item.price_satang * nights;
      const fee = Math.round(subtotal * PRICING.hotelFeeRate);
      const orderNo = `BK-${String(1001 + seeded.length + liveOrders.length + 1)}`;
      const created = new Date(Date.now() - 9 * 60000).toISOString();
      const checkIn = bangkokDay(created);
      const ticket = buildBookingTicket({
        orderNo,
        merchantName: JSON.parse(yh.name_json),
        lines: lines.map(({ item, qty }) => ({ qty, unit: item.unit, name: JSON.parse(item.name_json) })),
        booking: { checkIn, checkOut: addDaysYmd(checkIn, nights), nights, guests: 2, note: 'เช็คอินประมาณ 14:00 น.' },
        guestLang: 'fr'
      });
      insOrder.run(orderNo, yh.id, 'seed-visitor', JSON.stringify(ticket), 'fr', subtotal, fee, subtotal + fee, 'new', created);
      insTx.run('order', 'seed-visitor', yh.id, subtotal + fee, fee, created);
    }

    const insMetric = db.prepare('INSERT INTO platform_metrics (key, value, updated_at) VALUES (?, ?, ?)');
    insMetric.run('schema_version', SCHEMA_VERSION, now);
    insMetric.run('heritage_scans', 340, now);
    insMetric.run('menu_scans', 265, now);
    insMetric.run('audio_guides_played', 319, now);
    for (const [k, v] of Object.entries(COST_ASSUMPTIONS)) insMetric.run(`assume_${k}`, v, now);
  });
}

module.exports = { openDatabase, transaction, DB_FILE, DATA_DIR };
