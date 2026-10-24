'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const multer = require('multer');

const { openDatabase, transaction } = require('./src/db');
const trip = require('./src/trip-service');
const { ORIGIN_GPS, PRICING } = require('./src/seed-data');
const { DIETARY_FLAGS, LANGS } = require('./src/tickets');
const ai = require('./src/ai');
const {
  HttpError, bumpMetric, publicMerchant, publicItem, visitorState, issueStampRewards,
  quoteOrder, createCheckout, confirmCheckout, CATEGORIES, parse, PLATFORM_PROMPTPAY_ID
} = require('./src/commerce');

const PORT = Number(process.env.PORT || 3000);
const db = openDatabase();
trip.initTrip(db);
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

// ---------------------------------------------------------------- security
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'font-src': ["'self'"],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https://upload.wikimedia.org',
        'https://thumb.wikimedia.org',
        'https://commons.wikimedia.org',
        'https://images.unsplash.com'
      ],
      'connect-src': ["'self'"],
      'media-src': ["'self'", 'blob:'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self), payment=()');
  next();
});

const limiter = (windowMs, limit, message) => rateLimit({
  windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ ok: false, error: message })
});
app.use('/api/', limiter(60_000, 400, 'มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่'));
const scanLimiter = limiter(60_000, 60, 'สแกนถี่เกินไป กรุณารอ 1 นาที');
const payLimiter = limiter(60_000, 60, 'ทำรายการชำระเงินถี่เกินไป กรุณารอ 1 นาที');

app.use(express.json({ limit: '32kb' }));

const ALLOWED_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, fieldSize: 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const ok = ALLOWED_TYPES[file.mimetype] && ALLOWED_TYPES[file.mimetype].includes(ext);
    cb(ok ? null : new HttpError(415, 'รองรับเฉพาะไฟล์รูปภาพ .jpg .png .webp เท่านั้น'), !!ok);
  }
});

function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function verifiedImage(req) {
  if (!req.file) return null;
  const real = sniffImage(req.file.buffer);
  if (!real || real !== req.file.mimetype) throw new HttpError(415, 'ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง (ตรวจสอบเนื้อไฟล์แล้วไม่ตรงกับนามสกุล)');
  return req.file;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function visitor(req) {
  const id = String(req.get('x-visitor-id') || '').toLowerCase();
  if (!UUID_RE.test(id)) throw new HttpError(400, 'ไม่พบรหัสผู้เยี่ยมชม กรุณารีเฟรชหน้าเว็บ');
  return id;
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------------------------------------------------------------- helpers
const loadLandmarks = () => db.prepare('SELECT data_json FROM landmarks').all().map((r) => JSON.parse(r.data_json));
const activeMerchants = () => db.prepare("SELECT * FROM merchants WHERE status = 'active' ORDER BY featured DESC, id").all();
const metricValue = (key) => (db.prepare('SELECT value FROM platform_metrics WHERE key = ?').get(key) || { value: 0 }).value;

function publicLandmark(lm) {
  return {
    id: lm.id,
    lat: lm.lat,
    lng: lm.lng,
    x: lm.x,
    z: lm.z,
    builtYearBe: lm.builtYearBe,
    fineArtsRef: lm.fineArtsRef,
    imageUrl: lm.imageUrl,
    fallbackImage: lm.fallbackImage,
    googleMapsUrl: lm.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lm.lat},${lm.lng}`,
    googleEarthUrl: lm.googleEarthUrl || `https://earth.google.com/web/search/${lm.lat},${lm.lng}`,
    photoCredit: lm.photoCredit || null,
    shortName: lm.shortName,
    name: lm.name,
    summary: lm.summary,
    highlights: lm.highlights,
    sections: lm.sections,
    signText: lm.signText
  };
}

const MENU_PRESET_OCR = (items) => items.map((it) => `${it.name.th} ........ ${it.priceSatang / 100} บาท`).join('\n');

// ---------------------------------------------------------------- API
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '3.0.0', time: new Date().toISOString(), ai: ai.aiStatus() });
});

app.get('/api/init-data', (req, res) => {
  const visitorId = visitor(req);
  const merchants = activeMerchants();
  const ids = new Set(merchants.map((m) => m.id));
  const items = db.prepare('SELECT * FROM menu_items WHERE active = 1 ORDER BY merchant_id, id').all().filter((i) => ids.has(i.merchant_id));
  res.json({
    ok: true,
    originGps: ORIGIN_GPS,
    landmarks: loadLandmarks().map(publicLandmark),
    merchants: merchants.map(publicMerchant),
    menuItems: items.map(publicItem),
    pricing: {
      vipPassSatang: PRICING.vipPassSatang,
      saasMonthlySatang: PRICING.saasMonthlySatang,
      hotelSaasMonthlySatang: PRICING.hotelSaasMonthlySatang,
      orderFeeRate: PRICING.orderFeeRate,
      restaurantFeeRate: PRICING.restaurantFeeRate,
      hotelFeeRate: PRICING.hotelFeeRate,
      vipVoucherTotalSatang: PRICING.vipVouchers.reduce((s, v) => s + v.valueSatang * v.count, 0)
    },
    dietaryFlags: Object.fromEntries(Object.entries(DIETARY_FLAGS).map(([k, v]) => [k, v.label])),
    categories: CATEGORIES,
    visitor: visitorState(db, visitorId),
    ai: ai.aiStatus()
  });
});

app.post('/api/scan-heritage', scanLimiter, upload.single('image'), wrap(async (req, res) => {
  const visitorId = visitor(req);
  const landmarks = loadLandmarks();
  const image = verifiedImage(req);
  const presetId = (req.body && req.body.preset) || null;
  if (!image && !presetId) throw new HttpError(400, 'กรุณาเลือกภาพหรือกดปุ่มทดลองสแกน');
  if (presetId && !landmarks.some((l) => l.id === presetId)) throw new HttpError(400, 'ไม่พบป้ายตัวอย่างนี้');

  const scan = await ai.scanHeritage({ landmarks, presetId: image ? null : presetId, image });
  bumpMetric(db, 'heritage_scans');

  if (!scan.retrieval) {
    return res.json({
      ok: true,
      matched: false,
      source: scan.source,
      latencyMs: scan.latencyMs,
      ocrText: scan.ocrText,
      notice: scan.reason === 'no_api_key'
        ? 'โหมดสำรอง: ยังไม่ได้ตั้งค่า GEMINI_API_KEY ระบบจึงอ่านภาพจริงไม่ได้ — เลือกโบราณสถานที่คุณกำลังยืนอยู่เพื่อเปิดข้อมูลกรมศิลปากรที่ตรวจสอบแล้ว'
        : scan.reason
          ? 'AI ไม่ตอบสนองหรือเกินโควตา ระบบสลับเป็นโหมดสำรองทันที — เลือกโบราณสถานเพื่อเปิดข้อมูลที่ตรวจสอบแล้ว'
          : 'อ่านป้ายได้แต่ไม่พบสถานที่ที่ตรงกันในฐานข้อมูล — เลือกโบราณสถานเพื่อเปิดข้อมูลที่ตรวจสอบแล้ว',
      choices: landmarks.map((l) => ({ id: l.id, name: l.name, lat: l.lat, lng: l.lng }))
    });
  }

  const lm = scan.retrieval.landmark;
  const reward = issueStampRewards(db, visitorId, lm.id);
  res.json({
    ok: true,
    matched: true,
    source: scan.source,
    latencyMs: scan.latencyMs,
    ocrText: scan.ocrText,
    retrieval: { landmarkId: lm.id, matchedKeywords: scan.retrieval.matchedKeywords, confidence: scan.retrieval.confidence, corpus: 'phitlok_nexus.sqlite / Fine Arts Dept. Verified' },
    landmark: publicLandmark(lm),
    reward: { ...reward, eligible: true },
    visitor: visitorState(db, visitorId)
  });
}));

app.post('/api/scan-menu', scanLimiter, upload.single('image'), wrap(async (req, res) => {
  visitor(req);
  const image = verifiedImage(req);
  const preset = req.body && req.body.preset;
  bumpMetric(db, 'menu_scans');

  if (!image) {
    const slugMap = {
      'hoi-kha': 'hoi-kha-noodles',
      'juk-kai': 'juk-kai-thai',
      'pa-lom': 'pa-lom-noodles',
      'pa-thanom': 'pa-thanom-padthai',
      'otop': 'bang-krathum-otop'
    };
    const targetSlug = slugMap[preset] || (preset === 'hoi-kha' ? 'hoi-kha-noodles' : null);
    if (!targetSlug) throw new HttpError(400, 'กรุณาเลือกภาพเมนูหรือกดปุ่มทดลองสแกน');
    const m = db.prepare('SELECT * FROM merchants WHERE slug = ?').get(targetSlug);
    const items = db.prepare('SELECT * FROM menu_items WHERE merchant_id = ? AND active = 1 ORDER BY id').all(m.id).map(publicItem);
    return res.json({ ok: true, source: 'preset', latencyMs: 12, scanId: null, merchant: publicMerchant(m), ocrText: MENU_PRESET_OCR(items), items });
  }

  const merchantId = Number(req.body.merchantId);
  const m = db.prepare("SELECT * FROM merchants WHERE id = ? AND status = 'active'").get(merchantId);
  if (!m) throw new HttpError(400, 'กรุณาเลือกร้านค้าที่จะผูกเมนูนี้');
  const scan = await ai.scanMenuImage(image);
  const scanId = crypto.randomUUID();
  db.prepare('INSERT INTO menu_scans (id, merchant_id, items_json, source, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(scanId, m.id, JSON.stringify(scan.items), scan.source, new Date().toISOString());
  res.json({
    ok: true,
    source: scan.source,
    latencyMs: scan.latencyMs,
    scanId,
    merchant: publicMerchant(m),
    ocrText: scan.ocrText,
    notice: scan.source === 'fallback-template'
      ? (scan.reason === 'no_api_key'
        ? 'โหมดสำรอง: ยังไม่ได้ตั้งค่า GEMINI_API_KEY จึงแสดง "เทมเพลตเมนูแปล 6 ภาษาอัตโนมัติ" เพื่อสาธิตการแปลภาษาและตัวกรองภูมิแพ้'
        : 'AI ไม่ตอบสนองหรือเกินโควตา ระบบสลับเป็นเทมเพลตเมนูแปล 6 ภาษาอัตโนมัติทันที')
      : null,
    items: scan.items.map((it, idx) => ({ ...it, id: `scan:${scanId}:${idx}`, merchantId: m.id, available: true, source: scan.source }))
  });
}));

app.get('/api/audio-guide/:landmarkId', (req, res) => {
  const visitorId = visitor(req);
  const lang = LANGS.includes(req.query.lang) ? req.query.lang : 'th';
  const mode = req.query.mode === 'full' ? 'full' : 'summary';
  const lm = loadLandmarks().find((l) => l.id === req.params.landmarkId);
  if (!lm) throw new HttpError(404, 'ไม่พบสถานที่');
  const state = visitorState(db, visitorId);
  const needsVip = mode === 'full';
  if (needsVip && !state.vip.active) {
    return res.status(402).json({ ok: false, needsVip: true, error: 'เสียงบรรยายเชิงลึกฉบับเต็มสำหรับผู้ถือบัตร Phitsanulok VIP Pass (99฿)' });
  }
  const refText = lm.fineArtsRef ? (lm.fineArtsRef[lang] || lm.fineArtsRef.en || lm.fineArtsRef.th) : '';
  const text = mode === 'full'
    ? [lm.name[lang] || lm.name.en, lm.summary[lang] || lm.summary.en, ...lm.sections.map((s) => `${s.title[lang] || s.title.en}. ${s.body[lang] || s.body.en}`), refText].filter(Boolean).join('\n\n')
    : `${lm.name[lang] || lm.name.en}. ${lm.summary[lang] || lm.summary.en}. ${refText}`;
  bumpMetric(db, 'audio_guides_played');
  res.json({ ok: true, lang, mode, text, fineArtsRef: lm.fineArtsRef });
});

app.post('/api/quote', payLimiter, (req, res) => {
  const visitorId = visitor(req);
  const q = quoteOrder(db, visitorId, req.body || {});
  res.json({ ok: true, breakdown: q.breakdown, ticketPreview: q.ticketPreview, warnings: q.warnings });
});

app.post('/api/checkout', payLimiter, wrap(async (req, res) => {
  const visitorId = visitor(req);
  const result = await createCheckout(db, visitorId, req.body || {});
  res.json({ ok: true, ...result });
}));

app.post('/api/checkout/:id/confirm', payLimiter, (req, res) => {
  const visitorId = visitor(req);
  if (!UUID_RE.test(req.params.id)) throw new HttpError(400, 'รหัสรายการไม่ถูกต้อง');
  const result = confirmCheckout(db, visitorId, req.params.id);
  res.json({ ok: true, ...result, visitor: visitorState(db, visitorId) });
});

app.get('/api/metrics', (req, res) => {
  const streams = Object.fromEntries(db.prepare(`SELECT type, COUNT(*) AS count, SUM(platform_revenue_satang) AS revenue, SUM(gross_satang) AS gross
    FROM transactions GROUP BY type`).all().map((r) => [r.type, { count: r.count, revenueSatang: r.revenue || 0, grossSatang: r.gross || 0 }]));
  const zero = { count: 0, revenueSatang: 0, grossSatang: 0 };
  const vip = streams.vip_pass || zero;
  const restSaas = streams.saas_subscription || zero;
  const hotelSaas = streams.hotel_saas || zero;
  const orders = streams.order || zero;

  const rows = db.prepare(`SELECT date(created_at, '+7 hours') AS d, type, SUM(platform_revenue_satang) AS revenue, COUNT(*) AS n
    FROM transactions WHERE created_at >= ? GROUP BY d, type`).all(new Date(Date.now() - 15 * 86400000).toISOString());
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() + 7 * 3600000 - i * 86400000).toISOString().slice(0, 10);
    const pick = (t) => rows.find((r) => r.d === d && r.type === t) || { revenue: 0, n: 0 };
    const rSaas = pick('saas_subscription');
    const hSaas = pick('hotel_saas');
    days.push({
      date: d,
      vipSatang: pick('vip_pass').revenue, vipCount: pick('vip_pass').n,
      saasSatang: rSaas.revenue, saasCount: rSaas.n,
      hotelSaasSatang: hSaas.revenue, hotelSaasCount: hSaas.n,
      feeSatang: pick('order').revenue, orderCount: pick('order').n
    });
  }

  const recent = db.prepare(`SELECT t.*, m.name_json, m.kind FROM transactions t LEFT JOIN merchants m ON m.id = t.merchant_id
    ORDER BY t.created_at DESC, t.id DESC LIMIT 16`).all().map((t) => ({
    id: t.id,
    type: t.type,
    grossSatang: t.gross_satang,
    platformRevenueSatang: t.platform_revenue_satang,
    merchantName: t.name_json ? parse(t.name_json, {}) : null,
    merchantKind: t.kind || null,
    createdAt: t.created_at
  }));

  const allOrders = db.prepare(`SELECT o.*, m.name_json, m.kind FROM orders o JOIN merchants m ON m.id = o.merchant_id
    ORDER BY o.created_at DESC, o.id DESC LIMIT 20`).all().map((o) => {
    const tk = parse(o.ticket_json, {});
    return {
      id: o.id,
      orderNo: o.order_no,
      merchantId: o.merchant_id,
      merchantName: parse(o.name_json, {}),
      merchantKind: o.kind,
      guestLang: o.guest_lang,
      subtotalSatang: o.subtotal_satang,
      discountSatang: o.discount_satang,
      feeSatang: o.fee_satang,
      platformFeeSatang: o.fee_satang,
      totalSatang: o.total_satang,
      status: o.status,
      flags: tk.warningsTh || [],
      ticket: tk,
      createdAt: o.created_at
    };
  });

  const activeRestaurants = db.prepare("SELECT COUNT(*) AS n FROM merchants WHERE status = 'active' AND kind = 'restaurant'").get().n;
  const activeHotels = db.prepare("SELECT COUNT(*) AS n FROM merchants WHERE status = 'active' AND kind = 'hotel'").get().n;
  const landmarksCount = db.prepare('SELECT COUNT(*) AS n FROM landmarks').get().n;
  const activeCount = activeRestaurants + activeHotels;
  const confirmedPartners = db.prepare("SELECT COUNT(*) AS n FROM merchants WHERE status='active' AND partner_status='confirmed'").get().n;

  const partnerStats = db.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM orders o WHERE o.merchant_id = m.id) AS total_orders,
      (SELECT COALESCE(SUM(o.subtotal_satang - o.discount_satang), 0) FROM orders o WHERE o.merchant_id = m.id) AS gmv_satang,
      (SELECT COALESCE(SUM(o.fee_satang), 0) FROM orders o WHERE o.merchant_id = m.id) AS fee_satang
    FROM merchants m WHERE m.status = 'active' ORDER BY m.id
  `).all().map((m) => ({
    ...publicMerchant(m),
    totalOrders: m.total_orders,
    ordersCount: m.total_orders,
    gmvSatang: m.gmv_satang,
    feeSatang: m.fee_satang
  }));

  const assumptions = Object.fromEntries(db.prepare("SELECT key, value FROM platform_metrics WHERE key LIKE 'assume_%'").all()
    .map((r) => [r.key.replace('assume_', ''), r.value]));

  const totalRevenueSatang = vip.revenueSatang + restSaas.revenueSatang + hotelSaas.revenueSatang + orders.revenueSatang;

  res.json({
    ok: true,
    demoMode: true,
    trip: trip.tripMetrics(db),
    generatedAt: new Date().toISOString(),
    totals: {
      landmarksCount,
      placesOnMap: landmarksCount + activeCount,
      confirmedPartners,
      platformRevenueSatang: totalRevenueSatang,
      vip: { passesSold: vip.count, revenueSatang: vip.revenueSatang },
      restaurantSaas: {
        payments: restSaas.count,
        revenueSatang: restSaas.revenueSatang,
        activeRestaurants,
        mrrSatang: activeRestaurants * PRICING.saasMonthlySatang
      },
      hotelSaas: {
        payments: hotelSaas.count,
        revenueSatang: hotelSaas.revenueSatang,
        activeHotels,
        mrrSatang: activeHotels * PRICING.hotelSaasMonthlySatang
      },
      saas: {
        payments: restSaas.count + hotelSaas.count,
        revenueSatang: restSaas.revenueSatang + hotelSaas.revenueSatang,
        activeMerchants: activeCount,
        activeRestaurants,
        activeHotels,
        mrrSatang: activeRestaurants * PRICING.saasMonthlySatang + activeHotels * PRICING.hotelSaasMonthlySatang
      },
      orders: {
        count: orders.count,
        feeRevenueSatang: orders.revenueSatang,
        gmvSatang: orders.grossSatang - orders.revenueSatang
      }
    },
    counters: {
      heritageScans: metricValue('heritage_scans'),
      menuScans: metricValue('menu_scans'),
      audioGuides: metricValue('audio_guides_played')
    },
    daily: days,
    recent,
    allOrders,
    partners: partnerStats,
    pricing: {
      vipPassSatang: PRICING.vipPassSatang,
      saasMonthlySatang: PRICING.saasMonthlySatang,
      hotelSaasMonthlySatang: PRICING.hotelSaasMonthlySatang,
      orderFeeRate: PRICING.orderFeeRate,
      restaurantFeeRate: PRICING.restaurantFeeRate,
      hotelFeeRate: PRICING.hotelFeeRate
    },
    assumptions,
    ai: ai.aiStatus()
  });
});

// ---------------------------------------------------------------- merchant console
// All operator controls below are demo controls; no real partner authentication is claimed.
app.get('/api/trip/live', (req, res) => res.json({ ok:true, demo:true, serverTime:new Date().toISOString(), places:trip.livePlaces(db) }));
app.get('/api/trip/mine', (req, res) => res.json({ ok:true, serverTime:new Date().toISOString(), ...trip.visitorTrip(db,visitor(req)) }));
app.post('/api/trip/rescue', (req, res) => res.json({ ok:true,...trip.rescue(db,visitor(req),req.body || {}) }));
app.post('/api/trip/locks', (req, res) => res.json({ ok:true, lock:trip.lockTable(db,visitor(req),Number(req.body.merchantId)) }));
app.post('/api/trip/locks/:id/cancel', (req, res) => res.json({ ok:true,lock:trip.changeLock(db,req.params.id,{visitorId:visitor(req)},'cancelled') }));
app.post('/api/demo/live/:key', (req, res) => res.json({ ok:true,demo:true,place:trip.updateLive(db,req.params.key,req.body || {}) }));
app.post('/api/merchants/:id/locks/:lockId', (req,res) => {
  const m = merchantOr404(req.params.id);
  res.json({ ok:true,lock:trip.changeLock(db,req.params.lockId,{merchantId:m.id},req.body.status) });
});
app.post('/api/orders/:id/allergy-review', (req,res) => {
  const m = merchantOr404(req.body.merchantId);
  res.json({ ok:true,safety:trip.reviewSafety(db,Number(req.params.id),m.id,req.body) });
});

function merchantOr404(id) {
  const m = db.prepare("SELECT * FROM merchants WHERE id = ? AND status = 'active'").get(Number(id));
  if (!m) throw new HttpError(404, 'ไม่พบร้านค้าหรือโรงแรม');
  return m;
}

app.get('/api/merchants/:id/dashboard', (req, res) => {
  const m = merchantOr404(req.params.id);
  const startOfDayTh = new Date(Date.now() + 7 * 3600000);
  startOfDayTh.setUTCHours(0, 0, 0, 0);
  const todayIso = new Date(startOfDayTh.getTime() - 7 * 3600000).toISOString();
  const monthStart = new Date(startOfDayTh.getTime() - 7 * 3600000);
  monthStart.setUTCDate(1);
  const today = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(subtotal_satang - discount_satang), 0) AS sales FROM orders WHERE merchant_id = ? AND created_at >= ?`).get(m.id, todayIso);
  const month = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(subtotal_satang - discount_satang), 0) AS sales, COALESCE(SUM(fee_satang), 0) AS fees FROM orders WHERE merchant_id = ? AND created_at >= ?`).get(m.id, monthStart.toISOString());
  const open = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE merchant_id = ? AND status IN ('new','preparing','ready')").get(m.id).n;
  const orders = db.prepare('SELECT * FROM orders WHERE merchant_id = ? ORDER BY created_at DESC, id DESC LIMIT 25').all(m.id).map((o) => ({
    id: o.id, orderNo: o.order_no, status: o.status, createdAt: o.created_at, guestLang: o.guest_lang,
    ticket: parse(o.ticket_json, {}), subtotalSatang: o.subtotal_satang, discountSatang: o.discount_satang,
    feeSatang: o.fee_satang, totalSatang: o.total_satang, couponCode: o.coupon_code,
    safety: trip.safetyFor(db,o.id)
  }));
  const menu = db.prepare('SELECT * FROM menu_items WHERE merchant_id = ? AND active = 1 ORDER BY id').all(m.id).map(publicItem);
  res.json({
    ok: true,
    merchant: publicMerchant(m),
    live: trip.livePlaces(db).find((p) => p.merchantId === m.id) || null,
    fastTracks: trip.merchantLocks(db,m.id),
    stats: {
      todayOrders: today.n,
      todaySalesSatang: today.sales,
      monthOrders: month.n,
      monthSalesSatang: month.sales,
      monthPlatformFeeSatang: month.fees,
      openOrders: open
    },
    orders,
    menu
  });
});

app.post('/api/merchants/:id/status', (req, res) => {
  const m = merchantOr404(req.params.id);
  const shopStatus = req.body && req.body.shopStatus === 'busy' ? 'busy' : 'open';
  db.prepare('UPDATE merchants SET shop_status = ? WHERE id = ?').run(shopStatus, m.id);
  const updated = db.prepare('SELECT * FROM merchants WHERE id = ?').get(m.id);
  res.json({ ok: true, shopStatus, merchant: publicMerchant(updated) });
});

app.post('/api/merchants/:id/menu/:itemId/toggle', (req, res) => {
  const m = merchantOr404(req.params.id);
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ? AND merchant_id = ? AND active = 1').get(Number(req.params.itemId), m.id);
  if (!item) throw new HttpError(404, 'ไม่พบรายการเมนูนี้');
  const nextAvail = req.body && typeof req.body.available === 'boolean' ? (req.body.available ? 1 : 0) : (item.available ? 0 : 1);
  db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(nextAvail, item.id);
  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(item.id);
  res.json({ ok: true, available: updated.available !== 0, item: publicItem(updated) });
});

const NEXT_STATUS = { new: 'preparing', preparing: 'ready', ready: 'done' };
app.post('/api/orders/:id/status', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!order || order.merchant_id !== Number(req.body && req.body.merchantId)) throw new HttpError(404, 'ไม่พบออเดอร์ของร้านนี้');
  const next = NEXT_STATUS[order.status];
  if (!next || req.body.status !== next) throw new HttpError(409, 'สถานะออเดอร์ไม่ถูกต้อง');
  trip.checkKitchenReady(db,order.id);
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(next, order.id);
  res.json({ ok: true, id: order.id, status: next });
});

app.post('/api/merchants/:id/menu/publish', (req, res) => {
  const m = merchantOr404(req.params.id);
  const scanId = String((req.body && req.body.scanId) || '');
  if (!UUID_RE.test(scanId)) throw new HttpError(400, 'รหัสการสแกนไม่ถูกต้อง');
  const scan = db.prepare('SELECT * FROM menu_scans WHERE id = ? AND merchant_id = ?').get(scanId, m.id);
  if (!scan) throw new HttpError(404, 'ไม่พบผลการสแกนเมนูของร้านนี้');
  const prefix = `AI-${scanId.slice(0, 8)}-`;
  if (db.prepare('SELECT 1 FROM menu_items WHERE merchant_id = ? AND code LIKE ?').get(m.id, prefix + '%')) {
    throw new HttpError(409, 'เมนูชุดนี้ถูกเผยแพร่ไปแล้ว');
  }
  const items = parse(scan.items_json, []);
  const now = new Date().toISOString();
  transaction(db, () => {
    const ins = db.prepare(`INSERT INTO menu_items (merchant_id, code, name_json, desc_json, image_url, fallback_image, price_satang, unit, category, allergens_json,
      spicy, vegetarian, halal, source, active, available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ai', 1, 1, ?)`);
    items.forEach((it, i) => ins.run(
      m.id, prefix + i, JSON.stringify(it.name), JSON.stringify(it.desc),
      it.imageUrl || '/assets/photos/hoi-kha-noodles.jpg',
      it.fallbackImage || '/assets/photos/hoi-kha-noodles.jpg',
      it.priceSatang, it.unit, it.category, JSON.stringify(it.allergens),
      it.spicy, it.vegetarian ? 1 : 0, it.halal ? 1 : 0, now
    ));
  });
  res.json({ ok: true, published: items.length });
});

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'ไม่พบ API นี้' }));

// ---------------------------------------------------------------- static frontend
const sendPage = (file) => (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).sendFile(path.join(__dirname, 'public', file));
};
app.get(['/', '/index', '/index.html'], sendPage('index.html'));
app.get(['/app', '/app/', '/app.html'], sendPage('app.html'));
app.get(['/credits', '/credits/', '/credits.html'], sendPage('credits.html'));

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  }
}));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// ---------------------------------------------------------------- errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'ไฟล์ใหญ่เกิน 5MB กรุณาย่อขนาดภาพ' : 'การอัปโหลดไม่ถูกต้อง';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ ok: false, error: msg });
  }
  if (err instanceof HttpError || err instanceof trip.TripError) return res.status(err.status).json({ ok: false, error: err.message, ...(err.extra || {}) });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
  if (err.type === 'entity.too.large') return res.status(413).json({ ok: false, error: 'ข้อมูลใหญ่เกินไป' });
  console.error(err);
  res.status(500).json({ ok: false, error: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PHITLOK NEXUS v2.0 running at http://localhost:${PORT}`);
    console.log(`AI: ${ai.aiStatus().configured ? `Gemini (${ai.aiStatus().model})` : 'no GEMINI_API_KEY — strict fallback mode'}`);
    console.log(`PromptPay target (platform): ${PLATFORM_PROMPTPAY_ID === '0000000000' ? 'DEMO 000-000-0000' : 'configured'}`);
  });
}

module.exports = app;
