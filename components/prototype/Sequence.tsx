"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/quality";
import s from "./prototype.module.css";

gsap.registerPlugin(ScrollTrigger);

/** Frames from scripts/capture-sequence.mjs (swap in Cycles renders under the same names). */
export const frameSrc = (flight: string, set: "wide" | "tall", i: number) =>
  `/sequences/${flight}/${set}/${String(i + 1).padStart(4, "0")}.webp`;

export type Beat = { k: string; title: ReactNode; body?: ReactNode };

type Props = {
  id: string;
  /** Folder under public/sequences. */
  flight: string;
  frames: number;
  label: string;
  beats: Beat[];
  /** Scroll length of the chapter, in screens. */
  screens?: number;
  /** Where the statements sit: over the left of the shot, or centred. */
  align?: "left" | "center";
};

/**
 * A pinned chapter whose scroll plays a rendered camera flight on a canvas,
 * with big statements landing over it. Frames load once the chapter is near.
 */
export function Sequence({ id, flight, frames, label, beats, screens = 4, align = "left" }: Props) {
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
    let want = reduced ? frames - 1 : 0;
    let cancelled = false;

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
        img.src = frameSrc(flight, set, i);
        images[i] = img;
      });

    // The frame on screen first, then the rest in batches of eight.
    const loadAll = async () => {
      await load(want);
      if (reduced) return;
      for (let start = 0; start < frames && !cancelled; start += 8) {
        const batch = Array.from({ length: Math.min(8, frames - start) }, (_, k) => start + k);
        await Promise.all(batch.map((i) => (images[i] ? null : load(i))));
      }
    };
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near.disconnect();
          loadAll();
        }
      },
      { rootMargin: "150% 0px" },
    );
    near.observe(el);

    size();
    window.addEventListener("resize", size);
    const cleanup = () => {
      cancelled = true;
      near.disconnect();
      window.removeEventListener("resize", size);
    };
    if (reduced) return cleanup;

    // the statements stack in one place only while the scroll plays them
    el.dataset.live = "";
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${innerHeight * screens}`,
          pin: `.${s.seqStage}`,
          scrub: true,
          onUpdate: (st) => {
            const next = Math.round(st.progress * (frames - 1));
            if (next !== want) {
              want = next;
              draw();
            }
          },
        },
      });
      tl.to(`.${s.seqBar} i`, { scaleX: 1, duration: 1 }, 0);
      // each statement rises in, holds, then lifts away (the last one stays)
      const slot = 1 / beats.length;
      gsap.utils.toArray<HTMLElement>(`.${s.beat}`).forEach((b, i) => {
        const at = i * slot;
        tl.fromTo(
          b,
          { autoAlpha: 0, y: 80, filter: "blur(8px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: slot * 0.3 },
          at + slot * 0.05,
        );
        if (i < beats.length - 1) tl.to(b, { autoAlpha: 0, y: -80, duration: slot * 0.25 }, at + slot * 0.72);
      });
    }, el);

    return () => {
      cleanup();
      ctx.revert();
      delete el.dataset.live;
    };
  }, [flight, frames, beats, screens]);

  return (
    <section id={id} ref={section} className={s.seq} data-align={align} aria-label={label}>
      <div className={s.seqStage}>
        <canvas ref={canvas} className={s.seqCanvas} aria-hidden />
        <div className={s.seqShade} aria-hidden />
        <p className={s.seqLabel}>{label}</p>
        <div className={s.beats}>
          {beats.map((b) => (
            <div key={b.k} className={s.beat}>
              <span className={s.beatKey}>{b.k}</span>
              <p className={s.beatTitle}>{b.title}</p>
              {b.body ? <div className={s.beatBody}>{b.body}</div> : null}
            </div>
          ))}
        </div>
        <div className={s.seqBar} aria-hidden>
          <i />
        </div>
      </div>
    </section>
  );
}
