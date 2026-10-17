import {
  getChallenge,
  getEmotion,
  getEntryNode,
  getExercise,
  getNode,
  getScenario,
} from "../domain/content";
import {
  abandonAttempt as abandonRecord,
  applyChoice as applyRecord,
  cleanAlias,
  completePractice,
  decodeSlip,
  encodeSlip,
  generateJoinCode,
  generateReport,
  generateSecret,
  getChoices,
  nowIso,
  openAttempt,
  parseJoinCode,
  shadowClassroom,
  uid,
  validateAlias,
  visibleScenarios,
  type Slip,
} from "../domain/engine";
import { buildSample } from "../domain/sample";
import {
  AttemptStatus,
  AVATARS,
  Role,
  SkillType,
  assertOneTarget,
  classroomIdFor,
  emptyDb,
  emptyLoop,
  type Attempt,
  type AvatarId,
  type Classroom,
  type Credential,
  type EmotionCheckin,
  type GradeBand,
  type Persisted,
  type Session,
  type SkillType as Skill,
  type Student,
  type Teacher,
} from "../domain/types";

export type { Slip };

export type StorageAdapter = {
  load: () => Persisted;
  save: (db: Persisted) => void;
};

export type Result<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

export type Snapshot = {
  sample: boolean;
  session: Session | null;
  classrooms: Classroom[];
  teachers: Teacher[];
  students: Student[];
  attempts: Attempt[];
  checkins: EmotionCheckin[];
  flash: string | null;
};

export type ClassFile = {
  kind: "harmony-garden-class";
  version: 1;
  classroom: Classroom;
  teachers: Teacher[];
  students: Student[];
  attempts: Attempt[];
  checkins: EmotionCheckin[];
  credentials: Credential[];
};

export function memoryAdapter(initial?: Persisted): StorageAdapter {
  let state = initial ?? emptyDb();
  return {
    load: () => structuredClone(state),
    save: (db) => {
      state = structuredClone(db);
    },
  };
}

export function browserAdapter(key: string): StorageAdapter {
  return {
    load: () => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return emptyDb();
        return normalize(sanitizePersisted(JSON.parse(raw)));
      } catch {
        const raw = localStorage.getItem(key);
        if (raw) localStorage.setItem(`${key}-corrupt`, raw);
        localStorage.removeItem(key);
        return emptyDb();
      }
    },
    save: (db) => localStorage.setItem(key, JSON.stringify(db)),
  };
}

export function sanitizePersisted(value: unknown): Persisted {
  if (!value || typeof value !== "object") return emptyDb();
  const record = value as Partial<Persisted>;
  if (record.version !== 1) return emptyDb();
  return {
    version: 1,
    classrooms: Array.isArray(record.classrooms) ? record.classrooms : [],
    teachers: Array.isArray(record.teachers) ? record.teachers : [],
    students: Array.isArray(record.students) ? record.students : [],
    attempts: Array.isArray(record.attempts) ? record.attempts : [],
    checkins: Array.isArray(record.checkins) ? record.checkins : [],
    credentials: Array.isArray(record.credentials) ? record.credentials : [],
    session: record.session ?? null,
  };
}

export function normalize(db: Persisted): Persisted {
  const next = structuredClone(db);
  const session = next.session;
  if (session?.role === Role.STUDENT) {
    if (!next.students.some((student) => student.alias === session.alias)) next.session = null;
  } else if (session && (session.role === Role.TEACHER || session.role === Role.COUNSELOR)) {
    if (!next.teachers.some((teacher) => teacher.teacherId === session.teacherId)) next.session = null;
  }
  return next;
}

function isAvatar(value: string): value is AvatarId {
  return (AVATARS as readonly string[]).includes(value);
}

export class GardenStore {
  private db: Persisted;
  private mode: "main" | "sample" = "main";
  private flash: string | null = null;
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();

  constructor(private main: StorageAdapter) {
    this.db = this.main.load();
    this.snapshot = this.makeSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): Snapshot => this.snapshot;

  getRole(): Session["role"] | null {
    return this.db.session?.role ?? null;
  }

  clearFlash(): void {
    if (!this.flash) return;
    this.flash = null;
    this.emit();
  }

  signInWithCode(raw: string): Result {
    const code = raw.trim().toUpperCase();
    if (!code) return { ok: false, error: "Enter a desk key." };
    const credential = this.db.credentials.find((item) => item.code.toUpperCase() === code);
    if (credential) {
      const teacher = this.db.teachers.find((item) => item.teacherId === credential.teacherId);
      const classroom = this.db.classrooms.find((item) => item.classroomId === credential.classroomId);
      if (!teacher || !classroom) {
        return { ok: false, error: "That key's desk is missing on this device." };
      }
      this.update((db) => {
        db.session = {
          role: credential.role,
          teacherId: teacher.teacherId,
          alias: teacher.alias,
          classroomId: classroom.classroomId,
        };
      }, credential.role === Role.COUNSELOR ? "Opened a view-only desk." : "Opened your garden desk.");
      return { ok: true };
    }
    if (code.startsWith("KEEP-") || code.startsWith("VIEW-")) {
      return {
        ok: false,
        error:
          "That key is not on this device. Keys stay in the browser where the class was planted. You can restore a class file instead.",
      };
    }
    if (parseJoinCode(code)) {
      return {
        ok: false,
        error: "That is a student join code. Students use it from Enter the garden.",
      };
    }
    return { ok: false, error: "Those words do not open a desk." };
  }

  createClassroom(input: { alias: string; gradeBand: GradeBand }): Result<{
    joinCode: string;
    keeperCode: string;
    viewCode: string;
  }> {
    const aliasError = validateAlias(input.alias);
    if (aliasError) return { ok: false, error: aliasError };
    const alias = cleanAlias(input.alias);
    const taken = this.nameTaken(alias);
    if (taken) return { ok: false, error: taken };
    let joinCode = generateJoinCode(input.gradeBand);
    for (let attempt = 0; attempt < 6 && this.db.classrooms.some((item) => item.code === joinCode); attempt += 1) {
      joinCode = generateJoinCode(input.gradeBand);
    }
    const keeperCode = generateSecret("KEEP", joinCode);
    const viewCode = generateSecret("VIEW", joinCode);
    const classroomId = classroomIdFor(joinCode);
    const teacherId = uid("teacher");
    const counselorId = `counselor_${classroomId}`;
    this.update((db) => {
      db.classrooms.push({
        classroomId,
        code: joinCode,
        gradeBand: input.gradeBand,
        keeperCode,
        viewCode,
      });
      db.teachers.push(
        { teacherId, alias, role: Role.TEACHER, classroomId },
        { teacherId: counselorId, alias: this.freeAlias(viewAliasFor(alias)), role: Role.COUNSELOR, classroomId },
      );
      db.credentials.push(
        { code: keeperCode, role: Role.TEACHER, classroomId, teacherId },
        { code: viewCode, role: Role.COUNSELOR, classroomId, teacherId: counselorId },
      );
      db.session = { role: Role.TEACHER, teacherId, alias, classroomId };
    }, "Your class garden is planted.");
    return { ok: true, data: { joinCode, keeperCode, viewCode } };
  }

  joinStudent(input: {
    alias: string;
    avatarRef: string;
    joinCode?: string;
    gradeBand?: GradeBand;
  }): Result {
    const aliasError = validateAlias(input.alias);
    if (aliasError) return { ok: false, error: aliasError };
    const alias = cleanAlias(input.alias);
    if (!isAvatar(input.avatarRef)) return { ok: false, error: "Pick a garden creature." };
    const taken = this.nameTaken(alias);
    if (taken) return { ok: false, error: taken };
    let classroom: Classroom;
    const typedCode = input.joinCode?.trim() ?? "";
    if (typedCode) {
      const parsed = parseJoinCode(typedCode);
      if (!parsed) return { ok: false, error: "Join codes look like FERN-2-17." };
      classroom =
        this.db.classrooms.find((item) => item.code === parsed.code) ??
        shadowClassroom(parsed.code, parsed.gradeBand);
    } else {
      if (!input.gradeBand) return { ok: false, error: "Choose a grade garden, or enter a class code." };
      classroom = {
        classroomId: uid("solo"),
        code: `solo:${alias.toLowerCase().replace(/\s+/g, "-")}`,
        gradeBand: input.gradeBand,
        keeperCode: "",
        viewCode: "",
      };
    }
    const student: Student = {
      alias,
      classroomId: classroom.classroomId,
      avatarRef: input.avatarRef,
      metCreatureIds: [],
      calmReady: false,
      loop: emptyLoop(),
      updatedAt: nowIso(),
    };
    this.update((db) => {
      if (!db.classrooms.some((item) => item.classroomId === classroom.classroomId)) {
        db.classrooms.push(structuredClone(classroom));
      }
      db.students.push(student);
      db.session = { role: Role.STUDENT, alias, classroomId: classroom.classroomId };
    }, `Welcome, ${alias}.`);
    return { ok: true };
  }

  signOut(): void {
    if (this.mode === "sample") {
      this.mode = "main";
      this.db = this.main.load();
      this.flash = this.db.session ? "Back to your own desk." : "Left the sample desk.";
      this.emit();
      return;
    }
    this.update((db) => {
      db.session = null;
    }, "Signed out. This garden stays on this device.");
  }

  openSample(): void {
    this.mode = "sample";
    this.db = buildSample();
    this.flash = null;
    this.emit();
  }

  closeSample(): void {
    if (this.mode !== "sample") return;
    this.mode = "main";
    this.db = this.main.load();
    this.flash = "Back to the garden on this device.";
    this.emit();
  }

  startScenario(scenarioId: string): Result<{ attemptId: string }> {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Enter the garden as a student first." };
    const classroom = this.classroomOf(student.classroomId);
    if (!classroom) return { ok: false, error: "Your garden patch is missing." };
    if (!getScenario(scenarioId)) return { ok: false, error: "That story is not in the grove." };
    if (!visibleScenarios(classroom.gradeBand).some((item) => item.scenarioId === scenarioId)) {
      return { ok: false, error: "That story is for a different grade garden." };
    }
    const open = this.db.attempts.find(
      (item) =>
        item.studentAlias === student.alias &&
        item.scenarioId === scenarioId &&
        item.status === AttemptStatus.STARTED,
    );
    if (open) {
      if (student.loop.scenarioId !== scenarioId) {
        this.update((db) => {
          const mine = db.students.find((item) => item.alias === student.alias);
          if (!mine) return;
          mine.loop = {
            scenarioId,
            visitedForest: false,
            visitedMountain: false,
            finishedScenario: false,
            finishedTrial: false,
          };
          mine.updatedAt = nowIso();
        });
      }
      return { ok: true, data: { attemptId: open.attemptId } };
    }
    const entry = getEntryNode(scenarioId);
    if (!entry) return { ok: false, error: "That story has no beginning." };
    const attempt = openAttempt({
      studentAlias: student.alias,
      scenarioId,
      nodeId: entry.nodeId,
    });
    this.update((db) => {
      db.attempts.push(attempt);
      const mine = db.students.find((item) => item.alias === student.alias);
      if (!mine) return;
      mine.loop = {
        scenarioId,
        visitedForest: false,
        visitedMountain: false,
        finishedScenario: false,
        finishedTrial: false,
      };
      mine.updatedAt = nowIso();
    });
    return { ok: true, data: { attemptId: attempt.attemptId } };
  }

  applyChoice(attemptId: string, choiceId: string): Result {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Enter the garden as a student first." };
    const attempt = this.ownAttempt(student.alias, attemptId);
    if (!attempt?.scenarioId || !attempt.nodeId) return { ok: false, error: "That story is not open." };
    const classroom = this.classroomOf(student.classroomId);
    if (!classroom) return { ok: false, error: "Your garden patch is missing." };
    const node = getNode(attempt.scenarioId, attempt.nodeId);
    if (!node) return { ok: false, error: "That part of the story is missing." };
    const offered = getChoices(node, {
      gradeBand: classroom.gradeBand,
      calmReady: student.calmReady || student.loop.visitedMountain,
    });
    const gate = offered.find((item) => item.choiceId === choiceId);
    if (!gate) return { ok: false, error: "That sentence is not for this grade garden." };
    if (gate.lockedReason) return { ok: false, error: gate.lockedReason };
    let next: Attempt;
    try {
      next = applyRecord(attempt, choiceId);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "The path tangled." };
    }
    this.update((db) => {
      const index = db.attempts.findIndex((item) => item.attemptId === attemptId);
      if (index >= 0) db.attempts[index] = next;
      const mine = db.students.find((item) => item.alias === student.alias);
      if (mine && next.status === AttemptStatus.COMPLETED && next.scenarioId === mine.loop.scenarioId) {
        mine.loop = { ...mine.loop, finishedScenario: true };
        mine.updatedAt = nowIso();
      }
    });
    return { ok: true };
  }

  abandonAttempt(attemptId: string): Result {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Enter the garden as a student first." };
    const attempt = this.ownAttempt(student.alias, attemptId);
    if (!attempt) return { ok: false, error: "That path is not yours." };
    let next: Attempt;
    try {
      next = abandonRecord(attempt);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "That path is already closed." };
    }
    this.update((db) => {
      const index = db.attempts.findIndex((item) => item.attemptId === attemptId);
      if (index >= 0) db.attempts[index] = next;
      const mine = db.students.find((item) => item.alias === student.alias);
      if (mine && attempt.scenarioId && attempt.scenarioId === mine.loop.scenarioId) {
        mine.loop = emptyLoop();
        mine.updatedAt = nowIso();
      }
    }, "You set the story down. It will be here if you want it again.");
    return { ok: true };
  }

  checkIn(emotionId: string, intensity: number): Result {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Enter the garden as a student first." };
    if (!getEmotion(emotionId)) return { ok: false, error: "That feeling is not in the forest." };
    if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) {
      return { ok: false, error: "Choose how big the feeling is." };
    }
    const checkin: EmotionCheckin = {
      checkInId: uid("check"),
      studentAlias: student.alias,
      emotionId,
      intensity,
      createdAt: nowIso(),
    };
    this.update((db) => {
      db.checkins.push(checkin);
      const mine = db.students.find((item) => item.alias === student.alias);
      if (!mine) return;
      if (!mine.metCreatureIds.includes(emotionId)) mine.metCreatureIds.push(emotionId);
      if (mine.loop.scenarioId) mine.loop = { ...mine.loop, visitedForest: true };
      mine.updatedAt = nowIso();
    }, "The feeling is noted. It can change, and that is okay.");
    return { ok: true };
  }

  meetCreature(emotionId: string): Result {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Enter the garden as a student first." };
    const emotion = getEmotion(emotionId);
    if (!emotion) return { ok: false, error: "That creature is deeper in the woods." };
    this.update((db) => {
      const mine = db.students.find((item) => item.alias === student.alias);
      if (!mine) return;
      if (!mine.metCreatureIds.includes(emotionId)) mine.metCreatureIds.push(emotionId);
      if (mine.loop.scenarioId) mine.loop = { ...mine.loop, visitedForest: true };
      mine.updatedAt = nowIso();
    }, `${emotion.creature} rustles a hello.`);
    return { ok: true };
  }

  completeExercise(exerciseId: string, harmony: number): Result {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Enter the garden as a student first." };
    if (!getExercise(exerciseId)) return { ok: false, error: "That rest is not on the mountain." };
    const existing = this.db.attempts.find(
      (item) =>
        item.studentAlias === student.alias &&
        item.exerciseId === exerciseId &&
        item.status === AttemptStatus.STARTED,
    );
    const base =
      existing ??
      openAttempt({
        studentAlias: student.alias,
        exerciseId,
      });
    const done = completePractice(
      base,
      harmony >= 2 ? "bloom" : "repair",
      harmony,
      [SkillType.MINDFULNESS],
    );
    this.update((db) => {
      const index = db.attempts.findIndex((item) => item.attemptId === done.attemptId);
      if (index >= 0) db.attempts[index] = done;
      else db.attempts.push(done);
      const mine = db.students.find((item) => item.alias === student.alias);
      if (!mine) return;
      mine.calmReady = true;
      if (mine.loop.scenarioId) mine.loop = { ...mine.loop, visitedMountain: true };
      mine.updatedAt = nowIso();
    }, "Your body practiced calm.");
    return { ok: true };
  }

  completeChallenge(challengeId: string, harmony: number, extraSkills: Skill[] = []): Result {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Enter the garden as a student first." };
    if (!getChallenge(challengeId)) return { ok: false, error: "That trial is not in the garden." };
    const existing = this.db.attempts.find(
      (item) =>
        item.studentAlias === student.alias &&
        item.challengeId === challengeId &&
        item.status === AttemptStatus.STARTED,
    );
    const base = existing ?? openAttempt({ studentAlias: student.alias, challengeId });
    const done = completePractice(base, harmony >= 2 ? "bloom" : "repair", harmony, [
      SkillType.TEAMWORK,
      ...extraSkills,
    ]);
    this.update((db) => {
      const index = db.attempts.findIndex((item) => item.attemptId === done.attemptId);
      if (index >= 0) db.attempts[index] = done;
      else db.attempts.push(done);
      const mine = db.students.find((item) => item.alias === student.alias);
      if (!mine) return;
      if (mine.loop.finishedScenario) mine.loop = { ...mine.loop, finishedTrial: true };
      mine.updatedAt = nowIso();
    }, "The team trial settled the garden.");
    return { ok: true };
  }

  removeStudent(alias: string): Result {
    if (this.db.session?.role !== Role.TEACHER) {
      return { ok: false, error: "Counselors can look, not change the roster." };
    }
    const classroomId = this.db.session.classroomId;
    const student = this.db.students.find(
      (item) => item.alias === alias && item.classroomId === classroomId,
    );
    if (!student) return { ok: false, error: "That garden name is not on this roster." };
    this.update((db) => {
      db.students = db.students.filter((item) => item.alias !== alias);
      db.attempts = db.attempts.filter((item) => item.studentAlias !== alias);
      db.checkins = db.checkins.filter((item) => item.studentAlias !== alias);
    }, `${alias} left the roster on this device.`);
    return { ok: true };
  }

  exportSlip(): Result<string> {
    const student = this.requireStudent();
    if (!student) return { ok: false, error: "Only a student garden can make a blossom slip." };
    const classroom = this.classroomOf(student.classroomId);
    if (!classroom) return { ok: false, error: "Your garden patch is missing." };
    const slip: Slip = {
      kind: "harmony-garden-slip",
      version: 1,
      classroomCode: classroom.code.startsWith("solo:") ? null : classroom.code,
      gradeBand: classroom.gradeBand,
      student,
      attempts: this.db.attempts.filter((item) => item.studentAlias === student.alias),
      checkins: this.db.checkins.filter((item) => item.studentAlias === student.alias),
    };
    return { ok: true, data: encodeSlip(slip) };
  }

  importSlip(text: string): Result {
    if (this.db.session?.role !== Role.TEACHER) {
      return { ok: false, error: "Only the garden keeper can plant a slip into the desk." };
    }
    const classroom = this.classroomOf(this.db.session.classroomId);
    if (!classroom) return { ok: false, error: "Open your desk first." };
    let slip: Slip;
    try {
      slip = decodeSlip(text);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "That slip did not grow." };
    }
    if (!slip.classroomCode) {
      return { ok: false, error: "This slip is a solo garden, not a class garden." };
    }
    if (slip.classroomCode !== classroom.code) {
      return { ok: false, error: `This slip belongs to ${slip.classroomCode}, not ${classroom.code}.` };
    }
    const aliasError = validateAlias(slip.student.alias);
    if (aliasError) return { ok: false, error: aliasError };
    const alias = cleanAlias(slip.student.alias);
    const existing = this.db.students.find((item) => item.alias.toLowerCase() === alias.toLowerCase());
    if (existing && existing.classroomId !== classroom.classroomId) {
      return { ok: false, error: "That garden name is already used in another patch on this device." };
    }
    if (slip.attempts.length > 200 || slip.checkins.length > 200) {
      return { ok: false, error: "That slip is too big to plant." };
    }
    this.update((db) => {
      if (!existing) {
        db.students.push({
          ...structuredClone(slip.student),
          alias,
          classroomId: classroom.classroomId,
          updatedAt: nowIso(),
        });
      } else {
        const mine = db.students.find((item) => item.alias === existing.alias);
        if (mine) {
          mine.metCreatureIds = [...new Set([...mine.metCreatureIds, ...slip.student.metCreatureIds])];
          mine.calmReady = mine.calmReady || slip.student.calmReady;
          mine.updatedAt = nowIso();
        }
      }
      for (const attempt of slip.attempts) {
        if (!db.attempts.some((item) => item.attemptId === attempt.attemptId)) {
          db.attempts.push({ ...structuredClone(attempt), studentAlias: existing?.alias ?? alias });
        }
      }
      for (const checkin of slip.checkins) {
        if (!db.checkins.some((item) => item.checkInId === checkin.checkInId)) {
          db.checkins.push({ ...structuredClone(checkin), studentAlias: existing?.alias ?? alias });
        }
      }
    }, `${alias}'s garden joined the desk.`);
    return { ok: true };
  }

  exportClassFile(): Result<string> {
    if (this.db.session?.role !== Role.TEACHER) {
      return { ok: false, error: "Only the garden keeper can download the class file." };
    }
    const classroom = this.classroomOf(this.db.session.classroomId);
    if (!classroom) return { ok: false, error: "This desk is missing." };
    const students = this.db.students.filter((item) => item.classroomId === classroom.classroomId);
    const aliases = new Set(students.map((item) => item.alias));
    const file: ClassFile = {
      kind: "harmony-garden-class",
      version: 1,
      classroom,
      teachers: this.db.teachers.filter((item) => item.classroomId === classroom.classroomId),
      students,
      attempts: this.db.attempts.filter((item) => aliases.has(item.studentAlias)),
      checkins: this.db.checkins.filter((item) => aliases.has(item.studentAlias)),
      credentials: this.db.credentials.filter((item) => item.classroomId === classroom.classroomId),
    };
    return { ok: true, data: JSON.stringify(file, null, 2) };
  }

  importClassFile(text: string): Result {
    if (this.db.session?.role === Role.COUNSELOR || this.db.session?.role === Role.STUDENT) {
      return { ok: false, error: "This desk cannot replace the class file." };
    }
    let file: ClassFile;
    try {
      file = JSON.parse(text) as ClassFile;
    } catch {
      return { ok: false, error: "That file did not open." };
    }
    if (file.kind !== "harmony-garden-class" || file.version !== 1 || !file.classroom?.code) {
      return { ok: false, error: "That file is not a Harmony Garden class." };
    }
    try {
      for (const attempt of file.attempts ?? []) {
        if (!attempt.attemptId || !attempt.studentAlias) throw new Error("missing attempt");
        assertOneTarget(attempt);
      }
      for (const student of file.students ?? []) {
        if (validateAlias(student.alias)) throw new Error("alias");
      }
    } catch {
      return { ok: false, error: "That class file is missing pieces." };
    }
    const teacher = (file.teachers ?? []).find((item) => item.role === Role.TEACHER);
    if (!teacher) return { ok: false, error: "That file has no garden keeper." };
    this.update((db) => {
      upsert(db.classrooms, file.classroom, (item) => item.classroomId === file.classroom.classroomId);
      for (const item of file.teachers ?? []) {
        upsert(db.teachers, item, (row) => row.teacherId === item.teacherId);
      }
      for (const item of file.students ?? []) {
        upsert(db.students, item, (row) => row.alias.toLowerCase() === item.alias.toLowerCase());
      }
      for (const item of file.attempts ?? []) {
        upsert(db.attempts, item, (row) => row.attemptId === item.attemptId);
      }
      for (const item of file.checkins ?? []) {
        upsert(db.checkins, item, (row) => row.checkInId === item.checkInId);
      }
      for (const item of file.credentials ?? []) {
        upsert(db.credentials, item, (row) => row.code === item.code);
      }
      db.session = {
        role: Role.TEACHER,
        teacherId: teacher.teacherId,
        alias: teacher.alias,
        classroomId: file.classroom.classroomId,
      };
    }, `Opened the desk for ${file.classroom.code}.`);
    return { ok: true };
  }

  private requireStudent(): Student | null {
    const session = this.db.session;
    if (session?.role !== Role.STUDENT) return null;
    return this.db.students.find((item) => item.alias === session.alias) ?? null;
  }

  private ownAttempt(alias: string, attemptId: string): Attempt | undefined {
    return this.db.attempts.find((item) => item.attemptId === attemptId && item.studentAlias === alias);
  }

  private classroomOf(classroomId: string): Classroom | undefined {
    return this.db.classrooms.find((item) => item.classroomId === classroomId);
  }

  private freeAlias(preferred: string): string {
    let candidate = preferred;
    let extra = 2;
    while (this.nameTaken(candidate) && extra < 8) {
      const suffix = String(extra);
      candidate = `${preferred.slice(0, 18 - suffix.length)}${suffix}`;
      extra += 1;
    }
    return candidate;
  }

  private nameTaken(alias: string): string | null {
    if (this.db.students.some((item) => item.alias.toLowerCase() === alias.toLowerCase())) {
      return "That garden name is already growing on this device. Pick another.";
    }
    if (this.db.teachers.some((item) => item.alias.toLowerCase() === alias.toLowerCase())) {
      return "That name belongs to a keeper on this device. Pick another garden name.";
    }
    return null;
  }

  private update(mutate: (db: Persisted) => void, flash?: string): void {
    const next = structuredClone(this.db);
    mutate(next);
    this.db = next;
    if (flash) this.flash = flash;
    this.emit();
  }

  private emit(): void {
    if (this.mode === "main") this.main.save(this.db);
    this.snapshot = this.makeSnapshot();
    for (const listener of this.listeners) listener();
  }

  private makeSnapshot(): Snapshot {
    const session = this.db.session;
    const base = {
      sample: this.mode === "sample",
      session,
      flash: this.flash,
    };
    if (!session) {
      return { ...base, classrooms: [], teachers: [], students: [], attempts: [], checkins: [] };
    }
    if (session.role === Role.STUDENT) {
      return {
        ...base,
        classrooms: this.db.classrooms
          .filter((item) => item.classroomId === session.classroomId)
          .map((item) => ({ ...item, keeperCode: "", viewCode: "" })),
        teachers: [],
        students: this.db.students.filter((item) => item.alias === session.alias),
        attempts: this.db.attempts.filter((item) => item.studentAlias === session.alias),
        checkins: this.db.checkins.filter((item) => item.studentAlias === session.alias),
      };
    }
    const students = this.db.students.filter((item) => item.classroomId === session.classroomId);
    const aliases = new Set(students.map((item) => item.alias));
    const hideKeeper = session.role !== Role.TEACHER;
    return {
      ...base,
      classrooms: this.db.classrooms
        .filter((item) => item.classroomId === session.classroomId)
        .map((item) => (hideKeeper ? { ...item, keeperCode: "" } : item)),
      teachers: this.db.teachers.filter((item) => item.classroomId === session.classroomId),
      students,
      attempts: this.db.attempts.filter((item) => aliases.has(item.studentAlias)),
      checkins: this.db.checkins.filter((item) => aliases.has(item.studentAlias)),
    };
  }
}

function viewAliasFor(alias: string): string {
  const named = alias.length <= 13 ? `${alias} view` : `View ${alias.slice(0, 12).trim()}`;
  return cleanAlias(named).slice(0, 18);
}

function upsert<T>(rows: T[], item: T, same: (row: T) => boolean): void {
  const index = rows.findIndex(same);
  if (index >= 0) rows[index] = structuredClone(item);
  else rows.push(structuredClone(item));
}

export function reportFor(snapshot: Snapshot) {
  const session = snapshot.session;
  if (!session) return null;
  const classroom = snapshot.classrooms.find((item) => item.classroomId === session.classroomId);
  if (!classroom) return null;
  const students =
    session.role === Role.STUDENT
      ? snapshot.students.filter((item) => item.alias === session.alias)
      : snapshot.students;
  const aliases = new Set(students.map((item) => item.alias));
  return generateReport({
    classroom,
    students,
    attempts: snapshot.attempts.filter((item) => aliases.has(item.studentAlias)),
    checkins: snapshot.checkins.filter((item) => aliases.has(item.studentAlias)),
  });
}

let singleton: GardenStore | null = null;

export function getBrowserStore(): GardenStore {
  if (!singleton) {
    singleton = new GardenStore(canUseLocalStorage() ? browserAdapter("harmony-garden-db-v1") : memoryAdapter());
  }
  return singleton;
}

function canUseLocalStorage(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const key = "__hg_probe__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
