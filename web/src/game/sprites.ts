import { PALETTE, ellipse, fillTriangle, fluff, grid, line, plot, rect, stalk, toRows } from "./raster";

export type Mood = "soft" | "worry" | "angry" | "sad" | "excited" | "shy";

export const SPRITE_KINDS = [
  "bramble",
  "pip",
  "moss",
  "lumen",
  "willow",
  "ash",
  "lichen",
  "ember",
  "sprout",
  "mothwing",
  "pinekit",
  "emberbud",
  "pine",
  "butterfly",
  "butterflyShut",
  "flower",
  "lantern",
  "can",
  "pebble",
  "pebbleWarm",
  "stump",
  "bench",
  "leaf",
] as const;

export type SpriteKind = (typeof SPRITE_KINDS)[number];

const cache = new Map<string, string[]>();

export function spriteRows(kind: SpriteKind, blink = false): string[] {
  const key = `${kind}:${blink ? "1" : "0"}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const rows = paint(kind, blink);
  for (const row of rows) {
    if (row.length !== rows[0].length) throw new Error(`Uneven sprite ${kind}`);
    for (const ch of row) {
      if (ch !== "." && !PALETTE[ch]) throw new Error(`Missing color ${ch} on ${kind}`);
    }
  }
  cache.set(key, rows);
  return rows;
}

function paint(kind: SpriteKind, blink: boolean): string[] {
  switch (kind) {
    case "bramble":
      return paintBramble(blink);
    case "mothwing":
      return recolor(paintBramble(blink), { c: "U", C: "w", s: "a", G: "A", l: "u", g: "A", f: "U" });
    case "pinekit":
      return recolor(paintBramble(blink), { c: "l", C: "f", s: "G" });
    case "emberbud":
      return recolor(paintBramble(blink), { c: "R", C: "y", s: "r", G: "r", l: "y", f: "y" });
    case "pip":
      return paintPal(blink, "excited", "up");
    case "moss":
      return paintMoss(blink);
    case "lumen":
      return paintLumen(blink);
    case "willow":
      return paintWillow(blink);
    case "ash":
      return paintAsh(blink);
    case "lichen":
      return paintLichen(blink);
    case "ember":
      return paintEmber(blink);
    case "sprout":
      return paintSprout(blink);
    case "pine":
      return paintPine();
    case "butterfly":
      return paintButterfly(true);
    case "butterflyShut":
      return paintButterfly(false);
    case "flower":
      return paintFlower();
    case "lantern":
      return paintLantern();
    case "can":
      return paintCan();
    case "pebble":
      return paintPebble(false);
    case "pebbleWarm":
      return paintPebble(true);
    case "stump":
      return paintStump();
    case "bench":
      return paintBench();
    case "leaf":
      return paintLeaf();
    default:
      return paintBramble(blink);
  }
}

function recolor(rows: string[], map: Record<string, string>): string[] {
  return rows.map((row) => [...row].map((ch) => map[ch] ?? ch).join(""));
}

type Look = {
  w: number;
  h: number;
  cx: number;
  headY: number;
  bodyY: number;
  bodyRx: number;
  bodyRy: number;
  headRx: number;
  headRy: number;
  body: string;
  belly: string;
  shadow: string;
  ear: string;
  inner: string;
  mood: Mood;
  ears: "up" | "down" | "spike";
  blink: boolean;
};

function sitter(look: Look, decorate?: (g: string[][], phase: "back" | "front") => void): string[] {
  const g = grid(look.w, look.h);
  const cx = look.cx;
  decorate?.(g, "back");
  if (look.ears === "up") {
    stalk(g, cx - 6, look.headY - 1, cx - 14, look.headY - 18, 4.8, look.ear);
    stalk(g, cx + 6, look.headY - 1, cx + 14, look.headY - 18, 4.8, look.ear);
    stalk(g, cx - 5, look.headY - 1, cx - 11, look.headY - 14, 2.2, look.inner);
    stalk(g, cx + 5, look.headY - 1, cx + 11, look.headY - 14, 2.2, look.inner);
    stalk(g, cx - 6, look.headY - 2, cx - 12, look.headY - 15, 0.9, "l");
    stalk(g, cx + 6, look.headY - 2, cx + 12, look.headY - 15, 0.9, "l");
  } else if (look.ears === "down") {
    stalk(g, cx - 8, look.headY, cx - 16, look.headY + 14, 3.6, look.ear);
    stalk(g, cx + 8, look.headY, cx + 16, look.headY + 14, 3.6, look.ear);
    stalk(g, cx - 7, look.headY + 1, cx - 13, look.headY + 10, 1.7, look.inner);
    stalk(g, cx + 7, look.headY + 1, cx + 13, look.headY + 10, 1.7, look.inner);
  } else {
    const spikes: [number, number][] = [
      [-10, -16],
      [-4, -19],
      [2, -18],
      [8, -16],
      [0, -21],
    ];
    for (const [dx, dy] of spikes) {
      stalk(g, cx + dx * 0.25, look.headY - 6, cx + dx, look.headY + dy, 2.3, look.ear);
    }
  }
  ellipse(g, cx, look.bodyY, look.bodyRx, look.bodyRy, look.body);
  ellipse(g, cx, look.bodyY - 2, look.bodyRx * 0.55, look.bodyRy * 0.48, look.belly);
  ellipse(g, cx, look.headY, look.headRx, look.headRy, look.body);
  ellipse(g, cx - 1, look.headY - 3, look.headRx * 0.48, look.headRy * 0.36, look.belly);
  fluff(g, look.body, look.belly, look.shadow);
  ellipse(g, cx - 6, look.bodyY + look.bodyRy - 2, 4.4, 2.3, "B");
  ellipse(g, cx + 6, look.bodyY + look.bodyRy - 2, 4.4, 2.3, "B");
  ellipse(g, cx - 6, look.bodyY + look.bodyRy - 3, 2.4, 1.1, "n");
  ellipse(g, cx + 6, look.bodyY + look.bodyRy - 3, 2.4, 1.1, "n");
  ellipse(g, cx - 5, look.bodyY + look.bodyRy * 0.45, 3, 2.1, look.shadow);
  ellipse(g, cx + 4, look.bodyY + look.bodyRy * 0.45, 3, 2.1, look.shadow);
  face(g, cx, look.headY + 1, look.mood, look.blink);
  decorate?.(g, "front");
  return toRows(g);
}

function face(g: string[][], cx: number, cy: number, mood: Mood, blink: boolean): void {
  eye(g, cx - 5.2, cy, blink, mood);
  eye(g, cx + 5.2, cy, blink, mood);
  if (mood === "worry") {
    line(g, cx - 8, cy - 5, cx - 2, cy - 6.4, "k");
    line(g, cx + 2, cy - 6.4, cx + 8, cy - 5, "k");
  } else if (mood === "angry") {
    line(g, cx - 8, cy - 6.5, cx - 2, cy - 4.4, "k");
    line(g, cx + 2, cy - 4.4, cx + 8, cy - 6.5, "k");
  } else if (mood === "sad" || mood === "shy") {
    line(g, cx - 8, cy - 6, cx - 2, cy - 5, "k");
    line(g, cx + 2, cy - 5, cx + 8, cy - 6, "k");
  }
  ellipse(g, cx, cy + 5.2, 1.05, 0.8, "n");
  if (mood === "excited") {
    ellipse(g, cx, cy + 8, 2.4, 1.5, "k");
    ellipse(g, cx, cy + 7.6, 1.5, 0.8, "r");
  } else if (mood === "sad" || mood === "shy") {
    line(g, cx - 2.4, cy + 8, cx, cy + 7, "k");
    line(g, cx, cy + 7, cx + 2.4, cy + 8, "k");
  } else if (mood === "angry") {
    line(g, cx - 2.2, cy + 7.6, cx + 2.2, cy + 7.6, "k");
  } else {
    line(g, cx - 2.4, cy + 7.2, cx, cy + 8.2, "k");
    line(g, cx, cy + 8.2, cx + 2.4, cy + 7.2, "k");
  }
}

function eye(g: string[][], x: number, y: number, blink: boolean, mood: Mood): void {
  if (blink) {
    line(g, x - 3.2, y, x + 3.2, y, "k");
    return;
  }
  const drop = mood === "shy" || mood === "sad" ? 1.3 : 0.45;
  ellipse(g, x, y, 3.5, 4, "k");
  ellipse(g, x, y + 0.2, 3, 3.4, "i");
  ellipse(g, x + 0.15, y + drop, 1.35, 1.7, "p");
  plot(g, x - 1.15, y - 1.35, "h");
  plot(g, x - 0.35, y - 1.85, "C");
}

function paintBramble(blink: boolean): string[] {
  return sitter(
    {
      w: 48,
      h: 58,
      cx: 22,
      headY: 26,
      bodyY: 44,
      bodyRx: 12,
      bodyRy: 10,
      headRx: 11,
      headRy: 10,
      body: "c",
      belly: "C",
      shadow: "s",
      ear: "G",
      inner: "B",
      mood: "soft",
      ears: "up",
      blink,
    },
    (g, phase) => {
      if (phase === "back") {
        stalk(g, 30, 48, 40, 36, 4.2, "l");
        stalk(g, 40, 36, 44, 26, 3.2, "G");
        stalk(g, 44, 26, 38, 18, 2.2, "f");
        return;
      }
      stalk(g, 22, 18, 22, 5, 2.2, "l");
      stalk(g, 22, 7, 30, 3, 1.8, "G");
      stalk(g, 28, 4, 34, 7, 1.3, "f");
      ellipse(g, 12, 46, 3, 1.8, "l");
      ellipse(g, 32, 47, 3.2, 1.8, "G");
    },
  );
}

function paintPal(blink: boolean, mood: Mood, ears: Look["ears"]): string[] {
  return sitter({
    w: 40,
    h: 48,
    cx: 20,
    headY: 22,
    bodyY: 36,
    bodyRx: 10,
    bodyRy: 8,
    headRx: 9,
    headRy: 8,
    body: "c",
    belly: "C",
    shadow: "s",
    ear: "G",
    inner: "B",
    mood,
    ears,
    blink,
  });
}

function paintMoss(blink: boolean): string[] {
  return sitter(
    {
      w: 40,
      h: 48,
      cx: 20,
      headY: 24,
      bodyY: 36,
      bodyRx: 11,
      bodyRy: 8,
      headRx: 9,
      headRy: 8,
      body: "c",
      belly: "C",
      shadow: "s",
      ear: "m",
      inner: "g",
      mood: "soft",
      ears: "down",
      blink,
    },
    (g, phase) => {
      if (phase === "back") return;
      ellipse(g, 20, 16, 8, 3.4, "G");
      ellipse(g, 20, 15, 5, 1.6, "l");
      plot(g, 14, 18, "f");
      plot(g, 26, 18, "f");
    },
  );
}

function paintLumen(blink: boolean): string[] {
  return sitter(
    {
      w: 40,
      h: 50,
      cx: 20,
      headY: 24,
      bodyY: 38,
      bodyRx: 9,
      bodyRy: 8,
      headRx: 8,
      headRy: 8,
      body: "U",
      belly: "w",
      shadow: "a",
      ear: "A",
      inner: "u",
      mood: "excited",
      ears: "up",
      blink,
    },
    (g, phase) => {
      if (phase === "back") return;
      line(g, 14, 16, 12, 8, "k");
      line(g, 26, 16, 28, 8, "k");
      ellipse(g, 12, 7, 1.4, 1.4, "y");
      ellipse(g, 28, 7, 1.4, 1.4, "y");
    },
  );
}

function paintWillow(blink: boolean): string[] {
  return sitter(
    {
      w: 46,
      h: 56,
      cx: 23,
      headY: 24,
      bodyY: 40,
      bodyRx: 10,
      bodyRy: 9,
      headRx: 9,
      headRy: 8,
      body: "z",
      belly: "U",
      shadow: "u",
      ear: "u",
      inner: "A",
      mood: "worry",
      ears: "down",
      blink,
    },
    (g, phase) => {
      if (phase === "back") return;
      stalk(g, 23, 16, 23, 6, 1.6, "m");
      plot(g, 16, 34, "u");
      plot(g, 30, 36, "u");
    },
  );
}

function paintAsh(blink: boolean): string[] {
  return sitter(
    {
      w: 46,
      h: 54,
      cx: 23,
      headY: 26,
      bodyY: 42,
      bodyRx: 11,
      bodyRy: 8,
      headRx: 10,
      headRy: 8,
      body: "R",
      belly: "y",
      shadow: "r",
      ear: "r",
      inner: "B",
      mood: "angry",
      ears: "spike",
      blink,
    },
    (g, phase) => {
      if (phase !== "front") return;
      plot(g, 16, 28, "r");
      plot(g, 30, 28, "r");
    },
  );
}

function paintLichen(blink: boolean): string[] {
  return sitter(
    {
      w: 48,
      h: 46,
      cx: 24,
      headY: 22,
      bodyY: 34,
      bodyRx: 14,
      bodyRy: 8,
      headRx: 9,
      headRy: 7,
      body: "z",
      belly: "w",
      shadow: "q",
      ear: "m",
      inner: "q",
      mood: "shy",
      ears: "down",
      blink,
    },
    (g, phase) => {
      if (phase !== "front") return;
      ellipse(g, 14, 36, 2, 1.4, "m");
      ellipse(g, 34, 33, 2.2, 1.5, "q");
      ellipse(g, 24, 38, 1.6, 1.2, "m");
    },
  );
}

function paintEmber(blink: boolean): string[] {
  return sitter(
    {
      w: 44,
      h: 54,
      cx: 20,
      headY: 24,
      bodyY: 40,
      bodyRx: 10,
      bodyRy: 9,
      headRx: 9,
      headRy: 8,
      body: "c",
      belly: "y",
      shadow: "R",
      ear: "l",
      inner: "y",
      mood: "excited",
      ears: "up",
      blink,
    },
    (g, phase) => {
      if (phase === "back") {
        plot(g, 36, 18, "y");
        plot(g, 38, 22, "R");
        plot(g, 8, 16, "y");
        return;
      }
      plot(g, 34, 14, "y");
      plot(g, 10, 12, "y");
      ellipse(g, 36, 28, 1.3, 1.3, "y");
    },
  );
}

function paintSprout(blink: boolean): string[] {
  return sitter(
    {
      w: 40,
      h: 50,
      cx: 20,
      headY: 26,
      bodyY: 38,
      bodyRx: 8,
      bodyRy: 7,
      headRx: 8,
      headRy: 7,
      body: "U",
      belly: "w",
      shadow: "a",
      ear: "l",
      inner: "G",
      mood: "sad",
      ears: "up",
      blink,
    },
    (g, phase) => {
      if (phase === "back") {
        ellipse(g, 20, 46, 8, 2, "u");
        return;
      }
      stalk(g, 20, 18, 20, 8, 1.8, "l");
      ellipse(g, 20, 7, 2.2, 1.4, "f");
      plot(g, 27, 24, "a");
      plot(g, 27, 26, "u");
    },
  );
}

function paintPine(): string[] {
  const g = grid(34, 42);
  fillTriangle(g, 17, 1, 8, 12, 26, 12, "f");
  fillTriangle(g, 17, 7, 5, 20, 29, 20, "l");
  fillTriangle(g, 17, 14, 3, 28, 31, 28, "G");
  fillTriangle(g, 17, 20, 1, 34, 33, 34, "g");
  rect(g, 15, 33, 19, 38, "t");
  rect(g, 13, 37, 21, 40, "T");
  plot(g, 12, 10, "C");
  plot(g, 10, 18, "f");
  return toRows(g);
}

function paintButterfly(open: boolean): string[] {
  const openWings = [
    ".......y..y.......",
    "......y....y......",
    "..aaaa......aaaa..",
    ".aaaaaa....aaaaaa.",
    ".aaUUaa....aaUUaa.",
    "..aAA......AAa....",
    "......kkkkkk......",
    "..AAAA....AAAA....",
    ".aaaaaa..aaaaaaa..",
    ".aaaaa....aaaaa...",
    "..aaa......aaa....",
    "...a........a.....",
  ];
  const shutWings = [
    "......y..y......",
    ".....aa..aa.....",
    "....aUAaAUa.....",
    "......kkkk......",
    "....AAA..AAA....",
    ".....aa..aa.....",
  ];
  return art(open ? openWings : shutWings);
}

function art(rows: string[]): string[] {
  const width = Math.max(...rows.map((row) => row.length));
  return rows.map((row) => row.padEnd(width, ".").slice(0, width));
}

function paintFlower(): string[] {
  const g = grid(18, 18);
  for (const [x, y] of [
    [9, 3],
    [14, 8],
    [9, 13],
    [4, 8],
    [13, 4],
    [13, 12],
    [5, 4],
    [5, 12],
  ] as const) {
    ellipse(g, x, y, 3, 2.4, "l");
  }
  ellipse(g, 9, 8, 2.4, 2.4, "y");
  ellipse(g, 9, 8, 1.1, 1.1, "R");
  return toRows(g);
}

function paintLantern(): string[] {
  const g = grid(16, 20);
  rect(g, 6, 1, 9, 3, "B");
  ellipse(g, 8, 10, 5, 6, "y");
  ellipse(g, 8, 10, 3, 4, "C");
  rect(g, 7, 15, 8, 18, "t");
  plot(g, 4, 6, "R");
  plot(g, 12, 7, "y");
  return toRows(g);
}

function paintCan(): string[] {
  const g = grid(20, 16);
  ellipse(g, 9, 9, 6, 5, "s");
  ellipse(g, 9, 8, 4, 3, "C");
  rect(g, 13, 4, 18, 6, "B");
  rect(g, 3, 6, 5, 8, "B");
  ellipse(g, 9, 9, 1.2, 1.6, "a");
  return toRows(g);
}

function paintPebble(warm: boolean): string[] {
  const g = grid(18, 14);
  ellipse(g, 9, 8, 7, 5, warm ? "R" : "s");
  ellipse(g, 8, 7, 3, 2, warm ? "y" : "C");
  return toRows(g);
}

function paintStump(): string[] {
  const g = grid(20, 16);
  ellipse(g, 10, 6, 8, 3, "T");
  ellipse(g, 10, 6, 3, 1.3, "s");
  rect(g, 4, 6, 16, 12, "t");
  ellipse(g, 10, 12, 8, 2.4, "B");
  return toRows(g);
}

function paintBench(): string[] {
  const g = grid(28, 16);
  rect(g, 2, 5, 25, 8, "T");
  rect(g, 4, 9, 6, 14, "t");
  rect(g, 21, 9, 23, 14, "t");
  rect(g, 2, 4, 25, 5, "s");
  return toRows(g);
}

function paintLeaf(): string[] {
  const g = grid(12, 12);
  stalk(g, 2, 10, 9, 3, 2.4, "l");
  stalk(g, 3, 9, 8, 4, 0.8, "f");
  return toRows(g);
}

export function speakerKind(speaker: string, avatarRef: string): SpriteKind {
  if (speaker === "Pip") return "pip";
  if (speaker === "Moss") return "moss";
  if (speaker === "Lumen") return "lumen";
  if (speaker === "Cedar") return "pinekit";
  if (speaker === "Keeper Holt") return "emberbud";
  if (speaker === "You") return isKind(avatarRef) ? avatarRef : "bramble";
  return "bramble";
}

function isKind(value: string): value is SpriteKind {
  return (SPRITE_KINDS as readonly string[]).includes(value);
}

export const EMOTION_SPRITE = {
  anxiety: "willow",
  frustration: "ash",
  loneliness: "lichen",
  enthusiasm: "ember",
  sadness: "sprout",
} as const;
