import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { bodyDefs } from "./data/solar-data.js";
import { getLandingRadius, getMoonOffset, getPlanetDisplayPosition, getVisualRadius, toJulianDate } from "./core/astronomy.js";
import { createBodyLabel, createBodyMesh, createOrbitLine, createSaturnRing, createSkyMarker, createStarField, createSunGlow } from "./render/rendering.js";

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#scene"), antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050b);
scene.fog = new THREE.FogExp2(0x02050b, 0.00018);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 6000);
camera.position.set(-30, 10, 120);

const ambient = new THREE.AmbientLight(0x51627f, 0.08);
const hemisphere = new THREE.HemisphereLight(0x385a86, 0x06080d, 0.12);
const sunLight = new THREE.PointLight(0xfff2c1, 17.5, 0, 1.05);
sunLight.position.set(0, 0, 0);
scene.add(ambient, hemisphere, sunLight);

const root = new THREE.Group();
scene.add(root, createStarField());

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
  hud: document.querySelector(".hud"),
  mobileHudToggle: document.querySelector("#mobileHudToggle"),
};

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

const englishNames = {
  sun: "Sun",
  mercury: "Mercury",
  venus: "Venus",
  earth: "Earth",
  moon: "Moon",
  mars: "Mars",
  phobos: "Phobos",
  deimos: "Deimos",
  jupiter: "Jupiter",
  io: "Io",
  europa: "Europa",
  ganymede: "Ganymede",
  callisto: "Callisto",
  himalia: "Himalia",
  pasiphae: "Pasiphae",
  sinope: "Sinope",
  saturn: "Saturn",
  mimas: "Mimas",
  enceladus: "Enceladus",
  tethys: "Tethys",
  dione: "Dione",
  rhea: "Rhea",
  titan: "Titan",
  iapetus: "Iapetus",
  uranus: "Uranus",
  neptune: "Neptune",
  triton: "Triton",
};

const state = {
  simDate: new Date(),
  timeScale: Number(ui.timeScale.value),
  timePaused: false,
  moveSpeed: Number(ui.moveSpeed.value),
  selectedBodyId: "earth",
  showLabels: true,
  yaw: -0.3,
  pitch: -0.1,
  dragging: false,
  boost: 1,
  autopilot: null,
  landed: null,
  movement: { forward: 0, right: 0, up: 0 },
  touch: {
    active: false,
    moved: false,
    lastX: 0,
    lastY: 0,
    lastTapX: 0,
    lastTapY: 0,
    pinchDistance: 0,
  },
  mobileHudCollapsed: false,
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tempVec = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const cameraEuler = new THREE.Euler(0, 0, 0, "YXZ");
const wheelDirection = new THREE.Vector3();
const labelUpDirection = new THREE.Vector3();
const labelRightDirection = new THREE.Vector3();
const bodyMap = new Map();
const clickable = [];
const skyMarkers = new Map();
const mobilePadButtons = Array.from(document.querySelectorAll(".flight-key"));
let lastFrameTime = performance.now();

for (const def of bodyDefs) {
  const mesh = createBodyMesh(def);
  mesh.userData.bodyId = def.id;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  root.add(pivot);

  const label = createBodyLabel(def.name, englishNames[def.id] || def.name);
  label.position.y = def.id === "sun" ? 16 : getVisualRadius(def) + 0.7;
  pivot.add(label);

  if (def.id === "sun") {
    const glow = createSunGlow();
    glow.scale.setScalar(44);
    mesh.add(glow);
  }
  if (def.id === "saturn") {
    mesh.add(createSaturnRing(getVisualRadius(def)));
  }

  if (def.id !== "earth") {
    const markerColor = def.id === "sun" ? "#ffd36f" : def.orbit?.kind === "planet" ? "#7fd7ff" : "#d8e0ff";
    const marker = createSkyMarker(def.name, markerColor);
    marker.visible = false;
    scene.add(marker);
    skyMarkers.set(def.id, marker);
  }

  const body = { ...def, pivot, mesh, label, worldPosition: new THREE.Vector3() };
  bodyMap.set(def.id, body);
  clickable.push(mesh);
}

for (const body of bodyMap.values()) {
  if (body.id === "sun") continue;
  const orbitLine = createOrbitLine(body, bodyMap);
  body.orbitLine = orbitLine;
  if (body.orbit.kind === "planet") root.add(orbitLine);
  else bodyMap.get(body.parent).pivot.add(orbitLine);
}

for (const def of bodyDefs) {
  const option = document.createElement("option");
  option.value = def.id;
  option.textContent = def.name;
  ui.bodySelect.appendChild(option);
}

window.addEventListener("resize", onResize);
window.addEventListener("keydown", onKey);
window.addEventListener("keyup", onKey);
renderer.domElement.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", () => { state.dragging = false; });
renderer.domElement.addEventListener("click", onClickSelect);
renderer.domElement.addEventListener("wheel", onWheelMove, { passive: false });
renderer.domElement.addEventListener("contextmenu", onContextMenu);
renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: false });
renderer.domElement.addEventListener("touchcancel", onTouchEnd, { passive: false });
document.addEventListener("pointerlockchange", updateCursorHint);
ui.mobileHudToggle?.addEventListener("click", toggleMobileHud);

for (const button of mobilePadButtons) {
  button.addEventListener("pointerdown", onMobilePadPress);
  button.addEventListener("pointerup", onMobilePadRelease);
  button.addEventListener("pointerleave", onMobilePadRelease);
  button.addEventListener("pointercancel", onMobilePadRelease);
}

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
ui.nowBtn.addEventListener("click", () => { state.simDate = new Date(); syncDateInput(); });
ui.bodySelect.addEventListener("change", () => setSelectedBody(ui.bodySelect.value));
ui.focusBtn.addEventListener("click", () => startAutopilot(state.selectedBodyId, false));
ui.landBtn.addEventListener("click", () => startAutopilot(state.selectedBodyId, true));
ui.toggleLabelsBtn.addEventListener("click", () => { state.showLabels = !state.showLabels; updateLabelVisibility(); });
ui.resetCameraBtn.addEventListener("click", resetCamera);

resetCamera();
syncDateInput();
setSelectedBody(state.selectedBodyId);
updateCursorHint();
updateLabelVisibility();
animate();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.033);
  lastFrameTime = now;
  if (!state.timePaused) {
    state.simDate = new Date(state.simDate.getTime() + delta * 86400000 * state.timeScale * 0.02);
    syncDateInput();
  }
  updateBodies(delta);
  updateAutopilot(delta);
  updateLandedState();
  updateSkyMarkers();
  updateManualFlight(delta);
  updateBodyLabels();
  updateInfoPanel();
  camera.rotation.order = "YXZ";
  camera.rotation.y = state.yaw;
  camera.rotation.x = state.pitch;
  renderer.render(scene, camera);
}

function updateBodies(delta) {
  const jd = toJulianDate(state.simDate);
  for (const body of bodyMap.values()) {
    let position = new THREE.Vector3();
    if (body.id === "sun") position.set(0, 0, 0);
    else if (body.orbit.kind === "planet") position.copy(getPlanetDisplayPosition(body.id, jd));
    else position.copy(bodyMap.get(body.parent).worldPosition).add(getMoonOffset(body, jd, bodyMap.get(body.parent)));
    body.worldPosition.copy(position);
    body.pivot.position.copy(position);
    body.mesh.rotation.y += (24 / Math.abs(body.rotationHours || 200)) * 0.4 * delta * (body.rotationHours < 0 ? -1 : 1);
  }
  sunLight.position.copy(bodyMap.get("sun").worldPosition);
}

function updateBodyLabels() {
  labelUpDirection.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  labelRightDirection.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();

  for (const body of bodyMap.values()) {
    const distance = camera.position.distanceTo(body.worldPosition);
    const radius = getVisualRadius(body);
    const scaleFactor = THREE.MathUtils.clamp(0.38 + Math.pow(distance + 1, 0.34) * 0.2, 0.5, 2.4);
    const verticalOffset = radius + 1.1 + scaleFactor * 1.6 + Math.min(distance * 0.018, 8);
    const sideOffset = Math.min(radius * 0.22 + scaleFactor * 0.32, body.id === "sun" ? 3.2 : 2.1);

    body.label.scale.set(15.5 * scaleFactor, 4.35 * scaleFactor, 1);
    body.label.position.copy(labelUpDirection).multiplyScalar(verticalOffset).addScaledVector(labelRightDirection, sideOffset);
    body.label.quaternion.copy(camera.quaternion);
  }
}

function updateSkyMarkers() {
  const landedBodyId = state.landed?.bodyId;
  for (const [id, marker] of skyMarkers.entries()) {
    marker.visible = false;
    if (!landedBodyId || landedBodyId !== "earth") continue;
    const observer = bodyMap.get("earth");
    const target = bodyMap.get(id);
    const normal = state.landed.normal.clone().normalize();
    const direction = target.worldPosition.clone().sub(observer.worldPosition).normalize();
    const altitude = direction.dot(normal);
    if (altitude < -0.15) continue;
    marker.visible = true;
    const skyPos = camera.position.clone().add(direction.multiplyScalar(180));
    marker.position.copy(skyPos);
    marker.quaternion.copy(camera.quaternion);
    marker.scale.setScalar(id === "sun" ? 18 : target.orbit?.kind === "planet" ? 12 : 10);
  }
}

function updateManualFlight(delta) {
  if (state.autopilot) return;
  const direction = new THREE.Vector3(state.movement.right, state.movement.up, state.movement.forward);
  if (direction.lengthSq() === 0) return;
  if (state.landed) state.landed = null;
  direction.normalize().multiplyScalar(delta * state.moveSpeed * state.boost);
  cameraEuler.set(state.pitch, state.yaw, 0);
  tempQuat.setFromEuler(cameraEuler);
  direction.applyQuaternion(tempQuat);
  camera.position.add(direction);
}

function updateAutopilot(delta) {
  if (!state.autopilot) return;
  state.autopilot.t = Math.min(1, state.autopilot.t + delta / state.autopilot.duration);
  const eased = 1 - Math.pow(1 - state.autopilot.t, 3);
  camera.position.lerpVectors(state.autopilot.from, state.autopilot.to, eased);
  const body = bodyMap.get(state.autopilot.bodyId);
  const lookDir = tempVec.copy(body.worldPosition).sub(camera.position).normalize();
  state.yaw = Math.atan2(-lookDir.x, -lookDir.z);
  state.pitch = Math.asin(lookDir.y);
  if (state.autopilot.t >= 1) {
    if (state.autopilot.land) state.landed = { bodyId: body.id, normal: camera.position.clone().sub(body.worldPosition).normalize() };
    state.autopilot = null;
  }
}

function updateLandedState() {
  if (!state.landed || state.autopilot) return;
  const body = bodyMap.get(state.landed.bodyId);
  camera.position.copy(body.worldPosition).add(state.landed.normal.clone().multiplyScalar(getLandingRadius(body)));
}

function startAutopilot(bodyId, land) {
  const body = bodyMap.get(bodyId);
  if (land && body.id === "sun") return;
  const offset = land
    ? new THREE.Vector3(0, getVisualRadius(body) * 0.15, getLandingRadius(body))
    : new THREE.Vector3(getVisualRadius(body) * 4.5 + 1, getVisualRadius(body) * 1.4 + 0.5, getVisualRadius(body) * 6.2 + 1.2);
  state.autopilot = { bodyId, from: camera.position.clone(), to: body.worldPosition.clone().add(offset), t: 0, duration: land ? 2.8 : 2.2, land };
  state.landed = null;
}

function setSelectedBody(id) {
  state.selectedBodyId = id;
  ui.bodySelect.value = id;
  for (const body of bodyMap.values()) {
    if (body.id !== "sun" && body.mesh.material.emissive) body.mesh.material.emissive = new THREE.Color(body.id === id ? "#7fcfff" : "#000000");
    if (body.mesh.material.emissiveIntensity !== undefined) body.mesh.material.emissiveIntensity = body.id === "sun" ? 2.6 : body.id === id ? 0.02 : 0;
    if (body.orbitLine) {
      const baseColor = body.orbit.kind === "planet" ? "#ffca74" : "#74c9ff";
      body.orbitLine.material.opacity = body.id === id ? 0.86 : body.orbit.kind === "planet" ? 0.28 : 0.2;
      body.orbitLine.material.color.set(body.id === id ? "#ffffff" : baseColor);
    }
  }
}

function updateLabelVisibility() {
  for (const body of bodyMap.values()) body.label.visible = state.showLabels;
  ui.toggleLabelsBtn.textContent = state.showLabels ? "隐藏名称" : "显示名称";
}

function updateCursorHint() {
  const locked = document.pointerLockElement === renderer.domElement;
  ui.cursorHint.classList.toggle("is-active", locked);
  if (isTouchDevice) {
    ui.cursorHint.innerHTML = "<strong>移动端触控：</strong>单指旋转视角，双指捏合负责前后移动，方向键控制 AD / RF，轻点天体即可选中。";
    return;
  }
  ui.cursorHint.innerHTML = locked
    ? "<strong>飞行视角已锁定：</strong>移动鼠标可转向，滚轮前后移动，右键或 Esc 退出锁定。"
    : "<strong>鼠标未锁定：</strong>点击右侧宇宙画面后即可隐藏光标并自由观察，右键或 Esc 恢复光标。";
}

function updateInfoPanel() {
  const body = bodyMap.get(state.selectedBodyId);
  let extra = "";
  if (body.id === "moon") {
    const earth = bodyMap.get("earth");
    const sun = bodyMap.get("sun");
    const sunDir = sun.worldPosition.clone().sub(body.worldPosition).normalize();
    const earthDir = earth.worldPosition.clone().sub(body.worldPosition).normalize();
    const phaseAngle = sunDir.angleTo(earthDir);
    const illuminated = (1 + Math.cos(phaseAngle)) / 2;
    extra = ` 月面受光约 ${(illuminated * 100).toFixed(0)}%，可呈现从月牙到满月的变化。`;
  }
  if (state.landed?.bodyId === "earth") {
    extra += " 当前处于地表观测模式，天空指示会帮助你定位太阳和其他行星。";
  }
  ui.infoName.textContent = body.name;
  ui.infoText.textContent = `${body.description} 当前模拟时间：${state.simDate.toLocaleString("zh-CN", { hour12: false })}。半径 ${body.radiusKm.toLocaleString("zh-CN")} km。${extra}`;
}

function resetCamera() {
  camera.position.set(-30, 10, 120);
  state.yaw = -0.3;
  state.pitch = -0.1;
  state.autopilot = null;
  state.landed = null;
}

function toggleMobileHud() {
  if (!isTouchDevice) return;
  state.mobileHudCollapsed = !state.mobileHudCollapsed;
  ui.hud.classList.toggle("is-collapsed", state.mobileHudCollapsed);
  ui.mobileHudToggle.textContent = state.mobileHudCollapsed ? "展开面板" : "收起面板";
  ui.mobileHudToggle.setAttribute("aria-expanded", String(!state.mobileHudCollapsed));
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
}

function onPointerDown(event) {
  if (isTouchDevice) return;
  if (event.target !== renderer.domElement) return;
  if (event.button === 2) {
    document.exitPointerLock?.();
    return;
  }
  state.dragging = true;
  if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.();
}

function onPointerMove(event) {
  if (isTouchDevice) return;
  if (!state.dragging && document.pointerLockElement !== renderer.domElement) return;
  state.yaw -= event.movementX * 0.003;
  state.pitch -= event.movementY * 0.0024;
  state.pitch = THREE.MathUtils.clamp(state.pitch, -Math.PI / 2 + 0.03, Math.PI / 2 - 0.03);
}

function onClickSelect(event) {
  onScreenSelect(event.clientX, event.clientY);
}

function onWheelMove(event) {
  event.preventDefault();
  moveForwardBy((event.deltaY > 0 ? -1 : 1) * Math.max(0.8, state.moveSpeed * 0.35));
}

function onContextMenu(event) {
  event.preventDefault();
  document.exitPointerLock?.();
}

function onTouchStart(event) {
  if (!isTouchDevice || event.target !== renderer.domElement) return;
  event.preventDefault();
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    state.touch.active = true;
    state.touch.moved = false;
    state.touch.lastX = touch.clientX;
    state.touch.lastY = touch.clientY;
    state.touch.lastTapX = touch.clientX;
    state.touch.lastTapY = touch.clientY;
  } else if (event.touches.length >= 2) {
    state.touch.active = false;
    state.touch.moved = true;
    state.touch.pinchDistance = getTouchDistance(event.touches[0], event.touches[1]);
  }
}

function onTouchMove(event) {
  if (!isTouchDevice || event.target !== renderer.domElement) return;
  event.preventDefault();
  if (event.touches.length === 1 && state.touch.active) {
    const touch = event.touches[0];
    const dx = touch.clientX - state.touch.lastX;
    const dy = touch.clientY - state.touch.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.touch.moved = true;
    state.yaw -= dx * 0.0052;
    state.pitch -= dy * 0.0042;
    state.pitch = THREE.MathUtils.clamp(state.pitch, -Math.PI / 2 + 0.03, Math.PI / 2 - 0.03);
    state.touch.lastX = touch.clientX;
    state.touch.lastY = touch.clientY;
  } else if (event.touches.length >= 2) {
    const nextDistance = getTouchDistance(event.touches[0], event.touches[1]);
    const delta = nextDistance - state.touch.pinchDistance;
    if (Math.abs(delta) > 1) {
      moveForwardBy(delta * 0.12);
      state.touch.moved = true;
    }
    state.touch.pinchDistance = nextDistance;
  }
}

function onTouchEnd(event) {
  if (!isTouchDevice) return;
  event.preventDefault();
  if (event.touches.length >= 2) {
    state.touch.active = false;
    state.touch.pinchDistance = getTouchDistance(event.touches[0], event.touches[1]);
    return;
  }
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    state.touch.active = true;
    state.touch.lastX = touch.clientX;
    state.touch.lastY = touch.clientY;
    state.touch.pinchDistance = 0;
    return;
  }
  if (!state.touch.moved) {
    onScreenSelect(state.touch.lastTapX, state.touch.lastTapY);
  }
  state.touch.active = false;
  state.touch.pinchDistance = 0;
}

function onMobilePadPress(event) {
  if (!isTouchDevice) return;
  event.preventDefault();
  const button = event.currentTarget;
  const axis = button.dataset.moveAxis;
  const value = Number(button.dataset.moveValue);
  if (!axis || Number.isNaN(value)) return;
  button.classList.add("is-active");
  state.movement[axis] = value;
}

function onMobilePadRelease(event) {
  if (!isTouchDevice) return;
  const button = event.currentTarget;
  const axis = button.dataset.moveAxis;
  const value = Number(button.dataset.moveValue);
  button.classList.remove("is-active");
  if (!axis || Number.isNaN(value)) return;
  if (state.movement[axis] === value) state.movement[axis] = 0;
}

function getTouchDistance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function moveForwardBy(amount) {
  cameraEuler.set(state.pitch, state.yaw, 0);
  wheelDirection.set(0, 0, amount < 0 ? 1 : -1).applyQuaternion(tempQuat.setFromEuler(cameraEuler));
  if (state.landed) state.landed = null;
  camera.position.add(wheelDirection.multiplyScalar(Math.max(0.6, Math.abs(amount))));
}

function onScreenSelect(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  if (hits.length) setSelectedBody(hits[0].object.userData.bodyId);
}

function syncDateInput() {
  const local = new Date(state.simDate.getTime() - state.simDate.getTimezoneOffset() * 60000);
  ui.dateInput.value = local.toISOString().slice(0, 16);
}



