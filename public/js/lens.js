// AI Universal Smart Lens & 6-Language Audio Guide — PHITLOK NEXUS v2.3
import { state, api, esc, tr, LANGS, langSwitcher, emit, on, toast, atLeast, sleep, refreshIcons, svgFallbackUrl, shortLabel } from './core.js';
import { renderDigitalMenu } from './menu.js';
import { isVipActive } from './site.js';
import { t, builtYear, errText } from './i18n.js';

// Sign photos for the 5 presets; the caption is the preset's name in the visitor's language.
const SIGN_IMAGES = {
  'wat-yai': '/assets/photos/wat-yai.jpg',
  'chan-palace': '/assets/photos/chan-palace.jpg',
  'wat-nang-phaya': '/assets/photos/wat-nang-phaya.jpg',
  'wat-ratchaburana': '/assets/photos/wat-ratchaburana.jpg',
  'city-pillar': '/assets/photos/city-pillar.jpg'
};
const MAX_UPLOAD = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

let lastHeritage = null;
let menuCtx = null;
let stayCtx = null;
const TABS = ['heritage', 'menu', 'stay'];
const isStay = (m) => m.kind === 'hotel' || m.category === 'stay';
let previewUrl = null;
let isPaused = false;
let speakingKey = null; // `${landmarkId}|${lang}` of the narration in the engine

// ------------------------------------------------------------------ tabs
export function selectTab(which, { focus = false } = {}) {
  const tabs = TABS.map((id) => document.getElementById(`tab-${id}`)).filter(Boolean);
  tabs.forEach((t) => {
    const onTab = t.id === `tab-${which}`;
    t.setAttribute('aria-selected', String(onTab));
    t.tabIndex = onTab ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = !onTab;
    if (onTab && focus) t.focus();
  });
  // the stay tab opens on the hotel already chosen in its list
  if (which === 'stay' && !document.querySelector('#stay-result .menu-list')) {
    const sel = document.getElementById('stay-merchant');
    if (sel?.value) openMerchantMenu(sel.value, { scroll: false });
  }
}

function bindTabs() {
  const list = document.querySelector('.tabs');
  if (!list) return;
  list.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (t) selectTab(t.id.replace('tab-', ''));
  });
  list.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const current = TABS.findIndex((id) => document.getElementById(`tab-${id}`)?.getAttribute('aria-selected') === 'true');
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    selectTab(TABS[next], { focus: true });
  });
}

// ------------------------------------------------------------------ helpers
function validateFile(file) {
  if (!file) return t('file.none');
  if (!ALLOWED.includes(file.type)) return t('file.type');
  if (file.size > MAX_UPLOAD) return t('file.size');
  return null;
}

function showPreview(prefix, src, caption) {
  const fig = document.getElementById(`${prefix}-preview`);
  const img = document.getElementById(`${prefix}-preview-img`);
  if (!fig || !img) return;
  img.src = src;
  img.alt = caption;
  document.getElementById(`${prefix}-preview-cap`).textContent = caption;
  fig.hidden = false;
  fig.querySelector('.scan-frame')?.classList.add('scanning');
}

function stopScanning(prefix) {
  document.querySelector(`#${prefix}-preview .scan-frame`)?.classList.remove('scanning');
}

function setStep(prefix, step, status) {
  const list = document.getElementById(`${prefix}-pipeline`);
  if (!list) return;
  list.hidden = false;
  if (step === 'reset') { list.querySelectorAll('li').forEach((li) => li.classList.remove('is-active', 'is-done')); return; }
  const li = list.querySelector(`[data-step="${step}"]`);
  if (li) {
    li.classList.toggle('is-active', status === 'active');
    li.classList.toggle('is-done', status === 'done');
  }
}

async function animatePipeline(prefix, requestPromise) {
  setStep(prefix, 'reset');
  setStep(prefix, 'ocr', 'active');
  await sleep(320);
  setStep(prefix, 'ocr', 'done');
  setStep(prefix, 'rag', 'active');
  const result = await atLeast(requestPromise, 280);
  setStep(prefix, 'rag', 'done');
  setStep(prefix, 'i18n', 'active');
  await sleep(180);
  setStep(prefix, 'i18n', 'done');
  return result;
}

function sourceBadge(source, latency) {
  const label = {
    preset: `<span class="badge badge--gold">${esc(t('src.preset'))}</span>`,
    gemini: '<span class="badge badge--ok">AI: Gemini Vision</span>',
    fallback: `<span class="badge badge--warn">${esc(t('src.fallback'))}</span>`
  }[source] || '';
  return `${label}<span class="badge">${esc(t('src.latency', { n: latency }))}</span><a class="badge badge--ok" href="/credits#sources">${esc(t('ref.fad'))}</a>`;
}

// ------------------------------------------------------------------ Mode A
export async function runHeritage({ preset, file }) {
  const out = document.getElementById('heritage-result');
  const busy = [...document.querySelectorAll('[data-heritage-preset]')];
  busy.forEach((b) => { b.disabled = true; });
  if (file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    showPreview('heritage', previewUrl, t('lens.uploaded', { name: file.name }));
  } else if (SIGN_IMAGES[preset]) {
    showPreview('heritage', SIGN_IMAGES[preset], t(`preset.${preset}`));
  } else {
    document.getElementById('heritage-preview').hidden = true;
  }
  out.innerHTML = `<div class="empty"><p class="empty__title">${esc(t('lens.reading'))}</p><p class="muted">${esc(t('lens.readingSub'))}</p></div>`;

  const form = new FormData();
  if (file) form.append('image', file);
  else form.append('preset', preset);
  try {
    const result = await animatePipeline('heritage', api('/api/scan-heritage', { method: 'POST', form }));
    lastHeritage = result;
    if (result.visitor) state.data.visitor = result.visitor;
    renderHeritage();
    if (result.visitor) emit('visitor:updated', result.visitor);
  } catch (err) {
    out.innerHTML = `<p class="notice notice--warn">${esc(errText(err))}</p>`;
    toast(errText(err), 'error');
  } finally {
    stopScanning('heritage');
    busy.forEach((b) => { b.disabled = false; });
  }
}

function renderHeritage() {
  const out = document.getElementById('heritage-result');
  const r = lastHeritage;
  if (!r || !out) return;
  const lang = state.lang;
  if (!r.matched) {
    out.innerHTML = `
      <div class="result-head"><div class="badges">${sourceBadge(r.source, r.latencyMs)}</div></div>
      <p class="notice">${esc(lang === 'th' ? r.notice : t('lens.noMatch'))}</p>
      ${r.ocrText ? `<details class="ocr" open><summary>${esc(t('lens.ocrText'))}</summary><pre lang="th">${esc(r.ocrText)}</pre></details>` : ''}
      <p><b>${esc(t('lens.choose'))}</b></p>
      <div class="choice-list">${r.choices.map((c) => `<button class="btn btn--outline" type="button" data-choose="${esc(c.id)}">${esc(tr(c.name))}</button>`).join('')}</div>`;
    refreshIcons();
    return;
  }
  const lm = r.landmark;
  const vip = Boolean(state.data?.visitor?.vip?.active || isVipActive());
  const rw = r.reward;
  const stampCount = state.data.visitor.stamps.length;
  const couponMerchants = state.data.merchants.filter((m) => m.stampCouponPercent > 0);
  const langMeta = LANGS.find((l) => l.code === lang) || LANGS[0];
  const gmapsUrl = lm.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lm.lat},${lm.lng}`;
  const svgFb = svgFallbackUrl(shortLabel(lm, lang));
  const ref = tr(lm.fineArtsRef) || t('ref.fadShort');

  out.innerHTML = `
    <div class="result-head">
      <div class="badges">${sourceBadge(r.source, r.latencyMs)}</div>
      ${langSwitcher(lang, 'h-lang')}
    </div>
    <div class="heritage-photo-card">
      <img src="${esc(lm.imageUrl || lm.fallbackImage)}"
           data-fallback="${esc(lm.fallbackImage || '/assets/photos/wat-yai.jpg')}"
           onerror="this.onerror=null;this.src='${esc(svgFb)}'"
           alt="${esc(tr(lm.name, lang))}" loading="lazy">
      <div class="heritage-photo-meta">
        <a class="badge badge--gold" href="/credits#sources">
          <i data-lucide="shield-check"></i> ${esc(t('lens.refYear', { y: builtYear(lm.builtYearBe) }))}
        </a>
        <a class="btn btn--outline btn--sm" href="${esc(gmapsUrl)}" target="_blank" rel="noopener">
          <i data-lucide="map-pin"></i> ${esc(t('card.gmaps'))}
        </a>
      </div>
    </div>
    <div class="heritage-body" lang="${lang}">
      <p class="eyebrow">${esc(t('lens.result', { c: Math.round(r.retrieval.confidence * 100), ref }))}</p>
      <h3>${esc(tr(lm.name, lang))}</h3>
      <p>${esc(tr(lm.summary, lang))}</p>
      ${lm.highlights && tr(lm.highlights, lang) ? `<p class="highlight-box"><b>${esc(t('lens.highlights'))}</b> ${esc(tr(lm.highlights, lang))}</p>` : ''}
    </div>
    <div class="audio-bar">
      <div class="audio-bar__controls">
        <button class="btn btn--primary" type="button" data-audio="summary">
          <i data-lucide="play"></i> ${esc(t('audio.play', { l: langMeta.short }))}
        </button>
        <button class="btn btn--outline" type="button" data-audio="pause" id="btn-audio-pause">
          <i data-lucide="pause"></i> ${esc(t('audio.pause'))}
        </button>
        <button class="btn btn--outline" type="button" data-audio="full">
          <i data-lucide="headphones"></i> ${esc(t(vip ? 'audio.full' : 'audio.fullLocked'))}
        </button>
        ${!vip ? `<button class="btn btn--vip-cta btn--sm" type="button" data-open-vip-modal><i data-lucide="crown"></i> ${esc(t('audio.unlock'))}</button>` : `<span class="badge badge--gold"><i data-lucide="crown"></i> ${esc(t('audio.vipActive'))}</span>`}
        <button class="btn btn--ghost" type="button" data-audio="stop">
          <i data-lucide="square"></i> ${esc(t('audio.stop'))}
        </button>
        <div class="soundwave" id="audio-soundwave" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <p class="muted" id="audio-status" aria-live="polite">${esc(t('audio.voice', { l: langMeta.label, ref }))}</p>
    </div>
    <div class="heritage-body" lang="${lang}">
      ${(lm.sections || []).map((sec) => `<h3>${esc(tr(sec.title, lang))}</h3><p>${esc(tr(sec.body, lang))}</p>`).join('')}
    </div>
    <details class="ocr"><summary>${esc(t('lens.ocrDetails'))}</summary>
      <pre lang="th">${esc(r.ocrText)}</pre>
      <p class="retrieval">${esc(t('lens.matched', { k: r.retrieval.matchedKeywords.join(', '), ref: tr(lm.fineArtsRef) || r.retrieval.corpus }))}</p>
    </details>
    ${rw && rw.eligible ? `<div class="reward" role="status">
      <p class="reward__title"><i data-lucide="award"></i> ${esc(t('reward.title', { n: stampCount }))}</p>
      <p>${esc(t('reward.text'))}</p>
      ${rw.issued.length ? `<p class="small">${t('reward.new', { c: rw.issued.map((c) => `<code>${esc(c.code)}</code>`).join(' · ') })}</p>` : `<p class="small">${esc(t('reward.already'))}</p>`}
      <div class="actions">
        ${couponMerchants.slice(0, 3).map((m) => `<button class="btn btn--primary btn--sm" type="button" data-order="${m.id}"><i data-lucide="utensils"></i> ${esc(t('reward.orderAt', { name: shortLabel(m, lang) }))}</button>`).join('')}
        <button class="btn btn--outline btn--sm" type="button" data-wallet><i data-lucide="ticket"></i> ${esc(t('aria.wallet'))}</button>
      </div>
    </div>` : ''}`;
  refreshIcons();
}

function setWavePlaying(playing) {
  document.querySelectorAll('.soundwave').forEach((el) => el.classList.toggle('is-playing', playing));
}

async function playAudio(mode) {
  const statusEl = document.getElementById('audio-status');
  const lang = state.lang;
  const synth = window.speechSynthesis;
  if (!synth) {
    toast(t('speech.unsupported'), 'error');
    return;
  }
  if (mode === 'stop') {
    synth.cancel();
    isPaused = false;
    setWavePlaying(false);
    if (statusEl) statusEl.textContent = t('speech.stopped');
    return;
  }
  if (mode === 'pause') {
    if (synth.speaking && !isPaused) {
      synth.pause();
      isPaused = true;
      setWavePlaying(false);
      if (statusEl) statusEl.textContent = t('speech.paused');
    } else if (isPaused) {
      synth.resume();
      isPaused = false;
      setWavePlaying(true);
      if (statusEl) statusEl.textContent = t('speech.resumed');
    }
    return;
  }
  const lm = lastHeritage?.landmark;
  if (isPaused && synth.speaking && mode === 'summary' && lm && speakingKey === `${lm.id}|${lang}`) {
    synth.resume();
    isPaused = false;
    setWavePlaying(true);
    if (statusEl) statusEl.textContent = t('speech.resumed');
    return;
  }
  if (!lm) return;
  await speakGuide(lm.id, mode, lang, statusEl);
}

/** Fetch the narration (server enforces VIP for full mode) and read it aloud in 6 languages. */
export async function speakGuide(landmarkId, mode, lang, statusEl) {
  if (!('speechSynthesis' in window)) {
    toast(t('speech.unsupported'), 'error');
    return;
  }
  // Always cancel any existing speech before fetching/playing new narration
  resetSynth();
  setWavePlaying(true);
  try {
    const vipFlag = (state.data?.visitor?.vip?.active || isVipActive()) ? '&vip=true' : '';
    const res = await api(`/api/audio-guide/${encodeURIComponent(landmarkId)}?lang=${lang}&mode=${mode}${vipFlag}`);
    await speak(res.text, lang, statusEl, `${landmarkId}|${lang}`);
  } catch (err) {
    setWavePlaying(false);
    if (err.data && err.data.needsVip) {
      toast(t('speech.needVip'), 'info');
      emit('vip:prompt');
      return;
    }
    toast(errText(err), 'error');
  }
}

// Chrome fills the voice list asynchronously: on the first click it is often still empty.
function loadVoices(timeout = 1500) {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => { synth.removeEventListener?.('voiceschanged', done); resolve(synth.getVoices()); };
    synth.addEventListener?.('voiceschanged', done);
    setTimeout(done, timeout);
  });
}

// Region preference when a language has several voices (Mandarin before Cantonese, etc.).
const PREFERRED = { zh: ['zh-cn', 'cmn-hans-cn', 'zh-tw', 'cmn'], en: ['en-us', 'en-gb'], fr: ['fr-fr', 'fr-ca'] };

/** A voice that really speaks this language, or null — never a voice of another language. */
function pickVoice(code, voices) {
  const norm = (s) => String(s || '').replace(/_/g, '-').toLowerCase();
  const want = norm(code);
  const base = want.split('-')[0];
  const same = voices.filter((v) => {
    const l = norm(v.lang);
    return l === want || l.split('-')[0] === base || (base === 'zh' && l.startsWith('cmn'));
  });
  if (!same.length) return null;
  const order = [want, ...(PREFERRED[base] || [])];
  same.sort((x, y) => {
    const rx = order.indexOf(norm(x.lang)), ry = order.indexOf(norm(y.lang));
    return (rx < 0 ? 99 : rx) - (ry < 0 ? 99 : ry) || Number(y.localService) - Number(x.localService);
  });
  return same[0];
}

// Chrome keeps the engine paused after cancel(); new speech then never starts.
function resetSynth() {
  const synth = window.speechSynthesis;
  if (synth.paused) synth.resume();
  synth.cancel();
  isPaused = false;
  speakingKey = null;
}

function chunkText(text, max = 180) {
  const out = [];
  for (const part of text.split(/(?<=[.!?。！？])\s+|\n+/)) {
    let cur = '';
    for (const word of part.split(/(\s+)/)) {
      if ((cur + word).length > max && cur.trim()) { out.push(cur.trim()); cur = ''; }
      cur += word;
      while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

async function speak(text, lang, statusEl, key) {
  const synth = window.speechSynthesis;
  resetSynth();
  const meta = LANGS.find((l) => l.code === lang) || LANGS[0];
  const voices = await loadVoices();
  const voice = pickVoice(meta.speech, voices);
  // The device lists voices but none for this language: reading it with another voice would be wrong, so say so instead.
  if (voices.length && !voice) {
    setWavePlaying(false);
    const msg = t('speech.noVoice', { l: meta.label });
    if (statusEl) statusEl.textContent = msg;
    toast(msg, 'info');
    return;
  }
  // a language switch while voices were loading wins over this older request
  if (lang !== state.lang) { setWavePlaying(false); return; }
  const chunks = chunkText(text);
  speakingKey = key;
  setWavePlaying(true);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = meta.speech;
    if (voice) u.voice = voice;
    u.rate = 0.95; // Specified rate = 0.95 for clear historical narration
    if (i === 0) {
      u.onstart = () => {
        setWavePlaying(true);
        if (statusEl) statusEl.textContent = t('speech.playing', { l: meta.label });
        else toast(t('speech.toast', { l: meta.label }), 'ok');
      };
    }
    if (i === chunks.length - 1) {
      u.onend = () => {
        setWavePlaying(false);
        isPaused = false;
        if (statusEl) statusEl.textContent = t('speech.done');
      };
    }
    u.onerror = (e) => {
      setWavePlaying(false);
      if (statusEl && e.error !== 'interrupted' && e.error !== 'canceled') {
        statusEl.textContent = t('speech.fail');
      }
    };
    synth.speak(u);
  });
  if (!voice && statusEl) {
    statusEl.textContent = t('speech.system', { l: meta.label });
  }
}

// ------------------------------------------------------------------ Mode B
export async function runMenuPreset() {
  selectTab('menu');
  showPreview('menu', '/assets/menu-hoi-kha.svg', t('menu.previewCap'));
  await scanMenu(() => {
    const form = new FormData();
    form.append('preset', 'hoi-kha');
    return form;
  });
}

async function runMenuUpload(file) {
  const merchantId = document.getElementById('menu-merchant').value;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  showPreview('menu', previewUrl, t('lens.uploaded', { name: file.name }));
  await scanMenu(() => {
    const form = new FormData();
    form.append('merchantId', merchantId);
    form.append('image', file);
    return form;
  });
}

async function scanMenu(buildForm) {
  const out = document.getElementById('menu-result');
  out.innerHTML = `<div class="empty"><p class="empty__title">${esc(t('menu.reading'))}</p><p class="muted">${esc(t('menu.readingSub'))}</p></div>`;
  const btn = document.getElementById('menu-preset');
  if (btn) btn.disabled = true;
  try {
    const r = await animatePipeline('menu', api('/api/scan-menu', { method: 'POST', form: buildForm() }));
    syncMenuSelect(r.merchant?.id);
    menuCtx = renderDigitalMenu(out, {
      merchant: r.merchant, items: r.items, source: r.source, latencyMs: r.latencyMs,
      notice: r.notice, ocrText: r.ocrText, scanId: r.scanId, orderable: true
    });
  } catch (err) {
    out.innerHTML = `<p class="notice notice--warn">${esc(errText(err))}</p>`;
    toast(errText(err), 'error');
  } finally {
    stopScanning('menu');
    if (btn) btn.disabled = false;
  }
}

/** Show a shop's menu (food tab) or a hotel's rooms (stay tab) — never both in one place. */
export function openMerchantMenu(merchantId, { scroll = true } = {}) {
  const merchant = state.data.merchants.find((m) => m.id === Number(merchantId) || m.slug === String(merchantId));
  if (!merchant) return;
  if (isStay(merchant)) { openStay(merchant, scroll); return; }
  syncMenuSelect(merchant.id);
  const items = state.data.menuItems.filter((i) => i.merchantId === merchant.id);
  selectTab('menu');
  const prev = document.getElementById('menu-preview');
  const pipe = document.getElementById('menu-pipeline');
  if (prev) prev.hidden = true;
  if (pipe) pipe.hidden = true;
  const out = document.getElementById('menu-result');
  if (!items.length) {
    out.innerHTML = `<div class="empty"><p class="empty__title">${esc(t('menu.noItems', { name: tr(merchant.name) }))}</p>
      <button class="btn btn--primary" type="button" data-try-preset>${esc(t('menu.presetBtn'))}</button></div>`;
    out.onclick = (e) => { if (e.target.closest('[data-try-preset]')) runMenuPreset(); };
  } else {
    menuCtx = renderDigitalMenu(out, { merchant, items, source: 'database', orderable: true });
  }
  if (scroll) document.getElementById('lens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openStay(hotel, scroll) {
  const sel = document.getElementById('stay-merchant');
  if (sel) sel.value = String(hotel.id);
  if (document.getElementById('tab-stay')?.getAttribute('aria-selected') !== 'true') {
    const tabs = TABS.map((id) => document.getElementById(`tab-${id}`)).filter(Boolean);
    tabs.forEach((tb) => {
      const on = tb.id === 'tab-stay';
      tb.setAttribute('aria-selected', String(on));
      tb.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(tb.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  }
  // rooms read cheapest to most expensive
  const rooms = state.data.menuItems.filter((i) => i.merchantId === hotel.id).sort((a, b) => a.priceSatang - b.priceSatang);
  const out = document.getElementById('stay-result');
  if (!rooms.length) {
    out.innerHTML = `<div class="empty"><p class="empty__title">${esc(t('menu.noItems', { name: tr(hotel.name) }))}</p></div>`;
    stayCtx = null;
  } else {
    stayCtx = renderDigitalMenu(out, { merchant: hotel, items: rooms, source: 'database', orderable: true });
  }
  if (scroll) document.getElementById('lens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function syncMenuSelect(id) {
  const sel = document.getElementById('menu-merchant');
  if (sel && id != null) sel.value = String(id);
}

// ------------------------------------------------------------------ wiring
export function initLens() {
  bindTabs();
  document.querySelectorAll('[data-heritage-preset]').forEach((b) =>
    b.addEventListener('click', () => runHeritage({ preset: b.dataset.heritagePreset })));
  document.getElementById('heritage-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const err = validateFile(file);
    e.target.value = '';
    if (err) { toast(err, 'error'); return; }
    runHeritage({ file });
  });
  document.getElementById('menu-preset')?.addEventListener('click', runMenuPreset);
  // choosing a shop or hotel from the list shows its own menu or rooms right away
  document.getElementById('menu-merchant')?.addEventListener('change', (e) => openMerchantMenu(e.target.value, { scroll: false }));
  document.getElementById('stay-merchant')?.addEventListener('change', (e) => openMerchantMenu(e.target.value, { scroll: false }));
  document.getElementById('menu-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const err = validateFile(file);
    e.target.value = '';
    if (err) { toast(err, 'error'); return; }
    runMenuUpload(file);
  });

  document.getElementById('heritage-result')?.addEventListener('click', (e) => {
    const langBtn = e.target.closest('[data-h-lang]');
    if (langBtn) { state.lang = langBtn.dataset.hLang; emit('lang:changed', state.lang); return; }
    const audio = e.target.closest('[data-audio]');
    if (audio) { playAudio(audio.dataset.audio); return; }
    const choose = e.target.closest('[data-choose]');
    if (choose) { runHeritage({ preset: choose.dataset.choose }); return; }
    const order = e.target.closest('[data-order]');
    if (order) { openMerchantMenu(order.dataset.order); return; }
    if (e.target.closest('[data-wallet]')) emit('wallet:open');
  });

  on('lang:changed', () => {
    if (window.speechSynthesis) resetSynth();
    setWavePlaying(false);
    renderHeritage();
    if (menuCtx && document.querySelector('#menu-result .menu-list')) menuCtx.redraw();
    if (stayCtx && document.querySelector('#stay-result .menu-list')) stayCtx.redraw();
  });
  on('cart:changed', () => {
    if (menuCtx && document.querySelector('#menu-result .menu-list')) menuCtx.redraw();
    if (stayCtx && document.querySelector('#stay-result .menu-list')) stayCtx.redraw();
  });
  on('visitor:changed', () => renderHeritage());
  window.addEventListener('phitlok:vip-activated', () => renderHeritage());
  on('menu:open-preset', () => { runMenuPreset(); document.getElementById('lens')?.scrollIntoView({ behavior: 'smooth' }); });
}
