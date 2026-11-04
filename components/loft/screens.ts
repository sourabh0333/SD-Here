import * as THREE from "three";
import { content, type Project } from "@/lib/content";

/** Canvas artwork for the monitors and posters (redrawn from lib/content.ts). */

function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function makeTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const W = 1280;
const H = 744;

/** Centre monitor: the selected project as a live-looking website. */
export function drawProjectScreen(c: HTMLCanvasElement, p: Project, index: number) {
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // browser chrome
  g.fillStyle = "#16141c";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#211e29";
  g.fillRect(0, 0, W, 64);
  ["#ff6b6b", "#ffd166", "#6ee7a8"].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(34 + i * 30, 32, 9, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = "#2e2a38";
  rounded(g, 150, 16, 760, 32, 10);
  g.fill();
  g.fillStyle = "#c9c3d6";
  g.font = "500 18px system-ui, sans-serif";
  g.fillText(`https://${p.title.toLowerCase().replace(/\s+/g, "")}.app`, 172, 39);
  // hero gradient
  const grad = g.createLinearGradient(0, 64, W, H);
  grad.addColorStop(0, p.colors[0]);
  grad.addColorStop(1, p.colors[1]);
  g.fillStyle = grad;
  g.fillRect(0, 64, W, H - 64);
  g.fillStyle = "rgba(10,8,14,0.18)";
  g.fillRect(0, 64, W, H - 64);
  // nav
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.font = "800 26px system-ui, sans-serif";
  g.fillText(p.title, 60, 122);
  g.font = "500 18px system-ui, sans-serif";
  ["Work", "About", "Contact"].forEach((t, i) => g.fillText(t, W - 330 + i * 100, 120));
  // headline
  g.font = "800 84px system-ui, sans-serif";
  g.fillText(p.title, 60, 300);
  g.font = "500 28px system-ui, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.86)";
  const words = p.description.split(" ");
  let line = "";
  let y = 356;
  for (const w of words) {
    if (g.measureText(line + w).width > 640) {
      g.fillText(line, 60, y);
      line = "";
      y += 40;
    }
    line += w + " ";
  }
  g.fillText(line, 60, y);
  // CTA
  g.fillStyle = "#ffffff";
  rounded(g, 60, y + 40, 240, 58, 29);
  g.fill();
  g.fillStyle = "#1a1220";
  g.font = "700 20px system-ui, sans-serif";
  g.fillText("View case study →", 84, y + 76);
  // cards on the right
  for (let i = 0; i < 3; i++) {
    g.fillStyle = `rgba(255,255,255,${0.16 + i * 0.05})`;
    rounded(g, 800 + i * 34, 210 + i * 70, 380, 220, 18);
    g.fill();
  }
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = "600 18px system-ui, sans-serif";
  g.fillText(`${p.kind} · ${p.year}`, 896, 380);
  p.stack.slice(0, 3).forEach((s, i) => {
    g.fillStyle = "rgba(255,255,255,0.2)";
    rounded(g, 896 + i * 120, 400, 110, 34, 17);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "600 15px system-ui, sans-serif";
    g.fillText(s.slice(0, 12), 908 + i * 120, 423);
  });
  // pager
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.font = "600 18px system-ui, sans-serif";
  g.fillText(`${String(index + 1).padStart(2, "0")} / ${String(content.projects.length).padStart(2, "0")}`, W - 140, H - 34);
}

/** Left monitor: an editor with code. */
export function drawCodeScreen(c: HTMLCanvasElement, p: Project) {
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#13121a";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#1c1a25";
  g.fillRect(0, 0, 240, H);
  g.fillStyle = "#8b86a0";
  g.font = "500 18px ui-monospace, monospace";
  ["app/", "  page.tsx", "  layout.tsx", "components/", "  Hero.tsx", "  Scene.tsx", "lib/", "  content.ts"].forEach((f, i) =>
    g.fillText(f, 22, 50 + i * 34),
  );
  const slug = p.title.replace(/\s+/g, "");
  const lines: [string, string][][] = [
    [["import", "#c4a7e7"], [" { Canvas } ", "#e8e8f0"], ["from", "#c4a7e7"], [' "@react-three/fiber"', "#f6c177"]],
    [],
    [["export default function ", "#c4a7e7"], [slug, "#7cf3ff"], ["() {", "#e8e8f0"]],
    [["  const ", "#c4a7e7"], ["[ready, setReady] ", "#e8e8f0"], ["= ", "#9aa"], ["useState", "#7cf3ff"], ["(false)", "#e8e8f0"]],
    [["  return ", "#c4a7e7"], ["(", "#e8e8f0"]],
    [["    <", "#f2a7b5"], ["main ", "#f2a7b5"], ["className", "#ffd166"], ['="hero"', "#f6c177"], [">", "#f2a7b5"]],
    [["      <", "#f2a7b5"], ["Canvas ", "#f2a7b5"], ["dpr", "#ffd166"], ["={[1, 2]}", "#e8e8f0"], [">", "#f2a7b5"]],
    [["        <", "#f2a7b5"], ["Scene ", "#f2a7b5"], ["onReady", "#ffd166"], ["={setReady} />", "#e8e8f0"]],
    [["      </", "#f2a7b5"], ["Canvas", "#f2a7b5"], [">", "#f2a7b5"]],
    [["      <", "#f2a7b5"], ["h1", "#f2a7b5"], [">", "#f2a7b5"], [p.title, "#e8e8f0"], ["</", "#f2a7b5"], ["h1", "#f2a7b5"], [">", "#f2a7b5"]],
    [["    </", "#f2a7b5"], ["main", "#f2a7b5"], [">", "#f2a7b5"]],
    [["  )", "#e8e8f0"]],
    [["}", "#e8e8f0"]],
    [],
    [["// ", "#6b8a99"], [p.stack.join(" · "), "#6b8a99"]],
  ];
  g.font = "500 22px ui-monospace, monospace";
  lines.forEach((line, i) => {
    g.fillStyle = "#4b4860";
    g.fillText(String(i + 1).padStart(2, " "), 262, 54 + i * 40);
    let x = 310;
    for (const [txt, col] of line) {
      g.fillStyle = col;
      g.fillText(txt, x, 54 + i * 40);
      x += g.measureText(txt).width;
    }
  });
  g.fillStyle = "#7cf3ff";
  g.fillRect(310, 54 + 7 * 40 - 20, 3, 26);
}

/** Right monitor: terminal + metrics. */
export function drawStatsScreen(c: HTMLCanvasElement, p: Project) {
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0f1116";
  g.fillRect(0, 0, W, H);
  g.font = "500 22px ui-monospace, monospace";
  const lines: [string, string][] = [
    ["$ pnpm build", "#e8e8f0"],
    ["✓ Compiled successfully", "#6ee7a8"],
    ["✓ Linting and checking types", "#6ee7a8"],
    ["", ""],
    [`$ deploy ${p.title.toLowerCase().replace(/\s+/g, "-")} --prod`, "#e8e8f0"],
    ["✓ Ready in 42s", "#6ee7a8"],
  ];
  lines.forEach(([t, col], i) => {
    g.fillStyle = col;
    g.fillText(t, 40, 60 + i * 40);
  });
  p.metrics.slice(0, 3).forEach((m, i) => {
    const x = 40 + i * 400;
    g.fillStyle = "#1a1d26";
    rounded(g, x, 340, 370, 200, 18);
    g.fill();
    g.fillStyle = "#7cf3ff";
    g.font = "800 64px system-ui, sans-serif";
    g.fillText(m.value, x + 26, 440);
    g.fillStyle = "#9aa3b8";
    g.font = "500 22px system-ui, sans-serif";
    g.fillText(m.label, x + 28, 500);
  });
  // sparkline
  g.strokeStyle = "#f2a7b5";
  g.lineWidth = 4;
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = 40 + i * 29.5;
    const y = 660 - Math.abs(Math.sin(i * 0.45) * 50) - i * 1.4;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

/** Poster for the case-study wall. */
export function drawPoster(c: HTMLCanvasElement, p: Project, i: number) {
  c.width = 600;
  c.height = 746;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 600, 746);
  grad.addColorStop(0, p.colors[0]);
  grad.addColorStop(1, p.colors[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, 600, 746);
  // big index number
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.font = "900 380px system-ui, sans-serif";
  g.fillText(String(i + 1).padStart(2, "0"), -10, 470);
  // geometric accent
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(440, 190, 110, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(440, 190, 70, 0, Math.PI * 2);
  g.stroke();
  // title block
  g.fillStyle = "#ffffff";
  g.font = "900 64px system-ui, sans-serif";
  g.fillText(p.title, 40, 560);
  g.font = "600 22px system-ui, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.fillText(`${p.kind.toUpperCase()} — ${p.year}`, 42, 600);
  g.fillRect(42, 640, 516, 2);
  g.font = "600 20px system-ui, sans-serif";
  g.fillText("CASE STUDY →", 42, 690);
}

export function createScreenTextures() {
  const make = () => document.createElement("canvas");
  const canvases = { code: make(), main: make(), stats: make() };
  const textures = {
    code: makeTexture(canvases.code),
    main: makeTexture(canvases.main),
    stats: makeTexture(canvases.stats),
  };
  const draw = (index: number) => {
    const p = content.projects[index % content.projects.length];
    drawCodeScreen(canvases.code, p);
    drawProjectScreen(canvases.main, p, index);
    drawStatsScreen(canvases.stats, p);
    Object.values(textures).forEach((t) => (t.needsUpdate = true));
  };
  return { textures, draw };
}

export function createPosterTextures() {
  return content.projects.slice(0, 6).map((p, i) => {
    const c = document.createElement("canvas");
    drawPoster(c, p, i);
    return makeTexture(c);
  });
}
