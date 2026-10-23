// Welcome page: fill the live-number strip from the platform metrics API & rotate 6 languages.
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('th-TH');

async function loadStats() {
  try {
    const res = await fetch('/api/metrics');
    if (!res.ok) return;
    const m = await res.json();
    const totalPins = (Number(m.totals?.saas?.activeMerchants) || 8) + 5;
    const values = {
      'hero-merchants': `${fmt(totalPins)} แห่ง`,
      'hero-vip': `${fmt(m.totals?.vip?.passesSold || 48)} ใบ`,
      'hero-orders': `${fmt(m.totals?.orders?.count || 126)} รายการ`,
      'hero-scans': `${fmt(m.counters?.heritageScans || 340)} ครั้ง`
    };
    for (const [id, v] of Object.entries(values)) {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    }
  } catch { /* keep pre-rendered seed numbers when offline */ }
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
