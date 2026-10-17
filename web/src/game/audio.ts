let ctx: AudioContext | null = null;
let enabled = false;

type Tone = "tap" | "bloom" | "soft" | "bird" | "wind" | "stream" | "bee";

export function loadSoundPref(): boolean {
  try {
    enabled = localStorage.getItem("harmony-garden-sound") === "1";
  } catch {
    enabled = false;
  }
  return enabled;
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem("harmony-garden-sound", on ? "1" : "0");
  } catch {
    /* private mode */
  }
  if (!on || typeof AudioContext === "undefined") return;
  ctx ??= new AudioContext();
  void ctx.resume();
}

export function blip(kind: Tone): void {
  if (!enabled || typeof AudioContext === "undefined") return;
  ctx ??= new AudioContext();
  const context = ctx;
  void context.resume();
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);
  const now = context.currentTime;
  const spec: Record<Tone, [number, number, OscillatorType]> = {
    tap: [540, 0.07, "triangle"],
    bloom: [640, 0.22, "sine"],
    soft: [300, 0.18, "sine"],
    bird: [920, 0.14, "triangle"],
    wind: [220, 0.28, "sine"],
    stream: [480, 0.16, "sine"],
    bee: [170, 0.18, "triangle"],
  };
  const [freq, dur, type] = spec[kind];
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (kind === "bird") osc.frequency.linearRampToValueAtTime(1280, now + 0.12);
  if (kind === "bee") osc.frequency.linearRampToValueAtTime(140, now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}
