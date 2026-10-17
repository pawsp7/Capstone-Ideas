import { createContext, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { bloomName, seedsOf } from "../domain/engine";
import { Role, type GradeBand } from "../domain/types";
import { blip, loadSoundPref, setSoundEnabled, soundEnabled } from "../game/audio";
import { Sprite } from "../game/Sprite";
import type { SpriteKind } from "../game/sprites";
import { gardenStore, useGarden } from "../state/useGarden";
import { INTENSITY } from "./format";
import type { Screen } from "./router";

export const NavContext = createContext<(screen: Screen) => void>(() => {});

export function useGo(): (screen: Screen) => void {
  return useContext(NavContext);
}

export function Button({
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "gold" }) {
  return <button type={type} className={`btn ${variant} ${className}`} {...props} />;
}

export function homeGo(go: (screen: Screen) => void): void {
  const role = gardenStore().getRole();
  if (role === Role.STUDENT) go({ name: "garden" });
  else if (role === Role.TEACHER || role === Role.COUNSELOR) go({ name: "dashboard" });
  else go({ name: "title" });
}

export function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(loadSoundPref()), []);
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={on}
      onClick={() => {
        const next = !soundEnabled();
        setSoundEnabled(next);
        setOn(next);
        if (next) blip("soft");
      }}
    >
      {on ? "Sounds on" : "Sounds off"}
    </button>
  );
}

export function Flash({ text }: { text: string }) {
  return (
    <p className="flash" role="status">
      {text}
    </p>
  );
}

export function SampleBanner() {
  return (
    <p className="sample-banner">
      Sample class desk. These are practice students, not a real class. Leaving resets this sample.
      <button type="button" onClick={() => gardenStore().signOut()}>
        Leave sample
      </button>
    </p>
  );
}

export function StudentBar() {
  const go = useGo();
  const snap = useGarden();
  const student = snap.students[0];
  if (!student) return null;
  const seeds = seedsOf(snap.attempts, student.alias);
  return (
    <header className="hud">
      <button type="button" className="hud-id" onClick={() => go({ name: "garden" })}>
        <Sprite kind={asKind(student.avatarRef)} width={54} alt="" />
        <span>
          <strong>{student.alias}</strong>
          <small>
            {bloomName(seeds)} · {seeds} {seeds === 1 ? "seed" : "seeds"}
          </small>
        </span>
      </button>
      <nav className="hud-nav" aria-label="Garden">
        <button type="button" onClick={() => go({ name: "checkin" })}>
          Feelings
        </button>
        <button type="button" onClick={() => go({ name: "journal" })}>
          Journal
        </button>
        <button
          type="button"
          onClick={() => {
            gardenStore().signOut();
            go({ name: "title" });
          }}
        >
          Leave
        </button>
        <SoundToggle />
      </nav>
    </header>
  );
}

export function DeskBar() {
  const go = useGo();
  const snap = useGarden();
  const session = snap.session;
  if (!session || session.role === Role.STUDENT) return null;
  return (
    <header className="hud">
      <div className="hud-id static">
        <Sprite kind="bramble" width={54} alt="" />
        <span>
          <strong>{session.alias}</strong>
          <small>{session.role === Role.COUNSELOR ? "View only" : "Garden keeper"}</small>
        </span>
      </div>
      <nav className="hud-nav" aria-label="Desk">
        <button type="button" onClick={() => go({ name: "dashboard" })}>
          Desk
        </button>
        <button type="button" onClick={() => go({ name: "roster" })}>
          Roster
        </button>
        <button
          type="button"
          onClick={() => {
            gardenStore().signOut();
            go({ name: "title" });
          }}
        >
          Leave
        </button>
        <SoundToggle />
      </nav>
    </header>
  );
}

export function IntensityPicker({ onPick }: { onPick: (value: number) => void }) {
  return (
    <div className="stack">
      <p className="hint">How big is this feeling right now?</p>
      {INTENSITY.map((item) => (
        <button key={item.value} type="button" className="choice" onClick={() => onPick(item.value)}>
          <span className="choice-index">{item.value}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Missing({ title, body }: { title: string; body: string }) {
  const go = useGo();
  return (
    <main className="narrow screen">
      <h1>{title}</h1>
      <p>{body}</p>
      <Button onClick={() => homeGo(go)}>Back to the path</Button>
    </main>
  );
}

export function GradeFields({
  band,
  onBand,
}: {
  band: GradeBand;
  onBand: (band: GradeBand) => void;
}) {
  return (
    <label>
      Grade garden
      <select value={band} onChange={(event) => onBand(event.target.value as GradeBand)}>
        <option value="1-2">Grades 1–2</option>
        <option value="3-4">Grades 3–4</option>
        <option value="5-6">Grades 5–6</option>
      </select>
      <span className="hint">Stories and puzzles match this age.</span>
    </label>
  );
}

export function Shell({ children, student = false }: { children: ReactNode; student?: boolean }) {
  return (
    <>
      {student ? <StudentBar /> : <DeskBar />}
      {children}
    </>
  );
}

function asKind(value: string): SpriteKind {
  if (value === "mothwing" || value === "pinekit" || value === "emberbud" || value === "bramble") return value;
  return "bramble";
}
