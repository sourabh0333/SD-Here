"use client";

import { Cloud, Clouds, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { content } from "@/lib/content";
import { getCloudTextureUrl } from "@/lib/geo";
import { scroll } from "@/lib/scroll";
import { T, window01 } from "@/lib/timeline";
import { CARDS, PLAZA } from "@/lib/world";

function ProjectCards() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = window01(scroll.current, T.work[0] - 0.01, T.work[1] + 0.01, 0.02);
    if (group.current) group.current.visible = o > 0.001;
  });
  const n = content.projects.length;
  const gap = 11;
  return (
    <group ref={group}>
      {content.projects.map((p, i) => (
        <Html
          key={p.title}
          transform
          distanceFactor={10}
          position={[(i - (n - 1) / 2) * gap, CARDS.y + 2, CARDS.z]}
          zIndexRange={[20, 0]}
        >
          <div className="card-wrap" style={{ opacity: 0 }}>
            <a className="card" href={p.url} aria-label={`${p.title} — read the case study`}>
              <div className="browser">
                <div className="browser-bar">
                  <span className="browser-dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="browser-url">{p.title.toLowerCase().replace(/\s+/g, "")}.app</span>
                </div>
                <div
                  className="browser-view"
                  style={{ background: `radial-gradient(120% 80% at 30% 15%, ${p.colors[0]}, ${p.colors[1]})` }}
                >
                  <span className="card-year">{p.year}</span>
                  <span className="card-title">{p.title}</span>
                  <span className="card-kind">{p.kind}</span>
                  <div className="browser-mock" aria-hidden>
                    <b />
                    <span />
                    <span className="short" />
                    <div>
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  <div className="browser-hover">
                    <p>{p.description}</p>
                    <ul>
                      {p.stack.slice(0, 3).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    <span className="card-link">Read case study →</span>
                  </div>
                </div>
              </div>
            </a>
          </div>
        </Html>
      ))}
    </group>
  );
}

/** Keeps every card in sync with the first card's opacity. */
function CardOpacitySync() {
  useFrame(() => {
    const o = window01(scroll.current, T.work[0] - 0.01, T.work[1] + 0.01, 0.02);
    document.querySelectorAll<HTMLDivElement>(".card-wrap").forEach((el) => {
      el.style.opacity = String(o);
      el.style.pointerEvents = o > 0.5 ? "auto" : "none";
    });
  });
  return null;
}

export function SkyZone() {
  const texture = useMemo(() => getCloudTextureUrl(), []);
  return (
    <group>
      {/* pink sunset sea of clouds under the project cards */}
      <Clouds texture={texture} material={THREE.MeshLambertMaterial} limit={260}>
        {Array.from({ length: 14 }).map((_, i) => (
          <Cloud
            key={i}
            seed={i + 1}
            segments={26}
            bounds={[22, 4, 12]}
            volume={26}
            opacity={0.95}
            color={i % 2 ? "#fff1ee" : "#fbe0dc"}
            fade={60}
            speed={0.08}
            position={[-90 + i * 14, CARDS.y - 6.5 - (i % 3) * 1.2, CARDS.z + 14 - (i % 2) * 8]}
          />
        ))}
        <Cloud seed={30} segments={30} bounds={[60, 8, 20]} volume={30} color="#f3c4c0" position={[0, CARDS.y - 20, CARDS.z + 40]} speed={0.05} />
      </Clouds>

      {/* white skydive clouds above the contact plaza */}
      <Clouds texture={texture} material={THREE.MeshLambertMaterial} limit={260}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Cloud
            key={i}
            seed={i + 50}
            segments={28}
            bounds={[30, 10, 30]}
            volume={30}
            color="#ffffff"
            fade={40}
            speed={0.1}
            position={[
              PLAZA.x + Math.cos(i * 0.8) * (i % 2 ? 40 : 15),
              120 + (i % 4) * 22,
              PLAZA.z + Math.sin(i * 0.8) * (i % 2 ? 40 : 15),
            ]}
          />
        ))}
      </Clouds>

      <ProjectCards />
      <CardOpacitySync />
    </group>
  );
}
