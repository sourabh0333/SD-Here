"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { scroll } from "@/lib/scroll";
import { T, range } from "@/lib/timeline";
import { ABOUT_SPOT, HERO_SPOT, PLAZA, rideAt } from "@/lib/world";
import { Human } from "./Human";
import { Scooter } from "./Scooter";

// Reveal curves (stable functions so the avatar materials aren't rebuilt).
const hostReveal = () => {
  const t = scroll.current;
  if (t < T.mount[0]) return range(t, T.reveal[0], T.reveal[1]);
  return 1 - range(t, T.mount[0], T.mount[0] + 0.014);
};
const riderReveal = () => range(scroll.current, T.mount[0] + 0.012, T.mount[1]);

/** Everyone that moves with the scroll: hero, host, rider, skydiver, contact host. */
export function Characters() {
  const scooter = useRef<THREE.Group>(null);
  const diver = useRef<THREE.Group>(null);
  const host = useRef<THREE.Group>(null);
  const rider = useRef<THREE.Group>(null);
  const hero = useRef<THREE.Group>(null);
  const look = useRef(new THREE.Vector3());

  useFrame(({ camera, clock }) => {
    const t = scroll.current;
    if (hero.current) hero.current.visible = t < 0.12;
    if (host.current) host.current.visible = t > T.reveal[0] - 0.005 && t < T.mount[0] + 0.016;
    if (rider.current) rider.current.visible = t > T.mount[0] + 0.01;

    if (scooter.current) {
      const { pos, tan } = rideAt(t);
      scooter.current.position.copy(pos);
      const yaw = Math.atan2(tan.x, tan.z);
      scooter.current.rotation.y = yaw;
      const ahead = rideAt(Math.min(1, t + 0.004)).tan;
      let turn = Math.atan2(ahead.x, ahead.z) - yaw;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      const lean = THREE.MathUtils.clamp(-turn * 6, -0.3, 0.3);
      const riding = t > T.ride[0];
      scooter.current.rotation.z = THREE.MathUtils.damp(scooter.current.rotation.z, riding ? lean : 0, 4, 0.016);
      scooter.current.visible = t > 0.2 && t < T.statue[0] + 0.02;
    }

    if (diver.current) {
      const visible = t > T.skydive[0] && t < T.reveal3d[0] + 0.004;
      diver.current.visible = visible;
      if (visible) {
        camera.getWorldDirection(look.current);
        diver.current.position.copy(camera.position).addScaledVector(look.current, 8.5);
        diver.current.position.y -= 0.6;
        diver.current.rotation.set(
          Math.PI / 2 - 0.25,
          Math.sin(clock.elapsedTime * 0.7) * 0.15,
          Math.PI + Math.sin(clock.elapsedTime * 0.9) * 0.1,
        );
      }
    }
  });

  return (
    <>
      {/* hero on the round quay, hand on the lamp post, looking at the tower */}
      <group ref={hero}>
        <Human pose="lean" position={HERO_SPOT} rotation={[0, Math.PI + 0.2, 0]} />
      </group>

      {/* about host, materialises next to the scooter */}
      <group ref={host}>
        <Human
          pose="wave"
          reveal={hostReveal}
          position={[ABOUT_SPOT.x + 1.7, 0, ABOUT_SPOT.z + 0.8]}
          rotation={[0, -0.3, 0]}
        />
      </group>

      <group ref={scooter}>
        <Scooter />
        <group ref={rider} visible={false}>
          <Human pose="ride" helmet reveal={riderReveal} position={[0, 0.98, -0.3]} />
        </group>
      </group>

      <group ref={diver}>
        <Human pose="fall" backpack />
      </group>

      {/* contact host behind the desk */}
      <group position={[PLAZA.x, 0, PLAZA.z + 4]}>
        <mesh position={[0, 0.55, 1.1]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 1.1, 1.3]} />
          <meshStandardMaterial color="#5f636e" roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.15, 1.1]} castShadow>
          <boxGeometry args={[3.6, 0.1, 1.5]} />
          <meshStandardMaterial color="#8a8d96" roughness={0.4} />
        </mesh>
        {/* laptop */}
        <group position={[0.6, 1.2, 1.2]} rotation={[0, Math.PI, 0]}>
          <mesh>
            <boxGeometry args={[0.7, 0.03, 0.48]} />
            <meshStandardMaterial color="#c8ccd4" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.22, -0.23]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.7, 0.46, 0.02]} />
            <meshStandardMaterial color="#c8ccd4" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
        <Human pose="wave" scale={1.1} />
      </group>
    </>
  );
}
