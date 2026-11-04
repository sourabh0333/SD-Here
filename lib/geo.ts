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

let grain: { normal: THREE.CanvasTexture; rough: THREE.CanvasTexture } | null = null;

/**
 * Tileable surface detail (normal + roughness) generated from value noise.
 * Applied to stone, plaster and asphalt so large surfaces don't look flat.
 */
export function getGrain() {
  if (grain) return grain;
  const N = 256;
  const r = rng(11);
  const h = new Float32Array(N * N);
  // a few octaves of wrapped value noise + speckles
  for (const [cell, amp] of [
    [32, 0.5],
    [16, 0.3],
    [8, 0.15],
    [4, 0.08],
  ] as const) {
    const g = N / cell;
    const lattice = Array.from({ length: g * g }, () => r());
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const gx = x / cell;
        const gy = y / cell;
        const x0 = Math.floor(gx) % g;
        const y0 = Math.floor(gy) % g;
        const x1 = (x0 + 1) % g;
        const y1 = (y0 + 1) % g;
        const fx = gx - Math.floor(gx);
        const fy = gy - Math.floor(gy);
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const a = lattice[y0 * g + x0] * (1 - sx) + lattice[y0 * g + x1] * sx;
        const b = lattice[y1 * g + x0] * (1 - sx) + lattice[y1 * g + x1] * sx;
        h[y * N + x] += (a * (1 - sy) + b * sy) * amp;
      }
    }
  }
  for (let i = 0; i < N * N; i++) h[i] += (r() - 0.5) * 0.06;

  const nc = document.createElement("canvas");
  nc.width = nc.height = N;
  const rc = document.createElement("canvas");
  rc.width = rc.height = N;
  const nctx = nc.getContext("2d")!;
  const rctx = rc.getContext("2d")!;
  const nimg = nctx.createImageData(N, N);
  const rimg = rctx.createImageData(N, N);
  const at = (x: number, y: number) => h[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      nimg.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      nimg.data[i + 2] = (1 / len) * 255;
      nimg.data[i + 3] = 255;
      const rv = 200 + (at(x, y) - 0.5) * 90;
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = rv;
      rimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  rctx.putImageData(rimg, 0, 0);
  const normal = new THREE.CanvasTexture(nc);
  const rough = new THREE.CanvasTexture(rc);
  for (const t of [normal, rough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }
  grain = { normal, rough };
  return grain;
}

/** A material with surface grain, tiled `repeat` times. */
export function grainMaterial(
  color: THREE.ColorRepresentation,
  repeat = 8,
  opts: THREE.MeshStandardMaterialParameters = {},
) {
  const { normal, rough } = getGrain();
  const n = normal.clone();
  const r = rough.clone();
  n.repeat.set(repeat, repeat);
  r.repeat.set(repeat, repeat);
  n.needsUpdate = r.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    color,
    normalMap: n,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: r,
    roughness: 1,
    ...opts,
  });
}

/** Box geometry whose UVs are in world units (so tiled textures keep their scale). */
export function worldBox(w: number, h: number, d: number, unit = 4) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / unit, (uv.getY(i) * dims[f][1]) / unit);
    }
  }
  return g;
}
