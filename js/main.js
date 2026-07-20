// ============================================================
// INZILA — National Infrastructure Digital Twin (3D Demo)
// "Google Earth, but with underground."
// Surface: terrain, cities, buildings, roads, street furniture.
// Underground: fibre ducts, water pipes, power cables, mine tunnels.
// NOTE: demo data is synthetic; underground depths are exaggerated
// (~x1000) so they are visible at national scale. Real depths are
// shown on each asset record card.
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  BORDER, LAKE_KARIBA, GREAT_DYKE, CITIES, MINES, POWER_STATIONS,
  ROADS, FIBRE_ROUTES, POWER_LINES, OWNERS,
} from './data.js';

// ---------- projection: lon/lat -> km on a local plane ----------
const LON0 = 29.2, LAT0 = -19.1;
const KX = 105.0, KY = 110.6; // km per degree at ~19 S
const GROUND_DEPTH = 12;      // km of visible "earth block"

// world: +x east, +z south
function toV3(lon, lat, y = 0) {
  return new THREE.Vector3((lon - LON0) * KX, y, (LAT0 - lat) * KY);
}
function llY(pt, y = 0) { return toV3(pt[0], pt[1], y); }

const cityByName = Object.fromEntries(CITIES.map(c => [c.name, c]));
function pathToPoints(path, y = 0) {
  return path.map(p => Array.isArray(p)
    ? toV3(p[0], p[1], y)
    : toV3(cityByName[p].lon, cityByName[p].lat, y));
}

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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060d18);
scene.fog = new THREE.FogExp2(0x060d18, 0.00045);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 8000);
camera.position.set(40, 620, 560);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxDistance = 2600;
controls.minDistance = 0.4;
controls.maxPolarAngle = Math.PI * 0.86; // allow looking from slightly below horizon
controls.target.set(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x2a2118, 0.85));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(-350, 500, -220);
scene.add(sun);

// starfield backdrop
{
  const g = new THREE.BufferGeometry();
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(3500);
    v.y = Math.abs(v.y) * 0.9 + 200;
    pos.set([v.x, v.y, v.z], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8fb7ff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.55 })));
}

// ---------- groups (layer toggles) ----------
const G = {
  terrain: new THREE.Group(), buildings: new THREE.Group(), roads: new THREE.Group(),
  fibre: new THREE.Group(), water: new THREE.Group(), power: new THREE.Group(),
  street: new THREE.Group(), mines: new THREE.Group(), labels: new THREE.Group(),
};
Object.values(G).forEach(g => scene.add(g));

const stats = { buildings: 0, underground: 0, fibreKm: 0, waterKm: 0, powerKm: 0, mines: MINES.length, surface: 0 };
const clickables = [];      // meshes for raycast picking
const digAssets = [];       // {x,z,type,owner,depthM,label} for dig-safe search
const labelSprites = [];

// ============================================================
// 1. TERRAIN — extruded country block with strata sides
// ============================================================
const groundMats = [];
{
  const shape = new THREE.Shape();
  BORDER.forEach(([lon, lat], i) => {
    const x = (lon - LON0) * KX;
    const y = (lat - LAT0) * KY; // shape-space north
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  });
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: GROUND_DEPTH, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);          // caps now horizontal, extrusion up +y
  geo.translate(0, -GROUND_DEPTH, 0); // top cap sits at y = 0

  const capMat = new THREE.MeshStandardMaterial({ color: 0x5d6b3c, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide });
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x4a3628, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide });
  groundMats.push(capMat, sideMat);
  const ground = new THREE.Mesh(geo, [capMat, sideMat]);
  ground.renderOrder = 5;
  ground.name = 'ground';
  G.terrain.add(ground);

  // Lake Kariba
  const lakeShape = new THREE.Shape();
  LAKE_KARIBA.forEach(([lon, lat], i) => {
    const x = (lon - LON0) * KX, y = (lat - LAT0) * KY;
    i === 0 ? lakeShape.moveTo(x, y) : lakeShape.lineTo(x, y);
  });
  lakeShape.closePath();
  const lake = new THREE.Mesh(
    new THREE.ShapeGeometry(lakeShape),
    new THREE.MeshStandardMaterial({ color: 0x1d5f9e, roughness: 0.25, metalness: 0.1 })
  );
  lake.rotateX(-Math.PI / 2);
  lake.position.y = 0.25;
  G.terrain.add(lake);
  labelSprites.push(addLabel('Lake Kariba', toV3(27.9, -17.05, 6), '#7fc4ff', 0.8));

  // Great Dyke — subtle dark geological band
  const dykePts = GREAT_DYKE.map(p => llY(p, 0.18));
  G.terrain.add(ribbon(dykePts, 9, new THREE.MeshStandardMaterial({
    color: 0x2f3a26, roughness: 1, transparent: true, opacity: 0.55,
  })));
  labelSprites.push(addLabel('Great Dyke', toV3(30.25, -18.55, 5), '#9fb27e', 0.65));
}

// flat ribbon mesh along a polyline (for roads / bands)
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

// ============================================================
// 2. NATIONAL NETWORKS — roads, fibre trunks, transmission
// ============================================================
const roadMat = new THREE.MeshStandardMaterial({ color: 0x353c46, roughness: 0.9 });
for (const road of ROADS) {
  const pts = pathToPoints(road.path, 0.12);
  const m = ribbon(pts, 1.6, roadMat);
  m.userData = { kind: 'road', name: road.name };
  G.roads.add(m);
}

// fibre trunks — glowing dashed lines underground (y = -5)
{
  const FIBRE_Y = -5;
  for (const r of FIBRE_ROUTES) {
    const pts = pathToPoints(r.path, FIBRE_Y);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(g, new THREE.LineDashedMaterial({
      color: 0x35e08a, dashSize: 6, gapSize: 3, transparent: true, opacity: 0.95,
    }));
    line.computeLineDistances();
    line.userData = { kind: 'fibre_trunk', name: r.name };
    G.fibre.add(line);
    // tube so trunks are clickable + visible in x-ray
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.5, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x1f9e5f, transparent: true, opacity: 0.35 })
    );
    tube.userData = { kind: 'fibre_trunk', name: r.name };
    clickables.push(tube);
    G.fibre.add(tube);
    stats.fibreKm += pathLength(pts);
    samplePath(pts, 4, p => digAssets.push({
      x: p.x, z: p.z, type: 'fibre_duct', owner: pick(OWNERS.fibre),
      depthM: (0.9 + rng() * 0.6).toFixed(2), label: r.name,
    }));
  }
}

// HV transmission — overhead lines + pylons
{
  const pylonGeo = new THREE.CylinderGeometry(0.12, 0.28, 3.4, 5);
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.6, metalness: 0.6 });
  const pylonPos = [];
  for (const r of POWER_LINES) {
    const pts = pathToPoints(r.path, 3.2);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.9 }));
    line.userData = { kind: 'transmission', name: r.name };
    G.power.add(line);
    stats.powerKm += pathLength(pts);
    samplePath(pts, 18, p => pylonPos.push(p));
  }
  const pylons = new THREE.InstancedMesh(pylonGeo, pylonMat, pylonPos.length);
  const m4 = new THREE.Matrix4();
  pylonPos.forEach((p, i) => { m4.makeTranslation(p.x, 1.7, p.z); pylons.setMatrixAt(i, m4); });
  pylons.userData = { kind: 'pylon' };
  clickables.push(pylons);
  G.power.add(pylons);

  // power stations
  for (const ps of POWER_STATIONS) {
    const pos = toV3(ps.lon, ps.lat, 0);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.8, 3.0, 8),
      new THREE.MeshStandardMaterial({ color: ps.type === 'hydro' ? 0x3aa0ff : 0xffa94d, emissive: ps.type === 'hydro' ? 0x0c2f55 : 0x552b0c, roughness: 0.5 })
    );
    mesh.position.set(pos.x, 1.5, pos.z);
    mesh.userData = { kind: 'power_station', ps };
    clickables.push(mesh);
    G.power.add(mesh);
    labelSprites.push(addLabel('⚡ ' + ps.name, new THREE.Vector3(pos.x, 7, pos.z), '#ffd23e', 0.6));
  }
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
// 3. CITIES — buildings, street grids, street furniture,
//    and per-city underground utility grids
// ============================================================
const buildingRecords = [], manholeRecords = [], hydrantRecords = [], lightRecords = [], valveRecords = [], terminalRecords = [];
const buildingXforms = [], manholePos = [], hydrantPos = [], lightPos = [], valvePos = [], terminalXforms = [];
const streetSegs = [], waterSegs = [], fibreSegs = [], powerSegs = [];
const WATER_Y = -3, FIBRE_CITY_Y = -5, POWER_Y = -7;

for (const city of CITIES) {
  const c = toV3(city.lon, city.lat, 0);
  const R = city.radius;
  const step = 0.5;
  const nBlocks = Math.floor(R / step);

  // urban footprint pad
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.12, 40),
    new THREE.MeshStandardMaterial({ color: 0x4c5560, roughness: 1 })
  );
  pad.rotateX(-Math.PI / 2);
  pad.position.set(c.x, 0.15, c.z);
  G.roads.add(pad);

  // street grid + underground grids
  for (let gx = -nBlocks; gx <= nBlocks; gx++) {
    const x = c.x + gx * step;
    const halfLen = Math.sqrt(Math.max(0, R * R - (gx * step) ** 2));
    if (halfLen < step * 0.5) continue;
    streetSegs.push(new THREE.Vector3(x, 0.18, c.z - halfLen), new THREE.Vector3(x, 0.18, c.z + halfLen));
    if (gx % 2 === 0) waterSegs.push(new THREE.Vector3(x, WATER_Y, c.z - halfLen), new THREE.Vector3(x, WATER_Y, c.z + halfLen));
    if (gx % 3 === 0) fibreSegs.push(new THREE.Vector3(x, FIBRE_CITY_Y, c.z - halfLen), new THREE.Vector3(x, FIBRE_CITY_Y, c.z + halfLen));
    if ((gx + 1) % 2 === 0) powerSegs.push(new THREE.Vector3(x, POWER_Y, c.z - halfLen), new THREE.Vector3(x, POWER_Y, c.z + halfLen));
  }
  for (let gz = -nBlocks; gz <= nBlocks; gz++) {
    const z = c.z + gz * step;
    const halfLen = Math.sqrt(Math.max(0, R * R - (gz * step) ** 2));
    if (halfLen < step * 0.5) continue;
    streetSegs.push(new THREE.Vector3(c.x - halfLen, 0.18, z), new THREE.Vector3(c.x + halfLen, 0.18, z));
    if (gz % 2 === 0) waterSegs.push(new THREE.Vector3(c.x - halfLen, WATER_Y, z), new THREE.Vector3(c.x + halfLen, WATER_Y, z));
    if (gz % 3 === 0) fibreSegs.push(new THREE.Vector3(c.x - halfLen, FIBRE_CITY_Y, z), new THREE.Vector3(c.x + halfLen, FIBRE_CITY_Y, z));
    if ((gz + 1) % 2 === 0) powerSegs.push(new THREE.Vector3(c.x - halfLen, POWER_Y, z), new THREE.Vector3(c.x + halfLen, POWER_Y, z));
  }

  // buildings
  const counts = { 1: 1500, 2: 520, 3: 180 };
  const baseH = { 1: 0.55, 2: 0.32, 3: 0.2 };
  const nB = counts[city.tier];
  for (let i = 0; i < nB; i++) {
    const ang = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * R * 0.98;
    const bx = c.x + Math.cos(ang) * rr;
    const bz = c.z + Math.sin(ang) * rr;
    const falloff = 1 - (rr / R) * 0.82;
    const h = Math.max(0.03, baseH[city.tier] * falloff * (0.3 + rng() * 1.6));
    const w = 0.07 + rng() * 0.14, d = 0.07 + rng() * 0.14;
    buildingXforms.push({ x: bx, z: bz, w, d, h, hue: rng() });
    buildingRecords.push({ city: city.name, h });
  }
  stats.buildings += nB;

  // street furniture counts scale with tier
  const f = { 1: [220, 60, 70, 90], 2: [90, 26, 30, 40], 3: [36, 10, 12, 16] }[city.tier];
  const [nMan, nHyd, nLight, nValve] = f;
  const gridPt = () => {
    const onX = rng() < 0.5;
    const g1 = (Math.floor(rng() * (2 * nBlocks + 1)) - nBlocks) * step;
    const lim = Math.sqrt(Math.max(0.01, R * R - g1 * g1));
    const g2 = (rng() * 2 - 1) * lim;
    return onX ? { x: c.x + g1, z: c.z + g2 } : { x: c.x + g2, z: c.z + g1 };
  };
  for (let i = 0; i < nMan; i++) {
    const p = gridPt();
    manholePos.push(p);
    const type = rng() < 0.55 ? 'fibre_manhole' : (rng() < 0.5 ? 'water_chamber' : 'power_chamber');
    const owner = type === 'fibre_manhole' ? pick(OWNERS.fibre) : type === 'water_chamber' ? pick(OWNERS.water) : pick(OWNERS.power);
    const depthM = (0.6 + rng() * 1.8).toFixed(2);
    manholeRecords.push({ city: city.name, type, owner, depthM });
    digAssets.push({ x: p.x, z: p.z, type, owner, depthM, label: city.name + ' ' + type });
  }
  for (let i = 0; i < nHyd; i++) {
    const p = gridPt();
    hydrantPos.push(p);
    hydrantRecords.push({ city: city.name, owner: pick(OWNERS.water) });
  }
  for (let i = 0; i < nLight; i++) {
    const p = gridPt();
    lightPos.push(p);
    lightRecords.push({ city: city.name, owner: pick(OWNERS.roads) });
  }
  for (let i = 0; i < nValve; i++) {
    const p = gridPt();
    valvePos.push(p);
    const depthM = (0.5 + rng() * 1.2).toFixed(2);
    valveRecords.push({ city: city.name, owner: pick(OWNERS.water), depthM });
    digAssets.push({ x: p.x, z: p.z, type: 'water_valve', owner: pick(OWNERS.water), depthM, label: city.name + ' water_valve' });
  }
  stats.surface += nMan + nHyd + nLight + nValve;

  // bus terminals: tier1 -> 2, else 1
  const nT = city.tier === 1 ? 2 : 1;
  for (let i = 0; i < nT; i++) {
    const ang = rng() * Math.PI * 2, rr = R * (0.15 + rng() * 0.4);
    const p = { x: c.x + Math.cos(ang) * rr, z: c.z + Math.sin(ang) * rr };
    terminalXforms.push(p);
    terminalRecords.push({ city: city.name, owner: pick(OWNERS.transit), name: city.name + (nT > 1 ? ` Terminal ${i + 1}` : ' Bus Terminal') });
  }

  // city label
  const size = { 1: 1.0, 2: 0.75, 3: 0.55 }[city.tier];
  labelSprites.push(addLabel(city.name, new THREE.Vector3(c.x, 4 + R * 0.4, c.z), '#ffffff', size));
}

// sample city underground grids into digAssets
samplePairs(waterSegs, 1.2, p => digAssets.push({ x: p.x, z: p.z, type: 'water_pipe', owner: pick(OWNERS.water), depthM: (0.8 + rng() * 1.2).toFixed(2), label: 'water reticulation' }));
samplePairs(fibreSegs, 1.2, p => digAssets.push({ x: p.x, z: p.z, type: 'fibre_duct', owner: pick(OWNERS.fibre), depthM: (0.9 + rng() * 0.6).toFixed(2), label: 'urban fibre duct' }));
samplePairs(powerSegs, 1.2, p => digAssets.push({ x: p.x, z: p.z, type: 'electricity_cable', owner: pick(OWNERS.power), depthM: (0.7 + rng() * 0.5).toFixed(2), label: 'LV/MV cable' }));
function samplePairs(segs, step, cb) {
  for (let i = 0; i < segs.length; i += 2) {
    const a = segs[i], b = segs[i + 1];
    const d = a.distanceTo(b), n = Math.max(1, Math.floor(d / step));
    for (let j = 0; j <= n; j++) cb(new THREE.Vector3().lerpVectors(a, b, j / n));
  }
}
stats.waterKm = segsLength(waterSegs);
stats.fibreKm += segsLength(fibreSegs);
stats.powerKm += segsLength(powerSegs);
stats.underground = digAssets.length;
function segsLength(segs) {
  let L = 0;
  for (let i = 0; i < segs.length; i += 2) L += segs[i].distanceTo(segs[i + 1]);
  return L;
}

// street grid lines
{
  const g = new THREE.BufferGeometry().setFromPoints(streetSegs);
  G.roads.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x6b7684, transparent: true, opacity: 0.5 })));
}
// underground utility grids
function undergroundGrid(segs, color, group, kind) {
  const g = new THREE.BufferGeometry().setFromPoints(segs);
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  l.userData = { kind };
  group.add(l);
}
undergroundGrid(waterSegs, 0x3aa0ff, G.water, 'water_pipe');
undergroundGrid(fibreSegs, 0x35e08a, G.fibre, 'fibre_duct');
undergroundGrid(powerSegs, 0xff5a48, G.power, 'electricity_cable');

// ---------- instanced meshes ----------
const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();

// buildings
{
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.15 });
  const mesh = new THREE.InstancedMesh(geo, mat, buildingXforms.length);
  buildingXforms.forEach((b, i) => {
    tmpM.makeScale(b.w, b.h, b.d).setPosition(b.x, 0.16, b.z);
    mesh.setMatrixAt(i, tmpM);
    const glass = b.hue < 0.28;
    tmpC.setHSL(glass ? 0.58 : 0.08, glass ? 0.38 : 0.06, glass ? 0.45 + rng() * 0.2 : 0.55 + rng() * 0.3);
    mesh.setColorAt(i, tmpC);
  });
  mesh.userData = { kind: 'building', records: buildingRecords };
  clickables.push(mesh);
  G.buildings.add(mesh);
}
// manholes
instancedAt(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10),
  new THREE.MeshStandardMaterial({ color: 0xcfd6dd, roughness: 0.4, metalness: 0.8 }),
  manholePos, 0.2, { kind: 'manhole', records: manholeRecords }, G.street);
// hydrants / fire-fighting water points
instancedAt(new THREE.BoxGeometry(0.05, 0.09, 0.05),
  new THREE.MeshStandardMaterial({ color: 0xff4757, emissive: 0x4d0a10, roughness: 0.5 }),
  hydrantPos, 0.2, { kind: 'hydrant', records: hydrantRecords }, G.street);
// traffic signals
instancedAt(new THREE.ConeGeometry(0.035, 0.16, 6),
  new THREE.MeshStandardMaterial({ color: 0xb06cff, emissive: 0x2c0f4d, roughness: 0.5 }),
  lightPos, 0.24, { kind: 'traffic_signal', records: lightRecords }, G.street);
// water valves (underground markers)
instancedAt(new THREE.SphereGeometry(0.05, 8, 8),
  new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x0a2c50 }),
  valvePos, WATER_Y, { kind: 'water_valve', records: valveRecords }, G.water);
// bus terminals
{
  const geo = new THREE.BoxGeometry(0.5, 0.06, 0.28);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff9f1a, emissive: 0x492a00, roughness: 0.5 });
  const mesh = new THREE.InstancedMesh(geo, mat, terminalXforms.length);
  terminalXforms.forEach((p, i) => {
    tmpM.makeTranslation(p.x, 0.2, p.z);
    mesh.setMatrixAt(i, tmpM);
  });
  mesh.userData = { kind: 'bus_terminal', records: terminalRecords };
  clickables.push(mesh);
  G.street.add(mesh);
}
function instancedAt(geo, mat, positions, y, userData, group) {
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  positions.forEach((p, i) => {
    tmpM.makeTranslation(p.x, y, p.z);
    mesh.setMatrixAt(i, tmpM);
  });
  mesh.userData = userData;
  clickables.push(mesh);
  group.add(mesh);
  return mesh;
}

// ============================================================
// 4. MINES — headframes, shafts, underground tunnel networks
// ============================================================
const DEPTH_X = 5; // mine depth exaggeration (km drawn per km real)
for (const mine of MINES) {
  const c = toV3(mine.lon, mine.lat, 0);
  const depth = mine.depthKm * DEPTH_X;

  // headframe
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 2.6, 4),
    new THREE.MeshStandardMaterial({ color: 0xd8dee9, emissive: 0x1c2430, roughness: 0.4, metalness: 0.5 })
  );
  head.position.set(c.x, 1.3, c.z);
  head.userData = { kind: 'mine', mine };
  clickables.push(head);
  G.mines.add(head);

  // surface plant
  const plant = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.5, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x8a93a3, roughness: 0.8 })
  );
  plant.position.set(c.x + 1.3, 0.35, c.z + 0.6);
  G.mines.add(plant);

  // main shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, depth, 8),
    new THREE.MeshBasicMaterial({ color: mine.color, transparent: true, opacity: 0.85 })
  );
  shaft.position.set(c.x, -depth / 2, c.z);
  shaft.userData = { kind: 'mine', mine };
  clickables.push(shaft);
  G.mines.add(shaft);

  // levels + drives
  const tunnelMat = new THREE.MeshBasicMaterial({ color: mine.color, transparent: true, opacity: 0.65 });
  for (let lv = 1; lv <= mine.levels; lv++) {
    const y = -(depth * lv) / mine.levels;
    const drives = 2 + Math.floor(rng() * 3);
    for (let d = 0; d < drives; d++) {
      const ang = rng() * Math.PI * 2;
      const len = 1.5 + rng() * 3.5;
      const pts = [new THREE.Vector3(c.x, y, c.z)];
      let px = c.x, pz = c.z, a = ang;
      const segsN = 4;
      for (let s = 1; s <= segsN; s++) {
        a += (rng() - 0.5) * 0.9;
        px += Math.cos(a) * (len / segsN);
        pz += Math.sin(a) * (len / segsN);
        pts.push(new THREE.Vector3(px, y - rng() * 0.15, pz));
      }
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.14, 6, false),
        tunnelMat
      );
      tube.userData = { kind: 'mine_tunnel', mine, level: lv, levelDepthM: Math.round((mine.depthKm * 1000 * lv) / mine.levels) };
      clickables.push(tube);
      G.mines.add(tube);
    }
    // level ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.05, 6, 20),
      new THREE.MeshBasicMaterial({ color: mine.color, transparent: true, opacity: 0.5 })
    );
    ring.rotateX(Math.PI / 2);
    ring.position.set(c.x, y, c.z);
    G.mines.add(ring);
  }
  labelSprites.push(addLabel('⛏ ' + mine.name, new THREE.Vector3(c.x, 5.4, c.z), '#ffb84d', 0.55));
  digAssets.push({ x: c.x, z: c.z, type: 'mine_shaft', owner: mine.owner, depthM: mine.depthKm * 1000, label: mine.name });
}

// ============================================================
// 5. LABELS
// ============================================================
function addLabel(text, pos, color = '#fff', scale = 1) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const fs = 44;
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 28;
  cv.width = w; cv.height = fs + 26;
  const c2 = cv.getContext('2d');
  c2.font = `600 ${fs}px system-ui, sans-serif`;
  c2.fillStyle = 'rgba(4,10,18,0.55)';
  c2.beginPath();
  c2.roundRect(0, 0, w, fs + 26, 12);
  c2.fill();
  c2.fillStyle = color;
  c2.textBaseline = 'middle';
  c2.fillText(text, 14, (fs + 26) / 2 + 2);
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
// layer checkboxes
for (const cb of document.querySelectorAll('[data-layer]')) {
  cb.addEventListener('change', () => { G[cb.dataset.layer].visible = cb.checked; });
}

// ground opacity (x-ray) slider
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

// view presets
document.getElementById('viewSurface').addEventListener('click', () => { slider.value = 1; applyXray(1); });
document.getElementById('viewXray').addEventListener('click', () => { slider.value = 0.35; applyXray(0.35); });
document.getElementById('viewUnder').addEventListener('click', () => { slider.value = 0.08; applyXray(0.08); });

// fly-to
const flySel = document.getElementById('flyto');
{
  const og1 = document.createElement('optgroup'); og1.label = 'Cities';
  CITIES.forEach(c => { const o = document.createElement('option'); o.value = 'c:' + c.name; o.textContent = c.name; og1.appendChild(o); });
  const og2 = document.createElement('optgroup'); og2.label = 'Mines';
  MINES.forEach(m => { const o = document.createElement('option'); o.value = 'm:' + m.name; o.textContent = '⛏ ' + m.name; og2.appendChild(o); });
  flySel.appendChild(og1); flySel.appendChild(og2);
}
let flyAnim = null;
flySel.addEventListener('change', () => {
  const v = flySel.value;
  if (!v) return;
  const [kind, name] = [v.slice(0, 1), v.slice(2)];
  let target, dist, pitchY;
  if (kind === 'c') {
    const c = cityByName[name];
    target = toV3(c.lon, c.lat, 0);
    dist = c.radius * 3.2; pitchY = c.radius * 2.2;
  } else {
    const m = MINES.find(x => x.name === name);
    target = toV3(m.lon, m.lat, -m.depthKm * DEPTH_X * 0.45);
    dist = 12; pitchY = 4;
    slider.value = 0.15; applyXray(0.15);
  }
  flyTo(target, new THREE.Vector3(target.x + dist * 0.55, target.y + pitchY, target.z + dist));
});
document.getElementById('viewNational').addEventListener('click', () => {
  flyTo(new THREE.Vector3(0, 0, 0), new THREE.Vector3(40, 620, 560));
  flySel.value = '';
});
function flyTo(newTarget, newPos) {
  flyAnim = {
    t: 0,
    p0: camera.position.clone(), p1: newPos,
    t0: controls.target.clone(), t1: newTarget,
  };
}

// ---------- dig-safe mode ----------
let digMode = false;
const digBtn = document.getElementById('digBtn');
const digMarker = new THREE.Group();
scene.add(digMarker);
digBtn.addEventListener('click', () => {
  digMode = !digMode;
  digBtn.classList.toggle('active', digMode);
  digBtn.textContent = digMode ? '✕ Exit dig-safe mode (click map to check a site)' : '🚧 Dig-safe clearance check';
  renderer.domElement.style.cursor = digMode ? 'crosshair' : 'grab';
  if (!digMode) { digMarker.clear(); hideInfo(); }
});

const BUFFER_KM = 0.6; // demo clearance buffer
function digCheck(pt) {
  digMarker.clear();
  const hits = [];
  for (const a of digAssets) {
    const d = Math.hypot(a.x - pt.x, a.z - pt.z);
    if (d < BUFFER_KM) hits.push({ a, d });
  }
  hits.sort((u, v) => u.d - v.d);
  const danger = hits.length > 0;
  const color = danger ? 0xff4757 : 0x35e08a;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(BUFFER_KM * 0.92, BUFFER_KM, 48),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  ring.rotateX(-Math.PI / 2);
  ring.position.set(pt.x, 0.25, pt.z);
  digMarker.add(ring);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(BUFFER_KM, 48),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.15 })
  );
  disc.rotateX(-Math.PI / 2);
  disc.position.set(pt.x, 0.24, pt.z);
  digMarker.add(disc);
  const probe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 9, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
  );
  probe.position.set(pt.x, -4.5, pt.z);
  digMarker.add(probe);

  const rows = hits.slice(0, 5).map(h =>
    `<tr><td>${h.a.type}</td><td>${h.a.owner}</td><td>${h.a.depthM} m</td><td>${Math.round(h.d * 1000)} m</td></tr>`).join('');
  showInfo(danger ? '⚠️ DIG-SAFE: ASSETS IN BUFFER' : '✅ DIG-SAFE: CLEAR', `
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
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, pt)) digCheck(pt);
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

  if (ud.kind === 'mine' || ud.kind === 'mine_tunnel') {
    const m = ud.mine;
    showInfo('⛏ ' + m.name, `
      <table>
        <tr><th>mineral</th><td>${m.mineral}</td></tr>
        <tr><th>owner</th><td>${m.owner}</td></tr>
        <tr><th>deepest level</th><td>${Math.round(m.depthKm * 1000)} m below surface</td></tr>
        ${ud.kind === 'mine_tunnel' ? `<tr><th>this drive</th><td>Level ${ud.level} · ≈${ud.levelDepthM} m</td></tr>` : ''}
        <tr><th>layer</th><td>restricted (critical infrastructure)</td></tr>
      </table>
      <p class="fine">Underground workings shown stylised; depth exaggerated ×${DEPTH_X} for visibility.</p>`);
  } else if (ud.kind === 'power_station') {
    const ps = ud.ps;
    showInfo('⚡ ' + ps.name, `
      <table>
        <tr><th>type</th><td>${ps.type}</td></tr>
        <tr><th>capacity</th><td>≈${ps.mw} MW</td></tr>
        <tr><th>owner</th><td>ZESA Holdings / ZPC</td></tr>
        <tr><th>data_sensitivity</th><td>restricted</td></tr>
      </table>`);
  } else if (ud.kind === 'fibre_trunk') {
    showInfo('🟢 Fibre trunk — ' + ud.name, record(`
      <tr><th>asset_type</th><td>fibre_duct (trunk)</td></tr>
      <tr><th>owner_org</th><td>${pick(OWNERS.fibre)}</td></tr>
      <tr><th>depth_from_surface</th><td>${(1.1 + rng() * 0.4).toFixed(2)} m</td></tr>`));
  } else if (ud.kind === 'pylon') {
    showInfo('🗼 Transmission pylon', record(`
      <tr><th>asset_type</th><td>electricity_pole (HV)</td></tr>
      <tr><th>owner_org</th><td>ZESA Holdings</td></tr>`));
  } else if (ud.records) {
    const r = ud.records[hit.instanceId] || {};
    const titles = {
      building: ['🏢 Building', `<tr><th>asset_type</th><td>structure</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>height</th><td>≈${Math.round(r.h * 1000)} m (exaggerated)</td></tr>`],
      manhole: [`⚫ ${r.type || 'Manhole'}`, `<tr><th>asset_type</th><td>${r.type}</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr><tr><th>depth_from_surface</th><td>${r.depthM} m</td></tr>`],
      hydrant: ['🔴 Fire-fighting water point', `<tr><th>asset_type</th><td>fire_hydrant</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr>`],
      traffic_signal: ['🟣 Traffic signal', `<tr><th>asset_type</th><td>traffic_signal</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr>`],
      water_valve: ['🔵 Water valve', `<tr><th>asset_type</th><td>water_valve</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr><tr><th>depth_from_surface</th><td>${r.depthM} m</td></tr>`],
      bus_terminal: ['🟠 ' + (r.name || 'Bus terminal'), `<tr><th>asset_type</th><td>bus_terminal</td></tr><tr><th>city</th><td>${r.city}</td></tr><tr><th>owner_org</th><td>${r.owner}</td></tr>`],
    };
    const t = titles[ud.kind];
    if (t) showInfo(t[0], record(t[1]));
  }
}
function badge(v) {
  const cls = v === 'verified' ? 'ok' : 'warn';
  return `<span class="badge ${cls}">${v}</span>`;
}

// info card
const infoEl = document.getElementById('info');
function showInfo(title, html) {
  infoEl.querySelector('h3').textContent = title;
  infoEl.querySelector('.body').innerHTML = html;
  infoEl.classList.add('show');
}
function hideInfo() { infoEl.classList.remove('show'); }
document.getElementById('infoClose').addEventListener('click', hideInfo);

// stats
document.getElementById('stats').innerHTML = `
  <div><b>${stats.buildings.toLocaleString()}</b><span>buildings</span></div>
  <div><b>${stats.underground.toLocaleString()}</b><span>underground assets</span></div>
  <div><b>${Math.round(stats.fibreKm).toLocaleString()} km</b><span>fibre mapped</span></div>
  <div><b>${Math.round(stats.waterKm).toLocaleString()} km</b><span>water pipes</span></div>
  <div><b>${Math.round(stats.powerKm).toLocaleString()} km</b><span>power lines</span></div>
  <div><b>${stats.mines}</b><span>mines + tunnels</span></div>`;

// loading overlay off
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
    flyAnim.t = Math.min(1, flyAnim.t + dt / 1.6);
    const e = flyAnim.t < 0.5 ? 2 * flyAnim.t * flyAnim.t : 1 - ((-2 * flyAnim.t + 2) ** 2) / 2;
    camera.position.lerpVectors(flyAnim.p0, flyAnim.p1, e);
    controls.target.lerpVectors(flyAnim.t0, flyAnim.t1, e);
    if (flyAnim.t >= 1) flyAnim = null;
  }

  // distance-scaled labels
  for (const sp of G.labels.children) {
    const d = camera.position.distanceTo(sp.position);
    const s = THREE.MathUtils.clamp(d * 0.028, 0.8, 26) * sp.userData.baseScale;
    sp.scale.set(s * sp.userData.aspect, s, 1);
    sp.material.opacity = d > 1800 ? Math.max(0, 1 - (d - 1800) / 500) : 1;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
