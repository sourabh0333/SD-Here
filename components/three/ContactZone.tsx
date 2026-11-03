"use client";

import { Center, Float, Text, Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { content } from "@/lib/content";
import { beam, merge, rng } from "@/lib/geo";
import { PLAZA } from "@/lib/world";
import { City, type Footprint } from "./City";
import { Cafe, Trees } from "./Landmarks";
import { BLOCK_FONT, Letters } from "./Letters";

const PASTELS = ["#cfd8e6", "#e8e3d6", "#d9e2ef", "#f0ece4", "#c7d1e0", "#e2d6d9", "#d5dcd0"];

function AtomSculpture(props: { position: THREE.Vector3Tuple }) {
  const { spheres, tubes } = useMemo(() => {
    const a = 13;
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 1, 1).normalize(),
      new THREE.Vector3(0, 1, 0),
    );
    const lift = (Math.sqrt(3) * a) / 2 + 4;
    const corners: THREE.Vector3[] = [];
    for (const x of [-1, 1])
      for (const y of [-1, 1])
        for (const z of [-1, 1])
          corners.push(
            new THREE.Vector3(x, y, z).multiplyScalar(a / 2).applyQuaternion(q).add(new THREE.Vector3(0, lift, 0)),
          );
    const center = new THREE.Vector3(0, lift, 0);
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      parts.push(beam(center, corners[i], 0.7));
      for (let j = i + 1; j < 8; j++) {
        if (Math.abs(corners[i].distanceTo(corners[j]) - a) < 0.01) parts.push(beam(corners[i], corners[j], 0.7));
      }
    }
    // supports
    const low = corners.reduce((m, c) => (c.y < m.y ? c : m), corners[0]);
    for (let k = 0; k < 3; k++) {
      const ang = (k / 3) * Math.PI * 2;
      const foot = new THREE.Vector3(Math.cos(ang) * 6, 0, Math.sin(ang) * 6);
      parts.push(beam(foot, low.clone().add(new THREE.Vector3(Math.cos(ang) * 4, 4, Math.sin(ang) * 4)), 0.9));
    }
    return { spheres: [center, ...corners], tubes: merge(parts) };
  }, []);

  return (
    <group position={props.position}>
      {spheres.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[2.3, 32, 24]} />
          <meshStandardMaterial color="#e9ecf2" metalness={1} roughness={0.12} />
        </mesh>
      ))}
      <mesh geometry={tubes} castShadow>
        <meshStandardMaterial color="#dfe3ea" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ContactIcon({
  glyph,
  label,
  url,
  position,
}: {
  glyph: string;
  label: string;
  url: string;
  position: THREE.Vector3Tuple;
}) {
  const [hover, setHover] = useState(false);
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    const s = THREE.MathUtils.damp(g.current.scale.x, hover ? 1.15 : 1, 8, dt);
    g.current.scale.setScalar(s);
  });
  return (
    <Float speed={2} floatIntensity={0.6} rotationIntensity={0.25}>
      <group
        ref={g}
        position={position}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, url.startsWith("mailto:") ? "_self" : "_blank");
        }}
      >
        <mesh>
          <torusGeometry args={[2.3, 0.35, 16, 48]} />
          <meshStandardMaterial color={hover ? "#f29bbb" : "#e6aac0"} metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh>
          <circleGeometry args={[2.2, 40]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        <Center position={[0, 0, 0.1]}>
          <Text3D font={BLOCK_FONT} size={glyph.length > 1 ? 1.5 : 2.1} height={0.4} bevelEnabled bevelSize={0.03} bevelThickness={0.05}>
            {glyph}
            <meshStandardMaterial color="#d0567f" roughness={0.4} />
          </Text3D>
        </Center>
        <Text
          font="/fonts/orbitron-latin-700-normal.woff"
          fontSize={0.6}
          position={[0, -3.3, 0]}
          color="#ffffff"
          outlineWidth={0.03}
          outlineColor="#7a5d7a"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

function Cars() {
  const cars = useRef<THREE.Group>(null);
  const colors = ["#a7b3c9", "#d8c39a", "#7f8ca6", "#e4b7c4", "#b5c8b0"];
  useFrame(({ clock }) => {
    if (!cars.current) return;
    const t = clock.elapsedTime * 0.06;
    cars.current.children.forEach((c, i) => {
      const a = t + (i / colors.length) * Math.PI * 2;
      const r = 42;
      c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      c.rotation.y = -a;
    });
  });
  return (
    <group ref={cars} position={[PLAZA.x, 0, PLAZA.z]}>
      {colors.map((c) => (
        <group key={c}>
          <group rotation={[0, 0, 0]}>
            <mesh position={[0, 0.85, 0]} castShadow>
              <boxGeometry args={[2, 0.9, 4.2]} />
              <meshStandardMaterial color={c} roughness={0.35} metalness={0.3} />
            </mesh>
            <mesh position={[0, 1.6, -0.3]} castShadow>
              <boxGeometry args={[1.8, 0.7, 2.4]} />
              <meshStandardMaterial color="#9fb3cc" roughness={0.1} metalness={0.6} />
            </mesh>
            {[
              [-0.95, 1.3],
              [0.95, 1.3],
              [-0.95, -1.3],
              [0.95, -1.3],
            ].map(([x, z]) => (
              <mesh key={`${x}${z}`} position={[x, 0.42, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.42, 0.42, 0.3, 12]} />
                <meshStandardMaterial color="#222" />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

export function ContactZone() {
  const P = PLAZA;
  const buildings = useMemo(() => {
    const r = rng(9);
    const items: Footprint[] = [];
    for (const [radius, count, hMin] of [
      [64, 34, 10],
      [86, 44, 16],
    ]) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        if (Math.sin(a) > 0.86 && radius < 70) continue; // keep the view open toward the camera
        items.push({
          x: P.x + Math.cos(a) * radius,
          z: P.z + Math.sin(a) * radius,
          w: (radius * Math.PI * 2) / count - 0.3,
          d: 12,
          h: hMin + r() * 9,
          rot: -a - Math.PI / 2,
          color: PASTELS[Math.floor(r() * PASTELS.length)],
          roof: "gable",
          roofColor: "#7d8799",
        });
      }
    }
    return items;
  }, [P]);

  const trees = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      out.push({ x: P.x + Math.cos(a) * 52, z: P.z + Math.sin(a) * 52 });
    }
    return out;
  }, [P]);

  const icons: THREE.Vector3Tuple[] = [
    [P.x - 9.5, 14, P.z - 5],
    [P.x + 9.5, 14, P.z - 5],
    [P.x, 18.5, P.z - 7],
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[P.x, 0, P.z]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#e9ebf1" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[P.x, 0.02, P.z]} receiveShadow>
        <ringGeometry args={[38, 46, 64]} />
        <meshStandardMaterial color="#b8bfcd" roughness={1} />
      </mesh>
      {/* crosswalk */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[P.x - 5 + i * 2, 0.04, P.z + 42]}>
          <planeGeometry args={[1.1, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}

      <City items={buildings} />
      <Trees points={trees} color="#9cbf86" />
      <Cafe
        color="#f2b5c8"
        points={[
          [P.x - 22, P.z - 10],
          [P.x - 26, P.z - 4],
          [P.x - 20, P.z + 2],
          [P.x + 22, P.z - 12],
          [P.x + 26, P.z - 5],
          [P.x + 21, P.z + 1],
        ]}
      />

      <AtomSculpture position={[P.x, 0, P.z - 20]} />
      <Letters text="GET IN TOUCH" size={3.6} position={[P.x, 0, P.z - 8]} color="#ec8fb2" />

      {content.contacts.map((c, i) => (
        <ContactIcon key={c.label} glyph={c.glyph} label={c.label} url={c.url} position={icons[i % icons.length]} />
      ))}

      <Cars />
    </group>
  );
}
