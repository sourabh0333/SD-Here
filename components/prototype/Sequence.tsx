"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/quality";
import s from "./prototype.module.css";

gsap.registerPlugin(ScrollTrigger);

/** Frames from scripts/capture-sequence.mjs (swap in Cycles renders under the same names). */
const FRAMES = 120;
const src = (set: "wide" | "tall", i: number) => `/sequences/loft/${set}/${String(i + 1).padStart(4, "0")}.webp`;

type Beat = { k: string; text: string };

/**
 * A pinned chapter whose scroll plays a rendered camera flight on a canvas,
 * with big statements landing over it.
 */
export function Sequence({ id, beats, label }: { id: string; beats: Beat[]; label: string }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = section.current;
    const cv = canvas.current;
    const g = cv?.getContext("2d");
    if (!el || !cv || !g) return;

    const reduced = prefersReducedMotion();
    const set = innerWidth / innerHeight < 0.9 ? "tall" : "wide";
    const images: HTMLImageElement[] = [];
    const loaded: boolean[] = [];
    let want = reduced ? FRAMES - 1 : 0;

    const draw = () => {
      // the nearest frame at or before the one we want that has arrived
      let i = want;
      while (i > 0 && !loaded[i]) i--;
      const img = images[i];
      if (!img || !loaded[i]) return;
      const { width: w, height: h } = cv;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientHeight * dpr);
      draw();
    };

    // First (or, with reduced motion, last) frame straight away, then the rest in order.
    const load = (i: number) =>
      new Promise<void>((done) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          loaded[i] = true;
          if (Math.abs(i - want) < 2 || i === 0) draw();
          done();
        };
        img.onerror = () => done();
        img.src = src(set, i);
        images[i] = img;
      });
    let cancelled = false;
    (async () => {
      await load(want);
      if (reduced) return;
      for (let start = 0; start < FRAMES && !cancelled; start += 8) {
        await Promise.all(Array.from({ length: Math.min(8, FRAMES - start) }, (_, k) => (loaded[start + k] ? null : load(start + k))));
      }
    })();

    size();
    window.addEventListener("resize", size);
    if (reduced) {
      return () => {
        cancelled = true;
        window.removeEventListener("resize", size);
      };
    }

    // the statements stack in one place only while the scroll plays them
    el.dataset.live = "";
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${innerHeight * 4}`,
          pin: `.${s.seqStage}`,
          scrub: true,
          onUpdate: (st) => {
            const next = Math.round(st.progress * (FRAMES - 1));
            if (next !== want) {
              want = next;
              draw();
            }
          },
        },
      });
      tl.to(`.${s.seqBar} i`, { scaleX: 1, duration: 1 }, 0);
      // each statement rises in, holds, then lifts away
      const slot = 1 / beats.length;
      gsap.utils.toArray<HTMLElement>(`.${s.beat}`).forEach((b, i) => {
        const at = i * slot;
        tl.fromTo(b, { opacity: 0, y: 80, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: slot * 0.3 }, at + slot * 0.05);
        if (i < beats.length - 1) tl.to(b, { opacity: 0, y: -80, duration: slot * 0.25 }, at + slot * 0.72);
      });
    }, el);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", size);
      ctx.revert();
      delete el.dataset.live;
    };
  }, [beats]);

  return (
    <section id={id} ref={section} className={s.seq} aria-label={label}>
      <div className={s.seqStage}>
        <canvas ref={canvas} className={s.seqCanvas} aria-hidden />
        <div className={s.seqShade} aria-hidden />
        <p className={s.seqLabel}>{label}</p>
        <div className={s.beats}>
          {beats.map((b) => (
            <p key={b.k} className={s.beat}>
              <span className={s.beatKey}>{b.k}</span>
              {b.text}
            </p>
          ))}
        </div>
        <div className={s.seqBar} aria-hidden>
          <i />
        </div>
      </div>
    </section>
  );
}
