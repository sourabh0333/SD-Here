"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { content } from "@/lib/content";
import { hasWebGL } from "@/lib/quality";
import { startScroll } from "@/lib/scroll";
import { setSound } from "@/lib/sound";
import { CommandPalette, Cursor, InspectorPanel, useConsoleGreeting, useShortcuts } from "./ui/DevTools";
import { ContactForm, Controls, HeroTitle, Letterbox, Loader, Outro, ScrollHint, Skills } from "./ui/Overlay";

// WebGL only runs in the browser.
const Experience = dynamic(() => import("./three/Experience"), { ssr: false });

export default function Portfolio() {
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [palette, setPalette] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const onReady = useCallback(() => setReady(true), []);
  const openPalette = useCallback(() => setPalette(true), []);
  const closePalette = useCallback(() => setPalette(false), []);

  useShortcuts(openPalette, closePalette);
  useConsoleGreeting();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    startScroll();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability check on mount
    setWebgl(hasWebGL());
  }, []);

  // Keep the page still until the visitor chooses how to enter.
  useEffect(() => {
    document.documentElement.style.overflow = entered ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [entered]);

  if (!webgl) {
    return (
      <main className="nowebgl">
        <p className="loader-tag">&lt;Portfolio /&gt;</p>
        <h1>{content.name}</h1>
        <p>Your browser can&apos;t display the 3D experience, but everything is available in the classic view.</p>
        <a className="loader-btn primary" href="/classic">
          Open the classic view →
        </a>
      </main>
    );
  }

  return (
    <>
      <a href="/classic" className="skip-3d">
        Skip the 3D experience — classic view
      </a>
      <div className="stage">
        <Experience onReady={onReady} />
      </div>
      <Letterbox />
      <HeroTitle />
      <Skills />
      <ScrollHint />
      <ContactForm />
      <Outro />
      <Controls onPalette={openPalette} />
      <InspectorPanel />
      <CommandPalette open={palette} onClose={closePalette} />
      <Cursor />
      <Loader
        ready={ready}
        onEnter={(withSound) => {
          setEntered(true);
          if (withSound) setSound(true);
        }}
      />
      {/* The tall spacer drives the native scrollbar (and touch scrolling). */}
      <div className="scroll-space" aria-hidden />
    </>
  );
}
