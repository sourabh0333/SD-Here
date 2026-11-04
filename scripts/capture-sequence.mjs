// Records the loft's camera flight as a frame sequence for the scroll-played chapter.
//
//   pnpm dev            (in another terminal)
//   node scripts/capture-sequence.mjs [baseUrl]
//
// Writes public/sequences/loft/{wide,tall}/0001.webp … and manifest.json.
// These frames come from the real-time loft. Swap in Cycles renders of the same
// flight (same names, same count) for full Blender quality; the page needs no change.

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:3005";
const out = path.resolve("public/sequences/loft");
const FRAMES = 120;
const QUALITY = 0.7;
// Rendered at `render` size, saved at `width` × `height`.
const SETS = [
  { name: "wide", render: [1600, 900], width: 1280, height: 720 },
  { name: "tall", render: [720, 1280], width: 540, height: 960 },
];

// Chrome encodes WebP for us: downscale the screenshot on a 2D canvas and export it.
const toWebp = (png, w, h, q) =>
  `(async () => {
    const res = await fetch("data:image/png;base64,${png}");
    const bmp = await createImageBitmap(await res.blob());
    const c = new OffscreenCanvas(${w}, ${h});
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(bmp, 0, 0, ${w}, ${h});
    const blob = await c.convertToBlob({ type: "image/webp", quality: ${q} });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  })()`;

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"],
});

await rm(out, { recursive: true, force: true });
const manifest = { frames: FRAMES, sets: {} };

for (const set of SETS) {
  const dir = path.join(out, set.name);
  await mkdir(dir, { recursive: true });
  const [rw, rh] = set.render;
  const page = await browser.newPage({ viewport: { width: rw, height: rh }, reducedMotion: "reduce" });
  await page.goto(`${base}/prototype/capture?quality=high`);
  // keep the dev-mode badge out of the frames
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForFunction(() => window.__ready === true && typeof window.__frame === "function", null, {
    timeout: 120_000,
  });
  // From the hero, through the window, to the reading corner (the middle of the About hold).
  const end = await page.evaluate(() => window.__stations.about);
  for (let i = 0; i < FRAMES; i++) {
    const t = (end * i) / (FRAMES - 1);
    await page.evaluate((v) => window.__frame(v), t);
    const png = (await page.screenshot({ type: "png" })).toString("base64");
    const webp = await page.evaluate(toWebp(png, set.width, set.height, QUALITY));
    await writeFile(path.join(dir, `${String(i + 1).padStart(4, "0")}.webp`), Buffer.from(webp, "base64"));
  }
  manifest.sets[set.name] = { width: set.width, height: set.height };
  console.log(`${set.name}: ${FRAMES} frames`);
  await page.close();
}

await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
