export const LANTERN_ICONS = [
  { id: "butterfly", token: "BLUE", label: "blue butterfly", near: "blue flower" },
  { id: "pine", token: "PINE", label: "tall pine", near: "small sprout" },
  { id: "star", token: "STAR", label: "gold star", near: "gold lantern" },
  { id: "drop", token: "DROP", label: "rain drop", near: "round pebble" },
  { id: "bloom", token: "BLOOM", label: "pink bloom", near: "red berry" },
] as const;

export type LanternIconId = (typeof LANTERN_ICONS)[number]["id"];

export const BASKET_FRIENDS = [
  { id: "pip", name: "Pip", trait: "Strong arms, and moves fast." },
  { id: "moss", name: "Moss", trait: "Careful and slow with small things." },
  { id: "lumen", name: "Lumen", trait: "Notices signs and sounds. Gets tired carrying heavy things." },
] as const;

export const BASKET_JOBS = [
  { id: "water", name: "Carry the water", needs: "pip", hint: "Heavy water needs strong arms." },
  { id: "seeds", name: "Place the seeds", needs: "moss", hint: "Tiny seeds need slow hands." },
  { id: "watch", name: "Watch the path markers", needs: "lumen", hint: "Markers need a good noticer." },
] as const;

export type BasketAssign = Record<(typeof BASKET_JOBS)[number]["id"], string>;

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(seed: number, items: readonly T[]): T {
  return items[seed % items.length];
}

export function lanternCount(gradeBand: "1-2" | "3-4" | "5-6"): number {
  return gradeBand === "1-2" ? 3 : 4;
}

export function lanternPattern(seed: string, count: number): LanternIconId[] {
  const icons = [...LANTERN_ICONS];
  const pattern: LanternIconId[] = [];
  let state = hashString(seed);
  for (let index = 0; index < count; index += 1) {
    state = hashString(`${state}:${index}`);
    const choice = icons[state % icons.length];
    pattern.push(choice.id);
    icons.splice(state % icons.length, 1);
  }
  return pattern;
}

export function lanternChoices(seed: string, iconId: LanternIconId, slot: number): string[] {
  const icon = LANTERN_ICONS.find((item) => item.id === iconId);
  if (!icon) return [];
  const others = LANTERN_ICONS.filter((item) => item.id !== iconId);
  const distractor = pick(hashString(`${seed}:${slot}:d`), others).label;
  const options = [icon.label, icon.near, distractor];
  const unique = [...new Set(options)];
  const state = hashString(`${seed}:${slot}:shuffle`);
  return unique
    .map((label, index) => ({ label, rank: hashString(`${state}:${index}:${label}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.label);
}

export function lanternCode(icons: LanternIconId[]): string {
  const tokens = icons.map((id) => LANTERN_ICONS.find((item) => item.id === id)?.token ?? "SEED");
  return `LANTERN-${tokens.join("-")}`;
}

export function iconsFromLanternCode(code: string): LanternIconId[] | null {
  const parts = code.trim().toUpperCase().split("-").filter(Boolean);
  if (parts[0] !== "LANTERN" || parts.length < 2) return null;
  const icons: LanternIconId[] = [];
  for (const token of parts.slice(1)) {
    const icon = LANTERN_ICONS.find((item) => item.token === token);
    if (!icon) return null;
    icons.push(icon.id);
  }
  return icons;
}

export function labelsMatchPattern(icons: LanternIconId[], labels: string[]): boolean {
  if (icons.length !== labels.length) return false;
  return icons.every((id, index) => {
    const icon = LANTERN_ICONS.find((item) => item.id === id);
    return icon?.label === labels[index];
  });
}

export function trustPattern(seed: string, length = 6): boolean[] {
  let state = hashString(seed);
  return Array.from({ length }, (_, index) => {
    state = hashString(`${state}:stone:${index}`);
    return state % 3 !== 0;
  });
}

export function trustCode(pattern: boolean[]): string {
  return `TRUST-${pattern.map((step) => (step ? "STEP" : "WAIT")).join("-")}`;
}

export function patternFromTrustCode(code: string): boolean[] | null {
  const parts = code.trim().toUpperCase().split("-").filter(Boolean);
  if (parts[0] !== "TRUST" || parts.length < 2) return null;
  const pattern: boolean[] = [];
  for (const token of parts.slice(1)) {
    if (token === "STEP") pattern.push(true);
    else if (token === "WAIT") pattern.push(false);
    else return null;
  }
  return pattern;
}

export function basketIsCorrect(assign: Partial<BasketAssign>): boolean {
  return BASKET_JOBS.every((job) => assign[job.id] === job.needs);
}

export function basketHint(assign: Partial<BasketAssign>): string {
  const missed = BASKET_JOBS.find((job) => assign[job.id] !== job.needs);
  if (!missed) return "Every job has a fitting friend.";
  return missed.hint;
}

export const BASKET_CODE_CHOICES = ["BASKET", "BASKES", "BASEKT"] as const;
