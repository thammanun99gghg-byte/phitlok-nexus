// Interactive Digital Menu (6 languages + allergen filter + hotel booking) & Bilingual Kitchen Ticket — PHITLOK NEXUS v2.0
import { state, api, esc, tr, baht, langSwitcher, ALLERGEN_LABELS, saveCart, emit, on, openDialog, closeDialog, toast, refreshIcons } from './core.js';

const FILTERS = [
  { id: 'all', label: 'ทั้งหมด', en: 'All' },
  { id: 'mild', label: 'ไม่เผ็ด', en: 'Non-Spicy', flag: 'no_spicy' },
  { id: 'nopeanut', label: 'ไร้ถั่วลิสง', en: 'Peanut-Free', flag: 'no_peanut' },
  { id: 'halalveg', label: 'ฮาลาล/มังสวิรัติ', en: 'Halal / Veg', flag: 'no_pork' }
];

const SPICY_TEXT = { th: 'เผ็ด', en: 'Spicy', zh: '辣', ja: '辛口', ko: '매운맛', fr: 'Épicé' };
const VEG_TEXT = { th: 'มังสวิรัติ', en: 'Vegetarian', zh: '素食', ja: 'ベジタリアン', ko: '채식', fr: 'Végétarien' };
const HALAL_TEXT = { th: 'ฮาลาลทานได้', en: 'Halal-friendly', zh: '清真可食', ja: 'ハラール対応', ko: '할랄 가능', fr: 'Halal' };
const SAFE_TEXT = { th: 'Allergen-Safe', en: 'Allergen-Safe', zh: '无过敏原', ja: 'アレルゲン安全', ko: '알레르기 안전', fr: 'Sans allergène' };

function rejectReason(item, filter) {
  if (item.available === false) return 'ของหมดชั่วคราว (เจ้าของร้านปิดรับเมนูนี้ชั่วคราว)';
  if (filter === 'mild' && item.spicy > 0) return `เผ็ดระดับ ${item.spicy}/3 — ไม่ตรงเงื่อนไข "ไม่เผ็ด"`;
  if (filter === 'nopeanut' && item.allergens.includes('peanut')) return 'มีถั่วลิสงเป็นส่วนผสม — ไม่เหมาะกับผู้แพ้ถั่วลิสง';
  if (filter === 'halalveg' && !(item.halal || item.vegetarian)) {
    return item.allergens.includes('pork') ? 'มีหมู — ไม่ใช่อาหารฮาลาล/มังสวิรัติ' : 'ไม่ใช่อาหารฮาลาล/มังสวิรัติ';
  }
  return null;
}

function itemTags(item, lang) {
  const tags = [];
  if (!item.allergens || item.allergens.length === 0) {
    tags.push(`<span class="tag tag--good">${esc(tr(SAFE_TEXT, lang))}</span>`);
  } else {
    for (const a of item.allergens) {
      tags.push(`<span class="tag tag--allergen">มี${esc(tr(ALLERGEN_LABELS[a], lang))}</span>`);
    }
  }
  if (item.spicy > 0) tags.push(`<span class="tag tag--spicy">${esc(tr(SPICY_TEXT, lang))} ${item.spicy}/3</span>`);
  if (item.vegetarian) tags.push(`<span class="tag tag--good">${esc(tr(VEG_TEXT, lang))}</span>`);
  if (item.halal) tags.push(`<span class="tag tag--good">${esc(tr(HALAL_TEXT, lang))}</span>`);
  return tags.join('');
}

function itemRow(item, lang, { reason, orderable, isHotel }) {
  const name = tr(item.name, lang);
  const desc = tr(item.desc, lang) || item.desc?.en || '';
  const imgUrl = item.imageUrl || item.fallbackImage || '/assets/photos/noodles-tomyum.jpg';
  const fallback = item.fallbackImage || '/assets/photos/noodles-tomyum.jpg';
  const btnLabel = isHotel ? 'จองห้องพัก' : '+ สั่งอาหาร';
  return `<li class="menu-item${reason ? ' menu-item--blocked' : ''}">
    <img class="menu-item__thumb" src="${esc(imgUrl)}"
         onerror="this.onerror=null;this.src='${esc(fallback)}'"
         alt="${esc(name)}" loading="lazy" width="96" height="96">
    <div class="menu-item__info">
      <p class="menu-item__name" lang="${lang}">${esc(name)}</p>
      ${lang !== 'th' ? `<p class="menu-item__th" lang="th">${esc(item.name.th)}</p>` : ''}
      ${desc ? `<p class="menu-item__desc">${esc(desc)}</p>` : ''}
      <div class="menu-item__tags">${itemTags(item, lang)}</div>
    </div>
    <div class="menu-item__actions">
      <span class="menu-item__price">${baht(item.priceSatang)} <small class="muted">/ ${esc(item.unit || 'รายการ')}</small></span>
      ${!reason && orderable ? `<button class="btn btn--primary btn--sm" type="button" data-add="${esc(item.id)}" aria-label="${btnLabel} ${esc(item.name.th)}">${btnLabel}</button>` : ''}
    </div>
    ${reason ? `<p class="block-reason">${esc(reason)}</p>` : ''}
  </li>`;
}

export function renderDigitalMenu(container, ctx) {
  ctx.filter = ctx.filter || 'all';
  const draw = () => {
    const lang = state.lang;
    const filter = ctx.filter;
    const isHotel = ctx.merchant.kind === 'hotel' || ctx.merchant.category === 'stay';
    const ok = [];
    const blocked = [];
    for (const it of ctx.items) {
      const reason = rejectReason(it, filter);
      (reason ? blocked : ok).push({ it, reason });
    }
    const sourceBadge = {
      preset: '<span class="badge badge--gold">Preset · OCR จำลองจากภาพเมนู</span>',
      gemini: '<span class="badge badge--ok">AI: Gemini Vision OCR</span>',
      'fallback-template': '<span class="badge badge--warn">โหมดสำรอง · เทมเพลต 6 ภาษา</span>',
      database: `<span class="badge badge--ok">Verified on Google Maps &amp; 3D Nexus</span>`
    }[ctx.source] || '';
    const filterFlag = FILTERS.find((f) => f.id === filter)?.flag;
    const cartCount = state.cart.merchantId === ctx.merchant.id ? state.cart.items.reduce((s, x) => s + x.qty, 0) : 0;
    const gmapsUrl = ctx.merchant.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${ctx.merchant.lat},${ctx.merchant.lng}`;

    container.innerHTML = `
      <div class="result-head">
        <div>
          <p class="eyebrow">${isHotel ? 'ระบบจองห้องพักโรงแรม 6 ภาษา (Hotel Booking)' : 'ระบบสั่งอาหารดิจิทัล 6 ภาษา (Interactive Digital Menu)'}</p>
          <h3 lang="${lang}">${esc(tr(ctx.merchant.name, lang))}</h3>
          <div class="badges">
            ${sourceBadge}
            ${ctx.merchant.lat ? `<span class="badge">GPS: ${ctx.merchant.lat.toFixed(4)}, ${ctx.merchant.lng.toFixed(4)}</span>` : ''}
            <span class="badge ${ctx.merchant.shopStatus === 'busy' ? 'badge--warn' : 'badge--ok'}">
              ${ctx.merchant.shopStatus === 'busy' ? 'คิวเต็มชั่วคราว' : 'เปิดรับลูกค้า'}
            </span>
            <a class="badge" href="${esc(gmapsUrl)}" target="_blank" rel="noopener">เปิดพิกัดบน Google Maps ↗</a>
          </div>
        </div>
        ${langSwitcher(lang, 'menu-lang')}
      </div>
      ${ctx.merchant.shopStatus === 'busy' ? `<p class="notice notice--warn">ขณะนี้ร้านแจ้งสถานะ "คิวเต็มชั่วคราว" — เจ้าของร้านสามารถสลับเปิดรับลูกค้าได้ที่หน้า Merchant Portal</p>` : ''}
      ${ctx.notice ? `<p class="notice">${esc(ctx.notice)}</p>` : ''}
      ${!isHotel ? `<div class="filters" role="group" aria-label="ตัวกรองภูมิแพ้อาหารและข้อจำกัด (Allergen & Cultural Filter)">
        ${FILTERS.map((f) => `<button type="button" class="chip" data-filter="${f.id}" aria-pressed="${f.id === filter}">${esc(f.label)} <span lang="en">(${esc(f.en)})</span></button>`).join('')}
      </div>` : ''}
      ${filterFlag && ctx.orderable ? `<p class="muted small">ใบสั่งอาหารจะแจ้งแม่ค้าเป็นตัวหนังสือสีแดงขนาดใหญ่ว่า "${esc(state.data.dietaryFlags[filterFlag].th)}" ให้อัตโนมัติ</p>` : ''}
      <ul class="menu-list">${ok.map(({ it }) => itemRow(it, lang, { orderable: ctx.orderable, isHotel })).join('') || '<li class="muted">ไม่มีรายการที่ตรงเงื่อนไข</li>'}</ul>
      ${blocked.length ? `<details class="hidden-summary" open>
        <summary>รายการที่ถูกกรองออกหรือของหมด (${blocked.length} รายการ)</summary>
        <ul class="menu-list">${blocked.map(({ it, reason }) => itemRow(it, lang, { reason, orderable: false, isHotel })).join('')}</ul>
      </details>` : ''}
      ${ctx.ocrText ? `<details class="ocr"><summary>ข้อความที่ OCR อ่านได้</summary><pre lang="th">${esc(ctx.ocrText)}</pre></details>` : ''}
      <div class="menu-footer">
        ${ctx.orderable ? `<p class="muted small">ค่าธรรมเนียมแพลตฟอร์ม ${isHotel ? '5%' : '3%'} คำนวณจากเซิร์ฟเวอร์ · ชำระด้วย QR PromptPay</p>
          <button class="btn btn--gold" type="button" data-open-cart>ดูตะกร้า &amp; ใบสั่ง (${cartCount})</button>` : ''}
        ${ctx.publishable ? `<button class="btn btn--primary" type="button" data-publish>เผยแพร่เป็นเมนูดิจิทัล 6 ภาษาของร้าน</button>` : ''}
      </div>`;
    refreshIcons();
  };

  container.onclick = async (e) => {
    const langBtn = e.target.closest('[data-menu-lang]');
    if (langBtn) { state.lang = langBtn.dataset.menuLang; emit('lang:changed', state.lang); return; }
    const f = e.target.closest('[data-filter]');
    if (f) {
      ctx.filter = f.dataset.filter;
      const flag = FILTERS.find((x) => x.id === ctx.filter)?.flag;
      if (flag && ctx.orderable && !state.cart.flags.includes(flag)) { state.cart.flags.push(flag); saveCart(); }
      draw();
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      const item = ctx.items.find((x) => String(x.id) === add.dataset.add);
      if (item) addToCart(item, ctx.merchant);
      return;
    }
    if (e.target.closest('[data-open-cart]')) { openCart(); return; }
    if (e.target.closest('[data-publish]') && ctx.onPublish) ctx.onPublish();
  };

  ctx.redraw = draw;
  draw();
  return ctx;
}

// ------------------------------------------------------------------ cart
export function addToCart(item, merchant) {
  const cart = state.cart;
  if (cart.merchantId && cart.merchantId !== merchant.id && cart.items.length) {
    const ok = window.confirm('ตะกร้ามีรายการจากร้าน/โรงแรมอื่นอยู่ ต้องการล้างตะกร้าแล้วเริ่มรายการใหม่หรือไม่?');
    if (!ok) return;
    cart.items = [];
    cart.couponCode = 'auto';
  }
  cart.merchantId = merchant.id;
  cart.merchantName = merchant.name;
  cart.merchantKind = merchant.kind || (merchant.category === 'stay' ? 'hotel' : 'restaurant');
  if (!cart.tableTh) {
    cart.tableTh = cart.merchantKind === 'hotel' ? 'จองห้องพักล่วงหน้า / Check-in วันนี้' : 'โต๊ะ 4 / สั่งล่วงหน้า';
  }
  const line = cart.items.find((x) => String(x.id) === String(item.id));
  if (line) line.qty = Math.min(20, line.qty + 1);
  else cart.items.push({ id: item.id, qty: 1, item: { name: item.name, priceSatang: item.priceSatang, unit: item.unit } });
  saveCart();
  toast(`เพิ่ม "${tr(item.name, 'th')}" ลงตะกร้าแล้ว`, 'ok');
}

export function clearCart() {
  state.cart = { merchantId: null, items: [], flags: [], couponCode: 'auto', tableTh: 'โต๊ะ 4 / สั่งล่วงหน้า' };
  saveCart();
}

let quoteTimer = null;

export function openCart() {
  openDialog('cart-dialog');
  renderCart();
}

function renderCart() {
  const body = document.getElementById('cart-body');
  const cart = state.cart;
  if (!cart.items.length) {
    body.innerHTML = `
      <div class="dialog__head"><h2 id="cart-title">ตะกร้าสั่งอาหาร &amp; จองที่พัก</h2><button class="btn btn--icon btn--ghost" type="button" data-close aria-label="ปิด">✕</button></div>
      <div class="empty"><p class="empty__title">ตะกร้ายังว่าง</p><p class="muted">เลือกเมนูอาหารหรือห้องพักโรงแรมแล้วกดสั่งซื้อล่วงหน้า</p>
      <button class="btn btn--primary" type="button" data-go-menu>ดูเมนูร้านก๋วยเตี๋ยวห้อยขาริมน่าน</button></div>`;
    body.onclick = (e) => {
      if (e.target.closest('[data-close]')) closeDialog('cart-dialog');
      if (e.target.closest('[data-go-menu]')) { closeDialog('cart-dialog'); emit('menu:open-preset'); }
    };
    return;
  }
  const flags = state.data.dietaryFlags;
  const isHotel = cart.merchantKind === 'hotel';
  body.innerHTML = `
    <div class="dialog__head">
      <div><p class="eyebrow">${isHotel ? 'จองห้องพักโรงแรม · Hotel Booking' : 'สั่งอาหารล่วงหน้า · Digital Ordering'}</p><h2 id="cart-title">${esc(tr(cart.merchantName, 'th'))}</h2></div>
      <button class="btn btn--icon btn--ghost" type="button" data-close aria-label="ปิด">✕</button>
    </div>
    <div class="field">
      <label for="cart-table-input">${isHotel ? 'ระบุวันเข้าพัก / หมายเหตุผู้เข้าพัก' : 'หมายเลขโต๊ะ / รูปแบบการรับอาหาร'}</label>
      <input id="cart-table-input" type="text" maxlength="60" value="${esc(cart.tableTh || (isHotel ? 'จองเข้าพัก 1 คืน / VIP Guest' : 'โต๊ะ 4 / สั่งล่วงหน้า'))}">
    </div>
    <div id="cart-lines">${cart.items.map((l, i) => `
      <div class="cart-line">
        <div><p class="cart-line__name">${esc(tr(l.item.name, state.lang))}</p>
          ${state.lang !== 'th' ? `<p class="muted small" lang="th">${esc(l.item.name.th)}</p>` : ''}
          <p class="muted small">${baht(l.item.priceSatang)} / ${esc(l.item.unit)}</p></div>
        <div class="qty">
          <button class="btn btn--icon btn--outline" type="button" data-qty="${i}" data-d="-1" aria-label="ลดจำนวน ${esc(l.item.name.th)}">−</button>
          <output aria-live="polite">${l.qty}</output>
          <button class="btn btn--icon btn--outline" type="button" data-qty="${i}" data-d="1" aria-label="เพิ่มจำนวน ${esc(l.item.name.th)}">+</button>
        </div>
      </div>`).join('')}</div>

    <fieldset class="flag-list" aria-describedby="flags-help">
      <legend><b>ข้อจำกัดด้านอาหาร / คำขอพิเศษ (แสดงป้ายเตือนสีแดงให้ร้านค้า)</b></legend>
      <p class="muted small" id="flags-help">แปลอัตโนมัติจาก 6 ภาษาเป็นคำเตือนภาษาไทยตัวใหญ่หน้าจอครัว</p>
      ${Object.entries(flags).map(([k, label]) => `<label class="check"><input type="checkbox" data-flag="${k}" ${cart.flags.includes(k) ? 'checked' : ''}><span>${esc(label.th)}${state.lang !== 'th' ? ` · <span lang="${state.lang}">${esc(tr(label))}</span>` : ''}</span></label>`).join('')}
    </fieldset>

    <div id="cart-coupons"></div>
    <div id="cart-quote" aria-live="polite"><p class="muted">กำลังคำนวณราคาจากเซิร์ฟเวอร์…</p></div>
    <div id="cart-ticket"></div>
    <div class="menu-footer">
      <button class="btn btn--danger btn--sm" type="button" data-clear>ล้างตะกร้า</button>
      <button class="btn btn--primary btn--lg" type="button" data-pay disabled>ชำระเงินผ่าน QR PromptPay</button>
    </div>`;

  const tableInput = document.getElementById('cart-table-input');
  tableInput?.addEventListener('input', () => {
    cart.tableTh = tableInput.value.trim() || 'โต๊ะ 4 / สั่งล่วงหน้า';
    saveCart();
    requestQuote();
  });

  body.onclick = (e) => {
    if (e.target.closest('[data-close]')) { closeDialog('cart-dialog'); return; }
    const q = e.target.closest('[data-qty]');
    if (q) {
      const line = cart.items[Number(q.dataset.qty)];
      line.qty += Number(q.dataset.d);
      if (line.qty <= 0) cart.items.splice(Number(q.dataset.qty), 1);
      line.qty = Math.min(20, line.qty);
      saveCart();
      renderCart();
      return;
    }
    if (e.target.closest('[data-clear]')) { clearCart(); renderCart(); return; }
    if (e.target.closest('[data-pay]')) {
      emit('checkout:start', {
        type: 'order',
        merchantId: cart.merchantId,
        items: cart.items.map((l) => ({ id: l.id, qty: l.qty })),
        flags: cart.flags,
        guestLang: state.lang,
        couponCode: cart.couponCode,
        tableTh: cart.tableTh || 'โต๊ะ 4 / สั่งล่วงหน้า'
      });
    }
  };
  body.onchange = (e) => {
    const flag = e.target.closest('[data-flag]');
    if (flag) {
      const k = flag.dataset.flag;
      cart.flags = flag.checked ? [...new Set([...cart.flags, k])] : cart.flags.filter((x) => x !== k);
      saveCart();
      requestQuote();
      return;
    }
    if (e.target.name === 'coupon') { cart.couponCode = e.target.value; saveCart(); requestQuote(); }
  };
  requestQuote();
}

function requestQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(fetchQuote, 150);
}

async function fetchQuote() {
  const cart = state.cart;
  if (!cart.items.length) return;
  const quoteEl = document.getElementById('cart-quote');
  const payBtn = document.querySelector('#cart-body [data-pay]');
  try {
    const q = await api('/api/quote', {
      method: 'POST',
      body: {
        merchantId: cart.merchantId,
        items: cart.items.map((l) => ({ id: l.id, qty: l.qty })),
        flags: cart.flags,
        guestLang: state.lang,
        couponCode: cart.couponCode,
        tableTh: cart.tableTh || 'โต๊ะ 4 / สั่งล่วงหน้า'
      }
    });
    if (!document.getElementById('cart-quote')) return;
    renderCoupons(q.breakdown);
    quoteEl.innerHTML = breakdownTable(q.breakdown) + (q.warnings.length ? `<p class="notice">${q.warnings.map(esc).join('<br>')}</p>` : '');
    document.getElementById('cart-ticket').innerHTML = `<p class="eyebrow">ตัวอย่างใบสั่งสองภาษา (ส่งตรงเข้าหน้าจอรับออเดอร์หน้าร้าน)</p>${renderTicket(q.ticketPreview, { preview: true })}`;
    if (payBtn) { payBtn.disabled = false; payBtn.textContent = `ชำระเงิน ${baht(q.breakdown.totalSatang)} ด้วย QR PromptPay`; }
  } catch (err) {
    if (err.status === 400 && /คูปอง/.test(err.message)) { cart.couponCode = 'auto'; saveCart(); requestQuote(); return; }
    if (quoteEl) quoteEl.innerHTML = `<p class="notice notice--warn">${esc(err.message)}</p>`;
    if (payBtn) payBtn.disabled = true;
  }
}

function renderCoupons(b) {
  const el = document.getElementById('cart-coupons');
  if (!el) return;
  if (!b.availableCoupons.length) {
    el.innerHTML = `<p class="muted small">ยังไม่มีคูปองสำหรับร้านนี้ — สแกนป้ายโบราณสถาน หรือซื้อบัตร Phitsanulok VIP Pass (99฿) เพื่อรับคูปองส่วนลด</p>`;
    return;
  }
  const chosen = b.coupon ? b.coupon.code : 'none';
  const desc = (c) => (c.kind === 'percent' ? `ส่วนลด ${c.value}%` : `ส่วนลด ${baht(c.value)}`) + (c.minSpendSatang ? ` (ขั้นต่ำ ${baht(c.minSpendSatang)})` : '') + (c.source === 'heritage_stamp' ? ' · ตราประทับมรดก' : ' · VIP Pass');
  el.innerHTML = `<fieldset><legend><b>คูปองส่วนลดของคุณ</b></legend>
    ${b.availableCoupons.map((c) => `<label class="coupon-opt${c.eligible ? '' : ' coupon-opt--off'}">
      <input type="radio" name="coupon" value="${esc(c.code)}" ${chosen === c.code ? 'checked' : ''} ${c.eligible ? '' : 'disabled'}>
      <span>${esc(desc(c))}${c.eligible ? ` — ลด ${baht(c.discountSatang)}` : ' — ยอดยังไม่ถึงขั้นต่ำ'}<br><code>${esc(c.code)}</code></span></label>`).join('')}
    <label class="coupon-opt"><input type="radio" name="coupon" value="none" ${chosen === 'none' ? 'checked' : ''}><span>ไม่ใช้คูปอง</span></label>
  </fieldset>`;
}

export function breakdownTable(b) {
  const rows = (b.lines || []).map((l) => l.label
    ? `<tr><td>${esc(l.label)}</td><td>${baht(l.amountSatang)}</td></tr>`
    : `<tr><td>${esc(tr(l.name, 'th'))} × ${l.qty}</td><td>${baht(l.lineTotalSatang)}</td></tr>`).join('');
  const extra = b.subtotalSatang != null ? `
    <tr><td>ยอดรวมรายการ</td><td>${baht(b.subtotalSatang)}</td></tr>
    ${b.discountSatang ? `<tr class="discount"><td>ส่วนลดคูปอง ${b.coupon ? esc(b.coupon.code) : ''}</td><td>−${baht(b.discountSatang)}</td></tr>` : ''}
    <tr><td>ค่าธรรมเนียมแพลตฟอร์มและแปล 6 ภาษา (${Math.round(b.feeRate * 100)}%)</td><td>${baht(b.feeSatang)}</td></tr>` : '';
  return `<table class="breakdown"><tbody>${rows}${extra}<tr class="total"><td>ยอดชำระสุทธิ</td><td>${baht(b.totalSatang)}</td></tr></tbody></table>`;
}

export function renderTicket(t, { preview = false } = {}) {
  const lang = t.guestLang || 'en';
  const tableLabel = t.tableTh || 'โต๊ะ 4 / สั่งล่วงหน้า';
  const lineSummaryTh = (t.lines || []).map((l) => `${l.nameTh} ${l.qty} ${l.unit}`).join(', ');
  return `<div class="ticket" lang="th">
    <div class="ticket__head">
      <div>
        <span class="ticket__no">${preview ? 'ตัวอย่างใบสั่งหน้าร้าน' : `ออเดอร์ ${esc(t.orderNo)}`}</span>
        <span class="ticket__table-badge">${esc(tableLabel)}</span>
      </div>
      <span class="muted small">${esc(tr(t.merchantName, 'th'))}</span>
    </div>
    ${(t.lines || []).map((l) => `<div class="ticket__line">
      <p class="ticket__th">${esc(tableLabel)}: ${esc(l.nameTh)} ${l.qty} ${esc(l.unit)}</p>
      ${lang !== 'th' ? `<p class="ticket__guest" lang="${esc(lang)}">ลูกค้าสั่ง (${esc(lang.toUpperCase())}): ${esc(l.nameGuest)} × ${l.qty}</p>` : ''}
      ${(l.notesTh || []).map((n) => `<p class="ticket__note">⚠ ${esc(n)}</p>`).join('')}
    </div>`).join('')}
    ${(t.warningsTh || []).map((w, i) => `<div class="ticket__warn" role="alert">
      <p class="th">🚨 ${esc(tableLabel)}: ${esc(lineSummaryTh)} — ลูกค้าต่างชาติ${esc(w)}!</p>
      ${lang !== 'th' && t.warningsGuest?.[i] ? `<p class="guest" lang="${esc(lang)}">${esc(t.warningsGuest[i])}</p>` : ''}
    </div>`).join('')}
  </div>`;
}

export function cartCount() {
  return state.cart.items.reduce((s, x) => s + x.qty, 0);
}

on('lang:changed', () => {
  if (document.getElementById('cart-dialog')?.open) renderCart();
});
on('payment:success', (r) => {
  if (r.type === 'order') clearCart();
});
