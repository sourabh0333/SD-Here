"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState, useSyncExternalStore } from "react";
import { content } from "@/lib/content";
import { inspector, subscribeInspector, toggleInspector } from "@/lib/inspector";
import { STATIONS, STATION_AT } from "@/lib/loft";
import { scrollToProgress } from "@/lib/scroll";
import { isSoundOn, subscribeSound, toggleSound } from "@/lib/sound";

// ── Menu, inspector, palette and sound buttons (top right) ───────────────
export function Controls({ onPalette }: { onPalette: () => void }) {
  const [open, setOpen] = useState(false);
  const sound = useSound();
  const inspecting = useInspectorOn();

  return (
    <>
      <div className="controls">
        <button className="ctrl" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <span className={`burger ${open ? "open" : ""}`}>
            <i />
            <i />
            <i />
          </span>
          <small>menu</small>
        </button>
        <button className="ctrl" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Play sound"} aria-pressed={sound}>
          <span className={`eq ${sound ? "on" : ""}`}>
            <i />
            <i />
            <i />
          </span>
          <small>sound</small>
        </button>
        <button
          className={`ctrl ctrl-code ${inspecting ? "active" : ""}`}
          onClick={toggleInspector}
          aria-label="Toggle inspector (I)"
          aria-pressed={inspecting}
        >
          <span aria-hidden>&lt;/&gt;</span>
          <small>inspect</small>
        </button>
        <button className="ctrl ctrl-code" onClick={onPalette} aria-label="Open command palette (Ctrl K)">
          <span aria-hidden>⌘K</span>
          <small>search</small>
        </button>
      </div>
      <nav className={`menu ${open ? "open" : ""}`} aria-hidden={!open}>
        <ol>
          {STATIONS.map((m, i) => (
            <li key={m.id} style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}>
              <button
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setOpen(false);
                  scrollToProgress(STATION_AT[m.id]);
                }}
              >
                <span className="menu-num">0{i + 1}</span>
                {m.label}
              </button>
            </li>
          ))}
          <li style={{ transitionDelay: open ? `${80 + STATIONS.length * 50}ms` : "0ms" }}>
            <a href="/classic" tabIndex={open ? 0 : -1} className="menu-classic">
              Classic view ↗
            </a>
          </li>
        </ol>
      </nav>
    </>
  );
}

// ── Loader: real asset progress, then a deliberate "enter" choice ─────────
export function Loader({ ready, onEnter }: { ready: boolean; onEnter: (withSound: boolean) => void }) {
  const { progress, item } = useProgress();
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const reduced = useReducedMotion();
  const done = ready && progress >= 100;

  const enter = (withSound: boolean) => {
    setLeaving(true);
    onEnter(withSound);
    setTimeout(() => setGone(true), 800);
  };

  if (gone) return null;
  return (
    <div className={`loader ${leaving ? "done" : ""}`} role="dialog" aria-modal="true" aria-label="Loading">
      <p className="loader-tag">&lt;Portfolio /&gt;</p>
      <div className="loader-name">{content.name}</div>
      <p className="loader-role">{content.role}</p>
      <div className="loader-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
        <span style={{ width: `${done ? 100 : Math.min(progress, 99)}%` }} />
      </div>
      <div className="loader-pct">
        {done ? "ready" : `${Math.floor(progress)}% · ${item ? item.split("/").pop() : "warming up shaders"}`}
      </div>
      <div className={`loader-actions ${done ? "show" : ""}`}>
        <button className="loader-btn primary" onClick={() => enter(true)} disabled={!done}>
          Enter with sound
        </button>
        <button className="loader-btn" onClick={() => enter(false)} disabled={!done}>
          Enter muted
        </button>
        <a className="loader-btn ghost" href="/classic">
          Classic view
        </a>
      </div>
      {reduced ? (
        <p className="loader-note">You prefer reduced motion — the classic view might be more comfortable.</p>
      ) : (
        <p className="loader-note">Scroll to move through the loft · I to inspect · ⌘K to search</p>
      )}
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useSound() {
  return useSyncExternalStore(
    (cb) => subscribeSound(cb),
    isSoundOn,
    () => false,
  );
}

export function useInspectorOn() {
  return useSyncExternalStore(
    subscribeInspector,
    () => inspector.on,
    () => false,
  );
}
