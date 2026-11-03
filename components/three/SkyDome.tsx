"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // always on the far plane
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uCloud;
  uniform vec3 uCloudShadow;
  uniform float uCloudAmount;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.6, h));
    col = mix(col, uBottom, smoothstep(0.0, -0.25, h));

    float sun = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * (pow(sun, 6.0) * 0.35 + pow(sun, 64.0) * 0.6 + pow(sun, 900.0) * 2.0);
    col += uSunColor * pow(sun, 2.0) * 0.18 * (1.0 - smoothstep(0.0, 0.4, h));

    if (h > 0.0) {
      vec2 uv = dir.xz / (h + 0.18) * 0.9 + vec2(uTime * 0.004, uTime * 0.002);
      float n = fbm(uv * 1.3);
      float c = smoothstep(1.0 - uCloudAmount, 1.05 - uCloudAmount * 0.55, n);
      float lit = fbm(uv * 1.3 + normalize(uSunDir.xz + 0.0001) * 0.08);
      vec3 cc = mix(uCloudShadow, uCloud, clamp((n - lit) * 6.0 + 0.55, 0.0, 1.0));
      cc += uSunColor * pow(sun, 4.0) * 0.5 * c;
      col = mix(col, cc, c * smoothstep(0.0, 0.12, h) * 0.95);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type SkyHandle = {
  uniforms: Record<string, THREE.IUniform>;
};

export const SkyDome = forwardRef<SkyHandle>(function SkyDome(_, ref) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uBottom: { value: new THREE.Color() },
          uSunDir: { value: new THREE.Vector3(0, 0.05, -1) },
          uSunColor: { value: new THREE.Color() },
          uCloud: { value: new THREE.Color() },
          uCloudShadow: { value: new THREE.Color() },
          uCloudAmount: { value: 0.5 },
          uTime: { value: 0 },
        },
      }),
    [],
  );

  useImperativeHandle(ref, () => ({ uniforms: material.uniforms }), [material]);

  useFrame(({ camera, clock }) => {
    mesh.current?.position.copy(camera.position);
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1000, 48, 24]} />
    </mesh>
  );
});
