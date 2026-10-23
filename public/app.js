// PHITLOK NEXUS v2.2 — Application Entry (Real-World Geospatial & Strict 3-Role Edition)
import { state, api, esc, tr, baht, num, on, emit, toast, openDialog, closeDialog, LANGS, langSwitcher, refreshIcons, svgFallbackUrl } from './js/core.js';
import { initMap, focusEntity, syncMerchants, refreshLabels, setMapFilter } from './js/map3d.js';
import { initLens, runHeritage, runMenuPreset, openMerchantMenu, speakGuide, selectTab } from './js/lens.js';
import { openCart, cartCount } from './js/menu.js';
import { startCheckout } from './js/payment.js';
import { initMerchant, populateMerchantSelect, startMerchantView, stopMerchantView, selectMerchantTab, refreshMerchantData } from './js/merchant.js';
import { initAdmin, startAdminView, stopAdminView, fetchMetrics, refreshAdminData } from './js/admin.js';

const CATEGORY_TH = {
  food: 'ร้านอาหารดังพิษณุโลก',
  cafe: 'คาเฟ่ / เครื่องดื่ม',
  souvenir: 'ของฝาก OTOP พิษณุโลก',
  tour: 'ทัวร์ / เรือนำเที่ยว',
  stay: 'โรงแรมที่พักชั้นนำ'
};

async function boot() {
  // Apply hash immediately on DOMContentLoaded so role/tab switches before async network/WebGL boot
  applyHash({ initial: true });
  window.addEventListener('hashchange', () => applyHash({ initial: false }));

  try {
    state.data = await api('/api/init-data');
  } catch (err) {
    document.getElementById('main').insertAdjacentHTML('afterbegin',
      `<div class="container"><p class="notice notice--warn">โหลดข้อมูลไม่สำเร็จ: ${esc(err.message)} <button class="btn btn--sm btn--primary" type="button" id="retry-boot">ลองใหม่</button></p></div>`);
    document.getElementById('retry-boot')?.addEventListener('click', () => location.reload());
    return;
  }

  renderStatic();
  renderVisitorBits();
  renderDirectoryCards();
  refreshHeroStats();
  initLens();
  initMerchant();
  initAdmin();
  bindGlobal();
  // Apply hash again now that state.data & controllers are ready
  applyHash({ initial: false });
  // Show Wat Yai card by default so judges immediately see real photo + GPS + Google Maps button
  const firstLm = state.data.landmarks[0];
  if (firstLm) renderMapCard({ kind: 'landmark', subKind: 'heritage', data: firstLm });
  await initMap({ onSelect: renderMapCard });
  refreshIcons();
}

// ------------------------------------------------------------------ static bits
function renderStatic() {
  const p = state.data.pricing;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('hero-vip-price', p.vipPassSatang / 100);
  set('vip-price', p.vipPassSatang / 100);
  set('vip-voucher-total', num(p.vipVoucherTotalSatang / 100));
  set('saas-price', p.saasMonthlySatang / 100);
  set('saas-price-btn', p.saasMonthlySatang / 100);
  const ai = state.data.ai;
  set('ai-badge', ai.configured ? `AI พร้อมใช้: Gemini (${ai.model})` : 'ฐานข้อมูลจริงกรมศิลปากร + โหมดสำรองความแม่นยำสูง');
  populateMenuMerchantSelect();
  populateMerchantSelect();
}

function populateMenuMerchantSelect() {
  const sel = document.getElementById('menu-merchant');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = state.data.merchants.map((m) => `<option value="${m.id}">${esc(m.name.th)}</option>`).join('');
  if (current) sel.value = current;
}

async function refreshHeroStats() {
  const slots = ['hero-merchants', 'hero-vip', 'hero-orders', 'hero-scans'].map((id) => document.getElementById(id));
  if (!slots.some(Boolean)) return;
  try {
    const m = await fetchMetrics();
    const values = [m.totals.saas.activeMerchants, m.totals.vip.passesSold, m.totals.orders.count, m.counters.heritageScans];
    slots.forEach((el, i) => { if (el) el.textContent = num(values[i]); });
  } catch { /* ignore */ }
}

function applyHash({ initial = false } = {}) {
  const hash = location.hash.slice(1);
  if (!hash) return;
  if (hash === 'merchant' || hash === 'admin' || hash === 'tourist') {
    setRole(hash, { skipDataLoad: initial && !state.data });
    return;
  }
  if (hash === 'lens-menu') {
    setRoleIfNeeded('tourist');
    selectTab('menu');
    document.getElementById('lens')?.scrollIntoView({ block: 'start' });
    if (state.data && !document.querySelector('#menu-result .menu-list')) {
      runMenuPreset();
    }
    return;
  }
  if (hash === 'lens') {
    setRoleIfNeeded('tourist');
    selectTab('heritage');
    document.getElementById('lens')?.scrollIntoView({ block: 'start' });
    if (state.data && !document.querySelector('#heritage-result .heritage-body')) {
      runHeritage({ preset: 'wat-yai' });
    }
    return;
  }
  if (['map', 'directory', 'vip', 'for-merchants'].includes(hash)) {
    setRoleIfNeeded('tourist');
    document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  }
}

function renderVisitorBits() {
  const v = state.data.visitor;
  const active = v.coupons.filter((c) => c.status === 'active').length;
  const wc = document.getElementById('wallet-count');
  const cc = document.getElementById('cart-count');
  if (wc) wc.textContent = active;
  if (cc) cc.textContent = cartCount();
  const box = document.getElementById('vip-action');
  if (!box) return;
  if (v.vip.active) {
    box.innerHTML = `<div class="vip-status"><p><b>✓ คุณถือบัตร Phitsanulok VIP Pass แล้ว</b></p>
      <p class="small">ใช้ได้ถึง ${new Date(v.vip.until).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      <button class="btn btn--gold btn--block" type="button" data-open-wallet>ดูคูปองของฉัน (${active})</button></div>`;
  } else {
    box.innerHTML = `<button class="btn btn--gold btn--lg btn--block" type="button" data-buy-vip>ซื้อ Phitsanulok VIP Pass ${baht(state.data.pricing.vipPassSatang)} (QR PromptPay)</button>
      <p class="small">ชำระครั้งเดียวต่อทริป ปลดล็อกเสียงบรรยาย 6 ภาษาฉบับเต็ม + คูปองส่วนลด 500฿</p>`;
  }
}

// ------------------------------------------------------------------ Location Detail Card (Real Photo + GPS + Google Maps / Earth 3D)
function renderMapCard(ent) {
  const card = document.getElementById('map-card');
  if (!card || !ent) return;
  const lang = state.lang;
  if (ent.kind === 'landmark') {
    const lm = ent.data;
    const nearby = state.data.merchants.filter((m) => m.nearest === lm.id).slice(0, 4);
    const gmapsUrl = lm.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lm.lat},${lm.lng}`;
    const satUrl = `https://www.google.com/maps/@?api=1&map_action=map&center=${lm.lat},${lm.lng}&zoom=18&basemap=satellite`;
    const gearthUrl = lm.googleEarthUrl || `https://earth.google.com/web/search/${lm.lat},${lm.lng}`;
    const imgUrl = lm.imageUrl || lm.fallbackImage || '/assets/photos/wat-yai.jpg';
    const fallback = lm.fallbackImage || '/assets/photos/wat-yai.jpg';
    const svgFb = svgFallbackUrl(tr(lm.name, lang));

    card.innerHTML = `
      <div class="map-card__media">
        <img src="${esc(imgUrl)}"
             data-fallback="${esc(fallback)}"
             onerror="this.onerror=null;this.src='${esc(svgFb)}'"
             alt="${esc(tr(lm.name, lang))}" loading="lazy">
        <span class="map-card__badge map-card__badge--gold">โบราณสถาน · พ.ศ. ${esc(lm.builtYearBe || '-')}</span>
      </div>
      <div class="map-card__header-row">
        <a class="kicker kicker--link" href="/credits#sources" title="คลิกดูรายละเอียดแหล่งอ้างอิงทะเบียนโบราณสถาน กรมศิลปากร">
          <i data-lucide="shield-check"></i> อ้างอิงข้อมูล: กรมศิลปากร ↗
        </a>
        ${langSwitcher(lang, 'card-lang')}
      </div>
      <h3 lang="${lang}">${esc(tr(lm.name, lang))}</h3>
      <p lang="${lang}">${esc(tr(lm.summary, lang))}</p>

      <div class="gps-proof-box">
        <div class="gps-proof-box__coords">
          <i data-lucide="map-pin"></i>
          <div>
            <span class="small muted">พิกัด GPS จริง (คลิกเพื่อเปิดแผนที่ดาวเทียม):</span>
            <a class="gps-link" href="${esc(satUrl)}" target="_blank" rel="noopener">
              <code>GPS: ${lm.lat.toFixed(4)}, ${lm.lng.toFixed(4)} ↗</code>
            </a>
          </div>
        </div>
        <div class="gps-proof-box__links">
          <a class="btn btn--outline btn--sm btn--block" href="${esc(gmapsUrl)}" target="_blank" rel="noopener">
            <i data-lucide="globe"></i> เปิดดูสถานที่จริงบน Google Maps / Google Earth 3D
          </a>
          <a class="btn btn--ghost btn--sm btn--block" href="${esc(gearthUrl)}" target="_blank" rel="noopener">
            <i data-lucide="compass"></i> เปิดมุมมองดาวเทียม Google Earth 3D ↗
          </a>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn--primary" type="button" data-scan="${lm.id}">
          <i data-lucide="scan-line"></i> ส่องป้าย &amp; ประวัติ 6 ภาษา
        </button>
        <button class="btn btn--outline" type="button" data-speak="${lm.id}">
          <i data-lucide="volume-2"></i> ▶ ฟังเสียงบรรยาย (${esc(lang.toUpperCase())})
        </button>
        <div class="soundwave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      </div>
      ${nearby.length ? `<p class="mt small"><b>ร้านอาหารและโรงแรมใกล้เคียง:</b></p>
      <div class="nearby">${nearby.map((m) => `<button class="btn btn--ghost btn--sm btn--list" type="button" data-focus-merchant="${esc(m.slug)}">
        <i data-lucide="${m.kind === 'hotel' ? 'building-2' : 'utensils'}"></i> ${esc(m.name.th.split(' (')[0])} · ${num(m.distanceM)} ม.
      </button>`).join('')}</div>` : ''}`;
  } else {
    const m = ent.data;
    const isHotel = m.kind === 'hotel' || m.category === 'stay';
    const lm = state.data.landmarks.find((l) => l.id === m.nearest);
    const items = state.data.menuItems.filter((i) => i.merchantId === m.id);
    const gmapsUrl = m.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`;
    const satUrl = `https://www.google.com/maps/@?api=1&map_action=map&center=${m.lat},${m.lng}&zoom=18&basemap=satellite`;
    const gearthUrl = m.googleEarthUrl || `https://earth.google.com/web/search/${m.lat},${m.lng}`;
    const imgUrl = m.imageUrl || m.fallbackImage || '/assets/photos/noodles-tomyum.jpg';
    const fallback = m.fallbackImage || '/assets/photos/noodles-tomyum.jpg';
    const svgFb = svgFallbackUrl(tr(m.name, lang));

    const isDemoPartner = m.partnerStatus !== 'confirmed';
    const partnerBadgeText = isDemoPartner ? 'ยังไม่ใช่พาร์ทเนอร์ · ข้อมูลสาธิต' : 'พาร์ทเนอร์ที่ยืนยันแล้ว';
    const sampleLabel = isHotel ? 'ราคาตัวอย่าง' : 'เมนูตัวอย่าง / ราคาตัวอย่าง';

    card.innerHTML = `
      <div class="map-card__media">
        <img src="${esc(imgUrl)}"
             data-fallback="${esc(fallback)}"
             onerror="this.onerror=null;this.src='${esc(svgFb)}'"
             alt="${esc(tr(m.name, lang))}" loading="lazy">
        <span class="map-card__badge ${isHotel ? 'map-card__badge--blue' : 'map-card__badge--emerald'}">
          ${isHotel ? 'ที่พักบนแผนที่' : 'สถานที่บนแผนที่'}
        </span>
      </div>
      <div class="map-card__header-row">
        <div class="badges">
          <span class="badge badge--warn">${partnerBadgeText}</span>
          <span class="badge badge--gold">${sampleLabel}</span>
        </div>
        ${langSwitcher(lang, 'card-lang')}
      </div>
      <h3 lang="${lang}">${esc(tr(m.name, lang))}</h3>
      <p lang="${lang}">${esc(tr(m.blurb, lang))}</p>

      <div class="gps-proof-box">
        <div class="gps-proof-box__coords">
          <i data-lucide="map-pin"></i>
          <div>
            <span class="small muted">พิกัด GPS จริง (คลิกเพื่อเปิดแผนที่ดาวเทียม):</span>
            <a class="gps-link" href="${esc(satUrl)}" target="_blank" rel="noopener">
              <code>GPS: ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)} ↗</code>
            </a>
          </div>
        </div>
        <div class="gps-proof-box__links">
          <a class="btn btn--outline btn--sm btn--block" href="${esc(gmapsUrl)}" target="_blank" rel="noopener">
            <i data-lucide="globe"></i> เปิดดูสถานที่จริงบน Google Maps / Google Earth 3D
          </a>
          <a class="btn btn--ghost btn--sm btn--block" href="${esc(gearthUrl)}" target="_blank" rel="noopener">
            <i data-lucide="compass"></i> เปิดมุมมองดาวเทียม Google Earth 3D ↗
          </a>
        </div>
      </div>

      <ul class="meta-list">
        <li>${esc(CATEGORY_TH[m.category] || m.category)}</li>
        <li>${m.shopStatus === 'busy' ? '🟠 คิวเต็มชั่วคราว' : '🟢 เปิดรับลูกค้า'}</li>
        <li>ห่างจาก${esc(lm ? lm.name.th.split(' (')[0] : 'โบราณสถาน')} ${num(m.distanceM)} ม.</li>
        ${items.length ? `<li>รองรับ 6 ภาษา (${items.length} รายการ)</li>` : ''}
      </ul>
      <div class="actions">
        ${items.length
          ? `<button class="btn btn--primary btn--block" type="button" data-menu="${m.id}">
              <i data-lucide="${isHotel ? 'calendar-check' : 'shopping-bag'}"></i>
              ${isHotel ? 'ดูห้องพัก & จองโรงแรม (6 ภาษา)' : 'ดูเมนู 6 ภาษา & สั่งอาหารล่วงหน้า'}
            </button>`
          : `<p class="muted small">ยังไม่มีรายการดิจิทัล</p>`}
        ${lm ? `<button class="btn btn--outline btn--sm btn--block" type="button" data-focus-landmark="${lm.id}">ดูโบราณสถานใกล้เคียง (${esc(lm.name.th.split(' (')[0])})</button>` : ''}
      </div>`;
  }
  refreshIcons();
}

// ------------------------------------------------------------------ Directory of 13 Real Locations (5 Heritage + 5 Restaurants + 3 Hotels)
function renderDirectoryCards() {
  const box = document.getElementById('directory-grid');
  if (!box || !state.data) return;
  const lang = state.lang;

  const heritageCards = state.data.landmarks.map((lm) => {
    const gmaps = lm.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lm.lat},${lm.lng}`;
    const satUrl = `https://www.google.com/maps/@?api=1&map_action=map&center=${lm.lat},${lm.lng}&zoom=18&basemap=satellite`;
    const svgFb = svgFallbackUrl(tr(lm.name, lang));
    return `<article class="dir-card dir-card--heritage" data-dir-cat="heritage">
      <div class="dir-card__img-wrap">
        <img src="${esc(lm.imageUrl || lm.fallbackImage)}"
             data-fallback="${esc(lm.fallbackImage)}"
             onerror="this.onerror=null;this.src='${esc(svgFb)}'"
             alt="${esc(tr(lm.name, lang))}" loading="lazy">
        <span class="dir-card__tag dir-card__tag--gold">โบราณสถาน · พ.ศ. ${esc(lm.builtYearBe)}</span>
      </div>
      <div class="dir-card__body">
        <a class="dir-card__gps dir-card__gps--link" href="${esc(satUrl)}" target="_blank" rel="noopener" title="คลิกเปิดดูพิกัดจริงบน Google Maps Satellite">
          <i data-lucide="map-pin"></i> <b>GPS: <code>${lm.lat.toFixed(4)}, ${lm.lng.toFixed(4)}</code> ↗</b>
        </a>
        <h3 lang="${lang}">${esc(tr(lm.name, lang))}</h3>
        <p class="muted small" lang="${lang}">${esc(tr(lm.summary, lang))}</p>
        <a class="dir-card__ref dir-card__ref--link" href="/credits#sources" title="คลิกดูรายละเอียดทะเบียนโบราณสถาน กรมศิลปากร">
          <i data-lucide="book-open-check"></i> อ้างอิงข้อมูล: กรมศิลปากร ↗
        </a>
        <div class="dir-card__actions">
          <button class="btn btn--primary btn--sm" type="button" data-dir-scan="${lm.id}">
            <i data-lucide="volume-2"></i> เสียงบรรยาย 6 ภาษา
          </button>
          <button class="btn btn--outline btn--sm" type="button" data-dir-focus="landmark:${lm.id}">
            <i data-lucide="box"></i> ดูบนแผนที่ 3D
          </button>
          <a class="btn btn--ghost btn--sm" href="${esc(gmaps)}" target="_blank" rel="noopener">
            <i data-lucide="external-link"></i> Google Maps
          </a>
        </div>
      </div>
    </article>`;
  });

  const merchantCards = state.data.merchants.map((m) => {
    const isHotel = m.kind === 'hotel' || m.category === 'stay';
    const gmaps = m.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`;
    const satUrl = `https://www.google.com/maps/@?api=1&map_action=map&center=${m.lat},${m.lng}&zoom=18&basemap=satellite`;
    const items = state.data.menuItems.filter((i) => i.merchantId === m.id);
    const minPrice = items.length ? Math.min(...items.map((i) => i.priceSatang)) : m.roomRateSatang || 5000;
    const svgFb = svgFallbackUrl(tr(m.name, lang));
    const isDemoPartner = m.partnerStatus !== 'confirmed';
    return `<article class="dir-card dir-card--${isHotel ? 'hotel' : 'restaurant'}" data-dir-cat="${isHotel ? 'hotel' : 'restaurant'}">
      <div class="dir-card__img-wrap">
        <img src="${esc(m.imageUrl || m.fallbackImage)}"
             data-fallback="${esc(m.fallbackImage)}"
             onerror="this.onerror=null;this.src='${esc(svgFb)}'"
             alt="${esc(tr(m.name, lang))}" loading="lazy">
        <span class="dir-card__tag ${isHotel ? 'dir-card__tag--blue' : 'dir-card__tag--emerald'}">
          ${isHotel ? `ที่พัก · ราคาตัวอย่าง ${baht(minPrice)}` : `ร้านค้า · เมนูตัวอย่าง ${baht(minPrice)}`}
        </span>
      </div>
      <div class="dir-card__body">
        <a class="dir-card__gps dir-card__gps--link" href="${esc(satUrl)}" target="_blank" rel="noopener" title="คลิกเปิดดูพิกัดจริงบน Google Maps Satellite">
          <i data-lucide="map-pin"></i> <b>GPS: <code>${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</code> ↗</b>
        </a>
        <div class="badges" style="margin:4px 0">
          <span class="badge badge--warn">${isDemoPartner ? 'ยังไม่ใช่พาร์ทเนอร์ · ข้อมูลสาธิต' : 'พาร์ทเนอร์ที่ยืนยันแล้ว'}</span>
          <span class="badge badge--gold">${isHotel ? 'ราคาตัวอย่าง' : 'เมนูตัวอย่าง / ราคาตัวอย่าง'}</span>
        </div>
        <h3 lang="${lang}">${esc(tr(m.name, lang))}</h3>
        <p class="muted small" lang="${lang}">${esc(tr(m.blurb, lang))}</p>
        <a class="dir-card__ref dir-card__ref--link" href="${esc(gmaps)}" target="_blank" rel="noopener">
          <i data-lucide="external-link"></i> ดูหน้าร้านใน Google Maps · ${m.shopStatus === 'busy' ? 'คิวเต็มชั่วคราว' : 'เปิดรับลูกค้า'} ↗
        </a>
        <div class="dir-card__actions">
          <button class="btn btn--primary btn--sm" type="button" data-dir-menu="${m.id}">
            <i data-lucide="${isHotel ? 'calendar' : 'utensils'}"></i> ${isHotel ? 'จองห้องพัก' : 'สั่งอาหาร 6 ภาษา'}
          </button>
          <button class="btn btn--outline btn--sm" type="button" data-dir-focus="merchant:${m.slug}">
            <i data-lucide="box"></i> ดูบนแผนที่ 3D
          </button>
          <a class="btn btn--ghost btn--sm" href="${esc(gmaps)}" target="_blank" rel="noopener">
            <i data-lucide="external-link"></i> Google Maps
          </a>
        </div>
      </div>
    </article>`;
  });

  box.innerHTML = [...heritageCards, ...merchantCards].join('');
  refreshIcons();
}

// ------------------------------------------------------------------ Strict 3-Role Switcher
function setRole(role, { skipDataLoad = false } = {}) {
  state.role = role;
  document.querySelectorAll('[data-role]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.view !== role; });
  document.querySelectorAll('[data-role-nav]').forEach((nav) => { nav.hidden = nav.dataset.roleNav !== role; });

  const touristActions = document.getElementById('tourist-top-actions');
  if (touristActions) touristActions.hidden = role !== 'tourist';

  if (skipDataLoad) return;
  stopMerchantView();
  stopAdminView();
  if (role === 'merchant') startMerchantView();
  if (role === 'admin') startAdminView();
  if (role === 'tourist') refreshHeroStats();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshIcons();
}

// ------------------------------------------------------------------ wallet
function openWallet() {
  const v = state.data.visitor;
  const body = document.getElementById('wallet-body');
  const stamps = state.data.landmarks;
  body.innerHTML = `
    <div class="dialog__head"><h2 id="wallet-title">กระเป๋าคูปอง &amp; ตราประทับมรดกพิษณุโลก</h2><button class="btn btn--icon btn--ghost" type="button" data-close aria-label="ปิด">✕</button></div>
    <p><b>ตราประทับ 5 โบราณสถานพิษณุโลก</b></p>
    <div class="actions">${stamps.map((l) => {
      const got = v.stamps.some((s) => s.landmarkId === l.id);
      return `<span class="badge ${got ? 'badge--ok' : ''}">${got ? '✓' : '○'} ${esc(l.name.th.split(' (')[0])}</span>`;
    }).join(' ')}</div>
    <p class="mt"><b>คูปองส่วนลดของฉัน</b></p>
    ${v.coupons.length ? v.coupons.map((c) => `<div class="coupon-card${c.status !== 'active' ? ' coupon-card--used' : ''}">
      <span>${esc(tr(c.merchantName, 'th'))}<br><small>${c.kind === 'percent' ? `ลด ${c.value}%` : `ลด ${baht(c.value)}`}${c.minSpendSatang ? ` · ขั้นต่ำ ${baht(c.minSpendSatang)}` : ''} · ${c.source === 'vip_pass' ? 'VIP Pass' : 'ตราประทับมรดก'}${c.status !== 'active' ? ' · ใช้แล้ว' : ''}</small></span>
      ${c.status === 'active' ? `<button class="btn btn--sm btn--primary" type="button" data-use="${c.merchantId}">ใช้คูปอง</button>` : `<code>${esc(c.code)}</code>`}
    </div>`).join('') : `<p class="muted">ยังไม่มีคูปอง — กดส่องป้ายโบราณสถาน หรือซื้อบัตร Phitsanulok VIP Pass (99฿)</p>
      <button class="btn btn--primary" type="button" data-scan-now>ทดลองส่องป้ายวัดใหญ่</button>`}`;
  body.onclick = (e) => {
    if (e.target.closest('[data-close]')) { closeDialog('wallet-dialog'); return; }
    const use = e.target.closest('[data-use]');
    if (use) { closeDialog('wallet-dialog'); setRoleIfNeeded('tourist'); openMerchantMenu(use.dataset.use); return; }
    if (e.target.closest('[data-scan-now]')) { closeDialog('wallet-dialog'); goScan('wat-yai'); }
  };
  openDialog('wallet-dialog');
}

function setRoleIfNeeded(role) { if (state.role !== role) setRole(role); }

function goScan(id) {
  setRoleIfNeeded('tourist');
  selectTab('heritage');
  document.getElementById('lens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  runHeritage({ preset: id });
}

async function reloadData() {
  const fresh = await api('/api/init-data');
  state.data = fresh;
  populateMenuMerchantSelect();
  populateMerchantSelect();
  renderVisitorBits();
  renderDirectoryCards();
  return fresh;
}

// ------------------------------------------------------------------ wiring
function bindGlobal() {
  document.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)));

  // Role-specific sub-nav shortcuts for Merchant Portal
  document.querySelectorAll('[data-jump-m-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setRoleIfNeeded('merchant');
      selectMerchantTab(btn.dataset.jumpMTab);
    });
  });

  // Map Category Filter Buttons ([ทั้งหมด], [5 โบราณสถาน], [5 ร้านอาหารดัง], [3 โรงแรมที่พัก])
  document.querySelectorAll('[data-map-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.mapFilter;
      document.querySelectorAll('[data-map-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      setMapFilter(f);
      // Also filter directory cards if user scrolls down
      document.querySelectorAll('[data-dir-cat]').forEach((card) => {
        card.hidden = f !== 'all' && card.dataset.dirCat !== f;
      });
    });
  });

  document.querySelector('.map-shortcuts')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-focus]');
    if (b) focusEntity(b.dataset.focus);
  });

  document.getElementById('map-card')?.addEventListener('click', (e) => {
    const langBtn = e.target.closest('[data-card-lang]');
    if (langBtn) { state.lang = langBtn.dataset.cardLang; emit('lang:changed', state.lang); return; }
    const scan = e.target.closest('[data-scan]');
    if (scan) { goScan(scan.dataset.scan); return; }
    const speak = e.target.closest('[data-speak]');
    if (speak) { speakGuide(speak.dataset.speak, 'summary', state.lang, null); return; }
    const fm = e.target.closest('[data-focus-merchant]');
    if (fm) { focusEntity(`merchant:${fm.dataset.focusMerchant}`); return; }
    const fl = e.target.closest('[data-focus-landmark]');
    if (fl) { focusEntity(`landmark:${fl.dataset.focusLandmark}`); return; }
    const menu = e.target.closest('[data-menu]');
    if (menu) openMerchantMenu(menu.dataset.menu);
  });

  document.getElementById('directory-grid')?.addEventListener('click', (e) => {
    const scan = e.target.closest('[data-dir-scan]');
    if (scan) { goScan(scan.dataset.dirScan); return; }
    const menu = e.target.closest('[data-dir-menu]');
    if (menu) { openMerchantMenu(menu.dataset.dirMenu); return; }
    const focus = e.target.closest('[data-dir-focus]');
    if (focus) {
      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => focusEntity(focus.dataset.dirFocus), 300);
    }
  });

  document.getElementById('open-wallet')?.addEventListener('click', openWallet);
  document.getElementById('open-cart')?.addEventListener('click', openCart);
  document.getElementById('vip-card')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-buy-vip]')) startCheckout({ type: 'vip_pass' });
    if (e.target.closest('[data-open-wallet]')) openWallet();
  });

  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  const form = document.getElementById('saas-form');
  const catSelect = document.getElementById('f-category');
  catSelect?.addEventListener('change', () => {
    const isHotel = catSelect.value === 'stay';
    const priceSpan = document.getElementById('saas-price-btn');
    if (priceSpan) priceSpan.textContent = isHotel ? '499' : '199';
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldErrors();
    const f = new FormData(form);
    const category = String(f.get('category') || 'food');
    const isHotel = category === 'stay';
    const merchant = {
      shopName: String(f.get('shopName') || ''),
      ownerName: String(f.get('ownerName') || ''),
      phone: String(f.get('phone') || ''),
      category,
      nearest: String(f.get('nearest') || 'wat-yai'),
      pdpaConsent: document.getElementById('f-pdpa').checked,
      marketingConsent: document.getElementById('f-marketing').checked
    };
    const errors = {};
    if (merchant.shopName.trim().length < 2) errors.shopName = 'กรุณากรอกชื่อร้านหรือโรงแรม (อย่างน้อย 2 ตัวอักษร)';
    if (merchant.ownerName.trim().length < 2) errors.ownerName = 'กรุณากรอกชื่อผู้ติดต่อ';
    if (!/^0\d{8,9}$/.test(merchant.phone.replace(/[\s-]/g, ''))) errors.phone = 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก';
    if (!merchant.pdpaConsent) errors.pdpaConsent = 'ต้องยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนสมัคร';
    if (Object.keys(errors).length) { showFieldErrors(errors); return; }
    startCheckout({ type: isHotel ? 'hotel_saas' : 'saas', merchant });
  });

  on('checkout:field-errors', showFieldErrors);
  on('wallet:open', openWallet);
  on('vip:prompt', () => {
    setRoleIfNeeded('tourist');
    document.getElementById('vip')?.scrollIntoView({ behavior: 'smooth' });
  });
  on('cart:changed', () => {
    const cc = document.getElementById('cart-count');
    if (cc) cc.textContent = cartCount();
  });
  on('visitor:updated', (v) => {
    state.data.visitor = v;
    renderVisitorBits();
  });
  on('lang:changed', () => {
    refreshLabels();
    renderDirectoryCards();
    const active = document.querySelector('.map-label--active');
    if (active) active.click();
    else if (state.data?.landmarks?.[0]) renderMapCard({ kind: 'landmark', subKind: 'heritage', data: state.data.landmarks[0] });
  });
  on('data:reload', () => reloadData().catch(() => {}));

  on('payment:success', async (r) => {
    if (r.visitor) state.data.visitor = r.visitor;
    if (r.type === 'saas' || r.type === 'hotel_saas') {
      form?.reset();
      const fresh = await reloadData();
      syncMerchants(fresh.merchants, r.merchant.id);
    } else {
      renderVisitorBits();
    }
    emit('visitor:changed');
    refreshHeroStats();
    // Immediately sync Merchant Portal & Executive Admin Console without page reload
    const mId = r.order?.breakdown?.merchantId || r.merchant?.id || null;
    refreshMerchantData(mId).catch(() => {});
    refreshAdminData().catch(() => {});
    toast(r.type === 'order' ? `ชำระเงินสำเร็จ — ส่งออเดอร์ ${r.order.orderNo} เข้าหน้าจอร้านค้าแล้ว` : 'ชำระเงินสำเร็จ — อัปเดตยอดรายได้แบบเรียลไทม์แล้ว', 'ok');
  });

  on('navigate', ({ to, result }) => {
    if (to === 'merchant') {
      setRole('merchant');
      const mId = result.order && result.order.breakdown.merchantId;
      if (mId) startMerchantView(mId);
    }
    if (to === 'lens') { setRoleIfNeeded('tourist'); document.getElementById('lens')?.scrollIntoView({ behavior: 'smooth' }); }
    if (to === 'pin') {
      setRoleIfNeeded('tourist');
      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        focusEntity(`merchant:${result.merchant.slug}`);
        if (result.merchant.id) openMerchantMenu(result.merchant.id);
      }, 350);
    }
  });
}

function clearFieldErrors() {
  document.querySelectorAll('#saas-form .field__error').forEach((p) => { p.textContent = ''; });
  document.querySelectorAll('#saas-form [aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
}

function showFieldErrors(errors) {
  const map = { shopName: 'f-shop', ownerName: 'f-owner', phone: 'f-phone', category: 'f-category', nearest: 'f-nearest', pdpaConsent: 'f-pdpa' };
  let first = null;
  for (const [k, msg] of Object.entries(errors)) {
    const p = document.getElementById(`err-${k}`);
    if (p) p.textContent = msg;
    const input = document.getElementById(map[k]);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `err-${k}`);
      first = first || input;
    }
  }
  if (first) first.focus();
}

boot();
