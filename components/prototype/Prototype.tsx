"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { content } from "@/lib/content";
import { prefersReducedMotion } from "@/lib/quality";
import { Sequence } from "./Sequence";
import s from "./prototype.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** The three statements that land over the flight into the loft. */
const BEATS = [
  { k: "01", text: "I care about the details you feel before you notice them." },
  { k: "02", text: "Design systems, React and Next.js apps, motion and real-time 3D." },
  { k: "03", text: "Fuzzy ideas in. Shipped, measurable product out." },
];

export default function Prototype() {
  const root = useRef<HTMLDivElement>(null);

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

      // Every big heading is wiped in word by word as it enters.
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
        <nav className={s.nav} aria-label="Prototype">
          <a href="#chapter">About</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
          <Link href="/" className={s.navCta}>
            Enter 3D ↗
          </Link>
        </nav>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────── */}
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.heroBg} aria-hidden />
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

        {/* ── Chapter 01: the flight into the loft ─────── */}
        <Sequence id="chapter" beats={BEATS} label="Chapter 01 · About" />

        {/* ── Work ─────────────────────────────────────── */}
        <section id="work" className={s.work} aria-labelledby="work-title">
          <p className={s.kicker}>Chapter 02</p>
          <h2 id="work-title" className={`${s.big} ${s.reveal}`}>
            Selected work
          </h2>
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

        {/* ── Contact ──────────────────────────────────── */}
        <section id="contact" className={s.contact} aria-labelledby="contact-title">
          <p className={s.kicker}>Chapter 03</p>
          <h2 id="contact-title" className={`${s.huge} ${s.reveal}`}>
            Let&apos;s build something.
          </h2>
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
        </section>
      </main>
    </div>
  );
}
