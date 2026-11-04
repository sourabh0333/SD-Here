// Small math helpers shared by the camera choreography and overlays.

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** 0 before a, 1 after b, linear in-between. */
export const range = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const smooth = (x: number) => x * x * (3 - 2 * x);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
