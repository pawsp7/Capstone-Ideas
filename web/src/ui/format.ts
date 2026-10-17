import type { Outcome } from "../domain/types";

export const INTENSITY: { value: number; label: string }[] = [
  { value: 1, label: "a whisper" },
  { value: 2, label: "a breeze" },
  { value: 3, label: "a rustle" },
  { value: 4, label: "a strong wind" },
  { value: 5, label: "a storm" },
];

export function friendlyWhen(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function outcomeTitle(outcome?: Outcome): string {
  if (outcome === "bloom") return "The garden bloomed";
  if (outcome === "repair") return "You repaired something";
  if (outcome === "tangle") return "This one is still growing";
  return "You practiced";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function gradeLabel(band: string): string {
  if (band === "1-2") return "Grades 1–2";
  if (band === "3-4") return "Grades 3–4";
  if (band === "5-6") return "Grades 5–6";
  return band;
}
