import { useEffect, useMemo, useState } from "react";
import { CHALLENGES, EXERCISES, getChallenge, getExercise } from "../domain/content";
import { SkillType, type GradeBand } from "../domain/types";
import { blip, soundEnabled } from "../game/audio";
import { Sprite } from "../game/Sprite";
import type { SpriteKind } from "../game/sprites";
import {
  BASKET_CODE_CHOICES,
  BASKET_FRIENDS,
  BASKET_JOBS,
  LANTERN_ICONS,
  basketHint,
  basketIsCorrect,
  iconsFromLanternCode,
  labelsMatchPattern,
  lanternChoices,
  lanternCode,
  lanternCount,
  lanternPattern,
  patternFromTrustCode,
  trustCode,
  trustPattern,
  type BasketAssign,
  type LanternIconId,
} from "../domain/puzzles";
import { gardenStore, useGarden } from "../state/useGarden";
import { Button, Missing, Shell, useGo } from "./chrome";

export function MountainScreen() {
  const go = useGo();
  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Mindful Mountain</p>
        <h1>Short rests for a loud body</h1>
        <p>You can stop any practice. Stopping is a boundary, not a mistake. Sounds are optional.</p>
        <div className="stack">
          {EXERCISES.map((exercise) => (
            <article key={exercise.exerciseId} className="story-card">
              <p className="eyebrow">{exercise.technique}</p>
              <h2>{exercise.title}</h2>
              <p>{exercise.blurb}</p>
              <p className="hint">About {Math.max(1, Math.round(exercise.durationSec / 60))} minute{exercise.durationSec >= 90 ? "s" : ""}</p>
              <Button onClick={() => go({ name: "exercise", exerciseId: exercise.exerciseId })}>Begin</Button>
            </article>
          ))}
        </div>
        <Button variant="ghost" onClick={() => go({ name: "garden" })}>
          Back to the garden
        </Button>
      </main>
    </Shell>
  );
}

export function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const exercise = getExercise(exerciseId);
  if (!exercise) return <Missing title="Mindful Mountain" body="That rest is not on the path." />;
  if (exerciseId === "petal-breath") return <PetalBreath />;
  if (exerciseId === "sense-trail") return <SenseTrail />;
  if (exerciseId === "pause-pebble") return <PausePebble />;
  return <SeedPicture />;
}

function useBand(): GradeBand {
  return useGarden().classrooms[0]?.gradeBand ?? "3-4";
}

function DoneRest({ title, body }: { title: string; body: string }) {
  const go = useGo();
  return (
    <section className="panel ending ending-bloom">
      <h2>{title}</h2>
      <p>{body}</p>
      <Button onClick={() => go({ name: "garden" })}>Back to the garden</Button>
    </section>
  );
}

function PetalBreath() {
  const band = useBand();
  const young = band === "1-2";
  const steps = young
    ? [
        { label: "Breathe in", ms: 3000, phase: "in" },
        { label: "Breathe out", ms: 3000, phase: "out" },
      ]
    : [
        { label: "Breathe in", ms: 4000, phase: "in" },
        { label: "Hold softly", ms: 2000, phase: "hold" },
        { label: "Breathe out", ms: 4000, phase: "out" },
      ];
  const total = young ? 3 : 4;
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [step, setStep] = useState(0);
  const [left, setLeft] = useState(steps[0].ms);
  const [doneCycles, setDoneCycles] = useState(0);
  const [saved, setSaved] = useState(false);
  const go = useGo();

  useEffect(() => {
    if (!running || saved) return;
    let ms = steps[step].ms;
    setLeft(ms);
    const id = window.setInterval(() => {
      ms -= 100;
      if (ms > 0) {
        setLeft(ms);
        return;
      }
      window.clearInterval(id);
      if (step + 1 < steps.length) setStep(step + 1);
      else if (cycle + 1 < total) {
        setDoneCycles(cycle + 1);
        setCycle(cycle + 1);
        setStep(0);
        blip("soft");
      } else {
        setDoneCycles(total);
        setRunning(false);
        finish(2);
      }
    }, 100);
    return () => window.clearInterval(id);
    // steps is a fresh array each render; its contents are stable for a band.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, step, cycle, saved, total]);

  function finish(harmony: number) {
    if (saved) return;
    const result = gardenStore().completeExercise("petal-breath", harmony);
    if (!result.ok) return;
    blip("bloom");
    setSaved(true);
  }

  const phase = steps[step]?.phase ?? "out";
  return (
    <Shell student>
      <main className="narrow screen breath-screen">
        <p className="eyebrow">Petal breath</p>
        <h1>Let the flower breathe with you</h1>
        {saved ? (
          <DoneRest title="The flower rests" body="You gave your body a slow rhythm. You can use one breath before a hard sentence." />
        ) : (
          <>
            <div className={`flower ${running ? phase : "wait"}`} aria-hidden="true" />
            <p className="breath-label" aria-live="polite">
              {running ? steps[step].label : "When you are ready, begin."}
            </p>
            <p className="hint">
              Petal {Math.min(total, doneCycles + (running ? 1 : 0))} of {total}
              {running ? ` · ${Math.ceil(left / 1000)}s` : ""}
            </p>
            <div className="row-actions">
              {!running && (
                <Button
                  onClick={() => {
                    setRunning(true);
                    blip("soft");
                  }}
                >
                  Begin breathing
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  if (doneCycles >= 1) finish(1);
                  else go({ name: "mountain" });
                }}
              >
                {doneCycles >= 1 ? "That's enough for now" : "I need to stop"}
              </Button>
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}

const SEE: { id: string; label: string; kind: SpriteKind }[] = [
  { id: "pine", label: "Pine", kind: "pine" },
  { id: "butterfly", label: "Butterfly", kind: "butterfly" },
  { id: "lantern", label: "Lantern", kind: "lantern" },
  { id: "flower", label: "Flower", kind: "flower" },
  { id: "can", label: "Watering can", kind: "can" },
];

const HEAR: { id: string; label: string; tone: "bird" | "wind" | "stream" | "bee" }[] = [
  { id: "bird", label: "Bird", tone: "bird" },
  { id: "wind", label: "Wind", tone: "wind" },
  { id: "stream", label: "Stream", tone: "stream" },
  { id: "bee", label: "Bee", tone: "bee" },
];

function SenseTrail() {
  const [phase, setPhase] = useState<"see" | "hear" | "feel" | "smell" | "taste" | "done">("see");
  const [found, setFound] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const go = useGo();

  function mark(id: string, tone?: "bird" | "wind" | "stream" | "bee") {
    if (tone) blip(tone);
    else blip("tap");
    setFound((current) => (current.includes(id) ? current : [...current, id]));
  }

  function need(count: number, next: typeof phase) {
    if (found.length >= count) {
      setFound([]);
      setPhase(next);
    }
  }

  useEffect(() => {
    if (phase === "see" && found.length >= 5) need(5, "hear");
    if (phase === "hear" && found.length >= 4) need(4, "feel");
    if (phase === "feel" && found.length >= 3) need(3, "smell");
    if (phase === "smell" && found.length >= 2) need(2, "taste");
    if (phase === "taste" && found.length >= 1 && !saved) {
      const result = gardenStore().completeExercise("sense-trail", 2);
      if (result.ok) {
        blip("bloom");
        setSaved(true);
        setPhase("done");
      }
    }
    // need is recreated; the counts are the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, phase, saved]);

  const prompts = {
    see: "Tap five things you can see.",
    hear: soundEnabled()
      ? "Tap four sounds. Listen, then notice them."
      : "Sounds are off, so watch the wiggle. Tap four garden sounds.",
    feel: "Tap three things you can feel in your body.",
    smell: "Imagine two smells. You do not need them in the room.",
    taste: "Imagine one taste.",
    done: "You came back to the garden around you.",
  };

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Five-sense trail</p>
        <h1>{prompts[phase]}</h1>
        <p className="hint">5 see · 4 hear · 3 feel · 2 smell · 1 taste</p>
        {phase === "see" && (
          <div className="sense-grid">
            {SEE.map((item) => (
              <button key={item.id} type="button" className={found.includes(item.id) ? "sense found" : "sense"} onClick={() => mark(item.id)}>
                <Sprite kind={item.kind} width={72} alt="" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
        {phase === "hear" && (
          <div className="sense-grid">
            {HEAR.map((item) => (
              <button key={item.id} type="button" className={found.includes(item.id) ? "sense found" : "sense"} onClick={() => mark(item.id, item.tone)}>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>
        )}
        {phase === "feel" && (
          <div className="stack">
            {["My feet on the ground", "My hands where they are", "Air on my face"].map((label) => (
              <button key={label} type="button" className="choice" onClick={() => mark(label)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {phase === "smell" && (
          <div className="stack">
            {["Pine needles", "Wet soil after rain"].map((label) => (
              <button key={label} type="button" className="choice" onClick={() => mark(label)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {phase === "taste" && (
          <button type="button" className="choice" onClick={() => mark("berry")}>
            A sweet berry — imagine it. You do not need a real one.
          </button>
        )}
        {phase === "done" && (
          <DoneRest title="You are here" body="Naming what is around you can turn the volume down on a worry." />
        )}
        {phase !== "done" && (
          <Button variant="ghost" onClick={() => go({ name: "mountain" })}>
            I need to stop
          </Button>
        )}
      </main>
    </Shell>
  );
}

const PEBBLE_ROUNDS = [
  {
    prompt: "Someone bumps your arm and your drawing smears.",
    fast: "Hey! Watch it!",
    calm: "I need a second. Then I can say what I need.",
  },
  {
    prompt: "Your friend laughs, and you think it is at you.",
    fast: "Stop laughing at me!",
    calm: "I feel unsure. Were you laughing at the joke, or at me?",
  },
  {
    prompt: "You lose the game and your face gets hot.",
    fast: "This game is stupid!",
    calm: "I am hot and disappointed. I can pause before I talk.",
  },
];

function PausePebble() {
  const band = useBand();
  const wait = band === "1-2" ? 3000 : 4000;
  const [round, setRound] = useState(0);
  const [warm, setWarm] = useState(0);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");
  const [kept, setKept] = useState(0);
  const [saved, setSaved] = useState(false);
  const go = useGo();
  const card = PEBBLE_ROUNDS[round];

  useEffect(() => {
    if (ready || saved || !card) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / wait);
      setWarm(progress);
      if (progress >= 1) setReady(true);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [round, ready, saved, wait, card]);

  function choose(calm: boolean) {
    if (!ready) {
      setNote("That urge is the fast path. The pebble is still warming.");
      return;
    }
    const nextKept = kept + (calm ? 1 : 0);
    setKept(nextKept);
    setNote(calm ? "You waited. The slower sentence is ready." : "The fast words came out. You can still try the slower sentence next time.");
    if (round + 1 >= PEBBLE_ROUNDS.length) {
      const result = gardenStore().completeExercise("pause-pebble", nextKept >= 2 ? 2 : 1);
      if (result.ok) {
        blip("bloom");
        setSaved(true);
      }
      return;
    }
    setRound(round + 1);
    setReady(false);
    setWarm(0);
  }

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Pause pebble</p>
        <h1>Wait for the glow</h1>
        {saved || !card ? (
          <DoneRest
            title="You practiced a pause"
            body="A hot feeling can be true, and the first sentence does not have to be the one you keep."
          />
        ) : (
          <>
            <p className="prompt-card">{card.prompt}</p>
            <div
              className={ready ? "pebble warm" : "pebble"}
              style={{ ["--warm" as string]: String(warm) }}
              aria-hidden="true"
            />
            <p className="hint" aria-live="polite">
              {ready ? "The pebble is warm. Choose." : "Let the pebble warm before you answer."} Round {round + 1} of 3
            </p>
            <div className="stack">
              <button type="button" className="choice" onClick={() => choose(false)}>
                {card.fast}
              </button>
              <button type="button" className="choice" disabled={!ready} onClick={() => choose(true)}>
                {card.calm}
              </button>
            </div>
            {note && <p role="status">{note}</p>}
            <Button variant="ghost" onClick={() => go({ name: "mountain" })}>
              I need to stop
            </Button>
          </>
        )}
      </main>
    </Shell>
  );
}

const PICTURE_STEPS = [
  {
    prompt: "Imagine the ground under you.",
    options: ["Soft moss", "Cool soil", "Warm sand"],
  },
  {
    prompt: "Imagine one safe plant.",
    options: ["A pine", "A flower", "A fern"],
  },
  {
    prompt: "Imagine the sky.",
    options: ["Night and a blue butterfly", "Soft rain", "Warm sun"],
  },
  {
    prompt: "Pick a kind sentence to take with you.",
    options: [
      "I can take up space and still be kind.",
      "I can pause. I am still learning.",
      "A feeling can visit and also leave.",
    ],
  },
];

function SeedPicture() {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const go = useGo();
  const current = PICTURE_STEPS[step];

  function choose(option: string) {
    const next = [...picks, option];
    setPicks(next);
    if (step + 1 >= PICTURE_STEPS.length) {
      const result = gardenStore().completeExercise("seed-picture", 2);
      if (result.ok) {
        blip("bloom");
        setSaved(true);
      }
      return;
    }
    setStep(step + 1);
  }

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Seed picture</p>
        <h1>Grow a picture you can carry</h1>
        {saved ? (
          <section className="panel ending ending-bloom">
            <h2>Your picture</h2>
            <ul>
              {picks.map((pick) => (
                <li key={pick}>{pick}</li>
              ))}
            </ul>
            <p>You can close your eyes and visit this picture when a feeling gets loud.</p>
            <Button onClick={() => go({ name: "garden" })}>Back to the garden</Button>
          </section>
        ) : (
          <>
            <p>{current.prompt}</p>
            <div className="stack">
              {current.options.map((option) => (
                <button key={option} type="button" className="choice" onClick={() => choose(option)}>
                  {option}
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => go({ name: "mountain" })}>
              I need to stop
            </Button>
          </>
        )}
      </main>
    </Shell>
  );
}

export function TrialsScreen() {
  const go = useGo();
  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Teamwork Trials</p>
        <h1>Practice with a friend, or with Bramble</h1>
        <p>A team code lets another device play the other half. You can also finish each trial on your own.</p>
        <div className="stack">
          {CHALLENGES.map((challenge) => (
            <article key={challenge.challengeId} className="story-card">
              <p className="eyebrow">
                {challenge.focus} · team code {challenge.teamCode}
              </p>
              <h2>{challenge.title}</h2>
              <p>{challenge.blurb}</p>
              <Button onClick={() => go({ name: "challenge", challengeId: challenge.challengeId })}>Begin</Button>
            </article>
          ))}
        </div>
        <Button variant="ghost" onClick={() => go({ name: "garden" })}>
          Back to the garden
        </Button>
      </main>
    </Shell>
  );
}

export function ChallengeScreen({ challengeId }: { challengeId: string }) {
  const challenge = getChallenge(challengeId);
  if (!challenge) return <Missing title="Teamwork Trials" body="That trial is not in the garden." />;
  if (challengeId === "lantern-message") return <LanternTrial />;
  if (challengeId === "shared-basket") return <BasketTrial />;
  return <TrustTrial />;
}

function LanternTrial() {
  const band = useBand();
  const alias = useGarden().students[0]?.alias ?? "garden";
  const count = lanternCount(band);
  const [pattern] = useState(() => lanternPattern(`${alias}-${Date.now()}`, count));
  const [picks, setPicks] = useState<string[]>(() => Array.from({ length: count }, () => ""));
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"tell" | "follow">("tell");
  const [entered, setEntered] = useState("");
  const [placed, setPlaced] = useState<LanternIconId[]>([]);
  const [saved, setSaved] = useState(false);
  const go = useGo();
  const decoded = iconsFromLanternCode(entered);

  function finish(harmony: number) {
    if (saved) return;
    const result = gardenStore().completeChallenge("lantern-message", harmony);
    if (!result.ok) {
      setNote(result.error);
      return;
    }
    blip("bloom");
    setSaved(true);
  }

  if (saved) {
    return (
      <Shell student>
        <main className="narrow screen">
          <DoneRest
            title="The message arrived"
            body={code ? `Team code: ${code}. A friend can enter it and rebuild the pictures.` : "You rebuilt a friend's message, picture for picture."}
          />
        </main>
      </Shell>
    );
  }

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Lantern message · {mode === "tell" ? "Tell" : "Follow"}</p>
        <h1>Use the exact word</h1>
        <div className="row-actions">
          <Button variant={mode === "tell" ? "primary" : "ghost"} onClick={() => setMode("tell")}>
            I will describe
          </Button>
          <Button variant={mode === "follow" ? "primary" : "ghost"} onClick={() => setMode("follow")}>
            I have a code
          </Button>
        </div>
        {mode === "tell" ? (
          <>
            <p>Tell Pip the exact name of each picture. A near word builds the wrong lantern.</p>
            <div className="icon-row">
              {pattern.map((id) => (
                <Sprite key={id} kind={iconKind(id)} width={64} alt={labelOf(id)} />
              ))}
            </div>
            {pattern.map((id, index) => (
              <fieldset key={`${id}-${index}`} className="choice-set">
                <legend>
                  Picture {index + 1}: {labelOf(id)}
                </legend>
                {lanternChoices(pattern.join("-"), id, index).map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={picks[index] === label ? "chip picked" : "chip"}
                    onClick={() =>
                      setPicks((current) => current.map((item, itemIndex) => (itemIndex === index ? label : item)))
                    }
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
            ))}
            <Button
              onClick={() => {
                if (picks.some((pick) => pick === "")) {
                  setNote("Choose a word for every picture.");
                  return;
                }
                if (!labelsMatchPattern(pattern, picks)) {
                  setNote("Pip heard a near word. Choose the exact name of each picture.");
                  return;
                }
                const next = lanternCode(pattern);
                setCode(next);
                finish(2);
              }}
            >
              Send it to Pip
            </Button>
          </>
        ) : (
          <>
            <label>
              Friend's lantern code
              <input value={entered} onChange={(event) => setEntered(event.target.value.toUpperCase())} spellCheck={false} placeholder="LANTERN-BLUE-PINE-STAR" />
            </label>
            {decoded && (
              <>
                <p>You heard: {decoded.map((id) => labelOf(id)).join(", ")}. Place the pictures in that order.</p>
                <div className="icon-row">
                  {LANTERN_ICONS.map((icon) => (
                    <button key={icon.id} type="button" className="chip" onClick={() => setPlaced((current) => [...current, icon.id].slice(0, decoded.length))}>
                      <Sprite kind={iconKind(icon.id)} width={48} alt="" />
                      {icon.label}
                    </button>
                  ))}
                </div>
                <p>Placed: {placed.map((id) => labelOf(id)).join(", ") || "none yet"}</p>
                <div className="row-actions">
                  <Button variant="ghost" onClick={() => setPlaced((current) => current.slice(0, -1))}>
                    Undo
                  </Button>
                  <Button
                    onClick={() => {
                      if (placed.length !== decoded.length || placed.some((id, index) => id !== decoded[index])) {
                        setNote("The pictures do not match the words yet.");
                        return;
                      }
                      finish(2);
                    }}
                  >
                    Check the message
                  </Button>
                </div>
              </>
            )}
            {entered && !decoded && <p className="form-error">That code is not a lantern message.</p>}
          </>
        )}
        {note && (
          <p role="status" className="hint">
            {note}
          </p>
        )}
        <Button variant="ghost" onClick={() => go({ name: "trials" })}>
          Back to the trials
        </Button>
      </main>
    </Shell>
  );
}

function labelOf(id: LanternIconId): string {
  return LANTERN_ICONS.find((icon) => icon.id === id)?.label ?? id;
}

function iconKind(id: LanternIconId): SpriteKind {
  if (id === "butterfly") return "butterfly";
  if (id === "pine") return "pine";
  if (id === "star") return "lantern";
  if (id === "drop") return "pebble";
  return "flower";
}

function BasketTrial() {
  const band = useBand();
  const [unlocked, setUnlocked] = useState(band === "1-2");
  const [codeNote, setCodeNote] = useState("");
  const [assign, setAssign] = useState<Partial<BasketAssign>>({});
  const [misses, setMisses] = useState(0);
  const [twist, setTwist] = useState(false);
  const [saved, setSaved] = useState(false);
  const go = useGo();

  function finish(harmony: number, extra: SkillType[] = []) {
    if (saved) return;
    const result = gardenStore().completeChallenge("shared-basket", harmony, extra);
    if (result.ok) {
      blip("bloom");
      setSaved(true);
    }
  }

  if (saved) {
    return (
      <Shell student>
        <main className="narrow screen">
          <DoneRest title="The basket is shared" body="A good team gives the heavy job to strong arms and the tiny job to careful hands." />
        </main>
      </Shell>
    );
  }

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Team code BASKET</p>
        <h1>Who carries which job?</h1>
        {!unlocked ? (
          <>
            <p>Your team agreed on a code. Pick the exact one you heard.</p>
            <div className="row-actions">
              {BASKET_CODE_CHOICES.map((code) => (
                <Button
                  key={code}
                  variant="ghost"
                  onClick={() => {
                    if (code === "BASKET") setUnlocked(true);
                    else setCodeNote("Listen for the exact word. One letter changes the team.");
                  }}
                >
                  {code}
                </Button>
              ))}
            </div>
            {codeNote && <p role="status">{codeNote}</p>}
          </>
        ) : (
          <>
            <p>Pip has strong arms and moves fast. Moss is careful and slow. Lumen notices signs and gets tired carrying heavy things.</p>
            {BASKET_JOBS.map((job) => (
              <fieldset key={job.id} className="choice-set">
                <legend>{job.name}</legend>
                {BASKET_FRIENDS.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    className={assign[job.id] === friend.id ? "chip picked" : "chip"}
                    onClick={() => setAssign((current) => ({ ...current, [job.id]: friend.id }))}
                  >
                    {friend.name}
                    <small>{friend.trait}</small>
                  </button>
                ))}
              </fieldset>
            ))}
            {misses > 0 && <p role="status">{basketHint(assign)}</p>}
            {!twist ? (
              <Button
                onClick={() => {
                  if (!basketIsCorrect(assign)) {
                    setMisses((count) => count + 1);
                    return;
                  }
                  if (band === "5-6") setTwist(true);
                  else finish(2);
                }}
              >
                Share the plan
              </Button>
            ) : (
              <section className="panel">
                <h2>Pip wants the seeds</h2>
                <p>Pip says the seed job looks more fun. The water is still heavy.</p>
                <div className="stack">
                  <button type="button" className="choice" onClick={() => finish(2, [SkillType.CONFLICT_RESOLUTION])}>
                    Pip, your strength carries water, and you can ring the done-bell.
                  </button>
                  <button type="button" className="choice" onClick={() => finish(1)}>
                    Fine, switch jobs so nobody is upset.
                  </button>
                </div>
              </section>
            )}
          </>
        )}
        <Button variant="ghost" onClick={() => go({ name: "trials" })}>
          Back to the trials
        </Button>
      </main>
    </Shell>
  );
}

function TrustTrial() {
  const [mode, setMode] = useState<"follow" | "lead" | "friend">("follow");
  const bramble = useMemo(() => trustPattern("bramble-path", 6), []);
  const [leadPattern] = useState(() => trustPattern(String(Date.now()), 6));
  const [taps, setTaps] = useState<boolean[]>([]);
  const [entered, setEntered] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const go = useGo();
  const friendPattern = patternFromTrustCode(entered);
  const pattern = mode === "lead" ? leadPattern : mode === "friend" ? friendPattern ?? [] : bramble;

  function finish(harmony: number) {
    if (saved) return;
    const result = gardenStore().completeChallenge("trust-stones", harmony);
    if (!result.ok) {
      setNote(result.error);
      return;
    }
    blip("bloom");
    setSaved(true);
  }

  function add(step: boolean) {
    if (!pattern.length) return;
    const next = [...taps, step];
    if (next.length < pattern.length) {
      setTaps(next);
      return;
    }
    const matches = next.every((value, index) => value === pattern[index]);
    if (!matches) {
      setNote(mode === "lead" ? "Look again. Green stones are safe to step. Brown stones want a wait." : "A stone was different from the words. Try the path again.");
      setTaps([]);
      return;
    }
    if (mode === "lead") setCode(trustCode(pattern));
    finish(2);
  }

  if (saved) {
    return (
      <Shell student>
        <main className="narrow screen">
          <DoneRest
            title="The path held"
            body={code ? `Give your friend this code: ${code}` : "You trusted the words more than a guess. That is a real team skill."}
          />
        </main>
      </Shell>
    );
  }

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Trust stones</p>
        <h1>{mode === "lead" ? "Read the true path" : "Follow the words"}</h1>
        <div className="row-actions">
          <Button variant={mode === "follow" ? "primary" : "ghost"} onClick={() => { setMode("follow"); setTaps([]); setNote(""); }}>
            Follow Bramble
          </Button>
          <Button variant={mode === "lead" ? "primary" : "ghost"} onClick={() => { setMode("lead"); setTaps([]); setNote(""); }}>
            I will lead
          </Button>
          <Button variant={mode === "friend" ? "primary" : "ghost"} onClick={() => { setMode("friend"); setTaps([]); setNote(""); }}>
            I have a code
          </Button>
        </div>
        {mode === "friend" && (
          <label>
            Trust code
            <input value={entered} onChange={(event) => setEntered(event.target.value.toUpperCase())} placeholder="TRUST-STEP-WAIT-STEP" spellCheck={false} />
          </label>
        )}
        {mode !== "friend" || friendPattern ? (
          <>
            {mode !== "lead" && <p>Words: {pattern.map((step) => (step ? "STEP" : "WAIT")).join(" · ")}</p>}
            <div className="stone-row" aria-hidden={mode !== "lead"}>
              {pattern.map((safe, index) => (
                <span key={index} className={mode === "lead" ? (safe ? "stone safe" : "stone wobbly") : "stone mist"}>
                  {index + 1}
                </span>
              ))}
            </div>
            <p>
              Stone {Math.min(pattern.length, taps.length + 1)} of {pattern.length}
              {mode === "lead" ? ". Green is step. Brown is wait." : ". The stones look the same until you choose."}
            </p>
            <div className="row-actions">
              <Button onClick={() => add(true)}>Step</Button>
              <Button variant="ghost" onClick={() => add(false)}>Wait</Button>
            </div>
          </>
        ) : (
          entered.trim() !== "" && <p className="form-error">That code is not a trust path.</p>
        )}
        {note && <p role="status">{note}</p>}
        <Button variant="ghost" onClick={() => go({ name: "trials" })}>
          Back to the trials
        </Button>
      </main>
    </Shell>
  );
}
