# SD-Here — 3D scroll portfolio

A scroll-driven 3D journey: a sunset riverside city, a lattice tower, a scooter
ride through the old town, project cards above the clouds, a skydive and a
"Get in touch" plaza. Everything is generated in code — no 3D model files.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Three.js** via **React Three Fiber** and **drei** (Text, Text3D, Html, Clouds, reflections)
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
| Sky / fog / light colours per chapter | `LOOKS` in `components/three/Experience.tsx` |
| UI styles | `app/globals.css` |

The 3D block-letter font (`public/fonts/archivo-black.typeface.json`) is
generated from the woff with `node scripts/make-typeface.mjs <in.woff> <out.json>`.

## Structure

```
components/
  Portfolio.tsx          page shell (canvas + overlays + scroll spacer)
  three/                 3D scene: Experience, CameraRig, zones, characters
  ui/                    DOM overlays: hero title, letterbox, skills, menu, sound
lib/
  scroll.ts              shared smoothed scroll progress
  world.ts               world layout + camera path
```
