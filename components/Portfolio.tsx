"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { startScroll } from "@/lib/scroll";
import { Controls, HeroTitle, Letterbox, Loader, Outro, ScrollHint, Skills } from "./ui/Overlay";

// WebGL only runs in the browser.
const Experience = dynamic(() => import("./three/Experience"), { ssr: false });

export default function Portfolio() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    startScroll();
  }, []);

  return (
    <>
      <div className="stage">
        <Experience onReady={onReady} />
      </div>
      <Letterbox />
      <HeroTitle />
      <Skills />
      <ScrollHint />
      <Outro />
      <Controls />
      <Loader ready={ready} />
      {/* The tall spacer drives the native scrollbar (and touch scrolling). */}
      <div className="scroll-space" aria-hidden />
    </>
  );
}
