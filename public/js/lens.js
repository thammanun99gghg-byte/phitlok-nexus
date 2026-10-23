// AI Universal Smart Lens & 6-Language Audio Guide — PHITLOK NEXUS v2.2
import { state, api, esc, tr, LANGS, langSwitcher, emit, on, toast, atLeast, sleep, refreshIcons, svgFallbackUrl } from './core.js';
import { renderDigitalMenu } from './menu.js';

const SIGN_IMAGES = {
  'wat-yai': { src: '/assets/photos/wat-yai.jpg', cap: 'วัดพระศรีรัตนมหาธาตุวรมหาวิหาร (วัดใหญ่) — พิกัด 16.8239, 100.2624' },
  'chan-palace': { src: '/assets/photos/chan-palace.jpg', cap: 'โบราณสถานพระราชวังจันทน์ — พิกัด 16.8286, 100.2581' },
  'wat-nang-phaya': { src: '/assets/photos/wat-nang-phaya.jpg', cap: 'วัดนางพญา (ต้นกำเนิดพระนางพญา เบญจภาคี) — พิกัด 16.8221, 100.2631' },
  'wat-ratchaburana': { src: '/assets/photos/wat-ratchaburana.jpg', cap: 'วัดราชบูรณะ (เจดีย์หลวง 700 ปี) — พิกัด 16.8208, 100.2635' },
  'city-pillar': { src: '/assets/photos/city-pillar.jpg', cap: 'ศาลหลักเมืองพิษณุโลก — พิกัด 16.8262, 100.2595' }
};
const MAX_UPLOAD = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

let lastHeritage = null;
let menuCtx = null;
let previewUrl = null;
let isPaused = false;

// ------------------------------------------------------------------ tabs
export function selectTab(which, { focus = false } = {}) {
  const tabs = [document.getElementById('tab-heritage'), document.getElementById('tab-menu')].filter(Boolean);
  tabs.forEach((t) => {
    const onTab = t.id === `tab-${which}`;
    t.setAttribute('aria-selected', String(onTab));
    t.tabIndex = onTab ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = !onTab;
    if (onTab && focus) t.focus();
  });
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
    const current = document.getElementById('tab-heritage').getAttribute('aria-selected') === 'true' ? 'heritage' : 'menu';
    selectTab(current === 'heritage' ? 'menu' : 'heritage', { focus: true });
  });
}

// ------------------------------------------------------------------ helpers
function validateFile(file) {
  if (!file) return 'ไม่ได้เลือกไฟล์';
  if (!ALLOWED.includes(file.type)) return 'รองรับเฉพาะไฟล์ .jpg .png .webp';
  if (file.size > MAX_UPLOAD) return 'ไฟล์ใหญ่เกิน 5MB กรุณาย่อขนาดภาพ';
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
    preset: '<span class="badge badge--gold">Preset · ฐานข้อมูลกรมศิลปากร</span>',
    gemini: '<span class="badge badge--ok">AI: Gemini Vision OCR</span>',
    fallback: '<span class="badge badge--warn">โหมดสำรอง</span>'
  }[source] || '';
  return `${label}<span class="badge">ตอบกลับ ${latency} ms</span><a class="badge badge--ok" href="/credits#sources" title="คลิกดูหลักฐานทะเบียนโบราณสถาน กรมศิลปากร">Verified by Fine Arts Dept. ↗</a>`;
}

// ------------------------------------------------------------------ Mode A
export async function runHeritage({ preset, file }) {
  const out = document.getElementById('heritage-result');
  const busy = [...document.querySelectorAll('[data-heritage-preset]')];
  busy.forEach((b) => { b.disabled = true; });
  if (file) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    showPreview('heritage', previewUrl, `ภาพที่อัปโหลด: ${file.name}`);
  } else if (SIGN_IMAGES[preset]) {
    showPreview('heritage', SIGN_IMAGES[preset].src, SIGN_IMAGES[preset].cap);
  } else {
    document.getElementById('heritage-preview').hidden = true;
  }
  out.innerHTML = '<div class="empty"><p class="empty__title">กำลังอ่านป้ายและดึงข้อมูลกรมศิลปากร…</p><p class="muted">OCR → ค้นคืนข้อมูล (RAG) → จัดเนื้อหาและเสียงบรรยาย 6 ภาษา</p></div>';

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
    out.innerHTML = `<p class="notice notice--warn">${esc(err.message)}</p>`;
    toast(err.message, 'error');
  } finally {
    stopScanning('heritage');
    busy.forEach((b) => { b.disabled = false; });
  }
}

function renderHeritage() {
  const out = document.getElementById('heritage-result');
  const r = lastHeritage;
  if (!r || !out) return;
  if (!r.matched) {
    out.innerHTML = `
      <div class="result-head"><div class="badges">${sourceBadge(r.source, r.latencyMs)}</div></div>
      <p class="notice">${esc(r.notice)}</p>
      ${r.ocrText ? `<details class="ocr" open><summary>ข้อความที่ OCR อ่านได้</summary><pre>${esc(r.ocrText)}</pre></details>` : ''}
      <p><b>เลือกโบราณสถานที่ต้องการดูข้อมูลและฟังเสียงบรรยาย 6 ภาษา:</b></p>
      <div class="choice-list">${r.choices.map((c) => `<button class="btn btn--outline" type="button" data-choose="${esc(c.id)}">${esc(c.name.th)}</button>`).join('')}</div>`;
    refreshIcons();
    return;
  }
  const lang = state.lang;
  const lm = r.landmark;
  const vip = state.data.visitor.vip.active;
  const rw = r.reward;
  const stampCount = state.data.visitor.stamps.length;
  const couponMerchants = state.data.merchants.filter((m) => m.stampCouponPercent > 0);
  const langMeta = LANGS.find((l) => l.code === lang) || LANGS[0];
  const gmapsUrl = lm.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${lm.lat},${lm.lng}`;
  const satUrl = `https://www.google.com/maps/@?api=1&map_action=map&center=${lm.lat},${lm.lng}&zoom=18&basemap=satellite`;
  const svgFb = svgFallbackUrl(tr(lm.name, lang));

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
        <a class="gps-pill" href="${esc(satUrl)}" target="_blank" rel="noopener" title="คลิกเปิดดูพิกัดดาวเทียมและ Street View บน Google Maps">
          <i data-lucide="map-pin"></i> GPS: <code>${lm.lat.toFixed(4)}, ${lm.lng.toFixed(4)}</code> ↗
        </a>
        <a class="badge badge--gold" href="/credits#sources" title="ดูรายละเอียดทะเบียนโบราณสถาน กรมศิลปากร">
          <i data-lucide="shield-check"></i> Verified by Fine Arts Dept. · พ.ศ. ${esc(lm.builtYearBe || '-')} ↗
        </a>
        <a class="btn btn--outline btn--sm" href="${esc(gmapsUrl)}" target="_blank" rel="noopener">
          <i data-lucide="globe"></i> เปิดดูสถานที่จริงบน Google Maps / Google Earth 3D
        </a>
      </div>
    </div>
    <div class="heritage-body" lang="${lang}">
      <p class="eyebrow" lang="th">ผลการสแกน · ความมั่นใจ ${Math.round(r.retrieval.confidence * 100)}% · อ้างอิง: ${esc(tr(lm.fineArtsRef) || 'กรมศิลปากร')}</p>
      <h3>${esc(tr(lm.name, lang))}</h3>
      <p>${esc(tr(lm.summary, lang))}</p>
      ${lm.highlights && tr(lm.highlights, lang) ? `<p class="highlight-box"><b>จุดเด่นสำคัญ:</b> ${esc(tr(lm.highlights, lang))}</p>` : ''}
    </div>
    <div class="audio-bar" lang="th">
      <div class="audio-bar__controls">
        <button class="btn btn--primary" type="button" data-audio="summary">
          <i data-lucide="play"></i> ▶ เล่นเสียงบรรยาย (${esc(langMeta.short)})
        </button>
        <button class="btn btn--outline" type="button" data-audio="pause" id="btn-audio-pause">
          <i data-lucide="pause"></i> ⏸ หยุดชั่วคราว
        </button>
        <button class="btn btn--outline" type="button" data-audio="full">
          <i data-lucide="headphones"></i> ${vip ? 'ฟังฉบับเต็ม (VIP)' : 'ฉบับเต็ม (VIP Pass)'}
        </button>
        <button class="btn btn--ghost" type="button" data-audio="stop">
          <i data-lucide="square"></i> ⏹ หยุด
        </button>
        <div class="soundwave" id="audio-soundwave" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <p class="muted" id="audio-status" aria-live="polite">ภาษาเสียง: <b>${esc(langMeta.label)}</b> (${esc(langMeta.speech)}, rate = 0.95) · แหล่งอ้างอิง: ${esc(tr(lm.fineArtsRef) || 'กรมศิลปากร')}</p>
    </div>
    <div class="heritage-body" lang="${lang}">
      ${(lm.sections || []).map((s) => `<h3>${esc(tr(s.title, lang))}</h3><p>${esc(tr(s.body, lang))}</p>`).join('')}
    </div>
    <details class="ocr"><summary lang="th">ข้อความที่ OCR อ่านได้ &amp; แหล่งอ้างอิงกรมศิลปากร (RAG)</summary>
      <pre lang="th">${esc(r.ocrText)}</pre>
      <p class="retrieval" lang="th">คำสำคัญที่จับคู่ได้: ${r.retrieval.matchedKeywords.map(esc).join(', ')} · แหล่งอ้างอิง: ${esc(tr(lm.fineArtsRef) || r.retrieval.corpus)}</p>
    </details>
    ${rw && rw.eligible ? `<div class="reward" role="status" lang="th">
      <p class="reward__title"><i data-lucide="award"></i> สะสมตราประทับมรดกพิษณุโลกสำเร็จ! (${stampCount}/5 โบราณสถาน)</p>
      <p>รับสิทธิ์คูปองส่วนลด 15% ที่ร้านอาหารและโรงแรมพาร์ทเนอร์รอบวัดใหญ่–พระราชวังจันทน์</p>
      ${rw.issued.length ? `<p class="small">คูปองใหม่: ${rw.issued.map((c) => `<code>${esc(c.code)}</code>`).join(' · ')}</p>` : '<p class="small">คุณได้รับคูปองชุดนี้แล้ว — ดูได้ในกระเป๋าคูปอง</p>'}
      <div class="actions">
        ${couponMerchants.slice(0, 3).map((m) => `<button class="btn btn--primary btn--sm" type="button" data-order="${m.id}"><i data-lucide="utensils"></i> สั่งที่ ${esc(m.name.th.split(' (')[0])}</button>`).join('')}
        <button class="btn btn--outline btn--sm" type="button" data-wallet><i data-lucide="ticket"></i> ดูคูปองของฉัน</button>
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
    toast('เบราว์เซอร์นี้ไม่รองรับเสียงสังเคราะห์ (Web Speech API)', 'error');
    return;
  }
  if (mode === 'stop') {
    synth.cancel();
    isPaused = false;
    setWavePlaying(false);
    if (statusEl) statusEl.textContent = 'หยุดเสียงบรรยายแล้ว';
    return;
  }
  if (mode === 'pause') {
    if (synth.speaking && !isPaused) {
      synth.pause();
      isPaused = true;
      setWavePlaying(false);
      if (statusEl) statusEl.textContent = 'หยุดเสียงบรรยายชั่วคราว (กด ▶ เล่นเสียงบรรยาย หรือ ⏸ เพื่อเล่นต่อ)';
    } else if (isPaused) {
      synth.resume();
      isPaused = false;
      setWavePlaying(true);
      if (statusEl) statusEl.textContent = 'กำลังเล่นเสียงบรรยายต่อ…';
    }
    return;
  }
  if (isPaused && synth.speaking && mode === 'summary') {
    synth.resume();
    isPaused = false;
    setWavePlaying(true);
    if (statusEl) statusEl.textContent = 'กำลังเล่นเสียงบรรยายต่อ…';
    return;
  }
  const lm = lastHeritage?.landmark;
  if (!lm) return;
  await speakGuide(lm.id, mode, lang, statusEl);
}

/** Fetch the narration (server enforces VIP for full mode) and read it aloud in 6 languages. */
export async function speakGuide(landmarkId, mode, lang, statusEl) {
  if (!('speechSynthesis' in window)) {
    toast('เบราว์เซอร์นี้ไม่รองรับเสียงสังเคราะห์ (Web Speech API)', 'error');
    return;
  }
  // Always cancel any existing speech before fetching/playing new narration
  window.speechSynthesis.cancel();
  isPaused = false;
  setWavePlaying(true);
  try {
    const res = await api(`/api/audio-guide/${encodeURIComponent(landmarkId)}?lang=${lang}&mode=${mode}`);
    speak(res.text, lang, statusEl);
  } catch (err) {
    setWavePlaying(false);
    if (err.data && err.data.needsVip) {
      toast('เสียงบรรยายฉบับเต็มสำหรับผู้ถือบัตร Phitsanulok VIP Pass (99฿)', 'info');
      emit('vip:prompt');
      return;
    }
    toast(err.message, 'error');
  }
}

function pickVoice(code) {
  const voices = window.speechSynthesis.getVoices();
  const prefix = code.slice(0, 2).toLowerCase();
  return voices.find((v) => v.lang === code) || voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix)) || null;
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

function speak(text, lang, statusEl) {
  const synth = window.speechSynthesis;
  synth.cancel();
  isPaused = false;
  const meta = LANGS.find((l) => l.code === lang) || LANGS[0];
  const voice = pickVoice(meta.speech);
  const chunks = chunkText(text);
  setWavePlaying(true);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = meta.speech;
    if (voice) u.voice = voice;
    u.rate = 0.95; // Specified rate = 0.95 for clear historical narration
    if (i === 0) {
      u.onstart = () => {
        setWavePlaying(true);
        if (statusEl) statusEl.textContent = `กำลังบรรยายเป็นภาษา ${meta.label} (${meta.speech}, ความเร็ว 0.95×)…`;
        else toast(`🔊 กำลังบรรยายเสียงภาษา ${meta.label}`, 'ok');
      };
    }
    if (i === chunks.length - 1) {
      u.onend = () => {
        setWavePlaying(false);
        isPaused = false;
        if (statusEl) statusEl.textContent = 'บรรยายจบแล้ว · กด ▶ เพื่อฟังซ้ำ หรือเปลี่ยนภาษาด้านบน';
      };
    }
    u.onerror = (e) => {
      setWavePlaying(false);
      if (statusEl && e.error !== 'interrupted' && e.error !== 'canceled') {
        statusEl.textContent = 'อุปกรณ์เล่นเสียงไม่สำเร็จ ลองเปลี่ยนภาษาหรือเบราว์เซอร์';
      }
    };
    synth.speak(u);
  });
  if (!voice && statusEl) {
    statusEl.textContent = `กำลังบรรยาย (${meta.label}) — อุปกรณ์ใช้เสียงสังเคราะห์มาตรฐานของระบบ`;
  }
}

// ------------------------------------------------------------------ Mode B
export async function runMenuPreset() {
  selectTab('menu');
  showPreview('menu', '/assets/photos/noodles-tomyum.jpg', 'เมนูกระดาษ ร้านก๋วยเตี๋ยวห้อยขาริมน่าน (พิกัด 16.8251, 100.2618)');
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
  showPreview('menu', previewUrl, `ภาพที่อัปโหลด: ${file.name}`);
  await scanMenu(() => {
    const form = new FormData();
    form.append('merchantId', merchantId);
    form.append('image', file);
    return form;
  });
}

async function scanMenu(buildForm) {
  const out = document.getElementById('menu-result');
  out.innerHTML = '<div class="empty"><p class="empty__title">กำลังอ่านเมนูและแปล 6 ภาษา…</p><p class="muted">OCR → จับคู่ส่วนผสม &amp; สารก่อภูมิแพ้ → สร้าง Digital Menu 6 ภาษา</p></div>';
  const btn = document.getElementById('menu-preset');
  if (btn) btn.disabled = true;
  try {
    const r = await animatePipeline('menu', api('/api/scan-menu', { method: 'POST', form: buildForm() }));
    menuCtx = renderDigitalMenu(out, {
      merchant: r.merchant, items: r.items, source: r.source, latencyMs: r.latencyMs,
      notice: r.notice, ocrText: r.ocrText, scanId: r.scanId, orderable: true
    });
  } catch (err) {
    out.innerHTML = `<p class="notice notice--warn">${esc(err.message)}</p>`;
    toast(err.message, 'error');
  } finally {
    stopScanning('menu');
    if (btn) btn.disabled = false;
  }
}

/** Show a merchant's published menu or hotel room packages (from map card or directory). */
export function openMerchantMenu(merchantId) {
  const merchant = state.data.merchants.find((m) => m.id === Number(merchantId) || m.slug === String(merchantId));
  if (!merchant) return;
  const items = state.data.menuItems.filter((i) => i.merchantId === merchant.id);
  selectTab('menu');
  const prev = document.getElementById('menu-preview');
  const pipe = document.getElementById('menu-pipeline');
  if (prev) prev.hidden = true;
  if (pipe) pipe.hidden = true;
  const out = document.getElementById('menu-result');
  if (!items.length) {
    out.innerHTML = `<div class="empty"><p class="empty__title">${esc(merchant.name.th)} ยังไม่ได้อัปโหลดรายการ</p>
      <button class="btn btn--primary" type="button" data-try-preset>ดูเมนูร้านก๋วยเตี๋ยวห้อยขาริมน่าน</button></div>`;
    out.onclick = (e) => { if (e.target.closest('[data-try-preset]')) runMenuPreset(); };
  } else {
    menuCtx = renderDigitalMenu(out, { merchant, items, source: 'database', orderable: true });
  }
  document.getElementById('lens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    window.speechSynthesis?.cancel();
    setWavePlaying(false);
    renderHeritage();
    if (menuCtx && document.querySelector('#menu-result .menu-list')) menuCtx.redraw();
  });
  on('cart:changed', () => { if (menuCtx && document.querySelector('#menu-result .menu-list')) menuCtx.redraw(); });
  on('visitor:changed', () => renderHeritage());
  on('menu:open-preset', () => { runMenuPreset(); document.getElementById('lens')?.scrollIntoView({ behavior: 'smooth' }); });
}
