// Sign-up for the three kinds of user: traveler (free), shop/restaurant (SaaS 199฿) and hotel (SaaS 499฿).
// Shops and hotels go through the real checkout (server validates and pins them on the map).
// Travelers have no server account in this demo: the profile stays in this browser and the password is never kept.
import { state, emit, on, esc, openDialog, closeDialog, refreshIcons, toast } from './core.js';
import { startCheckout } from './payment.js';
import { DISTRICT_LIST } from './province3d.js';
import { t } from './i18n.js';
import { mountPinPicker } from './pin-picker.js';

const PROFILE_KEY = 'phitlok_profile';
const PHONE_TH = /^0\d{8,9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTCODE_PHS = /^65\d{3}$/; // Phitsanulok postcodes are 65000–65240

let form, dialog, type = 'tourist';
const pickers = {};
const DOC_MAX = 5 * 1024 * 1024;
const DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Thai citizen ID and 13-digit tax/juristic IDs share the same mod-11 check digit. */
export function validThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

export function readProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; }
}

export function initSignup() {
  dialog = document.getElementById('signup-dialog');
  form = document.getElementById('saas-form');
  if (!dialog || !form) return;
  fillSelects();
  form.querySelectorAll('[data-pin-picker]').forEach((root) => {
    const set = root.closest('[data-set]');
    pickers[set.dataset.set] = mountPinPicker(root, {
      onChange: (pin) => {
        // the district and nearest landmark follow the pin, so they always match the real location
        if (pin) set.querySelector('[data-district-select]').value = pin.district;
        set.querySelector('[data-nearest-input]').value = pin?.nearest || '';
      }
    });
  });

  dialog.querySelectorAll('[data-signup-type]').forEach((b) => b.addEventListener('click', () => setType(b.dataset.signupType)));
  dialog.querySelector('.signup-types').addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const order = ['tourist', 'shop', 'hotel'];
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    setType(order[(order.indexOf(type) + step + 3) % 3], true);
  });
  document.querySelectorAll('[data-open-signup]').forEach((b) => b.addEventListener('click', () => openSignup(b.dataset.openSignup || undefined)));
  dialog.querySelector('[data-close-signup]')?.addEventListener('click', () => closeDialog('signup-dialog'));
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-signup-close]')) closeDialog('signup-dialog');
    if (e.target.closest('[data-signup-logout]')) { try { localStorage.removeItem(PROFILE_KEY); } catch {} syncHeader(); showForm(); }
  });
  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', (e) => {
    const err = e.target.closest('.field')?.querySelector('.field__error');
    if (err) err.textContent = '';
    e.target.removeAttribute('aria-invalid');
  });

  // The server re-checks shop/hotel fields; show its messages back in the dialog.
  on('checkout:field-errors', (errors) => { openDialog('signup-dialog'); showErrors(errors); });
  // applyStatic() rewrites data-i18n labels on a language change, so put the traveler's name back afterwards
  on('lang:changed', () => setTimeout(syncHeader));
  syncHeader();
}

/** Open the dialog, optionally on a given type ('tourist' | 'shop' | 'hotel'). */
export function openSignup(kind) {
  if (!dialog) return;
  const profile = readProfile();
  if (profile && !kind) showDone(profile);
  else { showForm(); if (kind) setType(kind); }
  openDialog('signup-dialog');
  if (!profile || kind) activeSet().querySelector('input:not([type="checkbox"]):not([type="radio"])')?.focus();
}

/** Called after the shop/hotel payment succeeds. */
export function resetSignup() {
  form?.reset();
  fillSelects();
  Object.values(pickers).forEach((p) => p.reset());
}

function fillSelects() {
  const districts = '<option value="">เลือกอำเภอ</option>' + DISTRICT_LIST.map((d) => `<option value="${esc(d.id)}">${esc(d.th)}</option>`).join('');
  form.querySelectorAll('[data-district-select]').forEach((s) => { s.innerHTML = districts; s.value = 'mueang'; });
}

const activeSet = () => form.querySelector(`[data-set="${type}"]`);

function setType(next, focus = false) {
  type = next;
  dialog.querySelectorAll('[data-signup-type]').forEach((b) => {
    const on = b.dataset.signupType === next;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  form.querySelectorAll('[data-set]').forEach((set) => {
    const on = set.dataset.set === next;
    set.hidden = !on;
    set.disabled = !on;
  });
  clearErrors();
  pickers[next]?.redraw();
}

function showForm() {
  document.getElementById('signup-main').hidden = false;
  document.getElementById('signup-done').hidden = true;
}

function showDone(p) {
  const done = document.getElementById('signup-done');
  document.getElementById('signup-main').hidden = true;
  done.hidden = false;
  done.innerHTML = `<div class="signup-done">
      <div class="signup-done__icon" aria-hidden="true">✓</div>
      <h3>ยินดีต้อนรับ · Welcome, ${esc(p.fullName)}</h3>
      <p class="muted">${esc(p.email)}${p.country ? ` · ${esc(p.country)}` : ''}</p>
      <p class="badge badge--warn">โหมดสาธิต: บัญชีนักท่องเที่ยวเก็บไว้ในเบราว์เซอร์นี้เท่านั้น · Demo: saved in this browser only</p>
      <div class="actions">
        <a class="btn btn--primary" href="#map" data-signup-close><i data-lucide="map"></i> เริ่มสำรวจแผนที่ · Explore the map</a>
        <button class="btn btn--outline" type="button" data-signup-logout><i data-lucide="log-out"></i> ออกจากระบบ · Sign out</button>
      </div>
    </div>`;
  refreshIcons();
}

// Signed-in travelers see their first name on the header button instead of "Sign up".
function syncHeader() {
  const p = readProfile();
  document.querySelectorAll('[data-signup-label]').forEach((el) => {
    if (p) { el.removeAttribute('data-i18n'); el.textContent = p.fullName.split(/\s+/)[0]; }
    else { el.dataset.i18n = 'signup.btn'; el.textContent = t('signup.btn'); }
  });
}

// ------------------------------------------------------------------ validation
const val = (name) => String(new FormData(form).get(name) ?? '').trim();
const all = (name) => new FormData(form).getAll(name).map(String);

function checkTourist() {
  const e = {};
  if (val('fullName').length < 2) e.fullName = 'กรุณากรอกชื่อ-นามสกุล · Please enter your full name';
  if (!EMAIL.test(val('email'))) e.email = 'อีเมลไม่ถูกต้อง · Please enter a valid email';
  const phone = val('phone').replace(/[\s-]/g, '');
  if (phone && !/^\+?\d{8,15}$/.test(phone)) e.phone = 'เบอร์โทรไม่ถูกต้อง · Please check the phone number';
  if (!val('country')) e.country = 'กรุณาเลือกประเทศ · Please choose a country';
  if (val('arrive') && val('leave') && val('leave') < val('arrive')) e.leave = 'วันกลับต้องไม่ก่อนวันที่มาถึง · Departure must be after arrival';
  const pass = String(new FormData(form).get('password') ?? '');
  if (pass.length < 8 || !/[A-Za-z]/.test(pass) || !/\d/.test(pass)) e.password = 'อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข · 8+ characters with letters and numbers';
  if (String(new FormData(form).get('password2') ?? '') !== pass) e.password2 = 'รหัสผ่านไม่ตรงกัน · Passwords do not match';
  if (!activeSet().querySelector('[name="pdpaConsent"]').checked) e.pdpaConsent = 'กรุณายอมรับนโยบายความเป็นส่วนตัว · Please accept the privacy policy';
  return e;
}

function checkFiles(name, { required = true, min = 1 } = {}) {
  const input = activeSet().querySelector(`[name="${name}"]`);
  const files = [...(input?.files || [])];
  if (!files.length) return required ? 'กรุณาแนบไฟล์' : null;
  if (files.length < min) return `กรุณาแนบอย่างน้อย ${min} ไฟล์`;
  if (files.some((f) => !DOC_TYPES.includes(f.type))) return 'รับเฉพาะไฟล์ JPG, PNG, WEBP หรือ PDF';
  if (files.some((f) => f.size > DOC_MAX)) return 'ไฟล์ต้องไม่เกิน 5 MB';
  return null;
}

function checkBusiness(isHotel) {
  const e = {};
  const name = isHotel ? 'ชื่อที่พัก' : 'ชื่อร้าน';
  if (val('shopName').length < 2) e.shopName = `กรุณากรอก${name} (อย่างน้อย 2 ตัวอักษร)`;
  if (val('address').length < 3) e.address = 'กรุณากรอกบ้านเลขที่และถนน';
  if (val('subdistrict').length < 2) e.subdistrict = 'กรุณากรอกตำบล';
  if (!POSTCODE_PHS.test(val('postcode'))) e.postcode = 'รหัสไปรษณีย์จังหวัดพิษณุโลกขึ้นต้นด้วย 65 และมี 5 หลัก';
  if (!pickers[type]?.value) e.pin = 'กรุณาปักหมุดตำแหน่งภายในจังหวัดพิษณุโลก';
  if (!val('district')) e.district = 'กรุณาเลือกอำเภอ';
  if (val('ownerName').length < 2) e.ownerName = 'กรุณากรอกชื่อ-นามสกุลผู้ติดต่อ';
  const phone = val('phone').replace(/[\s-]/g, '');
  if (!PHONE_TH.test(phone)) e.phone = 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก';
  if (!EMAIL.test(val('email'))) e.email = 'อีเมลไม่ถูกต้อง';
  const taxId = val('taxId');
  if (isHotel ? !validThaiId(taxId) : (taxId && !validThaiId(taxId))) e.taxId = 'เลข 13 หลักไม่ถูกต้อง (ตรวจเลขหลักสุดท้ายไม่ผ่าน)';
  // payout
  const pp = val('promptpayId').replace(/[\s-]/g, '');
  if (val('promptpayType') === 'phone' ? !PHONE_TH.test(pp) : !validThaiId(pp)) e.promptpayId = val('promptpayType') === 'phone' ? 'เบอร์พร้อมเพย์ต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก' : 'เลขพร้อมเพย์ 13 หลักไม่ถูกต้อง';
  if (!val('bank')) e.bank = 'กรุณาเลือกธนาคาร';
  if (!/^\d{10,12}$/.test(val('accountNo').replace(/[\s-]/g, ''))) e.accountNo = 'เลขที่บัญชีต้องเป็นตัวเลข 10–12 หลัก';
  if (val('accountName').length < 2) e.accountName = 'กรุณากรอกชื่อบัญชี';
  if (isHotel) {
    const rooms = Number(val('rooms'));
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 999) e.rooms = 'จำนวนห้อง 1–999';
    const price = Number(val('priceFrom'));
    if (!(price >= 100 && price <= 100000)) e.priceFrom = 'ราคา 100–100,000 บาท';
    if (!val('checkIn')) e.checkIn = 'กรุณาระบุเวลาเช็คอิน';
    if (!val('checkOut')) e.checkOut = 'กรุณาระบุเวลาเช็คเอาต์';
    if (!all('roomTypes').length) e.roomTypes = 'เลือกประเภทห้องอย่างน้อย 1 แบบ';
    if (val('hotelLicense').length < 3) e.hotelLicense = 'กรุณากรอกเลขที่ใบอนุญาตหรือหนังสือรับแจ้ง';
    if (val('operatorName').length < 2) e.operatorName = 'กรุณากรอกชื่อผู้ประกอบการตามใบอนุญาต';
    if (val('role').length < 2) e.role = 'กรุณากรอกตำแหน่ง';
    for (const [k, opt] of [['docLicense'], ['docCompany'], ['docIdCard'], ['docBank'], ['docPhotos', { min: 3 }]]) {
      const msg = checkFiles(k, opt);
      if (msg) e[k] = msg;
    }
  } else {
    if (!val('priceRange')) e.priceRange = 'กรุณาเลือกช่วงราคา';
    if (val('highlight').length < 2) e.highlight = 'กรุณากรอกเมนูหรือสินค้าเด่น';
    const seats = Number(val('seats'));
    if (val('seats') === '' || !Number.isInteger(seats) || seats < 0 || seats > 999) e.seats = 'จำนวนที่นั่ง 0–999';
    if (!val('openTime')) e.openTime = 'กรุณาระบุเวลาเปิด';
    if (!val('closeTime')) e.closeTime = 'กรุณาระบุเวลาปิด';
    if (!validThaiId(val('idCard'))) e.idCard = 'เลขบัตรประชาชนไม่ถูกต้อง (ตรวจเลขหลักสุดท้ายไม่ผ่าน)';
    if (!val('foodLicense')) e.foodLicense = 'กรุณาเลือกสถานะใบอนุญาต';
    for (const k of ['docIdCard', 'docBank', 'docFront', 'docMenu']) {
      const msg = checkFiles(k);
      if (msg) e[k] = msg;
    }
    const lic = checkFiles('docLicense', { required: false });
    if (lic) e.docLicense = lic;
  }
  if (!activeSet().querySelector('[name="termsConsent"]').checked) e.termsConsent = 'กรุณายอมรับเงื่อนไขการเป็นพาร์ทเนอร์';
  if (!activeSet().querySelector('[name="pdpaConsent"]').checked) e.pdpaConsent = 'ต้องยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนสมัคร';
  return e;
}

function clearErrors() {
  form.querySelectorAll('.field__error').forEach((p) => { p.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
}

function showErrors(errors) {
  const set = activeSet();
  let first = null;
  for (const [k, msg] of Object.entries(errors)) {
    const p = set.querySelector(`[data-err="${k}"]`);
    if (!p) continue;
    p.textContent = msg;
    const input = set.querySelector(`[name="${k}"]`);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (!p.id) p.id = `err-${type}-${k}`;
      input.setAttribute('aria-describedby', p.id);
    }
    first = first || input || p;
  }
  first?.focus?.();
  first?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}

// ------------------------------------------------------------------ submit
function onSubmit(e) {
  e.preventDefault();
  clearErrors();
  if (type === 'tourist') {
    const errors = checkTourist();
    if (Object.keys(errors).length) { showErrors(errors); return; }
    const profile = {
      fullName: val('fullName'), email: val('email'), phone: val('phone'), country: val('country'),
      language: val('language'), arrive: val('arrive'), leave: val('leave'), diet: all('diet'),
      marketingConsent: activeSet().querySelector('[name="marketingConsent"]').checked,
      createdAt: new Date().toISOString()
    };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
    form.reset();
    fillSelects();
    syncHeader();
    showDone(profile);
    if (profile.language && profile.language !== state.lang) { state.lang = profile.language; emit('lang:changed', state.lang); }
    toast(`ยินดีต้อนรับ · Welcome, ${profile.fullName}`, 'ok');
    return;
  }
  const isHotel = type === 'hotel';
  const errors = checkBusiness(isHotel);
  if (Object.keys(errors).length) { showErrors(errors); return; }
  const merchant = {
    shopName: val('shopName'),
    ownerName: val('ownerName'),
    phone: val('phone'),
    category: isHotel ? 'stay' : val('category'),
    nearest: val('nearest'),
    lat: pickers[type].value.lat,
    lng: pickers[type].value.lng,
    pdpaConsent: true,
    marketingConsent: activeSet().querySelector('[name="marketingConsent"]').checked
  };
  closeDialog('signup-dialog');
  startCheckout({ type: isHotel ? 'hotel_saas' : 'saas', merchant });
}
