"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "@/lib/geo";

/**
 * The night skyline around the loft: instanced towers with procedurally lit
 * windows, a gradient sky with stars and a moon, distant haze and traffic glow.
 * The loft floor sits at y = 0 on the 8th floor, so the street is far below.
 */

const STREET = -34;

const towerVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSeed;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vColor;
  varying float vSeed;
  varying vec3 vScale;
  varying float vFog;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vPos = position;
    vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vColor = aColor;
    vSeed = aSeed;
    vec4 mv = viewMatrix * world;
    vFog = smoothstep(60.0, 420.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const towerFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uHaze;
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vColor;
  varying float vSeed;
  varying vec3 vScale;
  varying float vFog;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    // facade coordinates in metres
    vec3 p = (vPos + 0.5) * vScale;
    vec2 uv = abs(vNormalW.x) > 0.5 ? p.zy : p.xy;
    vec3 base = vColor * (0.55 + 0.45 * max(dot(vNormalW, normalize(vec3(-0.4, 0.6, 0.5))), 0.0));
    vec3 col = base;
    if (abs(vNormalW.y) < 0.5) {
      vec2 cell = floor(uv / vec2(1.6, 2.6));
      vec2 f = fract(uv / vec2(1.6, 2.6));
      float window = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.78);
      float r = hash(cell + vSeed * 13.1);
      float lit = step(0.7, r);
      float flicker = step(0.995, hash(cell + floor(uTime * 0.2) + vSeed));
      lit = max(lit, flicker);
      vec3 warm = mix(vec3(1.0, 0.72, 0.42), vec3(0.75, 0.85, 1.0), step(0.85, hash(cell * 1.7 + vSeed)));
      col = mix(base, warm * (0.55 + r * 0.45), window * lit);
      col = mix(col, base * 1.6, window * (1.0 - lit) * 0.25);
      // street glow climbing up the facade
      col += vec3(1.0, 0.55, 0.3) * 0.12 * exp(-(p.y) * 0.05);
    }
    col = mix(col, uHaze, vFog * 0.85);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Towers() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { count, matrices, colors, seeds } = useMemo(() => {
    const r = rng(404);
    const m: THREE.Matrix4[] = [];
    const c: number[] = [];
    const s: number[] = [];
    const d = new THREE.Object3D();
    const palette = ["#1b2333", "#222a3b", "#2a2f3d", "#1d2230", "#30364a", "#262b36"].map((h) => new THREE.Color(h));
    for (let gx = -14; gx <= 14; gx++) {
      for (let gz = -14; gz <= 14; gz++) {
        const x = gx * 26 + (r() - 0.5) * 8;
        const z = gz * 26 + (r() - 0.5) * 8;
        // keep a clear patch where our building stands and in front of the views
        // views look out over -z (windows) and +x (balcony): keep the near blocks low and far away
        if (x > -60 && x < 70 && z > -80 && z < 40) continue;
        const dist = Math.hypot(x, z);
        if (dist > 380) continue;
        const w = 12 + r() * 12;
        const dd = 12 + r() * 12;
        const tall = r() > 0.9 ? 2.2 : 1;
        const h = (30 + r() * 70) * tall * (dist < 120 ? 0.9 : 1.2);
        d.position.set(x, STREET + h / 2, z);
        d.scale.set(w, h, dd);
        d.rotation.set(0, (r() - 0.5) * 0.2, 0);
        d.updateMatrix();
        m.push(d.matrix.clone());
        const col = palette[Math.floor(r() * palette.length)];
        c.push(col.r, col.g, col.b);
        s.push(r());
      }
    }
    return { count: m.length, matrices: m, colors: new Float32Array(c), seeds: new Float32Array(s) };
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: towerVertex,
        fragmentShader: towerFragment,
        uniforms: { uTime: { value: 0 }, uHaze: { value: new THREE.Color("#2b2f4a") } },
        toneMapped: false,
      }),
    [],
  );
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    return g;
  }, [colors, seeds]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={(m) => {
        mesh.current = m;
        if (!m) return;
        matrices.forEach((mat, i) => m.setMatrixAt(i, mat));
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }}
      args={[geometry, material, count]}
      frustumCulled={false}
    />
  );
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w;
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uMoonDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 horizon = vec3(0.32, 0.22, 0.36);
    vec3 mid = vec3(0.08, 0.09, 0.2);
    vec3 top = vec3(0.015, 0.02, 0.06);
    vec3 col = mix(horizon, mid, smoothstep(-0.02, 0.18, h));
    col = mix(col, top, smoothstep(0.18, 0.7, h));
    // city light pollution at the horizon
    col += vec3(0.5, 0.25, 0.15) * 0.25 * exp(-max(h, 0.0) * 18.0);
    // stars
    vec3 sp = floor(d * 380.0);
    float star = step(0.9985, hash(sp)) * smoothstep(0.1, 0.4, h);
    col += vec3(star) * 0.9;
    // moon + halo
    float m = max(dot(d, normalize(uMoonDir)), 0.0);
    col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.9996, m) * 1.4;
    col += vec3(0.5, 0.55, 0.8) * pow(m, 120.0) * 0.5;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Sky() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: { uMoonDir: { value: new THREE.Vector3(0.35, 0.32, -1) } },
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useFrame(({ camera }) => mesh.current?.position.copy(camera.position));
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1500, 48, 24]} />
    </mesh>
  );
}

/** Ground far below with glowing streets. */
function Streets() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec2 vXZ;
          varying float vFog;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vXZ = w.xz;
            vec4 mv = viewMatrix * w;
            vFog = smoothstep(60.0, 420.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying vec2 vXZ;
          varying float vFog;
          void main() {
            vec2 g = abs(fract(vXZ / 26.0 + 0.5) - 0.5) * 26.0;
            float road = 1.0 - smoothstep(2.5, 4.0, min(g.x, g.y));
            vec3 col = vec3(0.04, 0.045, 0.06) + vec3(1.0, 0.6, 0.3) * road * 0.5;
            col = mix(col, vec3(0.17, 0.18, 0.29), vFog);
            gl_FragColor = vec4(col, 1.0);
          }`,
        toneMapped: false,
      }),
    [],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STREET, 0]} material={mat}>
      <planeGeometry args={[1000, 1000]} />
    </mesh>
  );
}

export function NightCity() {
  return (
    <group>
      <Sky />
      <Streets />
      <Towers />
    </group>
  );
}
