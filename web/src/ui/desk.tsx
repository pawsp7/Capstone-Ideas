import { useState } from "react";
import { getEmotion } from "../domain/content";
import { intensityWord, outcomeLabel } from "../domain/engine";
import { Role, SKILL_LABEL, type GradeBand } from "../domain/types";
import { Sprite } from "../game/Sprite";
import { EMOTION_SPRITE } from "../game/sprites";
import { reportFor } from "../state/store";
import { gardenStore, useGarden } from "../state/useGarden";
import { Button, DeskBar, GradeFields, Shell, SoundToggle, useGo } from "./chrome";
import { copyText, downloadText, friendlyWhen, gradeLabel } from "./format";

export function KeeperScreen() {
  const go = useGo();
  const snap = useGarden();
  const [keeperKey, setKeeperKey] = useState("");
  const [viewKey, setViewKey] = useState("");
  const [alias, setAlias] = useState("");
  const [band, setBand] = useState<GradeBand>("3-4");
  const [error, setError] = useState("");
  const [planted, setPlanted] = useState<{ joinCode: string; keeperCode: string; viewCode: string } | null>(null);
  const session = snap.session;
  const classroom = snap.classrooms[0];

  return (
    <>
      {(session?.role === Role.TEACHER || session?.role === Role.COUNSELOR) && <DeskBar />}
      <main className="narrow screen">
        <p className="eyebrow">Garden keepers</p>
        <h1>A desk for teachers and counselors</h1>
        <p>
          Students use garden names, never real names. This prototype keeps the desk in this browser. Download a class file if you
          want to open it on another device.
        </p>
        {session && session.role !== Role.STUDENT && classroom && (
          <section className="panel">
            <h2>{session.role === Role.COUNSELOR ? "Viewing a desk" : "Your desk is open"}</h2>
            <CodeLine label="Student join code" value={classroom.code} />
            {session.role === Role.TEACHER && (
              <>
                <CodeLine label="Keeper key" value={classroom.keeperCode} />
                <CodeLine label="Counselor view key" value={classroom.viewCode} />
              </>
            )}
            <Button onClick={() => go({ name: "dashboard" })}>Go to the desk</Button>
          </section>
        )}
        {planted && (
          <section className="panel ending ending-bloom">
            <h2>The class garden is planted</h2>
            <p>Share the join code with students. Keep the other two keys private.</p>
            <CodeLine label="Student join code" value={planted.joinCode} />
            <CodeLine label="Keeper key" value={planted.keeperCode} />
            <CodeLine label="Counselor view key" value={planted.viewCode} />
            <Button onClick={() => go({ name: "dashboard" })}>Open the desk</Button>
          </section>
        )}
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const result = gardenStore().signInWithCode(keeperKey);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            go({ name: "dashboard" });
          }}
        >
          <h2>Open your desk</h2>
          <label>
            Keeper key
            <input value={keeperKey} onChange={(event) => setKeeperKey(event.target.value.toUpperCase())} spellCheck={false} placeholder="KEEP-FERN-2-17-ABC" />
          </label>
          <Button type="submit">Open</Button>
        </form>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const result = gardenStore().signInWithCode(viewKey);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            go({ name: "dashboard" });
          }}
        >
          <h2>Counselor view</h2>
          <p className="hint">A view key can see the desk and cannot change the roster.</p>
          <label>
            View key
            <input value={viewKey} onChange={(event) => setViewKey(event.target.value.toUpperCase())} spellCheck={false} placeholder="VIEW-FERN-2-17-ABC" />
          </label>
          <Button type="submit" variant="ghost">
            Open view only
          </Button>
        </form>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const result = gardenStore().createClassroom({ alias, gradeBand: band });
            if (!result.ok || !result.data) {
              setError(result.ok ? "The garden did not plant." : result.error);
              return;
            }
            setPlanted(result.data);
            setError("");
          }}
        >
          <h2>Plant a new class</h2>
          <label>
            Your keeper name
            <input value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Keeper Fern" required />
            <span className="hint">A garden name, not a student's real name.</span>
          </label>
          <GradeFields band={band} onBand={setBand} />
          <Button type="submit">Plant the class</Button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button
          variant="gold"
          onClick={() => {
            gardenStore().openSample();
            go({ name: "dashboard" });
          }}
        >
          Preview a sample class
        </Button>
        <div className="row-actions">
          <Button variant="ghost" onClick={() => go({ name: "title" })}>
            Back to the gate
          </Button>
          {!(session && session.role !== Role.STUDENT) && <SoundToggle />}
        </div>
      </main>
    </>
  );
}

function CodeLine({ label, value }: { label: string; value: string }) {
  const [note, setNote] = useState("");
  if (!value) return null;
  return (
    <label>
      {label}
      <span className="code-line">
        <input readOnly value={value} aria-label={label} />
        <button
          type="button"
          onClick={() => {
            void copyText(value).then((ok) => setNote(ok ? "Copied" : "Select the code"));
          }}
        >
          Copy
        </button>
      </span>
      {note && <span className="hint">{note}</span>}
    </label>
  );
}

export function DashboardScreen() {
  const go = useGo();
  const snap = useGarden();
  const report = reportFor(snap);
  const classroom = snap.classrooms[0];
  const teacher = snap.session?.role === Role.TEACHER;
  const [slip, setSlip] = useState("");
  const [message, setMessage] = useState("");
  if (!report || !classroom || !snap.session || snap.session.role === Role.STUDENT) {
    return (
      <Shell>
        <main className="narrow screen">
          <h1>The desk is closed</h1>
          <Button onClick={() => go({ name: "keeper" })}>Open a desk</Button>
        </main>
      </Shell>
    );
  }
  const maxSkill = Math.max(1, ...report.skills.map((skill) => skill.count));
  return (
    <Shell>
      <main className="wrap screen">
        <p className="eyebrow">{gradeLabel(classroom.gradeBand)}</p>
        <h1>{classroom.code}</h1>
        <p>
          {snap.session.role === Role.COUNSELOR
            ? "You can see this garden and cannot change it."
            : "Counts are practices, not grades. Families differ, so invite students to use words that feel respectful at home too."}
        </p>
        <div className="stat-row">
          <article>
            <strong>{report.studentCount}</strong>
            <span>Students</span>
          </article>
          <article>
            <strong>{report.attemptTotals.completed}</strong>
            <span>Finished</span>
          </article>
          <article>
            <strong>{report.attemptTotals.started}</strong>
            <span>In progress</span>
          </article>
          <article>
            <strong>{report.attemptTotals.abandoned}</strong>
            <span>Set down</span>
          </article>
        </div>
        <section className="panel">
          <h2>Skills practiced</h2>
          {report.skills.every((skill) => skill.count === 0) && <p>Skills will appear as students practice.</p>}
          {report.skills.map((skill) => (
            <div key={skill.skill} className="bar-row">
              <span>{SKILL_LABEL[skill.skill].teacher}</span>
              <div className="bar" role="img" aria-label={`${skill.count} ${SKILL_LABEL[skill.skill].teacher} practices`}>
                <span style={{ width: `${(skill.count / maxSkill) * 100}%` }} />
              </div>
              <b>{skill.count}</b>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Feeling weather</h2>
          <div className="emotion-row">
            {report.emotions.map((emotion) => (
              <article key={emotion.emotionId} className={emotion.count ? "emotion-pill" : "emotion-pill quiet"}>
                <Sprite
                  kind={EMOTION_SPRITE[emotion.emotionId as keyof typeof EMOTION_SPRITE]}
                  width={64}
                  alt=""
                />
                <strong>{emotion.creature.split(" ")[1] ?? emotion.creature}</strong>
                <span>{emotion.count === 0 ? "No visits" : `${emotion.count} · usually ${intensityWord(emotion.averageIntensity)}`}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Recent practice</h2>
          {report.recent.length === 0 && <p>Stories and rests will gather here.</p>}
          <ul className="plain-list">
            {report.recent.map((attempt) => (
              <li key={attempt.attemptId}>
                <strong>
                  {attempt.studentAlias} · {attempt.title}
                </strong>
                <span>
                  {outcomeLabel(attempt.outcome, attempt.status)} · {friendlyWhen(attempt.completedAt ?? attempt.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="row-actions">
          <Button onClick={() => go({ name: "roster" })}>Open the roster</Button>
          <Button variant="ghost" onClick={() => go({ name: "join", code: classroom.code })}>
            Walk the garden as a student
          </Button>
        </div>
        {teacher && (
          <section className="panel">
            <h2>Bring a student's slip</h2>
            <p className="hint">A student can copy a blossom slip from their journal on another device.</p>
            <textarea value={slip} onChange={(event) => setSlip(event.target.value)} rows={4} aria-label="Blossom slip" />
            <div className="row-actions">
              <Button
                onClick={() => {
                  const result = gardenStore().importSlip(slip);
                  setMessage(result.ok ? "The slip joined the desk." : result.error);
                  if (result.ok) setSlip("");
                }}
              >
                Plant the slip
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const result = gardenStore().exportClassFile();
                  if (!result.ok || !result.data) {
                    setMessage(result.ok ? "The file did not grow." : result.error);
                    return;
                  }
                  downloadText(`harmony-garden-${classroom.code}.json`, result.data);
                  setMessage("Class file downloaded. Keep it private. It opens this desk.");
                }}
              >
                Download class file
              </Button>
            </div>
            <label className="file-label">
              Restore a class file
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void file.text().then((text) => {
                    const result = gardenStore().importClassFile(text);
                    setMessage(result.ok ? "Class file opened." : result.error);
                  });
                }}
              />
            </label>
            {message && <p role="status">{message}</p>}
          </section>
        )}
      </main>
    </Shell>
  );
}

export function RosterScreen() {
  const go = useGo();
  const snap = useGarden();
  const report = reportFor(snap);
  const teacher = snap.session?.role === Role.TEACHER;
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (!report) {
    return (
      <Shell>
        <main className="narrow screen">
          <h1>No roster yet</h1>
          <Button onClick={() => go({ name: "keeper" })}>Open a desk</Button>
        </main>
      </Shell>
    );
  }
  return (
    <Shell>
      <main className="narrow screen">
        <p className="eyebrow">Roster</p>
        <h1>Garden names</h1>
        <p className="hint">Names are aliases. Removing someone only removes them from this device.</p>
        {report.roster.length === 0 && (
          <p>When students join with your code on this browser, or you plant a blossom slip, they appear here.</p>
        )}
        <ul className="roster">
          {report.roster.map((row) => {
            const emotion = row.lastEmotionId ? getEmotion(row.lastEmotionId) : undefined;
            return (
              <li key={row.alias}>
                <Sprite kind={avatarKind(row.avatarRef)} width={64} alt="" />
                <div>
                  <strong>{row.alias}</strong>
                  <span>
                    {emotion ? `Last feeling: ${emotion.creature}` : "No check-in yet"} · {row.completedCount} finished · {row.seeds} seeds
                  </span>
                </div>
                {teacher && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (pending !== row.alias) {
                        setPending(row.alias);
                        return;
                      }
                      const result = gardenStore().removeStudent(row.alias);
                      if (!result.ok) setError(result.error);
                      setPending(null);
                    }}
                  >
                    {pending === row.alias ? "Yes, remove" : "Remove"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button variant="ghost" onClick={() => go({ name: "dashboard" })}>
          Back to the desk
        </Button>
      </main>
    </Shell>
  );
}

function avatarKind(value: string): "bramble" | "mothwing" | "pinekit" | "emberbud" {
  if (value === "mothwing" || value === "pinekit" || value === "emberbud") return value;
  return "bramble";
}
