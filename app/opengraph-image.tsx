import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { content } from "@/lib/content";

export const alt = `${content.name} — ${content.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [block, display] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/archivo-black-latin-400-normal.woff")),
    readFile(join(process.cwd(), "app/fonts/orbitron-latin-700-normal.woff")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#fff",
          background: "linear-gradient(160deg, #5f5d8c 0%, #c97a86 48%, #ffbb93 100%)",
        }}
      >
        <div style={{ display: "flex", fontFamily: "Orbitron", fontSize: 26, letterSpacing: 6, opacity: 0.85 }}>
          {"<PORTFOLIO />"}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Archivo Black", fontSize: 150, lineHeight: 1 }}>{content.name}</div>
          <div style={{ fontFamily: "Orbitron", fontSize: 40, letterSpacing: 8, marginTop: 18 }}>
            {content.role.toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: "Orbitron", fontSize: 22, letterSpacing: 4, opacity: 0.85 }}>
          {"A 3D journey built with Next.js & Three.js"}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo Black", data: block, style: "normal", weight: 400 },
        { name: "Orbitron", data: display, style: "normal", weight: 700 },
      ],
    },
  );
}
