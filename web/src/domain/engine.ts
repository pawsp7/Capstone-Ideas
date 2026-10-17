import {
  challengeTitle,
  describeEmotion,
  getEmotion,
  getExercise,
  getNode,
  getScenario,
  SCENARIOS,
} from "./content";
import {
  AttemptStatus,
  Role,
  SKILL_ORDER,
  assertOneTarget,
  bandCeiling,
  bandFloor,
  classroomIdFor,
  type Attempt,
  type Classroom,
  type DashboardReport,
  type EmotionCheckin,
  type GradeBand,
  type Outcome,
  type RecentAttempt,
  type ScenarioNode,
  type SkillType,
  type Student,
} from "./types";

export type OfferedChoice = ScenarioNode["choices"][number] & { lockedReason?: string };

export type ChoiceContext = {
  gradeBand: GradeBand;
  calmReady: boolean;
};

const JOIN = /^([A-Z]+)-([123])-(\d{2})$/;
const WORDS = [
  "FERN",
  "MOSS",
  "PINE",
  "MOTH",
  "BLOOM",
  "RAIN",
  "LEAF",
  "SEED",
  "WILLOW",
  "EMBER",
  "BROOK",
  "CLOUD",
  "STAR",
  "DAISY",
  "CLOVER",
  "MAPLE",
  "BIRCH",
  "RIVER",
];

export function nowIso(now = new Date()): string {
  return now.toISOString();
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

export function validateAlias(alias: string): string | null {
  const name = alias.trim().replace(/\s+/g, " ");
  if (name.length < 2) return "Use at least 2 letters for a garden name.";
  if (name.length > 18) return "That garden name is a little long.";
  if (!/^[A-Za-z][A-Za-z0-9 ]*$/.test(name)) {
    return "Use a made-up garden name with letters and numbers. No emails or symbols.";
  }
  return null;
}

export function cleanAlias(alias: string): string {
  return alias.trim().replace(/\s+/g, " ");
}

export function parseJoinCode(input: string): { code: string; gradeBand: GradeBand } | null {
  const match = input.trim().toUpperCase().match(JOIN);
  if (!match) return null;
  const gradeBand: GradeBand = match[2] === "1" ? "1-2" : match[2] === "2" ? "3-4" : "5-6";
  return { code: `${match[1]}-${match[2]}-${match[3]}`, gradeBand };
}

export function generateJoinCode(gradeBand: GradeBand, rng: () => number = Math.random): string {
  const word = WORDS[Math.floor(rng() * WORDS.length)] ?? "FERN";
  const digit = gradeBand === "1-2" ? "1" : gradeBand === "3-4" ? "2" : "3";
  const number = String(10 + Math.floor(rng() * 90));
  return `${word}-${digit}-${number}`;
}

export function generateSecret(prefix: "KEEP" | "VIEW", joinCode: string, rng: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let index = 0; index < 3; index += 1) {
    token += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return `${prefix}-${joinCode}-${token}`;
}

export function visibleScenarios(gradeBand: GradeBand) {
  const floor = bandFloor(gradeBand);
  const ceiling = bandCeiling(gradeBand);
  return SCENARIOS.filter(
    (scenario) => scenario.minGrade <= ceiling && scenario.maxGrade >= floor,
  );
}

export function getChoices(node: ScenarioNode, ctx: ChoiceContext): OfferedChoice[] {
  const ceiling = bandCeiling(ctx.gradeBand);
  return node.choices
    .filter((item) => item.minGrade === undefined || item.minGrade <= ceiling)
    .map((item) => {
      if (item.requiresCalm && !ctx.calmReady) {
        return {
          ...item,
          lockedReason: "Practice on Mindful Mountain to unlock this calm sentence.",
        };
      }
      return { ...item };
    });
}

export function applyChoice(attempt: Attempt, choiceId: string, when = new Date()): Attempt {
  assertOneTarget(attempt);
  if (attempt.status !== AttemptStatus.STARTED || !attempt.scenarioId || !attempt.nodeId) {
    throw new Error("This story is not open.");
  }
  const node = getNode(attempt.scenarioId, attempt.nodeId);
  const choice = node?.choices.find((item) => item.choiceId === choiceId);
  if (!node || !choice) throw new Error("That choice is not on this part of the story.");
  const next = getNode(attempt.scenarioId, choice.nextNodeId);
  if (!next) throw new Error("The path is missing its next step.");
  const updated: Attempt = {
    ...attempt,
    nodeId: next.nodeId,
    skills: [...attempt.skills, ...choice.skills],
    harmony: attempt.harmony + choice.harmony,
    choiceIds: [...attempt.choiceIds, choice.choiceId],
  };
  if (next.isTerminal) {
    updated.status = AttemptStatus.COMPLETED;
    updated.completedAt = nowIso(when);
    updated.outcome = next.outcome;
  }
  assertOneTarget(updated);
  return updated;
}

export function abandonAttempt(attempt: Attempt, when = new Date()): Attempt {
  assertOneTarget(attempt);
  if (attempt.status !== AttemptStatus.STARTED) throw new Error("This path is already closed.");
  return {
    ...attempt,
    status: AttemptStatus.ABANDONED,
    completedAt: nowIso(when),
  };
}

export function completePractice(
  attempt: Attempt,
  outcome: Outcome,
  harmony: number,
  skills: SkillType[],
  when = new Date(),
): Attempt {
  assertOneTarget(attempt);
  if (attempt.status !== AttemptStatus.STARTED) throw new Error("This practice is already closed.");
  return {
    ...attempt,
    status: AttemptStatus.COMPLETED,
    completedAt: nowIso(when),
    outcome,
    harmony: attempt.harmony + harmony,
    skills: [...attempt.skills, ...skills],
  };
}

export function openAttempt(input: {
  studentAlias: string;
  scenarioId?: string;
  exerciseId?: string;
  challengeId?: string;
  nodeId?: string;
  when?: Date;
}): Attempt {
  const attempt: Attempt = {
    attemptId: uid("attempt"),
    studentAlias: input.studentAlias,
    scenarioId: input.scenarioId,
    exerciseId: input.exerciseId,
    challengeId: input.challengeId,
    status: AttemptStatus.STARTED,
    startedAt: nowIso(input.when ?? new Date()),
    nodeId: input.nodeId,
    harmony: 0,
    skills: [],
    choiceIds: [],
  };
  assertOneTarget(attempt);
  return attempt;
}

export function seedsOf(attempts: Attempt[], alias?: string): number {
  return attempts
    .filter(
      (attempt) =>
        attempt.status === AttemptStatus.COMPLETED &&
        (alias === undefined || attempt.studentAlias === alias),
    )
    .reduce((sum, attempt) => sum + Math.max(0, attempt.harmony), 0);
}

export function bloomName(seeds: number): string {
  if (seeds <= 0) return "Seed";
  if (seeds <= 2) return "Sprout";
  if (seeds <= 5) return "Buds";
  if (seeds <= 9) return "Blossoms";
  return "Butterfly garden";
}

export function intensityWord(value: number): string {
  if (value < 1.5) return "a whisper";
  if (value < 2.5) return "a breeze";
  if (value < 3.5) return "a rustle";
  if (value < 4.5) return "a strong wind";
  return "a storm";
}

export type GardenHint = {
  zone: "grove" | "forest" | "mountain" | "trials";
  bead: "grove" | "forest" | "mountain" | "resolve" | "trial";
  title: string;
  text: string;
  scenarioId?: string;
};

export function hintFor(student: Student, attempts: Attempt[]): GardenHint {
  const loop = student.loop;
  const open = attempts.find(
    (attempt) =>
      attempt.studentAlias === student.alias &&
      attempt.status === AttemptStatus.STARTED &&
      attempt.scenarioId === loop.scenarioId,
  );
  if (loop.scenarioId && open && !loop.visitedForest) {
    return {
      zone: "forest",
      bead: "forest",
      title: "Name the feeling",
      text: "A story is open in the grove. Feelings Forest can show you what your body might be saying before you answer.",
      scenarioId: loop.scenarioId,
    };
  }
  if (loop.scenarioId && open && !loop.visitedMountain) {
    return {
      zone: "mountain",
      bead: "mountain",
      title: "Settle your body",
      text: "You named a feeling. Mindful Mountain has a short practice so your next words can be calmer.",
      scenarioId: loop.scenarioId,
    };
  }
  if (open?.scenarioId) {
    return {
      zone: "grove",
      bead: "resolve",
      title: "Return and repair",
      text: "Your calm tools are ready. Go back to the story and try a clear, kind sentence.",
      scenarioId: open.scenarioId,
    };
  }
  if (loop.finishedScenario && !loop.finishedTrial) {
    return {
      zone: "trials",
      bead: "trial",
      title: "Restore the garden",
      text: "The conflict has a closing. A teamwork trial helps the whole garden settle.",
      scenarioId: loop.scenarioId ?? undefined,
    };
  }
  return {
    zone: "grove",
    bead: "grove",
    title: "A ripple in the grove",
    text: "When you are ready, start a story in the grove. The garden walks with you: feelings, calm, repair, then teamwork.",
  };
}

function attemptTitle(attempt: Attempt): { title: string; kind: RecentAttempt["kind"] } {
  if (attempt.scenarioId) return { title: getScenario(attempt.scenarioId)?.title ?? "Story", kind: "scenario" };
  if (attempt.exerciseId) {
    return { title: getExercise(attempt.exerciseId)?.title ?? "Calm practice", kind: "exercise" };
  }
  return { title: challengeTitle(attempt.challengeId), kind: "challenge" };
}

export function generateReport(input: {
  classroom: Classroom;
  students: Student[];
  attempts: Attempt[];
  checkins: EmotionCheckin[];
  when?: Date;
}): DashboardReport {
  const aliases = new Set(input.students.map((student) => student.alias));
  const attempts = input.attempts.filter((attempt) => aliases.has(attempt.studentAlias));
  const checkins = input.checkins.filter((checkin) => aliases.has(checkin.studentAlias));
  const skillCounts = new Map<SkillType, number>(SKILL_ORDER.map((skill) => [skill, 0]));
  for (const attempt of attempts) {
    for (const skill of attempt.skills) {
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }
  const emotions = ["anxiety", "frustration", "loneliness", "enthusiasm", "sadness"].map((emotionId) => {
    const rows = checkins.filter((checkin) => checkin.emotionId === emotionId);
    const average =
      rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row.intensity, 0) / rows.length;
    return {
      emotionId,
      creature: getEmotion(emotionId)?.creature ?? emotionId,
      count: rows.length,
      averageIntensity: Math.round(average * 10) / 10,
    };
  });
  const recent = [...attempts]
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))
    .slice(0, 8)
    .map((attempt) => {
      const titled = attemptTitle(attempt);
      return {
        attemptId: attempt.attemptId,
        studentAlias: attempt.studentAlias,
        title: titled.title,
        kind: titled.kind,
        status: attempt.status,
        outcome: attempt.outcome,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      };
    });
  const roster = [...input.students]
    .sort((a, b) => a.alias.localeCompare(b.alias))
    .map((student) => {
      const mine = checkins
        .filter((checkin) => checkin.studentAlias === student.alias)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const last = mine[mine.length - 1];
      return {
        alias: student.alias,
        avatarRef: student.avatarRef,
        lastEmotionId: last?.emotionId,
        lastIntensity: last?.intensity,
        completedCount: attempts.filter(
          (attempt) =>
            attempt.studentAlias === student.alias && attempt.status === AttemptStatus.COMPLETED,
        ).length,
        seeds: seedsOf(attempts, student.alias),
        updatedAt: student.updatedAt,
      };
    });
  const when = input.when ?? new Date();
  return {
    reportId: `report_${input.classroom.classroomId}_${when.getTime()}`,
    classroomId: input.classroom.classroomId,
    generatedAt: nowIso(when),
    gradeBand: input.classroom.gradeBand,
    studentCount: input.students.length,
    skills: SKILL_ORDER.map((skill) => ({ skill, count: skillCounts.get(skill) ?? 0 })),
    emotions,
    attemptTotals: {
      started: attempts.filter((attempt) => attempt.status === AttemptStatus.STARTED).length,
      completed: attempts.filter((attempt) => attempt.status === AttemptStatus.COMPLETED).length,
      abandoned: attempts.filter((attempt) => attempt.status === AttemptStatus.ABANDONED).length,
    },
    recent,
    roster,
  };
}

export type Slip = {
  kind: "harmony-garden-slip";
  version: 1;
  classroomCode: string | null;
  gradeBand: GradeBand;
  student: Student;
  attempts: Attempt[];
  checkins: EmotionCheckin[];
};

export function encodeSlip(slip: Slip): string {
  const json = JSON.stringify(slip);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `bloom1.${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

export function decodeSlip(text: string): Slip {
  const trimmed = text.trim();
  if (!trimmed.startsWith("bloom1.")) throw new Error("That slip did not grow. Paste the whole blossom code.");
  const body = trimmed.slice("bloom1.".length).replace(/-/g, "+").replace(/_/g, "/");
  const padded = body + "=".repeat((4 - (body.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Slip>;
  if (parsed.kind !== "harmony-garden-slip" || parsed.version !== 1 || !parsed.student) {
    throw new Error("That slip did not grow. Paste the whole blossom code.");
  }
  for (const attempt of parsed.attempts ?? []) assertOneTarget(attempt);
  return {
    kind: "harmony-garden-slip",
    version: 1,
    classroomCode: parsed.classroomCode ?? null,
    gradeBand: parsed.gradeBand ?? "3-4",
    student: parsed.student,
    attempts: parsed.attempts ?? [],
    checkins: parsed.checkins ?? [],
  };
}

export function shadowClassroom(code: string, gradeBand: GradeBand): Classroom {
  return {
    classroomId: classroomIdFor(code),
    code,
    gradeBand,
    keeperCode: "",
    viewCode: "",
  };
}

export function emotionBlurb(emotionId: string): string {
  const emotion = getEmotion(emotionId);
  return emotion ? describeEmotion(emotion) : "";
}

export function canMutate(role: string | null | undefined): boolean {
  return role === Role.TEACHER || role === Role.ADMIN;
}

export function outcomeLabel(outcome?: Outcome, status?: Attempt["status"]): string {
  if (status === AttemptStatus.STARTED) return "In progress";
  if (status === AttemptStatus.ABANDONED) return "Set down";
  if (outcome === "bloom") return "Bloomed";
  if (outcome === "repair") return "Repaired";
  if (outcome === "tangle") return "Still growing";
  return "Practiced";
}
