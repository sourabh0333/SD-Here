"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { scroll } from "@/lib/scroll";
import { T } from "@/lib/timeline";
import { ABOUT_SPOT, HERO_SPOT, PLAZA, rideAt } from "@/lib/world";
import { Avatar } from "./Avatar";
import { Scooter } from "./Scooter";

/** Everyone that moves with the scroll: hero, rider, skydiver, host. */
export function Characters() {
  const scooter = useRef<THREE.Group>(null);
  const diver = useRef<THREE.Group>(null);
  const host = useRef<THREE.Group>(null);
  const rider = useRef<THREE.Group>(null);
  const look = new THREE.Vector3();

  useFrame(({ camera, clock }) => {
    const t = scroll.current;
    const isRiding = t > T.mount[0] + 0.012;
    if (host.current) host.current.visible = !isRiding;
    if (rider.current) rider.current.visible = isRiding;

    if (scooter.current) {
      const { pos, tan } = rideAt(t);
      scooter.current.position.copy(pos);
      const yaw = Math.atan2(tan.x, tan.z);
      scooter.current.rotation.y = yaw;
      // lean into the curves
      const ahead = rideAt(Math.min(1, t + 0.004)).tan;
      let turn = Math.atan2(ahead.x, ahead.z) - yaw;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn)); // wrap to [-π, π]
      const lean = THREE.MathUtils.clamp(-turn * 6, -0.35, 0.35);
      scooter.current.rotation.z = THREE.MathUtils.damp(
        scooter.current.rotation.z,
        isRiding ? lean : 0,
        4,
        0.016,
      );
      scooter.current.visible = t < T.statue[1];
    }

    if (diver.current) {
      const visible = t > T.skydive[0] && t < T.skydive[1] - 0.012;
      diver.current.visible = visible;
      if (visible) {
        camera.getWorldDirection(look);
        diver.current.position.copy(camera.position).addScaledVector(look, 9);
        diver.current.position.y -= 1.2;
        diver.current.rotation.set(
          -Math.PI / 2 + 0.35,
          Math.sin(clock.elapsedTime * 0.7) * 0.2,
          Math.sin(clock.elapsedTime * 0.9) * 0.12,
        );
      }
    }
  });

  return (
    <>
      {/* hero, looking out over the river */}
      <Avatar position={HERO_SPOT} rotation={[0, Math.PI + 0.25, 0]} />

      {/* about section host, next to the scooter */}
      <group ref={host}>
        <Avatar pose="wave" position={[ABOUT_SPOT.x + 1.6, 0, ABOUT_SPOT.z + 0.6]} rotation={[0, -0.25, 0]} />
      </group>

      <group ref={scooter}>
        <Scooter />
        <group ref={rider} visible={false}>
          <Avatar pose="ride" helmet position={[0, -0.1, -0.22]} />
        </group>
      </group>

      <group ref={diver}>
        <Avatar pose="fall" helmet position={[0, -1, 0]} />
      </group>

      {/* contact host behind the desk */}
      <group position={[PLAZA.x, 0, PLAZA.z + 4]}>
        <mesh position={[0, 0.55, 1.1]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 1.1, 1.3]} />
          <meshStandardMaterial color="#6c6f78" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.15, 1.1]}>
          <boxGeometry args={[3.6, 0.1, 1.5]} />
          <meshStandardMaterial color="#8a8d96" />
        </mesh>
        <Avatar pose="wave" scale={1.15} />
      </group>
    </>
  );
}
