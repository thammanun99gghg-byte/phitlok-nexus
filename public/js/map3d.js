// Geospatial 3D Map of Phitsanulok (Three.js) — PHITLOK NEXUS v2.0
// Origin (0,0,0) = Naresuan Bridge (Lat: 16.8228, Lng: 100.2612)
// East-West = X (+East, -West), North-South = Z (-North, +South)
import { state, tr, esc, reducedMotion } from './core.js';

const THREE_URLS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js'
];

export const ORIGIN_GPS = { lat: 16.8228, lng: 100.2612 };

export function gpsTo3D(lat, lng) {
  const rawX = (lng - ORIGIN_GPS.lng) * 780;
  const rawZ = -(lat - ORIGIN_GPS.lat) * 720;
  const compress = (v, limit, factor) => {
    if (Math.abs(v) <= limit) return v;
    return Math.sign(v) * (limit + (Math.abs(v) - limit) * factor);
  };
  const x = Number(compress(rawX, 8.5, 0.25).toFixed(2));
  const z = Number(compress(rawZ, 9.5, 0.28).toFixed(2));
  return { x, z };
}

const COLORS = {
  heritageGold: 0xB8860B,
  goldBright: 0xE6B422,
  restaurantEmerald: 0x0F3D3E,
  emeraldGlow: 0x17807C,
  hotelBlue: 0x1E3A8A,
  hotelGlow: 0x3B82F6,
  brick: 0xA4553A,
  roof: 0x9E3B24,
  wall: 0xFAF6EE,
  bankEast: 0xDCE5D2,
  bankWest: 0xD5DFCA,
  river: 0x1F6E8C
};

let THREE = null;
let renderer, scene, camera, canvas, stage, labelsEl, statusEl, raycaster;
let onSelectCb = () => {};
let running = false;
let visible = true;
let clock;
let water;
let hemiLight, rimLight, sunLight;
let eastBankMesh, westBankMesh;
const cityMeshes = [];
const entities = new Map();   // key -> { kind, subKind, data, group, anchor: Vector3, label, meshes: [], halo }
const trails = [];            // { curve, tube, pulses: [], speed, offset, targetSubKind }
const boats = [];
let activeKey = null;

export function applyMapTheme(theme) {
  const isDark = (theme || document.documentElement.dataset.theme) === 'dark';
  if (stage) {
    stage.style.background = isDark
      ? 'linear-gradient(180deg, #061014 0%, #0B1D22 55%, #0F262A 100%)'
      : 'linear-gradient(180deg, #D9ECFF 0%, #EAF3E2 55%, #DCE5D2 100%)';
  }
  if (!THREE || !scene) return;
  if (hemiLight) {
    hemiLight.color.setHex(isDark ? 0x9CC5E8 : 0xFFFDF8);
    hemiLight.groundColor.setHex(isDark ? 0x162629 : 0x7A8B7B);
    hemiLight.intensity = isDark ? 0.78 : 1.25;
  }
  if (rimLight) {
    rimLight.color.setHex(isDark ? 0x38BDF8 : 0x90C2FF);
    rimLight.intensity = isDark ? 0.85 : 0.55;
  }
  if (sunLight) {
    sunLight.color.setHex(isDark ? 0xFFD27D : 0xFFF2D6);
    sunLight.intensity = isDark ? 1.45 : 2.1;
  }
  if (eastBankMesh) eastBankMesh.material.color.setHex(isDark ? 0x132824 : COLORS.bankEast);
  if (westBankMesh) westBankMesh.material.color.setHex(isDark ? 0x102320 : COLORS.bankWest);
  const darkCityPalette = [0x1C3236, 0x21383D, 0x182B2F, 0x243D42];
  const lightCityPalette = [0xEAE4D7, 0xDFD8C8, 0xD5CEBE, 0xCFC7B6];
  cityMeshes.forEach((m, idx) => {
    m.material.color.setHex((isDark ? darkCityPalette : lightCityPalette)[idx % 4]);
  });
  start();
}

window.addEventListener('phitlok:theme', (e) => applyMapTheme(e.detail));

// Camera rig in spherical coordinates around a target.
const rig = { target: null, radius: 34, theta: 0.35, phi: 0.90, anim: null };

// --------------------------------------------------------------- public API
export async function initMap({ onSelect }) {
  onSelectCb = onSelect;
  canvas = document.getElementById('map-canvas');
  stage = document.getElementById('map-stage');
  labelsEl = document.getElementById('map-labels');
  statusEl = document.getElementById('map-status');
  if (!canvas || !stage) return;

  try {
    THREE = await loadThree();
    setupRenderer();
  } catch (err) {
    console.warn('3D map unavailable:', err);
    THREE = null;
    if (statusEl) {
      statusEl.textContent = 'โหมดแผนที่พิกัด 2D (อุปกรณ์ไม่รองรับ WebGL) — กดเลือกหมุดเพื่อดูพิกัดจริงได้ทันที';
      statusEl.hidden = false;
    }
    renderFallbackLabels();
    return;
  }
  buildWorld();
  bindControls();
  if (statusEl) statusEl.hidden = true;
  start();
}

/** Map category of a merchant: hotel, souvenir shop or restaurant. */
export function merchantLayer(m) {
  if (m.kind === 'hotel' || m.category === 'stay') return 'hotel';
  if (m.category === 'souvenir') return 'souvenir';
  return 'restaurant';
}

/** Show only the given categories (heritage | restaurant | souvenir | hotel). */
export function setMapLayers(layers) {
  state.mapLayers = new Set(layers);
  const on = (layer) => state.mapLayers.has(layer);
  for (const ent of entities.values()) {
    const show = on(ent.subKind);
    if (ent.group) ent.group.visible = show;
    if (ent.halo) ent.halo.visible = show;
    if (ent.label) {
      ent.label.dataset.filteredOut = show ? 'false' : 'true';
      if (!show) ent.label.style.visibility = 'hidden';
    }
  }
  for (const trObj of trails) {
    const show = on(trObj.targetSubKind);
    if (trObj.tube) trObj.tube.visible = show;
    trObj.pulses.forEach((p) => { p.visible = show; });
  }
  if (!THREE) renderFallbackLabels();
  else start();
}

export function focusEntity(key, { silent = false } = {}) {
  if (key === 'overview') {
    activeKey = null;
    updateLabelStates();
    if (THREE) flyTo(new THREE.Vector3(0, 0, 0), 34, 0.35, 0.90);
    return;
  }
  const ent = entities.get(key) || fallbackEntity(key);
  if (!ent) return;
  activeKey = key;
  updateLabelStates();
  if (THREE && ent.anchor) {
    const isLandmark = ent.kind === 'landmark';
    const east = ent.anchor.x >= 0;
    const target = new THREE.Vector3(ent.anchor.x, isLandmark ? 1.2 : 0.8, ent.anchor.z);
    flyTo(target, isLandmark ? 16 : 12.5, east ? -0.68 : 0.68 + Math.PI * 0.1, isLandmark ? 0.92 : 0.88);
  }
  if (!silent) onSelectCb(ent);
}

export function syncMerchants(merchants, highlightId) {
  for (const m of merchants) {
    const key = `merchant:${m.slug}`;
    if (entities.has(key)) {
      const existing = entities.get(key);
      existing.data = m;
      continue;
    }
    if (THREE) addMerchant(m, true);
    else entities.set(key, { kind: 'merchant', subKind: merchantLayer(m), data: m, anchor: null });
    if (m.id === highlightId) {
      const ent = entities.get(key);
      if (ent && ent.label) ent.label.classList.add('map-label--new');
    }
  }
  if (!THREE) renderFallbackLabels();
}

export function refreshLabels() {
  for (const ent of entities.values()) {
    if (ent.label) ent.label.querySelector('.txt').textContent = shortName(ent);
  }
}

// --------------------------------------------------------------- loading
async function loadThree() {
  let lastErr;
  for (const url of THREE_URLS) {
    try { return await import(url); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function setupRenderer() {
  const test = document.createElement('canvas');
  if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('WebGL not supported');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  rig.target = new THREE.Vector3(0, 0, 0);
  raycaster = new THREE.Raycaster();
  clock = new THREE.Clock();
  resize();
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }, { threshold: 0.01 }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
}

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 600 ? 52 : 42;
  camera.updateProjectionMatrix();
}

// --------------------------------------------------------------- world
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.05, ...opts });
}

function goldMat() {
  return mat(COLORS.heritageGold, { metalness: 0.35, roughness: 0.35, emissive: 0x8A6200, emissiveIntensity: 0.45 });
}

function emeraldMat() {
  return mat(COLORS.restaurantEmerald, { metalness: 0.2, roughness: 0.38, emissive: 0x0A5C5A, emissiveIntensity: 0.5 });
}

function hotelMat() {
  return mat(COLORS.hotelBlue, { metalness: 0.3, roughness: 0.32, emissive: 0x1D4ED8, emissiveIntensity: 0.48 });
}

function mesh(geo, material, { x = 0, y = 0, z = 0, cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function buildWorld() {
  // Bright daylight / Night illumination over Phitsanulok's Nan River basin
  hemiLight = new THREE.HemisphereLight(0xFFFDF8, 0x7A8B7B, 1.25);
  scene.add(hemiLight);
  rimLight = new THREE.DirectionalLight(0x90C2FF, 0.55);
  rimLight.position.set(-18, 14, -14);
  scene.add(rimLight);
  sunLight = new THREE.DirectionalLight(0xFFF2D6, 2.1);
  sunLight.position.set(18, 22, 12);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunLight.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 75 });
  sunLight.shadow.bias = -0.0008;
  scene.add(sunLight);

  buildGround();
  buildCurvedNanRiver();
  buildBridges();
  buildCity();
  buildTrees();
  applyMapTheme(document.documentElement.dataset.theme || 'light');

  // 5 Heritage Landmarks (#B8860B Antique Gold)
  for (const lm of state.data.landmarks) {
    const coords = (typeof lm.x === 'number' && typeof lm.z === 'number') ? { x: lm.x, z: lm.z } : gpsTo3D(lm.lat, lm.lng);
    const group = new THREE.Group();
    group.position.set(coords.x, 0, coords.z);
    if (lm.id === 'wat-yai') buildWatYai(group);
    else if (lm.id === 'chan-palace') buildChanPalace(group);
    else if (lm.id === 'wat-nang-phaya') buildWatNangPhaya(group);
    else if (lm.id === 'wat-ratchaburana') buildWatRatchaburana(group);
    else buildCityPillar(group);

    scene.add(group);
    const anchorY = lm.id === 'wat-yai' ? 5.6 : lm.id === 'chan-palace' ? 3.5 : 3.2;
    const key = `landmark:${lm.id}`;
    const halo = addHalo(coords.x, coords.z, lm.id === 'wat-yai' || lm.id === 'chan-palace' ? 3.4 : 2.1, COLORS.goldBright);
    const ent = {
      kind: 'landmark',
      subKind: 'heritage',
      data: lm,
      group,
      halo,
      anchor: new THREE.Vector3(coords.x, anchorY, coords.z),
      meshes: []
    };
    group.traverse((o) => { if (o.isMesh) { o.userData.key = key; ent.meshes.push(o); } });
    ent.label = makeLabel(key, ent);
    entities.set(key, ent);
  }

  // 5 Famous Restaurants (#0F3D3E) + 3 Real Hotels (#1E3A8A)
  for (const m of state.data.merchants) addMerchant(m, false);
}

// Helper for river curve X offset at a given Z
function riverCenterX(z) {
  return Math.sin(z * 0.16) * 0.75;
}

function buildGround() {
  eastBankMesh = mesh(new THREE.BoxGeometry(20, 0.8, 36), mat(COLORS.bankEast), { x: 2.5 + 10, y: -0.4, cast: false, receive: true });
  westBankMesh = mesh(new THREE.BoxGeometry(20, 0.8, 36), mat(COLORS.bankWest), { x: -2.5 - 10, y: -0.4, cast: false, receive: true });
  scene.add(eastBankMesh, westBankMesh);

  const stone = mat(0x9A9284);
  const promenade = mat(0xE5DEC9);
  for (const s of [-1, 1]) {
    scene.add(mesh(new THREE.BoxGeometry(0.35, 0.9, 36), stone, { x: s * 2.55, y: -0.35, cast: false, receive: true }));
    scene.add(mesh(new THREE.BoxGeometry(0.95, 0.05, 36), promenade, { x: s * 3.15, y: 0.02, cast: false, receive: true }));
  }

  // Main Phitsanulok roads (Boromไตรโลกนารถ, พุทธบูชา, สิงหวัฒน์)
  const road = mat(0x78746C);
  scene.add(mesh(new THREE.BoxGeometry(22, 0.03, 0.85), road, { x: 11, y: 0.02, z: 0, cast: false, receive: true }));
  scene.add(mesh(new THREE.BoxGeometry(22, 0.03, 0.85), road, { x: -11, y: 0.02, z: 0, cast: false, receive: true }));
  scene.add(mesh(new THREE.BoxGeometry(0.8, 0.03, 36), road, { x: 4.5, y: 0.02, cast: false, receive: true }));
  scene.add(mesh(new THREE.BoxGeometry(0.8, 0.03, 36), road, { x: -4.5, y: 0.02, cast: false, receive: true }));
}

function waterTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#19647E';
  g.fillRect(0, 0, 128, 256);
  const r = seeded(7);
  for (let i = 0; i < 75; i++) {
    g.strokeStyle = `rgba(255, 238, 190, ${0.14 + r() * 0.22})`;
    g.lineWidth = 1 + r() * 2;
    const x = r() * 128, y = r() * 256, len = 12 + r() * 26;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + len / 2, x, y + len); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.2, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildCurvedNanRiver() {
  const tex = waterTexture();
  const geo = new THREE.PlaneGeometry(5.0, 36, 16, 64);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i); // maps to Z after rotation
    const px = pos.getX(i);
    pos.setX(i, px + riverCenterX(-py));
  }
  geo.computeVertexNormals();
  water = mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.15 }), { y: -0.26, cast: false, receive: true });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // Traditional Phitsanulok floating raft houses (เรือนแพริมแม่น้ำน่าน)
  const raftWall = mat(0x9A6B49);
  const raftRoof = mat(0x75422B);
  [[1.7, 4.8], [1.7, 6.8], [-1.7, -5.5], [-1.7, 9.2], [1.7, -9.8]].forEach(([x, z]) => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.12, 1.3), mat(0x6B6156), { y: -0.18 }));
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.5, 1.0), raftWall, { y: 0.14 }));
    const roof = prism(0.65, 1.15, raftRoof);
    roof.position.y = 0.55;
    roof.rotation.y = Math.PI / 2;
    g.add(roof);
    g.position.set(x + riverCenterX(z) * 0.4, 0, z);
    scene.add(g);
  });

  // Boats on the Nan River
  for (const [x, z, speed] of [[0.6, -7, 0.6], [-0.7, 5, -0.45]]) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.2, 1.5), mat(0xF5EFE0), { y: -0.14 }));
    g.add(mesh(new THREE.BoxGeometry(0.45, 0.08, 0.95), mat(COLORS.restaurantEmerald), { y: 0.22 }));
    g.position.set(x, 0, z);
    scene.add(g);
    boats.push({ g, baseX: x, speed });
  }
}

function buildBridges() {
  const deckMat = mat(0x8E8B84);
  const railMat = mat(0xFAF6EE);
  const archMat = mat(COLORS.heritageGold, { metalness: 0.3, roughness: 0.4 });

  // 1. Naresuan Bridge at (0, 0, 0) — Origin GPS (16.8228, 100.2612)
  const naresuan = new THREE.Group();
  naresuan.position.set(0, 0, 0);
  naresuan.add(mesh(new THREE.BoxGeometry(7.2, 0.28, 1.45), deckMat, { y: 0.34, z: 0 }));
  naresuan.add(mesh(new THREE.BoxGeometry(7.2, 0.26, 0.1), railMat, { y: 0.58, z: -0.68 }));
  naresuan.add(mesh(new THREE.BoxGeometry(7.2, 0.26, 0.1), railMat, { y: 0.58, z: 0.68 }));
  naresuan.add(mesh(new THREE.BoxGeometry(7.2, 0.06, 0.18), archMat, { y: 0.50, z: 0 }));
  for (const x of [-1.4, 1.4]) {
    naresuan.add(mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 10), railMat, { x, y: -0.15, z: 0 }));
  }
  scene.add(naresuan);

  // 2. Ekathotsarot Bridge to the North (z = -4.8)
  const eka = new THREE.Group();
  eka.position.set(riverCenterX(-4.8), 0, -4.8);
  eka.add(mesh(new THREE.BoxGeometry(6.8, 0.24, 1.15), deckMat, { y: 0.30, z: 0 }));
  eka.add(mesh(new THREE.BoxGeometry(6.8, 0.22, 0.08), railMat, { y: 0.50, z: -0.52 }));
  eka.add(mesh(new THREE.BoxGeometry(6.8, 0.22, 0.08), railMat, { y: 0.50, z: 0.52 }));
  scene.add(eka);
}

function buildCity() {
  const r = seeded(42);
  const mats = [mat(0xEAE4D7), mat(0xDFD8C8), mat(0xD5CEBE), mat(0xCFC7B6)];
  const blocks = [];
  for (let i = 0; i < 40; i++) {
    const side = r() > 0.5 ? 1 : -1;
    const x = side * (6.2 + r() * 11.5);
    const z = -15 + r() * 30;
    if (Math.hypot(x - 1.5, z + 0.7) < 4.8 || Math.hypot(x + 2.8, z + 2.7) < 4.5) continue;
    if (Math.abs(z) < 1.1 || Math.abs(x - 4.5) < 0.9 || Math.abs(x + 4.5) < 0.9) continue;
    if (blocks.some((b) => Math.hypot(b[0] - x, b[1] - z) < 1.8)) continue;
    blocks.push([x, z]);
    const h = 0.45 + r() * 1.2;
    const w = 0.8 + r() * 0.8;
    const d = 0.8 + r() * 0.8;
    const bMesh = mesh(new THREE.BoxGeometry(w, h, d), mats[i % mats.length].clone(), { x, y: h / 2, z, receive: true });
    cityMeshes.push(bMesh);
    scene.add(bMesh);
  }
}

function buildTrees() {
  const r = seeded(99);
  const leaf = [mat(0x3D6B48), mat(0x4B7F52), mat(0x2F5738)];
  const trunk = mat(0x6D4F37);
  const crown = new THREE.IcosahedronGeometry(0.55, 0);
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.55, 6);
  for (let i = 0; i < 75; i++) {
    const side = r() > 0.5 ? 1 : -1;
    const x = side * (3.5 + r() * 14.5);
    const z = -15.5 + r() * 31;
    if (Math.hypot(x - 1.5, z + 0.7) < 3.8 || Math.hypot(x + 2.8, z + 2.7) < 3.8) continue;
    if (Math.abs(z) < 0.9) continue;
    const s = 0.55 + r() * 0.6;
    const t = mesh(trunkGeo, trunk, { x, y: 0.28 * s, z });
    t.scale.setScalar(s);
    const c = mesh(crown, leaf[i % 3], { x, y: 0.8 * s, z });
    c.scale.setScalar(s);
    scene.add(t, c);
  }
}

function prism(radius, length, material) {
  const g = new THREE.CylinderGeometry(radius, radius, length, 3, 1, false, Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.scale.y = 0.75;
  return m;
}

// 1. Wat Phra Si Rattana Mahathat (Wat Yai) — Vihara + Golden Prang
function buildWatYai(g) {
  const gold = goldMat();
  const white = mat(COLORS.wall);
  const roofMat = mat(COLORS.roof);
  g.add(mesh(new THREE.BoxGeometry(5.6, 0.3, 5.2), mat(0xE9E1D0), { y: 0.15, receive: true }));
  // Central Golden Prang
  g.add(mesh(new THREE.CylinderGeometry(1.05, 1.25, 0.65, 8), white, { x: 0.9, y: 0.6 }));
  g.add(mesh(new THREE.CylinderGeometry(0.85, 0.98, 0.85, 8), white, { x: 0.9, y: 1.3 }));
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const y = (i / 20) * 2.8;
    const r = 0.78 * Math.pow(1 - y / 3.0, 0.82) * (1 + 0.05 * Math.sin(i * 1.7));
    pts.push(new THREE.Vector2(Math.max(r, 0.04), y));
  }
  g.add(mesh(new THREE.LatheGeometry(pts, 12), gold, { x: 0.9, y: 1.72 }));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.65, 6), gold, { x: 0.9, y: 4.8 }));
  // Royal Vihara
  g.add(mesh(new THREE.BoxGeometry(3.2, 1.1, 1.8), white, { x: -1.0, y: 0.85 }));
  const r1 = prism(1.25, 3.5, roofMat); r1.position.set(-1.0, 1.7, 0); g.add(r1);
  const r2 = prism(0.95, 2.5, gold); r2.position.set(-0.8, 2.15, 0); g.add(r2);
}

// 2. Chan Palace — Brick citadel + Golden King Naresuan Shrine
function buildChanPalace(g) {
  const gold = goldMat();
  const brick = mat(COLORS.brick);
  g.add(mesh(new THREE.BoxGeometry(5.2, 0.2, 4.8), mat(0xC9B99A), { y: 0.1, receive: true }));
  for (const [x, z, w, d] of [[-1.1, -0.8, 1.6, 1.2], [1.0, -1.0, 1.2, 0.9], [-0.9, 1.0, 1.4, 0.9]]) {
    g.add(mesh(new THREE.BoxGeometry(w, 0.28, d), brick, { x, y: 0.3, z }));
  }
  const shrine = new THREE.Group();
  shrine.position.set(0, 0.2, 0);
  shrine.add(mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), mat(0xEFE8DA), { y: 0.25 }));
  shrine.add(mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), mat(COLORS.wall), { y: 0.85 }));
  for (let i = 0; i < 4; i++) {
    const tier = mesh(new THREE.ConeGeometry(0.72 - i * 0.15, 0.42, 4), gold, { y: 1.5 + i * 0.3 });
    tier.rotation.y = Math.PI / 4;
    shrine.add(tier);
  }
  g.add(shrine);
}

// 3. Wat Nang Phaya — Golden Lotus-Bud Chedi + Ubosot
function buildWatNangPhaya(g) {
  const gold = goldMat();
  const white = mat(COLORS.wall);
  g.add(mesh(new THREE.BoxGeometry(3.2, 0.24, 3.0), mat(0xE9E1D0), { y: 0.12, receive: true }));
  g.add(mesh(new THREE.BoxGeometry(1.8, 0.85, 1.2), white, { x: -0.35, y: 0.65 }));
  const roof = prism(0.85, 2.0, gold);
  roof.position.set(-0.35, 1.35, 0);
  g.add(roof);
  // Lotus-bud chedi
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.7, 8), gold, { x: 0.85, y: 0.55 }));
  g.add(mesh(new THREE.SphereGeometry(0.42, 12, 10), gold, { x: 0.85, y: 1.15 }));
  g.add(mesh(new THREE.ConeGeometry(0.22, 0.95, 8), gold, { x: 0.85, y: 1.85 }));
}

// 4. Wat Ratchaburana — Principal Sukhothai Bell Chedi in Gold
function buildWatRatchaburana(g) {
  const gold = goldMat();
  const brick = mat(COLORS.brick);
  g.add(mesh(new THREE.BoxGeometry(3.4, 0.24, 3.2), mat(0xDFD3BE), { y: 0.12, receive: true }));
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.15, 0.65, 12), brick, { y: 0.55 }));
  g.add(mesh(new THREE.CylinderGeometry(0.65, 0.85, 0.75, 16), gold, { y: 1.25 }));
  g.add(mesh(new THREE.SphereGeometry(0.62, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold, { y: 1.62 }));
  g.add(mesh(new THREE.ConeGeometry(0.22, 1.35, 12), gold, { y: 2.65 }));
}

// 5. Phitsanulok City Pillar Shrine — 4-Porch Mandapa (จตุรมุขยอดปรางค์สีทอง)
function buildCityPillar(g) {
  const gold = goldMat();
  const white = mat(COLORS.wall);
  g.add(mesh(new THREE.BoxGeometry(2.8, 0.25, 2.8), mat(0xEFE8DA), { y: 0.12, receive: true }));
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.95, 1.0), white, { y: 0.72 }));
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.95, 1.7), white, { y: 0.72 }));
  for (let i = 0; i < 4; i++) {
    const spire = mesh(new THREE.ConeGeometry(0.75 - i * 0.15, 0.45, 8), gold, { y: 1.45 + i * 0.32 });
    g.add(spire);
  }
}

function addHalo(x, z, radius, colorHex) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius, radius + 0.18, 48),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.05, z);
  scene.add(ring);
  return ring;
}

// Distinct 3D Models for Restaurants (#0F3D3E) vs Hotels (#1E3A8A)
function addMerchant(m, isNew) {
  const key = `merchant:${m.slug}`;
  const subKind = merchantLayer(m);
  const isHotel = subKind === 'hotel';
  const coords = (typeof m.x === 'number' && typeof m.z === 'number') ? { x: m.x, z: m.z } : gpsTo3D(m.lat, m.lng);

  const g = new THREE.Group();
  g.position.set(coords.x, 0, coords.z);

  let head;
  let anchorY;
  if (isHotel) {
    // Hotel Model (#1E3A8A): High-rise tower / boutique resort with glowing royal blue crown
    const bMat = hotelMat();
    const glassMat = mat(0xDBEAFE, { roughness: 0.2, metalness: 0.4 });
    g.add(mesh(new THREE.BoxGeometry(1.8, 0.22, 1.6), mat(0xE2E8F0), { y: 0.11, receive: true }));
    g.add(mesh(new THREE.BoxGeometry(1.25, 2.2, 1.05), bMat, { y: 1.2 }));
    // Window bands
    for (const wy of [0.65, 1.15, 1.65, 2.05]) {
      g.add(mesh(new THREE.BoxGeometry(1.29, 0.14, 0.85), glassMat, { y: wy }));
    }
    // Side resort wing
    g.add(mesh(new THREE.BoxGeometry(0.8, 1.1, 0.9), bMat, { x: 0.75, y: 0.65 }));
    // Glowing beacon pin above hotel
    head = mesh(new THREE.OctahedronGeometry(0.38, 0), mat(0x2563EB, { emissive: 0x3B82F6, emissiveIntensity: 0.8, roughness: 0.2 }), { y: 2.85 });
    g.add(head);
    anchorY = 3.2;
  } else {
    // Restaurant Model (#0F3D3E): Riverside shop building with glowing emerald sign
    const rMat = emeraldMat();
    const signMat = mat(0x10B981, { emissive: 0x059669, emissiveIntensity: 0.85, roughness: 0.25 });
    g.add(mesh(new THREE.BoxGeometry(1.5, 0.2, 1.35), mat(0xF3EDE2), { y: 0.1, receive: true }));
    g.add(mesh(new THREE.BoxGeometry(1.2, 0.78, 1.05), mat(0xFAF6EE), { y: 0.49 }));
    const roof = prism(0.76, 1.38, rMat);
    roof.position.y = 1.05;
    g.add(roof);
    // Glowing shop sign board
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.28, 0.12), signMat, { y: 1.48, z: 0.35 }));
    // Floating emerald pin sphere
    head = mesh(new THREE.SphereGeometry(0.32, 18, 14), rMat, { y: 2.05 });
    const ring = mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 24), goldMat(), { y: 2.05 });
    ring.rotation.x = Math.PI / 2;
    g.add(head, ring);
    anchorY = 2.45;
  }

  scene.add(g);
  const halo = addHalo(coords.x, coords.z, 1.15, isHotel ? COLORS.hotelGlow : COLORS.emeraldGlow);

  const anchor = new THREE.Vector3(coords.x, anchorY, coords.z);
  const ent = { kind: 'merchant', subKind, data: m, group: g, halo, anchor, meshes: [], head, isNew };
  g.traverse((o) => { if (o.isMesh) { o.userData.key = key; ent.meshes.push(o); } });
  ent.label = makeLabel(key, ent);
  entities.set(key, ent);

  const lm = state.data.landmarks.find((l) => l.id === m.nearest) || state.data.landmarks[0];
  const lmCoords = (typeof lm.x === 'number' && typeof lm.z === 'number') ? { x: lm.x, z: lm.z } : gpsTo3D(lm.lat, lm.lng);
  addTrail(
    new THREE.Vector3(lmCoords.x, lm.id === 'wat-yai' ? 2.8 : 1.8, lmCoords.z),
    new THREE.Vector3(coords.x, anchorY - 0.35, coords.z),
    subKind
  );
}

function addTrail(from, to, targetSubKind) {
  const mid = from.clone().lerp(to, 0.5);
  mid.y = Math.max(from.y, to.y) + 1.5 + from.distanceTo(to) * 0.1;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const color = targetSubKind === 'hotel' ? 0x3B82F6 : COLORS.goldBright;
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 40, 0.045, 6, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
  );
  scene.add(tube);
  const pulses = [];
  for (let i = 0; i < 2; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xFFF8DC }));
    scene.add(p);
    pulses.push(p);
  }
  trails.push({ curve, tube, pulses, speed: 0.2, offset: Math.random(), targetSubKind });
}

// --------------------------------------------------------------- labels
function shortName(ent) {
  const d = ent.data;
  const raw = tr(d.name);
  return raw.split(' (')[0];
}

function makeLabel(key, ent) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `map-label map-label--${ent.subKind}`;
  b.dataset.filteredOut = 'false';
  b.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="txt"></span>`;
  b.querySelector('.txt').textContent = shortName(ent);
  b.setAttribute('aria-label', `ดูข้อมูล ${tr(ent.data.name, 'th')}`);
  b.addEventListener('click', () => focusEntity(key));
  labelsEl.appendChild(b);
  return b;
}

function updateLabelStates() {
  for (const [key, ent] of entities) {
    if (ent.label) ent.label.classList.toggle('map-label--active', key === activeKey);
  }
}

function fallbackEntity(key) {
  const [kind, id] = key.split(':');
  if (kind === 'landmark') {
    const lm = state.data.landmarks.find((l) => l.id === id);
    return lm ? { kind: 'landmark', subKind: 'heritage', data: lm } : null;
  }
  const m = state.data.merchants.find((x) => x.slug === id);
  return m ? { kind: 'merchant', subKind: merchantLayer(m), data: m } : null;
}

function renderFallbackLabels() {
  if (!labelsEl) return;
  labelsEl.innerHTML = '';
  labelsEl.style.pointerEvents = 'auto';
  labelsEl.style.display = 'flex';
  labelsEl.style.flexWrap = 'wrap';
  labelsEl.style.gap = '8px';
  labelsEl.style.padding = '56px 12px 12px';
  labelsEl.style.alignContent = 'flex-start';
  const items = [
    ...state.data.landmarks.map((l) => ({ key: `landmark:${l.id}`, kind: 'landmark', subKind: 'heritage', data: l })),
    ...state.data.merchants.map((m) => ({ key: `merchant:${m.slug}`, kind: 'merchant', subKind: merchantLayer(m), data: m }))
  ].filter((it) => state.mapLayers.has(it.subKind));

  for (const it of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `map-label map-label--${it.subKind}`;
    b.style.position = 'static';
    b.style.transform = 'none';
    b.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="txt">${esc(shortName(it))}</span>`;
    b.addEventListener('click', () => focusEntity(it.key));
    labelsEl.appendChild(b);
  }
}

// --------------------------------------------------------------- controls
function bindControls() {
  const pointers = new Map();
  let downAt = null;
  let lastPinch = 0;
  let panMode = false;

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    panMode = e.button === 2 || e.shiftKey;
    rig.anim = null;
    if (pointers.size === 2) lastPinch = pinchDistance(pointers);
  });
  canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const d = pinchDistance(pointers);
      if (lastPinch) zoom(lastPinch / d);
      lastPinch = d;
      return;
    }
    if (panMode) pan(dx, dy);
    else {
      rig.theta -= dx * 0.006;
      rig.phi = clamp(rig.phi - dy * 0.005, 0.28, 1.38);
    }
    start();
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) lastPinch = 0;
    if (downAt && pointers.size === 0) {
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      if (moved < 6 && performance.now() - downAt.t < 500) pick(e);
      downAt = null;
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); downAt = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    rig.anim = null;
    zoom(1 + clamp(e.deltaY, -120, 120) * 0.0012);
    start();
  }, { passive: false });
}

function pinchDistance(pointers) {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y) || 1;
}

function zoom(factor) { rig.radius = clamp(rig.radius * factor, 8, 58); }

function pan(dx, dy) {
  const speed = rig.radius * 0.0018;
  const sin = Math.sin(rig.theta), cos = Math.cos(rig.theta);
  rig.target.x = clamp(rig.target.x - (dx * cos + dy * sin) * speed, -16, 16);
  rig.target.z = clamp(rig.target.z - (-dx * sin + dy * cos) * speed, -16, 16);
}

function pick(e) {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const pickables = [];
  for (const ent of entities.values()) {
    if (!ent.group || ent.group.visible) pickables.push(...ent.meshes);
  }
  const hit = raycaster.intersectObjects(pickables, false)[0];
  if (hit && hit.object.userData.key) focusEntity(hit.object.userData.key);
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function flyTo(target, radius, theta, phi) {
  let dTheta = theta - rig.theta;
  dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
  if (reducedMotion()) {
    rig.target.copy(target); rig.radius = radius; rig.theta += dTheta; rig.phi = phi;
    start();
    return;
  }
  rig.anim = {
    t0: performance.now(), dur: 1100,
    from: { target: rig.target.clone(), radius: rig.radius, theta: rig.theta, phi: rig.phi },
    to: { target, radius, theta: rig.theta + dTheta, phi }
  };
  start();
}

// --------------------------------------------------------------- loop
function start() {
  if (running || !renderer || !visible || document.hidden) return;
  running = true;
  clock.getDelta();
  requestAnimationFrame(frame);
}

function frame(now) {
  if (!visible || document.hidden) { running = false; return; }
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = now / 1000;

  if (rig.anim) {
    const a = rig.anim;
    const k = ease(Math.min(1, (now - a.t0) / a.dur));
    rig.target.lerpVectors(a.from.target, a.to.target, k);
    rig.radius = a.from.radius + (a.to.radius - a.from.radius) * k;
    rig.theta = a.from.theta + (a.to.theta - a.from.theta) * k;
    rig.phi = a.from.phi + (a.to.phi - a.from.phi) * k;
    if (k >= 1) rig.anim = null;
  }
  const sp = Math.sin(rig.phi);
  camera.position.set(
    rig.target.x + rig.radius * sp * Math.sin(rig.theta),
    rig.target.y + rig.radius * Math.cos(rig.phi),
    rig.target.z + rig.radius * sp * Math.cos(rig.theta)
  );
  camera.lookAt(rig.target);

  if (!reducedMotion()) {
    if (water) water.material.map.offset.y -= dt * 0.05;
    for (const trObj of trails) {
      trObj.pulses.forEach((p, i) => {
        if (!p.visible) return;
        const u = (t * trObj.speed + trObj.offset + i / trObj.pulses.length) % 1;
        p.position.copy(trObj.curve.getPointAt(u));
      });
    }
    for (const b of boats) {
      b.g.position.z += b.speed * dt;
      if (b.g.position.z > 15) b.g.position.z = -15;
      if (b.g.position.z < -15) b.g.position.z = 15;
      b.g.position.x = b.baseX + riverCenterX(b.g.position.z) * 0.7;
      b.g.rotation.y = b.speed > 0 ? 0 : Math.PI;
    }
    for (const ent of entities.values()) {
      if (ent.head) ent.head.position.y += Math.sin(t * 2.2 + (ent.data.x || 0)) * 0.002;
    }
  }

  renderer.render(scene, camera);
  positionLabels();
  requestAnimationFrame(frame);
}

const tmp = { v: null };
function positionLabels() {
  if (!tmp.v) tmp.v = new THREE.Vector3();
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const visibleItems = [];

  for (const [key, ent] of entities.entries()) {
    if (!ent.label) continue;
    if (ent.label.dataset.filteredOut === 'true') {
      ent.label.style.visibility = 'hidden';
      continue;
    }
    tmp.v.copy(ent.anchor).project(camera);
    const behind = tmp.v.z > 1;
    const x = (tmp.v.x * 0.5 + 0.5) * w;
    const y = (-tmp.v.y * 0.5 + 0.5) * h;
    const off = behind || x < -40 || x > w + 40 || y < 10 || y > h + 40;
    if (off) {
      ent.label.style.visibility = 'hidden';
      continue;
    }
    const priority = key === activeKey ? 3 : ent.kind === 'landmark' ? 2 : 1;
    visibleItems.push({
      ent,
      x,
      y,
       priority,
      halfW: Math.max(58, (ent.label.offsetWidth || 124) * 0.5 + 4),
      halfH: Math.max(19, (ent.label.offsetHeight || 36) * 0.5 + 3)
    });
  }

  // 2D Collision-Avoidance pass so all 13 floating pin labels never overlap
  visibleItems.sort((a, b) => a.y - b.y || b.priority - a.priority);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < visibleItems.length; i++) {
      for (let j = i + 1; j < visibleItems.length; j++) {
        const a = visibleItems[i];
        const b = visibleItems[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minX = a.halfW + b.halfW;
        const minY = a.halfH + b.halfH;
        if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
          const overlapY = minY - Math.abs(dy);
          const dirY = dy >= 0 ? 1 : -1;
          const pushY = overlapY * 0.52 + 1;
          a.y -= dirY * pushY;
          b.y += dirY * pushY;
          const dirX = dx >= 0 ? 1 : -1;
          a.x -= dirX * 3;
          b.x += dirX * 3;
        }
      }
    }
  }

  for (const item of visibleItems) {
    const cx = clamp(item.x, item.halfW + 6, Math.max(item.halfW + 6, w - item.halfW - 6));
    const cy = clamp(item.y, item.halfH * 2 + 6, Math.max(item.halfH * 2 + 6, h - 8));
    item.ent.label.style.visibility = 'visible';
    item.ent.label.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) translate(-50%, -100%)`;
  }
}
