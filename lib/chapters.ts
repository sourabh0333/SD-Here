import { T } from "./timeline";

/** Human-readable chapter + a short excerpt of the code that drives it (shown in the inspector). */
export const CHAPTERS: { from: number; name: string; file: string; code: string }[] = [
  {
    from: 0,
    name: "Hero · Riverside",
    file: "components/three/Characters.tsx",
    code: `<Human pose="lean" position={HERO_SPOT} />
// poses are limb directions, aimed with quaternions
aim(bones.RightArm, bones.RightForeArm, [0.62, 0.42, 0.12])`,
  },
  {
    from: T.welcome[0],
    name: "Welcome · River flight",
    file: "components/three/Nature.tsx",
    code: `const water = new Water(plane, {
  waterNormals, sunDirection,
  distortionScale: 2.6,
})
useFrame((_, dt) => (u.time.value += dt * 0.55))`,
  },
  {
    from: T.aboutLetters[0],
    name: "<About /> · Letters",
    file: "components/three/Letters.tsx",
    code: `<Text3D font={BLOCK_FONT} size={4.2} height={1.4} bevelEnabled>
  {"<About />"}
</Text3D>`,
  },
  {
    from: T.about[0],
    name: "About · Materialise",
    file: "components/three/Human.tsx",
    code: `// injected into the standard material shader
if (vRevealY > uRevealY) discard;
totalEmissiveRadiance += rainbow * edge * 2.5;`,
  },
  {
    from: T.ride[0],
    name: "Ride · Old town",
    file: "lib/world.ts",
    code: `const { pos, tan } = rideAt(scroll.current)
camera.position.copy(pos).addScaledVector(tan, -7.5)
camera.lookAt(pos.addScaledVector(tan, 12))`,
  },
  {
    from: T.statue[0],
    name: "Statue · Obelisk",
    file: "components/three/RideZone.tsx",
    code: `<Human pose="raise" gold glyph="</>" scale={2.2} />`,
  },
  {
    from: T.work[0],
    name: "<Work /> · Above the clouds",
    file: "components/three/SkyZone.tsx",
    code: `<Html transform distanceFactor={10}>
  <BrowserWindow url={project.url}>…</BrowserWindow>
</Html>`,
  },
  {
    from: T.skydive[0],
    name: "Skydive",
    file: "components/three/Characters.tsx",
    code: `diver.position.copy(camera.position)
  .addScaledVector(lookDir, 8.5)
<Human pose="fall" backpack />`,
  },
  {
    from: T.contact[0],
    name: "getInTouch() · Plaza",
    file: "components/three/ContactZone.tsx",
    code: `onClick={() => window.open(contact.url)}
<meshStandardMaterial metalness={1} roughness={0.12} />`,
  },
  {
    from: T.room[0],
    name: "Finale · Workspace",
    file: "components/three/Room.tsx",
    code: `console.log("Thank you for visiting!")`,
  },
];

export function chapterAt(t: number) {
  let c = CHAPTERS[0];
  for (const ch of CHAPTERS) if (t >= ch.from) c = ch;
  return c;
}
