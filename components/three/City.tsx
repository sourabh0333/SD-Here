"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { getGrain, getWindowTexture, mergeColored, tint } from "@/lib/geo";

export type Footprint = {
  x: number;
  z: number;
  w: number; // along local x (facade width)
  d: number; // along local z (depth)
  h: number;
  rot?: number;
  color: THREE.ColorRepresentation;
  roof?: "mansard" | "gable" | "flat";
  roofColor?: THREE.ColorRepresentation;
};

const FLOOR = 3.4;
const BAY = 3;

function wallGeometry(f: Footprint) {
  const g = new THREE.BoxGeometry(f.w, f.h, f.d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // Faces: +x, -x, +y, -y, +z, -z (4 vertices each)
  const widths = [f.d, f.d, 0, 0, f.w, f.w];
  for (let face = 0; face < 6; face++) {
    for (let k = 0; k < 4; k++) {
      const i = face * 4 + k;
      if (widths[face] === 0) {
        uv.setXY(i, 0.02, 0.02);
      } else {
        const bays = Math.max(1, Math.round(widths[face] / BAY));
        const floors = Math.max(1, Math.round(f.h / FLOOR));
        uv.setXY(i, uv.getX(i) * bays, uv.getY(i) * floors);
      }
    }
  }
  g.translate(0, f.h / 2, 0);
  return g;
}

function roofGeometry(f: Footprint) {
  const parts: THREE.BufferGeometry[] = [];
  const style = f.roof ?? "mansard";
  if (style === "mansard") {
    const rh = Math.min(4, f.h * 0.22);
    const g = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.72, Math.SQRT1_2, 1, 4, 1);
    g.rotateY(Math.PI / 4);
    g.scale(f.w, rh, f.d);
    g.translate(0, f.h + rh / 2, 0);
    parts.push(g);
    // cornice
    const c = new THREE.BoxGeometry(f.w + 0.4, 0.35, f.d + 0.4);
    c.translate(0, f.h, 0);
    parts.push(c);
    // chimneys
    const ch = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    ch.translate(f.w * 0.28, f.h + rh, 0);
    parts.push(ch);
  } else if (style === "gable") {
    const rh = Math.min(5, f.w * 0.55);
    const g = new THREE.CylinderGeometry(1, 1, f.d, 3, 1);
    g.rotateX(-Math.PI / 2);
    const sx = f.w / 1.732;
    const sy = rh / 1.5;
    g.scale(sx, sy, 1);
    g.translate(0, f.h + 0.5 * sy, 0);
    parts.push(g);
  } else {
    const c = new THREE.BoxGeometry(f.w + 0.3, 0.5, f.d + 0.3);
    c.translate(0, f.h, 0);
    parts.push(c);
  }
  return parts;
}

/** Merges a list of building footprints into two draw calls. */
export function City({ items }: { items: Footprint[] }) {
  const { walls, roofs } = useMemo(() => {
    const wallParts: THREE.BufferGeometry[] = [];
    const roofParts: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (const f of items) {
      m.compose(
        new THREE.Vector3(f.x, 0, f.z),
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.rot ?? 0),
        new THREE.Vector3(1, 1, 1),
      );
      const w = wallGeometry(f);
      w.applyMatrix4(m);
      wallParts.push(tint(w, f.color));
      const rc = f.roofColor ?? new THREE.Color(f.color).multiplyScalar(0.72);
      for (const r of roofGeometry(f)) {
        r.applyMatrix4(m);
        roofParts.push(tint(r, rc));
      }
    }
    const walls = mergeColored(wallParts);
    const roofs = mergeColored(roofParts);
    walls.computeVertexNormals();
    roofs.computeVertexNormals();
    return { walls, roofs };
  }, [items]);

  const tex = useMemo(() => getWindowTexture(), []);
  const grain = useMemo(() => getGrain(), []);

  return (
    <group>
      <mesh geometry={walls} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          map={tex}
          normalMap={grain.normal}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          roughnessMap={grain.rough}
          roughness={1}
        />
      </mesh>
      <mesh geometry={roofs} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.75} metalness={0.15} flatShading />
      </mesh>
    </group>
  );
}
