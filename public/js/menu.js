// Interactive Digital Menu (6 languages + allergen filter + hotel booking) & Bilingual Kitchen Ticket — PHITLOK NEXUS v2.3
import { state, api, esc, tr, baht, langSwitcher, ALLERGEN_LABELS, saveCart, emit, on, openDialog, closeDialog, toast, refreshIcons } from './core.js';
import { isVipActive } from './site.js';
import { t, errText, unitName, formatDay } from './i18n.js';

const FILTERS = [
  { id: 'all' },
  { id: 'mild', flag: 'no_spicy' },
  { id: 'nopeanut', flag: 'no_peanut' },
  { id: 'halalveg', flag: 'no_pork' }
];

const SPICY_TEXT = { th: 'เผ็ด', en: 'Spicy', zh: '辣', ja: '辛口', ko: '매운맛', fr: 'Épicé' };
const VEG_TEXT = { th: 'มังสวิรัติ', en: 'Vegetarian', zh: '素食', ja: 'ベジタリアン', ko: '채식', fr: 'Végétarien' };
const HALAL_TEXT = { th: 'ฮาลาลทานได้', en: 'Halal-friendly', zh: '清真可食', ja: 'ハラール対応', ko: '할랄 가능', fr: 'Halal' };
const SAFE_TEXT = { th: 'Allergen-Safe', en: 'Allergen-Safe', zh: '无过敏原', ja: 'アレルゲン安全', ko: '알레르기 안전', fr: 'Sans allergène' };

function rejectReason(item, filter) {
  if (item.available === false) return t('block.soldout');
  if (filter === 'mild' && item.spicy > 0) return t('block.spicy', { n: item.spicy });
  if (filter === 'nopeanut' && item.allergens.includes('peanut')) return t('block.peanut');
  if (filter === 'halalveg' && !(item.halal || item.vegetarian)) {
    return t(item.allergens.includes('pork') ? 'block.pork' : 'block.notHalal');
  }
  return null;
}

function itemTags(item, lang) {
  const tags = [];
  if (!item.allergens || item.allergens.length === 0) {
    tags.push(`<span class="tag tag--good">${esc(tr(SAFE_TEXT, lang))}</span>`);
  } else {
    for (const a of item.allergens) {
      tags.push(`<span class="tag tag--allergen">${esc(t('tag.contains', { a: tr(ALLERGEN_LABELS[a], lang) }))}</span>`);
    }
  }
  if (item.spicy > 0) tags.push(`<span class="tag tag--spicy">${esc(tr(SPICY_TEXT, lang))} ${item.spicy}/3</span>`);
  if (item.vegetarian) tags.push(`<span class="tag tag--good">${esc(tr(VEG_TEXT, lang))}</span>`);
  if (item.halal) tags.push(`<span class="tag tag--good">${esc(tr(HALAL_TEXT, lang))}</span>`);
  return tags.join('');
}

const ROOM_AMENITIES = ['wifi', 'aircon', 'tv', 'fridge', 'kettle', 'safe', 'shower', 'bathtub', 'balcony', 'living', 'minibar'];

// Bed, size, guests, breakfast and amenities differ by room type, so each room shows its own.
function roomFacts(r) {
  const facts = [
    `<li><i data-lucide="bed-double"></i>${esc(t(`room.bed.${r.bed}`))}</li>`,
    `<li><i data-lucide="users"></i>${esc(t('room.guests', { n: r.maxGuests }))}</li>`,
    r.sizeSqm ? `<li><i data-lucide="ruler"></i>${esc(t('room.size', { n: r.sizeSqm }))}</li>` : '',
    `<li><i data-lucide="${r.breakfast ? 'coffee' : 'circle-slash'}"></i>${esc(t(r.breakfast ? 'room.breakfast' : 'room.noBreakfast'))}</li>`,
    r.view ? `<li><i data-lucide="eye"></i>${esc(t(`room.view.${r.view}`))}</li>` : ''
  ].join('');
  const amen = (r.amenities || []).filter((a) => ROOM_AMENITIES.includes(a))
    .map((a) => `<span class="tag">${esc(t(`room.a.${a}`))}</span>`).join('');
  return `<p class="room-tier">${esc(t(`room.tier.${r.tier}`))}</p>
    <ul class="room-facts">${facts}</ul>
    <div class="menu-item__tags">${amen}</div>`;
}

function itemRow(item, lang, { reason, orderable, isHotel }) {
  const name = tr(item.name, lang);
  const desc = tr(item.desc, lang) || item.desc?.en || '';
  const imgUrl = item.imageUrl || item.fallbackImage || '/assets/photos/hoi-kha-noodles.jpg';
  const fallback = item.fallbackImage || '/assets/photos/hoi-kha-noodles.jpg';
  const btnLabel = t(isHotel ? 'menu.bookRoom' : 'menu.add');
  const sampleBadge = item.isSample !== false
    ? `<span class="tag tag--sample">${t(isHotel ? 'demo.price' : 'demo.menu')}</span>`
    : '';
  return `<li class="menu-item${reason ? ' menu-item--blocked' : ''}">
    <img class="menu-item__thumb" src="${esc(imgUrl)}"
         onerror="this.onerror=null;this.src='${esc(fallback)}'"
         alt="${esc(name)}" loading="lazy" width="96" height="96">
    <div class="menu-item__info">
      <p class="menu-item__name" lang="${lang}">${esc(name)} ${sampleBadge}</p>
      ${lang !== 'th' ? `<p class="menu-item__th" lang="th">${esc(item.name.th)}</p>` : ''}
      ${desc ? `<p class="menu-item__desc">${esc(desc)}</p>` : ''}
      ${item.room ? roomFacts(item.room) : `<div class="menu-item__tags">${itemTags(item, lang)}</div>`}
    </div>
    <div class="menu-item__actions">
      <span class="menu-item__price">${baht(item.priceSatang)} <small class="muted">/ ${esc(unitName(item.unit))}</small></span>
      ${!reason && orderable ? `<button class="btn btn--primary btn--sm" type="button" data-add="${esc(item.id)}" aria-label="${esc(t('menu.addAria', { action: btnLabel, name }))}">${btnLabel}</button>` : ''}
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
    const isDemoPartner = ctx.merchant.partnerStatus !== 'confirmed';
    const partnerBadge = isDemoPartner
      ? `<span class="badge badge--warn">${t('demo.partner')}</span>`
      : `<span class="badge badge--ok">${t('demo.verified')}</span>`;
    const sampleMenuBadge = `<span class="badge badge--gold">${t(isHotel ? 'demo.price' : 'demo.menu')}</span>`;
    const sourceBadge = {
      preset: `<span class="badge badge--gold">${t('menu.srcPreset')}</span>`,
      gemini: '<span class="badge badge--ok">AI: Gemini Vision OCR</span>',
      'fallback-template': `<span class="badge badge--warn">${t('menu.srcFallback')}</span>`,
      database: `<span class="badge">${t('menu.srcDb')}</span>`
    }[ctx.source] || '';
    const filterFlag = FILTERS.find((f) => f.id === filter)?.flag;
    const cartCount = state.cart.merchantId === ctx.merchant.id ? state.cart.items.reduce((s, x) => s + x.qty, 0) : 0;
    const gmapsUrl = ctx.merchant.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${ctx.merchant.lat},${ctx.merchant.lng}`;

    container.innerHTML = `
      <div class="result-head">
        <div>
          <p class="eyebrow">${t(isHotel ? 'menu.eyebrowHotel' : 'menu.eyebrowFood')}</p>
          <h3 lang="${lang}">${esc(tr(ctx.merchant.name, lang))}</h3>
          <div class="badges">
            ${partnerBadge}
            ${sampleMenuBadge}
            ${sourceBadge}
            <span class="badge ${ctx.merchant.shopStatus === 'busy' ? 'badge--warn' : 'badge--ok'}">
              ${t(ctx.merchant.shopStatus === 'busy' ? 'status.busy' : 'status.open')}
            </span>
            <a class="badge" href="${esc(gmapsUrl)}" target="_blank" rel="noopener">${t('card.gmaps')} ↗</a>
          </div>
        </div>
        ${langSwitcher(lang, 'menu-lang')}
      </div>
      ${ctx.merchant.shopStatus === 'busy' ? `<p class="notice notice--warn">${t('menu.busyNotice')}</p>` : ''}
      ${ctx.notice ? `<p class="notice">${esc(lang === 'th' ? ctx.notice : t(ctx.source === 'preset' ? 'menu.srcPreset' : 'menu.srcFallback'))}</p>` : ''}
      ${!isHotel ? `<div class="filters" role="group" aria-label="${t('filter.aria')}">
        ${FILTERS.map((f) => `<button type="button" class="chip" data-filter="${f.id}" aria-pressed="${f.id === filter}">${t(`filter.${f.id}`)}</button>`).join('')}
      </div>` : ''}
      ${filterFlag && ctx.orderable ? `<p class="muted small">${esc(t('menu.flagHint', { f: tr(state.data.dietaryFlags[filterFlag], lang) }))}</p>` : ''}
      <ul class="menu-list">${ok.map(({ it }) => itemRow(it, lang, { orderable: ctx.orderable, isHotel })).join('') || `<li class="muted">${t('menu.none')}</li>`}</ul>
      ${blocked.length ? `<details class="hidden-summary" open>
        <summary>${t('menu.blocked', { n: blocked.length })}</summary>
        <ul class="menu-list">${blocked.map(({ it, reason }) => itemRow(it, lang, { reason, orderable: false, isHotel })).join('')}</ul>
      </details>` : ''}
      ${ctx.ocrText ? `<details class="ocr"><summary>${t('lens.ocrText')}</summary><pre lang="th">${esc(ctx.ocrText)}</pre></details>` : ''}
      <div class="menu-footer">
        ${ctx.orderable ? `<p class="muted small">${t('menu.fee', { p: isHotel ? '5%' : '3%' })}</p>
          <button class="btn btn--gold" type="button" data-open-cart>${t('menu.viewCart', { n: cartCount })}</button>` : ''}
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
    const ok = window.confirm(t('cart.switch'));
    if (!ok) return;
    cart.items = [];
    cart.couponCode = 'auto';
  }
  const kind = merchant.kind === 'hotel' || merchant.category === 'stay' ? 'hotel' : 'restaurant';
  if (cart.merchantId !== merchant.id || cart.merchantKind !== kind) {
    // A new shop or hotel starts with its own details: no table number on a booking, no booking dates on a food order.
    cart.flags = [];
    cart.couponCode = 'auto';
    cart.tableTh = kind === 'hotel' ? '' : DEFAULT_TABLE;
    cart.booking = kind === 'hotel' ? defaultBooking() : null;
  }
  cart.merchantId = merchant.id;
  cart.merchantName = merchant.name;
  cart.merchantKind = kind;
  const line = cart.items.find((x) => String(x.id) === String(item.id));
  if (line) line.qty = Math.min(20, line.qty + 1);
  else cart.items.push({ id: item.id, qty: 1, item: { name: item.name, priceSatang: item.priceSatang, unit: item.unit, maxGuests: item.room?.maxGuests } });
  saveCart();
  toast(t('cart.added', { name: tr(item.name) }), 'ok');
}

export function clearCart() {
  state.cart = { merchantId: null, merchantKind: null, items: [], flags: [], couponCode: 'auto', tableTh: '', booking: null };
  saveCart();
}

const DEFAULT_TABLE = 'โต๊ะ 4 / สั่งล่วงหน้า';
const MAX_NIGHTS = 14;
const GUESTS_PER_ROOM = 4;
// Calendar days are Thailand days (UTC+7) so "today" matches the server's check.
const bangkokToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const defaultBooking = () => ({ checkIn: bangkokToday(), nights: 1, guests: 2, note: '' });
// Guests the chosen rooms can hold: each room type has its own limit (older carts fall back to 4 per room).
const guestCapacity = (cart) => cart.items.reduce((s, l) => s + l.qty * (l.item?.maxGuests || GUESTS_PER_ROOM), 0);

/** The order request for the current cart: booking details for a hotel, table and dietary flags for a restaurant. */
function orderRequest(cart) {
  const isHotel = cart.merchantKind === 'hotel';
  return {
    merchantId: cart.merchantId,
    items: cart.items.map((l) => ({ id: l.id, qty: l.qty })),
    flags: isHotel ? [] : cart.flags,
    guestLang: state.lang,
    couponCode: cart.couponCode,
    vipActive: Boolean(state.data?.visitor?.vip?.active || isVipActive()),
    ...(isHotel ? { booking: cart.booking || defaultBooking() } : { tableTh: cart.tableTh || DEFAULT_TABLE })
  };
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
      <div class="dialog__head"><h2 id="cart-title">${t('cart.title')}</h2><button class="btn btn--icon btn--ghost" type="button" data-close aria-label="${t('close')}">✕</button></div>
      <div class="empty"><p class="empty__title">${t('cart.empty')}</p><p class="muted">${t('cart.emptyText')}</p>
      <button class="btn btn--primary" type="button" data-go-menu>${t('menu.presetBtn')}</button></div>`;
    body.onclick = (e) => {
      if (e.target.closest('[data-close]')) closeDialog('cart-dialog');
      if (e.target.closest('[data-go-menu]')) { closeDialog('cart-dialog'); emit('menu:open-preset'); }
    };
    return;
  }
  const flags = state.data.dietaryFlags;
  const isHotel = cart.merchantKind === 'hotel';
  if (isHotel && !cart.booking) { cart.booking = defaultBooking(); saveCart(); }
  const bk = cart.booking;
  const today = bangkokToday();
  const maxGuests = guestCapacity(cart);

  const detailsForm = isHotel ? `
    <fieldset class="booking-form">
      <legend><b>${t('bk.legend')}</b></legend>
      <div class="booking-form__grid">
        <div class="field"><label for="bk-checkin">${t('bk.checkin')}</label>
          <input id="bk-checkin" type="date" min="${today}" max="${addDays(today, 365)}" value="${esc(bk.checkIn)}" required></div>
        <div class="field"><label for="bk-nights">${t('bk.nights')}</label>
          <select id="bk-nights">${Array.from({ length: MAX_NIGHTS }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === bk.nights ? 'selected' : ''}>${t(n === 1 ? 'bk.night1' : 'bk.nightN', { n })}</option>`).join('')}</select></div>
        <div class="field"><label for="bk-guests">${t('bk.guests')}</label>
          <select id="bk-guests">${Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === bk.guests ? 'selected' : ''}>${t(n === 1 ? 'bk.guest1' : 'bk.guestN', { n })}</option>`).join('')}</select></div>
      </div>
      <p class="booking-form__dates" id="bk-dates">${esc(t('bk.dates', { a: formatDay(bk.checkIn), b: formatDay(addDays(bk.checkIn, bk.nights)) }))}</p>
      <div class="field"><label for="bk-note">${t('bk.note')}</label>
        <input id="bk-note" type="text" maxlength="80" placeholder="${esc(t('bk.notePh'))}" value="${esc(bk.note)}"></div>
    </fieldset>` : `
    <div class="field">
      <label for="cart-table-input">${t('cart.table')}</label>
      <input id="cart-table-input" type="text" maxlength="60" placeholder="${esc(t('cart.tablePh'))}" value="${esc(state.lang !== 'th' && (!cart.tableTh || cart.tableTh === DEFAULT_TABLE) ? '' : cart.tableTh || DEFAULT_TABLE)}">
    </div>`;

  body.innerHTML = `
    <div class="dialog__head">
      <div><p class="eyebrow">${t(isHotel ? 'cart.eyebrowHotel' : 'cart.eyebrowFood')}</p><h2 id="cart-title">${esc(tr(cart.merchantName))}</h2></div>
      <button class="btn btn--icon btn--ghost" type="button" data-close aria-label="${t('close')}">✕</button>
    </div>
    ${isHotel ? '' : detailsForm}
    <div id="cart-lines">${cart.items.map((l, i) => `
      <div class="cart-line">
        <div><p class="cart-line__name">${esc(tr(l.item.name, state.lang))}</p>
          ${state.lang !== 'th' ? `<p class="muted small" lang="th">${esc(l.item.name.th)}</p>` : ''}
          <p class="muted small">${baht(l.item.priceSatang)} / ${esc(isHotel ? t('cart.perRoomNight') : unitName(l.item.unit))}</p></div>
        <div class="qty">
          <button class="btn btn--icon btn--outline" type="button" data-qty="${i}" data-d="-1" aria-label="${esc(t('cart.less', { name: tr(l.item.name) }))}">−</button>
          <output aria-live="polite">${l.qty}</output>
          <button class="btn btn--icon btn--outline" type="button" data-qty="${i}" data-d="1" aria-label="${esc(t('cart.more', { name: tr(l.item.name) }))}">+</button>
        </div>
      </div>`).join('')}</div>

    ${isHotel ? detailsForm : `<fieldset class="flag-list" aria-describedby="flags-help">
      <legend><b>${t('cart.flagsLegend')}</b></legend>
      <p class="muted small" id="flags-help">${t('cart.flagsHelp')}</p>
      ${Object.entries(flags).map(([k, label]) => `<label class="check"><input type="checkbox" data-flag="${k}" ${cart.flags.includes(k) ? 'checked' : ''}><span lang="${state.lang}">${esc(tr(label))}${state.lang !== 'th' ? ` · <small lang="th">${esc(label.th)}</small>` : ''}</span></label>`).join('')}
    </fieldset>`}

    <div id="cart-coupons"></div>
    <div id="cart-quote" aria-live="polite"><p class="muted">${t('cart.calculating')}</p></div>
    <div id="cart-ticket"></div>
    <div class="menu-footer">
      <button class="btn btn--danger btn--sm" type="button" data-clear>${t('cart.clear')}</button>
      <button class="btn btn--primary btn--lg" type="button" data-pay disabled>${t('cart.pay')}</button>
    </div>`;

  const tableInput = document.getElementById('cart-table-input');
  tableInput?.addEventListener('input', () => {
    cart.tableTh = tableInput.value.trim() || DEFAULT_TABLE;
    saveCart();
    requestQuote();
  });
  if (isHotel) bindBookingForm(cart);

  body.onclick = (e) => {
    if (e.target.closest('[data-close]')) { closeDialog('cart-dialog'); return; }
    const q = e.target.closest('[data-qty]');
    if (q) {
      const line = cart.items[Number(q.dataset.qty)];
      line.qty += Number(q.dataset.d);
      if (line.qty <= 0) cart.items.splice(Number(q.dataset.qty), 1);
      line.qty = Math.min(20, line.qty);
      // Fewer rooms can hold fewer guests.
      if (cart.booking && cart.items.length) cart.booking.guests = Math.min(cart.booking.guests, guestCapacity(cart));
      saveCart();
      renderCart();
      return;
    }
    if (e.target.closest('[data-clear]')) { clearCart(); renderCart(); return; }
    if (e.target.closest('[data-pay]')) emit('checkout:start', { type: 'order', ...orderRequest(cart) });
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

function bindBookingForm(cart) {
  const checkIn = document.getElementById('bk-checkin');
  const nights = document.getElementById('bk-nights');
  const guests = document.getElementById('bk-guests');
  const note = document.getElementById('bk-note');
  const dates = document.getElementById('bk-dates');
  const update = () => {
    const today = bangkokToday();
    // An empty or past date falls back to today, so the quote never fails on a half-typed date.
    const day = /^\d{4}-\d{2}-\d{2}$/.test(checkIn.value) && checkIn.value >= today ? checkIn.value : today;
    cart.booking = { checkIn: day, nights: Number(nights.value), guests: Number(guests.value), note: note.value.trim().slice(0, 80) };
    dates.textContent = t('bk.dates', { a: formatDay(day), b: formatDay(addDays(day, cart.booking.nights)) });
    saveCart();
    requestQuote();
  };
  checkIn.addEventListener('change', () => { if (checkIn.value && checkIn.value < bangkokToday()) checkIn.value = bangkokToday(); update(); });
  nights.addEventListener('change', update);
  guests.addEventListener('change', update);
  note.addEventListener('input', update);
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
    const q = await api('/api/quote', { method: 'POST', body: orderRequest(cart) });
    if (!document.getElementById('cart-quote')) return;
    renderCoupons(q.breakdown);
    quoteEl.innerHTML = breakdownTable(q.breakdown) + (q.warnings.length ? `<p class="notice">${state.lang === 'th' ? q.warnings.map(esc).join('<br>') : t('cart.adjusted')}</p>` : '');
    document.getElementById('cart-ticket').innerHTML = `<p class="eyebrow">${t(q.ticketPreview.kind === 'booking' ? 'cart.ticketBooking' : 'cart.ticketFood')}</p>${renderTicket(q.ticketPreview, { preview: true })}`;
    if (payBtn) { payBtn.disabled = false; payBtn.textContent = t('cart.payAmount', { v: baht(q.breakdown.totalSatang) }); }
  } catch (err) {
    if (err.status === 400 && /คูปอง/.test(err.message)) { cart.couponCode = 'auto'; saveCart(); requestQuote(); return; }
    if (quoteEl) quoteEl.innerHTML = `<p class="notice notice--warn">${esc(errText(err, err.status === 400 && cart.merchantKind === 'hotel' ? 'err.booking' : 'err.request'))}</p>`;
    if (payBtn) payBtn.disabled = true;
  }
}

function renderCoupons(b) {
  const el = document.getElementById('cart-coupons');
  if (!el) return;
  if (!b.availableCoupons.length) {
    el.innerHTML = `<p class="muted small">${t(b.merchantKind === 'hotel' ? 'cart.noCouponHotel' : 'cart.noCoupon')}</p>`;
    return;
  }
  const chosen = b.coupon ? b.coupon.code : 'none';
  const desc = (c) => {
    if (c.source === 'vip_privilege') return t('coupon.vipAuto');
    return t(c.kind === 'percent' ? 'coupon.pct' : 'coupon.fixed', { v: c.kind === 'percent' ? c.value : baht(c.value) }) + (c.minSpendSatang ? ` (${t('coupon.min', { v: baht(c.minSpendSatang) })})` : '') + ` · ${t(c.source === 'heritage_stamp' ? 'coupon.stamp' : 'coupon.vip')}`;
  };
  el.innerHTML = `<fieldset><legend><b>${t('cart.couponsLegend')}</b></legend>
    ${b.availableCoupons.map((c) => `<label class="coupon-opt${c.eligible ? '' : ' coupon-opt--off'}">
      <input type="radio" name="coupon" value="${esc(c.code)}" ${chosen === c.code ? 'checked' : ''} ${c.eligible ? '' : 'disabled'}>
      <span>${esc(desc(c))}${t(c.eligible ? 'coupon.saves' : 'coupon.notYet', { v: baht(c.discountSatang) })}<br><code>${esc(c.code)}</code></span></label>`).join('')}
    <label class="coupon-opt"><input type="radio" name="coupon" value="none" ${chosen === 'none' ? 'checked' : ''}><span>${t('coupon.none')}</span></label>
  </fieldset>`;
}

export function breakdownTable(b) {
  const rows = (b.lines || []).map((l) => l.label
    ? `<tr><td>${esc(state.lang !== 'th' && b.voucherValueSatang != null ? t('bd.vipPass') : l.label)}</td><td>${baht(l.amountSatang)}</td></tr>`
    : `<tr><td>${esc(tr(l.name))}${l.nights ? t('bd.rooms', { q: l.qty, n: l.nights }) : ` × ${l.qty}`}</td><td>${baht(l.lineTotalSatang)}</td></tr>`).join('');
  const discountLabel = b.coupon && b.coupon.source === 'vip_privilege'
    ? t('bd.vipDiscount')
    : esc(t('bd.coupon', { c: b.coupon ? b.coupon.code : '' }));
  const extra = b.subtotalSatang != null ? `
    <tr><td>${t('bd.subtotal')}</td><td>${baht(b.subtotalSatang)}</td></tr>
    ${b.discountSatang ? `<tr class="discount"><td>${discountLabel}</td><td>−${baht(b.discountSatang)}</td></tr>` : ''}
    <tr><td>${t('bd.fee', { p: Math.round(b.feeRate * 100) })}</td><td>${baht(b.feeSatang)}</td></tr>` : '';
  return `<table class="breakdown"><tbody>${rows}${extra}<tr class="total"><td>${t('bd.total')}</td><td>${baht(b.totalSatang)}</td></tr></tbody></table>`;
}

/** Front-desk booking slip for a hotel: no table number and no kitchen allergy banners. */
function renderBookingTicket(ticket, { preview = false } = {}) {
  // Keep the guest's language even when Thai hotel staff open the saved slip.
  const lang = ticket.guestLang || state.lang;
  const slipText = (key, vars) => t(key, vars, lang);
  const rooms = ticket.rooms || [];
  const bilingual = (text, thai) => `${esc(text)}${lang !== 'th' ? ` <small lang="th">${esc(thai)}</small>` : ''}`;
  return `<div class="ticket ticket--booking" lang="${lang}">
    <div class="ticket__head">
      <div>
        <span class="ticket__no">${bilingual(preview ? slipText('slip.preview') : slipText('slip.no', { no: ticket.orderNo }), preview ? 'ตัวอย่างใบจองห้องพัก' : `ใบจอง ${ticket.orderNo}`)}</span>
        <span class="ticket__table-badge">${bilingual(slipText('slip.badge', { n: ticket.nights, g: ticket.guests }), `${ticket.nights} คืน · ${ticket.guests} ท่าน`)}</span>
      </div>
      <span class="muted small">${bilingual(tr(ticket.merchantName, lang), tr(ticket.merchantName, 'th'))}</span>
    </div>
    <dl class="ticket__stay">
      <div><dt>${bilingual(slipText('slip.checkin'), 'เช็คอิน')}</dt><dd>${esc(formatDay(ticket.checkIn, { lang }))}</dd></div>
      <div><dt>${bilingual(slipText('slip.checkout'), 'เช็คเอาต์')}</dt><dd>${esc(formatDay(ticket.checkOut, { lang }))}</dd></div>
    </dl>
    ${rooms.map((r) => `<div class="ticket__line">
      <p class="ticket__th">${esc(slipText('slip.room', { name: lang === 'th' ? r.nameTh : r.nameGuest, q: r.qty }))}</p>
      ${lang !== 'th' ? `<p class="ticket__guest" lang="th"><small>${esc(r.nameTh)} × ${r.qty} ห้อง</small></p>` : ''}
    </div>`).join('')}
    ${ticket.note ? `<p class="ticket__note">${bilingual(slipText('slip.note', { v: ticket.note }), `คำขอเพิ่มเติม: ${ticket.note}`)}</p>` : ''}
  </div>`;
}

export function renderTicket(t, { preview = false } = {}) {
  if (t && t.kind === 'booking') return renderBookingTicket(t, { preview });
  const lang = t.guestLang || 'en';
  const tableLabel = t.tableTh || DEFAULT_TABLE;
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
window.addEventListener('phitlok:vip-activated', () => {
  if (document.getElementById('cart-dialog')?.open) renderCart();
});
on('payment:success', (r) => {
  if (r.type === 'order') clearCart();
});
