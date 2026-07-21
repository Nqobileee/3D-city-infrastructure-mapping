// ============================================================
// INZILA 3D Demo — seed data for a single round pilot city
// Coordinates are local kilometres on a flat plane, centred on
// the city (0,0). This mirrors the proposal's phase-one pilot:
// a controlled 90-day mapping exercise over one dense urban
// corridor (Harare CBD) rather than national coverage.
// ============================================================

export const CITY = {
  name: 'Harare CBD',
  subtitle: 'Phase 1 pilot corridor',
  radius: 5.0,       // km
  blockStep: 1.3,    // km between street lines
};

// A named landmark building, called out in the proposal (Figure 1
// caption: "duct bank exposed during civil works near Joina City").
export const LANDMARK = {
  name: 'Joina City',
  x: 0.4, z: -0.3,
  w: 0.22, d: 0.22, h: 1.35,
};

export const MINE = {
  name: 'Freda Rebecca (illustrative)',
  mineral: 'Gold',
  owner: 'Kuvimba Mining House',
  depthKm: 0.8,
  levels: 3,
  color: 0xffd54a,
  x: 9.6, z: -2.2,
};

export const POWER_STATION = {
  name: 'Harare Thermal (illustrative)',
  type: 'thermal',
  mw: 90,
  x: -7.6, z: 3.4,
};

// Utility owners used for generated asset records
export const OWNERS = {
  fibre:  ['Liquid Intelligent Technologies', 'TelOne', 'Econet Wireless', 'NetOne', 'Dandemutande'],
  water:  ['City of Harare'],
  power:  ['ZESA Holdings', 'ZETDC'],
  roads:  ['Ministry of Transport', 'City of Harare Roads Dept.'],
  transit:['ZUPCO', 'City of Harare Transit'],
};
