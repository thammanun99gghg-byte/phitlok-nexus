// Location picker for shop and hotel sign-up: tap the map, use the phone's GPS, paste a Google Maps link,
// or type the coordinates. Only points inside Phitsanulok province are accepted (real district borders).
import { state, esc, shortLabel } from './core.js';
import { DISTRICTS, NAN_RIVER, NAN_RIVER_CITY } from './province-data.js';
import { districtAt } from './province3d.js';

const VIEWS = {
  old: { w: 100.2470, e: 100.2765, s: 16.8145, n: 16.8305 },
  province: { w: 99.82, e: 101.14, s: 16.29, n: 17.77 },
  city: { w: 100.2325, e: 100.2921, s: 16.8075, n: 16.8375 }
};
const COS = Math.cos(17 * Math.PI / 180);
const K = 1000;

/** Distance in metres between two GPS points. */
export function metres(aLat, aLng, bLat, bLng) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestLandmark(lat, lng) {
  let best = null;
  for (const l of state.data?.landmarks || []) {
    const d = metres(lat, lng, l.lat, l.lng);
    if (!best || d < best.d) best = { l, d };
  }
  return best;
}

/** Reads coordinates out of a Google Maps link or plain "lat, lng" text. */
export function parseCoords(text) {
  const s = String(text || '').trim();
  const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/];
  for (const p of pats) {
    const m = s.match(p);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
  }
  return null;
}

const fmt = (n) => Number(n).toFixed(5);
const distText = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} กม.` : `${Math.round(m)} ม.`);

export function mountPinPicker(root, { onChange = () => {} } = {}) {
  const prefix = root.dataset.pinPicker;
  root.innerHTML = `
    <div class="pin-picker__bar" role="group" aria-label="ขนาดแผนที่">
      <button type="button" class="pin-picker__zoom" data-view="old" aria-pressed="false">ย่านวัดใหญ่</button>
      <button type="button" class="pin-picker__zoom" data-view="city" aria-pressed="true">ตัวเมือง</button>
      <button type="button" class="pin-picker__zoom" data-view="province" aria-pressed="false">ทั้งจังหวัด</button>
      <button type="button" class="btn btn--outline btn--sm pin-picker__gps"><i data-lucide="locate-fixed"></i> ใช้ตำแหน่งปัจจุบัน</button>
    </div>
    <svg class="pin-picker__map" role="img" aria-label="แผนที่สำหรับปักหมุด แตะเพื่อวางหมุด"></svg>
    <p class="pin-picker__readout" aria-live="polite"></p>
    <div class="field">
      <label for="${prefix}-gmaps">หรือวางลิงก์ Google Maps / พิกัด</label>
      <div class="pin-picker__paste">
        <input id="${prefix}-gmaps" type="text" inputmode="url" placeholder="https://www.google.com/maps/@16.8211,100.2630,17z หรือ 16.8211, 100.2630">
        <button type="button" class="btn btn--outline btn--sm" data-pin-paste>ใช้พิกัดนี้</button>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="${prefix}-lat">ละติจูด</label>
        <input id="${prefix}-lat" name="lat" inputmode="decimal" maxlength="12" placeholder="16.82110">
      </div>
      <div class="field">
        <label for="${prefix}-lng">ลองจิจูด</label>
        <input id="${prefix}-lng" name="lng" inputmode="decimal" maxlength="12" placeholder="100.26300">
      </div>
    </div>
    <p class="field__error" data-err="pin"></p>`;

  const svg = root.querySelector('svg');
  const readout = root.querySelector('.pin-picker__readout');
  const latIn = root.querySelector('[name="lat"]');
  const lngIn = root.querySelector('[name="lng"]');
  const errEl = root.querySelector('[data-err="pin"]');
  let view = 'city';
  let pin = null;

  const box = () => VIEWS[view];
  const toXY = (lat, lng) => [(lng - box().w) * COS * K, (box().n - lat) * K];
  const pts = (ring) => ring.map(([lng, lat]) => toXY(lat, lng).map((v) => v.toFixed(1)).join(',')).join(' ');

  function draw() {
    const b = box();
    const W = (b.e - b.w) * COS * K, H = (b.n - b.s) * K;
    const u = H / 100; // drawing unit: 1% of the map height
    const city = view !== 'province';
    svg.setAttribute('viewBox', `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`);
    const districts = DISTRICTS.map((d) => `<polygon points="${pts(d.ring)}" class="pp-d pp-d--${d.id}" stroke-width="${u * 0.4}"/>`).join('');
    const river = `<polyline points="${pts(city ? NAN_RIVER_CITY : NAN_RIVER)}" class="pp-river" stroke-width="${u * (city ? 2.2 : 0.8)}"/>`;
    // landmark names only where they have room (old town); the city view shows their dots
    const halo = `stroke-width="${u * 0.7}"`;
    const labels = city
      ? (state.data?.landmarks || []).map((l) => {
        const [x, y] = toXY(l.lat, l.lng);
        const dot = `<circle cx="${x}" cy="${y}" r="${u * (view === 'old' ? 1.6 : 1.1)}" class="pp-lm" stroke-width="${u * 0.4}"/>`;
        if (view !== 'old') return dot;
        // west-bank names sit left of their dot, east-bank names right, so the riverside cluster stays readable
        const west = l.lng < 100.2615;
        return `${dot}<text x="${x + (west ? -u * 2.6 : u * 2.6)}" y="${y + u * 1.6}" class="pp-t" text-anchor="${west ? 'end' : 'start'}" font-size="${u * 4.4}" ${halo}>${esc(shortLabel(l, 'th'))}</text>`;
      }).join('')
      : DISTRICTS.map((d) => { const [x, y] = toXY(d.label[1], d.label[0]); return `<text x="${x}" y="${y}" class="pp-t" text-anchor="middle" font-size="${u * 3.8}" ${halo}>${esc(d.th)}</text>`; }).join('');
    let marker = '';
    if (pin) {
      const [x, y] = toXY(pin.lat, pin.lng);
      const s = u * 2.6;
      marker = `<g class="pp-pin" transform="translate(${x},${y})"><path d="M0 0 C ${-s} ${-s * 1.2} ${-s} ${-s * 2.6} 0 ${-s * 2.6} C ${s} ${-s * 2.6} ${s} ${-s * 1.2} 0 0 Z"/><circle cy="${-s * 1.75}" r="${s * 0.4}" fill="#fff"/></g>`;
    }
    svg.innerHTML = `<rect width="100%" height="100%" class="pp-bg"/>${districts}${river}${labels}${marker}`;
  }

  function setPin(lat, lng, { fromInputs = false, recenter = false } = {}) {
    errEl.textContent = '';
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { pin = null; draw(); report(); return; }
    const district = districtAt(lat, lng);
    if (!district) {
      errEl.textContent = 'ตำแหน่งนี้อยู่นอกจังหวัดพิษณุโลก กรุณาปักหมุดภายในจังหวัด';
      pin = null; draw(); report(); return;
    }
    pin = { lat: +fmt(lat), lng: +fmt(lng), district };
    if (!fromInputs) { latIn.value = fmt(lat); lngIn.value = fmt(lng); }
    if (recenter) {
      const c = VIEWS.city;
      view = lat > c.s && lat < c.n && lng > c.w && lng < c.e ? 'city' : 'province';
      syncZoom();
    }
    draw();
    report();
  }

  function report() {
    if (!pin) { readout.textContent = 'ยังไม่ได้ปักหมุด · แตะบนแผนที่เพื่อวางหมุดที่ตั้ง'; onChange(null); return; }
    const d = DISTRICTS.find((x) => x.id === pin.district);
    const near = nearestLandmark(pin.lat, pin.lng);
    readout.innerHTML = `📍 <b>${fmt(pin.lat)}, ${fmt(pin.lng)}</b> · อำเภอ${esc(d.th)}${near ? ` · ห่าง${esc(shortLabel(near.l, 'th'))} ${distText(near.d)}` : ''}`;
    onChange({ ...pin, nearest: near?.l.id || null });
  }

  function syncZoom() {
    root.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  }

  svg.addEventListener('click', (e) => {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    const b = box();
    setPin(b.n - q.y / K, b.w + q.x / (COS * K));
  });
  root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; syncZoom(); draw(); }));
  root.querySelector('.pin-picker__gps').addEventListener('click', () => {
    if (!navigator.geolocation) { errEl.textContent = 'อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง'; return; }
    readout.textContent = 'กำลังหาตำแหน่ง…';
    navigator.geolocation.getCurrentPosition(
      (pos) => setPin(pos.coords.latitude, pos.coords.longitude, { recenter: true }),
      () => { errEl.textContent = 'หาตำแหน่งไม่ได้ (ไม่ได้อนุญาตหรือสัญญาณอ่อน) กรุณาแตะบนแผนที่แทน'; report(); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
  root.querySelector('[data-pin-paste]').addEventListener('click', () => {
    const c = parseCoords(root.querySelector(`#${prefix}-gmaps`).value);
    if (!c) { errEl.textContent = 'อ่านพิกัดจากลิงก์นี้ไม่ได้ (ลิงก์แบบย่อ maps.app.goo.gl ใช้ไม่ได้) กรุณาเปิดลิงก์แล้วคัดลอกพิกัดมาแทน'; return; }
    setPin(c.lat, c.lng, { recenter: true });
  });
  const fromInputs = () => setPin(parseFloat(latIn.value), parseFloat(lngIn.value), { fromInputs: true, recenter: true });
  latIn.addEventListener('change', fromInputs);
  lngIn.addEventListener('change', fromInputs);

  draw();
  report();
  return {
    get value() { return pin; },
    reset() { pin = null; view = 'city'; syncZoom(); draw(); report(); errEl.textContent = ''; },
    redraw: draw
  };
}
