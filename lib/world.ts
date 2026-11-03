import * as THREE from "three";
import { T, clamp } from "./timeline";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ── Key places in the world ────────────────────────────────────────────────
export const WATER_Y = -1.6;
export const RIVER = { halfWidth: 12, zStart: 70, zEnd: -75 };
export const BRIDGE_Z = -50;
export const TOWER = v(0, 0, -122);
export const HERO_SPOT = v(14.8, 0, 15);
export const ABOUT_SPOT = v(3.2, 0, -108);
export const WHEEL = v(-30, 0, -148);
export const STATUE = v(0, 0, -345);
export const CARDS = { y: 112, z: -390 };
export const PLAZA = v(600, 0, -600);

// Road the scooter rides on (also drawn as a ribbon).
export const ROAD = new THREE.CatmullRomCurve3(
  [
    v(0, 0, -80),
    v(1.5, 0, -100),
    v(1.5, 0, -125),
    v(-6, 0, -168),
    v(6, 0, -212),
    v(-5, 0, -258),
    v(0, 0, -296),
    v(0, 0, -318),
  ],
  false,
  "centripetal",
);

function closestU(curve: THREE.Curve<THREE.Vector3>, z: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 2000; i++) {
    const u = i / 2000;
    const d = Math.abs(curve.getPointAt(u).z - z);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

export const RIDE_U0 = closestU(ROAD, ABOUT_SPOT.z);
export const RIDE_U1 = 0.985;

/** Scooter position/heading along the road for a global progress value. */
export function rideAt(progress: number) {
  const f = clamp((progress - T.ride[0]) / (T.ride[1] - T.ride[0]));
  const eased = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  const u = RIDE_U0 + (RIDE_U1 - RIDE_U0) * eased;
  const pos = ROAD.getPointAt(u);
  const tan = ROAD.getTangentAt(u);
  return { pos, tan, f };
}

// ── Camera path ───────────────────────────────────────────────────────────
type Key = { t: number; pos: THREE.Vector3; look: THREE.Vector3 };

function rideKeys(): Key[] {
  const keys: Key[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = T.ride[0] + ((T.ride[1] - T.ride[0]) * i) / n;
    const { pos, tan } = rideAt(t);
    keys.push({
      t,
      pos: pos.clone().addScaledVector(tan, -8).add(v(0, 3.2, 0)),
      look: pos.clone().addScaledVector(tan, 12).add(v(0, 1.8, 0)),
    });
  }
  return keys;
}

const P = PLAZA;
const C = CARDS;

const chapterOne: Key[] = [
  { t: 0.0, pos: v(13, 2.5, 21.5), look: v(2, 5, -60) },
  { t: 0.06, pos: v(8, 2.2, 6), look: v(0, 4, -60) },
  { t: 0.1, pos: v(0.5, 1.6, -8), look: v(0, 3.5, -60) },
  { t: 0.15, pos: v(0, 1.3, -30), look: v(0, 2.6, -70) },
  { t: 0.19, pos: v(0, 1.3, -53), look: v(0, 2.8, -90) },
  { t: 0.23, pos: v(0, 4.5, -66), look: v(0, 3, -86) },
  { t: 0.26, pos: v(0, 10, -80), look: v(0, 4, -106) },
  { t: 0.29, pos: v(0.4, 4, -96.5), look: v(1.2, 4, -112) },
  { t: 0.38, pos: v(0.8, 3.8, -98), look: v(1.5, 3.9, -112) },
  ...rideKeys(),
  { t: 0.645, pos: v(0, 9, -300), look: v(0, 34, -345) },
  { t: 0.665, pos: v(0, 60, -318), look: v(0, 80, -360) },
  { t: 0.69, pos: v(-26, C.y + 1, C.z + 24), look: v(-26, C.y, C.z) },
  { t: 0.78, pos: v(26, C.y + 1, C.z + 24), look: v(26, C.y, C.z) },
  { t: 0.812, pos: v(26, C.y + 40, C.z + 18), look: v(26, C.y + 10, C.z) },
];

const chapterTwo: Key[] = [
  { t: 0.812, pos: v(P.x, 330, P.z + 18), look: v(P.x, 290, P.z - 2) },
  { t: 0.86, pos: v(P.x, 205, P.z + 16), look: v(P.x, 168, P.z - 4) },
  { t: 0.9, pos: v(P.x, 70, P.z + 70), look: v(P.x, 6, P.z - 10) },
  { t: 0.95, pos: v(P.x, 12, P.z + 40), look: v(P.x, 10, P.z - 10) },
  { t: 1.0, pos: v(P.x, 6.5, P.z + 24), look: v(P.x, 8.5, P.z - 12) },
];

function makeChapter(keys: Key[]) {
  return {
    keys,
    pos: new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, "centripetal"),
    look: new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, "centripetal"),
  };
}

const chapters = [makeChapter(chapterOne), makeChapter(chapterTwo)];

export function cameraAt(t: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const ch = t < chapterTwo[0].t ? chapters[0] : chapters[1];
  const k = ch.keys;
  let i = 0;
  while (i < k.length - 2 && t > k[i + 1].t) i++;
  const local = clamp((t - k[i].t) / (k[i + 1].t - k[i].t));
  const u = (i + local) / (k.length - 1);
  ch.pos.getPoint(u, outPos);
  ch.look.getPoint(u, outLook);
}
