import { state, api, esc, tr, on, emit, toast } from './core.js';
import { tx, applyTripCopy } from './trip-text.js';
import { openVipUpgradeModal } from './site.js';
import { focusEntity } from './map3d.js';
import { openMerchantMenu } from './lens.js';

let places = [], mine = { locks:[],orders:[] }, location = null, lastRescue = null;
let pendingMerchant = null, refreshing = false, clockOffset = 0;
const setHtml = (el, html) => { if (el && el.innerHTML !== html) el.innerHTML = html; };
const merchantName = (id) => tr(state.data?.merchants.find((m) => m.id === id)?.name);
export const liveTicker = (key) => `<div class="live-ticker" data-live-place="${esc(key)}"></div>`;
const message = (err) => state.lang === 'th' && err.message ? err.message : tx('error');

export function paintTripLive() {
  document.querySelectorAll('[data-live-place]').forEach((el) => {
    const p = places.find((p) => p.key === el.dataset.livePlace);
    if (!p) return;
    setHtml(el, `<span class="trip-demo">${tx('demo')}</span>
      <b class="live-state ${p.stale || p.status !== 'open' ? 'live-state--warn' : ''}">${tx(p.stale ? 'stale' : p.status)}</b>
      <span>${p.kind === 'restaurant' ? tx('queue',{q:p.queue,n:p.waitMinutes}) : p.kind === 'heritage' ? p.parkingFree === null ? tx('parkingUnknown') : tx('parkingFree',{n:p.parkingFree}) : tx('seats',{n:p.seats})}</span>
      ${p.kind === 'restaurant' ? `<strong>${tx('tables',{n:p.tablesAvailable})}</strong><button type="button" class="btn btn--gold btn--block" data-lock-table="${p.merchantId}" ${p.stale || p.status !== 'open' || !p.tablesAvailable ? 'disabled' : ''}>${tx('reserve')}</button>` : ''}
      <small>${esc(tx('updated',{time:new Date(p.updatedAt).toLocaleTimeString(state.lang,{hour:'2-digit',minute:'2-digit'})}))}</small>`);
  });
}
function renderRescue() {
  const panel = document.getElementById('trip-rescue');
  if (!panel) return;
  panel.innerHTML = `<div class="trip-panel-head"><div><span class="trip-kicker">TRIP SAVER / 01</span><h2>${tx('rescueTitle')}</h2></div><span class="trip-demo">${tx('demo')}</span></div>
    <div class="rescue-actions">
      <button class="rescue-button" type="button" data-rescue="weather">${tx('weather')}</button>
      <button class="rescue-button" type="button" data-rescue="hunger">${tx('hunger')}</button>
      <button class="rescue-button" type="button" data-rescue="parking">${tx('parking')}</button>
    </div>
    <div class="trip-location"><button class="btn btn--outline btn--sm" type="button" data-use-location>${tx('location')}</button><span id="trip-location-status">${tx(location ? 'locationDevice' : 'locationDefault')}</span></div>
    <div id="trip-rescue-result" aria-live="polite"></div>`;
  if (lastRescue) showRescue(lastRescue);
}
function resultCard(p, route = true) {
  return `<article class="rescue-result"><h3>${esc(tr(p.name))}</h3>
    ${route ? `<p>${tx('estimate',{m:p.distanceM,n:p.walkingMinutes})}</p>` : ''}
    ${liveTicker(p.key)}
    <div class="actions"><button class="btn btn--outline" type="button" data-trip-focus="${esc(p.key)}">${tx('map')}</button>
    ${p.kind === 'restaurant' ? `<button class="btn btn--primary" type="button" data-trip-menu="${p.merchantId}">${tx('menu')}</button>` : ''}
    <a class="btn btn--ghost" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking" target="_blank" rel="noopener">${tx('directions')}</a></div></article>`;
}
function showRescue(r) {
  const out = document.getElementById('trip-rescue-result');
  if (!out) return;
  out.innerHTML = `<p class="trip-demo">${tx('demo')} · ${tx(r.originSource === 'device' ? 'locationDevice' : 'locationDefault')}</p>
    ${r.affected ? `<p>${esc(tr(r.affected.name))}: ${tx(r.affected.stale ? 'stale' : r.affected.status)} · ${r.affected.parkingFree === null ? tx('parkingUnknown') : tx('parkingFree',{n:r.affected.parkingFree})}</p>` : ''}
    <div class="rescue-results">${r.candidates.map((p) => resultCard(p)).join('') || `<p class="notice">${tx('noResult')}</p>`}${(r.alternativeFood || []).map((p) => resultCard(p,false)).join('')}</div>`;
  paintTripLive();
}
export function safetyStatus(safety) {
  if (!safety || safety.state === 'not_requested') return '';
  return `<div class="safety-status safety-status--${esc(safety.state)}" role="status"><b>${tx(safety.state)}</b><p>${tx('safetyNote')}</p></div>`;
}
function renderMine() {
  const el = document.getElementById('trip-mine');
  const active = mine.locks.find((r) => r.status === 'held');
  state.tripLock = active || null;
  setHtml(el, `<div class="trip-panel-head"><h2>${tx('myTrip')}</h2><button class="btn btn--outline" type="button" data-trip-refresh>${tx('refresh')}</button></div>
    <p class="trip-demo">${tx('demo')}</p><div class="trip-passes">${mine.locks.slice(0,4).map((r) => `<article class="trip-pass" data-pass-id="${esc(r.id)}">
      <span class="trip-kicker">FAST-TRACK PASS</span><h3>${tx('pass',{pass:r.passNo,n:r.tableNo})}</h3><p>${esc(merchantName(r.merchantId))}</p><b>${tx(r.status)}</b>
      ${['held','ordered'].includes(r.status) ? `<p>${tx('remaining')} <strong data-trip-countdown="${esc(r.expiresAt)}"></strong></p>
        <div class="actions">${r.status === 'held' ? `<button class="btn btn--primary" type="button" data-trip-menu="${r.merchantId}">${tx('menu')}</button>` : ''}
        <button class="btn btn--ghost" type="button" data-cancel-lock="${esc(r.id)}">${tx('cancel')}</button></div>` : ''}
    </article>`).join('')}</div>
    ${mine.orders.slice(0,5).map((o) => `<article class="trip-order"><h3>${esc(o.orderNo)} · ${esc(merchantName(o.merchantId))}</h3><p>${tx('orderStatus',{s:tx(o.status)})}</p>${safetyStatus(o.safety)}</article>`).join('')}
    ${!mine.locks.length && !mine.orders.length ? `<p class="muted">${tx('emptyTrip')}</p>` : ''}`);
  // Payment receipts stay current without replacing the checkout dialog or focus.
  document.querySelectorAll('[data-order-safety]').forEach((node) => {
    const order = mine.orders.find((o) => o.id === Number(node.dataset.orderSafety));
    if (order) setHtml(node,safetyStatus(order.safety));
  });
  tick();
}
function tick() {
  document.querySelectorAll('[data-trip-countdown]').forEach((el) => {
    const sec = Math.max(0,Math.ceil((Date.parse(el.dataset.tripCountdown)-Date.now()-clockOffset)/1000));
    el.textContent = `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  });
}
export async function refreshTrip() {
  if (refreshing || !state.data) return;
  refreshing = true;
  try {
    const [live,own] = await Promise.all([api('/api/trip/live'),api('/api/trip/mine')]);
    places = live.places; mine = own;
    clockOffset = Date.parse(own.serverTime)-Date.now();
    paintTripLive(); renderMine();
  } catch (err) {
    const el = document.getElementById('trip-network');
    if (el) el.textContent = message(err);
  } finally { refreshing = false; }
}
async function reserve(id, button) {
  if (button) button.disabled = true;
  try {
    const r = await api('/api/trip/locks',{method:'POST',body:{merchantId:id}});
    state.tripLock = r.lock;
    await refreshTrip();
    await openMerchantMenu(id);
    toast(tx('held'),'ok');
  } catch (err) {
    if (err.status === 402) { pendingMerchant = id; await openVipUpgradeModal(); }
    else toast(message(err),'error');
  } finally { if (button?.isConnected) button.disabled = false; }
}
export function initTrip() {
  renderRescue(); refreshTrip(); applyTripCopy();
  setInterval(() => { if (!document.hidden) refreshTrip(); },4000);
  setInterval(tick,1000);
  on('lang:changed',() => { applyTripCopy(); renderRescue(); paintTripLive(); renderMine(); });
  on('payment:success',refreshTrip);
  window.addEventListener('phitlok:vip-activated',() => {
    // Keep the paid receipt visible until the customer closes it.
    const dlg = document.getElementById('vip-upgrade-dialog');
    const resume = () => { if (pendingMerchant) { const id=pendingMerchant; pendingMerchant=null; reserve(id); } };
    if (dlg?.open) dlg.addEventListener('close',resume,{once:true}); else resume();
  });
  document.addEventListener('click',async (e) => {
    const lock = e.target.closest('[data-lock-table]');
    if (lock) { await reserve(Number(lock.dataset.lockTable),lock); return; }
    const menu = e.target.closest('[data-trip-menu]');
    if (menu) { await openMerchantMenu(Number(menu.dataset.tripMenu)); return; }
    const focus = e.target.closest('[data-trip-focus]');
    if (focus) { focusEntity(focus.dataset.tripFocus); document.getElementById('map-stage')?.scrollIntoView({block:'center',behavior:'smooth'}); return; }
    if (e.target.closest('[data-trip-refresh]')) { await refreshTrip(); return; }
    const cancel = e.target.closest('[data-cancel-lock]');
    if (cancel) {
      cancel.disabled=true;
      try { await api(`/api/trip/locks/${cancel.dataset.cancelLock}/cancel`,{method:'POST'}); await refreshTrip(); }
      catch(err) { toast(message(err),'error'); cancel.disabled=false; }
      return;
    }
    const geo = e.target.closest('[data-use-location]');
    if (geo) {
      geo.disabled=true;
      const status = document.getElementById('trip-location-status');
      status.textContent=tx('loading');
      const done = (pos) => { location=pos ? {lat:pos.coords.latitude,lng:pos.coords.longitude} : null; status.textContent=tx(pos ? 'locationDevice' : 'locationDenied'); geo.disabled=false; };
      if (navigator.geolocation) navigator.geolocation.getCurrentPosition(done,() => done(null),{timeout:8000,maximumAge:60000}); else done(null);
      return;
    }
    const rescue = e.target.closest('[data-rescue]');
    if (rescue) {
      document.querySelectorAll('[data-rescue]').forEach((b) => { b.disabled=true; });
      const out=document.getElementById('trip-rescue-result'); out.textContent=tx('loading');
      try {
        lastRescue=await api('/api/trip/rescue',{method:'POST',body:{scenario:rescue.dataset.rescue,...(location ? {location} : {})}});
        await refreshTrip(); showRescue(lastRescue);
        const first=lastRescue.candidates[0];
        if (first) { state.mapLayers.add(first.kind === 'heritage' ? 'heritage' : first.kind === 'hotel' ? 'hotel' : 'restaurant'); emit('trip:focus',first.key); }
        if (first && rescue.dataset.rescue === 'hunger') await openMerchantMenu(first.merchantId);
      } catch(err) { out.textContent=message(err); }
      finally { document.querySelectorAll('[data-rescue]').forEach((b) => { b.disabled=false; }); }
    }
  });
}
