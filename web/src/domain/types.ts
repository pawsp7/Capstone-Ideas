/** Domain types traced from model/harmony_garden.puml. */

export const Role = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  COUNSELOR: "COUNSELOR",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const SkillType = {
  CONFLICT_RESOLUTION: "CONFLICT_RESOLUTION",
  BOUNDARIES: "BOUNDARIES",
  TEAMWORK: "TEAMWORK",
  EMOTIONAL_LITERACY: "EMOTIONAL_LITERACY",
  MINDFULNESS: "MINDFULNESS",
} as const;
export type SkillType = (typeof SkillType)[keyof typeof SkillType];

export const AttemptStatus = {
  STARTED: "STARTED",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED",
} as const;
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

export const EmotionType = {
  ANXIETY: "ANXIETY",
  FRUSTRATION: "FRUSTRATION",
  LONELINESS: "LONELINESS",
  ENTHUSIASM: "ENTHUSIASM",
  SADNESS: "SADNESS",
} as const;
export type EmotionType = (typeof EmotionType)[keyof typeof EmotionType];

export type GradeBand = "1-2" | "3-4" | "5-6";

export type Outcome = "bloom" | "repair" | "tangle";

export type LoopState = {
  scenarioId: string | null;
  visitedForest: boolean;
  visitedMountain: boolean;
  finishedScenario: boolean;
  finishedTrial: boolean;
};

export type Student = {
  alias: string;
  classroomId: string;
  avatarRef: string;
  metCreatureIds: string[];
  calmReady: boolean;
  loop: LoopState;
  updatedAt: string;
};

export type Teacher = {
  teacherId: string;
  alias: string;
  role: Role;
  classroomId: string;
};

export type Classroom = {
  classroomId: string;
  code: string;
  gradeBand: GradeBand;
  keeperCode: string;
  viewCode: string;
};

export type Scenario = {
  scenarioId: string;
  title: string;
  blurb: string;
  skillFocus: SkillType;
  minGrade: number;
  maxGrade: number;
  entryNodeId: string;
};

export type Choice = {
  choiceId: string;
  nodeId: string;
  label: string;
  nextNodeId: string;
  skills: SkillType[];
  harmony: number;
  minGrade?: number;
  requiresCalm?: boolean;
};

export type ScenarioNode = {
  nodeId: string;
  scenarioId: string;
  speaker: string;
  prompt: string;
  isTerminal: boolean;
  outcome?: Outcome;
  choices: Choice[];
};

export type MindfulnessExercise = {
  exerciseId: string;
  title: string;
  technique: string;
  durationSec: number;
  blurb: string;
};

export type TeamworkChallenge = {
  challengeId: string;
  title: string;
  teamCode: string;
  blurb: string;
  focus: string;
};

export type Attempt = {
  attemptId: string;
  studentAlias: string;
  scenarioId?: string;
  exerciseId?: string;
  challengeId?: string;
  status: AttemptStatus;
  startedAt: string;
  completedAt?: string;
  nodeId?: string;
  harmony: number;
  skills: SkillType[];
  choiceIds: string[];
  outcome?: Outcome;
};

export type Emotion = {
  emotionId: string;
  name: EmotionType;
  creature: string;
  bodyCues: string;
  helps: string[];
  story: string;
};

export type EmotionCheckin = {
  checkInId: string;
  studentAlias: string;
  emotionId: string;
  intensity: number;
  createdAt: string;
};

export type SkillCount = { skill: SkillType; count: number };

export type DashboardReport = {
  reportId: string;
  classroomId: string;
  generatedAt: string;
  gradeBand: GradeBand;
  studentCount: number;
  skills: SkillCount[];
  emotions: {
    emotionId: string;
    creature: string;
    count: number;
    averageIntensity: number;
  }[];
  attemptTotals: { started: number; completed: number; abandoned: number };
  recent: RecentAttempt[];
  roster: RosterRow[];
};

export type RecentAttempt = {
  attemptId: string;
  studentAlias: string;
  title: string;
  kind: "scenario" | "exercise" | "challenge";
  status: AttemptStatus;
  outcome?: Outcome;
  startedAt: string;
  completedAt?: string;
};

export type RosterRow = {
  alias: string;
  avatarRef: string;
  lastEmotionId?: string;
  lastIntensity?: number;
  completedCount: number;
  seeds: number;
  updatedAt: string;
};

export type Session =
  | { role: typeof Role.STUDENT; alias: string; classroomId: string }
  | {
      role: typeof Role.TEACHER | typeof Role.COUNSELOR;
      teacherId: string;
      alias: string;
      classroomId: string;
    };

export type Credential = {
  code: string;
  role: typeof Role.TEACHER | typeof Role.COUNSELOR;
  classroomId: string;
  teacherId: string;
};

export type Persisted = {
  version: 1;
  classrooms: Classroom[];
  teachers: Teacher[];
  students: Student[];
  attempts: Attempt[];
  checkins: EmotionCheckin[];
  credentials: Credential[];
  session: Session | null;
};

export const SKILL_ORDER: SkillType[] = [
  SkillType.CONFLICT_RESOLUTION,
  SkillType.BOUNDARIES,
  SkillType.TEAMWORK,
  SkillType.EMOTIONAL_LITERACY,
  SkillType.MINDFULNESS,
];

export const SKILL_LABEL: Record<SkillType, { teacher: string; kid: string }> = {
  [SkillType.CONFLICT_RESOLUTION]: { teacher: "Conflict resolution", kid: "Fair words" },
  [SkillType.BOUNDARIES]: { teacher: "Boundaries", kid: "Kind boundaries" },
  [SkillType.TEAMWORK]: { teacher: "Teamwork", kid: "Teamwork" },
  [SkillType.EMOTIONAL_LITERACY]: { teacher: "Emotional literacy", kid: "Feeling names" },
  [SkillType.MINDFULNESS]: { teacher: "Mindfulness", kid: "Calm body" },
};

export const AVATARS = ["bramble", "mothwing", "pinekit", "emberbud"] as const;
export type AvatarId = (typeof AVATARS)[number];

export const AVATAR_LABEL: Record<AvatarId, string> = {
  bramble: "Bramble",
  mothwing: "Mothwing",
  pinekit: "Pinekit",
  emberbud: "Emberbud",
};

export function emptyLoop(): LoopState {
  return {
    scenarioId: null,
    visitedForest: false,
    visitedMountain: false,
    finishedScenario: false,
    finishedTrial: false,
  };
}

export function emptyDb(): Persisted {
  return {
    version: 1,
    classrooms: [],
    teachers: [],
    students: [],
    attempts: [],
    checkins: [],
    credentials: [],
    session: null,
  };
}

export function bandFloor(band: GradeBand): number {
  if (band === "1-2") return 1;
  if (band === "3-4") return 3;
  return 5;
}

export function bandCeiling(band: GradeBand): number {
  if (band === "1-2") return 2;
  if (band === "3-4") return 4;
  return 6;
}

export function classroomIdFor(code: string): string {
  return `class_${code}`;
}

/** Exactly one of scenario, exercise, or challenge (class-diagram gap A2). */
export function assertOneTarget(attempt: Attempt): void {
  const targets = [attempt.scenarioId, attempt.exerciseId, attempt.challengeId].filter(
    (value) => value !== undefined && value !== "",
  );
  if (targets.length !== 1) {
    throw new Error(
      "Exactly one target FK must be set: scenarioId OR exerciseId OR challengeId",
    );
  }
}
