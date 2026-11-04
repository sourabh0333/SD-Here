"use client";

import { AdaptiveDpr, Html, PerformanceMonitor, useEnvironment, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Lensflare, LensflareElement } from "three/examples/jsm/objects/Lensflare.js";
import { content } from "@/lib/content";
import { scroll } from "@/lib/scroll";
import { T, clamp, window01 } from "@/lib/timeline";
import { ABOUT_SPOT, cameraAt } from "@/lib/world";
import { Characters } from "./Characters";
import { ContactZone } from "./ContactZone";
import { sunDirection } from "./Nature";
import { Ground, ParisZone, Road } from "./ParisZone";
import { RideZone } from "./RideZone";
import { SkyDome, type SkyHandle } from "./SkyDome";
import { SkyZone } from "./SkyZone";

const lookTarget = new THREE.Vector3();

// ── Camera follows the scroll path ─────────────────────────────────────────
function CameraRig() {
  const pos = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera, size }, dt) => {
    const p = pointer.current;
    p.sx = THREE.MathUtils.damp(p.sx, p.x, 2.5, dt);
    p.sy = THREE.MathUtils.damp(p.sy, p.y, 2.5, dt);
    cameraAt(scroll.current, pos, lookTarget);
    camera.position.copy(pos);
    camera.position.x += p.sx * 0.5;
    camera.position.y -= p.sy * 0.25;
    camera.lookAt(lookTarget);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = size.width < size.height ? 68 : 50;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

// ── Sky, fog and light change with the chapter ────────────────────────────
type Look = {
  t: number;
  fog: string;
  near: number;
  far: number;
  sun: [number, number, number];
  sunColor: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  top: string;
  horizon: string;
  bottom: string;
  glow: string;
  cloud: string;
  cloudShadow: string;
  clouds: number;
};

const sunset = {
  fog: "#e0a29c",
  near: 40,
  far: 270,
  sun: [0.05, 0.06, -1] as [number, number, number],
  sunColor: "#ffb48c",
  sunI: 2.4,
  hemiSky: "#ffd1c6",
  hemiGround: "#7c4a5c",
  hemiI: 1.0,
  top: "#5f5d8c",
  horizon: "#ffbb93",
  bottom: "#e0a29c",
  glow: "#ffc89a",
  cloud: "#c98d93",
  cloudShadow: "#6c4b6c",
  clouds: 0.62,
};
const above = {
  ...sunset,
  fog: "#f1c7c2",
  near: 70,
  far: 420,
  top: "#8a87b8",
  horizon: "#ffc9b4",
  bottom: "#f1c7c2",
  cloud: "#f3c6c6",
  cloudShadow: "#a07892",
  clouds: 0.4,
};
const day = {
  sun: [0.45, 0.85, 0.35] as [number, number, number],
  sunColor: "#fff3e6",
  sunI: 2.8,
  hemiSky: "#e1ecff",
  hemiGround: "#aeb3c2",
  hemiI: 1.2,
  top: "#2f7fd0",
  horizon: "#cfe5f7",
  bottom: "#e7edf4",
  glow: "#fff6e8",
  cloud: "#ffffff",
  cloudShadow: "#b3c1d6",
  clouds: 0.55,
};

const LOOKS: Look[] = [
  { t: 0, ...sunset },
  { t: 0.6, ...sunset },
  { t: 0.665, ...above },
  { t: 0.765, ...above },
  { t: 0.79, ...day, fog: "#f6f2f2", near: 8, far: 190 },
  { t: 0.84, ...day, fog: "#f3f4f7", near: 25, far: 260 },
  { t: 0.875, ...day, fog: "#d9e8f6", near: 120, far: 620 },
  { t: 1, ...day, fog: "#d9e8f6", near: 120, far: 620 },
];

const COLOR_KEYS = [
  ["uTop", "top"],
  ["uHorizon", "horizon"],
  ["uBottom", "bottom"],
  ["uSunColor", "glow"],
  ["uCloud", "cloud"],
  ["uCloudShadow", "cloudShadow"],
] as const;

function Atmosphere() {
  const fogRef = useRef<THREE.Fog>(null);
  const sky = useRef<SkyHandle>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const tmp = useMemo(
    () => ({ a: new THREE.Color(), b: new THREE.Color(), v: new THREE.Vector3(), w: new THREE.Vector3() }),
    [],
  );
  // Real HDR light probes: a Venice sunset for the first half, an overcast quarry for the day.
  const sunsetEnv = useEnvironment({ files: "/hdr/venice_sunset_1k.hdr" });
  const dayEnv = useEnvironment({ files: "/hdr/quarry_01_1k.hdr" });
  const [flare0, flare3] = useTexture(["/textures/lensflare0.png", "/textures/lensflare3.png"]);
  const flare = useMemo(() => {
    const light = new THREE.PointLight(0xffffff, 0, 1);
    const lf = new Lensflare();
    lf.addElement(new LensflareElement(flare0, 420, 0, new THREE.Color(1, 0.86, 0.72)));
    lf.addElement(new LensflareElement(flare3, 50, 0.55, new THREE.Color(1, 0.8, 0.8)));
    lf.addElement(new LensflareElement(flare3, 70, 0.7));
    lf.addElement(new LensflareElement(flare3, 110, 0.9, new THREE.Color(0.9, 0.85, 1)));
    lf.addElement(new LensflareElement(flare3, 60, 1));
    light.add(lf);
    return light;
  }, [flare0, flare3]);

  useFrame(({ scene, camera }) => {
    const t = scroll.current;
    scene.environment = t < 0.785 ? sunsetEnv : dayEnv;
    scene.environmentIntensity = t < 0.785 ? 0.55 : 0.8;
    flare.visible = t < 0.6;
    flare.position.copy(camera.position).addScaledVector(sunDirection, 900);
    let i = 0;
    while (i < LOOKS.length - 2 && t > LOOKS[i + 1].t) i++;
    const A = LOOKS[i];
    const B = LOOKS[i + 1];
    const k = clamp((t - A.t) / (B.t - A.t));
    const L = (x: number, y: number) => x + (y - x) * k;

    const fog = fogRef.current;
    if (!fog) return;
    fog.color.copy(tmp.a.set(A.fog)).lerp(tmp.b.set(B.fog), k);
    fog.near = L(A.near, B.near);
    fog.far = L(A.far, B.far);

    tmp.v.set(...A.sun).lerp(tmp.w.set(...B.sun), k).normalize();
    sunDirection.copy(tmp.v);
    const u = sky.current?.uniforms;
    if (u) {
      u.uSunDir.value.copy(tmp.v);
      for (const [uniform, key] of COLOR_KEYS) {
        (u[uniform].value as THREE.Color).copy(tmp.a.set(A[key])).lerp(tmp.b.set(B[key]), k);
      }
      u.uCloudAmount.value = L(A.clouds, B.clouds);
    }

    if (sun.current) {
      sun.current.color.copy(tmp.a.set(A.sunColor)).lerp(tmp.b.set(B.sunColor), k);
      sun.current.intensity = L(A.sunI, B.sunI);
      // keep the shadow frustum around what the camera is looking at
      const dir = tmp.w.copy(tmp.v);
      dir.y = Math.max(dir.y, 0.25);
      dir.normalize();
      sun.current.position.copy(lookTarget).addScaledVector(dir, 80);
      sun.current.target.position.copy(lookTarget);
      sun.current.target.updateMatrixWorld();
    }
    if (hemi.current) {
      hemi.current.color.copy(tmp.a.set(A.hemiSky)).lerp(tmp.b.set(B.hemiSky), k);
      hemi.current.groundColor.copy(tmp.a.set(A.hemiGround)).lerp(tmp.b.set(B.hemiGround), k);
      hemi.current.intensity = L(A.hemiI, B.hemiI);
    }
  });

  return (
    <>
      <fog ref={fogRef} attach="fog" args={[sunset.fog, sunset.near, sunset.far]} />
      <SkyDome ref={sky} />
      <hemisphereLight ref={hemi} intensity={1} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
      <primitive object={flare} />
    </>
  );
}

/** Hides a whole zone outside of its scroll range (saves GPU time). */
function Zone({ from, to, children }: { from: number; to: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (g.current) g.current.visible = scroll.current >= from && scroll.current <= to;
  });
  return <group ref={g}>{children}</group>;
}

// ── About panel floating in the scene ─────────────────────────────────────
function AboutPanel() {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const o = window01(scroll.current, T.hiRise[1] - 0.004, T.about[1] + 0.005, 0.02);
    if (ref.current) {
      ref.current.style.opacity = String(o);
      ref.current.style.transform = `translateY(${(1 - o) * 30}px)`;
      ref.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
    }
  });
  return (
    <Html transform distanceFactor={7} position={[ABOUT_SPOT.x - 6.6, 4.4, ABOUT_SPOT.z - 3]} zIndexRange={[20, 0]}>
      <div ref={ref} className="about-panel" style={{ opacity: 0 }}>
        <h2 className="about-title">HI!</h2>
        {content.about.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </Html>
  );
}

function Effects() {
  const [high, setHigh] = useState(true);
  return (
    <>
      <PerformanceMonitor onDecline={() => setHigh(false)} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={high ? 0.4 : 0.25} luminanceThreshold={0.9} luminanceSmoothing={0.2} />
        <Vignette offset={0.28} darkness={0.42} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export default function Experience({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 50, near: 0.2, far: 5000, position: [19, 2.3, 23] }}
      onCreated={({ gl, scene }) => {
        gl.toneMappingExposure = 1;
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __scene?: THREE.Scene }).__scene = scene;
        }
      }}
    >
      <AdaptiveDpr pixelated={false} />
      <CameraRig />
      <Suspense fallback={null}>
        <Atmosphere />
        <Zone from={0} to={0.7}>
          <Ground />
          <Road />
        </Zone>
        <Zone from={0} to={0.42}>
          <ParisZone />
          <AboutPanel />
        </Zone>
        <Zone from={0.34} to={0.7}>
          <RideZone />
        </Zone>
        <Zone from={0.6} to={0.88}>
          <SkyZone />
        </Zone>
        <Zone from={0.76} to={1}>
          <ContactZone />
        </Zone>
        <Characters />
        <Effects />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    const id = setTimeout(() => onReady?.(), 400);
    return () => clearTimeout(id);
  }, [onReady]);
  return null;
}
