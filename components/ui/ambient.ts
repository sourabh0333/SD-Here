// Generative ambient soundtrack (Web Audio) — no audio files needed.

const CHORDS = [
  [220.0, 277.18, 329.63, 415.3], // A maj7
  [185.0, 233.08, 277.18, 369.99], // F#m7
  [196.0, 246.94, 293.66, 369.99], // G maj7
  [164.81, 207.65, 246.94, 329.63], // E
];

export class Ambient {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;

  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.42;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.35;
      this.master.connect(filter);
      filter.connect(this.ctx.destination);
      filter.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(this.ctx.destination);
    }
    void this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.linearRampToValueAtTime(0.22, now + 2);
    this.playChord();
    if (!this.timer) this.timer = setInterval(() => this.playChord(), 5200);
  }

  stop() {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(0, now + 1);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private playChord() {
    const ctx = this.ctx!;
    const chord = CHORDS[this.step++ % CHORDS.length];
    const now = ctx.currentTime;
    chord.forEach((f, i) => {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "triangle" : "sine";
        osc.frequency.value = i === 0 ? f / 2 : f;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.08, now + 1.8);
        g.gain.linearRampToValueAtTime(0, now + 6.4);
        osc.connect(g);
        g.connect(this.master!);
        osc.start(now);
        osc.stop(now + 6.5);
      }
    });
    // sparkle note
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = chord[1 + (this.step % 3)] * 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now + 1);
    g.gain.linearRampToValueAtTime(0.05, now + 1.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(now + 1);
    osc.stop(now + 3.6);
  }
}
