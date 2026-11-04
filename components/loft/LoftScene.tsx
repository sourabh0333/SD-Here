"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { content } from "@/lib/content";
import { loft, setLoft, subscribeLoft } from "@/lib/loftStore";
import { getTier } from "@/lib/quality";
import { createPosterTextures, createScreenTextures } from "./screens";

const BASE = "/models/loft";
const GROUPS = ["shell", "furniture", "props"] as const;

/**
 * The baked loft: three merged meshes whose lighting was rendered in Blender
 * (Cycles) and stored in textures, plus real-time screens, posters and glass.
 */
export function LoftScene() {
  const router = useRouter();
  const { scene } = useGLTF(`${BASE}/loft.glb`);
  const suffix = getTier() === "high" ? "" : "_low";
  const maps = useTexture(GROUPS.map((g) => `${BASE}/${g}${suffix}.jpg`));

  const baked = useMemo(() => {
    maps.forEach((t) => {
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.generateMipmaps = true;
    });
    // collect primitives per bake group and merge them into one draw call each
    const parts: Record<string, THREE.BufferGeometry[]> = { shell: [], furniture: [], props: [] };
    const realtime: Record<string, THREE.Mesh> = {};
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      let p: THREE.Object3D | null = mesh;
      let group: string | null = null;
      while (p) {
        const m = p.name.match(/^baked_(shell|furniture|props)/);
        if (m) {
          group = m[1];
          break;
        }
        p = p.parent;
      }
      if (group) {
        const g = mesh.geometry.clone();
        g.applyMatrix4(mesh.matrixWorld);
        for (const key of Object.keys(g.attributes)) if (key !== "position" && key !== "uv") g.deleteAttribute(key);
        parts[group].push(g);
      } else {
        realtime[mesh.name] = mesh;
      }
    });
    const meshes = GROUPS.map((g, i) => {
      const geo = mergeGeometries(parts[g], false) ?? new THREE.BufferGeometry();
      const mat = new THREE.MeshBasicMaterial({ map: maps[i], toneMapped: false });
      const m = new THREE.Mesh(geo, mat);
      m.name = `loft_${g}`;
      return m;
    });
    return { meshes, realtime };
  }, [scene, maps]);

  // ── live monitors ──
  const screens = useMemo(() => createScreenTextures(), []);
  useEffect(() => {
    screens.draw(loft.project);
    return subscribeLoft(() => screens.draw(loft.project));
  }, [screens]);

  // ── posters ──
  const posters = useMemo(() => createPosterTextures(), []);
  const [hover, setHover] = useState(-1);

  const screenMeshes = useMemo(() => {
    const out: { mesh: THREE.Mesh; tex: THREE.Texture }[] = [];
    (["screen_0", "screen_1", "screen_2"] as const).forEach((name, i) => {
      const src = baked.realtime[name];
      if (!src) return;
      const tex = [screens.textures.code, screens.textures.main, screens.textures.stats][i];
      const mesh = new THREE.Mesh(src.geometry, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      src.updateWorldMatrix(true, false);
      mesh.applyMatrix4(src.matrixWorld);
      out.push({ mesh, tex });
    });
    return out;
  }, [baked, screens]);

  const posterMeshes = useMemo(() => {
    const out: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const src = baked.realtime[`poster_${i}`];
      if (!src || !posters[i]) continue;
      // posters live in the warm gallery light: tint to match the bake
      const mesh = new THREE.Mesh(
        src.geometry,
        new THREE.MeshBasicMaterial({ map: posters[i], color: new THREE.Color("#f3dcc4"), toneMapped: false }),
      );
      src.updateWorldMatrix(true, false);
      mesh.applyMatrix4(src.matrixWorld);
      mesh.userData.index = i;
      out.push(mesh);
    }
    return out;
  }, [baked, posters]);

  useFrame(({ clock }) => {
    // subtle screen flicker / scanline breathing
    const k = 0.94 + Math.sin(clock.elapsedTime * 2.2) * 0.02;
    screenMeshes.forEach(({ mesh }) => (mesh.material as THREE.MeshBasicMaterial).color.setScalar(k));
    posterMeshes.forEach((m, i) => {
      const target = hover === i ? 1.04 : 1;
      m.scale.lerp(new THREE.Vector3(target, target, target), 0.15);
    });
  });

  useEffect(() => {
    document.body.style.cursor = hover >= 0 ? "pointer" : "";
    setLoft({ hoverPoster: hover });
  }, [hover]);

  return (
    <group>
      {baked.meshes.map((m) => (
        <primitive key={m.name} object={m} />
      ))}
      {screenMeshes.map(({ mesh }, i) => (
        <primitive
          key={i}
          object={mesh}
          onClick={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            if (i === 1) router.push(content.projects[loft.project].url);
          }}
        />
      ))}
      {posterMeshes.map((m) => (
        <primitive
          key={m.uuid}
          object={m}
          onPointerOver={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            setHover(m.userData.index);
          }}
          onPointerOut={() => setHover(-1)}
          onClick={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            router.push(content.projects[m.userData.index].url);
          }}
        />
      ))}
      <Glass />
    </group>
  );
}

/** Window wall + balcony door glass (very light reflection, mostly see-through). */
function Glass() {
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#a9bfe0",
        transparent: true,
        opacity: 0.1,
        roughness: 0.05,
        metalness: 0,
        envMapIntensity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  // Blender → three: (x, y, z) → (x, z, -y)
  return (
    <group>
      <mesh material={mat} position={[0, 2.4, -5.14]}>
        <planeGeometry args={[14.8, 3.7]} />
      </mesh>
      <mesh material={mat} position={[8.14, 1.35, -2.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 2.7]} />
      </mesh>
    </group>
  );
}

useGLTF.preload(`${BASE}/loft.glb`);
