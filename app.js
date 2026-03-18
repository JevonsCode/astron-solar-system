import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const AU_KM = 149597870.7;
const DEG = Math.PI / 180;

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#scene"),
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050b);
scene.fog = new THREE.FogExp2(0x02050b, 0.00018);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 6000);
camera.position.set(-35, 16, 95);

const ambient = new THREE.AmbientLight(0x6f7ea6, 0.48);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xfff2c1, 5.4, 0, 1.5);
scene.add(sunLight);

const root = new THREE.Group();
scene.add(root);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tempVec = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const cameraEuler = new THREE.Euler(0, 0, 0, "YXZ");
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");
let lastFrameTime = performance.now();
const PARENT_SYSTEM_TILTS = {
  earth: 23.44 * DEG,
  mars: 25.19 * DEG,
  jupiter: 3.13 * DEG,
  saturn: 26.73 * DEG,
  uranus: 97.77 * DEG,
  neptune: 28.32 * DEG,
};
const PARENT_SYSTEM_NODES = {
  earth: 0.35,
  mars: -0.15,
  jupiter: 0.82,
  saturn: 0.48,
  uranus: 1.31,
  neptune: 0.27,
};

const ui = {
  dateInput: document.querySelector("#dateInput"),
  timeScale: document.querySelector("#timeScale"),
  timeScaleValue: document.querySelector("#timeScaleValue"),
  moveSpeed: document.querySelector("#moveSpeed"),
  moveSpeedValue: document.querySelector("#moveSpeedValue"),
  bodySelect: document.querySelector("#bodySelect"),
  pauseBtn: document.querySelector("#pauseBtn"),
  nowBtn: document.querySelector("#nowBtn"),
  focusBtn: document.querySelector("#focusBtn"),
  landBtn: document.querySelector("#landBtn"),
  toggleLabelsBtn: document.querySelector("#toggleLabelsBtn"),
  resetCameraBtn: document.querySelector("#resetCameraBtn"),
  infoName: document.querySelector("#infoName"),
  infoText: document.querySelector("#infoText"),
  cursorHint: document.querySelector("#cursorHint"),
};

const state = {
  simDate: new Date(),
  timeScale: Number(ui.timeScale.value),
  timePaused: false,
  moveSpeed: Number(ui.moveSpeed.value),
  selectedBodyId: "earth",
  pitch: -0.12,
  yaw: -0.48,
  dragging: false,
  movement: {
    forward: 0,
    right: 0,
    up: 0,
  },
  boost: 1,
  autopilot: null,
  landed: null,
  showLabels: true,
};

const textureSources = {
  earth: "https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png",
  moon: "https://astrogeology.usgs.gov/ckan/dataset/359afbec-7f0d-4020-9453-3fb57f8ea651/resource/91f58a2f-64bb-4c81-9978-babfd65b1c41/download/lunar_clementine_uvvis_750nm_global_mosaic_1024.jpg",
  mars: "https://astrogeology.usgs.gov/ckan/dataset/7131d503-cdc9-45a5-8f83-5126c0fd397e/resource/6afad901-1caa-48a7-8b62-3911da0004c2/download/mars_viking_mdim21_clrmosaic_global_1024.jpg",
  jupiter: "https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA07782.jpg",
};

const orbitalElements = {
  mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], i: [7.00497902, -0.00594749], L: [252.2503235, 149472.67411175], longPeri: [77.45779628, 0.16047689], longNode: [48.33076593, -0.12534081] },
  venus: { a: [0.72333566, 0.0000039], e: [0.00677672, -0.00004107], i: [3.39467605, -0.0007889], L: [181.9790995, 58517.81538729], longPeri: [131.60246718, 0.00268329], longNode: [76.67984255, -0.27769418] },
  earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], i: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], longPeri: [102.93768193, 0.32327364], longNode: [0, 0] },
  mars: { a: [1.52371034, 0.00001847], e: [0.0933941, 0.00007882], i: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], longPeri: [-23.94362959, 0.44441088], longNode: [49.55953891, -0.29257343] },
  jupiter: { a: [5.202887, -0.00011607], e: [0.04838624, -0.00013253], i: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], longPeri: [14.72847983, 0.21252668], longNode: [100.47390909, 0.20469106] },
  saturn: { a: [9.53667594, -0.0012506], e: [0.05386179, -0.00050991], i: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], longPeri: [92.59887831, -0.41897216], longNode: [113.66242448, -0.28867794] },
  uranus: { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], i: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], longPeri: [170.9542763, 0.40805281], longNode: [74.01692503, 0.04240589] },
  neptune: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], i: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], longPeri: [44.96476227, -0.32241464], longNode: [131.78422574, -0.00508664] },
};

const bodyDefs = [
  { id: "sun", name: "太阳", type: "star", radiusKm: 696340, colorA: "#ffdf7b", colorB: "#ff7a00", rotationHours: 609.12, description: "中心恒星，提供整套场景光照与能量。" },
  { id: "mercury", name: "水星", type: "rocky", parent: "sun", orbit: { kind: "planet" }, radiusKm: 2439.7, colorA: "#a8a29e", colorB: "#6b6258", rotationHours: 1407.6, description: "轨道最快、昼夜温差极大的岩质行星。" },
  { id: "venus", name: "金星", type: "cloudy", parent: "sun", orbit: { kind: "planet" }, radiusKm: 6051.8, colorA: "#d8bb78", colorB: "#88612f", rotationHours: -5832.5, description: "被厚重云层包裹的高反照率世界。" },
  { id: "earth", name: "地球", type: "earth", parent: "sun", orbit: { kind: "planet" }, radiusKm: 6371, colorA: "#3e8cff", colorB: "#58d68d", rotationHours: 23.93, description: "带有海洋和云层色调的宜居行星。" },
  { id: "moon", name: "月球", type: "rocky", parent: "earth", orbit: { kind: "moon", distanceKm: 384400, periodDays: 27.321661, inclinationDeg: 5.145, phaseDeg: 125 }, radiusKm: 1737.4, colorA: "#d2d2cf", colorB: "#767676", rotationHours: 655.7, description: "地球的天然卫星，潮汐锁定近似呈现。" },
  { id: "mars", name: "火星", type: "rockyRed", parent: "sun", orbit: { kind: "planet" }, radiusKm: 3389.5, colorA: "#d66b2d", colorB: "#7a2a18", rotationHours: 24.62, description: "拥有极冠与尘暴色调的红色世界。" },
  { id: "phobos", name: "火卫一", type: "rocky", parent: "mars", orbit: { kind: "moon", distanceKm: 9376, periodDays: 0.31891, inclinationDeg: 1.08, phaseDeg: 80 }, radiusKm: 11.27, colorA: "#9f8b7d", colorB: "#5f4d40", rotationHours: 7.65, description: "火星近距离掠过的小型不规则卫星。" },
  { id: "deimos", name: "火卫二", type: "rocky", parent: "mars", orbit: { kind: "moon", distanceKm: 23463, periodDays: 1.263, inclinationDeg: 1.79, phaseDeg: 230 }, radiusKm: 6.2, colorA: "#b4a392", colorB: "#665447", rotationHours: 30.3, description: "更外侧、更安静的小卫星。" },
  { id: "jupiter", name: "木星", type: "gas", parent: "sun", orbit: { kind: "planet" }, radiusKm: 69911, colorA: "#d7a876", colorB: "#8b6041", rotationHours: 9.93, description: "条带云层与巨大引力主导外太阳系局部环境。" },
  { id: "metis", name: "木卫十六 Metis", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 128000, periodDays: 0.295, inclinationDeg: 0.06, phaseDeg: 40 }, radiusKm: 21.5, colorA: "#d4b195", colorB: "#785c48", rotationHours: 7.08, description: "木星最内层小卫星之一。" },
  { id: "adrastea", name: "木卫十五 Adrastea", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 129000, periodDays: 0.299, inclinationDeg: 0.03, phaseDeg: 80 }, radiusKm: 8.2, colorA: "#ccb59e", colorB: "#715547", rotationHours: 7.17, description: "贴近木星主环附近运行的小卫星。" },
  { id: "amalthea", name: "木卫五 Amalthea", type: "rockyRed", parent: "jupiter", orbit: { kind: "moon", distanceKm: 181400, periodDays: 0.498, inclinationDeg: 0.37, phaseDeg: 120 }, radiusKm: 83.5, colorA: "#d77d6c", colorB: "#7a4030", rotationHours: 11.95, description: "带有红棕色调的内侧卫星。" },
  { id: "thebe", name: "木卫十四 Thebe", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 221900, periodDays: 0.675, inclinationDeg: 1.08, phaseDeg: 170 }, radiusKm: 49.3, colorA: "#bda18b", colorB: "#6e5444", rotationHours: 16.2, description: "位于 Amalthea 轨道外侧。" },
  { id: "io", name: "木卫一 Io", type: "volcanic", parent: "jupiter", orbit: { kind: "moon", distanceKm: 421700, periodDays: 1.769, inclinationDeg: 0.05, phaseDeg: 0 }, radiusKm: 1821.6, colorA: "#efe08d", colorB: "#c9791b", rotationHours: 42.46, description: "火山活动最剧烈的已知天体之一。" },
  { id: "europa", name: "木卫二 Europa", type: "ice", parent: "jupiter", orbit: { kind: "moon", distanceKm: 671100, periodDays: 3.551, inclinationDeg: 0.47, phaseDeg: 50 }, radiusKm: 1560.8, colorA: "#e8ddd1", colorB: "#8f6644", rotationHours: 85.2, description: "冰壳下被认为可能隐藏全球海洋。" },
  { id: "ganymede", name: "木卫三 Ganymede", type: "ice", parent: "jupiter", orbit: { kind: "moon", distanceKm: 1070400, periodDays: 7.155, inclinationDeg: 0.2, phaseDeg: 120 }, radiusKm: 2634.1, colorA: "#bfb6aa", colorB: "#756a5a", rotationHours: 171.7, description: "太阳系体积最大的卫星。" },
  { id: "callisto", name: "木卫四 Callisto", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 1882700, periodDays: 16.689, inclinationDeg: 0.28, phaseDeg: 210 }, radiusKm: 2410.3, colorA: "#8d7f70", colorB: "#51463d", rotationHours: 400.5, description: "古老且布满撞击痕迹的外侧巨卫星。" },
  { id: "leda", name: "木卫十三 Leda", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 11165000, periodDays: 238.72, inclinationDeg: 27.5, phaseDeg: 100 }, radiusKm: 10, colorA: "#bca48e", colorB: "#644f42", rotationHours: 5729, description: "较远的木星小型不规则卫星。" },
  { id: "himalia", name: "木卫六 Himalia", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 11461000, periodDays: 250.57, inclinationDeg: 27.5, phaseDeg: 150 }, radiusKm: 69.8, colorA: "#aa9483", colorB: "#5d4b41", rotationHours: 6013, description: "木星外侧较大的不规则卫星之一。" },
  { id: "elara", name: "木卫七 Elara", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 11740000, periodDays: 259.64, inclinationDeg: 26.6, phaseDeg: 190 }, radiusKm: 43, colorA: "#9d8573", colorB: "#5a4639", rotationHours: 6231, description: "属于逆行外侧卫星群附近轨道。" },
  { id: "pasiphae", name: "木卫八 Pasiphae", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 23500000, periodDays: -743.6, inclinationDeg: 151.4, phaseDeg: 270 }, radiusKm: 30, colorA: "#a99280", colorB: "#5c483d", rotationHours: 17846, description: "逆行不规则卫星族代表之一。" },
  { id: "sinope", name: "木卫九 Sinope", type: "rockyRed", parent: "jupiter", orbit: { kind: "moon", distanceKm: 23940000, periodDays: -758.9, inclinationDeg: 158.1, phaseDeg: 320 }, radiusKm: 19, colorA: "#b36a55", colorB: "#60382c", rotationHours: 18213, description: "深色的逆行外侧卫星。" },
  { id: "lysithea", name: "木卫十 Lysithea", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 11720000, periodDays: 259.22, inclinationDeg: 28.3, phaseDeg: 240 }, radiusKm: 18, colorA: "#b29e8d", colorB: "#5b4b40", rotationHours: 6219, description: "与 Himalia 群轨道相近。" },
  { id: "carme", name: "木卫十一 Carme", type: "rockyRed", parent: "jupiter", orbit: { kind: "moon", distanceKm: 23395000, periodDays: -702.5, inclinationDeg: 164.9, phaseDeg: 10 }, radiusKm: 23, colorA: "#a86758", colorB: "#5c332c", rotationHours: 16860, description: "逆行红褐色不规则卫星。" },
  { id: "ananke", name: "木卫十二 Ananke", type: "rocky", parent: "jupiter", orbit: { kind: "moon", distanceKm: 21280000, periodDays: -629.8, inclinationDeg: 148.9, phaseDeg: 65 }, radiusKm: 14, colorA: "#9b856d", colorB: "#544335", rotationHours: 15115, description: "高倾角逆行轨道的小卫星。" },
  { id: "saturn", name: "土星", type: "gasBand", parent: "sun", orbit: { kind: "planet" }, radiusKm: 58232, colorA: "#d8c28d", colorB: "#8f7349", rotationHours: 10.7, description: "拥有由小颗粒构成的宽广主环系统。" },
  { id: "mimas", name: "土卫一 Mimas", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 185540, periodDays: 0.942, inclinationDeg: 1.57, phaseDeg: 40 }, radiusKm: 198.2, colorA: "#d6d7dd", colorB: "#7f8795", rotationHours: 22.61, description: "布满撞击坑的小型冰卫星。" },
  { id: "enceladus", name: "土卫二 Enceladus", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 238020, periodDays: 1.37, inclinationDeg: 0.02, phaseDeg: 110 }, radiusKm: 252.1, colorA: "#fbfdff", colorB: "#a8cde9", rotationHours: 32.88, description: "以冰喷流闻名的高反照率卫星。" },
  { id: "tethys", name: "土卫三 Tethys", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 294670, periodDays: 1.888, inclinationDeg: 1.12, phaseDeg: 170 }, radiusKm: 531.1, colorA: "#efefef", colorB: "#98a4b1", rotationHours: 45.31, description: "亮白且相对宁静的中型冰卫星。" },
  { id: "dione", name: "土卫四 Dione", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 377400, periodDays: 2.737, inclinationDeg: 0.03, phaseDeg: 220 }, radiusKm: 561.4, colorA: "#e8e5e2", colorB: "#928b88", rotationHours: 65.69, description: "背向面有明显明亮地形。" },
  { id: "rhea", name: "土卫五 Rhea", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 527100, periodDays: 4.518, inclinationDeg: 0.35, phaseDeg: 290 }, radiusKm: 763.8, colorA: "#d2d5de", colorB: "#798090", rotationHours: 108.4, description: "土星第二大卫星，冰质外观明显。" },
  { id: "titan", name: "土卫六 Titan", type: "hazy", parent: "saturn", orbit: { kind: "moon", distanceKm: 1221870, periodDays: 15.945, inclinationDeg: 0.33, phaseDeg: 20 }, radiusKm: 2574.7, colorA: "#dda95d", colorB: "#815728", rotationHours: 382.7, description: "浓厚大气层与甲烷湖使其极具特色。" },
  { id: "iapetus", name: "土卫八 Iapetus", type: "ice", parent: "saturn", orbit: { kind: "moon", distanceKm: 3561300, periodDays: 79.3215, inclinationDeg: 15.47, phaseDeg: 120 }, radiusKm: 734.5, colorA: "#c9c4bf", colorB: "#50463d", rotationHours: 1903.7, description: "一明一暗的双色卫星。" },
  { id: "uranus", name: "天王星", type: "iceGiant", parent: "sun", orbit: { kind: "planet" }, radiusKm: 25362, colorA: "#8adbf0", colorB: "#4f8fb1", rotationHours: -17.24, description: "轴倾极大，视觉上带青蓝色宁静外观。" },
  { id: "neptune", name: "海王星", type: "iceGiant", parent: "sun", orbit: { kind: "planet" }, radiusKm: 24622, colorA: "#3f6dff", colorB: "#1b2c92", rotationHours: 16.11, description: "深蓝外观与强风暴系统著称。" },
  { id: "triton", name: "海卫一 Triton", type: "ice", parent: "neptune", orbit: { kind: "moon", distanceKm: 354760, periodDays: -5.877, inclinationDeg: 156.8, phaseDeg: 260 }, radiusKm: 1353.4, colorA: "#efe6dc", colorB: "#908782", rotationHours: 141.05, description: "逆行运行的大型冰卫星。" },
];

const bodyMap = new Map();
const clickable = [];

for (const def of bodyDefs) {
  const mesh = createBodyMesh(def);
  mesh.userData.bodyId = def.id;

  const pivot = new THREE.Group();
  root.add(pivot);
  pivot.add(mesh);

  const label = createLabelSprite(def.name);
  label.position.y = def.id === "sun" ? 15 : getVisualRadius(def) + 1.4;
  pivot.add(label);

  const body = {
    ...def,
    pivot,
    mesh,
    label,
    worldPosition: new THREE.Vector3(),
  };

  if (def.id === "sun") {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createGlowTexture(),
        color: 0xffb547,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(42);
    mesh.add(glow);
  }

  if (def.id === "saturn") {
    mesh.add(createSaturnRing(getVisualRadius(def)));
  }

  if (def.type === "earth" || def.type === "cloudy" || def.type === "hazy") {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(getVisualRadius(def) * 1.03, 48, 48),
      new THREE.MeshBasicMaterial({
        color: def.type === "earth" ? 0x88d7ff : def.type === "hazy" ? 0xf7c97c : 0xe0c89d,
        transparent: true,
        opacity: def.type === "earth" ? 0.1 : 0.08,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.add(shell);
  }

  bodyMap.set(def.id, body);
  clickable.push(mesh);
}

for (const body of bodyMap.values()) {
  if (body.id !== "sun") {
    const orbitLine = createOrbitLine(body);
    if (orbitLine) {
      if (body.orbit.kind === "planet") {
        root.add(orbitLine);
      }
      body.orbitLine = orbitLine;
    }
  }
}

buildBodySelect();
resetCamera();
syncDateInput();
setSelectedBody(state.selectedBodyId);
updateCursorHint();
updateLabelVisibility();

scene.add(createStarField());

window.addEventListener("resize", onResize);
window.addEventListener("keydown", onKey);
window.addEventListener("keyup", onKey);
renderer.domElement.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", () => {
  state.dragging = false;
});
renderer.domElement.addEventListener("click", onClickSelect);
renderer.domElement.addEventListener("wheel", onWheelSpeed, { passive: false });
document.addEventListener("pointerlockchange", onPointerLockChange);

ui.timeScale.addEventListener("input", () => {
  state.timeScale = Number(ui.timeScale.value);
  ui.timeScaleValue.textContent = `${state.timeScale}x`;
});
ui.moveSpeed.addEventListener("input", () => {
  state.moveSpeed = Number(ui.moveSpeed.value);
  ui.moveSpeedValue.textContent = `${state.moveSpeed}`;
});
ui.dateInput.addEventListener("change", () => {
  state.simDate = new Date(ui.dateInput.value);
  state.timePaused = true;
  ui.pauseBtn.textContent = "继续时间";
});
ui.pauseBtn.addEventListener("click", () => {
  state.timePaused = !state.timePaused;
  ui.pauseBtn.textContent = state.timePaused ? "继续时间" : "暂停时间";
});
ui.nowBtn.addEventListener("click", () => {
  state.simDate = new Date();
  syncDateInput();
});
ui.bodySelect.addEventListener("change", () => {
  setSelectedBody(ui.bodySelect.value);
});
ui.focusBtn.addEventListener("click", () => {
  startAutopilot(state.selectedBodyId, false);
});
ui.landBtn.addEventListener("click", () => {
  startAutopilot(state.selectedBodyId, true);
});
ui.toggleLabelsBtn.addEventListener("click", () => {
  state.showLabels = !state.showLabels;
  updateLabelVisibility();
});
ui.resetCameraBtn.addEventListener("click", resetCamera);

animate();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.033);
  lastFrameTime = now;
  advanceTime(delta);
  updateBodies(delta);
  updateAutopilot(delta);
  updateLandedState();
  updateManualFlight(delta);
  updateInfoPanel();
  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
  renderer.render(scene, camera);
}

function advanceTime(delta) {
  if (!state.timePaused) {
    state.simDate = new Date(state.simDate.getTime() + delta * 86400000 * state.timeScale * 0.02);
    syncDateInput();
  }
}

function updateBodies(delta) {
  const jd = toJulianDate(state.simDate);
  for (const body of bodyMap.values()) {
    let position = new THREE.Vector3();

    if (body.id === "sun") {
      position.set(0, 0, 0);
    } else if (body.orbit.kind === "planet") {
      position.copy(getPlanetPosition(body.id, jd));
    } else {
      const parent = bodyMap.get(body.parent);
      position.copy(parent.worldPosition).add(getMoonOffset(body, jd));
    }

    body.worldPosition.copy(position);
    body.pivot.position.copy(position);

    const rotationRate = body.rotationHours ? (24 / Math.abs(body.rotationHours)) * 0.4 : 0.02;
    body.mesh.rotation.y += rotationRate * delta * (body.rotationHours < 0 ? -1 : 1);
    body.label.quaternion.copy(camera.quaternion);
  }
  sunLight.position.copy(bodyMap.get("sun").worldPosition);
}

function updateManualFlight(delta) {
  if (state.autopilot) {
    return;
  }
  const direction = new THREE.Vector3(state.movement.right, state.movement.up, state.movement.forward);
  if (direction.lengthSq() === 0) {
    return;
  }
  if (state.landed) {
    state.landed = null;
  }
  direction.normalize().multiplyScalar(delta * state.moveSpeed * state.boost);
  cameraEuler.set(state.pitch, state.yaw, 0);
  tempQuat.setFromEuler(cameraEuler);
  direction.applyQuaternion(tempQuat);
  camera.position.add(direction);
}

function updateAutopilot(delta) {
  if (!state.autopilot) {
    return;
  }
  state.autopilot.t = Math.min(1, state.autopilot.t + delta / state.autopilot.duration);
  const eased = 1 - Math.pow(1 - state.autopilot.t, 3);
  camera.position.lerpVectors(state.autopilot.from, state.autopilot.to, eased);
  const lookPos = bodyMap.get(state.autopilot.bodyId).worldPosition;
  const lookDir = tempVec.copy(lookPos).sub(camera.position).normalize();
  state.yaw = Math.atan2(-lookDir.x, -lookDir.z);
  state.pitch = Math.asin(lookDir.y);
  if (state.autopilot.t >= 1) {
    if (state.autopilot.land) {
      const landedBody = bodyMap.get(state.autopilot.bodyId);
      const normal = camera.position.clone().sub(landedBody.worldPosition).normalize();
      state.landed = {
        bodyId: state.autopilot.bodyId,
        normal,
      };
    }
    state.autopilot = null;
  }
}

function updateLandedState() {
  if (!state.landed || state.autopilot) {
    return;
  }
  const body = bodyMap.get(state.landed.bodyId);
  const radius = getLandingRadius(body);
  camera.position.copy(body.worldPosition).add(state.landed.normal.clone().multiplyScalar(radius));
}

function updateInfoPanel() {
  const body = bodyMap.get(state.selectedBodyId);
  const distanceToCamera = camera.position.distanceTo(body.worldPosition);
  const jd = toJulianDate(state.simDate);
  const dateText = state.simDate.toLocaleString("zh-CN", { hour12: false });
  ui.infoName.textContent = body.name;
  ui.infoText.textContent =
    `${body.description} 当前模拟时间：${dateText}。距相机约 ${distanceToCamera.toFixed(1)} 场景单位，半径 ${body.radiusKm.toLocaleString("zh-CN")} km。` +
    (body.orbit?.kind === "planet"
      ? ` 轨道位置由开普勒椭圆近似计算，JD ${jd.toFixed(2)}。`
      : body.orbit?.kind === "moon"
        ? ` 环绕 ${bodyMap.get(body.parent).name} 运行，公转周期约 ${Math.abs(body.orbit.periodDays)} 天。`
        : "");
}

function buildBodySelect() {
  const fragment = document.createDocumentFragment();
  for (const body of bodyDefs) {
    const option = document.createElement("option");
    option.value = body.id;
    option.textContent = body.name;
    fragment.appendChild(option);
  }
  ui.bodySelect.appendChild(fragment);
}

function setSelectedBody(id) {
  state.selectedBodyId = id;
  ui.bodySelect.value = id;
  for (const body of bodyMap.values()) {
    body.mesh.material.emissiveIntensity = body.id === "sun" ? 1.7 : body.id === id ? 0.25 : 0.03;
    if (body.id !== "sun") {
      body.mesh.material.emissive = new THREE.Color(body.id === id ? "#7fcfff" : "#000000");
    }
    if (body.orbitLine) {
      body.orbitLine.material.opacity = body.id === id ? 0.82 : 0.24;
      body.orbitLine.material.color.set(body.id === id ? "#8cddff" : "#8ea7d5");
    }
  }
}

function updateLabelVisibility() {
  for (const body of bodyMap.values()) {
    body.label.visible = state.showLabels;
  }
  if (ui.toggleLabelsBtn) {
    ui.toggleLabelsBtn.textContent = state.showLabels ? "隐藏名称" : "显示名称";
  }
}

function startAutopilot(bodyId, land) {
  const body = bodyMap.get(bodyId);
  if (body.id === "sun" && land) {
    return;
  }
  const radius = getVisualRadius(body);
  const offset = land
    ? new THREE.Vector3(0, radius * 0.18, getLandingRadius(body))
    : new THREE.Vector3(radius * 2.2, radius * 0.75, radius * 2.9);
  const destination = body.worldPosition.clone().add(offset);
  state.autopilot = {
    bodyId,
    from: camera.position.clone(),
    to: destination,
    t: 0,
    duration: land ? 2.8 : 2.2,
    land,
  };
  state.landed = null;
}

function resetCamera() {
  camera.position.set(-35, 16, 95);
  state.yaw = -0.48;
  state.pitch = -0.12;
  state.autopilot = null;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKey(event) {
  const pressed = event.type === "keydown";
  if (event.code === "KeyW") state.movement.forward = pressed ? -1 : state.movement.forward === -1 ? 0 : state.movement.forward;
  if (event.code === "KeyS") state.movement.forward = pressed ? 1 : state.movement.forward === 1 ? 0 : state.movement.forward;
  if (event.code === "KeyA") state.movement.right = pressed ? -1 : state.movement.right === -1 ? 0 : state.movement.right;
  if (event.code === "KeyD") state.movement.right = pressed ? 1 : state.movement.right === 1 ? 0 : state.movement.right;
  if (event.code === "KeyR" || event.code === "KeyE") state.movement.up = pressed ? 1 : state.movement.up === 1 ? 0 : state.movement.up;
  if (event.code === "KeyF" || event.code === "KeyQ") state.movement.up = pressed ? -1 : state.movement.up === -1 ? 0 : state.movement.up;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") state.boost = pressed ? 4 : 1;
  if (event.code === "ControlLeft" || event.code === "ControlRight") state.boost = pressed ? 0.25 : 1;
  if (pressed && event.code === "Space") {
    state.timePaused = !state.timePaused;
    ui.pauseBtn.textContent = state.timePaused ? "继续时间" : "暂停时间";
  }
  if (pressed && event.code === "KeyL") {
    startAutopilot(state.selectedBodyId, true);
  }
}

function onPointerDown(event) {
  if (event.target !== renderer.domElement) {
    return;
  }
  state.dragging = true;
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock?.();
  }
}

function onPointerMove(event) {
  if (!state.dragging && document.pointerLockElement !== renderer.domElement) {
    return;
  }
  state.yaw -= event.movementX * 0.003;
  state.pitch -= event.movementY * 0.0024;
  state.pitch = THREE.MathUtils.clamp(state.pitch, -Math.PI / 2 + 0.03, Math.PI / 2 - 0.03);
}

function onPointerLockChange() {
  if (document.pointerLockElement !== renderer.domElement) {
    state.dragging = false;
  }
  updateCursorHint();
}

function updateCursorHint() {
  if (!ui.cursorHint) {
    return;
  }
  const locked = document.pointerLockElement === renderer.domElement;
  ui.cursorHint.classList.toggle("is-active", locked);
  ui.cursorHint.innerHTML = locked
    ? "<strong>飞行视角已锁定：</strong>移动鼠标可转向，按 Esc 恢复光标，Shift 加速，Ctrl 微调。"
    : "<strong>鼠标未锁定：</strong>点击右侧宇宙画面后即可隐藏光标并自由观察，按 Esc 恢复光标。";
}

function onClickSelect(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (hits.length) {
    setSelectedBody(hits[0].object.userData.bodyId);
  }
}

function onWheelSpeed(event) {
  event.preventDefault();
  state.moveSpeed = THREE.MathUtils.clamp(state.moveSpeed + Math.sign(-event.deltaY) * 4, 1, 400);
  ui.moveSpeed.value = String(state.moveSpeed);
  ui.moveSpeedValue.textContent = `${state.moveSpeed}`;
}

function getPlanetPosition(id, jd) {
  return compressVector(getPlanetPositionAU(id, jd));
}

function getPlanetPositionAU(id, jd) {
  const el = orbitalElements[id];
  const T = (jd - 2451545.0) / 36525;
  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const i = (el.i[0] + el.i[1] * T) * DEG;
  const L = normalizeDegrees(el.L[0] + el.L[1] * T);
  const longPeri = normalizeDegrees(el.longPeri[0] + el.longPeri[1] * T);
  const longNode = normalizeDegrees(el.longNode[0] + el.longNode[1] * T);
  const argPeri = normalizeDegrees(longPeri - longNode) * DEG;
  const M = normalizeRadians((L - longPeri) * DEG);
  const E = solveKepler(M, e);
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cosO = Math.cos(longNode * DEG);
  const sinO = Math.sin(longNode * DEG);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(argPeri);
  const sinW = Math.sin(argPeri);
  const x =
    (cosO * cosW - sinO * sinW * cosI) * xPrime +
    (-cosO * sinW - sinO * cosW * cosI) * yPrime;
  const y =
    (sinO * cosW + cosO * sinW * cosI) * xPrime +
    (-sinO * sinW + cosO * cosW * cosI) * yPrime;
  const z = sinW * sinI * xPrime + cosW * sinI * yPrime;
  return new THREE.Vector3(x, z, y);
}

function getMoonOffset(body, jd) {
  const orbit = body.orbit;
  const angle = ((jd - 2451545.0) / orbit.periodDays) * Math.PI * 2 + orbit.phaseDeg * DEG;
  return getMoonOffsetAtAngle(body, angle);
}

function getMoonOffsetAtAngle(body, angle) {
  const radius = getMoonOrbitRadius(body);
  const inclination = body.orbit.inclinationDeg * DEG;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * Math.sin(inclination);
  const z = Math.sin(angle) * radius * Math.cos(inclination);
  const local = new THREE.Vector3(x, y, z);
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), PARENT_SYSTEM_NODES[body.parent] ?? 0);
  local.applyAxisAngle(new THREE.Vector3(1, 0, 0), PARENT_SYSTEM_TILTS[body.parent] ?? 0);
  return local;
}

function createBodyMesh(def) {
  const radius = getVisualRadius(def);
  const geometry = new THREE.SphereGeometry(radius, def.id === "sun" ? 64 : 48, def.id === "sun" ? 64 : 48);
  const texture = createPlanetTexture(def);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: def.id === "sun" ? 0.9 : def.type.includes("ice") ? 0.8 : 0.95,
    metalness: 0.02,
    emissive: new THREE.Color(def.id === "sun" ? "#ffb347" : "#000000"),
    emissiveIntensity: def.id === "sun" ? 1.7 : 0.03,
  });
  const externalTextureUrl = textureSources[def.id];
  if (externalTextureUrl) {
    textureLoader.load(
      externalTextureUrl,
      (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = 8;
        material.map = loaded;
        material.needsUpdate = true;
      },
      undefined,
      () => {},
    );
  }
  return new THREE.Mesh(geometry, material);
}

function createPlanetTexture(def) {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, size, canvas.height);
  gradient.addColorStop(0, def.colorA);
  gradient.addColorStop(1, def.colorB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, canvas.height);

  const rand = seededRandom(hashCode(def.id));
  if (def.type === "gas" || def.type === "gasBand" || def.type === "iceGiant" || def.type === "hazy" || def.type === "cloudy") {
    for (let i = 0; i < 110; i += 1) {
      const y = rand() * canvas.height;
      const h = 4 + rand() * 20;
      ctx.fillStyle = `hsla(${28 + rand() * 40},${40 + rand() * 30}%,${40 + rand() * 35}%,${0.05 + rand() * 0.14})`;
      if (def.type === "iceGiant") ctx.fillStyle = `hsla(${190 + rand() * 25},${45 + rand() * 25}%,${45 + rand() * 30}%,${0.05 + rand() * 0.16})`;
      if (def.type === "cloudy") ctx.fillStyle = `hsla(${35 + rand() * 15},${35 + rand() * 20}%,${65 + rand() * 20}%,${0.07 + rand() * 0.13})`;
      ctx.fillRect(0, y, size, h);
    }
  }

  if (def.type === "earth") {
    for (let i = 0; i < 30; i += 1) {
      ctx.fillStyle = `rgba(62, ${140 + Math.floor(rand() * 90)}, ${85 + Math.floor(rand() * 80)}, 0.8)`;
      const x = rand() * size;
      const y = rand() * canvas.height;
      const w = 80 + rand() * 220;
      const h = 40 + rand() * 120;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(rand() * size, rand() * canvas.height, 40 + rand() * 140, 10 + rand() * 40, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (def.type === "rocky" || def.type === "rockyRed" || def.type === "volcanic" || def.type === "ice") {
    for (let i = 0; i < 250; i += 1) {
      const x = rand() * size;
      const y = rand() * canvas.height;
      const r = 2 + rand() * 26;
      ctx.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (def.type === "volcanic") {
        ctx.fillStyle = `rgba(255,153,0,${0.03 + rand() * 0.08})`;
        ctx.beginPath();
        ctx.arc(x + 4, y + 3, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (def.id === "sun") {
    for (let i = 0; i < 220; i += 1) {
      const x = rand() * size;
      const y = rand() * canvas.height;
      const r = 20 + rand() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,180,${0.28 + rand() * 0.2})`);
      g.addColorStop(1, "rgba(255,120,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}

function createSaturnRing(radius) {
  const inner = radius * 1.35;
  const outer = radius * 2.35;
  const count = 12000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rand = seededRandom(42);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const r = THREE.MathUtils.lerp(inner, outer, Math.pow(rand(), 0.75));
    const a = rand() * Math.PI * 2;
    const y = (rand() - 0.5) * 0.1;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r;
    color.setHSL(0.11, 0.36, 0.65 + rand() * 0.15);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const ring = new THREE.Points(geometry, material);
  ring.rotation.x = Math.PI / 2.7;
  return ring;
}

function createOrbitLine(body) {
  const samples = 320;
  const points = [];
  if (body.orbit.kind === "planet") {
    const baseJd = 2451545;
    const orbitalPeriodDays = body.id === "earth"
      ? 365.256
      : Math.sqrt(Math.pow(orbitalElements[body.id].a[0], 3)) * 365.256;
    for (let i = 0; i <= samples; i += 1) {
      const jd = baseJd + (i / samples) * orbitalPeriodDays;
      points.push(getPlanetPosition(body.id, jd));
    }
  } else {
    for (let i = 0; i <= samples; i += 1) {
      const angle = (i / samples) * Math.PI * 2;
      points.push(getMoonOffsetAtAngle(body, angle));
    }
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x8ea7d5,
    transparent: true,
    opacity: 0.24,
  });
  const orbitLine = new THREE.Line(geometry, material);
  if (body.orbit.kind === "moon") {
    bodyMap.get(body.parent)?.pivot.add(orbitLine);
  }
  return orbitLine;
}

function createStarField() {
  const count = 5000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const radius = 1700 + Math.random() * 3000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    color.setHSL(0.55 + Math.random() * 0.18, 0.25, 0.75 + Math.random() * 0.22);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 2.2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    }),
  );
}

function createLabelSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(8, 16, 32, 0.76)");
  gradient.addColorStop(1, "rgba(20, 42, 70, 0.58)");
  ctx.fillStyle = gradient;
  roundRect(ctx, 12, 24, 488, 92, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(130, 215, 255, 0.35)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 214, 111, 0.92)";
  ctx.font = "600 18px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SOLAR BODY", 256, 48);
  ctx.fillStyle = "#ecf4ff";
  ctx.font = "700 32px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 82);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(15.5, 4.35, 1);
  return sprite;
}

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,220,1)");
  gradient.addColorStop(0.3, "rgba(255,190,80,0.45)");
  gradient.addColorStop(1, "rgba(255,140,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function getVisualRadius(body) {
  if (body.id === "sun") return 18;
  const earthUnits = 2.8;
  const exactScaled = (body.radiusKm / 6371) * earthUnits;
  if (exactScaled <= 6) {
    return Math.max(exactScaled, body.orbit?.kind === "moon" ? 0.14 : 0.3);
  }
  return 6 + Math.log2(exactScaled - 5) * 2;
}

function getLandingRadius(body) {
  return getVisualRadius(body) * 1.02 + 0.08;
}

function getMoonOrbitRadius(body) {
  const parent = bodyMap.get(body.parent);
  if (!parent) {
    return compressDistance(body.orbit.distanceKm / AU_KM);
  }
  const trueLocalRadius = (body.orbit.distanceKm / parent.radiusKm) * getVisualRadius(parent);
  const softlyCompressed =
    trueLocalRadius <= 180
      ? trueLocalRadius
      : 180 + Math.log1p(trueLocalRadius - 180) * 42;
  const minSafeDistance = getVisualRadius(parent) + getVisualRadius(body) + 1.2;
  return Math.max(softlyCompressed, minSafeDistance);
}

function compressDistance(au) {
  return Math.pow(Math.abs(au), 0.62) * 120 * Math.sign(au || 1);
}

function compressVector(vector) {
  const len = vector.length();
  if (len === 0) {
    return new THREE.Vector3();
  }
  return vector.clone().normalize().multiplyScalar(compressDistance(len));
}

function toJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 8; i += 1) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

function normalizeRadians(rad) {
  return ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function syncDateInput() {
  const local = new Date(state.simDate.getTime() - state.simDate.getTimezoneOffset() * 60000);
  ui.dateInput.value = local.toISOString().slice(0, 16);
}

function hashCode(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
