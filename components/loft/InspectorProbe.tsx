"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { emitInspector, inspector } from "@/lib/inspector";

/**
 * Collects renderer stats for the inspector panel and switches the whole scene
 * to a wireframe "blueprint" while the inspector is open.
 */
export function InspectorProbe() {
  const gl = useThree((s) => s.gl);
  const wire = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#7cf3ff", wireframe: true, transparent: true, opacity: 0.55 }),
    [],
  );
  const acc = useRef({ frames: 0, time: 0, last: 0 });

  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useFrame(({ scene, camera, gl: renderer }, dt) => {
    const a = acc.current;
    a.frames++;
    a.time += dt;
    scene.overrideMaterial = inspector.on ? wire : null;
    if (a.time >= 0.5) {
      const s = inspector.stats;
      const info = renderer.info;
      s.fps = Math.round(a.frames / a.time);
      s.ms = +((a.time / a.frames) * 1000).toFixed(1);
      s.calls = info.render.calls;
      s.triangles = info.render.triangles;
      s.geometries = info.memory.geometries;
      s.textures = info.memory.textures;
      s.programs = info.programs?.length ?? 0;
      s.dpr = +renderer.getPixelRatio().toFixed(2);
      s.camera = [camera.position.x, camera.position.y, camera.position.z].map((n) => +n.toFixed(1)) as [
        number,
        number,
        number,
      ];
      a.frames = 0;
      a.time = 0;
      if (inspector.on) emitInspector();
    }
    renderer.info.reset();
  }, -100);

  return null;
}
