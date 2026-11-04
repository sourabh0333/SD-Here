# SD-Here — 3D scroll portfolio

A cinematic, scroll-driven 3D journey with a realistic character:

1. **Hero** — a round stone quay at sunset, the character leaning on an ornate lamp, birds over the river.
2. **Welcome** — the camera swoops down to the water (real-time reflections, sun glint), past the lower riverside walk with benches, and flies through a bridge arch with words painted inside.
3. **About** — 3D "ABOUT ME" letters, then "HI!" lifts off the road into the bio panel while the character materialises next to a vintage scooter.
4. **Ride** — through the tower's legs, past the ferris wheel and kiosk, under the "Skill Zone" gate, through a narrow passage to "MY WORK" and a Gothic cathedral, into the sun (lens flare), under a viaduct — skills appear one by one.
5. **Statue** — up a stone obelisk to a golden statue holding a ring, then into the clouds.
6. **Work** — project cards floating above a pink sea of clouds (hover to flip).
7. **Skydive** — free-fall with a backpack through white clouds, then a top-down reveal of the city.
8. **Contact** — a plaza with a chrome sculpture, "GET IN TOUCH" letters, clickable contact icons, moving cars and a contact form.
9. **Finale** — through the sculpture and a townhouse window into a room that says "Thank You For Visiting".

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Three.js** via **React Three Fiber** and **drei**
- **@react-three/postprocessing** — bloom, vignette, ACES tone mapping, SMAA
- HDR image-based lighting, three.js `Water` shader, `Lensflare`
- Tailwind CSS 4 + plain CSS for the overlay UI
- Web Audio API for the generative ambient soundtrack

## Run

```bash
pnpm install
pnpm dev     # http://localhost:3000
pnpm build && pnpm start
```

## Make it yours

| What | Where |
| --- | --- |
| Name, about text, skills, projects, contact links | `lib/content.ts` |
| Scroll timing of each chapter | `lib/timeline.ts` |
| Camera path, road and landmark positions | `lib/world.ts` |
| Character poses / outfit colours | `components/three/Human.tsx` |
| Sky / fog / light colours per chapter | `LOOKS` in `components/three/Experience.tsx` |
| UI styles | `app/globals.css` |

To use your own avatar, export a Ready Player Me (Mixamo-compatible) `.glb` and
replace `public/models/avatar.glb` — the poses are applied by code, so no
animation files are needed. See `CREDITS.md` for bundled asset sources.

The 3D block-letter font (`public/fonts/archivo-black.typeface.json`) is
generated with `node scripts/make-typeface.mjs <in.woff> <out.json>`.

## Structure

```
components/
  Portfolio.tsx          page shell (canvas + overlays + scroll spacer)
  three/
    Experience.tsx       canvas, camera rig, atmosphere, post-processing
    Human.tsx            realistic avatar, procedural poses, materialise effect
    ParisZone.tsx        river, quays, bastion, bridge, tower, wheel, "HI!"
    RideZone.tsx         old town, gate, passage, cathedral, viaduct, obelisk
    SkyZone.tsx          clouds + project cards
    ContactZone.tsx      plaza, sculpture, contact icons, cars, city grid
    Room.tsx             finale interior
    Nature.tsx           water shader + bird flocks
  ui/                    DOM overlays: hero title, letterbox, skills, form, menu, sound
lib/
  scroll.ts              shared smoothed scroll progress
  timeline.ts            chapter ranges
  world.ts               world layout + camera path
```
