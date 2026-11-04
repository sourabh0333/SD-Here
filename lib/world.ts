import * as THREE from "three";
import { T, clamp } from "./timeline";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ── Key places in the world ────────────────────────────────────────────────
export const STREET_Y = 0;
export const BERGE_Y = -1.6; // lower riverside walkway
export const WATER_Y = -2.4;
export const RIVER = { halfWidth: 12, berge: 19, zStart: 80, zEnd: -75 };
export const BRIDGE_Z = -50;
export const BASTION = v(16, 0, 15); // round viewing platform of the hero shot
export const HERO_SPOT = v(17.0, 0, 17.0);
export const HERO_LAMP = v(17.85, 0, 16.2);
export const TOWER = v(0, 0, -122);
export const ABOUT_SPOT = v(3.2, 0, -108);
export const WHEEL = v(-30, 0, -148);
export const GATE_Z = -200;
export const PASSAGE = { z0: -214, z1: -238 };
export const MYWORK = v(-9, 0, -284);
export const CATHEDRAL = v(-34, 0, -318);
export const VIADUCT_Z = -312;
export const OBELISK = v(0, 0, -400);
export const OBELISK_H = 30;
export const CARDS = { y: 122, z: -440 };
export const PLAZA = v(600, 0, -600);
export const ROOM = { z: -66, depth: 22, floor: 10.5, height: 5.6, halfWidth: 6 };

// Road the scooter rides on (also drawn as a ribbon).
export const ROAD = new THREE.CatmullRomCurve3(
  [
    v(0, 0, -80),
    v(1.5, 0, -100),
    v(1.5, 0, -125),
    v(-5, 0, -160),
    v(0, 0, -190),
    v(0, 0, -212),
    v(0, 0, -240),
    v(4, 0, -260),
    v(9, 0, -282),
    v(6, 0, -308),
    v(-4, 0, -340),
    v(0, 0, -368),
    v(0, 0, -384),
  ],
  false,
  "centripetal",
);

function closestU(curve: THREE.Curve<THREE.Vector3>, z: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 3000; i++) {
    const u = i / 3000;
    const d = Math.abs(curve.getPointAt(u).z - z);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

export const RIDE_U0 = closestU(ROAD, ABOUT_SPOT.z);
export const RIDE_U1 = 0.97;

/** Scooter position/heading along the road for a global progress value. */
export function rideAt(progress: number) {
  const f = clamp((progress - T.ride[0]) / (T.ride[1] - T.ride[0]));
  const eased = f * f * (3 - 2 * f) * 0.3 + f * 0.7;
  const u = RIDE_U0 + (RIDE_U1 - RIDE_U0) * eased;
  const pos = ROAD.getPointAt(u);
  const tan = ROAD.getTangentAt(u);
  return { pos, tan, f };
}

// ── Camera path ───────────────────────────────────────────────────────────
type Key = { t: number; pos: THREE.Vector3; look: THREE.Vector3 };

function rideKeys(): Key[] {
  const keys: Key[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = T.ride[0] + ((T.ride[1] - T.ride[0]) * i) / n;
    const { pos, tan } = rideAt(t);
    keys.push({
      t,
      pos: pos.clone().addScaledVector(tan, -7.5).add(v(0, 3, 0)),
      look: pos.clone().addScaledVector(tan, 12).add(v(0, 2, 0)),
    });
  }
  return keys;
}

const P = PLAZA;
const C = CARDS;
const O = OBELISK;

const chapterOne: Key[] = [
  { t: 0.0, pos: v(16.2, 2.35, 23.5), look: v(-4, 6, -60) },
  { t: 0.03, pos: v(16.4, 2.3, 21), look: v(-3, 5.5, -60) },
  { t: 0.05, pos: v(15.2, 2.0, 15.5), look: v(-1, 3.5, -60) },
  { t: 0.07, pos: v(9, 0.0, 3), look: v(0, 2.2, -60) },
  { t: 0.1, pos: v(1, -0.6, -14), look: v(0, 1.8, -70) },
  { t: 0.135, pos: v(0, -0.6, -32), look: v(0, 1.4, -75) },
  { t: 0.162, pos: v(0, -0.3, -44), look: v(0, 0.6, -90) },
  { t: 0.178, pos: v(0, 0.5, -50.5), look: v(0, 1.0, -90) },
  { t: 0.19, pos: v(0, 1.6, -58), look: v(0, 2.0, -90) },
  { t: 0.212, pos: v(0, 2.6, -70), look: v(0, 2.6, -95) },
  { t: 0.232, pos: v(0, 7.2, -83), look: v(0, 3, -104) },
  { t: 0.25, pos: v(0.4, 4.0, -96.5), look: v(1.2, 4.0, -112) },
  { t: 0.36, pos: v(0.8, 3.8, -98), look: v(1.5, 3.9, -112) },
  ...rideKeys(),
  { t: 0.615, pos: v(0, 5, O.z + 28), look: v(0, 22, O.z) },
  { t: 0.635, pos: v(0, 24, O.z + 13), look: v(0, O.y + OBELISK_H + 3, O.z) },
  { t: 0.65, pos: v(0, OBELISK_H + 4.6, O.z + 6.5), look: v(0, OBELISK_H + 5, O.z) },
  { t: 0.665, pos: v(0, 70, O.z + 4), look: v(0, 95, O.z - 30) },
  { t: 0.69, pos: v(-24, C.y + 1.5, C.z + 34), look: v(-24, C.y - 1.5, C.z) },
  { t: 0.765, pos: v(24, C.y + 1.5, C.z + 34), look: v(24, C.y - 1.5, C.z) },
  { t: 0.786, pos: v(26, C.y + 40, C.z + 18), look: v(26, C.y + 10, C.z) },
];

const chapterTwo: Key[] = [
  { t: 0.786, pos: v(P.x, 330, P.z + 18), look: v(P.x, 290, P.z - 2) },
  { t: 0.83, pos: v(P.x, 210, P.z + 16), look: v(P.x, 170, P.z - 4) },
  { t: 0.858, pos: v(P.x, 125, P.z + 22), look: v(P.x, 0, P.z - 8) },
  { t: 0.878, pos: v(P.x, 62, P.z + 66), look: v(P.x, 5, P.z - 10) },
  { t: 0.905, pos: v(P.x, 12, P.z + 40), look: v(P.x, 10, P.z - 10) },
  { t: 0.935, pos: v(P.x, 6.5, P.z + 24), look: v(P.x, 8.5, P.z - 12) },
  { t: 0.95, pos: v(P.x, 7.5, P.z + 19), look: v(P.x, 10, P.z - 12) },
  { t: 0.962, pos: v(P.x + 5, 8.5, P.z - 8), look: v(P.x + 1, 11, P.z - 40) },
  { t: 0.972, pos: v(P.x + 1.5, 11.5, P.z - 38), look: v(P.x, 13, P.z - 70) },
  { t: 0.982, pos: v(P.x, 13, P.z + ROOM.z + 5), look: v(P.x, 13, P.z - 85) },
  { t: 0.992, pos: v(P.x, 13, P.z + ROOM.z - 3.5), look: v(P.x, 13, P.z - 86) },
  { t: 1.0, pos: v(P.x, 12.8, P.z + ROOM.z - 6), look: v(P.x, 12.9, P.z - 88) },
];

function makeChapter(keys: Key[]) {
  return {
    keys,
    pos: new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, "centripetal"),
    look: new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, "centripetal"),
  };
}

const chapters = [makeChapter(chapterOne), makeChapter(chapterTwo)];
export const CUT_T = chapterTwo[0].t;

export function cameraAt(t: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const ch = t < CUT_T ? chapters[0] : chapters[1];
  const k = ch.keys;
  let i = 0;
  while (i < k.length - 2 && t > k[i + 1].t) i++;
  const local = clamp((t - k[i].t) / (k[i + 1].t - k[i].t));
  const u = (i + local) / (k.length - 1);
  ch.pos.getPoint(u, outPos);
  ch.look.getPoint(u, outLook);
}
