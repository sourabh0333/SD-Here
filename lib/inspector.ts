// Inspector mode: a developer overlay that shows how the 3D world is built.
// WebGL writes stats here; the DOM panel subscribes. No React state per frame.

export type Stats = {
  fps: number;
  ms: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  dpr: number;
  camera: [number, number, number];
};

type Listener = () => void;

export const inspector = {
  on: false,
  stats: {
    fps: 0,
    ms: 0,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    dpr: 1,
    camera: [0, 0, 0],
  } as Stats,
};

const listeners = new Set<Listener>();

export function subscribeInspector(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function emitInspector() {
  listeners.forEach((l) => l());
}

export function setInspector(on: boolean) {
  inspector.on = on;
  try {
    localStorage.setItem("inspector", on ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  emitInspector();
}

export const toggleInspector = () => setInspector(!inspector.on);
