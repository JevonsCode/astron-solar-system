import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { textureSources } from "../data/solar-data.js";
import { getMoonOffsetAtAngle, getPlanetDisplayPosition, getPlanetOrbitalPeriodDays, getVisualRadius } from "../core/astronomy.js";

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");

export function createBodyMesh(def) {
  const radius = getVisualRadius(def);
  const geometry = new THREE.SphereGeometry(radius, def.id === "sun" ? 64 : 48, def.id === "sun" ? 64 : 48);
  const fallbackTexture = createFallbackTexture(def);

  let material;
  if (def.id === "sun") {
    material = new THREE.MeshStandardMaterial({
      map: null,
      emissiveMap: fallbackTexture,
      roughness: 0.98,
      metalness: 0.02,
      emissive: new THREE.Color("#ffb347"),
      emissiveIntensity: 2.6,
    });
  } else if (def.type === "earth") {
    material = new THREE.MeshStandardMaterial({
      map: fallbackTexture,
      color: new THREE.Color("#ffffff"),
      roughness: 0.96,
      metalness: 0,
      emissive: new THREE.Color("#0a1220"),
      emissiveIntensity: 0.018,
    });
  } else {
    material = new THREE.MeshPhongMaterial({
      map: fallbackTexture,
      shininess: def.type === "ice" ? 6 : 4,
      specular: new THREE.Color(def.type === "ice" ? "#28384d" : "#121212"),
      emissive: new THREE.Color("#000000"),
      emissiveIntensity: 0,
    });
  }

  const mesh = new THREE.Mesh(geometry, material);

  if (def.type === "earth" || def.type === "cloudy" || def.type === "hazy") {
    mesh.add(createAtmosphereShell(radius, def.type));
  }

  const textureUrl = textureSources[def.id];
  if (textureUrl && def.id !== "sun") {
    textureLoader.load(textureUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      material.map = texture;
      material.needsUpdate = true;
    });
  }

  return mesh;
}

export function createSkyMarker(text, color = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(8,12,20,0.55)";
  roundRect(ctx, 8, 12, 240, 72, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(36, 48, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#eef4ff";
  ctx.font = "600 22px Segoe UI";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 56, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
}

export function createBodyLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(8,16,32,0.84)");
  gradient.addColorStop(1, "rgba(20,42,70,0.62)");
  ctx.fillStyle = gradient;
  roundRect(ctx, 10, 20, 492, 96, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(130,215,255,0.36)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,214,111,0.94)";
  ctx.font = "600 18px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SOLAR BODY", 256, 48);
  ctx.fillStyle = "#ecf4ff";
  ctx.font = "700 32px Segoe UI";
  ctx.fillText(text, 256, 82);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(15.5, 4.35, 1);
  return sprite;
}

export function createStarField() {
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
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
}

export function createOrbitLine(body, bodyMap) {
  const samples = 320;
  const points = [];
  if (body.orbit.kind === "planet") {
    const period = getPlanetOrbitalPeriodDays(body.id);
    for (let i = 0; i <= samples; i += 1) {
      const jd = 2451545 + (i / samples) * period;
      points.push(getPlanetDisplayPosition(body.id, jd));
    }
  } else {
    const parent = bodyMap.get(body.parent);
    for (let i = 0; i <= samples; i += 1) {
      points.push(getMoonOffsetAtAngle(body, (i / samples) * Math.PI * 2, parent));
    }
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: body.orbit.kind === "planet" ? 0xffca74 : 0x74c9ff, transparent: true, opacity: body.orbit.kind === "planet" ? 0.28 : 0.2 });
  return new THREE.Line(geometry, material);
}

export function createSaturnRing(radius) {
  const inner = radius * 1.8;
  const outer = radius * 2.9;
  const count = 14000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const r = THREE.MathUtils.lerp(inner, outer, Math.pow(Math.random(), 0.76));
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 2] = Math.sin(a) * r;
    color.setHSL(0.11, 0.36, 0.62 + Math.random() * 0.16);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const ring = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.03, vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false }));
  ring.rotation.x = Math.PI / 2.7;
  return ring;
}

export function createSunGlow() {
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
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, color: 0xffb547, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
}

function createAtmosphereShell(radius, type) {
  const color = type === "earth" ? 0x7fd7ff : type === "cloudy" ? 0xffd29b : 0xffc56b;
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 48, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: type === "earth" ? 0.11 : type === "cloudy" ? 0.13 : 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
}

function createFallbackTexture(def) {
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
  const banded = def.type === "gas" || def.type === "gasBand" || def.type === "cloudy" || def.type === "iceGiant" || def.type === "hazy";
  const cratered = def.type === "rocky" || def.type === "rockyRed" || def.type === "volcanic" || def.type === "ice";
  if (banded) {
    for (let i = 0; i < 160; i += 1) {
      ctx.fillStyle = `hsla(${20 + rand() * 190},${30 + rand() * 45}%,${35 + rand() * 40}%,${0.05 + rand() * 0.16})`;
      ctx.fillRect(0, rand() * canvas.height, size, 4 + rand() * 24);
    }
  }
  if (cratered) {
    for (let i = 0; i < 320; i += 1) {
      const x = rand() * size;
      const y = rand() * canvas.height;
      const r = 2 + rand() * 24;
      ctx.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.16})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (def.type === "earth") {
    for (let i = 0; i < 36; i += 1) {
      ctx.fillStyle = `rgba(35, ${120 + Math.floor(rand() * 90)}, ${80 + Math.floor(rand() * 80)}, 0.9)`;
      ctx.beginPath();
      ctx.ellipse(rand() * size, rand() * canvas.height, 80 + rand() * 180, 30 + rand() * 120, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (def.id === "sun") {
    const base = ctx.createLinearGradient(0, 0, size, canvas.height);
    base.addColorStop(0, "#8f1f00");
    base.addColorStop(0.2, "#ff6a00");
    base.addColorStop(0.5, "#ffd35f");
    base.addColorStop(0.8, "#ff7f11");
    base.addColorStop(1, "#922100");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, canvas.height);
    for (let y = 0; y < canvas.height; y += 8) {
      ctx.fillStyle = `rgba(255, ${120 + Math.floor(rand() * 120)}, 0, ${0.04 + rand() * 0.08})`;
      ctx.fillRect(0, y, size, 2 + rand() * 6);
    }
    for (let i = 0; i < 420; i += 1) {
      const x = rand() * size;
      const y = rand() * canvas.height;
      const r = 12 + rand() * 64;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,220,${0.18 + rand() * 0.18})`);
      g.addColorStop(0.5, `rgba(255,170,40,${0.08 + rand() * 0.12})`);
      g.addColorStop(1, "rgba(255,120,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 140; i += 1) {
      ctx.fillStyle = `rgba(110,10,0,${0.05 + rand() * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(rand() * size, rand() * canvas.height, 8 + rand() * 26, 4 + rand() * 12, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
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


