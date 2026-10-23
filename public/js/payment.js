// PromptPay checkout modal shared by all 4 revenue streams — PHITLOK NEXUS v2.0
import { api, esc, tr, baht, emit, on, openDialog, closeDialog, toast, refreshIcons } from './core.js';
import { breakdownTable, renderTicket } from './menu.js';

let countdownTimer = null;
let lastRequest = null;

export async function startCheckout(request) {
  lastRequest = request;
  const body = document.getElementById('pay-body');
  openDialog('pay-dialog');
  body.innerHTML = `<div class="empty"><p class="empty__title">กำลังสร้าง QR พร้อมเพย์…</p><p class="muted">ยอดเงินคำนวณจากเซิร์ฟเวอร์</p></div>`;
  try {
    const co = await api('/api/checkout', { method: 'POST', body: request });
    renderQr(co);
  } catch (err) {
    if (err.status === 422 && err.data.fields) {
      closeDialog('pay-dialog');
      emit('checkout:field-errors', err.data.fields);
      toast(err.message, 'error');
      return;
    }
    body.innerHTML = `<div class="dialog__head"><h2 id="pay-title">ชำระเงินไม่สำเร็จ</h2>${closeBtn()}</div>
      <p class="notice notice--warn">${esc(err.message)}</p>
      <button class="btn btn--primary btn--block" type="button" data-close>ปิด</button>`;
    bindClose(body);
  }
}

function closeBtn() {
  return '<button class="btn btn--icon btn--ghost" type="button" data-close aria-label="ปิด">✕</button>';
}
function bindClose(body) {
  body.onclick = (e) => { if (e.target.closest('[data-close]')) closeDialog('pay-dialog'); };
}

function renderQr(co) {
  const body = document.getElementById('pay-body');
  const hasPlayableQr = Boolean(co.qr && co.qr.playable && co.qr.dataUrl);
  const qrSection = hasPlayableQr
    ? `<div class="qr-wrap">
        <div class="badges" style="justify-content:center;margin-bottom:8px">
          <span class="qr-brand">THAI QR PAYMENT · PromptPay</span>
          <span class="badge badge--warn">โหมดสาธิต</span>
        </div>
        <img src="${co.qr.dataUrl}" alt="QR พร้อมเพย์สาธิต ยอด ${baht(co.amountSatang)}" width="230" height="230">
        <p class="small">พร้อมเพย์สาธิต (DEMO_PROMPTPAY_ID): <b>${esc(co.qr.target)}</b> · ยอดชำระ <b>${baht(co.amountSatang)}</b></p>
        <p class="small">QR หมดอายุใน <span class="countdown" id="pay-countdown">15:00</span></p>
        <p class="demo-warning">โหมดสาธิต: กรุณากดปุ่มยืนยันด้านล่างแทนการโอนเงินจริง</p>
      </div>`
    : `<div class="qr-wrap qr-wrap--demo-only" role="region" aria-label="QR ตัวอย่าง ห้ามโอนเงิน">
        <div class="badges" style="justify-content:center;margin-bottom:8px">
          <span class="badge badge--warn">โหมดสาธิต</span>
          <span class="badge">ไม่ได้ผูกบัญชีธนาคารจริง</span>
        </div>
        <div class="qr-placeholder-box" style="border:2px dashed var(--gold,#B8860B);border-radius:16px;padding:24px 16px;margin:8px auto;max-width:260px;text-align:center;background:rgba(184,134,11,0.08)">
          <p style="font-size:1.25rem;font-weight:700;margin:0 0 8px;color:var(--danger,#B91C1C)">QR ตัวอย่าง ห้ามโอนเงิน</p>
          <p class="small muted" style="margin:0">ยังไม่ได้ตั้งค่า <code>DEMO_PROMPTPAY_ID</code> เพื่อป้องกันการสแกนโอนเงินเข้าบัญชีบุคคลอื่นโดยไม่ตั้งใจ</p>
        </div>
        <p class="small">ยอดจำลองชำระ: <b>${baht(co.amountSatang)}</b> · หมดอายุใน <span class="countdown" id="pay-countdown">15:00</span></p>
        <p class="demo-warning">โหมดสาธิต: กดปุ่ม "ยืนยันการชำระเงินจำลอง" ด้านล่างเพื่อทดสอบระบบได้ทันที</p>
      </div>`;

  body.innerHTML = `
    <div class="dialog__head">
      <div>
        <p class="eyebrow"><span class="badge badge--warn">โหมดสาธิต</span> ชำระเงินด้วย Thai QR Payment (EMVCo)</p>
        <h2 id="pay-title">${esc(co.title)}</h2>
      </div>
      ${closeBtn()}
    </div>
    ${breakdownTable(co.breakdown)}
    ${qrSection}
    <details class="ocr"><summary>ข้อมูลรายการชำระเงิน (โหมดสาธิต)</summary><pre>${esc(co.qr ? co.qr.payload : 'DEMO-MODE')}</pre></details>
    <div class="menu-footer">
      <button class="btn btn--ghost" type="button" data-close>ยกเลิก</button>
      <button class="btn btn--primary btn--lg" type="button" data-confirm>ยืนยันการชำระเงินจำลอง (โหมดสาธิต)</button>
    </div>`;
  startCountdown(co.expiresAt);
  body.onclick = async (e) => {
    if (e.target.closest('[data-close]')) { closeDialog('pay-dialog'); return; }
    const btn = e.target.closest('[data-confirm]');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> กำลังยืนยัน…';
    try {
      const result = await api(`/api/checkout/${co.checkoutId}/confirm`, { method: 'POST' });
      clearInterval(countdownTimer);
      renderSuccess(result);
      emit('payment:success', result);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'ยืนยันการชำระเงินสำเร็จ (โหมดสาธิตสำหรับกรรมการ)';
      if (err.status === 410 || err.status === 409) {
        body.insertAdjacentHTML('afterbegin', `<p class="notice notice--warn">${esc(err.message)} <button class="btn btn--sm btn--outline" type="button" data-retry>สร้าง QR ใหม่</button></p>`);
        body.querySelector('[data-retry]')?.addEventListener('click', () => startCheckout(lastRequest));
      } else toast(err.message, 'error');
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
    content = `<div class="success-hero"><h2 id="pay-title">ปลดล็อก Phitsanulok VIP Pass (99฿) สำเร็จ!</h2>
      <p>ใช้ได้ถึง ${new Date(r.vip.until).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
      <p><b>คูปองที่ได้รับ ${r.vip.vouchers.length} ใบ</b> (รวมมูลค่า ${baht(r.vip.vouchers.reduce((s, v) => s + v.valueSatang, 0))})</p>
      ${r.vip.vouchers.map((v) => `<div class="coupon-card"><span>${esc(tr(v.merchantName, 'th'))}<br><small>ลด ${baht(v.valueSatang)} · ขั้นต่ำ ${baht(v.minSpendSatang)}</small></span><code>${esc(v.code)}</code></div>`).join('')}
      <div class="menu-footer"><button class="btn btn--ghost" type="button" data-close>ปิด</button><button class="btn btn--primary" type="button" data-go="lens">ฟังเสียงบรรยาย 6 ภาษาฉบับเต็ม</button></div>`;
  } else if (r.type === 'order') {
    content = `<div class="success-hero"><h2 id="pay-title">ชำระเงินสำเร็จ · ออเดอร์ ${esc(r.order.orderNo)}</h2>
      <p>ส่งใบสั่งภาษาไทยพร้อมป้ายเตือนภูมิแพ้สีแดงเข้าสู่หน้าจอรับออเดอร์หน้าร้านแล้ว</p></div>
      ${renderTicket(r.order.ticket)}
      ${breakdownTable(r.order.breakdown)}
      <div class="menu-footer"><button class="btn btn--ghost" type="button" data-close>ปิด</button><button class="btn btn--primary" type="button" data-go="merchant">ดูออเดอร์ในหน้าจอเจ้าของร้าน (Merchant Portal)</button></div>`;
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
