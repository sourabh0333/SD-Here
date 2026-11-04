// Shared state between the WebGL loft and the DOM overlays (no per-frame React renders).

type Listener = () => void;

export const loft = {
  /** index into STATIONS of the station we're at (or flying to) */
  station: 0,
  /** 1 while holding on a station, → 0 mid-flight */
  settled: 1,
  /** project shown on the centre monitor */
  project: 0,
  /** poster under the pointer (-1 = none) */
  hoverPoster: -1,
};

const listeners = new Set<Listener>();

export function subscribeLoft(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function emitLoft() {
  listeners.forEach((l) => l());
}

export function setLoft(patch: Partial<typeof loft>) {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof typeof loft)[]) {
    if (loft[k] !== patch[k]) {
      loft[k] = patch[k] as number;
      changed = true;
    }
  }
  if (changed) emitLoft();
}
