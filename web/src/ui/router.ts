import { useCallback, useEffect, useState } from "react";
import { Role, type Session } from "../domain/types";

export type Screen =
  | { name: "title" }
  | { name: "join"; code?: string }
  | { name: "checkin" }
  | { name: "garden" }
  | { name: "grove" }
  | { name: "play"; scenarioId: string }
  | { name: "forest" }
  | { name: "creature"; emotionId: string }
  | { name: "mountain" }
  | { name: "exercise"; exerciseId: string }
  | { name: "trials" }
  | { name: "challenge"; challengeId: string }
  | { name: "journal" }
  | { name: "keeper" }
  | { name: "dashboard" }
  | { name: "roster" };

export function screenKey(screen: Screen): string {
  switch (screen.name) {
    case "join":
      return `join:${screen.code ?? ""}`;
    case "play":
      return `play:${screen.scenarioId}`;
    case "creature":
      return `creature:${screen.emotionId}`;
    case "exercise":
      return `exercise:${screen.exerciseId}`;
    case "challenge":
      return `challenge:${screen.challengeId}`;
    default:
      return screen.name;
  }
}

export function screenToHash(screen: Screen): string {
  switch (screen.name) {
    case "title":
      return "#/";
    case "join":
      return screen.code ? `#/join/${encodeURIComponent(screen.code)}` : "#/join";
    case "play":
      return `#/play/${screen.scenarioId}`;
    case "creature":
      return `#/forest/${screen.emotionId}`;
    case "exercise":
      return `#/mountain/${screen.exerciseId}`;
    case "challenge":
      return `#/trials/${screen.challengeId}`;
    default:
      return `#/${screen.name}`;
  }
}

export function hashToScreen(hash: string): Screen {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  const [head, tail] = parts;
  if (!head) return { name: "title" };
  if (head === "join") return { name: "join", code: tail ? decodeURIComponent(tail) : undefined };
  if (head === "play" && tail) return { name: "play", scenarioId: tail };
  if (head === "forest" && tail) return { name: "creature", emotionId: tail };
  if (head === "mountain" && tail) return { name: "exercise", exerciseId: tail };
  if (head === "trials" && tail) return { name: "challenge", challengeId: tail };
  if (head === "play") return { name: "grove" };
  if (head === "forest") return { name: "forest" };
  if (head === "mountain") return { name: "mountain" };
  if (head === "trials") return { name: "trials" };
  const names: Screen["name"][] = [
    "checkin",
    "garden",
    "grove",
    "journal",
    "keeper",
    "dashboard",
    "roster",
  ];
  if (names.includes(head as Screen["name"])) return { name: head } as Screen;
  return { name: "title" };
}

export function allowedScreen(screen: Screen, session: Session | null): Screen {
  const publicScreen =
    screen.name === "title" || screen.name === "join" || screen.name === "keeper";
  if (!session) return publicScreen ? screen : { name: "title" };
  if (session.role === Role.STUDENT) {
    if (screen.name === "title") return { name: "garden" };
    if (screen.name === "dashboard" || screen.name === "roster" || screen.name === "keeper") {
      return { name: "garden" };
    }
    return screen;
  }
  if (screen.name === "title") return { name: "dashboard" };
  if (
    screen.name === "dashboard" ||
    screen.name === "roster" ||
    screen.name === "keeper" ||
    screen.name === "join"
  ) {
    return screen;
  }
  return { name: "dashboard" };
}

export function useHashRoute(): { screen: Screen; go: (screen: Screen) => void } {
  const [screen, setScreen] = useState<Screen>(() => hashToScreen(window.location.hash));
  const go = useCallback((next: Screen) => {
    const hash = screenToHash(next);
    if (window.location.hash !== hash) window.location.hash = hash.slice(1);
    setScreen(next);
  }, []);
  useEffect(() => {
    const onHash = () => setScreen(hashToScreen(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return { screen, go };
}
