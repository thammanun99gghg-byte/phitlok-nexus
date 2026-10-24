import { api, esc, emit, toast } from './core.js';
let audioContext = null;
const alerted = new Set();

function liveForm(p) {
  if (!p) return '';
  return `<form class="live-editor" data-live-editor="${esc(p.key)}" data-revision="${p.revision}">
    <p class="trip-demo">ตัวควบคุมสาธิต · เปลี่ยนข้อมูลในฐานข้อมูลจริงของเดโม ไม่ใช่ข้อมูลจากร้านหรือหน่วยงาน</p>
    <div class="live-editor-grid">
      <label>สถานะ<select name="status">${[['open','เปิด'],['busy','คิวเต็ม'],['closed','ปิดชั่วคราว']].map(([v,l]) => `<option value="${v}" ${p.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>จำนวนคิว<input name="queue" type="number" min="0" max="500" value="${p.queue}" required></label>
      <label>เวลารอ (นาที)<input name="waitMinutes" type="number" min="0" max="300" value="${p.waitMinutes}" required></label>
      <label>โควตาโต๊ะจอง<input name="capacity" type="number" min="0" max="50" value="${p.capacity}" required></label>
      <label>ที่นั่งในร่ม<input name="seats" type="number" min="0" max="500" value="${p.seats}" required></label>
      <label>ที่จอดว่าง (ว่าง = ไม่ทราบ)<input name="parkingFree" type="number" min="0" max="2000" value="${p.parkingFree ?? ''}"></label>
      <label class="check"><input name="indoor" type="checkbox" ${p.indoor ? 'checked' : ''}> มีที่นั่งในร่ม/แอร์ (สาธิต)</label>
    </div><button class="btn btn--primary" type="submit">บันทึกสถานะสาธิต</button><p class="live-editor-result" role="status"></p>
  </form>`;
}
export function renderMerchantTrip(d) {
  const el=document.getElementById('merchant-trip');
  if (!el) return;
  // Polling must not discard edits or collapse the open editor.
  const editor=el.querySelector('details');
  const html=`<div class="trip-panel-head"><h3>คิวจองล่วงหน้า / Fast-Track</h3><button class="btn btn--outline" type="button" data-trip-sound>${audioContext ? 'เสียงเตือนเปิดแล้ว' : 'เปิดเสียงเตือนครัว'}</button></div>
    <p class="trip-demo">สถานการณ์สาธิต · ${d.live?.tablesAvailable ?? 0} โต๊ะจองว่าง · สถานะอัปเดตทุก 4 วินาที</p>
    <div class="operator-locks">${(d.fastTracks || []).map((r) => `<article class="trip-pass"><h4>${esc(r.passNo)} · เตรียมโต๊ะจอง #${r.tableNo}</h4>
      <p>${r.status === 'arrived' ? 'ลูกค้าเช็คอินแล้ว' : 'ลูกค้ากำลังมา · กรุณามาถึงก่อนหมดเวลา'}</p>
      ${r.status !== 'arrived' ? `<strong data-trip-countdown="${esc(r.expiresAt)}"></strong>` : ''}
      <button class="btn btn--primary" type="button" data-operator-lock="${esc(r.id)}" data-merchant-id="${d.merchant.id}" data-lock-next="${r.status === 'arrived' ? 'completed' : 'arrived'}">${r.status === 'arrived' ? 'ใช้โต๊ะเสร็จ / คืนโควตา' : 'ยืนยันลูกค้ามาถึง'}</button></article>`).join('') || '<p>ยังไม่มีบัตรคิวที่รอใช้งาน</p>'}</div>`;
  let summary=el.querySelector('.merchant-trip-summary');
  if (!summary) { el.innerHTML='<div class="merchant-trip-summary"></div><details><summary>ปรับสถานะหน้าร้าน (สาธิต)</summary><div class="merchant-live-form"></div></details>'; summary=el.firstElementChild; }
  if(summary.innerHTML !== html)summary.innerHTML=html;
  if (!editor?.open && !el.querySelector('form')?.contains(document.activeElement)) el.querySelector('.merchant-live-form').innerHTML=liveForm(d.live);
  for(const o of d.orders) {
    if(o.safety?.state === 'pending' && !alerted.has(o.id) && audioContext) { beep(); alerted.add(o.id); }
  }
}
function beep() {
  if (!audioContext) return;
  const oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
  oscillator.type='sine'; oscillator.frequency.value=740;
  gain.gain.setValueAtTime(0.06,audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001,audioContext.currentTime+0.5);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime+0.5);
}
export function allergyControls(o, merchantId) {
  if (!o.safety || o.safety.state === 'not_requested') return '';
  const pending=o.safety.state !== 'acknowledged';
  return `<section class="allergy-review ${pending ? 'allergy-review--pending' : 'allergy-review--acknowledged'}" data-allergy-order="${o.id}">
    <h4>${pending ? '⚠ ต้องตรวจข้อจำกัดอาหารก่อนรับออเดอร์' : '✓ ครัวรับทราบข้อจำกัดอาหารแล้ว'}</h4>
    <p>ตรวจส่วนผสม เครื่องปรุง และการปนเปื้อนข้าม การกดยืนยันไม่รับรองว่าปลอดสารก่อภูมิแพ้</p>
    ${pending && o.status === 'new' ? `<form data-allergy-review="${o.id}" data-merchant-id="${merchantId}">
      <label class="check"><input type="checkbox" name="understood" required> ตรวจส่วนผสมและอ่านข้อจำกัดบนใบสั่งครบแล้ว</label>
      <label class="check"><input type="checkbox" name="separateEquipment" required> สามารถแยกอุปกรณ์/หม้อลวกและป้องกันการปนเปื้อนตามคำขอ</label>
      <div class="actions"><button class="btn btn--primary" type="submit">ยืนยันรับทราบและทำตามคำขอได้</button>
      <button class="btn btn--danger" type="button" data-allergy-decline="${o.id}" data-merchant-id="${merchantId}">ทำไม่ได้ / แจ้งให้ลูกค้าติดต่อร้าน</button></div>
      ${o.safety.state === 'declined' ? '<p role="status">แจ้งลูกค้าแล้วว่าทำตามคำขอไม่ได้ · ยังห้ามเริ่มทำ</p>' : ''}
    </form>` : ''}</section>`;
}
export function renderTripAdmin(metrics, places) {
  const el=document.getElementById('admin-trip');
  if(!el || el.querySelector('details[open]'))return;
  el.innerHTML=`<h3>Trip-Saver & Fast-Track (ข้อมูลสาธิต)</h3><div class="trip-admin-stats">${[
    ['เรียกกู้ชีพทริป',metrics.rescues],['ล็อกโต๊ะทั้งหมด',metrics.locks],['โต๊ะกำลังใช้งาน',metrics.active],
    ['คิวที่สั่งอาหารแล้ว',metrics.linkedOrders],['รอครัวตรวจ',metrics.pendingSafety],['ครัวรับทราบแล้ว',metrics.acknowledged]
  ].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
  <details><summary>ปรับสถานะวิหารและที่จอดรถ (สาธิต)</summary>${places.filter((p)=>p.kind==='heritage').map((p)=>`<details><summary>${esc(p.name.th)}</summary>${liveForm(p)}</details>`).join('')}</details>`;
}
export function initTripOperator() {
  document.addEventListener('submit',async(e)=>{
    const form=e.target.closest('[data-live-editor],[data-allergy-review]');
    if(!form)return;
    e.preventDefault();
    const btn=form.querySelector('[type="submit"]'); btn.disabled=true;
    const data=new FormData(form);
    try {
      if(form.dataset.liveEditor){
        const body={revision:Number(form.dataset.revision),status:data.get('status'),indoor:data.has('indoor')};
        for(const k of ['queue','waitMinutes','capacity','seats'])body[k]=Number(data.get(k));
        body.parkingFree=data.get('parkingFree') === '' ? null : Number(data.get('parkingFree'));
        const r=await api(`/api/demo/live/${encodeURIComponent(form.dataset.liveEditor)}`,{method:'POST',body});
        form.dataset.revision=String(r.place.revision); form.querySelector('[role="status"]').textContent='บันทึกแล้ว · หน้าลูกค้าจะอัปเดตภายใน 4 วินาที';
      }else{
        await api(`/api/orders/${form.dataset.allergyReview}/allergy-review`,{method:'POST',body:{merchantId:Number(form.dataset.merchantId),state:'acknowledged',understood:data.has('understood'),separateEquipment:data.has('separateEquipment')}});
      }
      emit('trip:operator-updated');
    }catch(err){toast(err.message,'error');}
    finally{btn.disabled=false;}
  });
  document.addEventListener('click',async(e)=>{
    if(e.target.closest('[data-trip-sound]')){
      try{ audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume(); beep(); e.target.closest('button').textContent='เสียงเตือนเปิดแล้ว'; }catch{toast('เบราว์เซอร์นี้ไม่รองรับเสียงเตือน','error');}
      return;
    }
    const btn=e.target.closest('[data-operator-lock],[data-allergy-decline]');
    if(!btn)return;
    btn.disabled=true;
    try{
      const mid=Number(btn.dataset.merchantId);
      if(btn.dataset.operatorLock)await api(`/api/merchants/${mid}/locks/${btn.dataset.operatorLock}`,{method:'POST',body:{status:btn.dataset.lockNext}});
      else await api(`/api/orders/${btn.dataset.allergyDecline}/allergy-review`,{method:'POST',body:{merchantId:mid,state:'declined'}});
      emit('trip:operator-updated');
    }catch(err){toast(err.message,'error');btn.disabled=false;}
  });
}
