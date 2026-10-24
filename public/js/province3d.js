// Whole-province 3D board for Phitsanulok: real district borders, neighbouring provinces and the Nan River
// (boundaries from OpenStreetMap, see province-data.js). Rendered by map3d.js as its own scene.
import { state, esc } from './core.js';
import { t } from './i18n.js';
import { CLIP, DISTRICTS, NEIGHBORS, NAN_RIVER } from './province-data.js';

const CENTER = { lng: 100.48, lat: 17.03 };
const K = 22;
const COS = Math.cos(CENTER.lat * Math.PI / 180);
const HEIGHT = 0.45;          // district slab
const NEIGHBOR_HEIGHT = 0.25; // neighbouring provinces
const TOP = HEIGHT + 0.12;    // district slab + bevel

export const project = (lng, lat) => ({ x: (lng - CENTER.lng) * K * COS, z: -(lat - CENTER.lat) * K });

const COLORS = {
  mueang: 0x8CC084, 'bang-krathum': 0xE8C574, 'wang-thong': 0xE2B485, 'phrom-phiram': 0x9B82C5, 'wat-bot': 0x7FB8C4,
  'bang-rakam': 0xE08283, 'noen-maprang': 0xEFA3A0, 'nakhon-thai': 0xC8A686, 'chat-trakan': 0xE6CC8A
};

/** Ray-casting point-in-polygon on [lng, lat] rings. */
export function inRing(ring, lng, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** District id that contains a GPS point, or null outside the province. */
export function districtAt(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return DISTRICTS.find((d) => inRing(d.ring, lng, lat))?.id || null;
}

export const districtName = (d, lang = state.lang) => (lang === 'th' ? d.th : d.en);
export const DISTRICT_LIST = DISTRICTS;

/** Places (landmarks + shops/hotels) of the demo that fall inside each district. */
export function placesByDistrict() {
  const out = Object.fromEntries(DISTRICTS.map((d) => [d.id, []]));
  const all = [
    ...(state.data?.landmarks || []).map((l) => ({ key: `landmark:${l.id}`, data: l })),
    ...(state.data?.merchants || []).map((m) => ({ key: `merchant:${m.slug}`, data: m }))
  ];
  for (const p of all) {
    const id = districtAt(p.data.lat, p.data.lng);
    if (id) out[id].push(p);
  }
  return out;
}

export function createProvince(THREE, { labelsEl, onDistrict, onCity }) {
  const scene = new THREE.Scene();
  const pickables = [];
  const districtMeshes = new Map();
  const labels = [];
  const clouds = [];
  const themed = [];
  let activeId = null;
  let hoverId = null;

  const hemi = new THREE.HemisphereLight(0xFFFFFF, 0x8A93A8, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xFFF4E0, 2.0);
  sun.position.set(-14, 30, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const shapeOf = (ring) => {
    const s = new THREE.Shape();
    ring.forEach(([lng, lat], i) => {
      const p = project(lng, lat);
      if (i === 0) s.moveTo(p.x, -p.z); else s.lineTo(p.x, -p.z);
    });
    return s;
  };
  // Shape lies in XY; rotating -90° about X turns +Y (north) into -Z and extrudes upwards.
  const slab = (shape, depth, opts = {}) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, curveSegments: 1, ...opts });
    g.rotateX(-Math.PI / 2);
    return g;
  };
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, flatShading: true, ...extra });

  // Base board: the clip window as land the demo doesn't cover
  const a = project(CLIP.w, CLIP.n), b = project(CLIP.e, CLIP.s);
  const r = 1.4;
  const board = new THREE.Shape();
  board.moveTo(a.x + r, -a.z);
  board.lineTo(b.x - r, -a.z); board.quadraticCurveTo(b.x, -a.z, b.x, -a.z - r);
  board.lineTo(b.x, -b.z + r); board.quadraticCurveTo(b.x, -b.z, b.x - r, -b.z);
  board.lineTo(a.x + r, -b.z); board.quadraticCurveTo(a.x, -b.z, a.x, -b.z + r);
  board.lineTo(a.x, -a.z - r); board.quadraticCurveTo(a.x, -a.z, a.x + r, -a.z);
  const boardMesh = new THREE.Mesh(slab(board, 0.5, { bevelEnabled: false }), mat(0xB9BECB));
  boardMesh.position.y = -0.5;
  boardMesh.receiveShadow = true;
  scene.add(boardMesh);
  themed.push({ mesh: boardMesh, light: 0xB9BECB, dark: 0x111827 });

  for (const n of NEIGHBORS) {
    const m = new THREE.Mesh(slab(shapeOf(n.ring), NEIGHBOR_HEIGHT, { bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 }), mat(0xD3D5DE));
    m.receiveShadow = true;
    scene.add(m);
    themed.push({ mesh: m, light: 0xD3D5DE, dark: 0x1E293B });
    labels.push({ kind: 'neighbor', item: n, el: makeNeighborLabel(n), anchor: new THREE.Vector3(project(...n.label).x, NEIGHBOR_HEIGHT + 0.1, project(...n.label).z) });
  }

  for (const d of DISTRICTS) {
    const color = COLORS[d.id] || 0xCCCCCC;
    const m = new THREE.Mesh(
      slab(shapeOf(d.ring), HEIGHT, { bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.07, bevelSegments: 1 }),
      mat(color, { emissive: 0x000000 })
    );
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.district = d.id;
    scene.add(m);
    pickables.push(m);
    districtMeshes.set(d.id, m);
    themed.push({ mesh: m, light: color, dark: new THREE.Color(color).lerp(new THREE.Color(0x0F172A), 0.42).getHex() });
    const c = project(...d.label);
    labels.push({ kind: 'district', item: d, el: makeDistrictLabel(d), anchor: new THREE.Vector3(c.x, TOP + 0.05, c.z) });
  }

  // Nan River: sits on the district slabs inside the province, lower over the neighbours
  const riverPts = NAN_RIVER.map(([lng, lat]) => {
    const p = project(lng, lat);
    return new THREE.Vector3(p.x, (districtAt(lat, lng) ? TOP : NEIGHBOR_HEIGHT + 0.05) + 0.03, p.z);
  });
  const riverMat = new THREE.MeshStandardMaterial({ color: 0x3B9AE1, roughness: 0.3, metalness: 0.1, emissive: 0x0B4F8A, emissiveIntensity: 0.35 });
  const river = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(riverPts), riverPts.length * 2, 0.085, 5, false), riverMat);
  scene.add(river);

  // Low-poly trees scattered inside the province (decorative, seeded so they never move)
  const rand = seeded(65);
  const treeGeo = new THREE.ConeGeometry(0.16, 0.5, 5);
  treeGeo.translate(0, 0.25, 0);
  const trees = new THREE.InstancedMesh(treeGeo, mat(0x3E8E5C), 170);
  const city = project(100.2612, 16.8228);
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let tries = 0; placed < 170 && tries < 6000; tries++) {
    const lng = CLIP.w + rand() * (CLIP.e - CLIP.w);
    const lat = CLIP.s + rand() * (CLIP.n - CLIP.s);
    const inside = districtAt(lat, lng);
    const p = project(lng, lat);
    if (!inside || Math.hypot(p.x - city.x, p.z - city.z) < 1.6) continue;
    dummy.position.set(p.x, TOP - 0.02, p.z);
    dummy.scale.setScalar(0.75 + rand() * 0.6);
    dummy.updateMatrix();
    trees.setMatrixAt(placed++, dummy.matrix);
  }
  trees.count = placed;
  trees.castShadow = true;
  scene.add(trees);
  themed.push({ mesh: trees, light: 0x3E8E5C, dark: 0x1F5138 });

  // The city of Phitsanulok: a golden prang for Wat Yai, the entry point to the detailed city map
  const watYai = state.data?.landmarks?.find((l) => l.id === 'wat-yai');
  const cityPos = watYai ? project(watYai.lng, watYai.lat) : city;
  const cityGroup = new THREE.Group();
  cityGroup.position.set(cityPos.x, TOP, cityPos.z);
  const gold = new THREE.MeshStandardMaterial({ color: 0xE6B422, metalness: 0.45, roughness: 0.35, emissive: 0x8A6200, emissiveIntensity: 0.4, flatShading: true });
  const white = mat(0xFAF6EE);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.22, 8), white);
  base.position.y = 0.11;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.7, 8), gold);
  body.position.y = 0.57;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.95, 8), gold);
  spire.position.y = 1.39;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 6, 28), new THREE.MeshBasicMaterial({ color: 0xFACC15, transparent: true, opacity: 0.85 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  [base, body, spire].forEach((o) => { o.castShadow = true; o.userData.city = true; pickables.push(o); });
  cityGroup.add(base, body, spire, ring);
  scene.add(cityGroup);
  labels.push({ kind: 'city', el: makeCityLabel(), anchor: new THREE.Vector3(cityPos.x, TOP + 1.95, cityPos.z) });

  // A few low-poly clouds drifting over the board
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
  [[-17, -14], [15, -16], [-19, 10], [17, 12], [3, 19]].forEach(([x, z], i) => {
    const g = new THREE.Group();
    [[0, 0, 0, 1.1], [1.1, -0.15, 0.2, 0.8], [-1, -0.2, -0.1, 0.75]].forEach(([dx, dy, dz, s]) => {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), cloudMat);
      puff.position.set(dx, dy, dz);
      g.add(puff);
    });
    g.position.set(x, 5.5 + (i % 2), z);
    scene.add(g);
    clouds.push({ g, speed: 0.25 + (i % 3) * 0.08, x0: x });
  });

  function makeDistrictLabel(d) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prov-label';
    btn.dataset.district = d.id;
    btn.innerHTML = '<span class="prov-label__name"></span><b class="prov-label__count"></b>';
    btn.addEventListener('click', () => onDistrict(d.id));
    labelsEl.appendChild(btn);
    return btn;
  }
  function makeNeighborLabel() {
    const el = document.createElement('span');
    el.className = 'prov-label prov-label--neighbor';
    el.setAttribute('aria-hidden', 'true');
    labelsEl.appendChild(el);
    return el;
  }
  function makeCityLabel() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prov-pin';
    btn.addEventListener('click', () => onCity());
    labelsEl.appendChild(btn);
    return btn;
  }

  function refreshLabels() {
    const counts = placesByDistrict();
    const total = Object.values(counts).reduce((s, v) => s + v.length, 0);
    for (const l of labels) {
      if (l.kind === 'district') {
        const n = counts[l.item.id].length;
        l.el.querySelector('.prov-label__name').textContent = districtName(l.item);
        l.el.querySelector('.prov-label__count').textContent = n ? String(n) : '';
        l.el.querySelector('.prov-label__count').hidden = !n;
        l.el.setAttribute('aria-label', t('prov.districtAria', { name: districtName(l.item), n }));
      } else if (l.kind === 'neighbor') {
        l.el.textContent = state.lang === 'th' ? l.item.th : l.item.en;
      } else {
        l.el.innerHTML = `<span aria-hidden="true">📍</span> ${esc(t('prov.cityPin', { n: total }))}`;
      }
    }
  }

  function setActive(id) {
    activeId = id;
    paint();
  }
  function setHover(id) {
    if (id === hoverId) return false;
    hoverId = id;
    paint();
    return true;
  }
  function paint() {
    for (const [id, m] of districtMeshes) {
      const on = id === activeId;
      m.position.y = on ? 0.18 : 0;
      m.material.emissive.setHex(on ? 0x5A4500 : id === hoverId ? 0x2A2A2A : 0x000000);
      m.material.emissiveIntensity = on ? 0.35 : 0.3;
    }
    for (const l of labels) if (l.kind === 'district') l.el.classList.toggle('is-active', l.item.id === activeId);
  }

  function applyTheme(isDark) {
    for (const x of themed) x.mesh.material.color.setHex(isDark ? x.dark : x.light);
    hemi.intensity = isDark ? 0.8 : 1.35;
    hemi.groundColor.setHex(isDark ? 0x0F172A : 0x8A93A8);
    sun.intensity = isDark ? 1.3 : 2.0;
    cloudMat.opacity = isDark ? 0.35 : 0.92;
  }

  function tick(dt, t, still) {
    if (still) return;
    for (const c of clouds) {
      c.g.position.x += c.speed * dt;
      if (c.g.position.x > 26) c.g.position.x = -26;
    }
    ring.scale.setScalar(1 + Math.sin(t * 2.4) * 0.08);
  }

  /** Place HTML labels over the canvas; lower-priority labels hide when they would overlap. */
  const v = new THREE.Vector3();
  function positionLabels(camera, w, h, show) {
    const placed = [];
    const order = labels.slice().sort((p, q) => prio(q) - prio(p));
    for (const l of order) {
      if (!show && l.kind !== 'city') { l.el.style.visibility = 'hidden'; continue; }
      v.copy(l.anchor);
      if (l.kind === 'district' && l.item.id === activeId) v.y += 0.18;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const bw = l.el.offsetWidth || 80, bh = l.el.offsetHeight || 30;
      // Mueang shares its spot with the city pin, so its name hangs below the anchor instead of above it.
      const below = l.kind === 'district' && l.item.id === 'mueang';
      const box = below ? { l: x - bw / 2, r: x + bw / 2, t: y + 10, b: y + 10 + bh } : { l: x - bw / 2, r: x + bw / 2, t: y - bh, b: y };
      const off = v.z > 1 || box.r < 0 || box.l > w || box.b < 0 || box.t > h;
      const clash = placed.some((p) => box.l < p.r && p.l < box.r && box.t < p.b && p.t < box.b);
      if (off || clash) { l.el.style.visibility = 'hidden'; continue; }
      placed.push(box);
      l.el.style.visibility = 'visible';
      l.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, ${below ? '10px' : '-100%'})`;
    }
  }
  const prio = (l) => (l.kind === 'city' ? 3 : l.kind === 'district' ? (l.item.id === activeId ? 2.5 : 2) : 1);

  function districtCenter(id) {
    const d = DISTRICTS.find((x) => x.id === id);
    const p = project(...d.label);
    return new THREE.Vector3(p.x, TOP, p.z);
  }

  refreshLabels();
  return {
    scene, pickables, sun, applyTheme, tick, positionLabels, refreshLabels, setActive, setHover, districtCenter,
    cityCenter: new THREE.Vector3(cityPos.x, TOP, cityPos.z),
    setVisible(on) { labelsEl.hidden = !on; }
  };
}

function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
