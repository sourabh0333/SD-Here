"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { content } from "@/lib/content";
import { inspector, subscribeInspector, toggleInspector } from "@/lib/inspector";
import { onProgress, scrollToProgress } from "@/lib/scroll";
import { isSoundOn, subscribeSound, toggleSound } from "@/lib/sound";
import { MENU, T, range, smooth, window01 } from "@/lib/timeline";

/** Subscribe a DOM ref to scroll progress without re-rendering React. */
function useProgressEffect(fn: (p: number) => void) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => onProgress((p) => fnRef.current(p)), []);
}

// ── Hero title with a glitchy exit ─────────────────────────────────────────
export function HeroTitle() {
  const ref = useRef<HTMLDivElement>(null);
  const letters = content.name.split("");
  useProgressEffect((p) => {
    const el = ref.current;
    if (!el) return;
    const out = range(p, 0.02, 0.075);
    el.style.opacity = String(1 - smooth(range(p, 0.05, 0.08)));
    el.style.visibility = p > 0.085 ? "hidden" : "visible";
    el.querySelectorAll<HTMLSpanElement>(".hero-letter").forEach((s, i) => {
      const k = (i * 7919) % 5;
      const flip = out > 0.15 + k * 0.12;
      s.style.transform = flip ? `scaleY(-1) translateY(${k * 2}px)` : "none";
      s.style.opacity = out > 0.6 + k * 0.08 ? "0" : "1";
    });
  });
  return (
    <div ref={ref} className="hero">
      <h1 className="hero-name" aria-label={content.name}>
        {letters.map((l, i) => (
          <span key={i} className="hero-letter" aria-hidden>
            {l === " " ? " " : l}
          </span>
        ))}
      </h1>
      <p className="hero-tag">{content.tagline}</p>
    </div>
  );
}

// ── Cinematic letterbox bars ──────────────────────────────────────────────
const BARS: [number, number][] = [
  [0.058, 0.25],
  [0.37, 0.668],
  [0.945, 1.01],
];

export function Letterbox() {
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useProgressEffect((p) => {
    const k = Math.max(...BARS.map(([a, b]) => window01(p, a, b, 0.012)));
    const h = `${smooth(k) * 10.5}vh`;
    if (top.current) top.current.style.height = h;
    if (bottom.current) bottom.current.style.height = h;
  });
  return (
    <>
      <div ref={top} className="bar bar-top" />
      <div ref={bottom} className="bar bar-bottom" />
    </>
  );
}

// ── Skills appear one by one during the ride ──────────────────────────────
export function Skills() {
  const ref = useRef<HTMLUListElement>(null);
  useProgressEffect((p) => {
    const el = ref.current;
    if (!el) return;
    const [a, b] = T.skills;
    const n = content.skills.length;
    const visible = window01(p, a, b + 0.03, 0.01);
    el.style.opacity = String(visible);
    el.querySelectorAll<HTMLLIElement>("li").forEach((li, i) => {
      const at = a + ((b - a) * i) / n;
      const k = smooth(range(p, at, at + 0.012));
      li.style.opacity = String(k);
      li.style.transform = `translateX(${(1 - k) * 40}px)`;
      li.style.filter = `blur(${(1 - k) * 6}px)`;
    });
  });
  return (
    <ul ref={ref} className="skills" aria-label="Skills">
      {content.skills.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
}

// ── Scroll hint ───────────────────────────────────────────────────────────
export function ScrollHint() {
  const ref = useRef<HTMLDivElement>(null);
  useProgressEffect((p) => {
    const o = Math.max(1 - range(p, 0.005, 0.03), window01(p, 0.3, 0.38, 0.01));
    if (ref.current) ref.current.style.opacity = String(o);
  });
  return (
    <div ref={ref} className="scroll-hint" aria-hidden>
      <span>SCR</span>
      <span className="mouse">
        <span className="wheel" />
      </span>
      <span>LL</span>
    </div>
  );
}

// ── Contact form (glass panel during the contact chapter) ────────────────
export function ContactForm() {
  const ref = useRef<HTMLFormElement>(null);
  const email = content.contacts.find((c) => c.url.startsWith("mailto:"))?.url ?? "mailto:";
  useProgressEffect((p) => {
    const o = window01(p, 0.905, 0.952, 0.012);
    if (ref.current) {
      ref.current.style.opacity = String(o);
      ref.current.style.transform = `translateY(${(1 - o) * 24}px)`;
      ref.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
    }
  });
  return (
    <form
      ref={ref}
      className="contact-form"
      style={{ opacity: 0 }}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const subject = encodeURIComponent(`Hello from ${f.get("name") || "your website"}`);
        const body = encodeURIComponent(`${f.get("message") || ""}\n\n— ${f.get("name") || ""} (${f.get("from") || ""})`);
        window.open(`${email}?subject=${subject}&body=${body}`, "_self");
      }}
    >
      <h3>Say hello</h3>
      <input name="name" placeholder="Your name" autoComplete="name" />
      <input name="from" type="email" placeholder="Your email" autoComplete="email" />
      <textarea name="message" placeholder="Your message" rows={3} />
      <button type="submit">Send ↗</button>
    </form>
  );
}

// ── Closing footer ────────────────────────────────────────────────────────
export function Outro() {
  const ref = useRef<HTMLDivElement>(null);
  useProgressEffect((p) => {
    const o = window01(p, 0.952, 0.975, 0.01);
    if (ref.current) {
      ref.current.style.opacity = String(o);
      ref.current.style.pointerEvents = o > 0.5 ? "auto" : "none";
    }
  });
  return (
    <div ref={ref} className="outro" style={{ opacity: 0 }}>
      <nav>
        {content.contacts.map((c) => (
          <a key={c.label} href={c.url} target={c.url.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">
            {c.label}
          </a>
        ))}
      </nav>
      <small>
        © {content.name} · SD-Here
      </small>
    </div>
  );
}

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
          {MENU.map((m, i) => (
            <li key={m.label} style={{ transitionDelay: open ? `${80 + i * 60}ms` : "0ms" }}>
              <button
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setOpen(false);
                  scrollToProgress(m.at);
                }}
              >
                <span className="menu-num">0{i + 1}</span>
                {m.label}
              </button>
            </li>
          ))}
          <li style={{ transitionDelay: open ? `${80 + MENU.length * 60}ms` : "0ms" }}>
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
        <p className="loader-note">Scroll to travel · press I to inspect · ⌘K to search</p>
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
