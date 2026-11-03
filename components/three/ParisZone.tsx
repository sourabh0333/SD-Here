"use client";

import { MeshReflectorMaterial, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "@/lib/geo";
import { scroll } from "@/lib/scroll";
import { window01 } from "@/lib/timeline";
import {
  BRIDGE_Z,
  RIVER,
  ROAD,
  STATUE,
  TOWER,
  WATER_Y,
  WHEEL,
} from "@/lib/world";
import { City, type Footprint } from "./City";
import { Avatar } from "./Avatar";
import { Bridge, Cafe, FerrisWheel, Lamps, Tower, Trees, Turbine } from "./Landmarks";
import { Letters } from "./Letters";

const PINKS = ["#e7a39c", "#df958f", "#eab0a6", "#d98b88", "#efbcb0", "#e29d93"];
const OLD = ["#e58f7a", "#de8070", "#ea9a83", "#d97766", "#efa58c"];

const LIGHT_FONT = "/fonts/orbitron-latin-700-normal.woff";

function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, offset: number, y: number, n = 400) {
  const pos: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    const a = p.clone().addScaledVector(side, offset - width / 2);
    const b = p.clone().addScaledVector(side, offset + width / 2);
    pos.push(a.x, y, a.z, b.x, y, b.z);
    if (i < n) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function useParisBuildings() {
  return useMemo(() => {
    const r = rng(42);
    const items: Footprint[] = [];
    const pick = (arr: string[]) => arr[Math.floor(r() * arr.length)];
    // Quay rows along the river (both banks, two deep).
    for (const side of [-1, 1]) {
      for (const [x0, hMin] of [
        [30, 13],
        [54, 17],
      ]) {
        let z = 60;
        while (z > -90) {
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
    // Skyline blocks behind the tower.
    for (let i = 0; i < 26; i++) {
      const x = -120 + i * 9.5 + r() * 2;
      if (Math.abs(x) < 26) continue;
      items.push({ x, z: -100 - r() * 30, w: 9, d: 12, h: 14 + r() * 10, color: pick(PINKS) });
    }
    // Old town along the ride.
    for (let i = 0; i < 70; i++) {
      const u = 0.36 + (i / 70) * 0.6;
      const p = ROAD.getPointAt(u);
      const t = ROAD.getTangentAt(u);
      const side = i % 2 === 0 ? 1 : -1;
      const nrm = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(side);
      const off = 15 + r() * 6;
      const c = p.clone().addScaledVector(nrm, off);
      if (c.distanceTo(new THREE.Vector3(WHEEL.x, 0, WHEEL.z)) < 24) continue;
      if (c.z > -135 && Math.abs(c.x) < 30) continue;
      const w = 9 + r() * 4;
      items.push({
        x: c.x,
        z: c.z,
        w,
        d: 11,
        h: 10 + r() * 14,
        rot: Math.atan2(t.x, t.z) + Math.PI / 2,
        color: pick(OLD),
        roof: r() > 0.5 ? "gable" : "mansard",
      });
    }
    // Back rows of the old town.
    for (let i = 0; i < 40; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      items.push({
        x: side * (40 + r() * 30),
        z: -150 - r() * 180,
        w: 10 + r() * 6,
        d: 12,
        h: 14 + r() * 16,
        rot: r() * 0.4,
        color: pick(OLD),
        roof: r() > 0.5 ? "gable" : "mansard",
      });
    }
    return items;
  }, []);
}

function WelcomeText() {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = window01(scroll.current, 0.075, 0.175, 0.025);
    if (g.current) g.current.visible = o > 0.001;
    g.current?.traverse((c) => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m && "opacity" in m) {
        m.transparent = true;
        m.opacity = o;
      }
    });
  });
  return (
    <group ref={g} position={[0, 3.4, -36]}>
      <Text font={LIGHT_FONT} fontSize={1.6} position={[0, 0.9, 0]} color="#ffffff" anchorX="center">
        Welcome
      </Text>
      <Text font={LIGHT_FONT} fontSize={0.75} position={[2.3, -0.35, 0]} color="#ffffff" anchorX="center">
        to my
      </Text>
      <Text font={LIGHT_FONT} fontSize={1.0} position={[-1.7, -0.55, 0]} color="#ffffff" anchorX="center">
        World
      </Text>
    </group>
  );
}

function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, (RIVER.zStart + RIVER.zEnd) / 2]} receiveShadow>
      <planeGeometry args={[RIVER.halfWidth * 2 + 2, RIVER.zStart - RIVER.zEnd + 2]} />
      <MeshReflectorMaterial
        resolution={512}
        mirror={0.6}
        mixStrength={3}
        mixBlur={1}
        blur={[200, 60]}
        roughness={0.6}
        depthScale={0}
        color="#46638f"
        metalness={0.5}
      />
    </mesh>
  );
}

export function ParisZone() {
  const buildings = useParisBuildings();
  const road = useMemo(() => ribbon(ROAD, 9, 0, 0.03), []);
  const lineL = useMemo(() => ribbon(ROAD, 0.3, -4.1, 0.05), []);
  const lineR = useMemo(() => ribbon(ROAD, 0.3, 4.1, 0.05), []);

  const trees = useMemo(() => {
    const r = rng(3);
    const quay: { x: number; z: number }[] = [];
    for (let z = 50; z > -70; z -= 11) {
      quay.push({ x: 19 + r() * 2, z });
      quay.push({ x: -19 - r() * 2, z: z - 5 });
    }
    const pines: { x: number; z: number }[] = [];
    for (let i = 0; i < 70; i++) {
      const u = 0.38 + r() * 0.6;
      const p = ROAD.getPointAt(u);
      const t = ROAD.getTangentAt(u);
      const side = r() > 0.5 ? 1 : -1;
      const nrm = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(side);
      const c = p.addScaledVector(nrm, 7 + r() * 4);
      pines.push({ x: c.x, z: c.z });
    }
    const plaza: { x: number; z: number }[] = [];
    for (let i = 0; i < 12; i++) plaza.push({ x: (i % 2 ? 1 : -1) * (18 + r() * 14), z: -85 - i * 3 });
    return { quay, pines, plaza };
  }, []);

  const lamps = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = 40; z > -70; z -= 16) {
      out.push([13.2, z], [-13.2, z - 8]);
    }
    out.push([13.4, 11]);
    return out;
  }, []);

  return (
    <group>
      {/* Quays */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (RIVER.halfWidth + 95), -2.5, 2]} receiveShadow castShadow>
          <boxGeometry args={[190, 5, 156]} />
          <meshStandardMaterial color="#e3a6a0" roughness={0.95} />
        </mesh>
      ))}
      {/* parapets */}
      {[-1, 1].map((s) => (
        <mesh key={`p${s}`} position={[s * (RIVER.halfWidth + 0.5), 0.5, -2]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 144]} />
          <meshStandardMaterial color="#c9adc6" roughness={0.9} />
        </mesh>
      ))}
      {/* river bed + water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, -2]}>
        <planeGeometry args={[30, 160]} />
        <meshStandardMaterial color="#26304a" />
      </mesh>
      <Water />

      {/* ground beyond the river */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -250]} receiveShadow>
        <planeGeometry args={[600, 350]} />
        <meshStandardMaterial color="#d98681" roughness={1} />
      </mesh>
      <mesh position={[0, -2.5, -75.5]} receiveShadow>
        <boxGeometry args={[RIVER.halfWidth * 2 + 2, 5, 1]} />
        <meshStandardMaterial color="#d9a19c" roughness={0.9} />
      </mesh>

      {/* Road */}
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#c4636a" roughness={0.95} />
      </mesh>
      <mesh geometry={lineL}>
        <meshStandardMaterial color="#f7e3e3" />
      </mesh>
      <mesh geometry={lineR}>
        <meshStandardMaterial color="#f7e3e3" />
      </mesh>

      <Bridge position={[0, 0, BRIDGE_Z]} />
      <Bridge position={[0, 0, 62]} color="#c3adc6" />

      <City items={buildings} />
      <Trees points={trees.quay} color="#9aa35a" />
      <Trees points={trees.plaza} color="#8f9a52" />
      <Trees points={trees.pines} kind="pine" color="#7e8f55" />
      <Lamps points={lamps} />

      <Tower position={TOWER} />
      <FerrisWheel position={WHEEL} rotation={[0, 0.9, 0]} />
      {[-70, -40, 45, 75].map((x, i) => (
        <Turbine key={x} position={[x, 0, -380 - i * 12]} rotation={[0, 0.3 * i, 0]} />
      ))}
      <Cafe points={[[16, -190], [19, -194], [16, -198], [20, -202], [-17, -240], [-20, -246]]} />

      <WelcomeText />
      <Letters text="ABOUT ME" size={4.2} position={[0, 0, -84]} />

      {/* "HI!" painted on the road */}
      <Text
        font="/fonts/archivo-black-latin-400-normal.woff"
        fontSize={7}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0.5, 0.07, -101]}
        color="#ffffff"
        fillOpacity={0.8}
        letterSpacing={0.1}
      >
        HI!
      </Text>

      {/* MY WORK + golden statue at the end of the road */}
      <Letters text="MY WORK" size={4.6} position={[0, 0, -330]} color="#c94f62" />
      <group position={STATUE}>
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[7, 8, 2, 24]} />
          <meshStandardMaterial color="#d6b7b4" />
        </mesh>
        <mesh position={[0, 18, 0]} castShadow>
          <cylinderGeometry args={[2.2, 3, 32, 20]} />
          <meshStandardMaterial color="#e4c8c0" roughness={0.6} />
        </mesh>
        <mesh position={[0, 34.5, 0]} castShadow>
          <cylinderGeometry args={[3.2, 2.6, 1.2, 20]} />
          <meshStandardMaterial color="#e4c8c0" />
        </mesh>
        <Avatar pose="raise" gold ring scale={3.4} position={[0, 35, 0]} />
      </group>
    </group>
  );
}
