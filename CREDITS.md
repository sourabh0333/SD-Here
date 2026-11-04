# Asset credits

All scenery (city, tower, bridge, river quays, cathedral, viaduct, obelisk, room,
cars, scooter) is generated in code. The following files are bundled from the
[three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples):

| File | Used for | Source |
| --- | --- | --- |
| `public/models/avatar.glb` | The realistic character (restyled + posed in code) | three.js examples `readyplayer.me.glb` (Ready Player Me avatar) |
| `public/models/Stork.glb`, `Flamingo.glb`, `Parrot.glb` | Bird flocks | three.js examples (ro.me project) |
| `public/hdr/*.hdr` | Image-based lighting (sunset / daylight) | three.js examples, originally [Poly Haven](https://polyhaven.com) (CC0) |
| `public/textures/waternormals.jpg` | River surface | three.js examples |
| `public/textures/lensflare*.png` | Sun lens flare | three.js examples |

Fonts: Orbitron and Archivo Black (SIL Open Font License) via Fontsource.

If you publish this site commercially, double-check each asset's license and
swap in your own avatar (e.g. a Ready Player Me avatar of yourself) at
`public/models/avatar.glb`.
