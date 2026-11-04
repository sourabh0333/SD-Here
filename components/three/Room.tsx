"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { grainMaterial, merge, worldBox } from "@/lib/geo";
import { scroll } from "@/lib/scroll";
import { T, range } from "@/lib/timeline";
import { PLAZA, ROOM } from "@/lib/world";
import { LIGHT_FONT } from "./ParisZone";

const W = ROOM.halfWidth;
const F = ROOM.floor;
const H = ROOM.height;
const D = ROOM.depth;

// ── Code texture for the monitors ─────────────────────────────────────────
const CODE: [string, string][][] = [
  [["const ", "#c4a7e7"], ["visitor", "#e8e8f0"], [" = ", "#9aa"], ["useYou", "#7cf3ff"], ["();", "#e8e8f0"]],
  [],
  [["export default function ", "#c4a7e7"], ["Finale", "#7cf3ff"], ["() {", "#e8e8f0"]],
  [["  return ", "#c4a7e7"], ["(", "#e8e8f0"]],
  [["    <", "#f2a7b5"], ["Room ", "#f2a7b5"], ["cozy", "#ffd166"], [">", "#f2a7b5"]],
  [["      <", "#f2a7b5"], ["Text", "#f2a7b5"], [">", "#f2a7b5"], ["Thank you", "#f6c177"], ["</", "#f2a7b5"], ["Text", "#f2a7b5"], [">", "#f2a7b5"]],
  [["    </", "#f2a7b5"], ["Room", "#f2a7b5"], [">", "#f2a7b5"]],
  [["  );", "#e8e8f0"]],
  [["}", "#e8e8f0"]],
  [],
  [["console", "#e8e8f0"], [".", "#9aa"], ["log", "#7cf3ff"], ["(", "#e8e8f0"], ['"Thank you for visiting!"', "#f6c177"], [");", "#e8e8f0"]],
  [["// → let's build something together ✦", "#6b8a99"]],
];

function codeTexture(variant: number) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 576;
  const g = c.getContext("2d")!;
  g.fillStyle = "#14121c";
  g.fillRect(0, 0, c.width, c.height);
  // title bar + tabs
  g.fillStyle = "#1d1a28";
  g.fillRect(0, 0, c.width, 46);
  ["#ff6b6b", "#ffd166", "#6ee7a8"].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(26 + i * 22, 23, 7, 0, Math.PI * 2);
    g.fill();
  });
  g.font = "20px monospace";
  g.fillStyle = "#e8e8f0";
  g.fillText(variant ? "Finale.tsx" : "terminal — zsh", 110, 30);
  g.font = "26px monospace";
  if (variant) {
    CODE.forEach((line, i) => {
      g.fillStyle = "#4b4860";
      g.fillText(String(i + 1).padStart(2, " "), 22, 96 + i * 38);
      let x = 80;
      for (const [txt, col] of line) {
        g.fillStyle = col;
        g.fillText(txt, x, 96 + i * 38);
        x += g.measureText(txt).width;
      }
    });
  } else {
    const lines: [string, string][] = [
      ["$ pnpm build", "#e8e8f0"],
      ["✓ Compiled successfully", "#6ee7a8"],
      ["✓ Generated static pages (12/12)", "#6ee7a8"],
      ["", ""],
      ["$ lighthouse sd-here --view", "#e8e8f0"],
      ["  Performance     ●", "#6ee7a8"],
      ["  Accessibility   ●", "#6ee7a8"],
      ["  Best Practices  ●", "#6ee7a8"],
      ["  SEO             ●", "#6ee7a8"],
      ["", ""],
      ["$ echo $THANK_YOU", "#e8e8f0"],
      ["Thanks for scrolling all the way ♥", "#f2a7b5"],
    ];
    lines.forEach(([txt, col], i) => {
      g.fillStyle = col;
      g.fillText(txt, 28, 96 + i * 38);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Two monitors with code, keyboard, mug and a plant. */
function Workspace({ x, y, z }: { x: number; y: number; z: number }) {
  const [left, right] = useMemo(() => [codeTexture(0), codeTexture(1)], []);
  return (
    <group position={[x, y, z]}>
      {[
        { tex: left, px: -1.05, ry: 0.18 },
        { tex: right, px: 1.05, ry: -0.18 },
      ].map(({ tex, px, ry }) => (
        <group key={px} position={[px, 0.75, -0.25]} rotation={[0, ry, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.9, 1.12, 0.06]} />
            <meshStandardMaterial color="#1b1b20" roughness={0.4} metalness={0.4} envMapIntensity={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.032]}>
            <planeGeometry args={[1.8, 1.02]} />
            <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.7, -0.05]}>
            <boxGeometry args={[0.08, 0.32, 0.08]} />
            <meshStandardMaterial color="#2a2a30" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.86, -0.05]}>
            <boxGeometry args={[0.5, 0.03, 0.3]} />
            <meshStandardMaterial color="#2a2a30" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* keyboard + mouse */}
      <mesh position={[0, 0.03, 0.35]} castShadow>
        <boxGeometry args={[1.25, 0.04, 0.4]} />
        <meshStandardMaterial color="#e9e6ef" roughness={0.6} envMapIntensity={0.2} />
      </mesh>
      <mesh position={[0.9, 0.03, 0.38]} castShadow>
        <capsuleGeometry args={[0.06, 0.08, 4, 8]} />
        <meshStandardMaterial color="#e9e6ef" roughness={0.6} envMapIntensity={0.2} />
      </mesh>
      {/* mug */}
      <mesh position={[-1.7, 0.12, 0.3]} castShadow>
        <cylinderGeometry args={[0.1, 0.09, 0.22, 16]} />
        <meshStandardMaterial color="#e57c98" roughness={0.5} envMapIntensity={0.2} />
      </mesh>
      {/* plant */}
      <group position={[2, 0, 0.2]}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.12, 0.3, 14]} />
          <meshStandardMaterial color="#d8d3de" roughness={0.7} envMapIntensity={0.2} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} position={[Math.cos(i) * 0.08, 0.5 + (i % 3) * 0.06, Math.sin(i) * 0.08]} rotation={[Math.cos(i * 2) * 0.6, i, Math.sin(i) * 0.6]}>
            <coneGeometry args={[0.06, 0.5, 4]} />
            <meshStandardMaterial color="#6fa36b" roughness={0.8} envMapIntensity={0.2} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0.9, 0.9]} color="#9fd8ff" intensity={2.5} distance={4} decay={2} />
    </group>
  );
}

/**
 * The finale: a townhouse on the plaza whose window the camera flies through,
 * into a cosy room that says "Thank You For Visiting".
 */
export function Room() {
  const P = PLAZA;
  const z0 = P.z + ROOM.z; // facade plane
  const textRef = useRef<THREE.Group>(null);

  const shell = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    // facade with a window hole
    const s = new THREE.Shape();
    s.moveTo(-W - 2, 0);
    s.lineTo(W + 2, 0);
    s.lineTo(W + 2, 22);
    s.lineTo(0, 28);
    s.lineTo(-W - 2, 22);
    s.lineTo(-W - 2, 0);
    const hole = new THREE.Path();
    hole.moveTo(-1.8, 11);
    hole.lineTo(1.8, 11);
    hole.lineTo(1.8, 15.2);
    hole.lineTo(-1.8, 15.2);
    hole.lineTo(-1.8, 11);
    s.holes.push(hole);
    // decorative (closed) windows on the facade
    const facade = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: false });
    const uv = facade.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    facade.translate(P.x, 0, z0 - 0.8);
    parts.push(facade);
    // side walls, back wall, slabs (their inner faces are hidden by the room liner)
    const left = worldBox(2, 22, D + 2);
    left.translate(P.x - W - 1, 11, z0 - D / 2 - 1);
    const right = worldBox(2, 22, D + 2);
    right.translate(P.x + W + 1, 11, z0 - D / 2 - 1);
    const back = worldBox(2 * W + 4, 22, 2);
    back.translate(P.x, 11, z0 - D - 1);
    const floor = worldBox(2 * W, F, D);
    floor.translate(P.x, F / 2, z0 - D / 2 - 0.8);
    const ceil = worldBox(2 * W, 22 - F - H, D);
    ceil.translate(P.x, F + H + (22 - F - H) / 2, z0 - D / 2 - 0.8);
    parts.push(left, right, back, floor, ceil);
    return merge(parts);
  }, [P, z0]);

  const facadeMat = useMemo(() => grainMaterial("#cdd8e8", 1), []);

  const furniture = useMemo(() => {
    const wood: THREE.BufferGeometry[] = [];
    const fabric: THREE.BufferGeometry[] = [];
    const pink: THREE.BufferGeometry[] = [];
    const zIn = z0 - 0.8;
    const zBack = z0 - D;
    // bookshelves along both walls
    for (const side of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const cz = zIn - 3.5 - k * 6;
        const frame = new THREE.BoxGeometry(0.5, 3.6, 4.4);
        frame.translate(P.x + side * (W - 0.3), F + 1.8, cz);
        wood.push(frame);
        for (let sh = 0; sh < 4; sh++) {
          const books = new THREE.BoxGeometry(0.35, 0.55, 3.6);
          books.translate(P.x + side * (W - 0.6), F + 0.45 + sh * 0.85, cz);
          (sh % 2 ? pink : fabric).push(books);
        }
      }
      // picture frames on the walls
      for (let k = 0; k < 3; k++) {
        const fr = new THREE.BoxGeometry(0.06, 0.8 + (k % 2) * 0.4, 1.1);
        fr.translate(P.x + side * (W - 0.05), F + 3.6 + (k % 2) * 0.3, zIn - 14 - k * 1.6);
        pink.push(fr);
      }
    }
    // developer desk facing the visitor
    const top = new THREE.BoxGeometry(4.6, 0.12, 1.6);
    top.translate(P.x, F + 1.1, zIn - 13.5);
    wood.push(top);
    for (const sx of [-1, 1]) {
      const leg = new THREE.BoxGeometry(0.1, 1.05, 1.4);
      leg.translate(P.x + sx * 2.15, F + 0.53, zIn - 13.5);
      wood.push(leg);
    }
    // office chair behind the desk
    const seat = new THREE.BoxGeometry(0.9, 0.14, 0.85);
    seat.translate(P.x, F + 0.72, zIn - 15);
    const back = new THREE.BoxGeometry(0.9, 1.1, 0.12);
    back.translate(P.x, F + 1.35, zIn - 15.45);
    const stem = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
    stem.translate(P.x, F + 0.38, zIn - 15);
    fabric.push(seat, back, stem);
    // curtains framing the back window
    for (const sx of [-1, 1]) {
      const c = new THREE.BoxGeometry(1.1, 3.6, 0.15);
      c.translate(P.x + sx * 2.9, F + 3.05, zBack + 0.5);
      pink.push(c);
    }
    return { wood: merge(wood), fabric: merge(fabric), pink: merge(pink) };
  }, [P, z0]);

  useFrame(() => {
    const k = range(scroll.current, T.thanks[0], T.thanks[1] - 0.005);
    textRef.current?.traverse((c) => {
      const m = c as THREE.Mesh & { fillOpacity?: number };
      if (m.fillOpacity !== undefined) m.fillOpacity = k;
    });
  });

  const zIn = z0 - 0.8;
  const zBack = z0 - D;
  return (
    <group>
      <mesh geometry={shell} material={facadeMat} castShadow receiveShadow />
      {/* window frame + sill on the facade */}
      <mesh position={[P.x, 10.85, z0 + 0.15]} castShadow>
        <boxGeometry args={[4.4, 0.3, 0.6]} />
        <meshStandardMaterial color="#eef2f8" roughness={0.6} />
      </mesh>

      {/* interior liner */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[P.x, F + 0.01, zIn - D / 2]} receiveShadow>
          <planeGeometry args={[2 * W, D]} />
          <meshStandardMaterial color="#4f5d75" roughness={0.55} envMapIntensity={0.12} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[P.x, F + H - 0.01, zIn - D / 2]}>
          <planeGeometry args={[2 * W, D]} />
          <meshStandardMaterial color="#8696b0" roughness={0.9} envMapIntensity={0.12} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} rotation={[0, -s * (Math.PI / 2), 0]} position={[P.x + s * (W - 0.01), F + H / 2, zIn - D / 2]}>
            <planeGeometry args={[D, H]} />
            <meshStandardMaterial color="#7e8fac" roughness={0.9} envMapIntensity={0.12} />
          </mesh>
        ))}
        <mesh position={[P.x, F + H / 2, zBack + 0.02]}>
          <planeGeometry args={[2 * W, H]} />
          <meshStandardMaterial color="#6f7f9c" roughness={0.9} envMapIntensity={0.12} />
        </mesh>
        {/* glowing back window */}
        <mesh position={[P.x, F + 3.3, zBack + 0.04]}>
          <planeGeometry args={[2.4, 3.2]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffd9e4" emissiveIntensity={1.6} />
        </mesh>
        {/* rug */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[P.x, F + 0.02, zIn - 17]}>
          <planeGeometry args={[4.6, 3]} />
          <meshStandardMaterial color="#e2708f" roughness={1} envMapIntensity={0.15} />
        </mesh>
        <mesh geometry={furniture.wood} castShadow>
          <meshStandardMaterial color="#3a4256" roughness={0.6} envMapIntensity={0.15} />
        </mesh>
        <mesh geometry={furniture.fabric} castShadow>
          <meshStandardMaterial color="#5e6b84" roughness={0.95} envMapIntensity={0.15} />
        </mesh>
        <mesh geometry={furniture.pink} castShadow>
          <meshStandardMaterial color="#e57c98" roughness={0.8} envMapIntensity={0.15} />
        </mesh>
        <Workspace x={P.x} y={F + 1.16} z={zIn - 13.5} />
        {/* pendant lamp */}
        <mesh position={[P.x, F + H - 0.6, zIn - 9]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[P.x, F + H - 1.25, zIn - 9]}>
          <coneGeometry args={[0.6, 0.45, 24, 1, true]} />
          <meshStandardMaterial color="#e57c98" side={THREE.DoubleSide} emissive="#ffb7c9" emissiveIntensity={0.4} />
        </mesh>
        <pointLight position={[P.x, F + H - 1.6, zIn - 9]} color="#ffd6e0" intensity={9} distance={20} decay={2} />
        <pointLight position={[P.x, F + 2.6, zBack + 1.8]} color="#ffc9d8" intensity={7} distance={10} decay={2} />
      </group>

      <group ref={textRef}>
        <Text font={LIGHT_FONT} fontSize={0.36} letterSpacing={0.1} position={[P.x, F + 5.2, zBack + 0.5]} color="#ffffff" fillOpacity={0}>
          Thank You For Visiting
        </Text>
      </group>
    </group>
  );
}
