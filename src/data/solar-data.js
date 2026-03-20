export const AU_KM = 149597870.7;
export const DEG = Math.PI / 180;
export const RADIUS_SCALE = 20 / 696340;

export const textureSources = {
  mercury: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/mercury.jpg",
  venus: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/venus.jpg",
  earth: "https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png",
  moon: "https://astrogeology.usgs.gov/ckan/dataset/359afbec-7f0d-4020-9453-3fb57f8ea651/resource/91f58a2f-64bb-4c81-9978-babfd65b1c41/download/lunar_clementine_uvvis_750nm_global_mosaic_1024.jpg",
  mars: "https://astrogeology.usgs.gov/ckan/dataset/7131d503-cdc9-45a5-8f83-5126c0fd397e/resource/6afad901-1caa-48a7-8b62-3911da0004c2/download/mars_viking_mdim21_clrmosaic_global_1024.jpg",
  jupiter: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/jupiter.jpg",
  saturn: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/saturn.jpg",
  uranus: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/uranus.jpg",
  neptune: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/neptune.jpg",
};

export const systemTilts = {
  earth: 23.44 * DEG,
  mars: 25.19 * DEG,
  jupiter: 3.13 * DEG,
  saturn: 26.73 * DEG,
  uranus: 97.77 * DEG,
  neptune: 28.32 * DEG,
};

export const systemNodes = {
  earth: 0.35,
  mars: -0.15,
  jupiter: 0.82,
  saturn: 0.48,
  uranus: 1.31,
  neptune: 0.27,
};

export const orbitalElements = {
  mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], i: [7.00497902, -0.00594749], L: [252.2503235, 149472.67411175], longPeri: [77.45779628, 0.16047689], longNode: [48.33076593, -0.12534081] },
  venus: { a: [0.72333566, 0.0000039], e: [0.00677672, -0.00004107], i: [3.39467605, -0.0007889], L: [181.9790995, 58517.81538729], longPeri: [131.60246718, 0.00268329], longNode: [76.67984255, -0.27769418] },
  earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], i: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], longPeri: [102.93768193, 0.32327364], longNode: [0, 0] },
  mars: { a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882], i: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], longPeri: [-23.94362959, 0.44441088], longNode: [49.55953891, -0.29257343] },
  jupiter: { a: [5.202887, -0.00011607], e: [0.04838624, -0.00013253], i: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], longPeri: [14.72847983, 0.21252668], longNode: [100.47390909, 0.20469106] },
  saturn: { a: [9.53667594, -0.0012506], e: [0.05386179, -0.00050991], i: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], longPeri: [92.59887831, -0.41897216], longNode: [113.66242448, -0.28867794] },
  uranus: { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], i: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], longPeri: [170.9542763, 0.40805281], longNode: [74.01692503, 0.04240589] },
  neptune: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], i: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], longPeri: [44.96476227, -0.32241464], longNode: [131.78422574, -0.00508664] },
};

export const bodyDefs = [
  { id: "sun", name: "太阳", type: "star", radiusKm: 696340, colorA: "#ffdf7b", colorB: "#ff7a00", rotationHours: 609.12, description: "中心恒星。" },
  { id: "mercury", name: "水星", type: "rocky", parent: "sun", orbit: { kind: "planet" }, radiusKm: 2439.7, colorA: "#a8a29e", colorB: "#6b6258", rotationHours: 1407.6, description: "最内侧岩质行星。" },
  { id: "venus", name: "金星", type: "cloudy", parent: "sun", orbit: { kind: "planet" }, radiusKm: 6051.8, colorA: "#d8bb78", colorB: "#88612f", rotationHours: -5832.5, description: "厚云层行星。" },
  { id: "earth", name: "地球", type: "earth", parent: "sun", orbit: { kind: "planet" }, radiusKm: 6371, colorA: "#3e8cff", colorB: "#58d68d", rotationHours: 23.93, description: "海洋与大陆并存。" },
  { id: "moon", name: "月球", type: "rocky", parent: "earth", orbit: { kind: "moon", distanceKm: 384400, periodDays: 27.321661, inclinationDeg: 5.145, phaseDeg: 125 }, radiusKm: 1737.4, colorA: "#d2d2cf", colorB: "#767676", rotationHours: 655.7, description: "地球天然卫星。" },
  { id: "mars", name: "火星", type: "rockyRed", parent: "sun", orbit: { kind: "planet" }, radiusKm: 3389.5, colorA: "#d66b2d", colorB: "#7a2a18", rotationHours: 24.62, description: "红色岩质世界。" },
  { id: "phobos", name: "火卫一", type: "rocky", parent: "mars", orbit: { kind: "moon", distanceKm: 9376, periodDays: 0.31891, inclinationDeg: 1.08, phaseDeg: 80 }, radiusKm: 11.27, colorA: "#9f8b7d", colorB: "#5f4d40", rotationHours: 7.65, description: "火星近侧卫星。" },
  { id: "deimos", name: "火卫二", type: "rocky", parent: "mars", orbit: { kind: "moon", distanceKm: 23463, periodDays: 1.263, inclinationDeg: 1.79, phaseDeg: 230 }, radiusKm: 6.2, colorA: "#b4a392", colorB: "#665447", rotationHours: 30.3, description: "火星外侧卫星。" },
  { id: "jupiter", name: "木星", type: "gas", parent: "sun", orbit: { kind: "planet" }, radiusKm: 69911, colorA: "#d7a876", colorB: "#8b6041", rotationHours: 9.93, description: "最大行星。" },
  { id: "io", name: "木卫一 Io", type: "volcanic", parent: "jupiter", orbit: { kind: "moon", distanceKm: 421700, periodDays: 1.769, inclinationDeg: 0.05, phaseDeg: 0 }, radiusKm: 1821.6, colorA: "#efe08d", colorB: "#c9791b", rotationHours: 42.46, description: "火山活动剧烈。" },
  { id: "europa", name: "木卫二 Europa", type: "ice", parent: "jupiter", orbit: { kind: "moon", distanceKm: 671100, periodDays: 3.551, inclinationDeg: 0.47, phaseDeg: 50 }, radiusKm: 1560.8, colorA: "#e8ddd1", colorB: "#8f6644", rotationHours: 85.2, description: "冰壳海洋世界。" },
  { id: "ganymede", name: "木卫三 Ganymede", type: "ice", parent: "jupiter", orbit: { kind: "moon", distanceKm: 1070400, periodDays: 7.155, inclinationDeg: 0.2, phaseDeg: 120 }, radiusKm: 2634.1, colorA: "#bfb6aa", colorB: "#756a5a", rotationHours: 171.7, description: "最大卫星。" },
  { id: "callisto", name: "木卫四 Callisto", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 1882700, periodDays: 16.689, inclinationDeg: 0.28, phaseDeg: 210 }, radiusKm: 2410.3, colorA: "#8d7f70", colorB: "#51463d", rotationHours: 400.5, description: "撞击坑密布。" },
  { id: "himalia", name: "木卫六 Himalia", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 11461000, periodDays: 250.57, inclinationDeg: 27.5, phaseDeg: 150 }, radiusKm: 69.8, colorA: "#aa9483", colorB: "#5d4b41", rotationHours: 6013, description: "外侧卫星。" },
  { id: "pasiphae", name: "木卫八 Pasiphae", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 23500000, periodDays: -743.6, inclinationDeg: 151.4, phaseDeg: 270 }, radiusKm: 30, colorA: "#a99280", colorB: "#5c483d", rotationHours: 17846, description: "逆行外侧卫星。" },
  { id: "sinope", name: "木卫九 Sinope", type: "rockyRed", parent: "jupiter", orbit: { kind: "moon", distanceKm: 23940000, periodDays: -758.9, inclinationDeg: 158.1, phaseDeg: 320 }, radiusKm: 19, colorA: "#b36a55", colorB: "#60382c", rotationHours: 18213, description: "逆行外侧卫星。" },
  { id: "saturn", name: "土星", type: "gasBand", parent: "sun", orbit: { kind: "planet" }, radiusKm: 58232, colorA: "#d8c28d", colorB: "#8f7349", rotationHours: 10.7, description: "拥有环系。" },
  { id: "mimas", name: "土卫一 Mimas", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 185540, periodDays: 0.942, inclinationDeg: 1.57, phaseDeg: 40 }, radiusKm: 198.2, colorA: "#d6d7dd", colorB: "#7f8795", rotationHours: 22.61, description: "冰卫星。" },
  { id: "enceladus", name: "土卫二 Enceladus", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 238020, periodDays: 1.37, inclinationDeg: 0.02, phaseDeg: 110 }, radiusKm: 252.1, colorA: "#fbfdff", colorB: "#a8cde9", rotationHours: 32.88, description: "冰喷流。" },
  { id: "tethys", name: "土卫三 Tethys", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 294670, periodDays: 1.888, inclinationDeg: 1.12, phaseDeg: 170 }, radiusKm: 531.1, colorA: "#efefef", colorB: "#98a4b1", rotationHours: 45.31, description: "中型冰卫星。" },
  { id: "dione", name: "土卫四 Dione", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 377400, periodDays: 2.737, inclinationDeg: 0.03, phaseDeg: 220 }, radiusKm: 561.4, colorA: "#e8e5e2", colorB: "#928b88", rotationHours: 65.69, description: "亮暗地形明显。" },
  { id: "rhea", name: "土卫五 Rhea", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 527100, periodDays: 4.518, inclinationDeg: 0.35, phaseDeg: 290 }, radiusKm: 763.8, colorA: "#d2d5de", colorB: "#798090", rotationHours: 108.4, description: "第二大土卫。" },
  { id: "titan", name: "土卫六 Titan", type: "hazy", parent: "saturn", orbit: { kind: "moon", distanceKm: 1221870, periodDays: 15.945, inclinationDeg: 0.33, phaseDeg: 20 }, radiusKm: 2574.7, colorA: "#dda95d", colorB: "#815728", rotationHours: 382.7, description: "大气浓密。" },
  { id: "iapetus", name: "土卫八 Iapetus", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 3561300, periodDays: 79.3215, inclinationDeg: 15.47, phaseDeg: 120 }, radiusKm: 734.5, colorA: "#c9c4bf", colorB: "#50463d", rotationHours: 1903.7, description: "双色卫星。" },
  { id: "uranus", name: "天王星", type: "iceGiant", parent: "sun", orbit: { kind: "planet" }, radiusKm: 25362, colorA: "#8adbf0", colorB: "#4f8fb1", rotationHours: -17.24, description: "青蓝色冰巨星。" },
  { id: "neptune", name: "海王星", type: "iceGiant", parent: "sun", orbit: { kind: "planet" }, radiusKm: 24622, colorA: "#3f6dff", colorB: "#1b2c92", rotationHours: 16.11, description: "深蓝色冰巨星。" },
  { id: "triton", name: "海卫一 Triton", type: "ice", parent: "neptune", orbit: { kind: "moon", distanceKm: 354760, periodDays: -5.877, inclinationDeg: 156.8, phaseDeg: 260 }, radiusKm: 1353.4, colorA: "#efe6dc", colorB: "#908782", rotationHours: 141.05, description: "逆行大卫星。" },
];




