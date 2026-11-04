"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { content } from "@/lib/content";
import { prefersReducedMotion } from "@/lib/quality";
import s from "./prototype.module.css";
import { frameSrc } from "./Sequence";

gsap.registerPlugin(ScrollTrigger);

/**
 * Experience as a sideways timeline: the chapter pins over the loft's year shelves
 * and the scroll slides the roles past, the shelves drifting slower behind them.
 */
export function Timeline({ id, label }: { id: string; label: string }) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = section.current;
    if (!el || prefersReducedMotion()) return;
    el.dataset.live = "";
    const ctx = gsap.context(() => {
      const track = el.querySelector<HTMLElement>(`.${s.track}`)!;
      const distance = () => track.scrollWidth - innerWidth;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      tl.to(track, { x: () => -distance(), duration: 1 }, 0)
        .fromTo(`.${s.tlBg}`, { xPercent: 0, scale: 1.12 }, { xPercent: -6, scale: 1.12, duration: 1 }, 0)
        .to(`.${s.tlBar} i`, { scaleX: 1, duration: 1 }, 0);
      // each role's year swells as it passes the middle of the screen
      gsap.utils.toArray<HTMLElement>(`.${s.job}`).forEach((card) => {
        gsap.fromTo(
          card.querySelector(`.${s.period}`),
          { opacity: 0.25, scale: 0.86 },
          {
            opacity: 1,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              containerAnimation: tl,
              start: "left 80%",
              end: "left 30%",
              scrub: true,
            },
          },
        );
      });
    }, el);
    return () => {
      ctx.revert();
      delete el.dataset.live;
    };
  }, []);

  return (
    <section id={id} ref={section} className={s.tl} aria-labelledby={`${id}-title`}>
      <div className={s.tlBg} aria-hidden>
        <picture>
          <source media="(max-aspect-ratio: 9/10)" srcSet={frameSrc("shelves", "tall", 0)} />
          <img src={frameSrc("shelves", "wide", 0)} alt="" />
        </picture>
      </div>
      <div className={s.tlShade} aria-hidden />
      <p className={s.seqLabel}>{label}</p>
      <div className={s.track}>
        <div className={s.tlIntro}>
          <h2 id={`${id}-title`} className={`${s.big} ${s.reveal}`}>
            Experience
          </h2>
          <p className={s.lead}>Where I&apos;ve worked, newest first.</p>
          {/* TODO: remove once lib/content.ts has the real roles */}
          <p className={s.sample}>Sample roles</p>
        </div>
        {content.experience.map((e) => (
          <article key={e.period + e.company} className={s.job}>
            <p className={s.period}>{e.period}</p>
            <h3 className={s.roleTitle}>{e.role}</h3>
            <p className={s.company}>{e.company}</p>
            <p className={s.roleSummary}>{e.summary}</p>
          </article>
        ))}
      </div>
      <div className={s.tlBar} aria-hidden>
        <i />
      </div>
    </section>
  );
}
