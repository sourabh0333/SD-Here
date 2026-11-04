"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { content } from "@/lib/content";
import { prefersReducedMotion } from "@/lib/quality";
import { type Beat, frameSrc, Sequence } from "./Sequence";
import { Timeline } from "./Timeline";
import s from "./prototype.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

const CHAPTERS = [
  { id: "about", label: "About" },
  { id: "toolbox", label: "Toolbox" },
  { id: "experience", label: "Experience" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];
const chapterLabel = (id: string) => {
  const i = CHAPTERS.findIndex((c) => c.id === id);
  return `Chapter ${String(i + 1).padStart(2, "0")} · ${CHAPTERS[i].label}`;
};

/** The three statements that land over the flight into the loft. */
const ABOUT: Beat[] = [
  { k: "01", title: "I care about the details you feel before you notice them." },
  { k: "02", title: "Design systems, React and Next.js apps, motion and real-time 3D." },
  { k: "03", title: "Fuzzy ideas in. Shipped, measurable product out." },
];

/** One statement per group of the stack, landing as the camera reaches the pegboard. */
const TOOLBOX: Beat[] = content.stack.map((g, i) => ({
  k: String(i + 1).padStart(2, "0"),
  title: g.group,
  body: (
    <ul className={s.stackList}>
      {g.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ),
}));

const WORK: Beat[] = [
  {
    k: "04",
    title: "Selected work",
    body: <p className={s.beatLead}>From this site to dashboards, storefronts and design systems.</p>,
  },
];

const CONTACT: Beat[] = [
  {
    k: "05",
    title: "Let’s build something.",
    body: (
      <div className={s.contactBody}>
        <a href={`mailto:${content.email}`} className={s.mail}>
          {content.email} ↗
        </a>
        <ul className={s.socials}>
          {content.contacts
            .filter((c) => c.url.startsWith("http"))
            .map((c) => (
              <li key={c.label}>
                <a href={c.url} target="_blank" rel="noreferrer">
                  {c.label}
                </a>
              </li>
            ))}
        </ul>
      </div>
    ),
  },
];

export default function Prototype() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const lenis = reduced ? null : new Lenis({ lerp: 0.09 });
    const raf = (t: number) => lenis?.raf(t * 1000);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context(() => {
      // The counter in the bar follows whichever chapter fills the middle of the screen.
      CHAPTERS.forEach((c, i) => {
        ScrollTrigger.create({
          trigger: `#${c.id}`,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (st) => {
            const el = counter.current;
            if (!el) return;
            if (st.isActive) {
              el.textContent = `${String(i + 1).padStart(2, "0")} / ${String(CHAPTERS.length).padStart(2, "0")} · ${c.label}`;
              el.dataset.on = "";
              if (!reduced) gsap.fromTo(el, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "expo.out" });
            } else if (i === 0 && st.direction < 0) {
              delete el.dataset.on;
            }
          },
        });
      });

      if (reduced) return;

      // Hero: the name rises letter by letter, then the rest follows.
      const name = SplitText.create(`.${s.name}`, { type: "chars", mask: "chars" });
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from(name.chars, { yPercent: 110, duration: 1.4, stagger: 0.05 })
        .from(`.${s.heroMeta} > *`, { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, "-=1")
        .from(`.${s.heroBg}`, { scale: 1.15, opacity: 0, duration: 2.2, ease: "power2.out" }, 0);

      // Leaving the hero: the name drifts up and fades as the chapter takes over.
      gsap.to(`.${s.heroInner}`, {
        yPercent: -30,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: `.${s.hero}`, start: "top top", end: "bottom top", scrub: true },
      });

      // Big headings are wiped in word by word as they enter.
      gsap.utils.toArray<HTMLElement>(`.${s.reveal}`).forEach((el) => {
        const split = SplitText.create(el, { type: "words", mask: "words" });
        gsap.from(split.words, {
          yPercent: 100,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.06,
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      // Work rows: the artwork opens like a shutter, the title slides in.
      gsap.utils.toArray<HTMLElement>(`.${s.row}`).forEach((row) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 80%" } });
        tl.from(row.querySelector(`.${s.art}`), { clipPath: "inset(0 0 100% 0)", duration: 1.2, ease: "expo.inOut" })
          .from(row.querySelector(`.${s.rowTitle}`), { xPercent: -8, opacity: 0, duration: 1, ease: "expo.out" }, 0.2)
          .from(row.querySelectorAll(`.${s.rowMeta} > *`), { y: 16, opacity: 0, stagger: 0.06, duration: 0.8 }, 0.4);
      });
    }, root);

    // the display fonts change heading sizes, so measure the pins again once they arrive
    document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => {
      ctx.revert();
      if (lenis) {
        gsap.ticker.remove(raf);
        lenis.destroy();
      }
    };
  }, []);

  return (
    <div ref={root} className={s.page}>
      <header className={s.bar}>
        <Link href="/prototype" className={s.logo}>
          {content.name}
        </Link>
        <p ref={counter} className={s.counter} aria-hidden />
        <nav className={s.nav} aria-label="Chapters">
          {CHAPTERS.map((c) => (
            <a key={c.id} href={`#${c.id}`}>
              {c.label}
            </a>
          ))}
          <Link href="/" className={s.navCta}>
            Enter 3D ↗
          </Link>
        </nav>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────── */}
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.heroBg} style={{ backgroundImage: `url(${frameSrc("arrive", "wide", 0)})` }} aria-hidden />
          <div className={s.heroInner}>
            <p className={s.eyebrow}>
              <span className={s.dot} aria-hidden /> {content.availability}
            </p>
            <h1 id="hero-title" className={s.name}>
              {content.name}
            </h1>
            <div className={s.heroMeta}>
              <p className={s.role}>{content.role}</p>
              <p className={s.lead}>{content.headline}</p>
              <p className={s.hint}>Scroll to step inside ↓</p>
            </div>
          </div>
        </section>

        <Sequence id="about" flight="arrive" frames={120} beats={ABOUT} label={chapterLabel("about")} />
        <Sequence id="toolbox" flight="toolbox" frames={96} beats={TOOLBOX} screens={5} label={chapterLabel("toolbox")} />
        <Timeline id="experience" label={chapterLabel("experience")} />

        {/* ── Work: the camera crosses to the desk, then the projects ── */}
        <div id="work">
          <Sequence id="work-intro" flight="desk" frames={96} beats={WORK} screens={2.5} label={chapterLabel("work")} />
          <section className={s.work} aria-label="Projects">
            <ol className={s.rows}>
              {content.projects.map((p, i) => (
                <li key={p.slug} className={s.row}>
                  <Link href={p.url} className={s.rowLink}>
                    <div
                      className={s.art}
                      style={{ background: `radial-gradient(120% 100% at 20% 10%, ${p.colors[0]}, ${p.colors[1]})` }}
                      aria-hidden
                    >
                      <span className={s.artIndex}>{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div className={s.rowBody}>
                      <h3 className={s.rowTitle}>
                        {p.title}
                        {p.sample ? <span className={s.sample}>Sample</span> : null}
                      </h3>
                      <div className={s.rowMeta}>
                        <p>
                          {p.kind} · {p.year}
                        </p>
                        <p className={s.rowDesc}>{p.description}</p>
                        <ul className={s.tags} aria-label="Stack">
                          {p.stack.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ── Contact: out through the balcony door ────── */}
        <Sequence
          id="contact"
          flight="outro"
          frames={96}
          beats={CONTACT}
          screens={3}
          align="center"
          label={chapterLabel("contact")}
        />
      </main>

      <footer className={s.footer}>
        <p>
          © {content.name} · Built with Next.js, React Three Fiber &amp; Blender
        </p>
        <nav aria-label="Other views">
          <Link href="/classic">Classic view</Link>
          <Link href="/colophon">How it&apos;s built</Link>
        </nav>
      </footer>
    </div>
  );
}
