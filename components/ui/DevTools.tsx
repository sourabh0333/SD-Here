"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { chapterAt } from "@/lib/chapters";
import { content } from "@/lib/content";
import { inspector, setInspector, subscribeInspector, toggleInspector } from "@/lib/inspector";
import { getTier } from "@/lib/quality";
import { onProgress, scroll, scrollToProgress } from "@/lib/scroll";
import { toggleSound } from "@/lib/sound";
import { STATIONS, STATION_AT } from "@/lib/loft";

// ── Tiny syntax highlighter for the inspector snippets ────────────────────
const TOKEN =
  /(\/\/.*$)|("[^"]*"|'[^']*'|`[^`]*`)|(\b(?:const|let|return|if|new|import|from|export|function)\b)|(<\/?[A-Za-z][\w.]*|\/?>)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*(?=\())/gm;

function highlight(code: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const cls = m[1] ? "tk-com" : m[2] ? "tk-str" : m[3] ? "tk-key" : m[4] ? "tk-tag" : m[5] ? "tk-num" : "tk-fn";
    out.push(
      <span key={i++} className={cls}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  out.push(code.slice(last));
  return out;
}

function useInspector() {
  return useSyncExternalStore(
    subscribeInspector,
    () => inspector.on,
    () => false,
  );
}

// ── Inspector panel ───────────────────────────────────────────────────────
export function InspectorPanel() {
  const on = useInspector();
  const [, force] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => subscribeInspector(() => force((n) => n + 1)), []);
  useEffect(() => {
    if (!on) return;
    let last = -1;
    return onProgress((p) => {
      const rounded = Math.round(p * 1000);
      if (rounded !== last) {
        last = rounded;
        setProgress(p);
      }
    });
  }, [on]);

  if (!on) return null;
  const s = inspector.stats;
  const ch = chapterAt(progress);
  const fpsClass = s.fps >= 50 ? "good" : s.fps >= 30 ? "ok" : "bad";
  return (
    <aside className="inspector" aria-label="Inspector">
      <header>
        <span className="inspector-title">
          <i aria-hidden /> Inspector
        </span>
        <button onClick={() => setInspector(false)} aria-label="Close inspector">
          esc
        </button>
      </header>
      <dl className="inspector-stats">
        <div>
          <dt>FPS</dt>
          <dd className={fpsClass}>{s.fps}</dd>
        </div>
        <div>
          <dt>Frame</dt>
          <dd>{s.ms} ms</dd>
        </div>
        <div>
          <dt>Draw calls</dt>
          <dd>{s.calls}</dd>
        </div>
        <div>
          <dt>Triangles</dt>
          <dd>{(s.triangles / 1000).toFixed(1)}k</dd>
        </div>
        <div>
          <dt>Geometries</dt>
          <dd>{s.geometries}</dd>
        </div>
        <div>
          <dt>Textures</dt>
          <dd>{s.textures}</dd>
        </div>
        <div>
          <dt>Shaders</dt>
          <dd>{s.programs}</dd>
        </div>
        <div>
          <dt>Quality</dt>
          <dd>
            {getTier()} · {s.dpr}x
          </dd>
        </div>
      </dl>
      <div className="inspector-chapter">
        <span>{ch.name}</span>
        <span>{(progress * 100).toFixed(1)}%</span>
      </div>
      <div className="inspector-scrub" aria-hidden>
        <i style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="inspector-file">{ch.file}</p>
      <pre className="inspector-code">
        <code>{highlight(ch.code)}</code>
      </pre>
      <p className="inspector-foot">
        camera [{s.camera.join(", ")}] · <a href="/colophon">how it&apos;s built →</a>
      </p>
    </aside>
  );
}

// ── Command palette (⌘K / Ctrl K) ─────────────────────────────────────────
type Action = { id: string; label: string; group: string; hint?: string; run: () => void };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Mounting fresh on every open resets the query and selection.
  return open ? <PaletteDialog onClose={onClose} /> : null;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const actions = useMemo<Action[]>(() => {
    const go = (at: number) => () => scrollToProgress(at);
    const github = content.contacts.find((c) => c.label === "GitHub")?.url;
    return [
      ...STATIONS.map((m) => ({ id: `go-${m.id}`, label: m.label, group: "Go to", run: go(STATION_AT[m.id]) })),
      ...content.projects.map((p) => ({
        id: `p-${p.slug}`,
        label: p.title,
        hint: p.kind,
        group: "Case studies",
        run: () => router.push(p.url),
      })),
      { id: "inspect", label: "Toggle inspector", hint: "I", group: "Actions", run: toggleInspector },
      { id: "sound", label: "Toggle sound", hint: "S", group: "Actions", run: toggleSound },
      {
        id: "email",
        label: copied ? "Email copied!" : `Copy email (${content.email})`,
        group: "Actions",
        run: () => {
          void navigator.clipboard?.writeText(content.email);
          setCopied(true);
        },
      },
      { id: "classic", label: "Classic view", hint: "fast & accessible", group: "Pages", run: () => router.push("/classic") },
      { id: "colophon", label: "How it's built", group: "Pages", run: () => router.push("/colophon") },
      ...(github
        ? [{ id: "source", label: "View source on GitHub", group: "Pages", run: () => window.open(github, "_blank") }]
        : []),
    ];
  }, [copied, router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => `${a.group} ${a.label} ${a.hint ?? ""}`.toLowerCase().includes(q));
  }, [actions, query]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const run = (a: Action | undefined) => {
    if (!a) return;
    a.run();
    if (a.id !== "email") onClose();
  };

  let lastGroup = "";
  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          value={query}
          placeholder="Type a command or search…"
          aria-label="Search commands"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[active] ? `pal-${results[active].id}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(results[active]);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
        />
        <ul id="palette-list" role="listbox" className="palette-list">
          {results.length === 0 ? <li className="palette-empty">No results</li> : null}
          {results.map((a, i) => {
            const header = a.group !== lastGroup ? a.group : null;
            lastGroup = a.group;
            return (
              <li key={a.id} role="presentation">
                {header ? <p className="palette-group">{header}</p> : null}
                <button
                  id={`pal-${a.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "active" : ""}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(a)}
                >
                  <span>{a.label}</span>
                  {a.hint ? <kbd>{a.hint}</kbd> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <footer className="palette-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> select
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </footer>
      </div>
    </div>
  );
}

// ── Global keyboard shortcuts ─────────────────────────────────────────────
export function useShortcuts(openPalette: () => void, closePalette: () => void) {
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, [contenteditable=true]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "i") toggleInspector();
      else if (k === "s") toggleSound();
      else if (k === "/") {
        e.preventDefault();
        openPalette();
      } else if (k === "escape") {
        setInspector(false);
        closePalette();
      } else if (k === "j" || k === "k") {
        // jump to the next / previous chapter
        const stops = STATIONS.map((m) => STATION_AT[m.id]);
        const now = scroll.target;
        const next = k === "j" ? stops.find((s) => s > now + 0.005) : [...stops].reverse().find((s) => s < now - 0.005);
        if (next !== undefined) scrollToProgress(next);
      }
    },
    [openPalette, closePalette],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  useEffect(() => {
    try {
      if (localStorage.getItem("inspector") === "1") setInspector(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
}

// ── Custom cursor (fine pointers only) ────────────────────────────────────
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("has-cursor");
    const p = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
    let hover = false;
    let raf = 0;
    const move = (e: PointerEvent) => {
      p.x = e.clientX;
      p.y = e.clientY;
      const el = e.target as HTMLElement;
      hover = !!el.closest("a, button, input, textarea, [role=option], .card");
    };
    const tick = () => {
      p.rx += (p.x - p.rx) * 0.18;
      p.ry += (p.y - p.ry) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${p.rx}px, ${p.ry}px, 0) scale(${hover ? 1.8 : 1})`;
        ring.current.classList.toggle("hover", hover);
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);
  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden />
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}

// ── A hello for whoever opens DevTools ────────────────────────────────────
export function useConsoleGreeting() {
  useEffect(() => {
    const github = content.contacts.find((c) => c.label === "GitHub")?.url ?? "";
    console.log(
      `%c<${content.name} />%c\n\nHey, fellow developer 👋\nPress I to open the inspector, ⌘K for the command palette.\nSource: ${github}\nLet's talk: ${content.email}`,
      "font: 700 22px system-ui; color: #f2a7b5",
      "font: 13px system-ui; color: inherit",
    );
  }, []);
}
