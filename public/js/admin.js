// Executive Admin Console (4-Stream Revenue Dashboard, 13-Pin All-Province Monitor, Interactive Unit Economics Calculator) — PHITLOK NEXUS v2.0
import { state, api, esc, tr, baht, num, timeAgo, on, refreshIcons, bindTablist } from './core.js';

const SERIES = [
  { key: 'saasSatang', label: '1. SaaS ร้านอาหาร 199฿/เดือน', color: '#0F3D3E' },
  { key: 'hotelSaasSatang', label: '2. SaaS โรงแรมที่พัก 499฿/เดือน', color: '#1E3A8A' },
  { key: 'vipSatang', label: '3. Phitsanulok VIP Pass 99฿', color: '#B8860B' },
  { key: 'feeSatang', label: '4. ค่าธรรมเนียมอาหาร/ที่พัก 3-5%', color: '#059669' }
];
const TX_LABEL = {
  saas_subscription: 'SaaS ร้านอาหาร (199฿/ด.)',
  hotel_saas: 'SaaS โรงแรมที่พัก (499฿/ด.)',
  vip_pass: 'Phitsanulok VIP Pass (99฿)',
  order: 'ค่าธรรมเนียมสั่งอาหาร/จองที่พัก (3-5%)'
};

let pollTimer = null;
let metrics = null;
let lastTopTx = null;
let calcInitialised = false;
let stress = false;

export function startAdminView() {
  load();
  clearInterval(pollTimer);
  pollTimer = setInterval(load, 4000);
}
export function stopAdminView() { clearInterval(pollTimer); }

export async function refreshAdminData() {
  await load();
}

export async function fetchMetrics() {
  metrics = await api('/api/metrics');
  return metrics;
}

async function load() {
  try {
    await fetchMetrics();
    render();
  } catch (err) {
    const el = document.getElementById('admin-updated');
    if (el) el.textContent = `โหลดข้อมูลไม่สำเร็จ: ${err.message}`;
  }
}

function render() {
  const t = metrics.totals;
  const hotelSaasRev = t.hotelSaas ? t.hotelSaas.revenueSatang : 0;
  const hotelCount = t.hotelSaas ? t.hotelSaas.activeHotels : 3;
  const restaurantCount = t.saas.activeRestaurants || (t.saas.activeMerchants - hotelCount);

  document.getElementById('admin-kpis').innerHTML = [
    [
      'รายได้รวม (ข้อมูลจำลอง)',
      baht(t.platformRevenueSatang),
      'kpi--gold',
      'รวม 4 ช่องทาง'
    ],
    [
      '1. SaaS ร้านอาหาร (199฿/ด.)',
      baht(t.saas.revenueSatang),
      'kpi--accent',
      `${num(restaurantCount)} ร้านอาหารดัง · MRR ${baht(t.saas.mrrSatang)}`
    ],
    [
      '2. SaaS โรงแรมที่พัก (499฿/ด.)',
      baht(hotelSaasRev),
      'kpi--accent',
      `${num(hotelCount)} โรงแรมชั้นนำ · MRR ${baht(t.hotelSaas ? t.hotelSaas.mrrSatang : hotelCount * 49900)}`
    ],
    [
      '3. Phitsanulok VIP Pass (99฿)',
      baht(t.vip.revenueSatang),
      'kpi--gold',
      `ขายแล้ว ${num(t.vip.passesSold)} ใบ × 99฿`
    ],
    [
      '4. ค่าธรรมเนียมอาหาร/ที่พัก (3-5%)',
      baht(t.orders.feeRevenueSatang),
      'kpi--accent',
      `${num(t.orders.count)} ออเดอร์ · GMV รวม ${baht(t.orders.gmvSatang)}`
    ]
  ].map(([label, value, cls, sub]) => `<div class="kpi ${cls}"><p class="kpi__label">${label}</p><p class="kpi__value">${value}</p><p class="kpi__sub">${sub}</p></div>`).join('');

  renderChart(metrics.daily);
  renderSplit(t);
  renderTx(metrics.recent);
  renderAllProvinceMonitor();
  document.getElementById('admin-updated').textContent = `อัปเดตล่าสุด ${new Date().toLocaleTimeString('th-TH')} · สแกนป้ายสะสม ${num(metrics.counters.heritageScans)} ครั้ง (ข้อมูลจำลอง)`;
  if (!calcInitialised) { calcInitialised = true; resetCalculator(); }
  refreshIcons();
}

function renderChart(days) {
  const el = document.getElementById('revenue-chart');
  const tip = document.getElementById('chart-tooltip');
  const leg = document.getElementById('chart-legend');
  if (!el || !leg) return;
  leg.innerHTML = SERIES.map((s) => `<li><span class="key" style="background:${s.color}"></span>${esc(s.label)}</li>`).join('');

  const W = 720, H = 260, pad = { l: 54, r: 12, t: 18, b: 34 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const totals = days.map((d) => SERIES.reduce((sum, s) => sum + (d[s.key] || 0), 0));
  const maxVal = Math.max(10000, ...totals);
  const step = plotW / days.length;
  const barW = Math.min(28, step * 0.64);
  const y = (v) => pad.t + plotH - (v / maxVal) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((maxVal * f) / 100) * 100);
  const grid = ticks.map((v) => `<g class="grid"><line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">฿${num(v / 100)}</text></g>`).join('');

  const bars = days.map((d, i) => {
    const cx = pad.l + i * step + step / 2;
    let acc = 0;
    const rects = SERIES.map((s) => {
      const v = d[s.key] || 0;
      const y1 = y(acc + v);
      const h = (v / maxVal) * plotH;
      acc += v;
      return `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" fill="${s.color}"/>`;
    }).join('');
    const showDate = i % 2 === 0 || i === days.length - 1;
    const label = showDate ? `<text x="${cx.toFixed(1)}" y="${H - 10}" text-anchor="middle">${d.date.slice(5)}</text>` : '';
    return `<g>${rects}<g class="axis">${label}</g><rect class="hit" data-i="${i}" x="${(pad.l + i * step).toFixed(1)}" y="${pad.t}" width="${step.toFixed(1)}" height="${plotH}"/></g>`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="axis">${grid}</g>${bars}</svg>`;

  const show = (hit) => {
    const d = days[Number(hit.dataset.i)];
    const tot = SERIES.reduce((sum, s) => sum + (d[s.key] || 0), 0);
    tip.innerHTML = `<b>วันที่ ${d.date}</b> · รวม ${baht(tot)}` + SERIES.map((s) =>
      `<div class="row"><span><span class="key" style="background:${s.color}"></span>${esc(s.label)}</span><b>${baht(d[s.key] || 0)}</b></div>`
    ).join('');
    tip.hidden = false;
    const r = hit.getBoundingClientRect();
    const cr = el.parentElement.getBoundingClientRect();
    tip.style.left = `${Math.min(cr.width - 230, Math.max(8, r.left - cr.left - 60))}px`;
    tip.style.top = '48px';
  };
  el.querySelectorAll('.hit').forEach((h) => {
    h.addEventListener('pointerenter', () => show(h));
    h.addEventListener('pointerleave', () => { tip.hidden = true; });
  });

  document.getElementById('revenue-table').innerHTML = `<table class="data-table"><thead><tr><th scope="col">วันที่</th>${SERIES.map((s) => `<th scope="col">${esc(s.label)}</th>`).join('')}<th scope="col">รวม</th></tr></thead><tbody>
    ${days.map((d, i) => `<tr><td>${d.date}</td>${SERIES.map((s) => `<td>${baht(d[s.key] || 0)}</td>`).join('')}<td><b>${baht(totals[i])}</b></td></tr>`).join('')}</tbody></table>`;
}

function renderSplit(t) {
  const parts = [
    { s: SERIES[0], v: t.saas.revenueSatang || 0 },
    { s: SERIES[1], v: t.hotelSaas ? t.hotelSaas.revenueSatang : 0 },
    { s: SERIES[2], v: t.vip.revenueSatang || 0 },
    { s: SERIES[3], v: t.orders.feeRevenueSatang || 0 }
  ];
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  const el = document.getElementById('revenue-split');
  if (!el) return;
  el.innerHTML = `<div class="split">
    <div class="split__bar" role="img" aria-label="สัดส่วนรายได้ 4 ช่องทาง">
      ${parts.map((p, i) => `<span data-i="${i}" style="width:${(p.v / total) * 100}%;background:${p.s.color}"></span>`).join('')}
    </div>
    <ul class="split__rows">${parts.map((p) => `<li><span class="key" style="background:${p.s.color}"></span><span>${esc(p.s.label)}</span><b>${baht(p.v)} · ${Math.round((p.v / total) * 100)}%</b></li>`).join('')}</ul>
  </div>`;
}

function renderTx(recent) {
  const el = document.getElementById('tx-list');
  if (!el) return;
  const top = recent[0] ? recent[0].id : null;
  const isNew = lastTopTx !== null && top !== lastTopTx;
  el.innerHTML = recent.slice(0, 8).map((x, i) => `<li class="${isNew && i === 0 ? 'fresh' : ''}">
    <span>${esc(TX_LABEL[x.type] || x.type)}${x.merchantName ? ` · ${esc(tr(x.merchantName, 'th'))}` : ''}</span>
    <b>+${baht(x.platformRevenueSatang)}</b>
    <small>${timeAgo(x.createdAt)}${x.type === 'order' ? ` · ยอดรวมออเดอร์ ${baht(x.grossSatang)}` : ''}</small>
  </li>`).join('');
  lastTopTx = top;
}

// ------------------------------------------------------------------ All-Province Map & Partner Monitor (13 Pins + Partner Table + All Orders)
function renderAllProvinceMonitor() {
  const pinsEl = document.getElementById('admin-pins-overview');
  const partnersEl = document.getElementById('admin-partners-table');
  const ordersEl = document.getElementById('admin-orders-table');

  if (pinsEl && state.data) {
    const heritagePins = state.data.landmarks.map((l) => ({
      badge: 'โบราณสถาน (#B8860B)',
      cls: 'badge--gold',
      name: l.name.th,
      lat: l.lat,
      lng: l.lng,
      ref: tr(l.fineArtsRef, 'th') || 'กรมศิลปากร',
      url: l.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`
    }));
    const merchantPins = (metrics.partners || state.data.merchants).map((m) => ({
      badge: m.kind === 'hotel' ? 'โรงแรมที่พัก (#1E3A8A)' : 'ร้านอาหารดัง (#0F3D3E)',
      cls: m.kind === 'hotel' ? 'badge--blue' : 'badge--ok',
      name: m.name.th,
      lat: m.lat,
      lng: m.lng,
      ref: m.kind === 'hotel' ? `SaaS โรงแรม 499฿/ด.` : `SaaS ร้านอาหาร 199฿/ด.`,
      url: m.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
    }));
    const all13 = [...heritagePins, ...merchantPins];
    pinsEl.innerHTML = all13.map((p, idx) => {
      const satUrl = `https://www.google.com/maps/@?api=1&map_action=map&center=${p.lat},${p.lng}&zoom=18&basemap=satellite`;
      const isHeritage = idx < 5;
      return `
      <div class="pin-monitor-card">
        <div class="pin-monitor-card__top">
          <span class="badge ${p.cls}">#${idx + 1} · ${esc(p.badge)}</span>
          <a class="small" href="${esc(p.url)}" target="_blank" rel="noopener">Google Maps ↗</a>
        </div>
        <p class="pin-monitor-card__name"><b>${esc(p.name)}</b></p>
        <p class="muted small">
          <a href="${esc(satUrl)}" target="_blank" rel="noopener" title="เปิดดูพิกัดดาวเทียมจริง">GPS: <code>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</code> ↗</a>
          · ${isHeritage ? `<a href="/credits#sources" title="ดูหลักฐานทะเบียนโบราณสถาน กรมศิลปากร">${esc(p.ref)} ↗</a>` : esc(p.ref)}
        </p>
      </div>`;
    }).join('');
  }

  if (partnersEl && metrics.partners) {
    partnersEl.innerHTML = `<table class="data-table">
      <thead>
        <tr>
          <th scope="col">สถานที่บนแผนที่ (ร้านค้า / โรงแรม)</th>
          <th scope="col">สถานะความร่วมมือ</th>
          <th scope="col">ประเภท &amp; แพ็กเกจจำลอง</th>
          <th scope="col">พิกัด GPS จริง</th>
          <th scope="col">สถานะร้าน</th>
          <th scope="col">ออเดอร์สาธิต</th>
          <th scope="col">ยอดขายจำลอง (GMV)</th>
          <th scope="col">ค่าธรรมเนียม (3-5%)</th>
          <th scope="col">แผนที่จริง</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.partners.map((p) => {
          const isHotel = p.kind === 'hotel' || p.category === 'stay';
          const isDemo = p.partnerStatus !== 'confirmed';
          const gmaps = p.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
          return `<tr>
            <td><b>${esc(p.name.th)}</b></td>
            <td><span class="badge ${isDemo ? 'badge--warn' : 'badge--ok'}">${isDemo ? 'ยังไม่ใช่พาร์ทเนอร์ · ข้อมูลสาธิต' : 'ยืนยันแล้ว'}</span></td>
            <td><span class="badge ${isHotel ? 'badge--blue' : 'badge--ok'}">${isHotel ? 'โรงแรม (499฿/ด. · 5%)' : 'ร้านอาหาร (199฿/ด. · 3%)'}</span></td>
            <td><code>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</code></td>
            <td><span class="badge ${p.shopStatus === 'busy' ? 'badge--warn' : 'badge--ok'}">${p.shopStatus === 'busy' ? 'คิวเต็มชั่วคราว' : 'เปิดรับลูกค้า'}</span></td>
            <td>${num(p.ordersCount)}</td>
            <td>${baht(p.gmvSatang)}</td>
            <td><b>${baht(p.feeSatang)}</b></td>
            <td><a href="${esc(gmaps)}" target="_blank" rel="noopener">ดูพิกัดจริง ↗</a></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  if (ordersEl && metrics.allOrders) {
    const statusTh = { new: 'รับออเดอร์ใหม่', preparing: 'กำลังทำ', ready: 'เสร็จพร้อมเสิร์ฟ', done: 'เสร็จสิ้น' };
    ordersEl.innerHTML = `<table class="data-table">
      <thead>
        <tr>
          <th scope="col">รหัสออเดอร์</th>
          <th scope="col">ร้านอาหาร / โรงแรม</th>
          <th scope="col">ภาษาลูกค้า</th>
          <th scope="col">ข้อจำกัดอาหาร</th>
          <th scope="col">สถานะ</th>
          <th scope="col">ยอดรวมชำระ</th>
          <th scope="col">ค่าธรรมเนียมแพลตฟอร์ม</th>
          <th scope="col">เวลา</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.allOrders.map((o) => `<tr>
          <td><code>${esc(o.orderNo)}</code></td>
          <td><b>${esc(tr(o.merchantName, 'th'))}</b></td>
          <td><span class="badge">${esc(o.guestLang.toUpperCase())}</span></td>
          <td>${o.flags.length ? `<span class="badge badge--warn">${esc(o.flags.join(', '))}</span>` : '<span class="muted small">ปกติ</span>'}</td>
          <td><span class="badge ${o.status === 'done' ? 'badge--ok' : 'badge--gold'}">${esc(statusTh[o.status] || o.status)}</span></td>
          <td>${baht(o.totalSatang)}</td>
          <td><b>+${baht(o.platformFeeSatang)}</b></td>
          <td>${timeAgo(o.createdAt)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }
}

// ------------------------------------------------------------------ Interactive Unit Economics Calculator (4 Streams)
const inputs = {
  merchants: () => document.getElementById('r-merchants'),
  hotels: () => document.getElementById('r-hotels'),
  tourists: () => document.getElementById('r-tourists'),
  vip: () => document.getElementById('r-vip'),
  orders: () => document.getElementById('r-orders'),
  aov: () => document.getElementById('r-aov')
};

function resetCalculator() {
  const a = metrics.assumptions;
  const hotelCount = metrics.totals.hotelSaas ? metrics.totals.hotelSaas.activeHotels : 3;
  const restCount = metrics.totals.saas.activeRestaurants || 5;
  if (inputs.merchants()) inputs.merchants().value = Math.max(25, restCount * 5);
  if (inputs.hotels()) inputs.hotels().value = Math.max(8, hotelCount * 3);
  if (inputs.tourists()) inputs.tourists().value = 3500;
  if (inputs.vip()) inputs.vip().value = Math.round((a.vip_conversion || 0.08) * 100);
  if (inputs.orders()) inputs.orders().value = a.orders_per_tourist || 1.2;
  if (inputs.aov()) inputs.aov().value = a.avg_order_value || 180;
  calculate();
}

function calculate() {
  if (!metrics) return;
  const a = metrics.assumptions;
  const M = Number(inputs.merchants()?.value || 25);
  const H = Number(inputs.hotels()?.value || 8);
  const T = Number(inputs.tourists()?.value || 3500);
  const v = Number(inputs.vip()?.value || 8) / 100;
  const o = Number(inputs.orders()?.value || 1.2);
  const aov = Number(inputs.aov()?.value || 180);
  const k = stress ? 2 : 1;

  const vipPrice = metrics.pricing.vipPassSatang / 100;           // 99 THB
  const saasPrice = metrics.pricing.saasMonthlySatang / 100;      // 199 THB
  const hotelSaasPrice = (metrics.pricing.hotelSaasMonthlySatang || 49900) / 100; // 499 THB
  const blendedFeeRate = 0.035; // 3% restaurants + 5% hotels blended

  const setOut = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setOut('o-merchants', `${num(M)} ร้าน`);
  setOut('o-hotels', `${num(H)} แห่ง`);
  setOut('o-tourists', `${num(T)} คน`);
  setOut('o-vip', `${v * 100 | 0}%`);
  setOut('o-orders', o.toFixed(1));
  setOut('o-aov', `฿${num(aov)}`);

  // 4 Revenue Streams (THB / month)
  const revSaas = M * saasPrice;
  const revHotelSaas = H * hotelSaasPrice;
  const revVip = T * v * vipPrice;
  const revFee = T * o * aov * blendedFeeRate;
  const revenue = revSaas + revHotelSaas + revVip + revFee;

  // Costs
  const perTouristCost = (0.03 + a.scans_per_tourist * a.api_cost_per_scan) * k;
  const perPartnerCost = (1.5 + 20 * a.api_cost_per_scan) * k;
  const fixedTech = a.server_cost_month * k;
  const server = fixedTech + T * 0.03 * k + (M + H) * 1.5 * k;
  const aiCost = (T * a.scans_per_tourist + (M + H) * 20) * a.api_cost_per_scan * k;
  const ops = a.fixed_ops_month;
  const costs = server + aiCost + ops;
  const profit = revenue - costs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const touristContribution = v * vipPrice + o * aov * blendedFeeRate - perTouristCost;
  const restContribution = saasPrice - perPartnerCost;
  const hotelContribution = hotelSaasPrice - perPartnerCost;
  const fixed = fixedTech + ops;
  const beMerchants = restContribution > 0 ? Math.max(0, Math.ceil((fixed - H * hotelContribution - T * touristContribution) / restContribution)) : Infinity;
  const beTourists = touristContribution > 0 ? Math.max(0, Math.ceil((fixed - M * restContribution - H * hotelContribution) / touristContribution)) : Infinity;
  const fmt = (n) => `฿${num(n)}`;

  document.getElementById('calc-outputs').innerHTML = `
    <div class="calc-cards">
      <div class="calc-card"><p class="muted small">รายได้รวม 4 ช่องทาง/เดือน</p><p class="v">${fmt(revenue)}</p></div>
      <div class="calc-card"><p class="muted small">ต้นทุนรวม/เดือน${stress ? ' (×2 Server+API)' : ''}</p><p class="v">${fmt(costs)}</p></div>
      <div class="calc-card ${profit >= 0 ? 'calc-card--profit' : 'calc-card--loss'}"><p class="small"><b>${profit >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}/เดือน</b></p><p class="v">${profit < 0 ? '−' : ''}${fmt(Math.abs(profit))}</p></div>
      <div class="calc-card"><p class="muted small">อัตรากำไรสุทธิ · กำไรต่อปี</p><p class="v">${margin.toFixed(1)}% · ${profit < 0 ? '−' : ''}${fmt(Math.abs(profit * 12))}</p></div>
    </div>
    <div class="breakeven">
      <p>จุดคุ้มทุน (Break-even) ที่นักท่องเที่ยว ${num(T)} คน/เดือน และโรงแรม ${num(H)} แห่ง: ต้องการร้านอาหารเพียง <b>${Number.isFinite(beMerchants) ? `${num(beMerchants)} ร้าน` : 'ไม่ถึงจุดคุ้มทุน'}</b></p>
      <p>หรือที่พาร์ทเนอร์ปัจจุบัน (${num(M)} ร้าน + ${num(H)} โรงแรม): ต้องการนักท่องเที่ยวเพียง <b>${Number.isFinite(beTourists) ? `${num(beTourists)} คน/เดือน` : 'ไม่ถึงจุดคุ้มทุน'}</b></p>
    </div>
    <table class="calc-table"><tbody>
      <tr><td>1. ค่าสมาชิก SaaS ร้านอาหาร (${num(M)} ร้าน × ฿${saasPrice})</td><td>${fmt(revSaas)}</td></tr>
      <tr><td>2. ค่าสมาชิก SaaS โรงแรมที่พัก (${num(H)} แห่ง × ฿${hotelSaasPrice})</td><td>${fmt(revHotelSaas)}</td></tr>
      <tr><td>3. บัตร Phitsanulok VIP Pass (${num(T * v)} ใบ × ฿${vipPrice})</td><td>${fmt(revVip)}</td></tr>
      <tr><td>4. ค่าธรรมเนียมสั่งอาหารและจองที่พัก 3-5% (GMV ${fmt(T * o * aov)})</td><td>${fmt(revFee)}</td></tr>
      <tr><td>− ต้นทุน Cloud Server &amp; Geospatial DB${stress ? ' ×2' : ''}</td><td>−${fmt(server)}</td></tr>
      <tr><td>− ต้นทุน AI Vision &amp; 6-Language Translation API${stress ? ' ×2' : ''}</td><td>−${fmt(aiCost)}</td></tr>
      <tr><td>− ทีมดูแลพาร์ทเนอร์ในพื้นที่พิษณุโลก (Fixed Ops)</td><td>−${fmt(ops)}</td></tr>
      <tr class="sum"><td>กำไร (ขาดทุน) สุทธิต่อเดือน</td><td>${profit < 0 ? '−' : ''}${fmt(Math.abs(profit))}</td></tr>
    </tbody></table>`;
}

export function initAdmin() {
  bindTablist(document.getElementById('admin-tabs'));
  Object.values(inputs).forEach((get) => get()?.addEventListener('input', calculate));
  document.getElementById('calc-reset')?.addEventListener('click', () => { if (metrics) resetCalculator(); });
  const st = document.getElementById('stress-toggle');
  st?.addEventListener('click', () => {
    stress = !stress;
    st.setAttribute('aria-pressed', String(stress));
    st.textContent = stress ? 'กลับสู่ต้นทุนปกติ (ยกเลิกสถานการณ์ต้นทุน 2 เท่า)' : 'จำลองสถานการณ์: ต้นทุนเซิร์ฟเวอร์และ API เพิ่มขึ้น 2 เท่า';
    calculate();
  });
  on('payment:success', () => { load(); });
}
