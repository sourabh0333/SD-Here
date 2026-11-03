"use client";

import type { ThreeElements } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/** Vintage scooter, facing +z, origin on the ground. */
export function Scooter(props: ThreeElements["group"]) {
  const m = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: "#e3a63c", roughness: 0.35, metalness: 0.15 }),
      dark: new THREE.MeshStandardMaterial({ color: "#1d1b1d", roughness: 0.8 }),
      chrome: new THREE.MeshStandardMaterial({ color: "#d9d9de", roughness: 0.15, metalness: 1 }),
      seat: new THREE.MeshStandardMaterial({ color: "#6b3f2a", roughness: 0.7 }),
      light: new THREE.MeshStandardMaterial({ color: "#fff6dc", emissive: "#ffe7a8", emissiveIntensity: 1.2 }),
    }),
    [],
  );

  return (
    <group {...props}>
      {/* wheels */}
      {[0.66, -0.6].map((z) => (
        <group key={z} position={[0, 0.24, z]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={m.dark} castShadow>
            <torusGeometry args={[0.18, 0.07, 8, 20]} />
          </mesh>
          <mesh material={m.chrome} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.1, 12]} />
          </mesh>
        </group>
      ))}
      {/* rear body */}
      <mesh position={[0, 0.5, -0.45]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.85]} material={m.body} castShadow>
        <capsuleGeometry args={[0.24, 0.42, 6, 14]} />
      </mesh>
      {/* floorboard */}
      <mesh position={[0, 0.3, 0.12]} material={m.body} castShadow>
        <boxGeometry args={[0.36, 0.08, 0.7]} />
      </mesh>
      {/* leg shield */}
      <mesh position={[0, 0.66, 0.5]} rotation={[-0.25, 0, 0]} material={m.body} castShadow>
        <boxGeometry args={[0.44, 0.78, 0.09]} />
      </mesh>
      {/* front fender */}
      <mesh position={[0, 0.36, 0.66]} rotation={[0, 0, Math.PI / 2]} material={m.body} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.2, 14, 1, true, Math.PI, Math.PI]} />
      </mesh>
      {/* steering column */}
      <mesh position={[0, 0.9, 0.6]} rotation={[-0.3, 0, 0]} material={m.body} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.6, 10]} />
      </mesh>
      {/* handlebar */}
      <mesh position={[0, 1.17, 0.68]} rotation={[0, 0, Math.PI / 2]} material={m.chrome} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.72, 8]} />
      </mesh>
      {/* headlight */}
      <mesh position={[0, 1.15, 0.78]} rotation={[Math.PI / 2, 0, 0]} material={m.chrome}>
        <cylinderGeometry args={[0.1, 0.08, 0.1, 14]} />
      </mesh>
      <mesh position={[0, 1.15, 0.835]} rotation={[Math.PI / 2, 0, 0]} material={m.light}>
        <circleGeometry args={[0.085, 14]} />
      </mesh>
      {/* seat */}
      <mesh position={[0, 0.8, -0.32]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.45]} material={m.seat} castShadow>
        <capsuleGeometry args={[0.15, 0.4, 4, 10]} />
      </mesh>
      {/* tail light */}
      <mesh position={[0, 0.62, -0.88]} material={new THREE.MeshStandardMaterial({ color: "#c1272d", emissive: "#a01010" })}>
        <boxGeometry args={[0.14, 0.06, 0.04]} />
      </mesh>
    </group>
  );
}
