"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { grainMaterial, merge, rng, worldBox } from "@/lib/geo";
import { scroll } from "@/lib/scroll";
import { T, range, smooth, window01 } from "@/lib/timeline";
import {
  ABOUT_SPOT,
  BASTION,
  BERGE_Y,
  BRIDGE_Z,
  HERO_LAMP,
  RIVER,
  ROAD,
  TOWER,
  WATER_Y,
  WHEEL,
} from "@/lib/world";
import { City, type Footprint } from "./City";
import { Benches, Bridge, FerrisWheel, Kiosk, Lamps, Tower, Trees } from "./Landmarks";
import { Letters } from "./Letters";
import { Flock, RiverWater } from "./Nature";

const PINKS = ["#e7a39c", "#df958f", "#eab0a6", "#d98b88", "#efbcb0", "#e29d93"];

export const LIGHT_FONT = "/fonts/orbitron-latin-700-normal.woff";
export const BLOCK_WOFF = "/fonts/archivo-black-latin-400-normal.woff";

export function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, offset: number, y: number, n = 500) {
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const len = curve.getLength();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    const a = p.clone().addScaledVector(side, offset - width / 2);
    const b = p.clone().addScaledVector(side, offset + width / 2);
    pos.push(a.x, y, a.z, b.x, y, b.z);
    uvs.push(0, (u * len) / 4, width / 4, (u * len) / 4);
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Ground from the end of the river to the obelisk (shared by both zones). */
export function Ground() {
  const mat = useMemo(() => grainMaterial("#d98681", 40), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -275]} material={mat} receiveShadow>
      <planeGeometry args={[700, 400]} />
    </mesh>
  );
}

/** Road ribbon + white edge lines along the whole ride. */
export function Road() {
  const road = useMemo(() => ribbon(ROAD, 9, 0, 0.03), []);
  const lineL = useMemo(() => ribbon(ROAD, 0.28, -4.1, 0.05), []);
  const lineR = useMemo(() => ribbon(ROAD, 0.28, 4.1, 0.05), []);
  const asphalt = useMemo(() => grainMaterial("#b9585f", 1, { roughness: 0.9 }), []);
  return (
    <group>
      <mesh geometry={road} material={asphalt} receiveShadow />
      <mesh geometry={lineL} receiveShadow>
        <meshStandardMaterial color="#f6e4e4" roughness={0.7} />
      </mesh>
      <mesh geometry={lineR} receiveShadow>
        <meshStandardMaterial color="#f6e4e4" roughness={0.7} />
      </mesh>
    </group>
  );
}

function useQuayBuildings() {
  return useMemo(() => {
    const r = rng(42);
    const items: Footprint[] = [];
    const pick = (arr: string[]) => arr[Math.floor(r() * arr.length)];
    for (const side of [-1, 1]) {
      for (const [x0, hMin] of [
        [33, 14],
        [57, 18],
      ]) {
        let z = 66;
        while (z > -92) {
          const w = 9 + r() * 6;
          items.push({
            x: side * (x0 + r() * 2),
            z: z - w / 2,
            w,
            d: 14,
            h: hMin + r() * 7,
            rot: Math.PI / 2,
            color: pick(PINKS),
            roof: "mansard",
          });
          z -= w + 0.2;
        }
      }
    }
    for (let i = 0; i < 26; i++) {
      const x = -120 + i * 9.5 + r() * 2;
      if (Math.abs(x) < 26) continue;
      items.push({ x, z: -100 - r() * 30, w: 9, d: 12, h: 14 + r() * 10, color: pick(PINKS) });
    }
    return items;
  }, []);
}

// ── Floating "Welcome to my World" ────────────────────────────────────────
function WelcomeText() {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = window01(scroll.current, 0.085, 0.165, 0.025);
    if (!g.current) return;
    g.current.visible = o > 0.001;
    g.current.traverse((c) => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m && "opacity" in m) {
        m.transparent = true;
        m.opacity = o;
      }
    });
  });
  return (
    <group ref={g} position={[-1.5, 3.4, -44]}>
      <Text font={LIGHT_FONT} fontSize={0.95} position={[0, 0.55, 0]} color="#ffffff" anchorX="center">
        Welcome
      </Text>
      <Text font={LIGHT_FONT} fontSize={0.42} position={[1.45, -0.2, 0]} color="#ffffff" anchorX="center">
        to my
      </Text>
      <Text font={LIGHT_FONT} fontSize={0.6} position={[-1.05, -0.32, 0]} color="#ffffff" anchorX="center">
        World
      </Text>
    </group>
  );
}

// ── Words painted around the inside of the bridge arch ───────────────────
const ARCH_LINES = [
  ["REACT", "THREE.JS", "NEXT.JS", "WEBGL"],
  ["DESIGN", "MOTION", "3D", "UX/UI"],
  ["NODE", "TYPESCRIPT", "API", "CLOUD"],
];

function ArchText({ radius, axisY }: { radius: number; axisY: number }) {
  return (
    <group position={[0, axisY, 0]}>
      {ARCH_LINES.map((words, row) =>
        words.map((w, i) => {
          const angle = (i - (words.length - 1) / 2) * 0.62 + (row % 2) * 0.2;
          return (
            <group key={`${row}-${w}`} rotation={[0, 0, angle]} position={[0, 0, -3 + row * 3]}>
              <Text
                font={BLOCK_WOFF}
                fontSize={0.85}
                position={[0, radius - 0.02, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                // troika-three-text supports curving text around a cylinder
                {...({ curveRadius: -(radius - 0.02) } as object)}
                color="#f3e7ef"
                fillOpacity={0.75}
                anchorX="center"
                anchorY="middle"
              >
                {w}
              </Text>
            </group>
          );
        }),
      )}
    </group>
  );
}

// ── "HI!" painted on the road lifts up into the about panel title ─────────
function RisingHi() {
  const g = useRef<THREE.Group>(null);
  const text = useRef<THREE.Mesh & { fillOpacity: number }>(null);
  const from = useMemo(
    () => ({ pos: new THREE.Vector3(0.6, 0.06, -101), rot: new THREE.Euler(-Math.PI / 2, 0, 0), s: 1 }),
    [],
  );
  const to = useMemo(
    () => ({ pos: new THREE.Vector3(ABOUT_SPOT.x - 8.1, 7.15, ABOUT_SPOT.z - 2.9), s: 0.2 }),
    [],
  );
  useFrame(() => {
    const t = scroll.current;
    const k = smooth(range(t, T.hiRise[0], T.hiRise[1]));
    if (!g.current) return;
    g.current.position.lerpVectors(from.pos, to.pos, k);
    g.current.rotation.set(from.rot.x * (1 - k), 0, 0);
    g.current.scale.setScalar(from.s + (to.s - from.s) * k);
    const fade = 1 - range(t, T.hiRise[1], T.hiRise[1] + 0.01);
    if (text.current) text.current.fillOpacity = 0.85 * fade;
    g.current.visible = fade > 0.001 && t < 0.4;
  });
  return (
    <group ref={g}>
      <Text
        ref={text}
        font={BLOCK_WOFF}
        fontSize={7}
        anchorX="left"
        anchorY="bottom"
        position={[-4.2, 0, 0]}
        color="#ffffff"
        fillOpacity={0.85}
        letterSpacing={0.12}
      >
        HI!
      </Text>
    </group>
  );
}

// ── Round viewing platform (hero shot) ────────────────────────────────────
function Bastion() {
  const { platform, parapet } = useMemo(() => {
    const R = 7;
    const platform = new THREE.CylinderGeometry(R, R + 0.4, 6.5, 48);
    platform.translate(BASTION.x, -3.25, BASTION.z);
    const ring = new THREE.Shape();
    const a0 = Math.PI * 0.32;
    const a1 = Math.PI * 1.68;
    ring.absarc(0, 0, R, a0, a1, false);
    ring.absarc(0, 0, R - 0.55, a1, a0, true);
    const parapet = new THREE.ExtrudeGeometry(ring, { depth: 1.05, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, curveSegments: 48 });
    parapet.rotateX(-Math.PI / 2);
    parapet.translate(BASTION.x, 0, BASTION.z);
    return { platform, parapet };
  }, []);
  const stone = useMemo(() => grainMaterial("#c4a8c4", 3), []);
  const pave = useMemo(() => grainMaterial("#e7b9b3", 4), []);
  return (
    <group>
      <mesh geometry={platform} material={stone} castShadow receiveShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[BASTION.x, 0.01, BASTION.z]} material={pave} receiveShadow>
        <circleGeometry args={[6.9, 48]} />
      </mesh>
      <mesh geometry={parapet} material={stone} castShadow receiveShadow />
    </group>
  );
}

function Quays() {
  const { street, berge, walls } = useMemo(() => {
    const zLen = RIVER.zStart - RIVER.zEnd;
    const zMid = (RIVER.zStart + RIVER.zEnd) / 2;
    const s: THREE.BufferGeometry[] = [];
    const b: THREE.BufferGeometry[] = [];
    const w: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const st = worldBox(190, 6, zLen, 6);
      st.translate(side * (RIVER.berge + 95), -3, zMid);
      s.push(st);
      const be = worldBox(RIVER.berge - RIVER.halfWidth, 4, zLen, 4);
      be.translate(side * ((RIVER.berge + RIVER.halfWidth) / 2), BERGE_Y - 2, zMid);
      b.push(be);
      // stone parapet on top of the retaining wall
      const par = worldBox(0.7, 0.95, zLen - 2, 2);
      par.translate(side * (RIVER.berge + 0.35), 0.47, zMid);
      w.push(par);
      // low curb along the water's edge
      const curb = worldBox(0.5, 0.25, zLen, 2);
      curb.translate(side * (RIVER.halfWidth + 0.25), BERGE_Y + 0.12, zMid);
      w.push(curb);
    }
    // end wall where the river disappears under the plaza
    const end = worldBox(RIVER.berge * 2, 6, 1, 4);
    end.translate(0, -3, RIVER.zEnd - 0.5);
    w.push(end);
    return { street: merge(s), berge: merge(b), walls: merge(w) };
  }, []);
  const streetMat = useMemo(() => grainMaterial("#e2a7a0", 1.4), []);
  const bergeMat = useMemo(() => grainMaterial("#cf9ea6", 1.4), []);
  const wallMat = useMemo(() => grainMaterial("#c7aac5", 1.2), []);
  return (
    <group>
      <mesh geometry={street} material={streetMat} receiveShadow castShadow />
      <mesh geometry={berge} material={bergeMat} receiveShadow castShadow />
      <mesh geometry={walls} material={wallMat} receiveShadow castShadow />
    </group>
  );
}

export function ParisZone() {
  const buildings = useQuayBuildings();

  const trees = useMemo(() => {
    const r = rng(3);
    const street: { x: number; z: number }[] = [];
    const berge: { x: number; z: number; s: number }[] = [];
    for (let z = 58; z > -70; z -= 10) {
      street.push({ x: 23 + r() * 1.5, z }, { x: -23 - r() * 1.5, z: z - 5 });
      if (Math.abs(z - BRIDGE_Z) > 9) {
        berge.push({ x: 17.6, z: z - 2, s: 0.65 }, { x: -17.6, z: z - 7, s: 0.65 });
      }
    }
    const plaza: { x: number; z: number }[] = [];
    for (let i = 0; i < 12; i++) plaza.push({ x: (i % 2 ? 1 : -1) * (18 + r() * 14), z: -86 - i * 3 });
    const clearOfBastion = (p: { x: number; z: number }) => !(p.x > 0 && Math.abs(p.z - BASTION.z) < 10);
    return { street: street.filter(clearOfBastion), berge: berge.filter(clearOfBastion), plaza };
  }, []);

  const benches = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let z = 50; z > -70; z -= 12) {
      if (Math.abs(z - BRIDGE_Z) < 9) continue;
      if (Math.abs(z - BASTION.z) > 10) out.push([14.6, z, -Math.PI / 2]);
      out.push([-14.6, z - 6, Math.PI / 2]);
    }
    return out;
  }, []);

  const lamps = useMemo(() => {
    const street: [number, number][] = [];
    const berge: [number, number][] = [];
    for (let z = 44; z > -70; z -= 16) {
      if (Math.abs(z - 15) > 9) street.push([20.4, z]);
      street.push([-20.4, z - 8]);
      if (Math.abs(z - 4 - BRIDGE_Z) > 8 && Math.abs(z - 4 - BASTION.z) > 10) berge.push([18.4, z - 4]);
      if (Math.abs(z - 12 - BRIDGE_Z) > 8) berge.push([-18.4, z - 12]);
    }
    street.push([HERO_LAMP.x, HERO_LAMP.z]);
    return { street, berge };
  }, []);

  return (
    <group>
      <Quays />
      <Bastion />
      {/* river bed + water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.5, 2]}>
        <planeGeometry args={[30, 170]} />
        <meshStandardMaterial color="#1d2738" />
      </mesh>
      <RiverWater
        width={RIVER.halfWidth * 2 + 1}
        length={RIVER.zStart - RIVER.zEnd}
        position={[0, WATER_Y, (RIVER.zStart + RIVER.zEnd) / 2]}
      />


      <Bridge
        position={[0, 0, BRIDGE_Z]}
        arches={[
          [-24.5, 0.6, 1.8],
          [-16, BERGE_Y, 3.1],
          [0, WATER_Y, 6.6],
          [16, BERGE_Y, 3.1],
          [24.5, 0.6, 1.8],
        ]}
        half={28}
      >
        <ArchText radius={6.6} axisY={WATER_Y} />
      </Bridge>

      <City items={buildings} />
      <Trees points={trees.street} color="#9aa35a" />
      <Trees points={trees.berge} color="#a3a95f" />
      <Trees points={trees.plaza} color="#8f9a52" />
      <Benches points={benches} y={BERGE_Y} />
      <Lamps points={lamps.street} />
      <Lamps points={lamps.berge} y={BERGE_Y} />

      <Flock center={[0, 0, -95]} radius={34} height={24} count={10} />

      <Tower position={TOWER} />
      <FerrisWheel position={WHEEL} rotation={[0, 0.9, 0]} />
      <Kiosk position={[-15.5, 0, -152]} />

      <WelcomeText />
      <Letters text="ABOUT ME" size={4.2} position={[0, 0, -84]} />
      <RisingHi />
    </group>
  );
}
