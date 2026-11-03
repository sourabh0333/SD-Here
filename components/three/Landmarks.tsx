"use client";

import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { beam, merge, rng } from "@/lib/geo";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ── Lattice tower ─────────────────────────────────────────────────────────
function towerGeometry() {
  const H = 74;
  const parts: THREE.BufferGeometry[] = [];
  const hw = (y: number) => 14 * Math.pow(1 - y / H, 2.3) + 0.9;
  const corners = (y: number, r: number) => [
    v(r, y, r),
    v(-r, y, r),
    v(-r, y, -r),
    v(r, y, -r),
  ];
  const ring = (pts: THREE.Vector3[], t: number) => {
    for (let i = 0; i < 4; i++) parts.push(beam(pts[i], pts[(i + 1) % 4], t));
  };
  const face = (a: THREE.Vector3[], b: THREE.Vector3[], t: number, diag = true) => {
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      parts.push(beam(a[i], b[i], t * 1.6));
      if (diag) {
        parts.push(beam(a[i], b[j], t * 0.6));
        parts.push(beam(a[j], b[i], t * 0.6));
      }
    }
  };

  // Four legs below the first platform, each a small lattice.
  const P1 = 17;
  const legLevels = 7;
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ]) {
    let prev: THREE.Vector3[] | null = null;
    for (let i = 0; i <= legLevels; i++) {
      const y = (P1 * i) / legLevels;
      const s = 4.6 - y * 0.12;
      const c = hw(y) - s / 2;
      const center = v(sx * c, y, sz * c);
      const pts = corners(0, s / 2).map((p) => p.add(center));
      ring(pts, 0.22);
      if (prev) face(prev, pts, 0.3);
      prev = pts;
    }
  }

  // Upper single lattice.
  let prev: THREE.Vector3[] | null = null;
  const levels = 22;
  for (let i = 0; i <= levels; i++) {
    const y = P1 + ((H - P1) * i) / levels;
    const pts = corners(y, hw(y));
    ring(pts, 0.25);
    if (prev) face(prev, pts, Math.max(0.12, 0.35 - i * 0.01));
    prev = pts;
  }

  // Arches between legs.
  const span = hw(0) - 4.6;
  for (let f = 0; f < 4; f++) {
    const rot = new THREE.Matrix4().makeRotationY((f * Math.PI) / 2);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = (Math.PI * i) / 18;
      pts.push(v(Math.cos(a) * span, 2 + Math.sin(a) * (P1 - 5.5), hw(0) - 1.6).applyMatrix4(rot));
    }
    for (let i = 0; i < pts.length - 1; i++) {
      parts.push(beam(pts[i], pts[i + 1], 0.45));
      const top = pts[i].clone();
      top.y = P1;
      if (i % 2 === 0) parts.push(beam(pts[i], top, 0.14));
    }
  }

  // Platforms.
  for (const [y, t] of [
    [P1, 1.2],
    [40, 0.8],
    [64, 0.6],
  ]) {
    const s = hw(y) * 2 + 1.6;
    const g = new THREE.BoxGeometry(s, t, s);
    g.translate(0, y, 0);
    parts.push(g);
  }
  const top = new THREE.CylinderGeometry(0.5, 0.9, 4, 8);
  top.translate(0, H + 2, 0);
  parts.push(top);
  const ant = new THREE.CylinderGeometry(0.08, 0.2, 7, 6);
  ant.translate(0, H + 7.5, 0);
  parts.push(ant);
  return merge(parts);
}

export function Tower(props: ThreeElements["group"]) {
  const geo = useMemo(() => towerGeometry(), []);
  return (
    <group {...props}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#b76a63" roughness={0.55} metalness={0.35} />
      </mesh>
    </group>
  );
}

// ── Ferris wheel ──────────────────────────────────────────────────────────
export function FerrisWheel(props: ThreeElements["group"]) {
  const R = 14;
  const N = 24;
  const wheel = useRef<THREE.Group>(null);
  const cabins = useRef<THREE.InstancedMesh>(null);

  const { rim, supports } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [-1, 1]) {
      const t = new THREE.TorusGeometry(R, 0.22, 6, 64);
      t.rotateY(Math.PI / 2);
      t.translate(x, 0, 0);
      parts.push(t);
      const t2 = new THREE.TorusGeometry(R * 0.55, 0.12, 6, 48);
      t2.rotateY(Math.PI / 2);
      t2.translate(x, 0, 0);
      parts.push(t2);
    }
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const p = v(0, Math.sin(a) * R, Math.cos(a) * R);
      parts.push(beam(v(-1, 0, 0), p.clone().setX(-1), 0.1));
      parts.push(beam(v(1, 0, 0), p.clone().setX(1), 0.1));
      parts.push(beam(p.clone().setX(-1), p.clone().setX(1), 0.12));
    }
    const hub = new THREE.CylinderGeometry(0.9, 0.9, 3, 12);
    hub.rotateZ(Math.PI / 2);
    parts.push(hub);
    const s: THREE.BufferGeometry[] = [];
    for (const x of [-2.2, 2.2]) {
      s.push(beam(v(x * 0.8, 0, 0), v(x * 1.6, -R - 2.5, 7), 0.5));
      s.push(beam(v(x * 0.8, 0, 0), v(x * 1.6, -R - 2.5, -7), 0.5));
    }
    const base = new THREE.BoxGeometry(10, 1, 18);
    base.translate(0, -R - 2.5, 0);
    s.push(base);
    return { rim: merge(parts), supports: merge(s) };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => {
    if (!wheel.current || !cabins.current) return;
    wheel.current.rotation.x += dt * 0.06;
    const rot = wheel.current.rotation.x;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rot;
      dummy.position.set(0, Math.sin(a) * R - 1.3, Math.cos(a) * R);
      dummy.updateMatrix();
      cabins.current.setMatrixAt(i, dummy.matrix);
    }
    cabins.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group {...props}>
      <group position={[0, R + 2.5, 0]}>
        <group ref={wheel}>
          <mesh geometry={rim} castShadow>
            <meshStandardMaterial color="#e8dbe0" roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
        <instancedMesh ref={cabins} args={[undefined, undefined, N]} castShadow>
          <boxGeometry args={[1.6, 1.4, 1.4]} />
          <meshStandardMaterial color="#c9506a" roughness={0.6} />
        </instancedMesh>
        <mesh geometry={supports} castShadow receiveShadow>
          <meshStandardMaterial color="#d8c9cf" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ── Stone bridge with arches ──────────────────────────────────────────────
export function Bridge({
  arches = [
    [-18, 0, 4],
    [0, -1.6, 6.2],
    [18, 0, 4],
  ],
  half = 27,
  deck = 5.5,
  width = 10,
  color = "#b9a3bd",
  ...props
}: ThreeElements["group"] & {
  arches?: number[][];
  half?: number;
  deck?: number;
  width?: number;
  color?: string;
}) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-half, -4);
    s.lineTo(-half, deck);
    s.lineTo(half, deck);
    s.lineTo(half, -4);
    const sorted = [...arches].sort((a, b) => b[0] - a[0]);
    for (const [cx, sy, r] of sorted) {
      s.lineTo(cx + r, -4);
      s.lineTo(cx + r, sy);
      s.absarc(cx, sy, r, 0, Math.PI, false);
      s.lineTo(cx - r, -4);
    }
    s.lineTo(-half, -4);
    const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: 20 });
    g.translate(0, 0, -width / 2);
    const parts: THREE.BufferGeometry[] = [g];
    // cornice + parapets
    const c = new THREE.BoxGeometry(half * 2 + 0.6, 0.5, width + 0.8);
    c.translate(0, deck - 0.4, 0);
    parts.push(c);
    for (const z of [-width / 2, width / 2]) {
      const p = new THREE.BoxGeometry(half * 2, 1, 0.4);
      p.translate(0, deck + 0.5, z);
      parts.push(p);
    }
    return merge(parts);
  }, [arches, half, deck, width]);

  return (
    <group {...props}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

// ── Instanced trees ───────────────────────────────────────────────────────
export function Trees({
  points,
  kind = "round",
  color = "#8f9a52",
}: {
  points: { x: number; z: number; s?: number }[];
  kind?: "round" | "pine";
  color?: string;
}) {
  const crownGeo = useMemo(() => {
    if (kind === "round") {
      const g = new THREE.IcosahedronGeometry(1.6, 0);
      g.translate(0, 4.2, 0);
      return g;
    }
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const c = new THREE.ConeGeometry(2.2 - i * 0.45, 2.4, 7);
      c.translate(0, 2.2 + i * 1.5, 0);
      parts.push(c);
    }
    const m = merge(parts);
    m.computeVertexNormals();
    return m;
  }, [kind]);

  const setup = (mesh: THREE.InstancedMesh | null, isTrunk: boolean) => {
    if (!mesh) return;
    const d = new THREE.Object3D();
    const r = rng(points.length * 13 + (isTrunk ? 0 : 1));
    points.forEach((p, i) => {
      const s = p.s ?? 0.8 + r() * 0.5;
      d.position.set(p.x, 0, p.z);
      d.rotation.set(0, r() * Math.PI * 2, 0);
      d.scale.setScalar(s);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };

  return (
    <group>
      <instancedMesh
        ref={(m) => setup(m, false)}
        args={[crownGeo, undefined, points.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={(m) => setup(m, true)}
        args={[undefined, undefined, points.length]}
        castShadow
      >
        <cylinderGeometry args={[0.15, 0.22, kind === "round" ? 3.2 : 2.2, 5]} />
        <meshStandardMaterial color="#5a463c" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

// ── Street lamps ──────────────────────────────────────────────────────────
export function Lamps({ points }: { points: [number, number][] }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const [x, z] of points) {
      const pole = new THREE.CylinderGeometry(0.08, 0.14, 4.2, 6);
      pole.translate(x, 2.1, z);
      const base = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 6);
      base.translate(x, 0.3, z);
      const lantern = new THREE.CylinderGeometry(0.32, 0.18, 0.7, 6);
      lantern.translate(x, 4.5, z);
      const cap = new THREE.ConeGeometry(0.38, 0.4, 6);
      cap.translate(x, 5.05, z);
      parts.push(pole, base, lantern, cap);
    }
    return merge(parts);
  }, [points]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color="#5b4f58" roughness={0.6} metalness={0.4} />
    </mesh>
  );
}

// ── Wind turbines ─────────────────────────────────────────────────────────
export function Turbine(props: ThreeElements["group"]) {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.z += dt * 0.8;
  });
  return (
    <group {...props}>
      <mesh position={[0, 15, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.7, 30, 8]} />
        <meshStandardMaterial color="#f1e6e8" />
      </mesh>
      <group ref={rotor} position={[0, 30, 0.8]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 22, 0.15]} />
            <meshStandardMaterial color="#f6eef0" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── Café umbrellas & tables ───────────────────────────────────────────────
export function Cafe({ points, color = "#f4d7dc" }: { points: [number, number][]; color?: string }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const [x, z] of points) {
      const top = new THREE.ConeGeometry(1.5, 0.6, 8);
      top.translate(x, 2.4, z);
      const pole = new THREE.CylinderGeometry(0.04, 0.04, 2.3, 5);
      pole.translate(x, 1.15, z);
      const table = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 10);
      table.translate(x, 0.75, z);
      parts.push(top, pole, table);
    }
    return merge(parts);
  }, [points]);
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color} roughness={0.8} flatShading />
    </mesh>
  );
}
