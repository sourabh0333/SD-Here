"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { scroll } from "@/lib/scroll";

/** Shared sun direction (updated by the atmosphere every frame). */
export const sunDirection = new THREE.Vector3(0.05, 0.06, -1).normalize();

// ── River surface: real-time reflections, rolling normals, sun glint ───────
export function RiverWater({
  width,
  length,
  position,
}: {
  width: number;
  length: number;
  position: [number, number, number];
}) {
  const normals = useTexture("/textures/waternormals.jpg");
  const water = useMemo(() => {
    normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
    const w = new Water(new THREE.PlaneGeometry(width, length), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunDirection: sunDirection.clone(),
      sunColor: 0xffd7b0,
      waterColor: 0x2b4466,
      distortionScale: 2.6,
      alpha: 0.96,
      fog: true,
    });
    w.rotation.x = -Math.PI / 2;
    w.receiveShadow = true;
    const u = w.material.uniforms;
    u.size.value = 2.2;
    return w;
  }, [normals, width, length]);

  useEffect(() => () => water.material.dispose(), [water]);

  useFrame((_, dt) => {
    const u = water.material.uniforms;
    u.time.value += dt * 0.55;
    u.sunDirection.value.copy(sunDirection);
    // skip the reflection pass when the river is far behind us
    water.visible = scroll.current < 0.26;
  });

  return <primitive object={water} position={position} />;
}

// ── Flocks of birds (morph-target animated) ────────────────────────────────
const BIRD_URLS = ["/models/Stork.glb", "/models/Flamingo.glb"];

function Bird({
  url,
  center,
  radius,
  height,
  speed,
  phase,
  scale,
}: {
  url: string;
  center: THREE.Vector3;
  radius: number;
  height: number;
  speed: number;
  phase: number;
  scale: number;
}) {
  const { scene, animations } = useGLTF(url);
  const { obj, mixer } = useMemo(() => {
    const obj = scene.clone(true);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = new THREE.MeshStandardMaterial({ color: "#3b2c34", roughness: 0.9 });
        m.castShadow = false;
      }
    });
    const mixer = new THREE.AnimationMixer(obj);
    const action = mixer.clipAction(animations[0]);
    action.setDuration(0.9 + Math.random() * 0.4).play();
    action.time = Math.random();
    return { obj, mixer };
  }, [scene, animations]);
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }, dt) => {
    mixer.update(dt);
    if (!ref.current) return;
    const a = clock.elapsedTime * speed + phase;
    ref.current.position.set(
      center.x + Math.cos(a) * radius,
      center.y + height + Math.sin(a * 2.3) * 1.2,
      center.z + Math.sin(a) * radius * 0.6,
    );
    // face the direction of travel
    const dx = -Math.sin(a) * radius;
    const dz = Math.cos(a) * radius * 0.6;
    ref.current.rotation.y = Math.atan2(dx * Math.sign(speed), dz * Math.sign(speed));
  });

  return (
    <group ref={ref} scale={scale}>
      <primitive object={obj} />
    </group>
  );
}

export function Flock({
  center,
  count = 9,
  radius = 26,
  height = 22,
  seed = 1,
}: {
  center: [number, number, number];
  count?: number;
  radius?: number;
  height?: number;
  seed?: number;
}) {
  const c = useMemo(() => new THREE.Vector3(...center), [center]);
  const birds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        url: BIRD_URLS[(i + seed) % 2],
        radius: radius * (0.7 + ((i * 37 + seed * 11) % 10) / 25),
        height: height + ((i * 13) % 7),
        speed: 0.12 + ((i * 7) % 5) * 0.01,
        phase: i * 0.32 + seed,
        scale: 0.011 + ((i * 3) % 4) * 0.0015,
      })),
    [count, radius, height, seed],
  );
  return (
    <group>
      {birds.map((b, i) => (
        <Bird key={i} center={c} {...b} />
      ))}
    </group>
  );
}

BIRD_URLS.forEach((u) => useGLTF.preload(u));
useTexture.preload("/textures/waternormals.jpg");
