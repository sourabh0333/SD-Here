"use client";

import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { grainMaterial, merge, rng, worldBox } from "@/lib/geo";
import {
  CATHEDRAL,
  GATE_Z,
  MYWORK,
  OBELISK,
  OBELISK_H,
  PASSAGE,
  ROAD,
  VIADUCT_Z,
  WHEEL,
} from "@/lib/world";
import { City, type Footprint } from "./City";
import { Human } from "./Human";
import { Bridge, Cafe, Trees, Turbine } from "./Landmarks";
import { Letters } from "./Letters";
import { BLOCK_WOFF, LIGHT_FONT } from "./ParisZone";

const OLD = ["#e58f7a", "#de8070", "#ea9a83", "#d97766", "#efa58c", "#e39783"];

const near = (x: number, z: number, px: number, pz: number, d: number) => Math.hypot(x - px, z - pz) < d;

function useOldTown() {
  return useMemo(() => {
    const r = rng(77);
    const items: Footprint[] = [];
    const pick = () => OLD[Math.floor(r() * OLD.length)];
    for (let i = 0; i < 110; i++) {
      const u = 0.24 + (i / 110) * 0.72;
      const p = ROAD.getPointAt(u);
      const t = ROAD.getTangentAt(u);
      const side = i % 2 === 0 ? 1 : -1;
      const nrm = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(side);
      const c = p.clone().addScaledVector(nrm, 15 + r() * 5);
      if (near(c.x, c.z, WHEEL.x, WHEEL.z, 25)) continue;
      if (c.z > -138) continue;
      if (Math.abs(c.z - GATE_Z) < 8) continue;
      if (near(c.x, c.z, MYWORK.x, MYWORK.z, 20)) continue;
      if (near(c.x, c.z, CATHEDRAL.x, CATHEDRAL.z, 28)) continue;
      if (Math.abs(c.z - VIADUCT_Z) < 7) continue;
      if (c.z < -372) continue;
      items.push({
        x: c.x,
        z: c.z,
        w: 9 + r() * 4,
        d: 11,
        h: 10 + r() * 14,
        rot: Math.atan2(t.x, t.z) + Math.PI / 2,
        color: pick(),
        roof: r() > 0.45 ? "gable" : "mansard",
      });
    }
    for (let i = 0; i < 46; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (42 + r() * 34);
      const z = -150 - r() * 230;
      if (near(x, z, CATHEDRAL.x, CATHEDRAL.z, 30)) continue;
      items.push({
        x,
        z,
        w: 10 + r() * 6,
        d: 12,
        h: 14 + r() * 16,
        rot: r() * 0.4,
        color: pick(),
        roof: r() > 0.5 ? "gable" : "mansard",
      });
    }
    return items;
  }, []);
}

// ── City gate with an arched passage and the "Skill Zone" glass sign ──────
function SkillGate() {
  const { body, awnings } = useMemo(() => {
    const W = 44;
    const H = 17;
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0);
    s.lineTo(-W / 2, H);
    s.lineTo(W / 2, H);
    s.lineTo(W / 2, 0);
    s.lineTo(5, 0);
    s.lineTo(5, 6);
    s.absarc(0, 6, 5, 0, Math.PI, false);
    s.lineTo(-5, 0);
    s.lineTo(-W / 2, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 12, bevelEnabled: false, curveSegments: 24 });
    g.translate(0, 0, -6);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    const parts: THREE.BufferGeometry[] = [g];
    // cornice and crenellations
    const c = worldBox(W + 1, 0.8, 13, 3);
    c.translate(0, H, 0);
    parts.push(c);
    for (let x = -W / 2 + 1; x <= W / 2 - 1; x += 3) {
      const m = worldBox(1.4, 1.4, 13, 3);
      m.translate(x, H + 1.1, 0);
      parts.push(m);
    }
    const aw: THREE.BufferGeometry[] = [];
    for (const x of [-15, -9, 9, 15]) {
      const a = new THREE.BoxGeometry(5, 0.12, 2.2);
      a.rotateX(0.35);
      a.translate(x, 3.6, 7);
      aw.push(a);
    }
    return { body: merge(parts), awnings: merge(aw) };
  }, []);
  const stone = useMemo(() => grainMaterial("#e08b78", 1), []);
  return (
    <group position={[0, 0, GATE_Z]}>
      <mesh geometry={body} material={stone} castShadow receiveShadow />
      <mesh geometry={awnings} castShadow>
        <meshStandardMaterial color="#c9424f" roughness={0.8} />
      </mesh>
      {/* glass sign hanging in the arch */}
      <group position={[0, 5.4, 4]}>
        <mesh>
          <planeGeometry args={[6.2, 6.8]} />
          <meshPhysicalMaterial
            color="#cfe6ff"
            transparent
            opacity={0.22}
            roughness={0.05}
            metalness={0.1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <Text font={LIGHT_FONT} fontSize={0.38} position={[0, 1.6, 0.02]} color="#ffffff" fillOpacity={0.8}>
          ENTERING
        </Text>
        <Text font={BLOCK_WOFF} fontSize={1.05} position={[0, 0.5, 0.02]} color="#ffffff" lineHeight={1}>
          The Skill
        </Text>
        <Text font={BLOCK_WOFF} fontSize={1.05} position={[0, -0.7, 0.02]} color="#ffffff">
          Zone
        </Text>
      </group>
    </group>
  );
}

// ── Narrow canyon of walls the rider shoots through ──────────────────────
function Passage() {
  const geo = useMemo(() => {
    const len = PASSAGE.z0 - PASSAGE.z1;
    const parts: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const w = worldBox(2.5, 11, len, 3);
      w.translate(side * 6, 5.5, (PASSAGE.z0 + PASSAGE.z1) / 2);
      parts.push(w);
    }
    return merge(parts);
  }, []);
  const mat = useMemo(() => grainMaterial("#d4615c", 1), []);
  return <mesh geometry={geo} material={mat} castShadow receiveShadow />;
}

// ── Gothic cathedral + round tower behind the MY WORK letters ─────────────
function Cathedral() {
  const { stone, roofs } = useMemo(() => {
    const s: THREE.BufferGeometry[] = [];
    const ro: THREE.BufferGeometry[] = [];
    const nave = worldBox(18, 20, 44, 4);
    nave.translate(0, 10, -8);
    s.push(nave);
    const roof = new THREE.CylinderGeometry(1, 1, 44, 3);
    roof.rotateX(Math.PI / 2);
    roof.rotateZ(Math.PI);
    roof.scale(10.4, 6, 1);
    roof.translate(0, 23, -8);
    ro.push(roof);
    for (const x of [-7.5, 7.5]) {
      const tower = worldBox(8, 34, 8, 4);
      tower.translate(x, 17, 16);
      s.push(tower);
      const spire = new THREE.ConeGeometry(5.2, 18, 8);
      spire.translate(x, 43, 16);
      ro.push(spire);
      for (const [dx, dz] of [
        [-3.6, -3.6],
        [3.6, -3.6],
        [-3.6, 3.6],
        [3.6, 3.6],
      ]) {
        const pin = new THREE.ConeGeometry(0.7, 6, 6);
        pin.translate(x + dx, 37, 16 + dz);
        ro.push(pin);
      }
    }
    // buttresses
    for (let z = -26; z <= 10; z += 7) {
      for (const x of [-11, 11]) {
        const b = worldBox(2, 14, 2.2, 3);
        b.translate(x, 7, z);
        s.push(b);
        const p = new THREE.ConeGeometry(0.9, 4, 4);
        p.translate(x, 16, z);
        ro.push(p);
      }
    }
    // round tower with conical roof
    const rt = new THREE.CylinderGeometry(4.5, 5, 36, 20);
    rt.translate(26, 18, 34);
    s.push(rt);
    const rc = new THREE.ConeGeometry(5.6, 12, 20);
    rc.translate(26, 42, 34);
    ro.push(rc);
    return { stone: merge(s), roofs: merge(ro) };
  }, []);
  const stoneMat = useMemo(() => grainMaterial("#e7a184", 1), []);
  return (
    <group position={CATHEDRAL} rotation={[0, 0.15, 0]}>
      <mesh geometry={stone} material={stoneMat} castShadow receiveShadow />
      <mesh geometry={roofs} castShadow receiveShadow>
        <meshStandardMaterial color="#c4675e" roughness={0.7} metalness={0.1} flatShading />
      </mesh>
      {/* rose window */}
      <mesh position={[0, 24, 14.1]}>
        <circleGeometry args={[3, 24]} />
        <meshStandardMaterial color="#5a3446" emissive="#e0855e" emissiveIntensity={0.35} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Obelisk() {
  const { stone } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const [r, h, y] of [
      [9, 0.6, 0.3],
      [7.6, 0.6, 0.9],
      [6.2, 1.2, 1.8],
    ]) {
      const step = new THREE.CylinderGeometry(r, r, h, 4);
      step.rotateY(Math.PI / 4);
      step.translate(0, y, 0);
      parts.push(step);
    }
    const shaft = new THREE.CylinderGeometry(1.6, 2.8, OBELISK_H - 3, 4);
    shaft.rotateY(Math.PI / 4);
    shaft.translate(0, 2.4 + (OBELISK_H - 3) / 2, 0);
    parts.push(shaft);
    const top = new THREE.CylinderGeometry(2.2, 1.7, 1, 4);
    top.rotateY(Math.PI / 4);
    top.translate(0, OBELISK_H - 0.1, 0);
    parts.push(top);
    const m = merge(parts);
    m.computeVertexNormals();
    return { stone: m };
  }, []);
  const mat = useMemo(() => grainMaterial("#cf8a7b", 0.6), []);
  const pave = useMemo(() => grainMaterial("#e4a199", 6), []);
  return (
    <group position={OBELISK}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={pave} receiveShadow>
        <circleGeometry args={[16, 40]} />
      </mesh>
      <mesh geometry={stone} material={mat} castShadow receiveShadow />
      <Human pose="raise" gold ring scale={2.2} position={[0, OBELISK_H + 0.4, 0]} />
    </group>
  );
}

export function RideZone() {
  const buildings = useOldTown();
  const pines = useMemo(() => {
    const r = rng(8);
    const out: { x: number; z: number }[] = [];
    for (let i = 0; i < 110; i++) {
      const u = 0.3 + r() * 0.66;
      const p = ROAD.getPointAt(u);
      const t = ROAD.getTangentAt(u);
      const side = r() > 0.5 ? 1 : -1;
      const nrm = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(side);
      const c = p.addScaledVector(nrm, 7 + r() * 5);
      if (c.z < PASSAGE.z0 + 4 && c.z > PASSAGE.z1 - 4) continue;
      if (Math.abs(c.z - GATE_Z) < 10) continue;
      if (near(c.x, c.z, MYWORK.x + 2, MYWORK.z, 17)) continue;
      if (c.z > -135) continue;
      out.push({ x: c.x, z: c.z });
    }
    return out;
  }, []);

  return (
    <group>
      <City items={buildings} />
      <Trees points={pines} kind="pine" color="#7f9258" />
      <SkillGate />
      <Cafe
        color="#f0c9d1"
        points={[
          [9.5, -183],
          [12.5, -187],
          [9.5, -191],
          [-10, -216 + 30],
          [-13, -181],
        ]}
      />
      <Passage />
      <Letters text="<Work />" size={4.8} position={[MYWORK.x - 3, 0, MYWORK.z]} rotation={[0, 0.28, 0]} color="#c94f62" />
      <Cathedral />
      <Bridge
        position={[5.6, 0, VIADUCT_Z]}
        rotation={[0, 0.3, 0]}
        half={46}
        deck={12}
        width={6}
        color="#d9806d"
        arches={[
          [-36, 2, 4.5],
          [-24, 2, 4.5],
          [-12, 2, 4.5],
          [0, 2, 6.2],
          [12, 2, 4.5],
          [24, 2, 4.5],
          [36, 2, 4.5],
        ]}
      />
      {[
        [-70, -340],
        [-48, -372],
        [58, -350],
        [82, -385],
        [30, -430],
      ].map(([x, z], i) => (
        <Turbine key={i} position={[x, 0, z]} rotation={[0, 0.2 * i, 0]} />
      ))}
      <Obelisk />
    </group>
  );
}
