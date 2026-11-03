import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export { mergeGeometries };

/** Deterministic pseudo random generator so the city is the same every visit. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const up = new THREE.Vector3(0, 1, 0);

/** Thin box spanning from a to b. */
export function beam(a: THREE.Vector3, b: THREE.Vector3, thickness: number) {
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(thickness, len, thickness);
  const q = new THREE.Quaternion().setFromUnitVectors(
    up,
    b.clone().sub(a).normalize(),
  );
  const m = new THREE.Matrix4().compose(
    a.clone().add(b).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(m);
  return g;
}

/** Strip non-position/normal/uv attributes & indices so geometries merge cleanly. */
export function clean(g: THREE.BufferGeometry) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const key of Object.keys(n.attributes)) {
    if (!["position", "normal", "uv"].includes(key)) n.deleteAttribute(key);
  }
  if (!n.attributes.uv) {
    n.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2),
    );
  }
  return n;
}

export function merge(list: THREE.BufferGeometry[]) {
  const m = mergeGeometries(list.map(clean), false);
  list.forEach((g) => g.dispose());
  return m ?? new THREE.BufferGeometry();
}

/** Adds a constant per-vertex color to a geometry. */
export function tint(g: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

export function mergeColored(list: THREE.BufferGeometry[]) {
  const prepared = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const key of Object.keys(n.attributes)) {
      if (!["position", "normal", "uv", "color"].includes(key)) n.deleteAttribute(key);
    }
    if (!n.attributes.uv) {
      n.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2),
      );
    }
    return n;
  });
  return mergeGeometries(prepared, false) ?? new THREE.BufferGeometry();
}

let windowTex: THREE.CanvasTexture | null = null;

/** Facade texture: a wall tile with one window, repeated across buildings. */
export function getWindowTexture() {
  if (windowTex) return windowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 128, 128);
  // ledge
  ctx.fillStyle = "#e9dede";
  ctx.fillRect(0, 118, 128, 10);
  // frame
  ctx.fillStyle = "#d8c8c8";
  ctx.fillRect(34, 22, 60, 86);
  // glass
  const grad = ctx.createLinearGradient(0, 26, 0, 104);
  grad.addColorStop(0, "#6b5a6e");
  grad.addColorStop(1, "#8f7286");
  ctx.fillStyle = grad;
  ctx.fillRect(40, 28, 48, 74);
  ctx.fillStyle = "#d8c8c8";
  ctx.fillRect(62, 28, 4, 74);
  ctx.fillRect(40, 60, 48, 3);
  windowTex = new THREE.CanvasTexture(c);
  windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
  windowTex.colorSpace = THREE.SRGBColorSpace;
  windowTex.anisotropy = 4;
  return windowTex;
}

let cloudUrl: string | null = null;

/** Soft puff sprite for drei <Clouds>, generated so nothing is fetched. */
export function getCloudTextureUrl() {
  if (cloudUrl) return cloudUrl;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const r = rng(7);
  for (let i = 0; i < 26; i++) {
    const x = 128 + (r() - 0.5) * 110;
    const y = 128 + (r() - 0.5) * 80;
    const rad = 40 + r() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  cloudUrl = c.toDataURL("image/png");
  return cloudUrl;
}
