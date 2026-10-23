'use strict';
/*
 * AI Universal Smart Lens (v2.0 — 6-Language OCR + RAG).
 *  - Gemini Vision reads heritage signs or paper menus.
 *  - Retrieval is strictly grounded in the curated SQLite knowledge base with
 *    Fine Arts Department citations.
 *  - Strict fallback ensures instant response even without an API key or during cooldown.
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 9000);
const BREAKER_MS = 60000;

let breakerUntil = 0;
let lastError = null;

function geminiAvailable() {
  return !!GEMINI_KEY && Date.now() > breakerUntil;
}

function aiStatus() {
  return {
    provider: 'gemini',
    model: GEMINI_MODEL,
    configured: !!GEMINI_KEY,
    available: geminiAvailable(),
    breakerOpenUntil: breakerUntil > Date.now() ? new Date(breakerUntil).toISOString() : null,
    lastError
  };
}

async function geminiJson(imageBuffer, mimeType, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: imageBuffer.toString('base64') } }, { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) breakerUntil = Date.now() + BREAKER_MS;
      throw new Error(`Gemini HTTP ${res.status}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    return JSON.parse(text);
  } catch (err) {
    lastError = { message: err.name === 'AbortError' ? 'timeout' : err.message, at: new Date().toISOString() };
    if (err.name === 'AbortError') breakerUntil = Date.now() + BREAKER_MS;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------- Heritage: OCR → RAG ----------------

function normalise(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '');
}

/** Keyword retrieval over the curated landmark corpus. */
function retrieveLandmark(landmarks, ocrText, hintId) {
  const text = normalise(ocrText);
  const scored = landmarks.map((lm) => {
    const matched = lm.keywords.filter((k) => text.includes(normalise(k)));
    let score = matched.length;
    if (hintId && hintId === lm.id) score += 0.5;
    return { landmark: lm, matched, score };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 1) return null;
  const total = scored.reduce((s, x) => s + x.score, 0) || 1;
  return { landmark: best.landmark, matchedKeywords: best.matched, confidence: +(best.score / total).toFixed(2) };
}

const HERITAGE_PROMPT = `You are an OCR engine for heritage information signs in Phitsanulok, Thailand.
Read ALL text visible on the sign exactly as written (Thai or other languages). Do not invent text.
Then choose which landmark the sign belongs to, from:
- "wat-yai" (Wat Phra Si Rattana Mahathat / Phra Phuttha Chinnarat)
- "chan-palace" (Chan Royal Palace / King Naresuan birthplace)
- "wat-nang-phaya" (Wat Nang Phaya / Queen Wisutthikasat)
- "wat-ratchaburana" (Wat Ratchaburana / Luang Chedi / Ramakien murals)
- "city-pillar" (Phitsanulok City Pillar Shrine & Chom Nan Park)
- or "unknown".
Respond with JSON: {"ocrText": string, "landmarkId": string, "confidence": number between 0 and 1}`;

async function scanHeritage({ landmarks, presetId, image }) {
  const started = Date.now();
  if (presetId) {
    const lm = landmarks.find((l) => l.id === presetId);
    const retrieval = retrieveLandmark(landmarks, lm.signText, lm.id);
    return { source: 'preset', ocrText: lm.signText, retrieval, latencyMs: Date.now() - started };
  }
  if (!geminiAvailable()) {
    return { source: 'fallback', ocrText: '', retrieval: null, latencyMs: Date.now() - started, reason: GEMINI_KEY ? 'ai_cooldown' : 'no_api_key' };
  }
  try {
    const out = await geminiJson(image.buffer, image.mimetype, HERITAGE_PROMPT);
    const ocrText = String(out.ocrText || '').slice(0, 4000);
    const retrieval = retrieveLandmark(landmarks, ocrText, out.landmarkId);
    return { source: 'gemini', ocrText, retrieval, latencyMs: Date.now() - started };
  } catch {
    return { source: 'fallback', ocrText: '', retrieval: null, latencyMs: Date.now() - started, reason: 'ai_error' };
  }
}

// ---------------- Menu: OCR → structured 6-language menu ----------------

const ALLOWED_ALLERGENS = ['peanut', 'pork', 'beef', 'shellfish', 'dairy', 'gluten', 'egg', 'soy'];
const ALLOWED_CATEGORIES = ['food', 'drink', 'dessert', 'souvenir', 'stay'];

const MENU_PROMPT = `You are a menu digitiser for Thai restaurants, OTOP souvenir shops, and hotels in Phitsanulok.
Read the photographed paper menu. For every item with a price, return JSON:
{"ocrText": string (raw text you read),
 "items": [{"name_th": string, "name_en": string, "name_zh": string (Simplified Chinese), "name_ja": string (Japanese), "name_ko": string (Korean), "name_fr": string (French),
   "desc_en": string (short, max 14 words, describe likely ingredients),
   "price": number (Thai baht), "unit": string (Thai classifier e.g. ชาม, จาน, แก้ว, ถุง, คืน),
   "category": one of "food","drink","dessert","souvenir","stay",
   "allergens": array from ["peanut","pork","beef","shellfish","dairy","gluten","egg","soy"],
   "spicy": integer 0-3, "vegetarian": boolean, "halal": boolean (true only if no pork/alcohol is likely)}]}
Only include items actually printed on the menu. Maximum 40 items.`;

const clip = (s, n) => String(s == null ? '' : s).replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, n);

function sanitiseMenuItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.slice(0, 40).map((r) => {
    const price = Math.round(Number(r.price) * 100);
    const th = clip(r.name_th, 80);
    if (!th || !Number.isFinite(price) || price < 100 || price > 1000000) return null;
    const en = clip(r.name_en, 80) || th;
    const descEn = clip(r.desc_en, 140);
    return {
      name: {
        th,
        en,
        zh: clip(r.name_zh, 80) || en,
        ja: clip(r.name_ja, 80) || en,
        ko: clip(r.name_ko, 80) || en,
        fr: clip(r.name_fr, 80) || en
      },
      desc: { th: '', en: descEn, zh: '', ja: '', ko: '', fr: '' },
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
      fallbackImage: '/assets/photos/hoi-kha-noodles.jpg',
      priceSatang: price,
      unit: clip(r.unit, 10) || 'ที่',
      category: ALLOWED_CATEGORIES.includes(r.category) ? r.category : 'food',
      allergens: Array.isArray(r.allergens) ? [...new Set(r.allergens.filter((a) => ALLOWED_ALLERGENS.includes(a)))] : [],
      spicy: Math.max(0, Math.min(3, parseInt(r.spicy, 10) || 0)),
      vegetarian: r.vegetarian === true,
      halal: r.halal === true
    };
  }).filter(Boolean);
}

// 6-language fallback template when no Gemini API key is configured.
const FALLBACK_MENU_TEMPLATE = [
  {
    name: {
      th: 'ก๋วยเตี๋ยวต้มยำสุโขทัยพิเศษ',
      en: 'Special Sukhothai Tom Yum Noodles',
      zh: '特制素可泰酸辣花生汤面',
      ja: '特製スコータイ風トムヤムヌードル',
      ko: '특제 수코타이식 똠얌 국수',
      fr: 'Nouilles Tom Yum spéciales de Sukhothai'
    },
    desc: {
      th: 'น้ำซุปต้มยำมะนาวสด หมูแดง ถั่วลิสงคั่ว',
      en: 'Zesty lime tom yum broth, roast pork, roasted peanuts',
      zh: '青柠酸辣汤、叉烧、烤花生',
      ja: '生ライムのトムヤムスープ、焼豚、煎りピーナッツ',
      ko: '생라임 똠얌 육수, 차슈, 볶은 땅콩',
      fr: 'Bouillon tom yum au citron vert, porc rôti et cacahuètes'
    },
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    fallbackImage: '/assets/photos/hoi-kha-noodles.jpg',
    priceSatang: 6500, unit: 'ชาม', category: 'food', allergens: ['pork', 'peanut'], spicy: 2, vegetarian: false, halal: false
  },
  {
    name: {
      th: 'ผัดผักบุ้งลอยฟ้าไฟแดง',
      en: 'Wok-Tossed Flying Morning Glory',
      zh: '大火快炒飞天空心菜',
      ja: '空飛ぶ空芯菜の強火炒め（パックブン・ロイファー）',
      ko: '하늘을 나는 공심채 강불 볶음',
      fr: 'Liseron d’eau sauté au wok à feu vif'
    },
    desc: {
      th: 'ผักบุ้งไทยผัดพริกกระเทียมเต้าเจี้ยวหอมกระทะ',
      en: 'Crisp morning glory wok-fried with garlic, chili, and soybean paste',
      zh: '脆嫩空心菜配蒜蓉辣椒豆瓣酱大火快炒',
      ja: 'ニンニク・唐辛子・タオチオで強火炒めにしたシャキシャキ空芯菜',
      ko: '마늘과 고추, 된장 소스로 센 불에 볶아낸 아삭한 공심채',
      fr: 'Liseron d’eau croquant sauté à l’ail, au piment et à la pâte de soja'
    },
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    fallbackImage: '/assets/photos/food-soup.jpg',
    priceSatang: 7000, unit: 'จาน', category: 'food', allergens: ['soy'], spicy: 1, vegetarian: true, halal: true
  },
  {
    name: {
      th: 'ลูกชิ้นปลากรายลวกจิ้มน้ำจิ้มซีฟู้ด',
      en: 'Boiled Featherback Fish Balls with Spicy Seafood Dip',
      zh: '手打弓背鱼丸配泰式海鲜辣酱',
      ja: '自家製ナマズつみれ団子（スパイシーシーフードソース）',
      ko: '수제 생선 완자 데침 & 매콤 시푸드 소스',
      fr: 'Boulettes de poisson pochées et sauce fruits de mer épicée'
    },
    desc: {
      th: 'ลูกชิ้นปลากรายแท้เนื้อเหนียวเด้ง ลวกโรยกระเทียมเจียว',
      en: 'Bouncy local river fish balls topped with crispy garlic and lime-chili sauce',
      zh: '弹牙河鱼丸配炸蒜酥与青柠海鲜辣酱',
      ja: 'プリプリの川魚つみれにフライドガーリックとライムチリソース',
      ko: '쫄깃한 강생선 완자에 마늘 후레이크와 라임 칠리 소스를 곁들인 메뉴',
      fr: 'Boulettes de poisson de rivière souples à l’ail frit et sauce citron vert-piment'
    },
    imageUrl: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=800&q=80',
    fallbackImage: '/assets/photos/pa-lom-noodles.jpg',
    priceSatang: 8000, unit: 'จาน', category: 'food', allergens: [], spicy: 2, vegetarian: false, halal: true
  },
  {
    name: {
      th: 'น้ำส้มมะปี๊ดโซดาเย็น',
      en: 'Iced Calamansi Citrus Fizz',
      zh: '冰镇四季橘苏打饮',
      ja: '冷たいカラマンシー（四季橘）ソーダ',
      ko: '아이스 깔라만시 시트러스 소다',
      fr: 'Soda glacé au calamansi frais'
    },
    desc: {
      th: 'ส้มมะปี๊ดคั้นสดผสมน้ำผึ้งและโซดาซ่าสดชื่น',
      en: 'Fresh-squeezed calamansi lime with wild honey and sparkling soda',
      zh: '鲜榨四季橘配野蜂蜜与气泡苏打',
      ja: '生搾りカラマンシー果汁に野生蜂蜜を合わせた爽快ソーダ',
      ko: '갓 짠 깔라만시 과즙에 야생 꿀과 탄산수를 더한 청량 음료',
      fr: 'Jus de calamansi fraîchement pressé au miel sauvage et eau pétillante'
    },
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
    fallbackImage: '/assets/photos/food-dessert.jpg',
    priceSatang: 4500, unit: 'แก้ว', category: 'drink', allergens: [], spicy: 0, vegetarian: true, halal: true
  }
];

async function scanMenuImage(image) {
  const started = Date.now();
  if (!geminiAvailable()) {
    return { source: 'fallback-template', ocrText: '', items: FALLBACK_MENU_TEMPLATE, latencyMs: Date.now() - started, reason: GEMINI_KEY ? 'ai_cooldown' : 'no_api_key' };
  }
  try {
    const out = await geminiJson(image.buffer, image.mimetype, MENU_PROMPT);
    const items = sanitiseMenuItems(out.items);
    if (!items.length) throw new Error('no items recognised');
    return { source: 'gemini', ocrText: clip(out.ocrText, 4000), items, latencyMs: Date.now() - started };
  } catch {
    return { source: 'fallback-template', ocrText: '', items: FALLBACK_MENU_TEMPLATE, latencyMs: Date.now() - started, reason: 'ai_error' };
  }
}

module.exports = { scanHeritage, scanMenuImage, retrieveLandmark, aiStatus, sanitiseMenuItems };
