// Welcome page: live numbers, the 6-language switcher, the rotating headline and the photo reel.
import { LANGS, LANG_WORD, TITLE, HERO_FEATURES, STAT_UNITS, T } from './i18n-home.js';
import { getLang, setLang } from './site.js';

const LOCALE = { th: 'th-TH', en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR' };
let lang = getLang();

// ------------------------------------------------------------------ live numbers
const stats = { places: null, partners: null, passes: null, orders: null };

function renderStats() {
  const show = (id, n, unit) => {
    const el = document.getElementById(id);
    if (!el || n == null) return;
    el.textContent = `${Math.round(n).toLocaleString(LOCALE[lang])}${unit[lang] ?? unit.en}`;
  };
  show('hero-merchants', stats.places, STAT_UNITS.places);
  show('hero-confirmed', stats.partners, STAT_UNITS.places);
  show('hero-vip', stats.passes, STAT_UNITS.passes);
  show('hero-orders', stats.orders, STAT_UNITS.orders);
}

async function loadStats() {
  try {
    const res = await fetch('/api/metrics');
    if (!res.ok) return;
    const m = await res.json();
    stats.places = Number(m.totals?.placesOnMap) || ((Number(m.totals?.saas?.activeMerchants) || 0) + (Number(m.totals?.landmarksCount) || 5));
    stats.partners = Number(m.totals?.confirmedPartners) || Number(m.totals?.saas?.activeMerchants) || 8;
    stats.passes = Number(m.totals?.vip?.passesSold) || 0;
    stats.orders = Number(m.totals?.orders?.count) || 0;
    renderStats();
  } catch { /* keep pre-rendered numbers when offline */ }
}

// ------------------------------------------------------------------ language switcher
// Thai lives in the HTML; it is captured once so switching back restores the original wording.
const original = { text: new Map(), aria: new Map(), title: document.title };

function captureThai() {
  document.querySelectorAll('[data-i18n]').forEach((el) => original.text.set(el, el.innerHTML));
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => original.aria.set(el, el.getAttribute('aria-label')));
}

function applyLanguage(next) {
  lang = LANGS.includes(next) ? next : 'th';
  document.documentElement.lang = lang;
  document.title = lang === 'th' ? original.title : TITLE[lang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.innerHTML = lang === 'th' ? original.text.get(el) : (T[el.dataset.i18n]?.[lang] ?? original.text.get(el));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', lang === 'th' ? original.aria.get(el) : (T[el.dataset.i18nAria]?.[lang] ?? original.aria.get(el)));
  });
  // "Language" stays in English next to the native word so any visitor can find the switcher.
  const word = document.getElementById('hero-langs-word');
  if (word) word.textContent = lang === 'en' ? 'Language' : `${LANG_WORD[lang]} · Language`;
  document.querySelectorAll('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
  renderStats();
  fitHeadline();
  rotator.reset();
}

// The first headline line never breaks mid-word (e.g. Japanese has no spaces): it shrinks just enough to fit.
function fitHeadline() {
  const line = document.querySelector('.w-hero__line');
  if (!line) return;
  line.style.fontSize = '';
  const avail = line.parentElement.getBoundingClientRect().width;
  if (line.scrollWidth > avail) line.style.fontSize = `${Math.floor((avail / line.scrollWidth) * 100) / 100}em`;
}

function bindLanguageSwitcher() {
  document.querySelectorAll('[data-set-lang]').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.dataset.setLang === lang) return;
    setLang(btn.dataset.setLang);
  }));
  window.addEventListener('phitlok:lang', (e) => applyLanguage(e.detail));
}

// ------------------------------------------------------------------ rotating headline
// The highlighted line cycles through what the app does in the chosen language. Long phrases
// (e.g. French) shrink the line just enough to fit the column, decided once per language so the
// size does not jump between phrases. Reduced-motion visitors see the first phrase only.
const rotator = (() => {
  const word = document.getElementById('hero-rotator');
  const box = word && word.parentElement;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  let timer = null;

  const phrases = () => HERO_FEATURES[lang] || HERO_FEATURES.th;
  const fitScale = () => {
    box.style.fontSize = '';
    box.style.width = 'auto';
    const avail = box.parentElement.getBoundingClientRect().width;
    const pad = parseFloat(getComputedStyle(box).paddingLeft) * 2;
    const current = word.textContent;
    let widest = 0;
    for (const p of phrases()) { word.textContent = p; widest = Math.max(widest, word.scrollWidth + pad); }
    word.textContent = current;
    if (widest > avail) box.style.fontSize = `${Math.floor((avail / widest) * 100) / 100}em`;
  };
  // The highlight box glides to the width of the next phrase instead of jumping.
  const fitWidth = () => { box.style.width = `${word.scrollWidth}px`; };
  const tick = () => {
    box.classList.remove('is-ticking');
    void box.offsetWidth; // restart the progress bar
    box.classList.add('is-ticking');
  };
  const next = () => {
    if (document.hidden) return;
    word.classList.add('is-out');
    setTimeout(() => {
      i = (i + 1) % phrases().length;
      word.textContent = phrases()[i];
      word.lang = lang;
      word.classList.remove('is-out');
      word.classList.add('is-in');
      fitWidth();
      tick();
      requestAnimationFrame(() => requestAnimationFrame(() => word.classList.remove('is-in')));
    }, 320);
  };

  return {
    reset() {
      if (!word) return;
      i = 0;
      word.textContent = phrases()[0];
      word.lang = lang;
      fitScale();
      fitWidth();
      if (still) return;
      clearInterval(timer);
      timer = setInterval(next, 2800);
      tick();
    },
    refit() { if (word) { fitScale(); fitWidth(); } }
  };
})();

// ------------------------------------------------------------------ photo reel pause
function bindFilmToggle() {
  const film = document.getElementById('hero-film');
  const btn = document.getElementById('film-toggle');
  if (!film || !btn) return;
  btn.addEventListener('click', () => {
    const paused = !film.classList.contains('is-paused');
    film.classList.toggle('is-paused', paused);
    btn.setAttribute('aria-pressed', String(paused));
  });
}

if (window.lucide && typeof window.lucide.createIcons === 'function') {
  try { window.lucide.createIcons(); } catch { /* ignore */ }
}
captureThai();
bindLanguageSwitcher();
applyLanguage(lang);
window.addEventListener('resize', () => { fitHeadline(); rotator.refit(); });
document.fonts?.ready.then(() => { fitHeadline(); rotator.refit(); });
loadStats();
bindFilmToggle();
window.addEventListener('phitlok:vip-activated', () => loadStats());
