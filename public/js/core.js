// Shared state, API client and small UI helpers — PHITLOK NEXUS v2.0

const VISITOR_KEY = 'phitlok.visitor';
const CART_KEY = 'phitlok.cart';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function uuid() {
  if (window.crypto && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch { /* insecure context: fall through */ }
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }

export const visitorId = (() => {
  const existing = storageGet(VISITOR_KEY);
  if (existing && UUID_RE.test(existing)) return existing;
  const id = uuid();
  storageSet(VISITOR_KEY, id);
  return id;
})();

export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data || {}; }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'x-visitor-id': visitorId };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch(path, { method, headers, body: payload });
  } catch {
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 0);
  }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || data.ok === false) throw new ApiError(data.error || `เกิดข้อผิดพลาด (HTTP ${res.status})`, res.status, data);
  return data;
}

// ---------------- state & events ----------------
function loadCart() {
  try {
    const c = JSON.parse(storageGet(CART_KEY) || 'null');
    if (c && Array.isArray(c.items)) return c;
  } catch { /* ignore */ }
  return { merchantId: null, items: [], flags: [], couponCode: 'auto', tableTh: 'โต๊ะ 4 / สั่งล่วงหน้า' };
}

export const state = {
  data: null,          // /api/init-data payload
  lang: 'th',          // content language for heritage + menu (th | en | zh | ja | ko | fr)
  role: 'tourist',
  mapLayers: new Set(['heritage', 'restaurant', 'souvenir', 'hotel']),  // categories shown on the map
  cart: loadCart()     // { merchantId, items: [{ id, qty, item }], flags, couponCode, tableTh }
};

export function saveCart() { storageSet(CART_KEY, JSON.stringify(state.cart)); emit('cart:changed', state.cart); }

const bus = new EventTarget();
export const on = (name, fn) => bus.addEventListener(name, (e) => fn(e.detail));
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

// ---------------- formatting (6 Languages) ----------------
export const LANGS = [
  { code: 'th', short: 'TH', label: 'TH · ไทย', speech: 'th-TH' },
  { code: 'en', short: 'EN', label: 'EN · English', speech: 'en-US' },
  { code: 'zh', short: 'CN', label: 'CN · 中文', speech: 'zh-CN' },
  { code: 'ja', short: 'JP', label: 'JP · 日本語', speech: 'ja-JP' },
  { code: 'ko', short: 'KR', label: 'KR · 한국어', speech: 'ko-KR' },
  { code: 'fr', short: 'FR', label: 'FR · Français', speech: 'fr-FR' }
];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function tr(obj, lang = state.lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || obj.th || '';
}

export function baht(satang) {
  const v = (Number(satang) || 0) / 100;
  const hasDecimals = Math.round(v * 100) % 100 !== 0;
  return '฿' + v.toLocaleString('th-TH', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 });
}

export function num(n) { return Math.round(Number(n) || 0).toLocaleString('th-TH'); }

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'เมื่อสักครู่';
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function langSwitcher(current, name = 'lang') {
  return `<div class="langs" role="group" aria-label="เลือกภาษา 6 ภาษา / 6-Language Switcher">${LANGS.map((l) =>
    `<button type="button" data-${name}="${l.code}" lang="${l.code}" aria-pressed="${l.code === current}">${l.label}</button>`).join('')}</div>`;
}

export const ALLERGEN_LABELS = {
  peanut: { th: 'ถั่วลิสง', en: 'Peanut', zh: '花生', ja: 'ピーナッツ', ko: '땅콩', fr: 'Arachides' },
  pork: { th: 'หมู', en: 'Pork', zh: '猪肉', ja: '豚肉', ko: '돼지고기', fr: 'Porc' },
  beef: { th: 'เนื้อวัว', en: 'Beef', zh: '牛肉', ja: '牛肉', ko: '소고기', fr: 'Bœuf' },
  shellfish: { th: 'อาหารทะเล', en: 'Shellfish', zh: '贝类', ja: '甲殻類・魚介', ko: '갑각류', fr: 'Fruits de mer' },
  dairy: { th: 'นม', en: 'Dairy', zh: '乳制品', ja: '乳製品', ko: '유제품', fr: 'Produits laitiers' },
  gluten: { th: 'กลูเตน', en: 'Gluten', zh: '麸质', ja: 'グルテン', ko: '글루텐', fr: 'Gluten' },
  egg: { th: 'ไข่', en: 'Egg', zh: '鸡蛋', ja: '卵', ko: '달걀', fr: 'Œufs' },
  soy: { th: 'ถั่วเหลือง', en: 'Soy', zh: '大豆', ja: '大豆', ko: '대두', fr: 'Soja' }
};

/** Short display name of a place (curated shortName, else the name without its parenthetical part). */
export function shortLabel(entity, lang = state.lang) {
  if (!entity) return '';
  const short = tr(entity.shortName, lang);
  if (short) return short;
  return tr(entity.name, lang).split(/ \(|（/)[0].trim();
}

export function svgFallbackUrl(label = 'PHITLOK NEXUS') {
  // Callers pass a short name; long labels shrink instead of being cut mid-word.
  const safe = String(label || 'PHITLOK NEXUS').replace(/[<>&"']/g, '');
  const size = safe.length > 28 ? 18 : 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#0F3D3E"/><circle cx="400" cy="200" r="52" fill="#B8860B"/><text x="400" y="310" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="${size}" font-weight="bold">${safe}</text><text x="400" y="346" text-anchor="middle" fill="#FFD97D" font-family="sans-serif" font-size="16">ภาพแทนชั่วคราว · รูปจริงโหลดไม่สำเร็จ</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function refreshIcons(root) {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    try {
      window.lucide.createIcons(root ? { nameAttr: 'data-lucide', attrs: { 'aria-hidden': 'true' } } : undefined);
    } catch { /* ignore */ }
  }
}

// ---------------- UI helpers ----------------
let toastTimer;
export function toast(message, kind = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = `toast${kind === 'error' ? ' toast--error' : kind === 'ok' ? ' toast--ok' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 6000 : 3800);
}

export function openDialog(id) {
  const d = document.getElementById(id);
  if (d && !d.open) d.showModal();
  refreshIcons();
  return d;
}
export function closeDialog(id) {
  const d = document.getElementById(id);
  if (d && d.open) d.close();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function atLeast(promise, ms) {
  const [result] = await Promise.all([promise, sleep(ms)]);
  return result;
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Wire an ARIA tablist: click or Arrow/Home/End keys select a tab and show its aria-controls panel. */
export function bindTablist(list, onSelect) {
  if (!list) return;
  const tabs = () => [...list.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    for (const t of tabs()) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    }
    if (focus) tab.focus();
    if (onSelect) onSelect(tab);
  };
  list.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t && list.contains(t)) select(t, false);
  });
  list.addEventListener('keydown', (e) => {
    const all = tabs();
    const i = all.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(all[(next + all.length) % all.length], true);
  });
}
