"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { content } from "@/lib/content";
import { STATIONS, STATION_AT, type StationId } from "@/lib/loft";
import { loft, setLoft, subscribeLoft } from "@/lib/loftStore";
import { onProgress, scrollToProgress } from "@/lib/scroll";

function useLoft<T>(pick: () => T, fallback: T) {
  return useSyncExternalStore(subscribeLoft, pick, () => fallback);
}

// ── Station navigation (right edge) ────────────────────────────────────────
export function StationNav() {
  const station = useLoft(() => loft.station, 0);
  return (
    <nav className="station-nav" aria-label="Sections">
      <ol>
        {STATIONS.map((s, i) => (
          <li key={s.id}>
            <button
              className={i === station ? "active" : ""}
              aria-current={i === station ? "step" : undefined}
              onClick={() => scrollToProgress(STATION_AT[s.id])}
            >
              <span className="station-label">{s.label}</span>
              <span className="station-dot" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ── Thin progress line along the bottom ───────────────────────────────────
export function ProgressLine() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      onProgress((p) => {
        if (ref.current) ref.current.style.transform = `scaleX(${p})`;
      }),
    [],
  );
  return (
    <div className="progress-line" aria-hidden>
      <div ref={ref} />
    </div>
  );
}

// ── Panels ────────────────────────────────────────────────────────────────
function Panel({ id, side = "left", children }: { id: StationId; side?: "left" | "right" | "bottom" | "hero"; children: React.ReactNode }) {
  const index = STATIONS.findIndex((s) => s.id === id);
  const visible = useLoft(() => loft.station === index && loft.settled > 0.6, false);
  return (
    <section
      className={`panel panel-${side} ${visible ? "show" : ""}`}
      aria-hidden={!visible}
      aria-label={STATIONS[index].label}
      inert={!visible}
    >
      {children}
    </section>
  );
}

function Eyebrow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="panel-eyebrow">
      <span>{String(n).padStart(2, "0")}</span> {children}
    </p>
  );
}

function WorkPanel() {
  const project = useLoft(() => loft.project, 0);
  const p = content.projects[project];
  const go = (d: number) => setLoft({ project: (project + d + content.projects.length) % content.projects.length });
  return (
    <>
      <Eyebrow n={4}>Selected work</Eyebrow>
      <div className="work-head">
        <h2>{p.title}</h2>
        <div className="work-pager">
          <button onClick={() => go(-1)} aria-label="Previous project">
            ←
          </button>
          <span>
            {project + 1}/{content.projects.length}
          </span>
          <button onClick={() => go(1)} aria-label="Next project">
            →
          </button>
        </div>
      </div>
      <p className="panel-meta">
        {p.kind} · {p.year} · {p.role}
      </p>
      <p>{p.description}</p>
      <ul className="chips">
        {p.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="work-list" role="tablist" aria-label="Projects">
        {content.projects.map((x, i) => (
          <button key={x.slug} role="tab" aria-selected={i === project} className={i === project ? "active" : ""} onClick={() => setLoft({ project: i })}>
            {x.title}
          </button>
        ))}
      </div>
      <Link href={p.url} className="panel-cta">
        Read the case study →
      </Link>
    </>
  );
}

function ContactPanel() {
  const email = content.email;
  return (
    <>
      <Eyebrow n={6}>Contact</Eyebrow>
      <h2 className="panel-big">
        getInTouch<span>()</span>
      </h2>
      <p>{content.availability}. My inbox is open — I usually reply within a day.</p>
      <form
        className="panel-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const subject = encodeURIComponent(`Hello from ${f.get("name") || "your website"}`);
          const body = encodeURIComponent(`${f.get("message") || ""}\n\n— ${f.get("name") || ""} (${f.get("from") || ""})`);
          window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
        }}
      >
        <div className="panel-form-row">
          <input name="name" placeholder="Name" autoComplete="name" aria-label="Your name" />
          <input name="from" type="email" placeholder="Email" autoComplete="email" aria-label="Your email" />
        </div>
        <textarea name="message" placeholder="Tell me about your project or role…" rows={3} aria-label="Message" />
        <button type="submit" className="panel-cta">
          Send message ↗
        </button>
      </form>
      <p className="panel-links">
        {content.contacts.map((c) => (
          <a key={c.label} href={c.url} {...(c.url.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
            {c.label}
          </a>
        ))}
        <Link href="/classic">Classic view</Link>
      </p>
    </>
  );
}

export function StationPanels() {
  return (
    <>
      <Panel id="hero" side="hero">
        <p className="hero-kicker">&lt;Portfolio /&gt; · {content.location}</p>
        <h1 className="hero-title">{content.name}</h1>
        <p className="hero-role">{content.role}</p>
        <p className="hero-lead">{content.headline}</p>
        <p className="hero-scroll">
          <span className="mouse" aria-hidden>
            <span className="wheel" />
          </span>
          Scroll to step inside
        </p>
      </Panel>

      <Panel id="about" side="right">
        <Eyebrow n={1}>About</Eyebrow>
        <h2>Hi, I&apos;m {content.name}.</h2>
        {content.about.slice(0, 3).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </Panel>

      <Panel id="skills" side="right">
        <Eyebrow n={2}>Toolbox</Eyebrow>
        <h2>What I build with</h2>
        <div className="stack-cols">
          {content.stack.map((g) => (
            <div key={g.group}>
              <h3>{g.group}</h3>
              <ul>
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel id="experience" side="left">
        <Eyebrow n={3}>Experience</Eyebrow>
        <h2>Where I&apos;ve worked</h2>
        <ol className="panel-timeline">
          {content.experience.map((e) => (
            <li key={e.period + e.company}>
              <span>{e.period}</span>
              <div>
                <h3>
                  {e.role} <em>· {e.company}</em>
                </h3>
                <p>{e.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel id="work" side="bottom">
        <WorkPanel />
      </Panel>

      <Panel id="cases" side="right">
        <Eyebrow n={5}>Case studies</Eyebrow>
        <h2>The wall of work</h2>
        <p>Click a poster to open its case study.</p>
        <ul className="case-list">
          {content.projects.map((p, i) => (
            <li key={p.slug}>
              <Link href={p.url}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {p.title}
                <em>{p.kind}</em>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="contact" side="left">
        <ContactPanel />
      </Panel>
    </>
  );
}
