"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

export type Pose = "stand" | "lean" | "wave" | "ride" | "fall" | "raise";

const AVATAR_URL = "/models/avatar.glb";

type Vec = [number, number, number];
type Limb = { arm: Vec; fore: Vec; up: Vec; leg: Vec };
type PoseDef = {
  /** Directions are in character space (+z forward, +x = character's left). x is mirrored for the right side. */
  left: Limb;
  right?: Partial<Limb>;
  spine?: number; // forward bend (rad)
  head?: number; // nod (rad), positive looks down
  /** Origin at hips instead of feet (for sitting / falling). */
  hipsOrigin?: boolean;
};

const STAND: Limb = { arm: [0.13, -1, 0.02], fore: [0.08, -1, 0.14], up: [0.05, -1, 0], leg: [0.02, -1, -0.03] };

const POSES: Record<Pose, PoseDef> = {
  stand: { left: STAND },
  lean: {
    left: STAND,
    right: { arm: [0.62, 0.42, 0.12], fore: [0.18, 1, 0.12] },
    head: 0.05,
  },
  wave: { left: STAND, right: { arm: [0.6, 0.62, 0.1], fore: [0.05, 1, 0.15] } },
  ride: {
    left: { arm: [0.3, -0.55, 0.78], fore: [0.12, -0.2, 1], up: [0.2, -0.05, 1], leg: [0.06, -1, 0.3] },
    spine: 0.18,
    head: -0.12,
    hipsOrigin: true,
  },
  fall: {
    left: { arm: [1, 0.2, -0.25], fore: [0.35, 0.95, -0.2], up: [0.38, -1, -0.15], leg: [0.25, -1, -0.75] },
    spine: -0.25,
    head: -0.6,
    hipsOrigin: true,
  },
  raise: {
    left: { arm: [0.38, 1, 0.12], fore: [-0.42, 1, 0.12], up: [0.06, -1, 0], leg: [0.02, -1, 0] },
    head: -0.45,
  },
};

type Bones = Record<string, THREE.Bone>;

/** Casual look: charcoal sweater, dark denim, brown shoes (keeps the normal maps for folds). */
const OUTFIT: Record<string, { color: string; roughness: number }> = {
  Wolf3D_Outfit_Top: { color: "#4a4a50", roughness: 0.95 },
  Wolf3D_Outfit_Bottom: { color: "#272d3a", roughness: 0.85 },
  Wolf3D_Outfit_Footwear: { color: "#3a2a20", roughness: 0.6 },
};

const tmp = {
  a: new THREE.Vector3(),
  b: new THREE.Vector3(),
  d: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  qw: new THREE.Quaternion(),
  qp: new THREE.Quaternion(),
  qr: new THREE.Quaternion(),
};

/** Rotates `bone` so the bone → child segment points along `dir` (character space). */
function aim(bone: THREE.Bone, child: THREE.Bone, dir: Vec, rootQ: THREE.Quaternion, mirror: number) {
  bone.getWorldPosition(tmp.a);
  child.getWorldPosition(tmp.b);
  const cur = tmp.b.sub(tmp.a).normalize();
  const want = tmp.d.set(dir[0] * mirror, dir[1], dir[2]).normalize().applyQuaternion(rootQ);
  tmp.q.setFromUnitVectors(cur, want);
  bone.getWorldQuaternion(tmp.qw);
  tmp.qw.premultiply(tmp.q);
  bone.parent!.getWorldQuaternion(tmp.qp);
  bone.quaternion.copy(tmp.qp.invert().multiply(tmp.qw));
  bone.updateMatrixWorld(true);
}

/** Rotates a bone around a character-space axis. */
function bend(bone: THREE.Bone, axis: THREE.Vector3, angle: number, rootQ: THREE.Quaternion) {
  if (!angle) return;
  const worldAxis = tmp.d.copy(axis).applyQuaternion(rootQ);
  tmp.q.setFromAxisAngle(worldAxis, angle);
  bone.getWorldQuaternion(tmp.qw);
  tmp.qw.premultiply(tmp.q);
  bone.parent!.getWorldQuaternion(tmp.qp);
  bone.quaternion.copy(tmp.qp.invert().multiply(tmp.qw));
  bone.updateMatrixWorld(true);
}

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

// ── "Materialize" effect: reveals the body bottom → top with a rainbow scan edge ──
function addReveal(mat: THREE.Material, uniforms: { uRevealY: { value: number } }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRevealY = uniforms.uRevealY;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vRevealY;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvRevealY = (modelMatrix * vec4(transformed, 1.0)).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vRevealY;\nuniform float uRevealY;")
      .replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nif (vRevealY > uRevealY) discard;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float edge = smoothstep(0.35, 0.0, uRevealY - vRevealY);
        vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (vRevealY * 2.5 + vec3(0.0, 0.33, 0.67)));
        totalEmissiveRadiance += rainbow * edge * 2.5;`,
      );
  };
  mat.needsUpdate = true;
}

type Props = ThreeElements["group"] & {
  pose?: Pose;
  gold?: boolean;
  backpack?: boolean;
  helmet?: boolean;
  ring?: boolean;
  /** 0..1 reveal amount (materialize effect); undefined = fully visible. */
  reveal?: () => number;
};

export function Human({ pose = "stand", gold, backpack, helmet, ring, reveal, ...props }: Props) {
  const { scene } = useGLTF(AVATAR_URL);
  const revealUniform = useMemo(() => ({ uRevealY: { value: 100 } }), []);

  const { model, bones, rest, hipsY } = useMemo(() => {
    const model = cloneSkinned(scene) as THREE.Group;
    const bones: Bones = {};
    const goldMat = new THREE.MeshStandardMaterial({ color: "#d4a24a", metalness: 1, roughness: 0.22 });
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
      const mesh = o as THREE.SkinnedMesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        if (gold) {
          mesh.material = goldMat;
        } else {
          const m = (mesh.material as THREE.MeshStandardMaterial).clone();
          m.envMapIntensity = 0.9;
          const restyle = OUTFIT[m.name];
          if (restyle) {
            m.map = null;
            m.color.set(restyle.color);
            m.roughness = restyle.roughness;
          }
          if (reveal) addReveal(m, revealUniform);
          mesh.material = m;
        }
        if (mesh.name.includes("Headwear")) mesh.visible = false;
      }
    });
    const rest = new Map<THREE.Bone, THREE.Quaternion>();
    Object.values(bones).forEach((b) => rest.set(b, b.quaternion.clone()));
    model.updateMatrixWorld(true);
    const hipsY = bones.Hips.getWorldPosition(new THREE.Vector3()).y;
    return { model, bones, rest, hipsY };
  }, [scene, gold, reveal, revealUniform]);

  const inner = useRef<THREE.Group>(null);
  const qRoot = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => () => model.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m && !gold) m.dispose();
  }), [model, gold]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const def = POSES[pose];
    rest.forEach((q, b) => b.quaternion.copy(q));
    model.updateMatrixWorld(true);
    model.getWorldQuaternion(qRoot);

    // breathing / sway
    const breathe = Math.sin(t * 1.6) * 0.015;
    bend(bones.Spine, X, (def.spine ?? 0) + breathe, qRoot);
    bend(bones.Spine2, X, breathe * 0.6, qRoot);
    if (pose === "stand" || pose === "lean" || pose === "wave") {
      bend(bones.Hips, Z, Math.sin(t * 0.8) * 0.012, qRoot);
    }
    bend(bones.Neck, X, (def.head ?? 0) * 0.5, qRoot);
    bend(bones.Head, X, (def.head ?? 0) * 0.5 + Math.sin(t * 0.5) * 0.02, qRoot);

    for (const side of ["Left", "Right"] as const) {
      const mirror = side === "Left" ? 1 : -1;
      const L = { ...def.left, ...(side === "Right" ? def.right : {}) };
      let fore = L.fore;
      if (pose === "wave" && side === "Right") fore = [0.05 + Math.sin(t * 7) * 0.45, 1, 0.15];
      if (pose === "fall") fore = [fore[0], fore[1], fore[2] + Math.sin(t * 9 + mirror) * 0.08];
      aim(bones[`${side}Arm`], bones[`${side}ForeArm`], L.arm, qRoot, mirror);
      aim(bones[`${side}ForeArm`], bones[`${side}Hand`], fore, qRoot, mirror);
      aim(bones[`${side}UpLeg`], bones[`${side}Leg`], L.up, qRoot, mirror);
      let leg = L.leg;
      if (pose === "fall") leg = [leg[0], leg[1], leg[2] + Math.sin(t * 8 + mirror * 2) * 0.1];
      aim(bones[`${side}Leg`], bones[`${side}Foot`], leg, qRoot, mirror);
    }

    if (inner.current) inner.current.position.y = def.hipsOrigin ? -hipsY : 0;

    if (reveal) {
      const r = reveal();
      model.getWorldPosition(tmp.a);
      revealUniform.uRevealY.value = r >= 1 ? 1e5 : tmp.a.y - 0.4 + r * 2.4;
    }
  });

  return (
    <group {...props}>
      <group ref={inner}>
        <primitive object={model} />
        {backpack && <Backpack bone={bones.Spine2} />}
        {helmet && <Helmet bone={bones.Head} />}
        {ring && <RingProp bones={bones} />}
      </group>
    </group>
  );
}

/** Parents an object to a bone, compensating for the rig's internal scale. */
function useAttach(bone: THREE.Bone, object: THREE.Object3D) {
  useEffect(() => {
    const s = 1 / bone.getWorldScale(new THREE.Vector3()).x;
    const base = object.position.clone();
    object.scale.setScalar(s);
    object.position.copy(base).multiplyScalar(s);
    bone.add(object);
    return () => {
      bone.remove(object);
      object.position.copy(base);
    };
  }, [bone, object]);
}

/** Skydiving rig strapped to the upper back. */
function Backpack({ bone }: { bone: THREE.Bone }) {
  const pack = useMemo(() => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: "#b07a3f", roughness: 0.75 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.16, 2, 2, 2), mat);
    body.castShadow = true;
    const strapMat = new THREE.MeshStandardMaterial({ color: "#2a2522", roughness: 0.6 });
    for (const x of [-0.11, 0.11]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.26), strapMat);
      strap.position.set(x, 0, 0.1);
      g.add(strap);
    }
    g.add(body);
    g.position.set(0, 0.05, -0.17);
    return g;
  }, []);
  useAttach(bone, pack);
  return null;
}

/** Glossy open-face scooter helmet. */
function Helmet({ bone }: { bone: THREE.Bone }) {
  const helmet = useMemo(() => {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
      new THREE.MeshPhysicalMaterial({ color: "#e2782f", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
    );
    shell.castShadow = true;
    shell.scale.set(1, 1.05, 1.12);
    g.add(shell);
    g.position.set(0, 0.11, -0.005);
    return g;
  }, []);
  useAttach(bone, helmet);
  return null;
}

/** Golden laurel ring held above the head between both hands. */
function RingProp({ bones }: { bones: Bones }) {
  const ring = useRef<THREE.Mesh>(null);
  const a = useMemo(() => new THREE.Vector3(), []);
  const b = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!ring.current) return;
    bones.LeftHand.getWorldPosition(a);
    bones.RightHand.getWorldPosition(b);
    const mid = a.add(b).multiplyScalar(0.5);
    ring.current.parent!.worldToLocal(mid);
    ring.current.position.copy(mid).add(new THREE.Vector3(0, 0.22, 0));
  });
  return (
    <mesh ref={ring} castShadow>
      <torusGeometry args={[0.24, 0.055, 12, 36]} />
      <meshStandardMaterial color="#d9a441" metalness={1} roughness={0.25} />
    </mesh>
  );
}

useGLTF.preload(AVATAR_URL);
