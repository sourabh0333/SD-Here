"use client";

import { AdaptiveDpr, PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loftCamera } from "@/lib/loft";
import { loft, setLoft } from "@/lib/loftStore";
import { getTier, prefersReducedMotion } from "@/lib/quality";
import { scroll } from "@/lib/scroll";
import { InspectorProbe } from "./InspectorProbe";
import { LoftScene } from "./LoftScene";
import { NightCity } from "./NightCity";

/** Scroll-driven camera with eased flights, a breathing idle and mouse parallax. */
function CameraRig() {
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const reduced = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera, size, clock }, dt) => {
    const p = pointer.current;
    p.sx = THREE.MathUtils.damp(p.sx, p.x, 2.2, dt);
    p.sy = THREE.MathUtils.damp(p.sy, p.y, 2.2, dt);
    const state = loftCamera(scroll.current, pos, look);

    const t = clock.elapsedTime;
    const amp = reduced ? 0 : 1;
    // handheld breathing + parallax, strongest while holding on a station
    const right = new THREE.Vector3().subVectors(look, pos).cross(camera.up).normalize();
    pos.addScaledVector(right, (p.sx * 0.18 + Math.sin(t * 0.31) * 0.03) * amp * state.settled);
    pos.y += (-p.sy * 0.1 + Math.sin(t * 0.43) * 0.02) * amp * state.settled;
    camera.position.copy(pos);
    camera.lookAt(look);

    const cam = camera as THREE.PerspectiveCamera;
    const portrait = size.width < size.height;
    const fov = portrait ? state.fov * 1.35 : state.fov;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    const settled = Math.round(state.settled * 20) / 20;
    if (loft.station !== state.station || loft.settled !== settled) {
      setLoft({ station: state.station, settled });
    }
  });
  return null;
}

function Effects() {
  const [high, setHigh] = useState(() => getTier() === "high");
  return (
    <>
      <PerformanceMonitor onDecline={() => setHigh(false)} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={high ? 0.55 : 0.35} luminanceThreshold={0.82} luminanceSmoothing={0.15} />
        <Vignette offset={0.3} darkness={0.5} />
        {high ? <SMAA /> : <></>}
      </EffectComposer>
    </>
  );
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const { active } = useProgress();
  useEffect(() => {
    if (!active) {
      const id = setTimeout(() => onReady?.(), 300);
      return () => clearTimeout(id);
    }
  }, [active, onReady]);
  return null;
}

export default function LoftExperience({ onReady }: { onReady?: () => void }) {
  const tier = getTier();
  return (
    <Canvas
      dpr={tier === "high" ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 38, near: 0.05, far: 3000, position: [-0.5, 2.6, -11.5] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.NoToneMapping;
        scene.background = new THREE.Color("#0b1020");
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __scene?: THREE.Scene }).__scene = scene;
        }
      }}
    >
      <AdaptiveDpr pixelated={false} />
      <fog attach="fog" args={["#20253d", 120, 900]} />
      <CameraRig />
      <Suspense fallback={null}>
        <NightCity />
        <LoftScene />
        <InspectorProbe />
        <Effects />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
