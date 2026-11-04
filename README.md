# SD-Here — 3D portfolio

A realistic, Blender-baked **night studio loft**. Scroll to fly through it; each corner of the room is a section of the portfolio:

| Station | Where | What's there |
| --- | --- | --- |
| Home | outside the window | the lit loft at night, name & role |
| About | reading nook | armchair, bookshelf, floor lamp — bio |
| Skills | tool wall | pegboard with tech tags — grouped toolbox |
| Experience | shelves | artefacts by year — timeline |
| Work | desk by the window | three live monitors showing the selected project |
| Case studies | poster wall | clickable posters → case-study pages |
| Contact | balcony | city skyline — contact form & links |

Also included: a fast, accessible **classic view** (`/classic`), **case studies** (`/work/<slug>`), a **How it's built** page (`/colophon`), an **inspector** (<kbd>I</kbd>), a **command palette** (<kbd>⌘K</kbd>), <kbd>J</kbd>/<kbd>K</kbd> station shortcuts, opt-in sound and SEO metadata.

## How the realism works

1. `scripts/blender/loft.py` models the entire loft in Python with procedural materials (brick, oak, plaster, concrete, fabric, leather).
2. Cycles path-traces the lighting (pendants, lamps, LED strips, spots, cool city light) and **bakes it into three texture atlases** (AgX view transform, OpenCV denoise).
3. The web app shows those atlases on `MeshBasicMaterial`s — real global illumination for the price of a texture — and adds real-time pieces: monitors and posters drawn from `lib/content.ts`, window glass, a shader night city, bloom.

### Rebuilding the loft

```bash
python -m venv .blender && .blender/bin/pip install bpy opencv-python-headless numpy
# look-dev stills from every camera station
.blender/bin/python scripts/blender/loft.py preview out 32
# bake + export (writes loft.glb, shell/furniture/props .jpg and stations.json)
.blender/bin/python scripts/blender/loft.py bake out 96 2048
cp out/loft.glb out/*.jpg public/models/loft/ && cp out/stations.json lib/loft-stations.json
```

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
| Camera stations, flight paths, timing | `lib/loft.ts` (+ `STATIONS` in the Blender script) |
| Room layout, furniture, lights, materials | `scripts/blender/loft.py` |
| Monitor & poster artwork | `components/loft/screens.ts` |
| Night city | `components/loft/NightCity.tsx` |
| UI styles | `app/globals.css` |

## Structure

```
scripts/blender/loft.py     procedural loft + Cycles bake + glTF export
components/
  Portfolio.tsx             page shell (canvas, overlays, loader, palette)
  loft/                     LoftExperience (canvas, camera rig, effects), LoftScene, NightCity, screens
  ui/                       station panels & nav, menu, loader, inspector, palette, cursor
lib/
  loft.ts                   stations + camera choreography
  loftStore.ts              shared state between WebGL and the DOM
  scroll.ts                 smoothed scroll progress
  content.ts                everything personal
```
