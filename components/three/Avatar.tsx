"use client";

import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export type Pose = "stand" | "wave" | "ride" | "fall" | "raise";

type Joints = {
  spine: number[];
  head: number[];
  lShoulder: number[];
  rShoulder: number[];
  lElbow: number[];
  rElbow: number[];
  lHip: number[];
  rHip: number[];
  lKnee: number[];
  rKnee: number[];
};

const POSES: Record<Pose, Joints> = {
  stand: {
    spine: [0, 0, 0],
    head: [0, 0, 0],
    lShoulder: [0.05, 0, 0.1],
    rShoulder: [0.05, 0, -0.1],
    lElbow: [-0.15, 0, 0],
    rElbow: [-0.15, 0, 0],
    lHip: [0, 0, 0.04],
    rHip: [0, 0, -0.04],
    lKnee: [0, 0, 0],
    rKnee: [0, 0, 0],
  },
  wave: {
    spine: [0, 0, 0],
    head: [0.05, 0, 0],
    lShoulder: [0.05, 0, 0.1],
    rShoulder: [0, 0, -2.5],
    lElbow: [-0.15, 0, 0],
    rElbow: [0, 0, -0.6],
    lHip: [0, 0, 0.04],
    rHip: [0, 0, -0.04],
    lKnee: [0, 0, 0],
    rKnee: [0, 0, 0],
  },
  ride: {
    spine: [0.18, 0, 0],
    head: [-0.15, 0, 0],
    lShoulder: [-1.05, 0, 0.12],
    rShoulder: [-1.05, 0, -0.12],
    lElbow: [-0.35, 0, 0],
    rElbow: [-0.35, 0, 0],
    lHip: [-1.45, 0, 0.12],
    rHip: [-1.45, 0, -0.12],
    lKnee: [1.35, 0, 0],
    rKnee: [1.35, 0, 0],
  },
  fall: {
    spine: [-0.2, 0, 0],
    head: [-0.5, 0, 0],
    lShoulder: [-0.2, 0, 1.25],
    rShoulder: [-0.2, 0, -1.25],
    lElbow: [0, 0, 0.5],
    rElbow: [0, 0, -0.5],
    lHip: [0.2, 0, 0.45],
    rHip: [0.2, 0, -0.45],
    lKnee: [0.6, 0, 0],
    rKnee: [0.6, 0, 0],
  },
  raise: {
    spine: [0, 0, 0],
    head: [-0.35, 0, 0],
    lShoulder: [0, 0, 2.75],
    rShoulder: [0, 0, -2.75],
    lElbow: [0, 0, 0.55],
    rElbow: [0, 0, -0.55],
    lHip: [0, 0, 0.03],
    rHip: [0, 0, -0.03],
    lKnee: [0, 0, 0],
    rKnee: [0, 0, 0],
  },
};

const COLORS = {
  jacket: "#3a383e",
  jeans: "#24242b",
  skin: "#c8937a",
  shirt: "#ece7e2",
  hair: "#3a2a22",
  shoes: "#1b1919",
  helmet: "#e5782d",
};

type Props = ThreeElements["group"] & {
  pose?: Pose;
  helmet?: boolean;
  gold?: boolean;
  ring?: boolean;
};

export function Avatar({ pose = "stand", helmet, gold, ring, ...props }: Props) {
  const mats = useMemo(() => {
    const make = (c: string, rough = 0.85) =>
      gold
        ? new THREE.MeshStandardMaterial({ color: "#d9a441", metalness: 1, roughness: 0.28 })
        : new THREE.MeshStandardMaterial({ color: c, roughness: rough, flatShading: true });
    return {
      jacket: make(COLORS.jacket),
      jeans: make(COLORS.jeans),
      skin: make(COLORS.skin, 0.7),
      shirt: make(COLORS.shirt),
      hair: make(COLORS.hair),
      shoes: make(COLORS.shoes),
      helmet: gold ? make("") : new THREE.MeshStandardMaterial({ color: COLORS.helmet, roughness: 0.35, metalness: 0.2 }),
    };
  }, [gold]);

  const joints = useRef<Partial<Record<keyof Joints, THREE.Group>>>({});
  const root = useRef<THREE.Group>(null);
  // Callback ref per joint; snaps to the pose on mount so nothing "flops in".
  const bind = (key: keyof Joints) => (g: THREE.Group | null) => {
    if (!g) return;
    // Runs when React attaches the node, not during render.
    // eslint-disable-next-line react-hooks/refs
    joints.current[key] = g;
    const [x, y, z] = POSES[pose][key];
    g.rotation.set(x, y, z);
  };

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const target = POSES[pose];
    for (const key of Object.keys(target) as (keyof Joints)[]) {
      const g = joints.current[key];
      if (!g) continue;
      const [x, y, z] = target[key];
      let ox = 0;
      let oz = 0;
      if (pose === "stand" || pose === "wave") {
        if (key === "spine") ox = Math.sin(t * 1.4) * 0.015;
        if (key === "head") oz = Math.sin(t * 0.7) * 0.05;
      }
      if (pose === "wave" && key === "rElbow") oz = Math.sin(t * 7) * 0.45;
      if (pose === "wave" && key === "rShoulder") oz = Math.sin(t * 7 + 0.5) * 0.08;
      if (pose === "fall") {
        if (key === "lShoulder" || key === "rShoulder") ox = Math.sin(t * 9) * 0.06;
        if (key === "lKnee" || key === "rKnee") ox = Math.sin(t * 8 + 1) * 0.08;
      }
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, x + ox, 8, 0.016);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, y, 8, 0.016);
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, z + oz, 8, 0.016);
    }
    if (root.current && (pose === "stand" || pose === "wave")) {
      root.current.position.y = Math.sin(t * 1.4) * 0.006;
    }
  });

  const limb = (len: number, r: number) => (
    <capsuleGeometry args={[r, Math.max(0.01, len - r * 2), 4, 8]} />
  );

  return (
    <group {...props}>
      <group ref={root}>
        {/* pelvis */}
        <mesh position={[0, 0.95, 0]} material={mats.jeans} castShadow>
          <boxGeometry args={[0.36, 0.2, 0.22]} />
        </mesh>

        {/* legs */}
        {([1, -1] as const).map((s) => (
          <group key={s} ref={bind(s === 1 ? "lHip" : "rHip")} position={[0.1 * s, 0.93, 0]}>
            <mesh position={[0, -0.22, 0]} material={mats.jeans} castShadow>
              {limb(0.48, 0.085)}
            </mesh>
            <group ref={bind(s === 1 ? "lKnee" : "rKnee")} position={[0, -0.46, 0]}>
              <mesh position={[0, -0.21, 0]} material={mats.jeans} castShadow>
                {limb(0.45, 0.07)}
              </mesh>
              <mesh position={[0, -0.44, 0.06]} material={mats.shoes} castShadow>
                <boxGeometry args={[0.12, 0.08, 0.27]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* upper body */}
        <group ref={bind("spine")} position={[0, 1.02, 0]}>
          <mesh position={[0, 0.02, 0]} material={mats.shirt} castShadow>
            <boxGeometry args={[0.37, 0.08, 0.22]} />
          </mesh>
          <mesh position={[0, 0.3, 0]} material={mats.jacket} castShadow>
            <capsuleGeometry args={[0.19, 0.3, 4, 10]} />
          </mesh>
          <mesh position={[0, 0.28, 0]} scale={[1.18, 1, 0.72]} material={mats.jacket} castShadow>
            <capsuleGeometry args={[0.19, 0.28, 4, 10]} />
          </mesh>
          {/* neck + head */}
          <group ref={bind("head")} position={[0, 0.56, 0]}>
            <mesh position={[0, 0.03, 0]} material={mats.skin}>
              <cylinderGeometry args={[0.055, 0.06, 0.1, 8]} />
            </mesh>
            <mesh position={[0, 0.17, 0.01]} scale={[0.92, 1.08, 1]} material={mats.skin} castShadow>
              <icosahedronGeometry args={[0.125, 2]} />
            </mesh>
            {/* beard */}
            <mesh position={[0, 0.11, 0.035]} scale={[0.9, 0.7, 0.9]} material={mats.hair}>
              <icosahedronGeometry args={[0.112, 1]} />
            </mesh>
            {/* nose */}
            <mesh position={[0, 0.16, 0.13]} material={mats.skin}>
              <coneGeometry args={[0.022, 0.06, 4]} />
            </mesh>
            {helmet ? (
              <mesh position={[0, 0.2, 0]} material={mats.helmet} castShadow>
                <sphereGeometry args={[0.155, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
              </mesh>
            ) : (
              <mesh position={[0, 0.2, -0.005]} material={mats.hair}>
                <sphereGeometry args={[0.132, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
              </mesh>
            )}
          </group>

          {/* arms */}
          {([1, -1] as const).map((s) => (
            <group
              key={s}
              ref={bind(s === 1 ? "lShoulder" : "rShoulder")}
              position={[0.25 * s, 0.46, 0]}
            >
              <mesh position={[0, -0.15, 0]} material={mats.jacket} castShadow>
                {limb(0.34, 0.07)}
              </mesh>
              <group ref={bind(s === 1 ? "lElbow" : "rElbow")} position={[0, -0.31, 0]}>
                <mesh position={[0, -0.13, 0]} material={mats.jacket} castShadow>
                  {limb(0.29, 0.06)}
                </mesh>
                <mesh position={[0, -0.3, 0]} material={mats.skin}>
                  <icosahedronGeometry args={[0.05, 1]} />
                </mesh>
              </group>
            </group>
          ))}

          {ring && (
            <mesh position={[0, 1.38, 0]} material={mats.helmet} castShadow>
              <torusGeometry args={[0.3, 0.07, 10, 28]} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}
