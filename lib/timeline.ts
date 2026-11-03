// Scroll timeline: every chapter of the journey owns a slice of [0, 1].

export const T = {
  hero: [0, 0.06],
  welcome: [0.06, 0.2],
  aboutLetters: [0.2, 0.27],
  about: [0.27, 0.38],
  mount: [0.38, 0.41],
  ride: [0.41, 0.62],
  skills: [0.44, 0.58],
  statue: [0.62, 0.68],
  work: [0.68, 0.8],
  whiteout: [0.795, 0.83],
  skydive: [0.81, 0.9],
  contact: [0.9, 1],
} as const;

export const MENU = [
  { label: "Home", at: 0 },
  { label: "About", at: 0.33 },
  { label: "Skills", at: 0.5 },
  { label: "Work", at: 0.74 },
  { label: "Contact", at: 0.985 },
];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** 0 before a, 1 after b, linear in-between. */
export const range = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const smooth = (x: number) => x * x * (3 - 2 * x);

/** Fades in over [a, a+f] and out over [b-f, b]. */
export const window01 = (t: number, a: number, b: number, f = 0.015) =>
  Math.min(range(t, a, a + f), 1 - range(t, b - f, b));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
