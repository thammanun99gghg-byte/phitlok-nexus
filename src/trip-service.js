'use strict';
// v3 additions use additive tables. Never bump the legacy seed version/reset data.
const crypto = require('node:crypto');
const { transaction } = require('./db');
const { ORIGIN_GPS, haversineM } = require('./seed-data');
const TTL = 15 * 60 * 1000;
const FRESH_MS = 30 * 60 * 1000;
class TripError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.extra = { code }; }
}
const fail = (status, code, message) => { throw new TripError(status, code, message); };
const json = (s) => JSON.parse(s || '{}');

function initTrip(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trip_live (
      place_key TEXT PRIMARY KEY, merchant_id INTEGER, kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', queue_count INTEGER NOT NULL DEFAULT 0,
      wait_minutes INTEGER NOT NULL DEFAULT 0, table_capacity INTEGER NOT NULL DEFAULT 0,
      indoor INTEGER NOT NULL DEFAULT 0, seats INTEGER NOT NULL DEFAULT 0,
      parking_free INTEGER, revision INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'demo', updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trip_locks (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
      visitor_id TEXT NOT NULL, merchant_id INTEGER NOT NULL, table_no INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'held', order_id INTEGER UNIQUE,
      created_at TEXT NOT NULL, expires_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS trip_lock_table ON trip_locks(merchant_id, table_no)
      WHERE status IN ('held','ordered','arrived');
    CREATE UNIQUE INDEX IF NOT EXISTS trip_lock_visitor ON trip_locks(visitor_id)
      WHERE status IN ('held','ordered','arrived');
    CREATE TABLE IF NOT EXISTS trip_safety (
      order_id INTEGER PRIMARY KEY, state TEXT NOT NULL DEFAULT 'pending',
      acknowledged_at TEXT, separate_equipment INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS trip_rescues (
      id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_id TEXT NOT NULL,
      scenario TEXT NOT NULL, selected_key TEXT, created_at TEXT NOT NULL
    );
  `);
  const now = new Date().toISOString();
  // Explicit demonstration scenarios, not claims about real businesses or parking.
  const ins = db.prepare(`INSERT OR IGNORE INTO trip_live
    (place_key,merchant_id,kind,status,queue_count,wait_minutes,table_capacity,indoor,seats,parking_free,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  transaction(db, () => {
    for (const m of db.prepare("SELECT * FROM merchants WHERE status='active'").all()) {
      const hotel = m.kind === 'hotel';
      const crowded = m.slug === 'hoi-kha-noodles';
      ins.run(`merchant:${m.slug}`, m.id, hotel ? 'hotel' : 'restaurant', 'open', crowded ? 14 : 0,
        crowded ? 45 : 0, hotel ? 0 : 2, hotel ? 1 : 0, hotel ? 6 : 0, null, now);
    }
    for (const lm of db.prepare('SELECT id FROM landmarks').all()) {
      ins.run(`landmark:${lm.id}`, null, 'heritage', lm.id === 'wat-yai' ? 'closed' : 'open',
        0, 0, 0, 0, 0, lm.id === 'wat-yai' ? 0 : lm.id === 'chan-palace' ? 18 : null, now);
    }
    // Existing flagged orders also require acknowledgement; completed orders are historical.
    for (const o of db.prepare("SELECT id,ticket_json FROM orders WHERE status != 'done'").all()) {
      const ticket = json(o.ticket_json);
      if (ticket.kind !== 'booking' && ticket.flags?.length) db.prepare('INSERT OR IGNORE INTO trip_safety(order_id) VALUES (?)').run(o.id);
    }
  });
}

function expireLocks(db) {
  db.prepare("UPDATE trip_locks SET status='expired' WHERE status IN ('held','ordered') AND expires_at <= ?")
    .run(new Date().toISOString());
}
function publicLock(r) {
  return { id: r.id, passNo: `FT-${100 + r.seq}`, merchantId: r.merchant_id, tableNo: r.table_no,
    status: r.status, orderId: r.order_id, createdAt: r.created_at, expiresAt: r.expires_at, demo: true };
}
function livePlaces(db) {
  expireLocks(db);
  const merchants = new Map(db.prepare("SELECT * FROM merchants WHERE status='active'").all().map((m) => [m.id, m]));
  const landmarks = new Map(db.prepare('SELECT id,data_json FROM landmarks').all().map((l) => [l.id, json(l.data_json)]));
  return db.prepare('SELECT * FROM trip_live ORDER BY place_key').all().flatMap((r) => {
    const m = merchants.get(r.merchant_id);
    const lm = landmarks.get(r.place_key.replace('landmark:', ''));
    if (!m && !lm) return [];
    const occupied = db.prepare("SELECT COUNT(*) AS n FROM trip_locks WHERE merchant_id=? AND status IN ('held','ordered','arrived')").get(r.merchant_id).n;
    const stale = Date.now() - Date.parse(r.updated_at) > FRESH_MS;
    return [{ key: r.place_key, merchantId: r.merchant_id, kind: r.kind,
      name: m ? json(m.name_json) : lm.name, lat: m ? m.lat : lm.lat, lng: m ? m.lng : lm.lng,
      status: m?.shop_status === 'busy' ? 'busy' : r.status,
      queue: r.queue_count, waitMinutes: r.wait_minutes, capacity: r.table_capacity,
      tablesAvailable: Math.max(0, r.table_capacity - occupied), indoor: !!r.indoor, seats: r.seats,
      parkingFree: r.parking_free, source: r.source, updatedAt: r.updated_at, revision: r.revision,
      stale, demo: true }];
  });
}
function updateLive(db, key, body) {
  const old = db.prepare('SELECT * FROM trip_live WHERE place_key=?').get(key);
  if (!old) fail(404, 'missing', 'ไม่พบสถานที่นี้');
  if (body.revision !== old.revision) fail(409, 'stale_edit', 'ข้อมูลถูกแก้แล้ว กรุณาโหลดใหม่');
  const integer = (key, max) => {
    if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > max) fail(400, 'invalid', 'ค่าจำนวนไม่ถูกต้อง');
    return body[key];
  };
  if (!['open', 'busy', 'closed'].includes(body.status) || typeof body.indoor !== 'boolean') fail(400, 'invalid', 'สถานะไม่ถูกต้อง');
  const queue = integer('queue', 500), wait = integer('waitMinutes', 300), capacity = integer('capacity', 50), seats = integer('seats', 500);
  const parking = body.parkingFree === null ? null : integer('parkingFree', 2000);
  const maxTable = db.prepare("SELECT COALESCE(MAX(table_no),0) AS n FROM trip_locks WHERE merchant_id=? AND status IN ('held','ordered','arrived')").get(old.merchant_id).n;
  if (capacity < maxTable) fail(409, 'capacity', 'ยังมีโต๊ะที่ถูกล็อกอยู่ ลดจำนวนต่ำกว่าโต๊ะที่ใช้งานไม่ได้');
  db.prepare(`UPDATE trip_live SET status=?,queue_count=?,wait_minutes=?,table_capacity=?,indoor=?,seats=?,parking_free=?,revision=revision+1,updated_at=? WHERE place_key=?`)
    .run(body.status,queue,wait,capacity,body.indoor ? 1 : 0,seats,parking,new Date().toISOString(),key);
  return livePlaces(db).find((p) => p.key === key);
}
function requireVip(db, visitorId) {
  const v = db.prepare('SELECT vip_until FROM visitors WHERE id=?').get(visitorId);
  if (!v?.vip_until || Date.parse(v.vip_until) <= Date.now()) fail(402, 'vip_required', 'ต้องมี VIP Pass ที่เซิร์ฟเวอร์ยืนยันก่อนล็อกโต๊ะ');
}
function lockTable(db, visitorId, merchantId) {
  return transaction(db, () => {
    requireVip(db, visitorId);
    expireLocks(db);
    const current = db.prepare("SELECT * FROM trip_locks WHERE visitor_id=? AND status IN ('held','ordered','arrived')").get(visitorId);
    if (current) {
      if (current.merchant_id === merchantId) return publicLock(current); // retry is idempotent
      fail(409, 'already_locked', 'คุณมีโต๊ะที่ล็อกอยู่ กรุณายกเลิกหรือใช้โต๊ะเดิมก่อน');
    }
    const place = livePlaces(db).find((p) => p.merchantId === merchantId);
    if (!place || place.kind !== 'restaurant') fail(404, 'missing', 'ร้านนี้ยังไม่รองรับล็อกโต๊ะ');
    if (place.stale || place.status !== 'open') fail(409, 'unavailable', 'สถานะร้านไม่พร้อมหรือข้อมูลเก่า กรุณาให้ร้านอัปเดต');
    const used = new Set(db.prepare("SELECT table_no FROM trip_locks WHERE merchant_id=? AND status IN ('held','ordered','arrived')").all(merchantId).map((r) => r.table_no));
    let table = 1;
    while (used.has(table)) table++;
    if (table > place.capacity) fail(409, 'full', 'โต๊ะสำหรับจองล่วงหน้าเต็มแล้ว');
    const id = crypto.randomUUID(), now = Date.now();
    db.prepare('INSERT INTO trip_locks(id,visitor_id,merchant_id,table_no,created_at,expires_at) VALUES (?,?,?,?,?,?)')
      .run(id,visitorId,merchantId,table,new Date(now).toISOString(),new Date(now + TTL).toISOString());
    return publicLock(db.prepare('SELECT * FROM trip_locks WHERE id=?').get(id));
  });
}
function validateLock(db, visitorId, merchantId, id) {
  if (!id) return null;
  requireVip(db, visitorId);
  const r = db.prepare('SELECT * FROM trip_locks WHERE id=? AND visitor_id=? AND merchant_id=?').get(String(id),visitorId,merchantId);
  if (!r) fail(404, 'missing', 'ไม่พบบัตรคิวของคุณสำหรับร้านนี้');
  if (r.status !== 'held' || Date.parse(r.expires_at) <= Date.now()) fail(409, 'lock_expired', 'บัตรคิวหมดอายุหรือใช้กับออเดอร์แล้ว กรุณาเลือกโต๊ะใหม่');
  return publicLock(r);
}
function recordOrder(db, orderId, ticket, lock) {
  if (ticket.kind !== 'booking' && ticket.flags?.length) db.prepare('INSERT INTO trip_safety(order_id) VALUES (?)').run(orderId);
  if (lock) db.prepare("UPDATE trip_locks SET order_id=?,status='ordered' WHERE id=? AND status='held'").run(orderId,lock.id);
}
function safetyFor(db, orderId) {
  const r = db.prepare('SELECT * FROM trip_safety WHERE order_id=?').get(orderId);
  return r ? { state: r.state, acknowledgedAt: r.acknowledged_at, separateEquipment: !!r.separate_equipment } : { state: 'not_requested' };
}
function reviewSafety(db, orderId, merchantId, body) {
  const o = db.prepare('SELECT * FROM orders WHERE id=? AND merchant_id=?').get(orderId,merchantId);
  if (!o || !db.prepare('SELECT 1 FROM trip_safety WHERE order_id=?').get(orderId)) fail(404,'missing','ไม่พบคำขอข้อจำกัดอาหาร');
  if (o.status !== 'new') fail(409,'started','ออเดอร์เริ่มทำแล้ว');
  if (!['acknowledged','declined'].includes(body.state)) fail(400,'invalid','สถานะไม่ถูกต้อง');
  if (body.state === 'acknowledged' && (body.understood !== true || body.separateEquipment !== true)) fail(400,'review_required','ต้องตรวจส่วนผสมและยืนยันการแยกอุปกรณ์ก่อน');
  db.prepare('UPDATE trip_safety SET state=?,acknowledged_at=?,separate_equipment=? WHERE order_id=?')
    .run(body.state,new Date().toISOString(),body.state === 'acknowledged' ? 1 : 0,orderId);
  return safetyFor(db,orderId);
}
function checkKitchenReady(db, orderId) {
  const safety = safetyFor(db,orderId);
  if (['pending','declined'].includes(safety.state)) fail(409,'allergy_review_required','ต้องรับทราบข้อจำกัดอาหารก่อนเริ่มทำ; หากทำไม่ได้ให้ติดต่อผู้สั่ง');
}
function changeLock(db, id, actor, action) {
  return transaction(db, () => {
    expireLocks(db);
    const r = db.prepare('SELECT * FROM trip_locks WHERE id=?').get(id);
    if (!r || (actor.visitorId ? r.visitor_id !== actor.visitorId : r.merchant_id !== actor.merchantId)) fail(404,'missing','ไม่พบบัตรคิว');
    const allowed = actor.visitorId ? { held: ['cancelled'], ordered: ['cancelled'] } : { held: ['arrived'], ordered: ['arrived'], arrived: ['completed'] };
    if (!allowed[r.status]?.includes(action)) fail(409,'transition','เปลี่ยนสถานะบัตรคิวไม่ได้');
    db.prepare('UPDATE trip_locks SET status=? WHERE id=?').run(action,id);
    return publicLock(db.prepare('SELECT * FROM trip_locks WHERE id=?').get(id));
  });
}
function visitorTrip(db, visitorId) {
  expireLocks(db);
  return {
    locks: db.prepare('SELECT * FROM trip_locks WHERE visitor_id=? ORDER BY seq DESC LIMIT 10').all(visitorId).map(publicLock),
    orders: db.prepare('SELECT id,order_no,merchant_id,status FROM orders WHERE visitor_id=? ORDER BY id DESC LIMIT 10').all(visitorId)
      .map((o) => ({ id:o.id,orderNo:o.order_no,merchantId:o.merchant_id,status:o.status,safety:safetyFor(db,o.id) }))
  };
}
function merchantLocks(db, merchantId) {
  expireLocks(db);
  return db.prepare("SELECT * FROM trip_locks WHERE merchant_id=? AND status IN ('held','ordered','arrived') ORDER BY seq").all(merchantId).map(publicLock);
}
function rescue(db, visitorId, body) {
  if (!['weather','hunger','parking'].includes(body.scenario)) fail(400,'invalid','ไม่พบสถานการณ์นี้');
  let origin = { ...ORIGIN_GPS }, originSource = 'wat-yai';
  if (body.location !== undefined) {
    const p = body.location;
    if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number' || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat)>90 || Math.abs(p.lng)>180) fail(400,'location','พิกัดไม่ถูกต้อง');
    origin = p; originSource = 'device';
  }
  const places = livePlaces(db);
  const usable = places.filter((p) => !p.stale && p.status === 'open');
  let candidates = body.scenario === 'weather' ? usable.filter((p) => p.indoor && p.seats > 0)
    : body.scenario === 'hunger' ? usable.filter((p) => p.kind === 'restaurant' && p.queue === 0 && p.tablesAvailable > 0)
      : usable.filter((p) => p.kind === 'heritage' && p.parkingFree > 0);
  candidates = candidates.map((p) => ({ ...p, distanceM: Math.round(haversineM(origin.lat,origin.lng,p.lat,p.lng)) }))
    .sort((a,b) => a.distanceM-b.distanceM).slice(0,3)
    .map((p) => ({ ...p, walkingMinutes: Math.max(1,Math.ceil(p.distanceM / 70)) }));
  const alternativeFood = body.scenario === 'parking' ? usable.filter((p) => p.kind === 'restaurant' && p.queue === 0).slice(0,1) : [];
  db.prepare('INSERT INTO trip_rescues(visitor_id,scenario,selected_key,created_at) VALUES (?,?,?,?)')
    .run(visitorId,body.scenario,candidates[0]?.key || null,new Date().toISOString());
  return { demo:true,scenario:body.scenario,origin,originSource,candidates,alternativeFood,
    affected: body.scenario === 'parking' ? places.find((p) => p.key === 'landmark:wat-yai') : null,
    distanceMethod:'straight-line-estimate', serverTime:new Date().toISOString() };
}
function tripMetrics(db) {
  expireLocks(db);
  return {
    demo:true, rescues:db.prepare('SELECT COUNT(*) AS n FROM trip_rescues').get().n,
    locks:db.prepare('SELECT COUNT(*) AS n FROM trip_locks').get().n,
    active:db.prepare("SELECT COUNT(*) AS n FROM trip_locks WHERE status IN ('held','ordered','arrived')").get().n,
    linkedOrders:db.prepare('SELECT COUNT(*) AS n FROM trip_locks WHERE order_id IS NOT NULL').get().n,
    pendingSafety:db.prepare("SELECT COUNT(*) AS n FROM trip_safety WHERE state='pending'").get().n,
    acknowledged:db.prepare("SELECT COUNT(*) AS n FROM trip_safety WHERE state='acknowledged'").get().n
  };
}
module.exports = { initTrip,TripError,livePlaces,updateLive,lockTable,validateLock,recordOrder,safetyFor,reviewSafety,
  checkKitchenReady,changeLock,visitorTrip,merchantLocks,rescue,tripMetrics };
