// Scroll timeline: every chapter of the journey owns a slice of [0, 1].

export const T = {
  hero: [0, 0.05],
  swoop: [0.03, 0.075],
  welcome: [0.07, 0.165],
  arch: [0.16, 0.19],
  aboutLetters: [0.19, 0.245],
  about: [0.25, 0.36],
  hiRise: [0.255, 0.285],
  reveal: [0.245, 0.272],
  mount: [0.36, 0.39],
  ride: [0.39, 0.6],
  skillGate: [0.44, 0.47],
  skills: [0.52, 0.59],
  statue: [0.6, 0.665],
  work: [0.665, 0.775],
  whiteout: [0.772, 0.8],
  skydive: [0.785, 0.855],
  reveal3d: [0.855, 0.885],
  contact: [0.885, 0.95],
  room: [0.95, 1],
  thanks: [0.975, 1],
} as const;

export const MENU = [
  { label: "Home", at: 0 },
  { label: "About", at: 0.32 },
  { label: "Skills", at: 0.565 },
  { label: "Work", at: 0.72 },
  { label: "Contact", at: 0.93 },
];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** 0 before a, 1 after b, linear in-between. */
export const range = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const smooth = (x: number) => x * x * (3 - 2 * x);

/** Fades in over [a, a+f] and out over [b-f, b]. */
export const window01 = (t: number, a: number, b: number, f = 0.015) =>
  Math.min(range(t, a, a + f), 1 - range(t, b - f, b));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
