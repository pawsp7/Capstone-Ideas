import { AttemptStatus, Role, SkillType, classroomIdFor, emptyLoop, type Attempt, type EmotionCheckin, type Persisted, type Student } from "./types";

const classroomId = classroomIdFor("FERN-2-17");
const teacherId = "teacher_sample";
const counselorId = `counselor_${classroomId}`;

function student(alias: string, avatarRef: string, updatedAt: string, extra?: Partial<Student>): Student {
  return {
    alias,
    classroomId,
    avatarRef,
    metCreatureIds: [],
    calmReady: false,
    loop: emptyLoop(),
    updatedAt,
    ...extra,
  };
}

function attempt(partial: Omit<Attempt, "harmony" | "skills" | "choiceIds"> & Partial<Pick<Attempt, "harmony" | "skills" | "choiceIds">>): Attempt {
  return {
    harmony: 0,
    skills: [],
    choiceIds: [],
    ...partial,
  };
}

const students: Student[] = [
  student("Pip", "pinekit", "2026-10-17T14:10:00.000Z", {
    metCreatureIds: ["anxiety", "frustration"],
    calmReady: true,
    loop: {
      scenarioId: "whatever-note",
      visitedForest: true,
      visitedMountain: false,
      finishedScenario: false,
      finishedTrial: false,
    },
  }),
  student("Moss", "bramble", "2026-10-16T18:20:00.000Z", {
    metCreatureIds: ["loneliness"],
    calmReady: true,
    loop: { ...emptyLoop(), finishedScenario: true, finishedTrial: true, scenarioId: "shared-shovel" },
  }),
  student("Lumen", "mothwing", "2026-10-17T15:00:00.000Z", {
    metCreatureIds: ["enthusiasm"],
    calmReady: false,
    loop: { ...emptyLoop(), finishedScenario: true, scenarioId: "three-plans" },
  }),
  student("Brook", "emberbud", "2026-10-15T19:40:00.000Z", {
    metCreatureIds: ["sadness"],
    calmReady: true,
    loop: emptyLoop(),
  }),
];

const attempts: Attempt[] = [
  attempt({
    attemptId: "attempt_pip_water",
    studentAlias: "Pip",
    scenarioId: "watering-can",
    status: AttemptStatus.COMPLETED,
    startedAt: "2026-10-14T15:00:00.000Z",
    completedAt: "2026-10-14T15:12:00.000Z",
    nodeId: "wc-bloom",
    harmony: 4,
    skills: [SkillType.CONFLICT_RESOLUTION, SkillType.TEAMWORK],
    outcome: "bloom",
  }),
  attempt({
    attemptId: "attempt_pip_note",
    studentAlias: "Pip",
    scenarioId: "whatever-note",
    status: AttemptStatus.STARTED,
    startedAt: "2026-10-17T14:00:00.000Z",
    nodeId: "nt-start",
  }),
  attempt({
    attemptId: "attempt_moss_shovel",
    studentAlias: "Moss",
    scenarioId: "shared-shovel",
    status: AttemptStatus.COMPLETED,
    startedAt: "2026-10-15T16:00:00.000Z",
    completedAt: "2026-10-15T16:08:00.000Z",
    nodeId: "sh-bloom",
    harmony: 4,
    skills: [SkillType.BOUNDARIES, SkillType.TEAMWORK],
    outcome: "bloom",
  }),
  attempt({
    attemptId: "attempt_moss_photo",
    studentAlias: "Moss",
    scenarioId: "photo-leaf",
    status: AttemptStatus.COMPLETED,
    startedAt: "2026-10-16T17:00:00.000Z",
    completedAt: "2026-10-16T17:10:00.000Z",
    nodeId: "ph-bloom",
    harmony: 4,
    skills: [SkillType.BOUNDARIES],
    outcome: "bloom",
  }),
  attempt({
    attemptId: "attempt_lumen_plans",
    studentAlias: "Lumen",
    scenarioId: "three-plans",
    status: AttemptStatus.COMPLETED,
    startedAt: "2026-10-16T15:00:00.000Z",
    completedAt: "2026-10-16T15:20:00.000Z",
    nodeId: "pl-bloom",
    harmony: 5,
    skills: [SkillType.TEAMWORK, SkillType.TEAMWORK],
    outcome: "bloom",
  }),
  attempt({
    attemptId: "attempt_lumen_lantern",
    studentAlias: "Lumen",
    challengeId: "lantern-message",
    status: AttemptStatus.COMPLETED,
    startedAt: "2026-10-17T15:00:00.000Z",
    completedAt: "2026-10-17T15:06:00.000Z",
    harmony: 2,
    skills: [SkillType.TEAMWORK],
    outcome: "bloom",
  }),
  attempt({
    attemptId: "attempt_brook_breath",
    studentAlias: "Brook",
    exerciseId: "petal-breath",
    status: AttemptStatus.COMPLETED,
    startedAt: "2026-10-15T19:00:00.000Z",
    completedAt: "2026-10-15T19:04:00.000Z",
    harmony: 2,
    skills: [SkillType.MINDFULNESS],
    outcome: "bloom",
  }),
  attempt({
    attemptId: "attempt_brook_bench",
    studentAlias: "Brook",
    scenarioId: "empty-bench",
    status: AttemptStatus.ABANDONED,
    startedAt: "2026-10-15T19:20:00.000Z",
    completedAt: "2026-10-15T19:22:00.000Z",
    nodeId: "bn-story",
    harmony: 0,
    skills: [],
  }),
  attempt({
    attemptId: "attempt_pip_pause",
    studentAlias: "Pip",
    exerciseId: "pause-pebble",
    status: AttemptStatus.COMPLETED,
    startedAt: "2026-10-17T13:40:00.000Z",
    completedAt: "2026-10-17T13:48:00.000Z",
    harmony: 2,
    skills: [SkillType.MINDFULNESS],
    outcome: "bloom",
  }),
];

const checkins: EmotionCheckin[] = [
  {
    checkInId: "check_pip_worry",
    studentAlias: "Pip",
    emotionId: "anxiety",
    intensity: 3,
    createdAt: "2026-10-17T13:30:00.000Z",
  },
  {
    checkInId: "check_pip_hot",
    studentAlias: "Pip",
    emotionId: "frustration",
    intensity: 4,
    createdAt: "2026-10-14T14:50:00.000Z",
  },
  {
    checkInId: "check_moss_alone",
    studentAlias: "Moss",
    emotionId: "loneliness",
    intensity: 2,
    createdAt: "2026-10-16T18:00:00.000Z",
  },
  {
    checkInId: "check_lumen_spark",
    studentAlias: "Lumen",
    emotionId: "enthusiasm",
    intensity: 4,
    createdAt: "2026-10-17T14:40:00.000Z",
  },
  {
    checkInId: "check_brook_sad",
    studentAlias: "Brook",
    emotionId: "sadness",
    intensity: 3,
    createdAt: "2026-10-15T18:50:00.000Z",
  },
];

export function buildSample(): Persisted {
  return {
    version: 1,
    classrooms: [
      {
        classroomId,
        code: "FERN-2-17",
        gradeBand: "3-4",
        keeperCode: "KEEP-FERN-2-17-DEMO",
        viewCode: "VIEW-FERN-2-17-DEMO",
      },
    ],
    teachers: [
      { teacherId, alias: "Keeper Otter", role: Role.TEACHER, classroomId },
      { teacherId: counselorId, alias: "Counselor Wren", role: Role.COUNSELOR, classroomId },
    ],
    students,
    attempts,
    checkins,
    credentials: [
      { code: "KEEP-FERN-2-17-DEMO", role: Role.TEACHER, classroomId, teacherId },
      { code: "VIEW-FERN-2-17-DEMO", role: Role.COUNSELOR, classroomId, teacherId: counselorId },
    ],
    session: { role: Role.TEACHER, teacherId, alias: "Keeper Otter", classroomId },
  };
}
