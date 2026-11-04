# SD-Here — 3D scroll portfolio

A cinematic, scroll-driven 3D journey with a realistic character:

1. **Hero** — a round stone quay at sunset, the character leaning on an ornate lamp, birds over the river.
2. **Welcome** — the camera swoops down to the water (real-time reflections, sun glint), past the lower riverside walk with benches, and flies through a bridge arch with words painted inside.
3. **About** — 3D `<About />` letters, then "HI!" lifts off the road into the bio panel while the character materialises next to a vintage scooter.
4. **Ride** — through the tower's legs, past the ferris wheel and kiosk, under the "Skill Zone" gate, through a narrow passage to `<Work />` and a Gothic cathedral, into the sun (lens flare), under a viaduct — skills appear one by one.
5. **Statue** — up a stone obelisk to a golden statue holding up a `</>`, then into the clouds.
6. **Work** — projects as browser windows floating above a pink sea of clouds (hover for details, click for the case study).
7. **Skydive** — free-fall with a backpack through white clouds, then a top-down reveal of the city.
8. **Contact** — a plaza with a chrome sculpture, `getInTouch()` letters, clickable contact icons, moving cars and a contact form.
9. **Finale** — through the sculpture and a townhouse window into a developer workspace (code on the monitors) that says "Thank You For Visiting".

## Built for developers (and recruiters)

- **Inspector mode** — press <kbd>I</kbd> (or the `</>` button): the world turns into a wireframe blueprint and a panel shows live FPS, frame time, draw calls, triangles, textures, the quality tier and the code behind the current chapter.
- **Command palette** — <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> (or <kbd>/</kbd>): jump to any chapter or case study, toggle sound/inspector, copy the email, open the classic view or the source.
- **Shortcuts** — <kbd>J</kbd>/<kbd>K</kbd> next/previous chapter, <kbd>S</kbd> sound, <kbd>Esc</kbd> close.
- **Classic view** (`/classic`) — a fast, server-rendered, accessible version of the whole portfolio, plus a case study per project (`/work/<slug>`) and a "How it's built" page (`/colophon`).
- **Graceful degradation** — automatic quality tier (`?quality=low|high` to force), WebGL fallback, reduced-motion hint, skip link, opt-in sound.
- **SEO** — metadata, generated Open Graph image, sitemap, robots and Person JSON-LD.
- **Easter egg** — open DevTools.

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
| Name, role, about, experience, stack, projects & case studies, contact | `lib/content.ts` (search for `TODO`) |
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
