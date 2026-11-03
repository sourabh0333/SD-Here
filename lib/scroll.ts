// A tiny global scroll store shared by the 3D scene (useFrame) and DOM overlays.
// `target` follows the native scrollbar, `current` eases toward it every frame.

type Listener = (progress: number) => void;

export const scroll = {
  target: 0,
  current: 0,
  velocity: 0,
};

const listeners = new Set<Listener>();
let running = false;
let last = 0;

function readTarget() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scroll.target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

function tick(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
  last = now;
  const prev = scroll.current;
  // Frame-rate independent damping.
  scroll.current += (scroll.target - scroll.current) * (1 - Math.exp(-dt * 4.5));
  if (Math.abs(scroll.target - scroll.current) < 0.00001) scroll.current = scroll.target;
  scroll.velocity = (scroll.current - prev) / dt;
  listeners.forEach((l) => l(scroll.current));
  requestAnimationFrame(tick);
}

export function startScroll() {
  if (running || typeof window === "undefined") return;
  running = true;
  readTarget();
  scroll.current = scroll.target;
  window.addEventListener("scroll", readTarget, { passive: true });
  window.addEventListener("resize", readTarget);
  requestAnimationFrame(tick);
}

export function onProgress(listener: Listener) {
  listeners.add(listener);
  listener(scroll.current);
  return () => {
    listeners.delete(listener);
  };
}

export function scrollToProgress(p: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: p * max, behavior: "smooth" });
}
