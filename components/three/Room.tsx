"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { grainMaterial, merge, worldBox } from "@/lib/geo";
import { scroll } from "@/lib/scroll";
import { T, range } from "@/lib/timeline";
import { PLAZA, ROOM } from "@/lib/world";
import { LIGHT_FONT } from "./ParisZone";

const W = ROOM.halfWidth;
const F = ROOM.floor;
const H = ROOM.height;
const D = ROOM.depth;

/**
 * The finale: a townhouse on the plaza whose window the camera flies through,
 * into a cosy room that says "Thank You For Visiting".
 */
export function Room() {
  const P = PLAZA;
  const z0 = P.z + ROOM.z; // facade plane
  const textRef = useRef<THREE.Group>(null);

  const shell = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    // facade with a window hole
    const s = new THREE.Shape();
    s.moveTo(-W - 2, 0);
    s.lineTo(W + 2, 0);
    s.lineTo(W + 2, 22);
    s.lineTo(0, 28);
    s.lineTo(-W - 2, 22);
    s.lineTo(-W - 2, 0);
    const hole = new THREE.Path();
    hole.moveTo(-1.8, 11);
    hole.lineTo(1.8, 11);
    hole.lineTo(1.8, 15.2);
    hole.lineTo(-1.8, 15.2);
    hole.lineTo(-1.8, 11);
    s.holes.push(hole);
    // decorative (closed) windows on the facade
    const facade = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false });
    const uv = facade.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    facade.translate(P.x, 0, z0 - 0.8);
    parts.push(facade);
    // side walls, back wall, slabs (their inner faces are hidden by the room liner)
    const left = worldBox(2, 22, D + 2);
    left.translate(P.x - W - 1, 11, z0 - D / 2 - 1);
    const right = worldBox(2, 22, D + 2);
    right.translate(P.x + W + 1, 11, z0 - D / 2 - 1);
    const back = worldBox(2 * W + 4, 22, 2);
    back.translate(P.x, 11, z0 - D - 1);
    const floor = worldBox(2 * W, F, D);
    floor.translate(P.x, F / 2, z0 - D / 2 - 0.8);
    const ceil = worldBox(2 * W, 22 - F - H, D);
    ceil.translate(P.x, F + H + (22 - F - H) / 2, z0 - D / 2 - 0.8);
    parts.push(left, right, back, floor, ceil);
    return merge(parts);
  }, [P, z0]);

  const facadeMat = useMemo(() => grainMaterial("#cdd8e8", 1), []);

  const furniture = useMemo(() => {
    const wood: THREE.BufferGeometry[] = [];
    const fabric: THREE.BufferGeometry[] = [];
    const pink: THREE.BufferGeometry[] = [];
    const zIn = z0 - 0.8;
    const zBack = z0 - D;
    // bookshelves along both walls
    for (const side of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const cz = zIn - 3.5 - k * 6;
        const frame = new THREE.BoxGeometry(0.5, 3.6, 4.4);
        frame.translate(P.x + side * (W - 0.3), F + 1.8, cz);
        wood.push(frame);
        for (let sh = 0; sh < 4; sh++) {
          const books = new THREE.BoxGeometry(0.35, 0.55, 3.6);
          books.translate(P.x + side * (W - 0.6), F + 0.45 + sh * 0.85, cz);
          (sh % 2 ? pink : fabric).push(books);
        }
      }
      // picture frames on the walls
      for (let k = 0; k < 3; k++) {
        const fr = new THREE.BoxGeometry(0.06, 0.8 + (k % 2) * 0.4, 1.1);
        fr.translate(P.x + side * (W - 0.05), F + 3.6 + (k % 2) * 0.3, zIn - 14 - k * 1.6);
        pink.push(fr);
      }
    }
    // sofa facing the back window
    const seat = new THREE.BoxGeometry(4.2, 0.5, 1.6);
    seat.translate(P.x, F + 0.45, zIn - 15);
    const backrest = new THREE.BoxGeometry(4.2, 1.1, 0.4);
    backrest.translate(P.x, F + 0.95, zIn - 14.3);
    const arms = [-1, 1].map((sx) => {
      const a = new THREE.BoxGeometry(0.4, 0.8, 1.6);
      a.translate(P.x + sx * 2.1, F + 0.6, zIn - 15);
      return a;
    });
    fabric.push(seat, backrest, ...arms);
    // coffee table + armchair
    const table = new THREE.CylinderGeometry(0.7, 0.7, 0.08, 24);
    table.translate(P.x + 2.6, F + 0.5, zIn - 17.5);
    const leg = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    leg.translate(P.x + 2.6, F + 0.25, zIn - 17.5);
    wood.push(table, leg);
    const chair = new THREE.BoxGeometry(1.2, 0.9, 1.2);
    chair.translate(P.x - 3.6, F + 0.45, zIn - 18.5);
    pink.push(chair);
    // curtains framing the back window
    for (const sx of [-1, 1]) {
      const c = new THREE.BoxGeometry(1.1, 4.4, 0.15);
      c.translate(P.x + sx * 2.2, F + 3.2, zBack + 0.5);
      pink.push(c);
    }
    return { wood: merge(wood), fabric: merge(fabric), pink: merge(pink) };
  }, [P, z0]);

  useFrame(() => {
    const k = range(scroll.current, T.thanks[0], T.thanks[1] - 0.005);
    textRef.current?.traverse((c) => {
      const m = c as THREE.Mesh & { fillOpacity?: number };
      if (m.fillOpacity !== undefined) m.fillOpacity = k;
    });
  });

  const zIn = z0 - 0.8;
  const zBack = z0 - D;
  return (
    <group>
      <mesh geometry={shell} material={facadeMat} castShadow receiveShadow />
      {/* window frame + sill on the facade */}
      <mesh position={[P.x, 10.85, z0 + 0.15]} castShadow>
        <boxGeometry args={[4.4, 0.3, 0.6]} />
        <meshStandardMaterial color="#eef2f8" roughness={0.6} />
      </mesh>

      {/* interior liner */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[P.x, F + 0.01, zIn - D / 2]} receiveShadow>
          <planeGeometry args={[2 * W, D]} />
          <meshStandardMaterial color="#4f5d75" roughness={0.55} envMapIntensity={0.12} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[P.x, F + H - 0.01, zIn - D / 2]}>
          <planeGeometry args={[2 * W, D]} />
          <meshStandardMaterial color="#8696b0" roughness={0.9} envMapIntensity={0.12} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} rotation={[0, -s * (Math.PI / 2), 0]} position={[P.x + s * (W - 0.01), F + H / 2, zIn - D / 2]}>
            <planeGeometry args={[D, H]} />
            <meshStandardMaterial color="#7e8fac" roughness={0.9} envMapIntensity={0.12} />
          </mesh>
        ))}
        <mesh position={[P.x, F + H / 2, zBack + 0.02]}>
          <planeGeometry args={[2 * W, H]} />
          <meshStandardMaterial color="#6f7f9c" roughness={0.9} envMapIntensity={0.12} />
        </mesh>
        {/* glowing back window */}
        <mesh position={[P.x, F + 3.3, zBack + 0.04]}>
          <planeGeometry args={[2.4, 3.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffd9e4" emissiveIntensity={1.6} />
        </mesh>
        {/* rug */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[P.x, F + 0.02, zIn - 17]}>
          <planeGeometry args={[4.6, 3]} />
          <meshStandardMaterial color="#e2708f" roughness={1} envMapIntensity={0.15} />
        </mesh>
        <mesh geometry={furniture.wood} castShadow>
          <meshStandardMaterial color="#3a4256" roughness={0.6} envMapIntensity={0.15} />
        </mesh>
        <mesh geometry={furniture.fabric} castShadow>
          <meshStandardMaterial color="#5e6b84" roughness={0.95} envMapIntensity={0.15} />
        </mesh>
        <mesh geometry={furniture.pink} castShadow>
          <meshStandardMaterial color="#e57c98" roughness={0.8} envMapIntensity={0.15} />
        </mesh>
        {/* pendant lamp */}
        <mesh position={[P.x, F + H - 0.6, zIn - 9]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[P.x, F + H - 1.25, zIn - 9]}>
          <coneGeometry args={[0.6, 0.45, 24, 1, true]} />
          <meshStandardMaterial color="#e57c98" side={THREE.DoubleSide} emissive="#ffb7c9" emissiveIntensity={0.4} />
        </mesh>
        <pointLight position={[P.x, F + H - 1.6, zIn - 9]} color="#ffd6e0" intensity={9} distance={20} decay={2} />
        <pointLight position={[P.x, F + 2.6, zBack + 1.8]} color="#ffc9d8" intensity={7} distance={10} decay={2} />
      </group>

      <group ref={textRef}>
        <Text font={LIGHT_FONT} fontSize={0.5} letterSpacing={0.15} position={[P.x, F + 5.2, zBack + 0.06]} color="#ffffff" fillOpacity={0}>
          Thank You
        </Text>
        <Text font={LIGHT_FONT} fontSize={0.5} letterSpacing={0.15} position={[P.x, F + 1.42, zBack + 0.06]} color="#ffffff" fillOpacity={0}>
          For Visiting
        </Text>
      </group>
    </group>
  );
}
