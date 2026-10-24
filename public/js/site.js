// Shared behaviour for every page (/, /app, /credits):
// 1. Persistent Light / Dark Theme Switcher (localStorage.getItem('phitlok_theme'))
// 2. Global SVG image fallback for broken images
// 3. Mobile navigation menu
// 4. Interactive Floating Scroll-Down Cue (auto-hides when window.scrollY > 350)
// 5. Universal VIP Upgrade & Comparison Modal + Topbar VIP status sync

const THEME_KEY = 'phitlok_theme';
const LANG_KEY = 'phitlok_lang';
const LANG_CODES = ['th', 'en', 'zh', 'ja', 'ko', 'fr'];
const LOCALE = { th: 'th-TH', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' };

/** The visitor's chosen language (shared by every page and by the app's content). */
export function getLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANG_CODES.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return 'th';
}

export function setLang(lang) {
  if (!LANG_CODES.includes(lang)) return;
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage unavailable */ }
  syncVipHeaderButtons();
  window.dispatchEvent(new CustomEvent('phitlok:lang', { detail: lang }));
}
const VIP_KEY = 'phitlok_vip_active';
const VISITOR_KEY = 'phitlok.visitor';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function ensureVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && UUID_RE.test(existing)) return existing;
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return '00000000-0000-4000-8000-000000000001';
  }
}

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return 'light';
}

export function applyTheme(theme, { persist = false } = {}) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = normalized;
  document.documentElement.classList.toggle('dark', normalized === 'dark');
  document.documentElement.style.colorScheme = normalized;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', normalized === 'dark' ? '#080B0C' : '#FAF7F2');
  if (persist) {
    try { localStorage.setItem(THEME_KEY, normalized); } catch { /* ignore */ }
  }
  document.querySelectorAll('[data-theme-toggle], #theme-toggle').forEach((btn) => {
    const isDark = normalized === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    const labelEl = btn.querySelector('.theme-toggle__label');
    if (labelEl) {
      labelEl.textContent = isDark ? '🌙 โหมดมืด (สลับเป็น ☀️ สว่าง)' : '☀️ สว่าง / 🌙 มืด';
    }
  });
  window.dispatchEvent(new CustomEvent('phitlok:theme', { detail: normalized }));
}

// Apply saved theme immediately to prevent flash when navigating between /, /app, and /credits
applyTheme(getSavedTheme(), { persist: false });

export function isVipActive() {
  try {
    return localStorage.getItem(VIP_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setVipActive(active = true) {
  try {
    localStorage.setItem(VIP_KEY, active ? 'true' : 'false');
  } catch { /* ignore */ }
  syncVipHeaderButtons();
}

export function syncVipHeaderButtons() {
  const active = isVipActive();
  document.querySelectorAll('#header-vip-btn').forEach((btn) => {
    btn.classList.toggle('is-vip-active', active);
    btn.textContent = V(active ? 'headerActive' : 'headerBuy');
  });
}

function bindScrollCue() {
  const cue = document.getElementById('scroll-cue');
  if (!cue || cue.dataset.bound === '1') return;
  cue.dataset.bound = '1';
  const onScroll = () => {
    cue.classList.toggle('is-hidden', window.scrollY > 350);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  cue.addEventListener('click', (e) => {
    const targetSel = cue.getAttribute('data-scroll-cue') || cue.getAttribute('href');
    if (targetSel && targetSel.startsWith('#')) {
      const target = document.querySelector(targetSel);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

// ---------------- VIP Pass upgrade dialog ----------------
// The server is the only source of truth: VIP turns on after /confirm succeeds (or the server says it already is).
// Every word is shown in the visitor's chosen language.
const VIP_TEXT = {
  headerBuy: { th: '✨ อัปเกรด VIP (99฿)', en: '✨ Upgrade to VIP (฿99)', zh: '✨ 升级 VIP（99 泰铢）', ja: '✨ VIP登録（99バーツ）', ko: '✨ VIP 업그레이드 (99바트)', fr: '✨ Passer VIP (99 ฿)' },
  headerActive: { th: '👑 สมาชิก VIP', en: '👑 VIP member', zh: '👑 VIP 会员', ja: '👑 VIP会員', ko: '👑 VIP 회원', fr: '👑 Membre VIP' },
  title: { th: 'VIP Pass พิษณุโลก', en: 'Phitsanulok VIP Pass', zh: '彭世洛 VIP 通行证', ja: 'ピッサヌローク VIPパス', ko: '핏사눌록 VIP 패스', fr: 'Pass VIP Phitsanulok' },
  sub: { th: 'ใช้ได้ 7 วันนับจากวันชำระ', en: 'Valid for 7 days from payment', zh: '自付款起 7 天有效', ja: 'お支払いから7日間有効', ko: '결제일로부터 7일간 유효', fr: 'Valable 7 jours après le paiement' },
  per: { th: '/ 7 วัน', en: '/ 7 days', zh: '/ 7 天', ja: '/ 7日間', ko: '/ 7일', fr: '/ 7 jours' },
  perk1t: { th: 'เสียงบรรยายฉบับเต็ม', en: 'Full audio guide', zh: '完整语音导览', ja: '完全版の音声ガイド', ko: '전체 음성 가이드', fr: 'Audioguide complet' },
  perk1d: { th: 'ทุกโบราณสถาน ครบ 6 ภาษา', en: 'Every heritage site, all 6 languages', zh: '所有古迹，6 种语言', ja: 'すべての史跡、6言語対応', ko: '모든 유적, 6개 언어', fr: 'Tous les sites, en 6 langues' },
  perk2t: { th: 'คูปองร้านอาหารและที่พัก', en: 'Restaurant and hotel vouchers', zh: '餐厅与酒店优惠券', ja: 'レストランとホテルのクーポン', ko: '식당·숙소 쿠폰', fr: 'Bons restaurants et hôtels' },
  perk2d: { th: 'มูลค่ารวม {v}', en: 'Worth {v} in total', zh: '总价值 {v}', ja: '合計 {v} 相当', ko: '총 {v} 상당', fr: 'D’une valeur totale de {v}' },
  perk2none: { th: 'ใช้ได้กับร้านบนแผนที่', en: 'For places on the map', zh: '适用于地图上的商家', ja: '地図上のお店で使える', ko: '지도 위 업체에서 사용', fr: 'Valables dans les lieux de la carte' },
  perk3t: { th: 'ลดค่าอาหาร 15%', en: '15% off food', zh: '餐饮 85 折', ja: '料理15%オフ', ko: '음식 15% 할인', fr: '15 % de réduction sur les repas' },
  perk3d: { th: 'คิดให้อัตโนมัติในตะกร้า', en: 'Applied automatically in your cart', zh: '购物车中自动折扣', ja: 'カートで自動適用', ko: '장바구니에서 자동 적용', fr: 'Appliquée automatiquement au panier' },
  free: { th: 'ใช้ฟรีอยู่แล้ว: แผนที่ 3 มิติ · เสียงบรรยายแบบย่อ · สั่งอาหาร', en: 'Already free: 3D map · short audio guide · food ordering', zh: '免费功能：3D 地图 · 简版语音导览 · 点餐', ja: '無料で使える：3Dマップ · 短い音声ガイド · 料理の注文', ko: '이미 무료: 3D 지도 · 요약 음성 가이드 · 음식 주문', fr: 'Déjà gratuit : carte 3D · audioguide court · commande de repas' },
  payLabel: { th: 'ชำระด้วยพร้อมเพย์', en: 'Pay with PromptPay', zh: '使用 PromptPay 支付', ja: 'PromptPayで支払い', ko: 'PromptPay로 결제', fr: 'Payer avec PromptPay' },
  demo: { th: 'โหมดสาธิต ไม่ต้องโอนเงินจริง กดยืนยันได้เลย', en: 'Demo mode: no real transfer needed, just confirm', zh: '演示模式：无需真实转账，直接确认即可', ja: 'デモモード：実際の送金は不要です。そのまま確定してください', ko: '데모 모드: 실제 송금 없이 바로 확인하세요', fr: 'Mode démo : aucun virement réel, confirmez simplement' },
  later: { th: 'ไว้ทีหลัง', en: 'Maybe later', zh: '以后再说', ja: 'あとで', ko: '나중에', fr: 'Plus tard' },
  retry: { th: 'ลองอีกครั้ง', en: 'Try again', zh: '重试', ja: 'もう一度試す', ko: '다시 시도', fr: 'Réessayer' },
  paying: { th: 'กำลังยืนยัน…', en: 'Confirming…', zh: '正在确认…', ja: '確認中…', ko: '확인 중…', fr: 'Confirmation…' },
  confirm: { th: 'ยืนยันชำระ 99฿', en: 'Confirm payment (฿99)', zh: '确认支付 99 泰铢', ja: '99バーツを支払う', ko: '99바트 결제 확인', fr: 'Confirmer le paiement (99 ฿)' },
  qrAlt: { th: 'QR พร้อมเพย์ ยอด {v}', en: 'PromptPay QR for {v}', zh: 'PromptPay 二维码，金额 {v}', ja: 'PromptPay QR（{v}）', ko: 'PromptPay QR ({v})', fr: 'QR PromptPay de {v}' },
  until: { th: 'ใช้ได้ถึง {v}', en: 'Valid until {v}', zh: '有效期至 {v}', ja: '{v}まで有効', ko: '{v}까지 유효', fr: 'Valable jusqu’au {v}' },
  ready: { th: 'สิทธิ์ของคุณพร้อมใช้งาน', en: 'Your benefits are ready to use', zh: '你的权益已可使用', ja: '特典をご利用いただけます', ko: '혜택을 바로 사용할 수 있습니다', fr: 'Vos avantages sont prêts' },
  vouchers: { th: 'ได้รับคูปองแล้ว {v} ใบ ดูได้ที่ "คูปองของฉัน"', en: 'You received {v} vouchers. Find them under “My coupons”.', zh: '已获得 {v} 张优惠券，可在“我的优惠券”中查看。', ja: 'クーポンを{v}枚受け取りました。「マイクーポン」で確認できます。', ko: '쿠폰 {v}장을 받았습니다. “내 쿠폰”에서 확인하세요.', fr: 'Vous avez reçu {v} bons, visibles dans « Mes coupons ».' },
  activated: { th: 'เปิดใช้ VIP Pass แล้ว', en: 'VIP Pass activated', zh: 'VIP 通行证已开通', ja: 'VIPパスが有効になりました', ko: 'VIP 패스가 활성화되었습니다', fr: 'Pass VIP activé' },
  member: { th: 'คุณเป็นสมาชิก VIP แล้ว', en: 'You are a VIP member', zh: '你已是 VIP 会员', ja: 'VIP会員です', ko: 'VIP 회원입니다', fr: 'Vous êtes membre VIP' },
  paid: { th: 'ชำระเงินสำเร็จ', en: 'Payment successful', zh: '支付成功', ja: 'お支払いが完了しました', ko: '결제 완료', fr: 'Paiement réussi' },
  close: { th: 'ปิด', en: 'Close', zh: '关闭', ja: '閉じる', ko: '닫기', fr: 'Fermer' },
  goLens: { th: 'ไปฟังเสียงบรรยาย', en: 'Listen to the audio guide', zh: '去听语音导览', ja: '音声ガイドを聞く', ko: '음성 가이드 듣기', fr: 'Écouter l’audioguide' },
  netLoad: { th: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง', en: 'Can’t reach the server. Check your internet and try again.', zh: '无法连接服务器，请检查网络后重试。', ja: 'サーバーに接続できません。インターネット接続を確認して再度お試しください。', ko: '서버에 연결할 수 없습니다. 인터넷을 확인한 뒤 다시 시도하세요.', fr: 'Serveur injoignable. Vérifiez votre connexion et réessayez.' },
  loadFail: { th: 'เตรียมรายการชำระเงินไม่สำเร็จ', en: 'Couldn’t prepare the payment.', zh: '无法创建付款。', ja: 'お支払いの準備ができませんでした。', ko: '결제를 준비하지 못했습니다.', fr: 'Impossible de préparer le paiement.' },
  netPay: { th: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ยังไม่มีการชำระเงิน ลองอีกครั้ง', en: 'Can’t reach the server. Nothing was charged, please try again.', zh: '无法连接服务器，尚未扣款，请重试。', ja: 'サーバーに接続できません。お支払いはまだ行われていません。もう一度お試しください。', ko: '서버에 연결할 수 없습니다. 결제되지 않았으니 다시 시도하세요.', fr: 'Serveur injoignable. Aucun paiement effectué, réessayez.' },
  payFail: { th: 'ยืนยันการชำระเงินไม่สำเร็จ ลองอีกครั้ง', en: 'Payment couldn’t be confirmed. Please try again.', zh: '付款确认失败，请重试。', ja: 'お支払いを確定できませんでした。もう一度お試しください。', ko: '결제를 확인하지 못했습니다. 다시 시도하세요.', fr: 'Paiement non confirmé. Réessayez.' },
  openMenu: { th: 'เปิดเมนูหน้าเว็บ', en: 'Open menu', zh: '打开菜单', ja: 'メニューを開く', ko: '메뉴 열기', fr: 'Ouvrir le menu' },
  closeMenu: { th: 'ปิดเมนูหน้าเว็บ', en: 'Close menu', zh: '关闭菜单', ja: 'メニューを閉じる', ko: '메뉴 닫기', fr: 'Fermer le menu' }
};
function V(key, value) {
  const entry = VIP_TEXT[key];
  const text = entry[getLang()] || entry.en;
  return value === undefined ? text : text.replace('{v}', value);
}

const VIP_PERKS = [
  { icon: 'headphones', title: 'perk1t', text: 'perk1d' },
  { icon: 'ticket', title: 'perk2t', text: null },
  { icon: 'percent', title: 'perk3t', text: 'perk3d' }
];

const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bahtText = (satang) => {
  const amount = Number(satang) / 100;
  if (getLang() === 'th') return `${amount.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
  return new Intl.NumberFormat(LOCALE[getLang()], { style: 'currency', currency: 'THB', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
};
const localDate = (iso) => new Date(iso).toLocaleDateString(LOCALE[getLang()], { day: 'numeric', month: 'short', year: 'numeric' });
const icons = () => { try { window.lucide?.createIcons(); } catch { /* icons are decorative */ } };

async function vipFetch(path, options = {}) {
  const headers = { 'x-visitor-id': ensureVisitorId() };
  if (options.body) headers['content-type'] = 'application/json';
  const res = await fetch(path, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok && data.ok !== false, status: res.status, data };
}

function ensureVipDialog() {
  let dlg = document.getElementById('vip-upgrade-dialog');
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.className = 'dialog vip-modal';
  dlg.id = 'vip-upgrade-dialog';
  dlg.setAttribute('aria-labelledby', 'vip-modal-title');
  dlg.innerHTML = '<div class="dialog__body vip-modal__body" id="vip-modal-body"></div>';
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  document.body.appendChild(dlg);
  return dlg;
}

function headHtml(title, sub) {
  return `<header class="vip-modal__head">
      <span class="vip-modal__mark" aria-hidden="true"><i data-lucide="crown"></i></span>
      <div class="vip-modal__titles">
        <h2 id="vip-modal-title">${title}</h2>
        <p class="vip-modal__sub">${sub}</p>
      </div>
      <button class="icon-btn vip-modal__close" type="button" data-vip-close aria-label="${V('close')}"><i data-lucide="x"></i></button>
    </header>`;
}

function perksHtml(voucherSatang) {
  return `<ul class="vip-perks">${VIP_PERKS.map((p) => {
    const text = p.text ? V(p.text) : (voucherSatang ? V('perk2d', bahtText(voucherSatang)) : V('perk2none'));
    return `<li><span class="vip-perks__icon" aria-hidden="true"><i data-lucide="${p.icon}"></i></span><span><b>${V(p.title)}</b><span>${text}</span></span></li>`;
  }).join('')}</ul>`;
}

function renderBuyView(body, state) {
  const { checkout, phase, error } = state;
  const qr = checkout?.qr;
  const qrBlock = phase === 'loading'
    ? '<div class="vip-pay__qr vip-pay__qr--skeleton" aria-hidden="true"></div>'
    : qr?.playable && qr.dataUrl
      ? `<img class="vip-pay__qr" src="${qr.dataUrl}" alt="${V('qrAlt', bahtText(checkout.amountSatang))}" width="132" height="132">`
      : '<div class="vip-pay__qr vip-pay__qr--none" aria-hidden="true"><i data-lucide="qr-code"></i></div>';
  const busy = phase === 'loading' || phase === 'paying';
  const action = phase === 'failed-load'
    ? `<button class="btn btn--primary" type="button" data-vip-retry><i data-lucide="rotate-ccw"></i> ${V('retry')}</button>`
    : `<button class="btn btn--primary" type="button" data-vip-confirm ${busy ? 'disabled aria-disabled="true"' : ''}>${phase === 'paying' ? `<span class="vip-spinner" aria-hidden="true"></span> ${V('paying')}` : V('confirm')}</button>`;
  body.innerHTML = `
    ${headHtml(V('title'), V('sub'))}
    <p class="vip-modal__price"><b>99฿</b><span>${V('per')}</span></p>
    ${perksHtml(checkout?.breakdown?.voucherValueSatang)}
    <p class="vip-modal__free">${V('free')}</p>
    <section class="vip-pay" aria-label="${V('payLabel')}" aria-busy="${phase === 'loading'}">
      ${qrBlock}
      <div class="vip-pay__info">
        <p class="vip-pay__label">${V('payLabel')}</p>
        <p class="vip-pay__amount">${bahtText(checkout ? checkout.amountSatang : 9900)}</p>
        <p class="vip-pay__demo"><i data-lucide="info"></i> ${V('demo')}</p>
      </div>
    </section>
    <p class="vip-modal__error" role="alert" ${error ? '' : 'hidden'}>${escHtml(error || '')}</p>
    <div class="vip-modal__actions">
      <button class="btn btn--ghost" type="button" data-vip-close>${V('later')}</button>
      ${action}
    </div>`;
  icons();
}

function renderActiveView(body, { until, vouchers, justPaid }) {
  const sub = until ? V('until', localDate(until)) : V('ready');
  const voucherLine = vouchers?.length ? `<p class="vip-modal__free">${escHtml(V('vouchers', vouchers.length))}</p>` : '';
  body.innerHTML = `
    ${headHtml(V(justPaid ? 'activated' : 'member'), sub)}
    ${justPaid ? `<p class="vip-modal__success"><i data-lucide="circle-check"></i> ${V('paid')}</p>` : ''}
    ${perksHtml(null)}
    ${voucherLine}
    <div class="vip-modal__actions">
      <button class="btn btn--ghost" type="button" data-vip-close>${V('close')}</button>
      <a class="btn btn--primary" href="/app#lens" data-vip-go-lens><i data-lucide="headphones"></i> ${V('goLens')}</a>
    </div>`;
  icons();
}

export async function openVipUpgradeModal() {
  const dlg = ensureVipDialog();
  const body = document.getElementById('vip-modal-body');
  const state = { checkout: null, phase: 'loading', error: '' };

  body.onclick = (e) => {
    if (e.target.closest('[data-vip-close]')) { dlg.close(); return; }
    if (e.target.closest('[data-vip-go-lens]')) {
      // Already on /app: close and let the hash route scroll to the lens.
      if (location.pathname.startsWith('/app')) dlg.close();
      return;
    }
    if (e.target.closest('[data-vip-retry]')) { load(); return; }
    if (e.target.closest('[data-vip-confirm]') && state.phase === 'ready') confirm();
  };

  async function load() {
    state.phase = 'loading';
    state.error = '';
    renderBuyView(body, state);
    let r;
    try {
      // Ask the server first, so a member never triggers a 409 checkout.
      const init = await vipFetch('/api/init-data');
      const vip = init.data?.visitor?.vip;
      if (init.ok && vip?.active) {
        setVipActive(true);
        renderActiveView(body, { until: vip.until });
        return;
      }
      r = await vipFetch('/api/checkout', { method: 'POST', body: JSON.stringify({ type: 'vip_pass' }) });
    } catch { r = { ok: false, status: 0, data: {} }; }
    if (r.status === 409) {
      setVipActive(true);
      renderActiveView(body, {});
      return;
    }
    if (!r.ok) {
      state.phase = 'failed-load';
      state.error = r.status === 0 ? V('netLoad') : ((getLang() === 'th' && r.data.error) || V('loadFail'));
      renderBuyView(body, state);
      return;
    }
    setVipActive(false);
    state.checkout = r.data;
    state.phase = 'ready';
    renderBuyView(body, state);
  }

  async function confirm() {
    state.phase = 'paying';
    state.error = '';
    renderBuyView(body, state);
    let r;
    try { r = await vipFetch(`/api/checkout/${encodeURIComponent(state.checkout.checkoutId)}/confirm`, { method: 'POST' }); }
    catch { r = { ok: false, status: 0, data: {} }; }
    if (!r.ok) {
      state.phase = 'ready';
      state.error = r.status === 0 ? V('netPay') : ((getLang() === 'th' && r.data.error) || V('payFail'));
      renderBuyView(body, state);
      body.querySelector('[data-vip-confirm]')?.focus();
      return;
    }
    setVipActive(true);
    window.dispatchEvent(new CustomEvent('phitlok:vip-activated', { detail: r.data }));
    renderActiveView(body, { until: r.data.vip?.until, vouchers: r.data.vip?.vouchers, justPaid: true });
    body.querySelector('[data-vip-go-lens]')?.focus();
  }

  if (!dlg.open) {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  await load();
}

function bindSiteEnhancements() {
  applyTheme(getSavedTheme(), { persist: false });
  syncVipHeaderButtons();
  bindScrollCue();

  document.querySelectorAll('[data-theme-toggle], #theme-toggle').forEach((btn) => {
    if (btn.dataset.themeBound === '1') return;
    btn.dataset.themeBound = '1';
    btn.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, { persist: true });
    });
  });

  document.addEventListener('click', (e) => {
    const vipTrigger = e.target.closest('[data-open-vip-modal]');
    if (vipTrigger) {
      e.preventDefault();
      openVipUpgradeModal();
    }
  });

  window.addEventListener('phitlok:open-vip-modal', () => openVipUpgradeModal());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindSiteEnhancements);
} else {
  bindSiteEnhancements();
}

// Global SVG fallback for any image error across all pages
export function makeSvgFallback(label = 'PHITLOK NEXUS') {
  const safe = String(label || 'PHITLOK NEXUS').replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0D3B38"/>
        <stop offset="100%" stop-color="#1E3A8A"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#g)"/>
    <circle cx="400" cy="210" r="56" fill="rgba(184,134,11,0.25)" stroke="#B8860B" stroke-width="3"/>
    <path d="M400 168 L422 212 H378 Z M370 220 H430 V232 H370 Z M360 238 H440 V252 H360 Z" fill="#E6B422"/>
    <text x="400" y="320" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="bold">${safe}</text>
    <text x="400" y="355" text-anchor="middle" fill="#FFD97D" font-family="sans-serif" font-size="16">ภาพแทนชั่วคราว · รูปจริงโหลดไม่สำเร็จ</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

window.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG') return;
  const fb = img.getAttribute('data-fallback');
  if (fb && img.getAttribute('src') !== fb && !img.dataset.triedFallback) {
    img.dataset.triedFallback = '1';
    img.src = fb;
    return;
  }
  if (!img.dataset.triedSvg) {
    img.dataset.triedSvg = '1';
    img.src = makeSvgFallback(img.dataset.shortName || img.getAttribute('alt') || 'PHITLOK NEXUS');
  }
}, true);

// Mobile navigation toggle
const toggle = document.getElementById('menu-toggle');
const panel = document.getElementById('mobile-nav');

if (toggle && panel) {
  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', V(open ? 'closeMenu' : 'openMenu'));
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  panel.addEventListener('click', (e) => { if (e.target.closest('a') || e.target.closest('[data-open-vip-modal]')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (mq) => { if (mq.matches) setOpen(false); });
}
