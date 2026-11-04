"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { STATION_AT } from "@/lib/loft";
import { scroll } from "@/lib/scroll";

const Experience = dynamic(() => import("../loft/LoftExperience"), { ssr: false });

type CaptureWindow = Window & {
  __ready?: boolean;
  __stations?: typeof STATION_AT;
  __frame?: (t: number) => Promise<void>;
};

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** The loft with nothing on top; the capture script drives the camera through window.__frame. */
export default function Capture() {
  useEffect(() => {
    const w = window as CaptureWindow;
    w.__stations = STATION_AT;
    w.__frame = async (t) => {
      scroll.target = scroll.current = t;
      // the camera moves on the next frame, then postprocessing needs one more
      await nextFrame();
      await nextFrame();
      await nextFrame();
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Experience onReady={() => ((window as CaptureWindow).__ready = true)} />
    </div>
  );
}
