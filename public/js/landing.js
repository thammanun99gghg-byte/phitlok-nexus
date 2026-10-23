// Welcome page: fill the live-number strip from the platform metrics API & rotate 6 languages.
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('th-TH');

async function loadStats() {
  try {
    const res = await fetch('/api/metrics');
    if (!res.ok) return;
    const m = await res.json();
    const totalPlaces = Number(m.totals?.placesOnMap) || ((Number(m.totals?.saas?.activeMerchants) || 0) + (Number(m.totals?.landmarksCount) || 5));
    const confirmedPartners = Number(m.totals?.confirmedPartners) || 0;
    const passesSold = Number(m.totals?.vip?.passesSold) || 0;
    const ordersCount = Number(m.totals?.orders?.count) || 0;
    const heritageScans = Number(m.counters?.heritageScans) || 0;
    const values = {
      'hero-merchants': `${fmt(totalPlaces)} แห่ง`,
      'hero-confirmed': `${fmt(confirmedPartners)} แห่ง`,
      'hero-langs': '6 ภาษา',
      'hero-vip': `${fmt(passesSold)} ใบ (ข้อมูลสาธิต)`,
      'hero-orders': `${fmt(ordersCount)} รายการ (ข้อมูลสาธิต)`,
      'hero-scans': `${fmt(heritageScans)} ครั้ง (ข้อมูลสาธิต)`
    };
    for (const [id, v] of Object.entries(values)) {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    }
  } catch { /* keep pre-rendered numbers when offline */ }
}

function startRotator() {
  const el = document.getElementById('rotator');
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const words = [
    ['ภาษาไทย (TH)', 'th'],
    ['English (EN)', 'en'],
    ['中文 (CN)', 'zh'],
    ['日本語 (JP)', 'ja'],
    ['한국어 (KR)', 'ko'],
    ['Français (FR)', 'fr']
  ];
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    el.classList.add('is-out');
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i][0];
      el.lang = words[i][1];
      el.classList.remove('is-out');
    }, 350);
  }, 2200);
}

if (window.lucide && typeof window.lucide.createIcons === 'function') {
  try { window.lucide.createIcons(); } catch { /* ignore */ }
}
loadStats();
startRotator();
