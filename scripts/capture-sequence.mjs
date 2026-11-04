// Records the loft's camera flights as frame sequences for the scroll-played chapters.
//
//   pnpm dev            (in another terminal)
//   node scripts/capture-sequence.mjs [flight…] [--base=http://localhost:3005]
//
// Writes public/sequences/<flight>/{wide,tall}/0001.webp … and manifest.json.
// These frames come from the real-time loft. Swap in Cycles renders of the same
// flight (same names, same count) for full Blender quality; the page needs no change.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("--base="))?.slice(7) ?? "http://localhost:3005";
const only = args.filter((a) => !a.startsWith("--"));
const root = path.resolve("public/sequences");

/** Each flight runs between two stations from lib/loft.ts. A still has one frame. */
const FLIGHTS = [
  { name: "arrive", from: "hero", to: "about", frames: 120 },
  { name: "toolbox", from: "about", to: "skills", frames: 96 },
  { name: "shelves", from: "experience", to: "experience", frames: 1 },
  { name: "desk", from: "experience", to: "work", frames: 96 },
  { name: "outro", from: "cases", to: "contact", frames: 96 },
];

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

const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
const flights = FLIGHTS.filter((f) => !only.length || only.includes(f.name));

for (const set of SETS) {
  const [rw, rh] = set.render;
  const page = await browser.newPage({ viewport: { width: rw, height: rh }, reducedMotion: "reduce" });
  await page.goto(`${base}/prototype/capture?quality=high`);
  // keep the dev-mode badge out of the frames
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForFunction(() => window.__ready === true && typeof window.__frame === "function", null, {
    timeout: 120_000,
  });
  const at = await page.evaluate(() => window.__stations);

  for (const f of flights) {
    const dir = path.join(root, f.name, set.name);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const a = at[f.from];
    const b = at[f.to];
    for (let i = 0; i < f.frames; i++) {
      const t = f.frames === 1 ? a : a + ((b - a) * i) / (f.frames - 1);
      await page.evaluate((v) => window.__frame(v), t);
      const png = (await page.screenshot({ type: "png" })).toString("base64");
      const webp = await page.evaluate(toWebp(png, set.width, set.height, QUALITY));
      await writeFile(path.join(dir, `${String(i + 1).padStart(4, "0")}.webp`), Buffer.from(webp, "base64"));
    }
    manifest[f.name] = { from: f.from, to: f.to, frames: f.frames };
    console.log(`${f.name}/${set.name}: ${f.frames} frames`);
  }
  await page.close();
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
await browser.close();
