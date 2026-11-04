"use client";

import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { beam, grainMaterial, merge, rng } from "@/lib/geo";

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
  const stone = useMemo(() => grainMaterial("#c98f86", 0.3), []);
  const plinth = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const [sx, sz] of [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      const g = new THREE.BoxGeometry(7, 2.6, 7);
      g.translate(sx * 12.4, 1.3, sz * 12.4);
      parts.push(g);
      const cap = new THREE.BoxGeometry(7.6, 0.4, 7.6);
      cap.translate(sx * 12.4, 2.7, sz * 12.4);
      parts.push(cap);
    }
    const m = merge(parts);
    const uv = m.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 1);
    return m;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color="#9c564f" roughness={0.5} metalness={0.45} />
      </mesh>
      <mesh geometry={plinth} material={stone} castShadow receiveShadow />
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
  children,
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

  const mat = useMemo(() => grainMaterial(color, 0.25), [color]);
  useMemo(() => {
    // world-scale UVs for the extruded shape: x/y in metres
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const nrm = geo.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(nrm.getX(i));
      const az = Math.abs(nrm.getZ(i));
      const u = az > 0.5 ? pos.getX(i) : ax > 0.5 ? pos.getZ(i) : pos.getX(i);
      const v = az > 0.5 || ax > 0.5 ? pos.getY(i) : pos.getZ(i);
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
  }, [geo]);

  return (
    <group {...props}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {children}
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
    const r = rng(kind === "round" ? 5 : 6);
    const parts: THREE.BufferGeometry[] = [];
    if (kind === "round") {
      // many small lumpy clusters read as foliage rather than a single blob
      for (let i = 0; i < 16; i++) {
        const g = new THREE.IcosahedronGeometry(0.55 + r() * 0.5, 1);
        const p = g.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < p.count; k++) {
          const s = 0.85 + r() * 0.3;
          p.setXYZ(k, p.getX(k) * s, p.getY(k) * s, p.getZ(k) * s);
        }
        const a = r() * Math.PI * 2;
        const rad = Math.sqrt(r()) * 1.3;
        g.translate(Math.cos(a) * rad, 3.4 + r() * 2.2, Math.sin(a) * rad);
        parts.push(g);
      }
      // a few branches
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        parts.push(beam(v(0, 2.4, 0), v(Math.cos(a) * 0.9, 3.9, Math.sin(a) * 0.9), 0.12));
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const c = new THREE.ConeGeometry(2.3 - i * 0.42, 2.2, 9);
        c.translate(0, 2 + i * 1.35, 0);
        parts.push(c);
      }
    }
    const m = merge(parts);
    // subtle per-vertex shading so crowns read as foliage, not a single colour
    const col = new Float32Array(m.attributes.position.count * 3);
    const base = new THREE.Color(color);
    for (let i = 0; i < m.attributes.position.count; i++) {
      const y = m.attributes.position.getY(i);
      const k = 0.78 + r() * 0.25 + (y - 3) * 0.04;
      col[i * 3] = base.r * k;
      col[i * 3 + 1] = base.g * k;
      col[i * 3 + 2] = base.b * k;
    }
    m.setAttribute("color", new THREE.BufferAttribute(col, 3));
    m.computeVertexNormals();
    return m;
  }, [kind, color]);

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
        <meshStandardMaterial vertexColors roughness={0.85} flatShading />
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

// ── Ornate street lamps ───────────────────────────────────────────────────
function lampParts(x: number, y: number, z: number, tall = 1) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, py: number) => {
    g.translate(x, y + py * tall, z);
    parts.push(g);
  };
  add(new THREE.CylinderGeometry(0.34, 0.42, 0.5, 12), 0.25);
  add(new THREE.CylinderGeometry(0.22, 0.3, 0.5, 12), 0.7);
  add(new THREE.CylinderGeometry(0.09, 0.16, 3.6 * tall, 12), 0.95 + 1.8 * tall);
  add(new THREE.TorusGeometry(0.16, 0.035, 6, 16).rotateX(Math.PI / 2), 1.2);
  add(new THREE.TorusGeometry(0.12, 0.03, 6, 16).rotateX(Math.PI / 2), 4.4);
  add(new THREE.CylinderGeometry(0.16, 0.12, 0.18, 12), 4.5);
  // lantern cage
  add(new THREE.CylinderGeometry(0.34, 0.2, 0.9, 6, 1, true), 5.05);
  add(new THREE.ConeGeometry(0.46, 0.45, 6), 5.72);
  add(new THREE.SphereGeometry(0.08, 8, 6), 6.02);
  return parts;
}

export function Lamps({ points, y = 0 }: { points: [number, number][]; y?: number }) {
  const { metal, glass } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const glassParts: THREE.BufferGeometry[] = [];
    for (const [x, z] of points) {
      parts.push(...lampParts(x, y, z));
      const g = new THREE.CylinderGeometry(0.3, 0.19, 0.78, 6);
      g.translate(x, y + 5.05, z);
      glassParts.push(g);
    }
    return { metal: merge(parts), glass: merge(glassParts) };
  }, [points, y]);
  return (
    <group>
      <mesh geometry={metal} castShadow>
        <meshStandardMaterial color="#2f2a30" roughness={0.45} metalness={0.7} />
      </mesh>
      <mesh geometry={glass}>
        <meshStandardMaterial color="#fff1d6" emissive="#ffcf8a" emissiveIntensity={1.4} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ── Benches ───────────────────────────────────────────────────────────────
export function Benches({ points, y = 0 }: { points: [number, number, number][]; y?: number }) {
  const { wood, iron } = useMemo(() => {
    const w: THREE.BufferGeometry[] = [];
    const ir: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    for (const [x, z, rot] of points) {
      m.makeRotationY(rot).setPosition(x, y, z);
      for (let i = 0; i < 4; i++) {
        const slat = new THREE.BoxGeometry(1.9, 0.05, 0.11);
        slat.translate(0, 0.46, -0.2 + i * 0.13);
        w.push(slat.applyMatrix4(m));
      }
      for (let i = 0; i < 3; i++) {
        const back = new THREE.BoxGeometry(1.9, 0.11, 0.05);
        back.rotateX(-0.2);
        back.translate(0, 0.62 + i * 0.15, -0.27 - i * 0.03);
        w.push(back.applyMatrix4(m));
      }
      for (const sx of [-0.85, 0.85]) {
        const leg = new THREE.BoxGeometry(0.07, 0.46, 0.5);
        leg.translate(sx, 0.23, -0.05);
        ir.push(leg.applyMatrix4(m));
        const arm = new THREE.BoxGeometry(0.06, 0.06, 0.5);
        arm.translate(sx, 0.68, -0.05);
        ir.push(arm.applyMatrix4(m));
      }
    }
    return { wood: merge(w), iron: merge(ir) };
  }, [points, y]);
  return (
    <group>
      <mesh geometry={wood} castShadow receiveShadow>
        <meshStandardMaterial color="#7a5a43" roughness={0.75} />
      </mesh>
      <mesh geometry={iron} castShadow>
        <meshStandardMaterial color="#2b2a2e" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

// ── Kiosk (Parisian newsstand) ────────────────────────────────────────────
export function Kiosk(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 2.8, 8]} />
        <meshStandardMaterial color="#4b5a46" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[1.52, 1.52, 1.1, 8, 1, true]} />
        <meshStandardMaterial color="#e9ddc9" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <coneGeometry args={[2.1, 1.1, 8]} />
        <meshStandardMaterial color="#3e4a3a" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 3.9, 0]}>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshStandardMaterial color="#c8a24c" metalness={1} roughness={0.3} />
      </mesh>
    </group>
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

// ── Café terrace: parasols, tables and chairs ─────────────────────────────
export function Cafe({ points, color = "#f4d7dc" }: { points: [number, number][]; color?: string }) {
  const { cloth, metal, chairs } = useMemo(() => {
    const c: THREE.BufferGeometry[] = [];
    const m: THREE.BufferGeometry[] = [];
    const ch: THREE.BufferGeometry[] = [];
    const r = rng(points.length + 3);
    for (const [x, z] of points) {
      const top = new THREE.ConeGeometry(1.6, 0.55, 12, 1, true);
      top.translate(x, 2.45, z);
      c.push(top);
      const pole = new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6);
      pole.translate(x, 1.15, z);
      m.push(pole);
      const table = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16);
      table.translate(x, 0.74, z);
      m.push(table);
      const foot = new THREE.CylinderGeometry(0.05, 0.25, 0.72, 8);
      foot.translate(x, 0.36, z);
      m.push(foot);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + r();
        const cx = x + Math.cos(a) * 0.8;
        const cz = z + Math.sin(a) * 0.8;
        const rot = new THREE.Matrix4().makeRotationY(-a + Math.PI / 2).setPosition(cx, 0, cz);
        const seat = new THREE.BoxGeometry(0.42, 0.04, 0.42);
        seat.translate(0, 0.45, 0);
        const back = new THREE.BoxGeometry(0.42, 0.4, 0.04);
        back.translate(0, 0.67, -0.2);
        ch.push(seat.applyMatrix4(rot), back.applyMatrix4(rot));
        for (const [lx, lz] of [
          [-0.18, -0.18],
          [0.18, -0.18],
          [-0.18, 0.18],
          [0.18, 0.18],
        ]) {
          const leg = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 5);
          leg.translate(lx, 0.225, lz);
          m.push(leg.applyMatrix4(rot));
        }
      }
    }
    return { cloth: merge(c), metal: merge(m), chairs: merge(ch) };
  }, [points]);
  return (
    <group>
      <mesh geometry={cloth} castShadow>
        <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={metal} castShadow>
        <meshStandardMaterial color="#3a3638" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh geometry={chairs} castShadow receiveShadow>
        <meshStandardMaterial color="#e8b9c2" roughness={0.6} />
      </mesh>
    </group>
  );
}
