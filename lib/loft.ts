import * as THREE from "three";
import raw from "./loft-stations.json";
import { clamp } from "./timeline";

/**
 * Camera choreography for the loft. Stations come from the Blender script
 * (scripts/blender/loft.py → stations.json, already converted to Y-up).
 * Scroll progress holds on each station, then flies along an eased path —
 * through the window, around the furniture and out of the balcony door.
 */

export type StationId = "hero" | "about" | "skills" | "experience" | "work" | "cases" | "contact";

type Raw = { pos: number[]; target: number[]; fov: number };
const S = raw as unknown as Record<StationId, Raw>;
const v = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);

export const STATIONS: { id: StationId; label: string; pos: THREE.Vector3; target: THREE.Vector3; fov: number }[] = [
  { id: "hero", label: "Home" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "work", label: "Work" },
  { id: "cases", label: "Case studies" },
  { id: "contact", label: "Contact" },
].map((s) => ({
  ...s,
  id: s.id as StationId,
  pos: v(S[s.id as StationId].pos),
  target: v(S[s.id as StationId].target),
  fov: S[s.id as StationId].fov,
}));

/** Extra points each flight passes through (Y-up world coordinates). */
const WAYPOINTS: Record<string, { pos: number[]; target?: number[] }[]> = {
  "hero>about": [
    { pos: [-1.0, 2.1, -6.6], target: [-2.0, 1.6, 0] },
    { pos: [-1.6, 1.8, -3.2], target: [-4.5, 1.2, 2.5] },
  ],
  "about>skills": [{ pos: [-1.2, 1.7, 1.2], target: [0, 1.6, 4] }],
  "skills>experience": [{ pos: [3.5, 1.7, 1.7], target: [4.5, 1.6, 5] }],
  "experience>work": [
    { pos: [3.0, 2.5, -0.6], target: [-2, 1.6, -3] },
    { pos: [-1.8, 2.1, -1.6], target: [-4.6, 1.2, -4.6] },
  ],
  "work>cases": [{ pos: [-4.8, 1.8, -2.3], target: [-7, 2, -3.6] }],
  "cases>contact": [
    { pos: [-1.0, 1.9, -1.2], target: [4, 1.6, -2.4] },
    { pos: [6.3, 1.6, -2.4], target: [12, 1.5, -2.4] },
    { pos: [8.9, 1.55, -2.0], target: [12, 1.4, -1] },
  ],
};

/** Relative scroll length of each hold and each flight. */
const HOLD = 1;
const FLIGHT: Record<string, number> = {
  "hero>about": 2.2,
  "about>skills": 1.4,
  "skills>experience": 1.2,
  "experience>work": 2.2,
  "work>cases": 1.0,
  "cases>contact": 2.2,
};

type Segment =
  | { kind: "hold"; from: number; to: number; station: number }
  | { kind: "fly"; from: number; to: number; a: number; b: number; pos: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3 };

const segments: Segment[] = [];
{
  const parts: { len: number; make: (from: number, to: number) => Segment }[] = [];
  STATIONS.forEach((st, i) => {
    parts.push({ len: i === 0 ? HOLD * 0.8 : HOLD, make: (from, to) => ({ kind: "hold", from, to, station: i }) });
    const next = STATIONS[i + 1];
    if (!next) return;
    const key = `${st.id}>${next.id}`;
    const wps = WAYPOINTS[key] ?? [];
    const pos = new THREE.CatmullRomCurve3([st.pos, ...wps.map((w) => v(w.pos)), next.pos], false, "centripetal", 0.5);
    const look = new THREE.CatmullRomCurve3(
      [st.target, ...wps.map((w) => v(w.target ?? w.pos)), next.target],
      false,
      "centripetal",
      0.5,
    );
    parts.push({
      len: FLIGHT[key] ?? 1.4,
      make: (from, to) => ({ kind: "fly", from, to, a: i, b: i + 1, pos, look }),
    });
  });
  const total = parts.reduce((s, p) => s + p.len, 0);
  let acc = 0;
  for (const p of parts) {
    const from = acc / total;
    acc += p.len;
    segments.push(p.make(from, acc / total));
  }
}

/** Progress value at the middle of a station's hold (for menus and shortcuts). */
export const STATION_AT: Record<StationId, number> = Object.fromEntries(
  segments
    .filter((s): s is Extract<Segment, { kind: "hold" }> => s.kind === "hold")
    .map((s) => [STATIONS[s.station].id, (s.from + s.to) / 2]),
) as Record<StationId, number>;
STATION_AT.hero = 0;
STATION_AT.contact = 1;

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export type CameraState = { station: number; settled: number; fov: number };

/**
 * Writes the camera position/target for scroll progress `t`.
 * Returns which station we're at and how "settled" the camera is (1 = holding).
 */
export function loftCamera(t: number, pos: THREE.Vector3, look: THREE.Vector3): CameraState {
  const seg = segments.find((s) => t <= s.to) ?? segments[segments.length - 1];
  if (seg.kind === "hold") {
    const st = STATIONS[seg.station];
    // a slow dolly while holding keeps the shot alive
    const k = clamp((t - seg.from) / (seg.to - seg.from || 1));
    const dir = look.copy(st.target).sub(st.pos).normalize();
    pos.copy(st.pos).addScaledVector(dir, (k - 0.5) * 0.25);
    look.copy(st.target);
    return { station: seg.station, settled: 1, fov: st.fov };
  }
  const k = ease(clamp((t - seg.from) / (seg.to - seg.from)));
  seg.pos.getPointAt(k, pos);
  seg.look.getPointAt(k, look);
  const fa = STATIONS[seg.a].fov;
  const fb = STATIONS[seg.b].fov;
  // how close we are to either end (for fading panels)
  const edge = Math.max(1 - clamp(k / 0.18), clamp((k - 0.82) / 0.18));
  return { station: k < 0.5 ? seg.a : seg.b, settled: edge, fov: fa + (fb - fa) * k };
}
