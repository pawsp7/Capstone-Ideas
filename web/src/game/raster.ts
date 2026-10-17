export const PALETTE: Record<string, string> = {
  o: "#140e0a",
  k: "#24180f",
  b: "#5a3418",
  B: "#8a5328",
  n: "#c17a3a",
  c: "#f3ddb0",
  C: "#fff6de",
  s: "#e4c48a",
  e: "#fffaf2",
  i: "#b06d30",
  p: "#2a160c",
  h: "#ffffff",
  g: "#1c6b34",
  G: "#3f9d45",
  l: "#8ed456",
  f: "#d5f5a0",
  m: "#7ea35a",
  r: "#e07a4a",
  R: "#f2b07a",
  u: "#6eb6ff",
  U: "#d9efff",
  y: "#ffe27a",
  w: "#f7fbff",
  a: "#4aa3ff",
  A: "#1d6fe0",
  t: "#6b4124",
  T: "#a56b3c",
  q: "#b7a8c4",
  z: "#d7efe4",
};

export function grid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => "."));
}

export function plot(g: string[][], x: number, y: number, ch: string): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (ch === "." || yi < 0 || xi < 0 || yi >= g.length || xi >= g[0].length) return;
  g[yi][xi] = ch;
}

export function ellipse(
  g: string[][],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  ch: string,
): void {
  if (rx <= 0 || ry <= 0) return;
  const x0 = Math.floor(cx - rx - 1);
  const x1 = Math.ceil(cx + rx + 1);
  const y0 = Math.floor(cy - ry - 1);
  const y1 = Math.ceil(cy + ry + 1);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) plot(g, x, y, ch);
    }
  }
}

export function rect(g: string[][], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  for (let y = Math.round(y0); y <= Math.round(y1); y += 1) {
    for (let x = Math.round(x0); x <= Math.round(x1); x += 1) plot(g, x, y, ch);
  }
}

export function line(g: string[][], x0: number, y0: number, x1: number, y1: number, ch: string): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    plot(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ch);
  }
}

export function stalk(
  g: string[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  ch: string,
): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const taper = Math.sin(Math.PI * t);
    const radius = Math.max(0.8, width * taper);
    ellipse(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, radius * 0.78, ch);
  }
}

export function fillTriangle(
  g: string[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  ch: string,
): void {
  const minY = Math.floor(Math.min(y1, y2, y3));
  const maxY = Math.ceil(Math.max(y1, y2, y3));
  const edges: [number, number, number, number][] = [
    [x1, y1, x2, y2],
    [x2, y2, x3, y3],
    [x3, y3, x1, y1],
  ];
  for (let y = minY; y <= maxY; y += 1) {
    const xs: number[] = [];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        const t = (y - ay) / (by - ay);
        xs.push(ax + t * (bx - ax));
      }
    }
    if (xs.length < 2) continue;
    const left = Math.ceil(Math.min(...xs));
    const right = Math.floor(Math.max(...xs));
    for (let x = left; x <= right; x += 1) plot(g, x, y, ch);
  }
}

export function fluff(g: string[][], mid: string, light: string, shadow: string): void {
  for (let y = 0; y < g.length; y += 1) {
    for (let x = 0; x < g[0].length; x += 1) {
      if (g[y][x] !== mid && g[y][x] !== light) continue;
      const n = (x * 13 + y * 7) % 11;
      if (n === 0) g[y][x] = shadow;
      else if (n === 4) g[y][x] = light;
    }
  }
}

export function toRows(g: string[][]): string[] {
  return g.map((row) => row.join(""));
}
