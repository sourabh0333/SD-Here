// Picks a rendering tier from what the device can actually do (not its name).

export type Tier = "high" | "low";

let cached: Tier | null = null;

export function hasWebGL() {
  if (typeof document === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function getTier(): Tier {
  if (cached) return cached;
  if (typeof window === "undefined") return "high";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const touch = matchMedia("(pointer: coarse)").matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const forced = new URLSearchParams(location.search).get("quality");
  cached = forced === "low" || forced === "high" ? forced : (touch && small) || fewCores || lowMemory ? "low" : "high";
  return cached;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
