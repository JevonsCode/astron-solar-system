import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { DEG, orbitalElements, systemNodes, systemTilts } from "../data/solar-data.js";

export function toJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

export function normalizeDegrees(deg) {
  return ((deg % 360) + 360) % 360;
}

export function normalizeRadians(rad) {
  return ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

export function solveKepler(M, e) {
  let E = M;
  for (let i = 0; i < 8; i += 1) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

export function getPlanetPositionAU(id, jd) {
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
  const x = (cosO * cosW - sinO * sinW * cosI) * xPrime + (-cosO * sinW - sinO * cosW * cosI) * yPrime;
  const y = (sinO * cosW + cosO * sinW * cosI) * xPrime + (-sinO * sinW + cosO * cosW * cosI) * yPrime;
  const z = sinW * sinI * xPrime + cosW * sinI * yPrime;
  return new THREE.Vector3(x, z, y);
}

export function compressHeliocentricVector(vector) {
  const length = vector.length();
  if (length === 0) return new THREE.Vector3();
  const scaled = Math.pow(length, 0.72) * 95;
  return vector.clone().normalize().multiplyScalar(scaled);
}

export function getPlanetDisplayPosition(id, jd) {
  return compressHeliocentricVector(getPlanetPositionAU(id, jd));
}

export function getVisualRadius(body) {
  if (body.id === "sun") return 10.2;
  const earthReference = 0.72;
  const exactScaled = (body.radiusKm / 6371) * earthReference;
  if (exactScaled <= 2.6) {
    return Math.max(exactScaled, body.orbit?.kind === "moon" ? 0.08 : 0.18);
  }
  return 2.6 + Math.log2(exactScaled - 1.4) * 1.18;
}

export function getLandingRadius(body) {
  return getVisualRadius(body) * 1.18 + 0.05;
}

export function getMoonOrbitRadius(body, parent) {
  const trueLocalRadius = (body.orbit.distanceKm / parent.radiusKm) * getVisualRadius(parent);
  const softlyCompressed = trueLocalRadius <= 180 ? trueLocalRadius : 180 + Math.log1p(trueLocalRadius - 180) * 26;
  const minSafeDistance = getVisualRadius(parent) + getVisualRadius(body) + 0.12;
  return Math.max(softlyCompressed, minSafeDistance);
}

export function getMoonOffsetAtAngle(body, angle, parent) {
  const radius = getMoonOrbitRadius(body, parent);
  const inclination = body.orbit.inclinationDeg * DEG;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * Math.sin(inclination);
  const z = Math.sin(angle) * radius * Math.cos(inclination);
  const local = new THREE.Vector3(x, y, z);
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), systemNodes[body.parent] ?? 0);
  local.applyAxisAngle(new THREE.Vector3(1, 0, 0), systemTilts[body.parent] ?? 0);
  return local;
}

export function getMoonOffset(body, jd, parent) {
  const angle = ((jd - 2451545.0) / body.orbit.periodDays) * Math.PI * 2 + body.orbit.phaseDeg * DEG;
  return getMoonOffsetAtAngle(body, angle, parent);
}

export function getPlanetOrbitalPeriodDays(id) {
  return id === "earth" ? 365.256 : Math.sqrt(Math.pow(orbitalElements[id].a[0], 3)) * 365.256;
}
