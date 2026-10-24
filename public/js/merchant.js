// Merchant Portal (3 Sub-Tabs: Live Kitchen & Booking Display, My Shop GPS & Map Checker, Smart Menu Manager) — PHITLOK NEXUS v2.2
import { state, api, esc, tr, baht, num, timeAgo, emit, on, toast, refreshIcons, svgFallbackUrl } from './core.js';
import { renderTicket, renderDigitalMenu } from './menu.js';

const STATUS = {
  new: { label: 'ออเดอร์เข้าใหม่', next: 'preparing', action: 'รับออเดอร์', stepIndex: 0 },
  preparing: { label: 'กำลังทำ', next: 'ready', action: 'กำลังทำ → กดเมื่อเสร็จพร้อมเสิร์ฟ', stepIndex: 1 },
  ready: { label: 'เสร็จพร้อมเสิร์ฟ', next: 'done', action: 'เสร็จพร้อมเสิร์ฟ (ส่งมอบลูกค้า)', stepIndex: 2 },
  done: { label: 'ส่งมอบเรียบร้อย', next: null, stepIndex: 3 }
};
// Hotels use the same 4 order states, worded as a stay: booked → confirmed → checked in → checked out.
const HOTEL_STATUS = {
  new: { label: 'การจองใหม่' },
  preparing: { label: 'ยืนยันห้องแล้ว' },
  ready: { label: 'เช็คอินแล้ว' },
  done: { label: 'เช็คเอาต์แล้ว' }
};
const LANG_NAME = { th: 'ไทย (TH)', en: 'อังกฤษ (EN)', zh: 'จีน (CN)', ja: 'ญี่ปุ่น (JP)', ko: 'เกาหลี (KR)', fr: 'ฝรั่งเศส (FR)' };

let merchantId = null;
let currentSubTab = 'kitchen'; // 'kitchen' | 'gps' | 'menu'
let pollTimer = null;
let lastDashboard = null;
const seenOrders = new Set();
let firstLoad = true;

export function selectMerchantTab(tabId) {
  currentSubTab = tabId;
  document.querySelectorAll('[data-m-tab]').forEach((btn) => {
    const active = btn.dataset.mTab === tabId;
    btn.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-m-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.mPanel !== tabId;
  });
  refreshIcons();
}

export function populateMerchantSelect() {
  const sel = document.getElementById('merchant-select');
  if (!sel || !state.data) return;
  const merchants = state.data.merchants;
  sel.innerHTML = merchants.map((m) => {
    const prefix = m.kind === 'hotel' ? '[โรงแรม]' : '[ร้านอาหาร]';
    return `<option value="${m.id}">${prefix} ${esc(m.name.th)} (GPS: ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)})</option>`;
  }).join('');
  if (merchantId && merchants.some((m) => m.id === merchantId)) sel.value = String(merchantId);
  merchantId = Number(sel.value);
}

export function startMerchantView(preferId) {
  if (preferId) {
    merchantId = Number(preferId);
    const sel = document.getElementById('merchant-select');
    if (sel) sel.value = String(merchantId);
  }
  load();
  clearInterval(pollTimer);
  pollTimer = setInterval(load, 4000);
}

export function stopMerchantView() { clearInterval(pollTimer); }

export async function refreshMerchantData(preferId) {
  if (preferId) {
    merchantId = Number(preferId);
    const sel = document.getElementById('merchant-select');
    if (sel) sel.value = String(merchantId);
  }
  await load();
}

async function load() {
  if (!merchantId) return;
  try {
    const d = await api(`/api/merchants/${merchantId}/dashboard`);
    lastDashboard = d;
    render(d);
  } catch (err) {
    const el = document.getElementById('merchant-orders');
    if (el) el.innerHTML = `<p class="notice notice--warn">${esc(err.message)}</p>`;
  }
}

function render(d) {
  const m = d.merchant;
  const isHotel = m.kind === 'hotel' || m.category === 'stay';
  const feePct = isHotel ? '5%' : '3%';
  const saasPrice = isHotel ? '499฿/เดือน' : '199฿/เดือน';

  const titleEl = document.getElementById('merchant-title');
  if (titleEl) titleEl.textContent = `${m.name.th} — ระบบจัดการร้านและโรงแรม`;

  const kpiEl = document.getElementById('merchant-kpis');
  if (kpiEl) {
    kpiEl.innerHTML = [
      [isHotel ? 'การจองวันนี้' : 'ออเดอร์วันนี้', `${d.stats.todayOrders} รายการ`, 'kpi--accent', 'ชำระผ่าน QR PromptPay แล้ว'],
      ['ยอดขายรับสุทธิวันนี้', baht(d.stats.todaySalesSatang), 'kpi--accent', isHotel ? 'โอนเข้าพร้อมเพย์โรงแรมโดยตรง' : 'โอนเข้าพร้อมเพย์ร้านโดยตรง'],
      [isHotel ? 'การจองที่ยังไม่เช็คเอาต์' : 'คิวที่กำลังดำเนินการ', `${d.stats.openOrders} ${isHotel ? 'รายการ' : 'คิว'}`, 'kpi--gold', isHotel ? 'รอยืนยัน / ยืนยันแล้ว / เข้าพักอยู่' : 'รอรับออเดอร์ / กำลังทำ / พร้อมเสิร์ฟ'],
      [`ค่าธรรมเนียม (${feePct}) เดือนนี้`, baht(d.stats.monthPlatformFeeSatang), '', `สมาชิก SaaS ${saasPrice}`]
    ].map(([label, value, cls, sub]) => `<div class="kpi ${cls}"><p class="kpi__label">${label}</p><p class="kpi__value">${value}</p><p class="kpi__sub">${sub}</p></div>`).join('');
  }

  renderTab1Kitchen(d, isHotel);
  renderTab2GpsChecker(d);
  renderTab3MenuManager(d);
  refreshIcons();
}

// ------------------------------------------------------------------ Tab 1: Live Kitchen & Booking Display
function renderTab1Kitchen(d, isHotel) {
  const list = document.getElementById('merchant-orders');
  if (!list) return;
  const fresh = [];
  for (const o of d.orders) {
    if (!seenOrders.has(o.id)) { if (!firstLoad) fresh.push(o); seenOrders.add(o.id); }
  }
  firstLoad = false;
  if (fresh.length) toast(`${isHotel ? 'การจองใหม่เข้าโรงแรม' : 'ออเดอร์ใหม่เข้าหน้าร้าน'}: ${fresh.map((o) => o.orderNo).join(', ')}`, 'ok');
  const freshIds = new Set(fresh.map((o) => o.id));
  const active = d.orders.filter((o) => o.status !== 'done');
  const done = d.orders.filter((o) => o.status === 'done').slice(0, 6);

  list.innerHTML = (active.length
    ? active.map((o) => orderCard(o, freshIds.has(o.id), isHotel)).join('')
    : (isHotel
      ? '<div class="card empty"><p class="empty__title">ยังไม่มีการจองที่รอดำเนินการ</p><p class="muted">เมื่อนักท่องเที่ยวจองห้องพัก ใบจองพร้อมวันเช็คอินและจำนวนผู้เข้าพักจะขึ้นที่นี่ทันที</p></div>'
      : '<div class="card empty"><p class="empty__title">ไม่มีคิวค้างในขณะนี้</p><p class="muted">เมื่อนักท่องเที่ยวสั่งอาหาร รายการตัวหนังสือใหญ่พร้อมคำเตือนภูมิแพ้สีแดงจะเด้งขึ้นที่นี่ทันที</p></div>'))
    + (done.length ? `<details class="hidden-summary"><summary>${isHotel ? 'ประวัติการจองที่เช็คเอาต์แล้ว' : 'ประวัติออเดอร์ที่เสร็จพร้อมเสิร์ฟแล้ว'} (${done.length} รายการ)</summary><div class="orders">${done.map((o) => orderCard(o, false, isHotel)).join('')}</div></details>` : '');

  const updatedEl = document.getElementById('merchant-updated');
  if (updatedEl) updatedEl.textContent = `อัปเดตสด ${new Date().toLocaleTimeString('th-TH')}`;
}

function orderCard(o, fresh, isHotel) {
  const st = (isHotel ? HOTEL_STATUS : STATUS)[o.status] || STATUS.new;
  const noun = isHotel ? 'การจอง' : 'ออเดอร์';
  const actions = isHotel
    ? [['check-circle-2', 'ยืนยันการจอง'], ['log-in', 'เช็คอิน'], ['log-out', 'เช็คเอาต์']]
    : [['check-circle-2', 'รับออเดอร์'], ['flame', 'กำลังทำ'], ['bell-ring', 'เสร็จพร้อมเสิร์ฟ']];
  return `<article class="order-card order-card--${o.status}${fresh ? ' order-card--fresh' : ''}" aria-label="${noun} ${esc(o.orderNo)}">
    <div class="order-card__head">
      <div class="badges">
        <span class="badge ${o.status === 'new' ? 'badge--gold' : 'badge--ok'}">${st.label}</span>
        <span class="badge">${isHotel ? 'ภาษาผู้เข้าพัก' : 'ลูกค้าต่างชาติ'}: ${esc(LANG_NAME[o.guestLang] || o.guestLang)}</span>
        <span class="badge">รหัส ${esc(o.orderNo)}</span>
      </div>
      <span class="muted small">${timeAgo(o.createdAt)}</span>
    </div>
    ${renderTicket(o.ticket)}
    <div class="order-card__foot">
      <span class="small">ยอดสุทธิเข้าบัญชี${isHotel ? 'โรงแรม' : 'ร้าน'} <b>${baht(o.subtotalSatang - o.discountSatang)}</b>${o.discountSatang ? ` (ใช้คูปองลด ${baht(o.discountSatang)})` : ''} · ชำระพร้อมเพย์แล้ว <b>${baht(o.totalSatang)}</b></span>
      ${o.status !== 'done' ? `
      <div class="status-stepper" role="group" aria-label="เปลี่ยนสถานะ${noun}">
        <button class="btn btn--merchant ${o.status === 'new' ? 'btn--primary' : 'btn--outline'}"
                type="button"
                ${o.status === 'new' ? `data-advance="${o.id}" data-next="preparing"` : 'disabled'}>
          <i data-lucide="${actions[0][0]}"></i> ${actions[0][1]}
        </button>
        <span class="step-arrow" aria-hidden="true">→</span>
        <button class="btn btn--merchant ${o.status === 'preparing' ? 'btn--primary' : 'btn--outline'}"
                type="button"
                ${o.status === 'preparing' ? `data-advance="${o.id}" data-next="ready"` : 'disabled'}>
          <i data-lucide="${actions[1][0]}"></i> ${actions[1][1]}
        </button>
        <span class="step-arrow" aria-hidden="true">→</span>
        <button class="btn btn--merchant ${o.status === 'ready' ? 'btn--gold' : 'btn--outline'}"
                type="button"
                ${o.status === 'ready' ? `data-advance="${o.id}" data-next="done"` : 'disabled'}>
          <i data-lucide="${actions[2][0]}"></i> ${actions[2][1]}
        </button>
      </div>` : `<span class="badge badge--ok">${isHotel ? 'ผู้เข้าพักเช็คเอาต์แล้ว' : 'เสิร์ฟลูกค้าเรียบร้อยแล้ว'}</span>`}
    </div>
  </article>`;
}

// ------------------------------------------------------------------ Tab 2: My Shop GPS & Map Checker
function renderTab2GpsChecker(d) {
  const box = document.getElementById('merchant-gps-panel');
  if (!box) return;
  const m = d.merchant;
  const lm = state.data.landmarks.find((l) => l.id === m.nearest) || state.data.landmarks[0];
  const isOpen = m.shopStatus !== 'busy';
  const gmapsUrl = m.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`;
  const gearthUrl = m.googleEarthUrl || `https://earth.google.com/web/search/${m.lat},${m.lng}`;

  box.innerHTML = `
    <div class="gps-checker-grid">
      <div class="card gps-map-visual">
        <div class="gps-map-visual__header">
          <span class="badge badge--warn"><i data-lucide="info"></i> ข้อมูลสาธิต · รอทีมตรวจพิกัด</span>
                  </div>
        <div class="gps-radar">
          <img class="gps-radar__bg" src="${esc(m.imageUrl || svgFallbackUrl(m.name.th))}"
               onerror="this.onerror=null;this.src='${esc(svgFallbackUrl(m.name.th))}'"
               alt="${esc(m.name.th)}">
          <div class="gps-radar__overlay">
            <div class="gps-pin-pulse">
              <i data-lucide="map-pin"></i>
            </div>
            <div class="gps-coord-readout">
              <p class="eyebrow">พิกัดดาวเทียม GPS จริงของร้านคุณ</p>
              <h3>${esc(m.name.th)}</h3>
              <p class="gps-numbers">Lat: <b>${m.lat.toFixed(4)}° N</b> · Lng: <b>${m.lng.toFixed(4)}° E</b></p>
              <p class="small">จุดอ้างอิง 3D Scene: <code>(x: ${m.x}, z: ${m.z})</code> · ห่างจาก${esc(lm.name.th.split(' (')[0])} <b>${num(m.distanceM)} เมตร</b></p>
            </div>
          </div>
        </div>
        <div class="actions mt">
          <a class="btn btn--merchant btn--outline" href="${esc(gmapsUrl)}" target="_blank" rel="noopener">
            <i data-lucide="map"></i> เปิดดูพิกัดจริงบน Google Maps
          </a>
          <a class="btn btn--merchant btn--outline" href="${esc(gearthUrl)}" target="_blank" rel="noopener">
            <i data-lucide="globe"></i> เปิดดูมุมมอง Google Earth 3D
          </a>
        </div>
      </div>

      <div class="card gps-status-controls">
        <h3>สถานะหน้าร้านบนแผนที่นักท่องเที่ยว</h3>
        <p class="muted">กดปุ่มด้านล่างเพื่อเปลี่ยนสถานะร้านของคุณแบบเรียลไทม์ นักท่องเที่ยวทั้ง 6 ภาษาจะเห็นสถานะทันที</p>
        <div class="shop-status-banner ${isOpen ? 'shop-status-banner--open' : 'shop-status-banner--busy'}">
          <div>
            <p class="small">สถานะปัจจุบันของร้าน:</p>
            <p class="shop-status-banner__title">${isOpen ? '🟢 เปิดรับลูกค้า (Open for Orders)' : '🟠 คิวเต็มชั่วคราว (Temporarily Busy)'}</p>
          </div>
        </div>
        <div class="status-toggle-group">
          <button class="btn btn--merchant ${isOpen ? 'btn--primary' : 'btn--outline'} btn--block"
                  type="button" data-shop-status="open" aria-pressed="${isOpen}">
            <i data-lucide="check-circle"></i> เปิดรับลูกค้า (รับออเดอร์ปกติ)
          </button>
          <button class="btn btn--merchant ${!isOpen ? 'btn--danger' : 'btn--outline'} btn--block"
                  type="button" data-shop-status="busy" aria-pressed="${!isOpen}">
            <i data-lucide="pause-circle"></i> คิวเต็มชั่วคราว (พักรับออเดอร์)
          </button>
        </div>

        <div class="divider"><span>ทดสอบมุมมองนักท่องเที่ยว</span></div>
        <p class="muted small">กดปุ่มด้านล่างเพื่อสลับไปดูหมุดร้านและเมนูดิจิทัล 6 ภาษาของร้านคุณในมุมมองนักท่องเที่ยวได้ทันที</p>
        <div class="actions">
          <button class="btn btn--merchant btn--gold btn--block" type="button" data-preview-tourist="${esc(m.slug)}" data-preview-id="${m.id}">
            <i data-lucide="eye"></i> ทดสอบดูหน้าร้านของฉันในมุมมองนักท่องเที่ยว
          </button>
        </div>
      </div>
    </div>`;
}

// ------------------------------------------------------------------ Tab 3: Smart Menu Manager
function renderTab3MenuManager(d) {
  const menuListEl = document.getElementById('merchant-menu');
  if (!menuListEl) return;
  if (!d.menu.length) {
    menuListEl.innerHTML = '<li class="muted">ยังไม่มีเมนูดิจิทัล — กดปุ่มสแกนเมนูกระดาษด้วย AI ด้านซ้ายได้เลย</li>';
    return;
  }
  menuListEl.innerHTML = d.menu.map((item) => {
    const avail = item.available !== false;
    const imgUrl = item.imageUrl || item.fallbackImage || '/assets/photos/hoi-kha-noodles.jpg';
    const fallback = item.fallbackImage || '/assets/photos/hoi-kha-noodles.jpg';
    return `<li class="smart-menu-row ${avail ? '' : 'smart-menu-row--off'}">
      <img class="smart-menu-row__img" src="${esc(imgUrl)}"
           onerror="this.onerror=null;this.src='${esc(fallback)}'"
           alt="${esc(item.name.th)}" width="64" height="64">
      <div class="smart-menu-row__info">
        <p class="smart-menu-row__title"><b>${esc(item.name.th)}</b> — <span class="gold-text">${baht(item.priceSatang)}</span></p>
        <p class="muted small">แปลครบ 6 ภาษา: EN ${esc(item.name.en)} · CN ${esc(item.name.zh)} · JP ${esc(item.name.ja || item.name.en)} · KR ${esc(item.name.ko)} · FR ${esc(item.name.fr || item.name.en)}</p>
      </div>
      <div class="smart-menu-row__action">
        <button class="btn btn--merchant ${avail ? 'btn--primary' : 'btn--danger'}"
                type="button"
                data-toggle-item="${item.id}"
                data-next-avail="${avail ? '0' : '1'}">
          <i data-lucide="${avail ? 'toggle-right' : 'toggle-left'}"></i>
          ${avail ? 'เปิดขาย (กดเพื่อแจ้งของหมด)' : 'ของหมด (กดเพื่อเปิดขาย)'}
        </button>
      </div>
    </li>`;
  }).join('');
}

async function advance(id, next, btn) {
  btn.disabled = true;
  try {
    await api(`/api/orders/${id}/status`, { method: 'POST', body: { merchantId, status: next } });
    toast(`อัปเดตสถานะออเดอร์เรียบร้อย`, 'ok');
    await load();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
}

async function toggleShopStatus(shopStatus, btn) {
  btn.disabled = true;
  try {
    await api(`/api/merchants/${merchantId}/status`, { method: 'POST', body: { shopStatus } });
    toast(shopStatus === 'open' ? 'เปิดรับลูกค้าบนแผนที่ 3D แล้ว' : 'ตั้งสถานะ "คิวเต็มชั่วคราว" แล้ว', 'ok');
    emit('data:reload');
    await load();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function toggleMenuItem(itemId, available, btn) {
  btn.disabled = true;
  try {
    await api(`/api/merchants/${merchantId}/menu/${itemId}/toggle`, { method: 'POST', body: { available } });
    toast(available ? 'เปิดขายเมนูนี้แล้ว' : 'ตั้งสถานะ "ของหมด" แล้ว', 'ok');
    emit('data:reload');
    await load();
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
}

async function scanPaperMenu({ file, preset }) {
  const out = document.getElementById('merchant-scan-result');
  if (!out) return;
  if (file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast('รองรับเฉพาะไฟล์ .jpg .png .webp', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('ไฟล์ใหญ่เกิน 5MB', 'error'); return; }
  }
  out.innerHTML = '<p class="muted"><span class="spinner" aria-hidden="true"></span> AI กำลังสแกนเมนูกระดาษและแปลเป็น 6 ภาษาอัตโนมัติ…</p>';
  const form = new FormData();
  form.append('merchantId', String(merchantId));
  if (preset) form.append('preset', preset);
  if (file) form.append('image', file);
  try {
    const r = await api('/api/scan-menu', { method: 'POST', form });
    renderDigitalMenu(out, {
      merchant: r.merchant, items: r.items, source: r.source, latencyMs: r.latencyMs, notice: r.notice, ocrText: r.ocrText,
      orderable: false, publishable: true,
      onPublish: async () => {
        try {
          const p = await api(`/api/merchants/${merchantId}/menu/publish`, { method: 'POST', body: { scanId: r.scanId } });
          toast(`เพิ่มและแปลเมนู 6 ภาษา (${p.published} รายการ) สำเร็จ!`, 'ok');
          out.innerHTML = '<p class="notice">เผยแพร่เมนู 6 ภาษาเรียบร้อย — ดูรายการในตารางด้านขวา</p>';
          emit('data:reload');
          load();
        } catch (err) { toast(err.message, 'error'); }
      }
    });
  } catch (err) {
    out.innerHTML = `<p class="notice notice--warn">${esc(err.message)}</p>`;
  }
}

export function initMerchant() {
  document.getElementById('merchant-select')?.addEventListener('change', (e) => {
    merchantId = Number(e.target.value);
    seenOrders.clear();
    firstLoad = true;
    const scanOut = document.getElementById('merchant-scan-result');
    if (scanOut) scanOut.innerHTML = '';
    load();
  });

  // Sub-tabs navigation
  document.querySelectorAll('[data-m-tab]').forEach((btn) => {
    btn.addEventListener('click', () => selectMerchantTab(btn.dataset.mTab));
  });

  // Tab 1: Order status buttons
  document.getElementById('merchant-orders')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-advance]');
    if (b) advance(Number(b.dataset.advance), b.dataset.next, b);
  });

  // Tab 2: GPS & Shop status checker
  document.getElementById('merchant-gps-panel')?.addEventListener('click', (e) => {
    const stBtn = e.target.closest('[data-shop-status]');
    if (stBtn) {
      toggleShopStatus(stBtn.dataset.shopStatus, stBtn);
      return;
    }
    const prevBtn = e.target.closest('[data-preview-tourist]');
    if (prevBtn) {
      emit('navigate', {
        to: 'pin',
        result: { merchant: { id: Number(prevBtn.dataset.previewId), slug: prevBtn.dataset.previewTourist } }
      });
    }
  });

  // Tab 3: 1-click item toggle + AI menu scan
  document.getElementById('merchant-menu')?.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('[data-toggle-item]');
    if (toggleBtn) {
      toggleMenuItem(Number(toggleBtn.dataset.toggleItem), toggleBtn.dataset.nextAvail === '1', toggleBtn);
    }
  });
  document.getElementById('merchant-menu-file')?.addEventListener('change', (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) scanPaperMenu({ file: f });
  });
  document.getElementById('merchant-ai-preset')?.addEventListener('click', () => {
    scanPaperMenu({ preset: 'hoi-kha' });
  });

  on('payment:success', (r) => {
    const mId = r?.order?.breakdown?.merchantId || r?.merchant?.id || null;
    refreshMerchantData(mId);
  });
}
