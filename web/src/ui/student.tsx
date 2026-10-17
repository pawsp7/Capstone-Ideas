import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  EMOTIONS,
  describeEmotion,
  getEmotion,
  getNode,
  getScenario,
} from "../domain/content";
import {
  bloomName,
  getChoices,
  hintFor,
  outcomeLabel,
  seedsOf,
  visibleScenarios,
} from "../domain/engine";
import {
  AVATARS,
  AVATAR_LABEL,
  AttemptStatus,
  SKILL_LABEL,
  type AvatarId,
  type GradeBand,
} from "../domain/types";
import { blip } from "../game/audio";
import { Sprite } from "../game/Sprite";
import { EMOTION_SPRITE, speakerKind, type SpriteKind } from "../game/sprites";
import { gardenStore, useGarden } from "../state/useGarden";
import { reportFor } from "../state/store";
import { Button, GradeFields, IntensityPicker, Missing, Shell, SoundToggle, useGo } from "./chrome";
import { copyText, friendlyWhen, outcomeTitle } from "./format";
const FEELING_WORD: Record<string, string> = {
  ANXIETY: "worried",
  FRUSTRATION: "frustrated",
  LONELINESS: "lonely",
  ENTHUSIASM: "excited",
  SADNESS: "sad",
};

export function JoinScreen({ code }: { code?: string }) {
  const go = useGo();
  const [alias, setAlias] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>("bramble");
  const [joinCode, setJoinCode] = useState(code ?? "");
  const [band, setBand] = useState<GradeBand>("3-4");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = gardenStore().joinStudent({
      alias,
      avatarRef: avatar,
      joinCode,
      gradeBand: band,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    blip("bloom");
    go({ name: "checkin" });
  }

  return (
    <main className="narrow screen">
      <p className="eyebrow">Student garden</p>
      <h1>Choose a garden name</h1>
      <p>Use a made-up name, not your real name. Your progress stays on this device.</p>
      <form className="stack" onSubmit={submit}>
        <label>
          Garden name
          <input
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            maxLength={18}
            autoComplete="off"
            placeholder="Pip"
            required
          />
        </label>
        <div>
          <p className="label">Your creature</p>
          <div className="avatar-row" role="radiogroup" aria-label="Garden creature">
            {AVATARS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={avatar === id}
                className={avatar === id ? "avatar picked" : "avatar"}
                onClick={() => setAvatar(id)}
              >
                <Sprite kind={id} width={84} alt="" />
                <span>{AVATAR_LABEL[id]}</span>
              </button>
            ))}
          </div>
        </div>
        <label>
          Class join code
          <input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="FERN-2-17"
          />
          <span className="hint">Leave this empty to wander on your own.</span>
        </label>
        {joinCode.trim() === "" && <GradeFields band={band} onBand={setBand} />}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="row-actions">
          <Button type="submit">Grow my garden</Button>
          <SoundToggle />
        </div>
        <Button variant="ghost" onClick={() => go(gardenStore().getRole() ? { name: "dashboard" } : { name: "title" })}>
          Back
        </Button>
      </form>
    </main>
  );
}

export function CheckInScreen() {
  const go = useGo();
  const [emotionId, setEmotionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function save(intensity: number) {
    if (!emotionId) return;
    const result = gardenStore().checkIn(emotionId, intensity);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    blip("soft");
    go({ name: "garden" });
  }

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Feelings check-in</p>
        <h1>How is your garden right now?</h1>
        <p>Feelings can visit. They are not who you are. You can skip this.</p>
        <div className="creature-grid">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion.emotionId}
              type="button"
              className={emotionId === emotion.emotionId ? "creature-card picked" : "creature-card"}
              onClick={() => setEmotionId(emotion.emotionId)}
            >
              <Sprite kind={EMOTION_SPRITE[emotion.emotionId as keyof typeof EMOTION_SPRITE]} width={88} alt="" />
              <strong>{emotion.creature}</strong>
              <span>{FEELING_WORD[emotion.name] ?? emotion.creature}</span>
            </button>
          ))}
        </div>
        {emotionId && <IntensityPicker onPick={save} />}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button variant="ghost" onClick={() => go({ name: "garden" })}>
          Not sure yet — take me to the garden
        </Button>
      </main>
    </Shell>
  );
}

export function GardenScreen() {
  const go = useGo();
  const snap = useGarden();
  const student = snap.students[0];
  if (!student) return <Missing title="Garden path" body="This garden name is not on the path." />;
  const hint = hintFor(student, snap.attempts);
  const story = hint.scenarioId ? getScenario(hint.scenarioId)?.title : null;
  return (
    <Shell student>
      <main className="wrap screen">
        <section className="panel hint-panel">
          <ol className="beads" aria-label="Today's path">
            {(
              [
                ["grove", "Grove"],
                ["forest", "Feelings"],
                ["mountain", "Calm"],
                ["resolve", "Repair"],
                ["trial", "Team"],
              ] as const
            ).map(([id, label]) => (
              <li key={id} className={beadClass(id, student.loop, hint.bead)}>
                {label}
              </li>
            ))}
          </ol>
          <div className="hint-copy">
            <Sprite kind="bramble" blink width={84} alt="" />
            <div>
              <p className="eyebrow">Bramble says</p>
              <h1>{hint.title}</h1>
              <p>{hint.text}</p>
              {story && <p className="hint">Open story: {story}</p>}
              <Button
                onClick={() => {
                  if (hint.bead === "resolve" && hint.scenarioId) go({ name: "play", scenarioId: hint.scenarioId });
                  else go({ name: hint.zone });
                }}
              >
                Follow the path
              </Button>
            </div>
          </div>
        </section>
        <section className="scene" aria-label="Garden map">
          <span className="firefly a" />
          <span className="firefly b" />
          <span className="firefly c" />
          <span className="tree left">
            <Sprite kind="pine" width={120} alt="" />
          </span>
          <span className="tree right">
            <Sprite kind="pine" width={96} alt="" />
          </span>
          <Portal
            title="Mindful Mountain"
            text="Breathe, ground, and pause"
            kind="pebble"
            suggested={hint.zone === "mountain"}
            onClick={() => go({ name: "mountain" })}
          />
          <Portal
            title="Feelings Forest"
            text="Meet the feeling creatures"
            kind="willow"
            suggested={hint.zone === "forest"}
            onClick={() => go({ name: "forest" })}
          />
          <Portal
            title="Conflict Grove"
            text="Practice fair words"
            kind="flower"
            suggested={hint.zone === "grove"}
            onClick={() => go({ name: "grove" })}
          />
          <Portal
            title="Teamwork Trials"
            text="Listen, share, and trust"
            kind="lantern"
            suggested={hint.zone === "trials"}
            onClick={() => go({ name: "trials" })}
          />
          <div className="guide">
            <Sprite kind="bramble" blink width={150} alt="Bramble waiting in the garden" />
          </div>
        </section>
      </main>
    </Shell>
  );
}

function Portal({
  title,
  text,
  kind,
  suggested,
  onClick,
}: {
  title: string;
  text: string;
  kind: SpriteKind;
  suggested: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={suggested ? "portal suggested" : "portal"} onClick={onClick}>
      <Sprite kind={kind} width={72} alt="" />
      <span>
        <strong>{title}</strong>
        <span>{text}</span>
        {suggested && <em>Next</em>}
      </span>
    </button>
  );
}

function beadClass(
  id: "grove" | "forest" | "mountain" | "resolve" | "trial",
  loop: { scenarioId: string | null; visitedForest: boolean; visitedMountain: boolean; finishedScenario: boolean; finishedTrial: boolean },
  current: string,
): string {
  const done =
    (id === "grove" && Boolean(loop.scenarioId)) ||
    (id === "forest" && loop.visitedForest) ||
    (id === "mountain" && loop.visitedMountain) ||
    (id === "resolve" && loop.finishedScenario) ||
    (id === "trial" && loop.finishedTrial);
  if (current === id) return "now";
  if (done) return "done";
  return "";
}

export function GroveScreen() {
  const go = useGo();
  const snap = useGarden();
  const student = snap.students[0];
  const classroom = snap.classrooms[0];
  const [error, setError] = useState("");
  if (!student || !classroom) return <Missing title="Conflict Grove" body="The grove path is missing." />;
  const scenarios = visibleScenarios(classroom.gradeBand);
  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Conflict Resolution Grove</p>
        <h1>A small conflict is a place to practice</h1>
        <p className="hint">A grown-up can read these stories aloud. There is no grade. A scratchy ending can be walked again.</p>
        <div className="stack">
          {scenarios.map((scenario) => {
            const mine = snap.attempts.filter((attempt) => attempt.scenarioId === scenario.scenarioId);
            const open = mine.some((attempt) => attempt.status === AttemptStatus.STARTED);
            const done = mine.some((attempt) => attempt.status === AttemptStatus.COMPLETED);
            return (
              <article key={scenario.scenarioId} className="story-card">
                <p className="eyebrow">{SKILL_LABEL[scenario.skillFocus].kid}</p>
                <h2>{scenario.title}</h2>
                <p>{scenario.blurb}</p>
                <p className="hint">{done ? "You have walked this path." : open ? "This story is still open." : "New story"}</p>
                <Button
                  onClick={() => {
                    const result = gardenStore().startScenario(scenario.scenarioId);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    go({ name: "play", scenarioId: scenario.scenarioId });
                  }}
                >
                  {open ? "Continue" : done ? "Walk again" : "Begin"}
                </Button>
              </article>
            );
          })}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button variant="ghost" onClick={() => go({ name: "garden" })}>
          Back to the garden
        </Button>
      </main>
    </Shell>
  );
}

export function PlayScreen({ scenarioId }: { scenarioId: string }) {
  const go = useGo();
  const snap = useGarden();
  const student = snap.students[0];
  const classroom = snap.classrooms[0];
  const scenario = getScenario(scenarioId);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sure, setSure] = useState(false);
  const lock = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const current = gardenStore().getSnapshot();
    const mine = current.attempts.filter((attempt) => attempt.scenarioId === scenarioId);
    const open = mine.find((attempt) => attempt.status === AttemptStatus.STARTED);
    if (open) {
      setAttemptId(open.attemptId);
      return;
    }
    const done = [...mine].reverse().find((attempt) => attempt.status === AttemptStatus.COMPLETED);
    if (done) {
      setAttemptId(done.attemptId);
      return;
    }
    const result = gardenStore().startScenario(scenarioId);
    if (result.ok && result.data) setAttemptId(result.data.attemptId);
    else setError(result.ok ? "The story did not open." : result.error);
  }, [scenarioId]);

  const attempt = snap.attempts.find((item) => item.attemptId === attemptId);
  const node = attempt?.scenarioId && attempt.nodeId ? getNode(attempt.scenarioId, attempt.nodeId) : undefined;
  const choices =
    node && student && classroom
      ? getChoices(node, {
          gradeBand: classroom.gradeBand,
          calmReady: student.calmReady || student.loop.visitedMountain,
        })
      : [];

  useEffect(() => {
    headingRef.current?.focus();
    lock.current = false;
  }, [attempt?.nodeId, attempt?.status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const index = Number(event.key) - 1;
      const choice = choices[index];
      if (!choice || choice.lockedReason || node?.isTerminal) return;
      pick(choice.choiceId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function pick(choiceId: string) {
    if (!attempt || lock.current) return;
    lock.current = true;
    const result = gardenStore().applyChoice(attempt.attemptId, choiceId);
    if (!result.ok) {
      lock.current = false;
      setError(result.error);
      return;
    }
    blip("tap");
    setError("");
  }

  if (!scenario || !student) return <Missing title="Conflict Grove" body="That story is not in this grove." />;

  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">{SKILL_LABEL[scenario.skillFocus].kid}</p>
        <h1>{scenario.title}</h1>
        {!node || !attempt ? (
          <p>{error || "The path is opening."}</p>
        ) : node.isTerminal ? (
          <section className={`panel ending ending-${node.outcome ?? "repair"}`}>
            <Sprite kind="butterfly" width={84} alt="" />
            <h2 ref={headingRef} tabIndex={-1}>
              {outcomeTitle(node.outcome)}
            </h2>
            <p>{node.prompt}</p>
            <p>
              <strong>Seeds from this story: </strong>
              {Math.max(0, attempt.harmony)}
            </p>
            <p>
              {uniqueSkills(attempt.skills).length > 0
                ? `You practiced: ${uniqueSkills(attempt.skills).join(", ")}.`
                : "You stayed with the story. That counts."}
            </p>
            <div className="row-actions">
              <Button
                onClick={() => {
                  blip("bloom");
                  go({ name: "garden" });
                }}
              >
                Return to the garden
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const result = gardenStore().startScenario(scenarioId);
                  if (result.ok && result.data) {
                    setAttemptId(result.data.attemptId);
                    setSure(false);
                  }
                }}
              >
                Walk it again
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="panel dialogue">
              <div className="speaker">
                <Sprite kind={speakerKind(node.speaker, student.avatarRef)} width={84} alt="" />
                <div>
                  <p className="eyebrow">{node.speaker}</p>
                  <h2 ref={headingRef} tabIndex={-1}>
                    {node.prompt}
                  </h2>
                </div>
              </div>
              {student.loop.scenarioId === scenarioId && !student.loop.visitedMountain && (
                <p className="hint">A stop at Mindful Mountain can unlock a calmer sentence.</p>
              )}
              <div className="stack">
                {choices.map((choice, index) => (
                  <button
                    key={choice.choiceId}
                    type="button"
                    className="choice"
                    disabled={Boolean(choice.lockedReason)}
                    onClick={() => pick(choice.choiceId)}
                  >
                    <span className="choice-index">{index + 1}</span>
                    <span>
                      {choice.label}
                      {choice.lockedReason && <small>{choice.lockedReason}</small>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="row-actions">
              <Button variant="ghost" onClick={() => go({ name: "garden" })}>
                Walk away for now
              </Button>
              {sure ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    gardenStore().abandonAttempt(attempt.attemptId);
                    go({ name: "grove" });
                  }}
                >
                  Yes, set it down
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setSure(true)}>
                  Set this story down
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </Shell>
  );
}

function uniqueSkills(skills: (keyof typeof SKILL_LABEL)[]): string[] {
  return [...new Set(skills)].map((skill) => SKILL_LABEL[skill].kid);
}

export function ForestScreen() {
  const go = useGo();
  const snap = useGarden();
  const met = new Set(snap.students[0]?.metCreatureIds ?? []);
  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">Feelings Forest</p>
        <h1>Each creature carries a feeling</h1>
        <p>Say hello, or notice if that feeling is visiting you today.</p>
        <div className="creature-grid">
          {EMOTIONS.map((emotion) => (
            <button
              key={emotion.emotionId}
              type="button"
              className="creature-card"
              onClick={() => go({ name: "creature", emotionId: emotion.emotionId })}
            >
              <Sprite kind={EMOTION_SPRITE[emotion.emotionId as keyof typeof EMOTION_SPRITE]} width={96} alt="" />
              <strong>{emotion.creature}</strong>
              <span>{met.has(emotion.emotionId) ? "You have met" : "New friend"}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => go({ name: "garden" })}>
          Back to the garden
        </Button>
      </main>
    </Shell>
  );
}

export function CreatureScreen({ emotionId }: { emotionId: string }) {
  const go = useGo();
  const emotion = getEmotion(emotionId);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  if (!emotion) return <Missing title="Feelings Forest" body="That creature wandered deeper into the trees." />;
  const kind = EMOTION_SPRITE[emotion.emotionId as keyof typeof EMOTION_SPRITE];
  return (
    <Shell student>
      <main className="narrow screen">
        <article className="panel creature-story">
          <Sprite kind={kind} blink width={180} alt={emotion.creature} />
          <div>
            <p className="eyebrow">{FEELING_WORD[emotion.name] ?? "feeling"}</p>
            <h1>{emotion.creature}</h1>
            <p>{describeEmotion(emotion)}</p>
            <h2>What can help</h2>
            <ul>
              {emotion.helps.map((help) => (
                <li key={help}>{help}</li>
              ))}
            </ul>
          </div>
        </article>
        {picking ? (
          <IntensityPicker
            onPick={(intensity) => {
              const result = gardenStore().checkIn(emotion.emotionId, intensity);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              blip("soft");
              go({ name: "forest" });
            }}
          />
        ) : (
          <div className="row-actions">
            <Button
              onClick={() => {
                gardenStore().meetCreature(emotion.emotionId);
                blip("soft");
                go({ name: "forest" });
              }}
            >
              Say hello
            </Button>
            <Button variant="gold" onClick={() => setPicking(true)}>
              This feeling is visiting me
            </Button>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button variant="ghost" onClick={() => go({ name: "forest" })}>
          Back to the forest
        </Button>
      </main>
    </Shell>
  );
}

export function JournalScreen() {
  const go = useGo();
  const snap = useGarden();
  const student = snap.students[0];
  const [slip, setSlip] = useState("");
  const [note, setNote] = useState("");
  if (!student) return <Missing title="Journal" body="No garden journal is open." />;
  const report = reportFor(snap);
  const seeds = seedsOf(snap.attempts, student.alias);
  return (
    <Shell student>
      <main className="narrow screen">
        <p className="eyebrow">My garden journal</p>
        <h1>
          {student.alias} the {bloomName(seeds).toLowerCase()}
        </h1>
        <p>
          {seeds} {seeds === 1 ? "seed" : "seeds"} gathered. This journal is only yours.
        </p>
        <h2>Paths</h2>
        {snap.attempts.length === 0 && <p>Your first story is waiting in the grove.</p>}
        <ul className="plain-list">
          {snap.attempts.map((attempt) => {
            const recent = report?.recent.find((item) => item.attemptId === attempt.attemptId);
            return (
              <li key={attempt.attemptId}>
                <strong>{recent?.title ?? "Garden path"}</strong>
                <span>
                  {outcomeLabel(attempt.outcome, attempt.status)} · {friendlyWhen(attempt.completedAt ?? attempt.startedAt)}
                </span>
              </li>
            );
          })}
        </ul>
        <h2>Creatures met</h2>
        <p>
          {student.metCreatureIds.length === 0
            ? "The forest is still quiet."
            : student.metCreatureIds
                .map((id) => getEmotion(id)?.creature ?? id)
                .join(", ")}
        </p>
        <h2>Blossom slip</h2>
        <p className="hint">
          Give this code to your garden keeper if you play on a different device. It has your garden name and practice, not a real name.
        </p>
        <Button
          variant="ghost"
          onClick={() => {
            const result = gardenStore().exportSlip();
            if (!result.ok || !result.data) {
              setNote(result.ok ? "The slip did not grow." : result.error);
              return;
            }
            setSlip(result.data);
            void copyText(result.data).then((ok) => setNote(ok ? "Copied." : "Select the slip and copy it."));
          }}
        >
          Make my blossom slip
        </Button>
        {note && <p role="status">{note}</p>}
        {slip && <textarea readOnly value={slip} rows={4} aria-label="Blossom slip" />}
        <Button variant="ghost" onClick={() => go({ name: "garden" })}>
          Back to the garden
        </Button>
      </main>
    </Shell>
  );
}
