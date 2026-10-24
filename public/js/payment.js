// PromptPay checkout modal shared by all 4 revenue streams — PHITLOK NEXUS v2.0
import { state, api, esc, tr, baht, emit, on, openDialog, closeDialog, toast, refreshIcons } from './core.js';
import { breakdownTable, renderTicket } from './menu.js';
import { t, errText, locale } from './i18n.js';

let countdownTimer = null;
let lastRequest = null;

export async function startCheckout(request) {
  lastRequest = request;
  const body = document.getElementById('pay-body');
  openDialog('pay-dialog');
  body.innerHTML = `<div class="empty"><p class="empty__title">${t('pay.creating')}</p><p class="muted">${t('pay.server')}</p></div>`;
  try {
    const co = await api('/api/checkout', { method: 'POST', body: request });
    renderQr(co);
  } catch (err) {
    if (err.status === 422 && err.data.fields) {
      closeDialog('pay-dialog');
      emit('checkout:field-errors', err.data.fields);
      toast(errText(err), 'error');
      return;
    }
    body.innerHTML = `<div class="dialog__head"><h2 id="pay-title">${t('pay.failed')}</h2>${closeBtn()}</div>
      <p class="notice notice--warn">${esc(errText(err))}</p>
      <button class="btn btn--primary btn--block" type="button" data-close>${t('close')}</button>`;
    bindClose(body);
  }
}

function closeBtn() {
  return `<button class="btn btn--icon btn--ghost" type="button" data-close aria-label="${t('close')}">✕</button>`;
}
function bindClose(body) {
  body.onclick = (e) => { if (e.target.closest('[data-close]')) closeDialog('pay-dialog'); };
}

function renderQr(co) {
  const body = document.getElementById('pay-body');
  const title = state.lang === 'th' ? co.title
    : co.breakdown.merchantName ? t(co.breakdown.merchantKind === 'hotel' ? 'pay.titleHotel' : 'pay.titleFood', { name: tr(co.breakdown.merchantName) })
      : co.type === 'vip_pass' || co.breakdown.voucherValueSatang != null ? t('bd.vipPass') : co.title;
  const hasPlayableQr = Boolean(co.qr && co.qr.playable && co.qr.dataUrl);
  const qrSection = hasPlayableQr
    ? `<div class="qr-wrap">
        <div class="badges" style="justify-content:center;margin-bottom:8px">
          <span class="qr-brand">THAI QR PAYMENT · PromptPay</span>
          <span class="badge badge--warn">${t('pay.demo')}</span>
        </div>
        <img src="${co.qr.dataUrl}" alt="${esc(t('pay.amountDemo', { v: baht(co.amountSatang) }))}" width="230" height="230">
        <p class="small">${esc(t('pay.target', { t: co.qr.target, v: baht(co.amountSatang) }))}</p>
        <p class="small">${t('pay.expires')} <span class="countdown" id="pay-countdown">15:00</span></p>
        <p class="demo-warning">${t('pay.demoWarn')}</p>
      </div>`
    : `<div class="qr-wrap qr-wrap--demo-only" role="region" aria-label="${t('pay.sampleQr')}">
        <div class="badges" style="justify-content:center;margin-bottom:8px">
          <span class="badge badge--warn">${t('pay.demo')}</span>
          <span class="badge">${t('pay.noBank')}</span>
        </div>
        <div class="qr-placeholder-box" style="border:2px dashed var(--gold,#B8860B);border-radius:16px;padding:24px 16px;margin:8px auto;max-width:260px;text-align:center;background:rgba(184,134,11,0.08)">
          <p style="font-size:1.25rem;font-weight:700;margin:0 0 8px;color:var(--danger,#B91C1C)">${t('pay.sampleQr')}</p>
          <p class="small muted" style="margin:0">${t('pay.sampleText')}</p>
        </div>
        <p class="small">${t('pay.amountDemo', { v: baht(co.amountSatang) })} · ${t('pay.expires')} <span class="countdown" id="pay-countdown">15:00</span></p>
        <p class="demo-warning">${t('pay.demoWarn')}</p>
      </div>`;

  body.innerHTML = `
    <div class="dialog__head">
      <div>
        <p class="eyebrow"><span class="badge badge--warn">${t('pay.demo')}</span> ${t('pay.eyebrow')}</p>
        <h2 id="pay-title">${esc(title)}</h2>
      </div>
      ${closeBtn()}
    </div>
    ${breakdownTable(co.breakdown)}
    ${qrSection}
    <details class="ocr"><summary>${t('pay.details')}</summary><pre>${esc(co.qr ? co.qr.payload : 'DEMO-MODE')}</pre></details>
    <div class="menu-footer">
      <button class="btn btn--ghost" type="button" data-close>${t('pay.cancel')}</button>
      <button class="btn btn--primary btn--lg" type="button" data-confirm>${t('pay.confirm')}</button>
    </div>`;
  startCountdown(co.expiresAt);
  body.onclick = async (e) => {
    if (e.target.closest('[data-close]')) { closeDialog('pay-dialog'); return; }
    const btn = e.target.closest('[data-confirm]');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${t('pay.confirming')}`;
    try {
      const result = await api(`/api/checkout/${co.checkoutId}/confirm`, { method: 'POST' });
      clearInterval(countdownTimer);
      renderSuccess(result);
      emit('payment:success', result);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t('pay.confirm');
      if (err.status === 410 || err.status === 409) {
        body.insertAdjacentHTML('afterbegin', `<p class="notice notice--warn">${esc(errText(err))} <button class="btn btn--sm btn--outline" type="button" data-retry>${t('pay.newQr')}</button></p>`);
        body.querySelector('[data-retry]')?.addEventListener('click', () => startCheckout(lastRequest));
      } else toast(errText(err), 'error');
    }
  };
}

function startCountdown(expiresAt) {
  clearInterval(countdownTimer);
  const el = document.getElementById('pay-countdown');
  const tick = () => {
    const s = Math.max(0, Math.round((Date.parse(expiresAt) - Date.now()) / 1000));
    if (el) el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (s === 0) clearInterval(countdownTimer);
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function renderSuccess(r) {
  const body = document.getElementById('pay-body');
  let content = '';
  if (r.type === 'vip_pass') {
    content = `<div class="success-hero"><h2 id="pay-title">${t('pay.vipDone')}</h2>
      <p>${esc(t('pay.until', { d: new Date(r.vip.until).toLocaleString(locale(), { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) }))}</p></div>
      <p><b>${t('pay.vouchers', { n: r.vip.vouchers.length, v: baht(r.vip.vouchers.reduce((s, v) => s + v.valueSatang, 0)) })}</b></p>
      ${r.vip.vouchers.map((v) => `<div class="coupon-card"><span>${esc(tr(v.merchantName))}<br><small>${t('coupon.fixed', { v: baht(v.valueSatang) })} · ${t('coupon.min', { v: baht(v.minSpendSatang) })}</small></span><code>${esc(v.code)}</code></div>`).join('')}
      <div class="menu-footer"><button class="btn btn--ghost" type="button" data-close>${t('close')}</button><button class="btn btn--primary" type="button" data-go="lens">${t('pay.goLens')}</button></div>`;
  } else if (r.type === 'order' && r.order.ticket.kind === 'booking') {
    content = `<div class="success-hero"><h2 id="pay-title">${esc(t('pay.bookDone', { no: r.order.orderNo }))}</h2>
      <p>${t('pay.bookText')}</p></div>
      ${renderTicket(r.order.ticket)}
      ${breakdownTable(r.order.breakdown)}
      <div class="menu-footer"><button class="btn btn--ghost" type="button" data-close>${t('close')}</button><button class="btn btn--primary" type="button" data-go="merchant">${t('pay.toHotel')}</button></div>`;
  } else if (r.type === 'order') {
    content = `<div class="success-hero"><h2 id="pay-title">${esc(t('pay.foodDone', { no: r.order.orderNo }))}</h2>
      <p>${t('pay.foodText')}</p></div>
      ${renderTicket(r.order.ticket)}
      ${breakdownTable(r.order.breakdown)}
      <div class="menu-footer"><button class="btn btn--ghost" type="button" data-close>${t('close')}</button><button class="btn btn--primary" type="button" data-go="merchant">${t('pay.toShop')}</button></div>`;
  } else if (r.type === 'saas' || r.type === 'hotel_saas') {
    const isHotel = r.type === 'hotel_saas' || r.merchant?.kind === 'hotel';
    content = `<div class="success-hero"><h2 id="pay-title">ยินดีต้อนรับสู่ ${isHotel ? 'Hotel Partner SaaS (499฿/ด.)' : 'Pro Merchant SaaS (199฿/ด.)'}!</h2>
      <p>ปักหมุดพิกัด GPS จริงของ <b>${esc(tr(r.merchant.name, 'th'))}</b> บนแผนที่ 3D และเปิดระบบแปล 6 ภาษาแล้ว</p></div>
      <div class="menu-footer"><button class="btn btn--ghost" type="button" data-close>ปิด</button><button class="btn btn--primary" type="button" data-go="pin">ดูหมุดบนแผนที่ 3D</button></div>`;
  }
  body.innerHTML = content;
  refreshIcons();
  body.onclick = (e) => {
    if (e.target.closest('[data-close]')) { closeDialog('pay-dialog'); return; }
    const go = e.target.closest('[data-go]');
    if (go) { closeDialog('pay-dialog'); emit('navigate', { to: go.dataset.go, result: r }); }
  };
}

on('checkout:start', (req) => {
  closeDialog('cart-dialog');
  startCheckout(req);
});
document.getElementById('pay-dialog')?.addEventListener('close', () => clearInterval(countdownTimer));
