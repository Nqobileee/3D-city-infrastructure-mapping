// ============================================================
// INZILA 3D Demo — geographic + infrastructure seed data
// All coordinates are approximate [lon, lat] pairs (WGS 84).
// This is ILLUSTRATIVE demo data, not survey data.
// ============================================================

// Approximate national boundary of Zimbabwe (clockwise)
export const BORDER = [
  [25.26, -17.79], [25.85, -17.91], [26.40, -17.96], [26.95, -17.97],
  [27.35, -17.58], [27.90, -17.02], [28.45, -16.75], [28.85, -16.52],
  [29.40, -16.10], [29.95, -15.75], [30.42, -15.62],
  [30.45, -16.05], [31.00, -16.20], [31.40, -16.35], [31.95, -16.42],
  [32.45, -16.55], [32.95, -16.70],
  [33.00, -17.30], [32.95, -17.80], [32.70, -18.20], [32.90, -18.60],
  [32.66, -18.95], [32.72, -19.40], [32.85, -19.70],
  [32.50, -20.30], [32.48, -20.90], [32.35, -21.30], [31.90, -21.80],
  [31.30, -22.40],
  [30.85, -22.30], [30.30, -22.34], [29.95, -22.21], [29.37, -22.19],
  [29.05, -21.97],
  [28.60, -21.70], [28.20, -21.60], [27.90, -21.30], [27.70, -20.90],
  [27.70, -20.49], [27.30, -20.20],
  [26.95, -19.70], [26.60, -19.00], [26.17, -18.50], [25.95, -18.20],
  [25.50, -17.95],
];

// Lake Kariba (stylised strip along the north-west border)
export const LAKE_KARIBA = [
  [26.95, -17.97], [27.35, -17.58], [27.90, -17.02], [28.45, -16.75],
  [28.85, -16.52], [28.80, -16.64], [28.38, -16.90], [27.88, -17.22],
  [27.42, -17.74], [27.06, -18.04],
];

// Great Dyke — stylised centreline of the geological feature (NNE→SSW)
export const GREAT_DYKE = [
  [30.55, -16.75], [30.35, -17.40], [30.12, -18.20], [29.97, -18.90],
  [30.05, -19.60], [29.92, -20.30], [29.58, -20.88],
];

// Cities / towns. tier 1 = metro, 2 = city, 3 = town. radius in km.
export const CITIES = [
  { name: 'Harare',         lon: 31.05, lat: -17.83, tier: 1, radius: 5.5 },
  { name: 'Bulawayo',       lon: 28.58, lat: -20.15, tier: 1, radius: 4.5 },
  { name: 'Chitungwiza',    lon: 31.07, lat: -18.01, tier: 2, radius: 2.4 },
  { name: 'Mutare',         lon: 32.65, lat: -18.97, tier: 2, radius: 2.4 },
  { name: 'Gweru',          lon: 29.82, lat: -19.45, tier: 2, radius: 2.4 },
  { name: 'Kwekwe',         lon: 29.81, lat: -18.92, tier: 2, radius: 2.0 },
  { name: 'Masvingo',       lon: 30.83, lat: -20.06, tier: 2, radius: 2.0 },
  { name: 'Kadoma',         lon: 29.92, lat: -18.33, tier: 3, radius: 1.6 },
  { name: 'Chinhoyi',       lon: 30.20, lat: -17.37, tier: 3, radius: 1.6 },
  { name: 'Marondera',      lon: 31.55, lat: -18.19, tier: 3, radius: 1.5 },
  { name: 'Bindura',        lon: 31.33, lat: -17.30, tier: 3, radius: 1.4 },
  { name: 'Victoria Falls', lon: 25.84, lat: -17.93, tier: 3, radius: 1.4 },
  { name: 'Hwange',         lon: 26.50, lat: -18.36, tier: 3, radius: 1.4 },
  { name: 'Kariba',         lon: 28.80, lat: -16.55, tier: 3, radius: 1.2 },
  { name: 'Gwanda',         lon: 29.00, lat: -20.94, tier: 3, radius: 1.2 },
  { name: 'Beitbridge',     lon: 30.00, lat: -22.22, tier: 3, radius: 1.3 },
  { name: 'Zvishavane',     lon: 30.07, lat: -20.33, tier: 3, radius: 1.4 },
  { name: 'Shurugwi',       lon: 30.00, lat: -19.67, tier: 3, radius: 1.1 },
  { name: 'Chiredzi',       lon: 31.67, lat: -21.05, tier: 3, radius: 1.2 },
  { name: 'Karoi',          lon: 29.62, lat: -16.81, tier: 3, radius: 1.0 },
  { name: 'Plumtree',       lon: 27.82, lat: -20.49, tier: 3, radius: 0.9 },
  { name: 'Rusape',         lon: 32.12, lat: -18.53, tier: 3, radius: 1.1 },
];

// Mines. depthKm = stylised deepest working level. levels = underground levels drawn.
export const MINES = [
  { name: 'Hwange Colliery',      lon: 26.42, lat: -18.37, mineral: 'Coal',            owner: 'Hwange Colliery Co.',   depthKm: 0.35, levels: 2, color: 0x8d8d8d },
  { name: 'Kamativi',             lon: 27.05, lat: -18.32, mineral: 'Lithium / Tin',   owner: 'Kamativi Mining Co.',   depthKm: 0.55, levels: 3, color: 0xb8f171 },
  { name: 'Zimplats Ngezi',       lon: 30.00, lat: -18.62, mineral: 'Platinum (PGMs)', owner: 'Zimplats',              depthKm: 0.55, levels: 3, color: 0x9fd8ff },
  { name: 'Unki',                 lon: 30.08, lat: -19.72, mineral: 'Platinum (PGMs)', owner: 'Anglo American',        depthKm: 0.60, levels: 3, color: 0x9fd8ff },
  { name: 'Mimosa',               lon: 29.95, lat: -20.36, mineral: 'Platinum (PGMs)', owner: 'Mimosa Mining Co.',     depthKm: 0.70, levels: 3, color: 0x9fd8ff },
  { name: 'Zimasco Shurugwi',     lon: 30.02, lat: -19.63, mineral: 'Chrome',          owner: 'Zimasco',               depthKm: 0.45, levels: 2, color: 0xd9c07a },
  { name: 'Blanket Mine',         lon: 28.98, lat: -21.00, mineral: 'Gold',            owner: 'Caledonia Mining',      depthKm: 1.20, levels: 4, color: 0xffd54a },
  { name: 'How Mine',             lon: 28.72, lat: -20.25, mineral: 'Gold',            owner: 'Metallon Corp.',        depthKm: 1.10, levels: 4, color: 0xffd54a },
  { name: 'Globe & Phoenix',      lon: 29.80, lat: -18.93, mineral: 'Gold',            owner: 'Kwekwe Consolidated',   depthKm: 0.80, levels: 3, color: 0xffd54a },
  { name: 'Cam & Motor',          lon: 29.90, lat: -18.35, mineral: 'Gold',            owner: 'RioZim',                depthKm: 0.90, levels: 3, color: 0xffd54a },
  { name: 'Freda Rebecca',        lon: 31.35, lat: -17.32, mineral: 'Gold',            owner: 'Kuvimba Mining House',  depthKm: 0.80, levels: 3, color: 0xffd54a },
  { name: 'Trojan Nickel',        lon: 31.30, lat: -17.27, mineral: 'Nickel',          owner: 'Bindura Nickel Corp.',  depthKm: 1.00, levels: 4, color: 0xc7ffe0 },
  { name: 'Shamva Mine',          lon: 31.57, lat: -17.31, mineral: 'Gold',            owner: 'Kuvimba Mining House',  depthKm: 0.70, levels: 3, color: 0xffd54a },
  { name: 'Renco Mine',           lon: 31.20, lat: -20.62, mineral: 'Gold',            owner: 'RioZim',                depthKm: 0.90, levels: 3, color: 0xffd54a },
  { name: 'Murowa',               lon: 30.00, lat: -20.47, mineral: 'Diamonds',        owner: 'RZM Murowa',            depthKm: 0.40, levels: 2, color: 0xe6f2ff },
  { name: 'Marange Fields',       lon: 32.30, lat: -19.50, mineral: 'Diamonds',        owner: 'ZCDC',                  depthKm: 0.25, levels: 1, color: 0xe6f2ff },
  { name: 'Bikita Minerals',      lon: 31.65, lat: -20.08, mineral: 'Lithium',         owner: 'Sinomine',              depthKm: 0.30, levels: 2, color: 0xb8f171 },
  { name: 'Redwing Penhalonga',   lon: 32.68, lat: -18.85, mineral: 'Gold',            owner: 'Metallon Corp.',        depthKm: 0.65, levels: 3, color: 0xffd54a },
];

// Power stations
export const POWER_STATIONS = [
  { name: 'Kariba South (Hydro)',    lon: 28.76, lat: -16.55, type: 'hydro',   mw: 1050 },
  { name: 'Hwange Thermal',          lon: 26.47, lat: -18.38, type: 'thermal', mw: 1520 },
  { name: 'Harare Thermal',          lon: 31.06, lat: -17.86, type: 'thermal', mw: 90 },
  { name: 'Bulawayo Thermal',        lon: 28.55, lat: -20.16, type: 'thermal', mw: 90 },
  { name: 'Munyati Thermal',         lon: 29.84, lat: -18.66, type: 'thermal', mw: 100 },
];

// Major trunk roads (sequences of city names and/or [lon,lat] waypoints)
export const ROADS = [
  { name: 'A1 Harare–Chirundu',        path: ['Harare', 'Chinhoyi', 'Karoi', [29.30, -16.30]] },
  { name: 'Kariba spur',               path: ['Karoi', 'Kariba'] },
  { name: 'A5 Harare–Bulawayo',        path: ['Harare', 'Kadoma', 'Kwekwe', 'Gweru', 'Bulawayo'] },
  { name: 'A3 Harare–Mutare',          path: ['Harare', 'Marondera', 'Rusape', 'Mutare'] },
  { name: 'A4 Harare–Beitbridge',      path: ['Harare', 'Chitungwiza', 'Masvingo', [30.55, -21.20], 'Beitbridge'] },
  { name: 'A8 Bulawayo–Victoria Falls',path: ['Bulawayo', [27.55, -19.40], 'Hwange', 'Victoria Falls'] },
  { name: 'A6 Bulawayo–Beitbridge',    path: ['Bulawayo', 'Gwanda', [29.60, -21.70], 'Beitbridge'] },
  { name: 'A7 Bulawayo–Plumtree',      path: ['Bulawayo', 'Plumtree'] },
  { name: 'A9 Masvingo–Mutare',        path: ['Masvingo', [31.95, -19.85], [32.35, -19.35], 'Mutare'] },
  { name: 'Harare–Bindura–Shamva',     path: ['Harare', 'Bindura', [31.57, -17.31]] },
  { name: 'Gweru–Zvishavane',          path: ['Gweru', 'Shurugwi', 'Zvishavane'] },
  { name: 'Zvishavane–Masvingo',       path: ['Zvishavane', 'Masvingo'] },
  { name: 'Masvingo–Chiredzi',         path: ['Masvingo', 'Chiredzi'] },
];

// National fibre trunk routes (underground). Mirrors the Global Gateway backbone framing.
export const FIBRE_ROUTES = [
  { name: 'Harare–Bulawayo trunk',        path: ['Harare', 'Kadoma', 'Kwekwe', 'Gweru', 'Bulawayo'] },
  { name: 'Harare–Mutare trunk',          path: ['Harare', 'Marondera', 'Rusape', 'Mutare'] },
  { name: 'Harare–Chirundu trunk',        path: ['Harare', 'Chinhoyi', 'Karoi', 'Kariba'] },
  { name: 'Bulawayo–Victoria Falls trunk',path: ['Bulawayo', [27.55, -19.40], 'Hwange', 'Victoria Falls'] },
  { name: 'Harare–Beitbridge trunk',      path: ['Harare', 'Chitungwiza', 'Masvingo', [30.55, -21.20], 'Beitbridge'] },
  { name: 'Bulawayo–Beitbridge trunk',    path: ['Bulawayo', 'Gwanda', [29.60, -21.70], 'Beitbridge'] },
  { name: 'Masvingo–Mutare link',         path: ['Masvingo', [31.95, -19.85], [32.35, -19.35], 'Mutare'] },
  { name: 'Bulawayo–Plumtree (regional)', path: ['Bulawayo', 'Plumtree'] },
];

// High-voltage transmission corridors (overhead)
export const POWER_LINES = [
  { name: 'Hwange–Insukamini 330 kV',  path: [[26.47, -18.38], [27.55, -19.40], 'Bulawayo'] },
  { name: 'Insukamini–Sherwood 330 kV',path: ['Bulawayo', 'Gweru', 'Kwekwe'] },
  { name: 'Sherwood–Harare 330 kV',    path: ['Kwekwe', 'Kadoma', 'Harare'] },
  { name: 'Kariba–Harare 330 kV',      path: [[28.76, -16.55], 'Karoi', 'Chinhoyi', 'Harare'] },
  { name: 'Harare–Mutare 132 kV',      path: ['Harare', 'Marondera', 'Rusape', 'Mutare'] },
  { name: 'Sherwood–Masvingo 132 kV',  path: ['Kwekwe', 'Gweru', 'Masvingo'] },
  { name: 'Masvingo–Beitbridge 132 kV',path: ['Masvingo', [30.55, -21.20], 'Beitbridge'] },
];

// Utility owners used for generated asset records
export const OWNERS = {
  fibre:  ['Liquid Intelligent Technologies', 'TelOne', 'Econet Wireless', 'NetOne', 'Dandemutande'],
  water:  ['City of Harare', 'City of Bulawayo', 'Local Authority Water Dept.', 'ZINWA'],
  power:  ['ZESA Holdings', 'ZETDC'],
  roads:  ['Ministry of Transport', 'Local Authority Roads Dept.'],
  transit:['ZUPCO', 'Local Authority Transit'],
};
