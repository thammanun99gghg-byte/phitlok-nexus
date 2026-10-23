// Shared behaviour for every page (/, /app, /credits):
// 1. Persistent Light / Dark Theme Switcher (localStorage.getItem('phitlok_theme'))
// 2. Global SVG Image Fallback protection (100% zero broken images)
// 3. Mobile navigation menu

const THEME_KEY = 'phitlok_theme';

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* ignore */ }
  return 'light';
}

export function applyTheme(theme, { persist = false } = {}) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = normalized;
  document.documentElement.style.colorScheme = normalized;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', normalized === 'dark' ? '#081112' : '#FAF8F5');
  if (persist) {
    try { localStorage.setItem(THEME_KEY, normalized); } catch { /* ignore */ }
  }
  document.querySelectorAll('[data-theme-toggle], #theme-toggle').forEach((btn) => {
    const isDark = normalized === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    const labelEl = btn.querySelector('.theme-toggle__label');
    if (labelEl) {
      labelEl.textContent = isDark ? '🌙 โหมดมืด (สลับเป็น ☀️ สว่าง)' : '☀️ สว่าง / 🌙 มืด';
    }
  });
  window.dispatchEvent(new CustomEvent('phitlok:theme', { detail: normalized }));
}

// Apply saved theme immediately to prevent flash when navigating between /, /app, and /credits
applyTheme(getSavedTheme(), { persist: false });

function bindThemeToggle() {
  applyTheme(getSavedTheme(), { persist: false });
  document.querySelectorAll('[data-theme-toggle], #theme-toggle').forEach((btn) => {
    if (btn.dataset.themeBound === '1') return;
    btn.dataset.themeBound = '1';
    btn.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, { persist: true });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindThemeToggle);
} else {
  bindThemeToggle();
}

// Global 100% SVG fallback for any image error across all pages
export function makeSvgFallback(label = 'PHITLOK NEXUS') {
  const safe = String(label || 'PHITLOK NEXUS').replace(/[<>&"']/g, '').slice(0, 36);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0F3D3E"/>
        <stop offset="100%" stop-color="#1E3A8A"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#g)"/>
    <circle cx="400" cy="210" r="56" fill="rgba(184,134,11,0.25)" stroke="#B8860B" stroke-width="3"/>
    <path d="M400 168 L422 212 H378 Z M370 220 H430 V232 H370 Z M360 238 H440 V252 H360 Z" fill="#E6B422"/>
    <text x="400" y="320" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="bold">${safe}</text>
    <text x="400" y="355" text-anchor="middle" fill="#FFD97D" font-family="sans-serif" font-size="16">PHITLOK NEXUS · Verified Real-World Location</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

window.addEventListener('error', (e) => {
  const img = e.target;
  if (!img || img.tagName !== 'IMG') return;
  const fb = img.getAttribute('data-fallback');
  if (fb && img.getAttribute('src') !== fb && !img.dataset.triedFallback) {
    img.dataset.triedFallback = '1';
    img.src = fb;
    return;
  }
  if (!img.dataset.triedSvg) {
    img.dataset.triedSvg = '1';
    img.src = makeSvgFallback(img.getAttribute('alt') || 'PHITLOK NEXUS');
  }
}, true);

// Mobile navigation toggle
const toggle = document.getElementById('menu-toggle');
const panel = document.getElementById('mobile-nav');

if (toggle && panel) {
  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'ปิดเมนูหน้าเว็บ' : 'เปิดเมนูหน้าเว็บ');
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (mq) => { if (mq.matches) setOpen(false); });
}
