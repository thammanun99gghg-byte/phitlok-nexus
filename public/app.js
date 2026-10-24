// PHITLOK NEXUS v2.3 — Application Entry (Real-World Geospatial & Strict 3-Role Edition)
import { state, api, esc, tr, baht, num, on, emit, toast, openDialog, closeDialog, LANGS, langSwitcher, refreshIcons, svgFallbackUrl, shortLabel } from './js/core.js';
import { initMap, focusEntity, syncMerchants, refreshLabels, setMapLayers, merchantLayer, setMapLabelsVisible, areMapLabelsVisible, showProvince, showCity, getMapMode } from './js/map3d.js';
import { DISTRICT_LIST, districtName, placesByDistrict } from './js/province3d.js';
import { isVipActive, setVipActive, syncVipHeaderButtons, openVipUpgradeModal, setLang } from './js/site.js';
import { t, applyStatic, builtYear, errText, locale } from './js/i18n.js';
import { initLens, runHeritage, runMenuPreset, openMerchantMenu, speakGuide, selectTab } from './js/lens.js';
import { openCart, cartCount } from './js/menu.js';
import { startCheckout } from './js/payment.js';
import { initMerchant, populateMerchantSelect, startMerchantView, stopMerchantView, refreshMerchantData } from './js/merchant.js';
import { initAdmin, startAdminView, stopAdminView, fetchMetrics, refreshAdminData } from './js/admin.js';

// Category word for a shop or hotel, in the visitor's language.
const CATEGORY_KEY = { food: 'cat.restaurant', cafe: 'cat.cafe', souvenir: 'cat.souvenir', tour: 'cat.tour', stay: 'cat.hotel' };
const catName = (m) => t(CATEGORY_KEY[m.category] || (m.kind === 'hotel' ? 'cat.hotel' : 'cat.restaurant'));
const distanceText = (metres) => `${num(metres)} ${t('unit.m')}`;

async function boot() {
  applyLanguageChrome();
  bindLanguagePicker();
  // Apply hash immediately on DOMContentLoaded so role/tab switches before async network/WebGL boot
  applyHash({ initial: true });
  window.addEventListener('hashchange', () => applyHash({ initial: false }));

  try {
    state.data = await api('/api/init-data');
  } catch (err) {
    document.getElementById('main').insertAdjacentHTML('afterbegin',
      `<div class="container"><p class="notice notice--warn">${esc(t('err.boot'))}: ${esc(errText(err))} <button class="btn btn--sm btn--primary" type="button" id="retry-boot">${esc(t('retry'))}</button></p></div>`);
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
  await initMap({ onSelect: renderMapCard, onDistrict: renderDistrictCard, onMode: syncViewSwitch });
  refreshIcons();
}

// ------------------------------------------------------------------ static bits
function renderStatic() {
  const p = state.data.pricing;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('hero-vip-price', p.vipPassSatang / 100);
  set('vip-price', p.vipPassSatang / 100);
  set('saas-price', p.saasMonthlySatang / 100);
  set('saas-price-btn', p.saasMonthlySatang / 100);
  // Only claim AI when a model is actually configured on the server.
  const badge = document.getElementById('ai-badge');
  if (badge) { badge.hidden = !state.data.ai.configured; badge.textContent = `● ${t('lens.ai')}`; }
  populateMenuMerchantSelect();
  populateMerchantSelect();
}

function populateMenuMerchantSelect() {
  const sel = document.getElementById('menu-merchant');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = state.data.merchants.map((m) => `<option value="${m.id}">${esc(tr(m.name))}</option>`).join('');
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
  if (hash === 'for-merchants' || hash === 'signup') {
    openSignup();
    return;
  }
  if (['map', 'directory', 'vip'].includes(hash)) {
    setRoleIfNeeded('tourist');
    document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  }
}

// Count badges on the icon buttons stay hidden at zero so the bar is not cluttered with "0".
function setCount(el, n) {
  if (!el) return;
  el.textContent = n;
  el.hidden = !n;
  const btn = el.closest('button');
  if (btn) btn.setAttribute('aria-label', `${t(btn.id === 'open-cart' ? 'aria.cart' : 'aria.wallet')} (${n})`);
}

function renderVisitorBits() {
  const v = state.data.visitor;
  renderProgress();
  if (v.vip.active) setVipActive(true);
  else syncVipHeaderButtons();
  const vipActiveNow = v.vip.active || isVipActive();
  const active = v.coupons.filter((c) => c.status === 'active').length;
  const wc = document.getElementById('wallet-count');
  const cc = document.getElementById('cart-count');
  setCount(wc, active);
  setCount(cc, cartCount());
  const vipTitle = document.getElementById('vip-title');
  if (vipTitle) vipTitle.textContent = t('vip.title', { v: baht(state.data.pricing.vipVoucherTotalSatang) });
  const box = document.getElementById('vip-action');
  if (!box) return;
  if (vipActiveNow) {
    const until = v.vip.until ? new Date(v.vip.until).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    box.innerHTML = `<div class="vip-status">${until ? `<p><b>${esc(t('vip.active', { d: until }))}</b></p>` : ''}
      <button class="btn btn--gold btn--block" type="button" data-open-wallet>${esc(t('vip.coupons', { n: active }))}</button></div>`;
  } else {
    box.innerHTML = `<button class="btn btn--vip-cta btn--lg btn--block" type="button" data-open-vip-modal>${esc(t('vip.buy'))}</button>`;
  }
}

// ------------------------------------------------------------------ province view: district card, progress, view switch
let currentDistrict = null;

function renderDistrictCard(id) {
  const card = document.getElementById('map-card');
  const d = DISTRICT_LIST.find((x) => x.id === id);
  if (!card || !d) return;
  currentDistrict = id;
  const places = placesByDistrict()[id];
  const item = (p) => {
    const attr = p.key.startsWith('landmark:') ? `data-focus-landmark="${esc(p.data.id)}"` : `data-focus-merchant="${esc(p.data.slug)}"`;
    return `<li><button class="btn btn--outline btn--block" type="button" ${attr}>${esc(tr(p.data.name))}</button></li>`;
  };
  card.innerHTML = `<p class="kicker">${esc(t('prov.kicker'))}</p>
    <h3>${esc(districtName(d))}</h3>
    <p class="muted">${esc(state.lang === 'th' ? d.en : d.th)}</p>
    ${places.length ? `<p><b>${esc(t('prov.places', { n: places.length }))}</b></p>
      ${id === 'mueang' ? `<button class="btn btn--primary btn--block" type="button" data-open-city>${esc(t('prov.openCity'))}</button>` : ''}
      <ul class="district-places">${places.map(item).join('')}</ul>`
      : `<p class="muted">${esc(t('prov.none'))}</p>`}
    <p class="fineprint">${esc(t('prov.source'))}</p>`;
}

// Real numbers only: stamps this visitor has collected and how the demo's places spread over the 9 districts.
function renderProgress() {
  const el = document.getElementById('map-progress');
  if (!el || !state.data) return;
  const v = state.data.visitor;
  const total = state.data.landmarks.length;
  const got = new Set(v.stamps.map((st) => st.landmarkId)).size;
  const byDistrict = Object.values(placesByDistrict());
  const places = byDistrict.reduce((a, l) => a + l.length, 0);
  const covered = byDistrict.filter((l) => l.length).length;
  const stamps = t('hud.stamps', { n: got, t: total });
  el.innerHTML = `<p class="map-progress__title">${esc(t('hud.title'))}${v.vip.active ? ` <span class="map-progress__vip">👑 ${esc(t('hud.vip'))}</span>` : ''}</p>
    <p class="map-progress__row"><b>${esc(stamps)}</b></p>
    <div class="map-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${got}" aria-label="${esc(stamps)}"><span></span></div>
    <p class="map-progress__row">${esc(t('hud.places', { n: places, d: covered }))}</p>
    ${got < total ? `<button class="map-progress__cta" type="button" data-progress-scan>${esc(t('hud.scan'))}</button>` : ''}`;
  el.querySelector('.map-progress__bar span').style.width = `${total ? Math.round((got / total) * 100) : 0}%`;
}

function syncViewSwitch(mode) {
  document.querySelectorAll('[data-map-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mapView === mode)));
}

// ------------------------------------------------------------------ Location Detail Card (Real Photo + GPS + Google Maps / Earth 3D)
function renderMapCard(ent) {
  const card = document.getElementById('map-card');
  if (!card || !ent) return;
  currentDistrict = null;
  const lang = state.lang;
  const d = ent.data;
  const gmapsUrl = d.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`;
  const gearthUrl = d.googleEarthUrl || `https://earth.google.com/web/search/${d.lat},${d.lng}`;
  const svgFb = svgFallbackUrl(shortLabel(d, lang));
  // Coordinates and map links live under "details" so the card stays short (v2.4 X1).
  const details = `<details class="map-card__details">
      <summary>${esc(t('card.details'))}</summary>
      <p class="small">${esc(t('card.gps'))}: <code>${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}</code></p>
      <div class="actions">
        <a class="btn btn--outline btn--sm" href="${esc(gmapsUrl)}" target="_blank" rel="noopener"><i data-lucide="map-pin"></i> ${esc(t('card.gmaps'))}</a>
        <a class="btn btn--ghost btn--sm" href="${esc(gearthUrl)}" target="_blank" rel="noopener"><i data-lucide="globe"></i> ${esc(t('card.gearth'))}</a>
      </div>
    </details>`;

  if (ent.kind === 'landmark') {
    const lm = d;
    const nearby = state.data.merchants.filter((m) => m.nearest === lm.id).slice(0, 4);
    card.innerHTML = `
      <div class="map-card__media">
        <img src="${esc(lm.imageUrl || lm.fallbackImage || '/assets/photos/wat-yai.jpg')}"
             data-fallback="${esc(lm.fallbackImage || '/assets/photos/wat-yai.jpg')}"
             onerror="this.onerror=null;this.src='${esc(svgFb)}'"
             alt="${esc(tr(lm.name, lang))}">
        <span class="map-card__badge map-card__badge--gold">${esc(t('card.heritageYear', { y: builtYear(lm.builtYearBe) }))}</span>
      </div>
      <div class="map-card__header-row">
        <a class="kicker kicker--link" href="/credits#sources"><i data-lucide="shield-check"></i> ${esc(t('ref.fad'))}</a>
        ${langSwitcher(lang, 'card-lang')}
      </div>
      <h3 lang="${lang}">${esc(tr(lm.name, lang))}</h3>
      <p lang="${lang}">${esc(tr(lm.summary, lang))}</p>
      <div class="actions">
        <button class="btn btn--primary" type="button" data-scan="${lm.id}"><i data-lucide="book-open"></i> ${esc(t('card.history'))}</button>
        <button class="btn btn--outline" type="button" data-speak="${lm.id}"><i data-lucide="volume-2"></i> ${esc(t('card.listen'))}</button>
        <div class="soundwave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      </div>
      ${nearby.length ? `<p class="mt small"><b>${esc(t('card.nearby'))}</b></p>
      <div class="nearby">${nearby.map((m) => `<button class="btn btn--ghost btn--sm btn--list" type="button" data-focus-merchant="${esc(m.slug)}">
        <i data-lucide="${m.kind === 'hotel' ? 'bed-double' : 'utensils'}"></i> ${esc(shortLabel(m, lang))} · ${esc(distanceText(m.distanceM))}
      </button>`).join('')}</div>` : ''}
      ${details}`;
  } else {
    const m = d;
    const isHotel = m.kind === 'hotel' || m.category === 'stay';
    const lm = state.data.landmarks.find((l) => l.id === m.nearest);
    const items = state.data.menuItems.filter((i) => i.merchantId === m.id);
    const isDemoPartner = m.partnerStatus !== 'confirmed';
    card.innerHTML = `
      <div class="map-card__media">
        <img src="${esc(m.imageUrl || m.fallbackImage || '/assets/photos/hoi-kha-noodles.jpg')}"
             data-fallback="${esc(m.fallbackImage || '/assets/photos/hoi-kha-noodles.jpg')}"
             onerror="this.onerror=null;this.src='${esc(svgFb)}'"
             alt="${esc(tr(m.name, lang))}">
        <span class="map-card__badge ${isHotel ? 'map-card__badge--blue' : 'map-card__badge--emerald'}">${esc(catName(m))}</span>
      </div>
      <div class="map-card__header-row">
        <div class="badges">
          <span class="badge badge--warn">${esc(t(isDemoPartner ? 'demo.partner' : 'demo.verified'))}</span>
          <span class="badge badge--gold">${esc(t(isHotel ? 'demo.price' : 'demo.menu'))}</span>
        </div>
        ${langSwitcher(lang, 'card-lang')}
      </div>
      <h3 lang="${lang}">${esc(tr(m.name, lang))}</h3>
      <p lang="${lang}">${esc(tr(m.blurb, lang))}</p>
      <ul class="meta-list">
        <li>${m.shopStatus === 'busy' ? '🟠' : '🟢'} ${esc(t(m.shopStatus === 'busy' ? 'status.busy' : 'status.open'))}</li>
        ${lm ? `<li>${esc(t('card.distance', { place: shortLabel(lm, lang), d: distanceText(m.distanceM) }))}</li>` : ''}
        ${items.length ? `<li>${esc(t(isHotel ? 'card.roomCount' : 'card.menuCount', { n: items.length }))}</li>` : ''}
      </ul>
      <div class="actions">
        ${items.length
          ? `<button class="btn btn--primary btn--block" type="button" data-menu="${m.id}">
              <i data-lucide="${isHotel ? 'calendar-check' : 'shopping-bag'}"></i> ${esc(t(isHotel ? 'card.book' : 'card.order'))}
            </button>`
          : `<p class="muted small">${esc(t('card.noItems'))}</p>`}
        ${lm ? `<button class="btn btn--outline btn--sm btn--block" type="button" data-focus-landmark="${lm.id}">${esc(t('card.nearHeritage', { name: shortLabel(lm, lang) }))}</button>` : ''}
      </div>
      ${details}`;
  }
  refreshIcons();
}

// ------------------------------------------------------------------ Directory of 13 Real Locations (5 Heritage + 5 Restaurants + 3 Hotels)
function renderDirectoryCards() {
  const box = document.getElementById('directory-grid');
  if (!box || !state.data) return;
  const lang = state.lang;
  const gmapsBtn = (url) => `<a class="btn btn--ghost btn--sm" href="${esc(url)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i> Google Maps</a>`;

  const heritageCards = state.data.landmarks.map((lm) => {
    const gmaps = lm.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lm.lat},${lm.lng}`;
    return `<article class="dir-card dir-card--heritage" data-dir-cat="heritage">
      <div class="dir-card__img-wrap">
        <img src="${esc(lm.imageUrl || lm.fallbackImage)}" data-fallback="${esc(lm.fallbackImage)}"
             onerror="this.onerror=null;this.src='${esc(svgFallbackUrl(shortLabel(lm, lang)))}'"
             alt="${esc(tr(lm.name, lang))}" loading="lazy">
        <span class="dir-card__tag dir-card__tag--gold">${esc(t('card.heritageYear', { y: builtYear(lm.builtYearBe) }))}</span>
      </div>
      <div class="dir-card__body">
        <h3 lang="${lang}">${esc(tr(lm.name, lang))}</h3>
        <p class="muted small" lang="${lang}">${esc(tr(lm.summary, lang))}</p>
        <a class="dir-card__ref dir-card__ref--link" href="/credits#sources"><i data-lucide="book-open-check"></i> ${esc(t('ref.fad'))}</a>
        <div class="dir-card__actions">
          <button class="btn btn--primary btn--sm" type="button" data-dir-scan="${lm.id}"><i data-lucide="volume-2"></i> ${esc(t('card.listen'))}</button>
          <button class="btn btn--outline btn--sm" type="button" data-dir-focus="landmark:${lm.id}"><i data-lucide="box"></i> ${esc(t('dir.onMap'))}</button>
          ${gmapsBtn(gmaps)}
        </div>
      </div>
    </article>`;
  });

  const merchantCards = state.data.merchants.map((m) => {
    const isHotel = m.kind === 'hotel' || m.category === 'stay';
    const gmaps = m.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`;
    const items = state.data.menuItems.filter((i) => i.merchantId === m.id);
    const minPrice = items.length ? Math.min(...items.map((i) => i.priceSatang)) : m.roomRateSatang || 5000;
    const isDemoPartner = m.partnerStatus !== 'confirmed';
    return `<article class="dir-card dir-card--${isHotel ? 'hotel' : 'restaurant'}" data-dir-cat="${merchantLayer(m)}">
      <div class="dir-card__img-wrap">
        <img src="${esc(m.imageUrl || m.fallbackImage)}" data-fallback="${esc(m.fallbackImage)}"
             onerror="this.onerror=null;this.src='${esc(svgFallbackUrl(shortLabel(m, lang)))}'"
             alt="${esc(tr(m.name, lang))}" loading="lazy">
        <span class="dir-card__tag ${isHotel ? 'dir-card__tag--blue' : 'dir-card__tag--emerald'}">${esc(t(isHotel ? 'dir.stayFrom' : 'dir.foodFrom', { p: baht(minPrice) }))}</span>
      </div>
      <div class="dir-card__body">
        <div class="badges" style="margin:4px 0">
          <span class="badge badge--warn">${esc(t(isDemoPartner ? 'demo.partner' : 'demo.verified'))}</span>
          <span class="badge badge--gold">${esc(t(isHotel ? 'demo.price' : 'demo.menu'))}</span>
          <span class="badge ${m.shopStatus === 'busy' ? 'badge--warn' : 'badge--ok'}">${esc(t(m.shopStatus === 'busy' ? 'status.busy' : 'status.open'))}</span>
        </div>
        <h3 lang="${lang}">${esc(tr(m.name, lang))}</h3>
        <p class="muted small" lang="${lang}">${esc(tr(m.blurb, lang))}</p>
        <div class="dir-card__actions">
          <button class="btn btn--primary btn--sm" type="button" data-dir-menu="${m.id}"><i data-lucide="${isHotel ? 'calendar' : 'utensils'}"></i> ${esc(t(isHotel ? 'dir.book' : 'dir.order'))}</button>
          <button class="btn btn--outline btn--sm" type="button" data-dir-focus="merchant:${m.slug}"><i data-lucide="box"></i> ${esc(t('dir.onMap'))}</button>
          ${gmapsBtn(gmaps)}
        </div>
      </div>
    </article>`;
  });

  box.innerHTML = [...heritageCards, ...merchantCards].join('');
  // Keep the map's category filter applied after a re-render (e.g. on a language change).
  const layers = state.mapLayers;
  box.querySelectorAll('[data-dir-cat]').forEach((card) => { card.hidden = !layers.has(card.dataset.dirCat); });
  refreshIcons();
}

// ------------------------------------------------------------------ Strict 3-Role Switcher
function setRole(role, { skipDataLoad = false } = {}) {
  state.role = role;
  document.querySelectorAll('[data-role]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.dataset.view !== role; });

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
  const couponLine = (c) => [
    c.kind === 'percent' ? t('coupon.pct', { v: c.value }) : t('coupon.fixed', { v: baht(c.value) }),
    c.minSpendSatang ? t('coupon.min', { v: baht(c.minSpendSatang) }) : '',
    t(c.source === 'vip_pass' ? 'coupon.vip' : 'coupon.stamp'),
    c.status !== 'active' ? t('coupon.used') : ''
  ].filter(Boolean).join(' · ');
  body.innerHTML = `
    <div class="dialog__head"><h2 id="wallet-title">${esc(t('wallet.title'))}</h2><button class="btn btn--icon btn--ghost" type="button" data-close aria-label="${esc(t('close'))}">✕</button></div>
    <p><b>${esc(t('wallet.stamps'))}</b></p>
    <div class="actions">${stamps.map((l) => {
      const got = v.stamps.some((st) => st.landmarkId === l.id);
      return `<span class="badge ${got ? 'badge--ok' : ''}">${got ? '✓' : '○'} ${esc(shortLabel(l))}</span>`;
    }).join(' ')}</div>
    <p class="mt"><b>${esc(t('wallet.coupons'))}</b></p>
    ${v.coupons.length ? v.coupons.map((c) => `<div class="coupon-card${c.status !== 'active' ? ' coupon-card--used' : ''}">
      <span>${esc(tr(c.merchantName))}<br><small>${esc(couponLine(c))}</small></span>
      ${c.status === 'active' ? `<button class="btn btn--sm btn--primary" type="button" data-use="${c.merchantId}">${esc(t('coupon.use'))}</button>` : `<code>${esc(c.code)}</code>`}
    </div>`).join('') : `<p class="muted">${esc(t('wallet.none'))}</p>
      <button class="btn btn--primary" type="button" data-scan-now>${esc(t('wallet.try'))}</button>`}`;
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
  updateLayerCounts();
  return fresh;
}

// ------------------------------------------------------------------ wiring
function bindGlobal() {
  document.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => setRole(b.dataset.role)));

  bindMapTools();

  document.getElementById('map-card')?.addEventListener('click', (e) => {
    const langBtn = e.target.closest('[data-card-lang]');
    if (langBtn) { state.lang = langBtn.dataset.cardLang; emit('lang:changed', state.lang); return; }
    const scan = e.target.closest('[data-scan]');
    if (scan) { goScan(scan.dataset.scan); return; }
    const speak = e.target.closest('[data-speak]');
    if (speak) { speakGuide(speak.dataset.speak, 'summary', state.lang, null); return; }
    if (e.target.closest('[data-open-city]')) { showCity(); return; }
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

  document.querySelectorAll('#open-wallet, [data-open-wallet-menu]').forEach((b) => b.addEventListener('click', openWallet));
  document.getElementById('open-cart')?.addEventListener('click', openCart);
  document.getElementById('vip-card')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-buy-vip]')) startCheckout({ type: 'vip_pass' });
    if (e.target.closest('[data-open-wallet]')) openWallet();
  });

  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  document.querySelectorAll('[data-open-signup]').forEach((b) => b.addEventListener('click', openSignup));
  document.querySelector('[data-close-signup]')?.addEventListener('click', () => closeDialog('signup-dialog'));

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
    closeDialog('signup-dialog');
    startCheckout({ type: isHotel ? 'hotel_saas' : 'saas', merchant });
  });

  on('checkout:field-errors', (errors) => { openDialog('signup-dialog'); showFieldErrors(errors); });
  on('wallet:open', openWallet);
  on('vip:prompt', () => {
    openVipUpgradeModal();
  });
  on('cart:changed', () => {
    setCount(document.getElementById('cart-count'), cartCount());
  });
  on('visitor:updated', (v) => {
    state.data.visitor = v;
    renderVisitorBits();
  });
  on('lang:changed', () => {
    applyLanguageChrome();
    setLang(state.lang);
    renderVisitorBits();
    renderStatic();
    updateLayerCounts();
    refreshLabels();
    renderDirectoryCards();
    const active = document.querySelector('.map-label--active');
    if (currentDistrict && getMapMode() === 'province') renderDistrictCard(currentDistrict);
    else if (active) active.click();
    else if (state.data?.landmarks?.[0]) renderMapCard({ kind: 'landmark', subKind: 'heritage', data: state.data.landmarks[0] });
  });
  on('data:reload', () => reloadData().catch(() => {}));

  window.addEventListener('phitlok:vip-activated', async (ev) => {
    const r = ev.detail;
    if (r && r.visitor) state.data.visitor = r.visitor;
    setVipActive(true);
    await reloadData().catch(() => {});
    emit('visitor:changed');
    refreshHeroStats();
    refreshAdminData().catch(() => {});
    toast(t('toast.vipOn'), 'ok');
  });

  on('payment:success', async (r) => {
    if (r.visitor) state.data.visitor = r.visitor;
    if (r.type === 'vip_pass') setVipActive(true);
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
    const doneMsg = r.type !== 'order' ? t('toast.paid')
      : t(r.order.ticket.kind === 'booking' ? 'toast.booked' : 'toast.ordered', { no: r.order.orderNo });
    toast(doneMsg, 'ok');
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

// ------------------------------------------------------------------ map toolbar (layers · legend · reset · fullscreen)
function updateLayerCounts() {
  const counts = { heritage: state.data.landmarks.length, restaurant: 0, souvenir: 0, hotel: 0 };
  for (const m of state.data.merchants) counts[merchantLayer(m)] += 1;
  document.querySelectorAll('[data-layer-count]').forEach((el) => {
    const layer = el.dataset.layerCount;
    el.textContent = counts[layer];
    const chip = el.closest('.map-chip');
    chip.setAttribute('aria-label', t('map.count', { name: chip.querySelector('.map-chip__name').textContent, n: counts[layer] }));
  });
}

function applyLayerFilter() {
  const layers = [...document.querySelectorAll('[data-map-layer][aria-pressed="true"]')].map((b) => b.dataset.mapLayer);
  setMapLayers(layers);
  document.querySelectorAll('[data-dir-cat]').forEach((card) => { card.hidden = !layers.includes(card.dataset.dirCat); });
}

function bindMapTools() {
  updateLayerCounts();
  document.querySelectorAll('[data-map-view]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.mapView === 'city') showCity();
    else showProvince();
  }));
  // Settings in the map dock opens the header language picker (it lives in the sticky bar).
  document.querySelector('[data-open-settings]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('lang-btn')?.click();
  });
  document.getElementById('map-progress')?.addEventListener('click', (e) => {
    if (!e.target.closest('[data-progress-scan]')) return;
    const next = state.data.landmarks.find((l) => !state.data.visitor.stamps.some((st) => st.landmarkId === l.id));
    if (next) goScan(next.id);
  });
  document.querySelectorAll('[data-map-layer]').forEach((chip) => chip.addEventListener('click', () => {
    chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    applyLayerFilter();
  }));

  const labelsToggleBtn = document.getElementById('map-labels-toggle');
  const labelsToggleText = document.getElementById('map-labels-toggle-text');
  labelsToggleBtn?.addEventListener('click', () => {
    const next = setMapLabelsVisible(!areMapLabelsVisible());
    labelsToggleBtn.setAttribute('aria-pressed', String(next));
    if (labelsToggleText) {
      labelsToggleText.textContent = t(next ? 'map.labelsOn' : 'map.labelsOff');
    }
  });

  const legend = document.getElementById('map-legend');
  const legendBtn = document.getElementById('map-legend-toggle');
  legendBtn?.addEventListener('click', () => {
    legend.hidden = !legend.hidden;
    legendBtn.setAttribute('aria-expanded', String(!legend.hidden));
  });

  document.getElementById('map-reset')?.addEventListener('click', () => focusEntity('overview', { silent: true }));

  // Fullscreen covers map + place card so filters and the card stay usable.
  // iPhone Safari has no element fullscreen, so it falls back to a fixed full-viewport layer.
  const layout = document.querySelector('.map-layout');
  const fsBtn = document.getElementById('map-fullscreen');
  if (!layout || !fsBtn) return;
  const nativeEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const isOn = () => nativeEl() === layout || layout.classList.contains('is-pseudo-fullscreen');
  const sync = () => {
    const on = isOn();
    layout.classList.toggle('is-fullscreen', on);
    document.documentElement.classList.toggle('map-fs-lock', layout.classList.contains('is-pseudo-fullscreen'));
    const label = t(on ? 'map.fsOff' : 'map.fsOn');
    fsBtn.setAttribute('aria-label', label);
    fsBtn.title = label;
  };
  const exitPseudo = () => { layout.classList.remove('is-pseudo-fullscreen'); sync(); fsBtn.focus(); };
  fsBtn.addEventListener('click', async () => {
    if (isOn()) {
      if (nativeEl()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else exitPseudo();
      return;
    }
    const request = layout.requestFullscreen || layout.webkitRequestFullscreen;
    if (request && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
      try { await request.call(layout); return; } catch { /* fall through to the fixed layer */ }
    }
    layout.classList.add('is-pseudo-fullscreen');
    sync();
  });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && layout.classList.contains('is-pseudo-fullscreen') && !document.querySelector('dialog[open]')) exitPseudo();
  });
}

// ------------------------------------------------------------------ language: page chrome + header picker
const LANG_CODE = { th: 'TH', en: 'EN', zh: '中', ja: '日', ko: '한', fr: 'FR' };

function applyLanguageChrome() {
  document.documentElement.lang = state.lang;
  document.title = t('title');
  applyStatic();
  const code = document.getElementById('lang-btn-code');
  if (code) code.textContent = LANG_CODE[state.lang] || 'TH';
  const btn = document.getElementById('lang-btn');
  if (btn) btn.setAttribute('aria-label', t('lang.button', { l: LANGS.find((l) => l.code === state.lang)?.label || state.lang }));
  document.querySelectorAll('[data-app-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.appLang === state.lang)));
  const labelsToggle = document.getElementById('map-labels-toggle');
  const labelsText = document.getElementById('map-labels-toggle-text');
  if (labelsText && labelsToggle) labelsText.textContent = t(labelsToggle.getAttribute('aria-pressed') === 'false' ? 'map.labelsOff' : 'map.labelsOn');
  const fs = document.getElementById('map-fullscreen');
  if (fs) {
    const on = document.querySelector('.map-layout')?.classList.contains('is-fullscreen');
    fs.setAttribute('aria-label', t(on ? 'map.fsOff' : 'map.fsOn'));
    fs.title = t(on ? 'map.fsOff' : 'map.fsOn');
  }
}

function bindLanguagePicker() {
  const btn = document.getElementById('lang-btn');
  const menu = document.getElementById('lang-menu');
  if (!btn || !menu) return;
  const close = (focusBtn) => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (focusBtn) btn.focus();
  };
  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('[aria-pressed="true"]')?.focus();
  });
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-app-lang]');
    if (!item) return;
    close(true);
    if (item.dataset.appLang !== state.lang) {
      state.lang = item.dataset.appLang;
      emit('lang:changed', state.lang);
    }
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.lang-picker')) close(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) close(true); });
}

// Merchant sign-up lives in a dialog, opened from the header, the menu and the invitation on the tourist page.
function openSignup() {
  openDialog('signup-dialog');
  document.getElementById('f-shop')?.focus();
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
