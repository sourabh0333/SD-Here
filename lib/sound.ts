import { Ambient } from "@/components/ui/ambient";

// Sound is always opt-in; this store lets the menu, palette and loader share it.
let ambient: Ambient | null = null;
let on = false;
const listeners = new Set<(on: boolean) => void>();

export const isSoundOn = () => on;

export function setSound(next: boolean) {
  if (!ambient) ambient = new Ambient();
  on = next;
  if (on) ambient.start();
  else ambient.stop();
  listeners.forEach((l) => l(on));
}

export const toggleSound = () => setSound(!on);

export function subscribeSound(l: (on: boolean) => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
