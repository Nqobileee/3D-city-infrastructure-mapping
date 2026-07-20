// ============================================================
// INZILA — Single-city Digital Twin Demo (Harare CBD pilot)
// "Google Earth, but with underground."
// Surface: terrain, blocked-out buildings, real-width streets,
// street furniture. Underground: fibre ducts, water reticulation,
// electricity cable, and one mine's tunnel network.
// NOTE: demo data is synthetic; underground depths and mine
// depths are exaggerated (~x1000 / x5) so they read at this
// scale. Real depths are shown on each asset record card.
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CITY, LANDMARK, MINE, POWER_STATION, OWNERS } from './data.js';

function pt(x, y = 0, z = 0) { return new THREE.Vector3(x, y, z); }

// ---------- seeded RNG so the demo is deterministic ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260714);
const pick = arr => arr[Math.floor(rng() * arr.length)];

let assetSeq = 1000;
function assetId() { return 'INZ-' + (assetSeq++).toString().padStart(6, '0'); }
function fakeDate() {
  const d = new Date(2026, Math.floor(rng() * 6), 1 + Math.floor(rng() * 27));
  return d.toISOString().slice(0, 10);
}
function verification() {
  const r = rng();
  return r < 0.68 ? 'verified' : (r < 0.88 ? 'unverified' : 'unverified_digitised');
}
function captureMethod() {
  return pick(['gnss_rtk', 'gnss_handheld', 'electromagnetic_locator', 'digitised_drawing', 'as_built_import']);
}

// ---------- renderer / scene / camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3f5);
scene.fog = new THREE.FogExp2(0xbfe3f5, 0.01);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.03, 800);
camera.position.set(3, 15, 19);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxDistance = 260;
controls.minDistance = 0.15;
controls.maxPolarAngle = Math.PI * 0.86;
controls.target.set(0.5, 0, 0.5);

scene.add(new THREE.HemisphereLight(0xffffff, 0xcbb99a, 0.75));
const sun = new THREE.DirectionalLight(0xfff8ec, 1.15);
sun.position.set(-30, 45, -18);
scene.add(sun);

// ---------- groups (layer toggles) ----------
const G = {
  terrain: new THREE.Group(), buildings: new THREE.Group(), roads: new THREE.Group(),
  fibre: new THREE.Group(), water: new THREE.Group(), power: new THREE.Group(),
  street: new THREE.Group(), mines: new THREE.Group(), labels: new THREE.Group(),
};
Object.values(G).forEach(g => scene.add(g));

const stats = { buildings: 0, underground: 0, fibreKm: 0, waterKm: 0, powerKm: 0, mines: 1, surface: 0 };
const clickables = [];
const digAssets = [];
const labelSprites = [];

function ribbon(points, width, material) {
  const verts = [], idx = [];
  const half = width / 2;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dir = new THREE.Vector3();
    if (i === 0) dir.subVectors(points[1], points[0]);
    else if (i === points.length - 1) dir.subVectors(p, points[i - 1]);
    else dir.subVectors(points[i + 1], points[i - 1]);
    dir.y = 0; dir.normalize();
    const n = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(half);
    verts.push(p.x + n.x, p.y, p.z + n.z, p.x - n.x, p.y, p.z - n.z);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}
function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
  return L;
}
function samplePath(pts, step, cb) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = a.distanceTo(b), n = Math.max(1, Math.floor(d / step));
    for (let j = 0; j <= n; j++) cb(new THREE.Vector3().lerpVectors(a, b, j / n));
  }
}

// ============================================================
// 1. TERRAIN — a broad circular ground block with strata sides,
//    big enough to hold the city, the mine and the power station.
// ============================================================
const GROUND_R = 15.5, GROUND_DEPTH = 3.2;
const groundMats = [];
{
  const geo = new THREE.CylinderGeometry(GROUND_R, GROUND_R, GROUND_DEPTH, 64, 1, false);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf1e9d8, roughness: 0.95 });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xc2ac82, roughness: 1.0 });
  groundMats.push(capMat, sideMat);
  const ground = new THREE.Mesh(geo, [sideMat, capMat, capMat]);
  ground.position.y = -GROUND_DEPTH / 2;
  ground.name = 'ground';
  G.terrain.add(ground);
}

// ============================================================
// 2. CITY — block-based buildings so streets stay visible,
//    plus underground utility grids beneath the streets.
// ============================================================
const R = CITY.radius, STEP = CITY.blockStep;
const ROAD_W = 0.16;
const roadMat = new THREE.MeshStandardMaterial({ color: 0x7c828c, roughness: 0.85 });
const WATER_Y = -0.55, FIBRE_Y = -0.85, POWER_Y = -1.15;
const nBlocks = Math.ceil(R / STEP);

const buildingXforms = [], buildingRecords = [];
const streetSegs = [], waterSegs = [], fibreSegs = [], powerSegs = [];
const manholePos = [], hydrantPos = [], lightPos = [], valvePos = [], terminalXforms = [];
const manholeRecords = [], hydrantRecords = [], lightRecords = [], valveRecords = [], terminalRecords = [];

// street grid lines (only the portion inside the circle)
for (let g = -nBlocks; g <= nBlocks; g++) {
  const x = g * STEP;
  const half = Math.sqrt(Math.max(0, R * R - x * x));
  if (half > STEP * 0.4) {
    streetSegs.push([pt(x, 0.05, -half), pt(x, 0.05, half)]);
    if (g % 3 === 0) waterSegs.push([pt(x, WATER_Y, -half), pt(x, WATER_Y, half)]);
    if (g % 4 === 0) fibreSegs.push([pt(x, FIBRE_Y, -half), pt(x, FIBRE_Y, half)]);
    if ((g + 2) % 3 === 0) powerSegs.push([pt(x, POWER_Y, -half), pt(x, POWER_Y, half)]);
  }
  const z = g * STEP;
  const halfZ = Math.sqrt(Math.max(0, R * R - z * z));
  if (halfZ > STEP * 0.4) {
    streetSegs.push([pt(-halfZ, 0.05, z), pt(halfZ, 0.05, z)]);
    if (g % 3 === 0) waterSegs.push([pt(-halfZ, WATER_Y, z), pt(halfZ, WATER_Y, z)]);
    if (g % 4 === 0) fibreSegs.push([pt(-halfZ, FIBRE_Y, z), pt(halfZ, FIBRE_Y, z)]);
    if ((g + 2) % 3 === 0) powerSegs.push([pt(-halfZ, POWER_Y, z), pt(halfZ, POWER_Y, z)]);
  }
}
for (const [a, b] of streetSegs) G.roads.add(ribbon([a, b], ROAD_W, roadMat));

// city block cells -> sparse buildings with visible margins to the street
const cellMargin = 0.20; // fraction of step reserved as clear gap to the road on each side
for (let gx = -nBlocks; gx < nBlocks; gx++) {
  for (let gz = -nBlocks; gz < nBlocks; gz++) {
    const cx = (gx + 0.5) * STEP, cz = (gz + 0.5) * STEP;
    const distC = Math.hypot(cx, cz);
    if (distC > R * 0.97) continue;
    if (rng() < 0.16) continue; // leave some cells empty as plazas / open ground

    const downtown = distC < R * 0.32;
    const maxFoot = STEP * (1 - cellMargin * 2);
    const n = downtown && rng() < 0.4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const jitter = 0.16;
      const bx = cx + (n > 1 ? (k === 0 ? -STEP * 0.22 : STEP * 0.22) : 0) + (rng() - 0.5) * STEP * jitter;
      const bz = cz + (rng() - 0.5) * STEP * jitter;
      const w = maxFoot * (0.42 + rng() * 0.4) * (n > 1 ? 0.72 : 1);
      const d = maxFoot * (0.42 + rng() * 0.4) * (n > 1 ? 0.72 : 1);
      const h = downtown ? 0.30 + rng() * 0.85 : 0.05 + (1 - distC / R) * 0.30 * (0.4 + rng() * 1.3);
      buildingXforms.push({ x: bx, z: bz, w, d, h, hue: rng() });
      buildingRecords.push({ city: CITY.name, h });
    }
  }
}
stats.buildings = buildingXforms.length;

// landmark: Joina City
{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.35, metalness: 0.35 }));
  mesh.scale.set(LANDMARK.w, LANDMARK.h, LANDMARK.d);
  mesh.position.set(LANDMARK.x, 0.05, LANDMARK.z);
  mesh.userData = { kind: 'landmark' };
  clickables.push(mesh);
  G.buildings.add(mesh);
  labelSprites.push(addLabel(LANDMARK.name, pt(LANDMARK.x, LANDMARK.h + 0.6, LANDMARK.z), '#ffffff', 0.55));
}

// intersections for street furniture (sparse, not every corner)
const intersections = [];
for (let gx = -nBlocks; gx <= nBlocks; gx++) {
  for (let gz = -nBlocks; gz <= nBlocks; gz++) {
    const x = gx * STEP, z = gz * STEP;
    if (Math.hypot(x, z) <= R * 0.95) intersections.push({ x, z });
  }
}
for (const p of intersections) {
  const r = rng();
  if (r < 0.22) {
    manholePos.push(p);
    const type = rng() < 0.55 ? 'fibre_manhole' : (rng() < 0.5 ? 'water_chamber' : 'power_chamber');
    const owner = type === 'fibre_manhole' ? pick(OWNERS.fibre) : type === 'water_chamber' ? pick(OWNERS.water) : pick(OWNERS.power);
    const depthM = (0.6 + rng() * 1.8).toFixed(2);
    manholeRecords.push({ city: CITY.name, type, owner, depthM });
    digAssets.push({ x: p.x, z: p.z, type, owner, depthM, label: CITY.name + ' ' + type });
  } else if (r < 0.30) {
    hydrantPos.push(p);
    hydrantRecords.push({ city: CITY.name, owner: pick(OWNERS.water) });
  } else if (r < 0.36 && Math.hypot(p.x, p.z) < R * 0.55) {
    lightPos.push(p);
    lightRecords.push({ city: CITY.name, owner: pick(OWNERS.roads) });
  } else if (r < 0.42) {
    valvePos.push(p);
    const depthM = (0.5 + rng() * 1.2).toFixed(2);
    valveRecords.push({ city: CITY.name, owner: pick(OWNERS.water), depthM });
    digAssets.push({ x: p.x, z: p.z, type: 'water_valve', owner: pick(OWNERS.water), depthM, label: CITY.name + ' water_valve' });
  }
}
stats.surface = manholePos.length + hydrantPos.length + lightPos.length + valvePos.length;

// bus terminals
for (const p of [{ x: R * 0.42, z: R * 0.1 }, { x: -R * 0.35, z: -R * 0.3 }]) {
  terminalXforms.push(p);
  terminalRecords.push({ city: CITY.name, owner: pick(OWNERS.transit), name: 'Bus Terminal' });
}

// sample underground grids into dig-safe search set
function samplePairs(segs, step, cb) {
  for (const [a, b] of segs) {
    const d = a.distanceTo(b), n = Math.max(1, Math.floor(d / step));
    for (let j = 0; j <= n; j++) cb(new THREE.Vector3().lerpVectors(a, b, j / n));
  }
}
samplePairs(waterSegs, 0.6, p => digAssets.push({ x: p.x, z: p.z, type: 'water_pipe', owner: pick(OWNERS.water), depthM: (0.8 + rng() * 1.2).toFixed(2), label: 'water reticulation' }));
samplePairs(fibreSegs, 0.6, p => digAssets.push({ x: p.x, z: p.z, type: 'fibre_duct', owner: pick(OWNERS.fibre), depthM: (0.9 + rng() * 0.6).toFixed(2), label: 'urban fibre duct' }));
samplePairs(powerSegs, 0.6, p => digAssets.push({ x: p.x, z: p.z, type: 'electricity_cable', owner: pick(OWNERS.power), depthM: (0.7 + rng() * 0.5).toFixed(2), label: 'LV/MV cable' }));

function segLen(segs) { let L = 0; for (const [a, b] of segs) L += a.distanceTo(b); return L; }
stats.waterKm = segLen(waterSegs);
stats.fibreKm = segLen(fibreSegs);
stats.powerKm = segLen(powerSegs);

function undergroundGrid(segs, color, group, kind) {
  const pts = segs.flat();
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  l.userData = { kind };
  group.add(l);
}
undergroundGrid(waterSegs, 0x3aa0ff, G.water, 'water_pipe');
undergroundGrid(fibreSegs, 0x35e08a, G.fibre, 'fibre_duct');
undergroundGrid(powerSegs, 0xff5a48, G.power, 'electricity_cable');

// city label
labelSprites.push(addLabel(CITY.name + ' — ' + CITY.subtitle, pt(0, R * 0.55, 0), '#ffffff', 1.0));

// ---------- instanced meshes ----------
const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(geo, mat, buildingXforms.length);
  mesh.frustumCulled = false;
  buildingXforms.forEach((b, i) => {
    tmpM.makeScale(b.w, b.h, b.d).setPosition(b.x, 0.05, b.z);
    mesh.setMatrixAt(i, tmpM);
    const cool = b.hue < 0.5;
    const hue = cool ? 0.56 + rng() * 0.06 : 0.09 + rng() * 0.05;
    tmpC.setHSL(hue, 0.06 + rng() * 0.1, 0.80 + rng() * 0.14);
    mesh.setColorAt(i, tmpC);
  });
  mesh.userData = { kind: 'building', records: buildingRecords };
  clickables.push(mesh);
  G.buildings.add(mesh);
}
function instancedAt(geo, mat, positions, y, userData, group) {
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  mesh.frustumCulled = false;
  positions.forEach((p, i) => { tmpM.makeTranslation(p.x, y, p.z); mesh.setMatrixAt(i, tmpM); });
  mesh.userData = userData;
  clickables.push(mesh);
  group.add(mesh);
  return mesh;
}
instancedAt(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10),
  new THREE.MeshStandardMaterial({ color: 0xcfd6dd, roughness: 0.4, metalness: 0.8 }),
  manholePos, 0.08, { kind: 'manhole', records: manholeRecords }, G.street);
instancedAt(new THREE.BoxGeometry(0.045, 0.08, 0.045),
  new THREE.MeshStandardMaterial({ color: 0xff4757, emissive: 0x4d0a10, roughness: 0.5 }),
  hydrantPos, 0.09, { kind: 'hydrant', records: hydrantRecords }, G.street);
instancedAt(new THREE.ConeGeometry(0.03, 0.14, 6),
  new THREE.MeshStandardMaterial({ color: 0xb06cff, emissive: 0x2c0f4d, roughness: 0.5 }),
  lightPos, 0.12, { kind: 'traffic_signal', records: lightRecords }, G.street);
instancedAt(new THREE.SphereGeometry(0.045, 8, 8),
  new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x0a2c50 }),
  valvePos, WATER_Y, { kind: 'water_valve', records: valveRecords }, G.water);
{
  const geo = new THREE.BoxGeometry(0.42, 0.05, 0.24);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff9f1a, emissive: 0x492a00, roughness: 0.5 });
  const mesh = new THREE.InstancedMesh(geo, mat, terminalXforms.length);
  mesh.frustumCulled = false;
  terminalXforms.forEach((p, i) => { tmpM.makeTranslation(p.x, 0.1, p.z); mesh.setMatrixAt(i, tmpM); });
  mesh.userData = { kind: 'bus_terminal', records: terminalRecords };
  clickables.push(mesh);
  G.street.add(mesh);
}

// ============================================================
// 3. POWER STATION + HV corridor to the mine (via the city edge)
// ============================================================
{
  const psPos = pt(POWER_STATION.x, 0.28, POWER_STATION.z);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.30, 0.4, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: 0xffa94d, emissive: 0x552b0c, roughness: 0.5 })
  );
  mesh.position.copy(psPos);
  mesh.userData = { kind: 'power_station' };
  clickables.push(mesh);
  G.power.add(mesh);
  labelSprites.push(addLabel(POWER_STATION.name, pt(POWER_STATION.x, 1.15, POWER_STATION.z), '#ffd23e', 0.6));

  const minePos = pt(MINE.x, 0.5, MINE.z);
  const hvPts = [psPos.clone().setY(0.5), pt(-2.0, 1.6, 0.5), pt(2.6, 0.4, -0.6), minePos.clone().setY(0.5)];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hvPts), new THREE.LineBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.9 }));
  line.userData = { kind: 'transmission', name: 'Regional HV corridor' };
  G.power.add(line);
  stats.powerKm += pathLength(hvPts);

  const pylonPos = [];
  samplePath(hvPts, 0.9, p => pylonPos.push(p));
  const pylons = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.035, 0.06, 0.42, 5),
    new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.6, metalness: 0.6 }),
    pylonPos.length
  );
  pylons.frustumCulled = false;
  pylonPos.forEach((p, i) => { tmpM.makeTranslation(p.x, 0.22, p.z); pylons.setMatrixAt(i, tmpM); });
  pylons.userData = { kind: 'pylon' };
  clickables.push(pylons);
  G.power.add(pylons);

  // access road: city edge -> mine
  const ang = Math.atan2(MINE.z, MINE.x);
  const edge = pt(Math.cos(ang) * R * 0.99, 0.05, Math.sin(ang) * R * 0.99);
  const roadPts = [edge, pt(MINE.x - 0.6, 0.05, MINE.z + 0.4), minePos.clone().setY(0.05)];
  G.roads.add(ribbon(roadPts, 0.16, roadMat));

  // fibre spur to the mine (SCADA / monitoring link)
  const fibrePts = roadPts.map(p => p.clone().setY(FIBRE_Y));
  const fLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(fibrePts), new THREE.LineDashedMaterial({ color: 0x35e08a, dashSize: 0.3, gapSize: 0.15, transparent: true, opacity: 0.95 }));
  fLine.computeLineDistances();
  fLine.userData = { kind: 'fibre_trunk', name: 'Mine fibre spur' };
  G.fibre.add(fLine);
  stats.fibreKm += pathLength(fibrePts);
  samplePath(fibrePts, 0.35, p => digAssets.push({ x: p.x, z: p.z, type: 'fibre_duct', owner: pick(OWNERS.fibre), depthM: (0.9 + rng() * 0.4).toFixed(2), label: 'mine fibre spur' }));
}

// ============================================================
// 4. MINE — headframe, shaft, underground tunnel network
// ============================================================
const DEPTH_X = 5;
{
  const c = pt(MINE.x, 0, MINE.z);
  const depth = MINE.depthKm * DEPTH_X;

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.85, 4),
    new THREE.MeshStandardMaterial({ color: 0xd8dee9, emissive: 0x1c2430, roughness: 0.4, metalness: 0.5 })
  );
  head.position.set(c.x, 0.42, c.z);
  head.userData = { kind: 'mine' };
  clickables.push(head);
  G.mines.add(head);

  const plant = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.16, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x8a93a3, roughness: 0.8 })
  );
  plant.position.set(c.x + 0.45, 0.1, c.z + 0.22);
  G.mines.add(plant);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, depth, 8),
    new THREE.MeshBasicMaterial({ color: MINE.color, transparent: true, opacity: 0.85 })
  );
  shaft.position.set(c.x, -depth / 2, c.z);
  shaft.userData = { kind: 'mine' };
  clickables.push(shaft);
  G.mines.add(shaft);

  const tunnelMat = new THREE.MeshBasicMaterial({ color: MINE.color, transparent: true, opacity: 0.65 });
  for (let lv = 1; lv <= MINE.levels; lv++) {
    const y = -(depth * lv) / MINE.levels;
    const drives = 2 + Math.floor(rng() * 3);
    for (let d = 0; d < drives; d++) {
      const ang = rng() * Math.PI * 2;
      const len = 0.5 + rng() * 1.1;
      const pts = [pt(c.x, y, c.z)];
      let px = c.x, pz = c.z, a = ang;
      const segsN = 4;
      for (let s = 1; s <= segsN; s++) {
        a += (rng() - 0.5) * 0.9;
        px += Math.cos(a) * (len / segsN);
        pz += Math.sin(a) * (len / segsN);
        pts.push(pt(px, y - rng() * 0.05, pz));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.045, 6, false), tunnelMat);
      tube.userData = { kind: 'mine_tunnel', level: lv, levelDepthM: Math.round((MINE.depthKm * 1000 * lv) / MINE.levels) };
      clickables.push(tube);
      G.mines.add(tube);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.016, 6, 20), new THREE.MeshBasicMaterial({ color: MINE.color, transparent: true, opacity: 0.5 }));
    ring.rotateX(Math.PI / 2);
    ring.position.set(c.x, y, c.z);
    G.mines.add(ring);
  }
  labelSprites.push(addLabel(MINE.name, pt(c.x, 1.7, c.z), '#ffb84d', 0.55));
  digAssets.push({ x: c.x, z: c.z, type: 'mine_shaft', owner: MINE.owner, depthM: MINE.depthKm * 1000, label: MINE.name });
}
stats.underground = digAssets.length;

// ============================================================
// 5. LABELS
// ============================================================
function addLabel(text, pos, color = '#fff', scale = 1) {
  const cv = document.createElement('canvas');
  const fs = 44;
  const measure = cv.getContext('2d');
  measure.font = `600 ${fs}px system-ui, sans-serif`;
  const w = Math.ceil(measure.measureText(text).width) + 28;
  cv.width = w; cv.height = fs + 26;
  const ctx = cv.getContext('2d');
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(4,10,18,0.55)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, fs + 26, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 14, (fs + 26) / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.position.copy(pos);
  sp.renderOrder = 20;
  sp.userData.aspect = w / (fs + 26);
  sp.userData.baseScale = scale;
  G.labels.add(sp);
  return sp;
}

// ============================================================
// 6. UI WIRING
// ============================================================
for (const cb of document.querySelectorAll('[data-layer]')) {
  cb.addEventListener('change', () => { G[cb.dataset.layer].visible = cb.checked; });
}

const slider = document.getElementById('xray');
function applyXray(v) {
  const solid = v >= 0.98;
  for (const m of groundMats) {
    m.transparent = !solid;
    m.opacity = v;
    m.depthWrite = solid;
    m.needsUpdate = true;
  }
}
slider.addEventListener('input', () => applyXray(parseFloat(slider.value)));

document.getElementById('viewSurface').addEventListener('click', () => { slider.value = 1; applyXray(1); });
document.getElementById('viewXray').addEventListener('click', () => { slider.value = 0.35; applyXray(0.35); });
document.getElementById('viewUnder').addEventListener('click', () => { slider.value = 0.08; applyXray(0.08); });

// fly-to
const flySel = document.getElementById('flyto');
const flyTargets = {
  'City centre': { target: pt(0, 0, 0), pos: pt(3, 6.5, 8) },
  'Joina City (downtown)': { target: pt(LANDMARK.x, 0.4, LANDMARK.z), pos: pt(LANDMARK.x + 1.6, 1.6, LANDMARK.z + 2.2) },
  'Freda Rebecca mine': { target: pt(MINE.x, -0.6, MINE.z), pos: pt(MINE.x + 1.9, 1.5, MINE.z + 2.4) },
  'Harare Thermal (power)': { target: pt(POWER_STATION.x, 0.3, POWER_STATION.z), pos: pt(POWER_STATION.x + 1.4, 1.0, POWER_STATION.z + 1.8) },
};
for (const name of Object.keys(flyTargets)) {
  const o = document.createElement('option');
  o.value = name; o.textContent = name;
  flySel.appendChild(o);
}
let flyAnim = null;
flySel.addEventListener('change', () => {
  const v = flyTargets[flySel.value];
  if (!v) return;
  if (flySel.value.includes('mine')) { slider.value = 0.15; applyXray(0.15); }
  flyTo(v.target, v.pos);
});
document.getElementById('viewNational').addEventListener('click', () => {
  flyTo(pt(0.5, 0, 0.5), pt(3, 15, 19));
  flySel.value = '';
});
function flyTo(newTarget, newPos) {
  flyAnim = { t: 0, p0: camera.position.clone(), p1: newPos, t0: controls.target.clone(), t1: newTarget };
}

// ---------- dig-safe mode ----------
let digMode = false;
const digBtn = document.getElementById('digBtn');
const digMarker = new THREE.Group();
scene.add(digMarker);
digBtn.addEventListener('click', () => {
  digMode = !digMode;
  digBtn.classList.toggle('active', digMode);
  digBtn.textContent = digMode ? 'Exit dig-safe mode (click map to check a site)' : 'Dig-safe clearance check';
  renderer.domElement.style.cursor = digMode ? 'crosshair' : 'grab';
  if (!digMode) { digMarker.clear(); hideInfo(); }
});

const BUFFER_KM = 0.22;
function digCheck(p) {
  digMarker.clear();
  const hits = [];
  for (const a of digAssets) {
    const d = Math.hypot(a.x - p.x, a.z - p.z);
    if (d < BUFFER_KM) hits.push({ a, d });
  }
  hits.sort((u, v) => u.d - v.d);
  const danger = hits.length > 0;
  const color = danger ? 0xff4757 : 0x35e08a;

  const ring = new THREE.Mesh(new THREE.RingGeometry(BUFFER_KM * 0.9, BUFFER_KM, 48), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  ring.rotateX(-Math.PI / 2);
  ring.position.set(p.x, 0.1, p.z);
  digMarker.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(BUFFER_KM, 48), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.15 }));
  disc.rotateX(-Math.PI / 2);
  disc.position.set(p.x, 0.09, p.z);
  digMarker.add(disc);
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.6, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
  probe.position.set(p.x, -0.8, p.z);
  digMarker.add(probe);

  const rows = hits.slice(0, 5).map(h => `<tr><td>${h.a.type}</td><td>${h.a.owner}</td><td>${h.a.depthM} m</td><td>${Math.round(h.d * 1000)} m</td></tr>`).join('');
  showInfo(danger ? 'DIG-SAFE: ASSETS IN BUFFER' : 'DIG-SAFE: CLEAR', `
    <p class="${danger ? 'warn' : 'ok'}">${danger
      ? `${hits.length} mapped asset${hits.length > 1 ? 's' : ''} within the ${Math.round(BUFFER_KM * 1000)} m demo buffer. Excavation requires owner clearance.`
      : `No mapped assets within the ${Math.round(BUFFER_KM * 1000)} m demo buffer. Advisory only — verify on site.`}</p>
    ${danger ? `<table><tr><th>Type</th><th>Owner</th><th>Depth</th><th>Distance</th></tr>${rows}</table>` : ''}
    <p class="fine">Mirrors the proposal's dig-safe clearance tier: presence/absence + buffer distance only.</p>`);
}

// ---------- picking ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let downXY = null;
renderer.domElement.addEventListener('pointerdown', e => { downXY = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downXY || Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) > 5) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (digMode) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, p)) digCheck(p);
    return;
  }
  const visClickables = clickables.filter(m => {
    let o = m; while (o) { if (!o.visible) return false; o = o.parent; }
    return true;
  });
  const hits = raycaster.intersectObjects(visClickables, false);
  if (!hits.length) { hideInfo(); return; }
  describe(hits[0]);
});

function describe(hit) {
  const o = hit.object, ud = o.userData;
  const record = (extra) => `
    <table>
      <tr><th>asset_id</th><td>${assetId()}</td></tr>${extra}
      <tr><th>capture_method</th><td>${captureMethod()}</td></tr>
      <tr><th>verification</th><td>${badge(verification())}</td></tr>
      <tr><th>last_updated</th><td>${fakeDate()}</td></tr>
      <tr><th>captured_by</th><td>TECH-${Math.floor(1000 + rng() * 9000)}</td></tr>
    </table>
    <p class="fine">Registered-stakeholder tier record (full precision). Public tier would show a 100 m grid cell only.</p>`;

  if (ud.kind === 'landmark') {
    showInfo(LANDMARK.name, `
      <p>Referenced in the proposal (Figure 1) as the site of a multi-utility duct bank exposed during civil works — fibre, water and power conduits sharing a single trench with no common register.</p>
      <p class="fine">Illustrative landmark. Toggle to "Underground" view and inspect the fibre/water/power grid running beneath this block.</p>`);
  } else if (ud.kind === 'mine' || ud.kind === 'mine_tunnel') {
    showInfo(MINE.name, `
      <table>
        <tr><th>mineral</th><td>${MINE.mineral}</td></tr>
        <tr><th>owner</th><td>${MINE.owner}</td></tr>
        <tr><th>deepest level</th><td>${Math.round(MINE.depthKm * 1000)} m below surface</td></tr>
        ${ud.kind === 'mine_tunnel' ? `<tr><th>this drive</th><td>Level ${ud.level} · ≈${ud.levelDepthM} m</td></tr>` : ''}
        <tr><th>layer</th><td>restricted (critical infrastructure)</td></tr>
      </table>
      <p class="fine">Underground workings shown stylised; depth exaggerated ×${DEPTH_X} for visibility.</p>`);
  } else if (ud.kind === 'power_station') {
    showInfo(POWER_STATION.name, `
      <table>
        <tr><th>type</th><td>${POWER_STATION.type}</td></tr>
        <tr><th>capacity</th><td>≈${POWER_STATION.mw} MW</td></tr>
        <tr><th>owner</th><td>ZESA Holdings / ZPC</td></tr>
        <tr><th>data_sensitivity</th><td>restricted</td></tr>
      </table>`);
  } else if (ud.kind === 'fibre_trunk') {
    showInfo('Fibre spur — ' + ud.name, record(`
      <tr><th>asset_type</th><td>fibre_duct (trunk)</td></tr>
      <tr><th>owner_org</th><td>${pick(OWNERS.fibre)}</td></tr>
      <tr><th>depth_from_surface</th><td>${(1.1 + rng() * 0.4).toFixed(2)} m</td></tr>`));
  } else if (ud.kind === 'pylon') {
    showInfo('Transmission pylon', record(`
      <tr><th>asset_type</th><td>electricity_pole (HV)</td></tr>
      <tr><th>owner_org</th><td>ZESA Holdings</td></tr>`));
  } else if (ud.records) {
    const r = ud.records[hit.instanceId] || {};
    const titles = {
      building: ['Building', `<tr><th>asset_type</th><td>structure</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>height</th><td>≈${Math.round(r.h * 1000)} m (exaggerated)</td></tr>`],
      manhole: [r.type || 'Manhole', `<tr><th>asset_type</th><td>${r.type}</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr><tr><th>depth_from_surface</th><td>${r.depthM} m</td></tr>`],
      hydrant: ['Fire-fighting water point', `<tr><th>asset_type</th><td>fire_hydrant</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr>`],
      traffic_signal: ['Traffic signal', `<tr><th>asset_type</th><td>traffic_signal</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr>`],
      water_valve: ['Water valve', `<tr><th>asset_type</th><td>water_valve</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr><tr><th>depth_from_surface</th><td>${r.depthM} m</td></tr>`],
      bus_terminal: [r.name || 'Bus terminal', `<tr><th>asset_type</th><td>bus_terminal</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr>`],
    };
    const t = titles[ud.kind];
    if (t) showInfo(t[0], record(t[1]));
  }
}
function badge(v) {
  const cls = v === 'verified' ? 'ok' : 'warn';
  return `<span class="badge ${cls}">${v}</span>`;
}

const infoEl = document.getElementById('info');
function showInfo(title, html) {
  infoEl.querySelector('h3').textContent = title;
  infoEl.querySelector('.body').innerHTML = html;
  infoEl.classList.add('show');
}
function hideInfo() { infoEl.classList.remove('show'); }
document.getElementById('infoClose').addEventListener('click', hideInfo);

document.getElementById('stats').innerHTML = `
  <div><b>${stats.buildings.toLocaleString()}</b><span>buildings</span></div>
  <div><b>${stats.underground.toLocaleString()}</b><span>underground assets</span></div>
  <div><b>${stats.fibreKm.toFixed(1)} km</b><span>fibre mapped</span></div>
  <div><b>${stats.waterKm.toFixed(1)} km</b><span>water pipes</span></div>
  <div><b>${stats.powerKm.toFixed(1)} km</b><span>power lines</span></div>
  <div><b>${stats.mines}</b><span>mine + tunnels</span></div>`;

document.getElementById('loading').classList.add('hide');

// ---------- resize + animate ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (flyAnim) {
    flyAnim.t = Math.min(1, flyAnim.t + dt / 1.4);
    const e = flyAnim.t < 0.5 ? 2 * flyAnim.t * flyAnim.t : 1 - ((-2 * flyAnim.t + 2) ** 2) / 2;
    camera.position.lerpVectors(flyAnim.p0, flyAnim.p1, e);
    controls.target.lerpVectors(flyAnim.t0, flyAnim.t1, e);
    if (flyAnim.t >= 1) flyAnim = null;
  }

  for (const sp of G.labels.children) {
    const d = camera.position.distanceTo(sp.position);
    const s = THREE.MathUtils.clamp(d * 0.045, 0.35, 6) * sp.userData.baseScale;
    sp.scale.set(s * sp.userData.aspect, s, 1);
    sp.material.opacity = d > 40 ? Math.max(0, 1 - (d - 40) / 15) : 1;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
