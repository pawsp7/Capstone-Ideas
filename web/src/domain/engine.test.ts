import { describe, expect, it } from "vitest";
import { EMOTIONS, NODES, SCENARIOS, describeEmotion, getEntryNode, getNode, getNodes } from "./content";
import {
  applyChoice,
  bloomName,
  decodeSlip,
  encodeSlip,
  generateJoinCode,
  getChoices,
  hintFor,
  openAttempt,
  parseJoinCode,
  validateAlias,
  visibleScenarios,
} from "./engine";
import {
  basketIsCorrect,
  iconsFromLanternCode,
  lanternCode,
  lanternPattern,
  patternFromTrustCode,
  trustCode,
  trustPattern,
} from "./puzzles";
import { buildSample } from "./sample";
import { GardenStore, memoryAdapter, reportFor } from "../state/store";
import {
  AttemptStatus,
  Role,
  SkillType,
  assertOneTarget,
  bandCeiling,
  emptyLoop,
  type Student,
} from "./types";

function store() {
  return new GardenStore(memoryAdapter());
}

describe("class desks", () => {
  it("keeps a long keeper name from making an invalid counselor name", () => {
    const desk = store();
    const planted = desk.createClassroom({ alias: "Gardenkeepernameee", gradeBand: "5-6" });
    expect(planted.ok).toBe(true);
    const counselor = desk.getSnapshot().teachers.find((teacher) => teacher.role === Role.COUNSELOR);
    expect(counselor?.alias.length).toBeLessThanOrEqual(18);
    expect(validateAlias(counselor?.alias ?? "")).toBeNull();
  });
});

describe("garden content", () => {
  it("keeps every branch inside its story", () => {
    const ids = new Set<string>();
    for (const scenario of SCENARIOS) {
      const nodes = getNodes(scenario.scenarioId);
      expect(getEntryNode(scenario.scenarioId)?.nodeId).toBe(scenario.entryNodeId);
      for (const node of nodes) {
        expect(ids.has(node.nodeId)).toBe(false);
        ids.add(node.nodeId);
        if (node.isTerminal) {
          expect(node.choices).toHaveLength(0);
          expect(node.outcome).toBeTruthy();
        }
        for (const choice of node.choices) {
          expect(getNode(scenario.scenarioId, choice.nextNodeId)).toBeTruthy();
          expect(ids.has(choice.choiceId)).toBe(false);
          ids.add(choice.choiceId);
        }
      }
    }
    expect(NODES.length).toBeGreaterThan(40);
  });

  it("hides older stories from the youngest garden", () => {
    const titles = visibleScenarios("1-2").map((scenario) => scenario.scenarioId);
    expect(titles).toContain("watering-can");
    expect(titles).toContain("last-seed");
    expect(titles).toContain("loud-game");
    expect(titles).toContain("hard-bump");
    expect(titles).toContain("tears-path");
    expect(titles).not.toContain("photo-leaf");
    expect(titles).not.toContain("whatever-note");
    expect(titles).not.toContain("chosen-name");
    expect(titles).not.toContain("gate-watch");
    expect(titles).not.toContain("forwarded-note");
    expect(titles).not.toContain("the-dare");
    expect(titles).not.toContain("too-soft");
    expect(titles).not.toContain("after-yell");
    const older = visibleScenarios("5-6").map((scenario) => scenario.scenarioId);
    expect(older).toEqual(
      expect.arrayContaining([
        "photo-leaf",
        "chosen-name",
        "gate-watch",
        "forwarded-note",
        "last-seed",
        "hard-bump",
        "tears-path",
        "the-dare",
        "too-soft",
        "after-yell",
      ]),
    );
  });

  it("describes a creature with body cues", () => {
    const willow = EMOTIONS.find((emotion) => emotion.emotionId === "anxiety");
    expect(willow).toBeTruthy();
    expect(describeEmotion(willow!)).toMatch(/Body cues/);
    expect(willow?.creature).toBe("Worrying Willow");
  });
});

describe("attempts and choices", () => {
  it("requires exactly one target", () => {
    expect(() =>
      assertOneTarget({
        attemptId: "a",
        studentAlias: "Pip",
        scenarioId: "watering-can",
        exerciseId: "petal-breath",
        status: AttemptStatus.STARTED,
        startedAt: "2026-10-17T00:00:00.000Z",
        harmony: 0,
        skills: [],
        choiceIds: [],
      }),
    ).toThrow(/Exactly one target/);
  });

  it("walks a choice onto the next node and can finish", () => {
    const attempt = openAttempt({
      studentAlias: "Pip",
      scenarioId: "watering-can",
      nodeId: "wc-start",
    });
    const node = getNode("watering-can", "wc-start");
    const fair = node?.choices.find((choice) => choice.nextNodeId === "wc-ask");
    const next = applyChoice(attempt, fair!.choiceId, new Date("2026-10-17T12:00:00.000Z"));
    expect(next.nodeId).toBe("wc-ask");
    expect(next.skills).toContain(SkillType.CONFLICT_RESOLUTION);
    expect(next.status).toBe(AttemptStatus.STARTED);
    const ask = getNode("watering-can", "wc-ask");
    const bloom = ask?.choices.find((choice) => choice.nextNodeId === "wc-bloom");
    const done = applyChoice(next, bloom!.choiceId);
    expect(done.status).toBe(AttemptStatus.COMPLETED);
    expect(done.outcome).toBe("bloom");
    expect(() => applyChoice(done, bloom!.choiceId)).toThrow(/not open/);
  });

  it("locks the calm sentence until a practice is ready", () => {
    const node = getNode("watering-can", "wc-start")!;
    const locked = getChoices(node, { gradeBand: "5-6", calmReady: false });
    expect(locked.some((choice) => choice.lockedReason)).toBe(true);
    const open = getChoices(node, { gradeBand: "5-6", calmReady: true });
    expect(open.some((choice) => choice.lockedReason)).toBe(false);
    const young = getChoices(node, { gradeBand: "1-2", calmReady: true });
    expect(young.some((choice) => (choice.minGrade ?? 0) > bandCeiling("1-2"))).toBe(false);
    expect(young.some((choice) => choice.label.includes("frustrated"))).toBe(false);
  });
});

describe("codes, slips, and the desk", () => {
  it("parses a join code into a grade band", () => {
    expect(parseJoinCode(" fern-2-17 ")).toEqual({ code: "FERN-2-17", gradeBand: "3-4" });
    expect(parseJoinCode("KEEP-FERN-2-17-ABC")).toBeNull();
    const code = generateJoinCode("1-2", () => 0);
    expect(code.startsWith("FERN-1-")).toBe(true);
    expect(validateAlias("Real@school.edu")).toMatch(/garden name/);
    expect(validateAlias("Pip")).toBeNull();
  });

  it("round-trips a blossom slip", () => {
    const student: Student = {
      alias: "Pip",
      classroomId: "class_FERN-2-17",
      avatarRef: "pinekit",
      metCreatureIds: ["anxiety"],
      calmReady: true,
      loop: emptyLoop(),
      updatedAt: "2026-10-17T00:00:00.000Z",
    };
    const slip = encodeSlip({
      kind: "harmony-garden-slip",
      version: 1,
      classroomCode: "FERN-2-17",
      gradeBand: "3-4",
      student,
      attempts: [
        openAttempt({
          studentAlias: "Pip",
          exerciseId: "petal-breath",
        }),
      ],
      checkins: [],
    });
    const decoded = decodeSlip(slip);
    expect(decoded.student.alias).toBe("Pip");
    expect(decoded.attempts).toHaveLength(1);
    expect(() => decodeSlip("nope")).toThrow(/slip/);
  });

  it("keeps student rows private and lets a keeper see the class", () => {
    const desk = store();
    const planted = desk.createClassroom({ alias: "Keeper Fern", gradeBand: "3-4" });
    expect(planted.ok).toBe(true);
    if (!planted.ok || !planted.data) throw new Error("plant failed");
    expect(desk.getSnapshot().classrooms[0]?.keeperCode).toBe(planted.data.keeperCode);
    expect(desk.joinStudent({ alias: "Pip", avatarRef: "pinekit", joinCode: planted.data.joinCode }).ok).toBe(true);
    expect(desk.getSnapshot().students.map((student) => student.alias)).toEqual(["Pip"]);
    expect(desk.getSnapshot().classrooms[0]?.keeperCode).toBe("");
    const started = desk.startScenario("watering-can");
    expect(started.ok).toBe(true);
    desk.checkIn("anxiety", 3);
    const slip = desk.exportSlip();
    expect(slip.ok).toBe(true);
    expect(desk.signInWithCode(planted.data.keeperCode).ok).toBe(true);
    expect(desk.getRole()).toBe(Role.TEACHER);
    expect(desk.getSnapshot().students.map((student) => student.alias)).toEqual(["Pip"]);
    expect(desk.removeStudent("Pip").ok).toBe(true);
    expect(desk.getSnapshot().students).toHaveLength(0);
    expect(desk.importSlip(slip.ok ? slip.data ?? "" : "").ok).toBe(true);
    expect(desk.getSnapshot().students.map((student) => student.alias)).toEqual(["Pip"]);
    expect(desk.getSnapshot().checkins).toHaveLength(1);
    expect(desk.signInWithCode(planted.data.viewCode).ok).toBe(true);
    expect(desk.getRole()).toBe(Role.COUNSELOR);
    expect(desk.getSnapshot().classrooms[0]?.keeperCode).toBe("");
    expect(desk.removeStudent("Pip").ok).toBe(false);
    const report = reportFor(desk.getSnapshot());
    expect(report?.studentCount).toBe(1);
    expect(report?.emotions.find((emotion) => emotion.emotionId === "anxiety")?.count).toBe(1);
  });

  it("does not let the sample desk overwrite a real one", () => {
    const desk = store();
    expect(desk.createClassroom({ alias: "Keeper Fern", gradeBand: "1-2" }).ok).toBe(true);
    const code = desk.getSnapshot().classrooms[0]?.code;
    desk.openSample();
    expect(desk.getSnapshot().sample).toBe(true);
    expect(desk.getSnapshot().students.length).toBeGreaterThan(1);
    desk.signOut();
    expect(desk.getSnapshot().sample).toBe(false);
    expect(desk.getSnapshot().session?.alias).toBe("Keeper Fern");
    expect(desk.getSnapshot().classrooms[0]?.code).toBe(code);
    expect(desk.getSnapshot().students).toHaveLength(0);
    expect(desk.signInWithCode("KEEP-FERN-2-17-DEMO").ok).toBe(false);
    expect(desk.signInWithCode(`KEEP-${code}-ZZZ`).ok).toBe(false);
  });

  it("walks the garden loop", () => {
    const desk = store();
    expect(desk.joinStudent({ alias: "Brook", avatarRef: "emberbud", gradeBand: "1-2" }).ok).toBe(true);
    expect(desk.startScenario("photo-leaf").ok).toBe(false);
    expect(desk.startScenario("watering-can").ok).toBe(true);
    let student = desk.getSnapshot().students[0]!;
    expect(hintFor(student, desk.getSnapshot().attempts).bead).toBe("forest");
    expect(desk.meetCreature("frustration").ok).toBe(true);
    student = desk.getSnapshot().students[0]!;
    expect(hintFor(student, desk.getSnapshot().attempts).bead).toBe("mountain");
    expect(desk.completeExercise("petal-breath", 2).ok).toBe(true);
    student = desk.getSnapshot().students[0]!;
    expect(student.calmReady).toBe(true);
    expect(hintFor(student, desk.getSnapshot().attempts).bead).toBe("resolve");
    const attempt = desk.getSnapshot().attempts.find((item) => item.scenarioId === "watering-can")!;
    const calm = getChoices(getNode("watering-can", attempt.nodeId!)!, {
      gradeBand: "1-2",
      calmReady: true,
    }).find((choice) => choice.requiresCalm);
    expect(desk.applyChoice(attempt.attemptId, calm!.choiceId).ok).toBe(true);
    const afterCalm = desk.getSnapshot().attempts[0]!;
    const spoken = getNode("watering-can", afterCalm.nodeId!)!.choices[0];
    expect(desk.applyChoice(afterCalm.attemptId, spoken.choiceId).ok).toBe(true);
    student = desk.getSnapshot().students[0]!;
    expect(student.loop.finishedScenario).toBe(true);
    expect(hintFor(student, desk.getSnapshot().attempts).bead).toBe("trial");
    expect(desk.completeChallenge("trust-stones", 2).ok).toBe(true);
    student = desk.getSnapshot().students[0]!;
    expect(hintFor(student, desk.getSnapshot().attempts).bead).toBe("grove");
    expect(bloomName(4)).toBe("Buds");
  });

  it("moves a class file onto a fresh device", () => {
    const desk = store();
    desk.createClassroom({ alias: "Keeper Fern", gradeBand: "1-2" });
    const file = desk.exportClassFile();
    expect(file.ok).toBe(true);
    const other = store();
    expect(other.importClassFile(file.ok ? file.data ?? "" : "").ok).toBe(true);
    expect(other.getRole()).toBe(Role.TEACHER);
    expect(other.getSnapshot().classrooms[0]?.gradeBand).toBe("1-2");
    expect(other.signInWithCode(other.getSnapshot().classrooms[0]!.viewCode).ok).toBe(true);
    expect(other.getRole()).toBe(Role.COUNSELOR);
  });
});

describe("team puzzles", () => {
  it("encodes a lantern and a stone path", () => {
    const icons = lanternPattern("attempt_1", 4);
    expect(new Set(icons).size).toBe(4);
    const code = lanternCode(icons);
    expect(iconsFromLanternCode(code)).toEqual(icons);
    const stones = trustPattern("bramble", 6);
    expect(patternFromTrustCode(trustCode(stones))).toEqual(stones);
    expect(basketIsCorrect({ water: "pip", seeds: "moss", watch: "lumen" })).toBe(true);
    expect(basketIsCorrect({ water: "moss", seeds: "pip", watch: "lumen" })).toBe(false);
  });

  it("builds a sample desk with every skill represented", () => {
    const sample = buildSample();
    const skills = new Set(sample.attempts.flatMap((attempt) => attempt.skills));
    expect(skills.has(SkillType.CONFLICT_RESOLUTION)).toBe(true);
    expect(skills.has(SkillType.BOUNDARIES)).toBe(true);
    expect(skills.has(SkillType.TEAMWORK)).toBe(true);
    expect(skills.has(SkillType.MINDFULNESS)).toBe(true);
    expect(sample.attempts.every((attempt) => {
      assertOneTarget(attempt);
      return true;
    })).toBe(true);
    expect(bandCeiling("3-4")).toBe(4);
  });
});
