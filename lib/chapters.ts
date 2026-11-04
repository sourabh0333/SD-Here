import { STATIONS, STATION_AT } from "./loft";

/** What the inspector shows for each station: a label, the file and an excerpt of the code behind it. */
const SNIPPETS: Record<string, { file: string; code: string }> = {
  hero: {
    file: "scripts/blender/loft.py",
    code: `# the whole loft is modelled in Python
span("wall_left", X0 - T, X0, Y0, Y1, 0, H, brick_mat())
bpy.ops.object.bake(type="COMBINED")  # Cycles lightmaps`,
  },
  about: {
    file: "components/loft/LoftScene.tsx",
    code: `// lighting comes from Blender, not from WebGL
new THREE.MeshBasicMaterial({ map: bakedAtlas, toneMapped: false })`,
  },
  skills: {
    file: "scripts/blender/loft.py",
    code: `for k, s in enumerate(SKILLS):
    soft_box(f"tag{k}", (0.6, 0.02, 0.2), pos, color)
    text(f"tagtext{k}", s, pos, 0.085, ink)`,
  },
  experience: {
    file: "lib/loft.ts",
    code: `const k = ease(clamp((t - seg.from) / (seg.to - seg.from)))
seg.pos.getPointAt(k, camera.position)
seg.look.getPointAt(k, target)`,
  },
  work: {
    file: "components/loft/screens.ts",
    code: `drawProjectScreen(canvas, project, index)
texture.needsUpdate = true  // live monitors`,
  },
  cases: {
    file: "components/loft/LoftScene.tsx",
    code: `<primitive object={poster}
  onClick={() => router.push(project.url)} />`,
  },
  contact: {
    file: "components/loft/NightCity.tsx",
    code: `float lit = step(0.62, hash(cell + seed));
col = mix(base, warmWindow, window * lit);`,
  },
};

export const CHAPTERS = STATIONS.map((s) => ({
  from: STATION_AT[s.id],
  name: s.label,
  ...SNIPPETS[s.id],
}));

export function chapterAt(t: number) {
  let best = CHAPTERS[0];
  let d = Infinity;
  for (const c of CHAPTERS) {
    const dist = Math.abs(t - c.from);
    if (dist < d) {
      d = dist;
      best = c;
    }
  }
  return best;
}
