import test from "node:test";
import assert from "node:assert/strict";
import { tagInventory, usageLabel, retagRecords, goalsEmptiedBy, possibleDuplicates, taggedRecords, pairKey } from "../../src/lib/tagManager.js";

const log = {
  sessions: [{ id: "s1", tags: ["legs", "strength"] }, { id: "s2", tags: ["leg"] }, { id: "s3", tags: [] }],
  journals: [{ id: "j1", tags: ["sleep"] }],
  exercises: [{ id: "e1", tags: ["legs"] }],
  goals: [
    { id: "g1", mode: "sessions", rules: [{ kind: "any", scope: "session", tags: ["leg", "legs"], exerciseIds: [] }], target: 1, days: 7 },
    { id: "g2", mode: "checklist", items: [{ tag: "leg", target: 3 }, { tag: "legs", target: 1 }, { exerciseId: "e1", target: 1 }], days: 7 },
    { id: "g3", mode: "sessions", rules: [{ kind: "any", scope: "session", tags: ["sleep"], exerciseIds: [] }], target: 1, days: 7 },
  ],
};

test("tagInventory: every tag with where it's used, most used first", () => {
  const inv = tagInventory(log);
  assert.deepEqual(inv.map((t) => [t.tag, t.total]), [["legs", 4], ["leg", 3], ["sleep", 2], ["strength", 1]]);
  assert.deepEqual(inv[0].counts, { sessions: 1, exercises: 1, goals: 2 });
  assert.equal(usageLabel(inv[0].counts), "1 session · 1 exercise · 2 goals");
  assert.equal(usageLabel({ sessions: 2, rolls: 1 }), "2 sessions · 1 mat session");
});

test("taggedRecords: records with tags of their own, not goals", () => {
  assert.equal(taggedRecords(log).length, 5);
});

test("retagRecords: merge renames and keeps each tag once; untouched records stay the same objects", () => {
  const sessions = retagRecords("sessions", log.sessions, "leg", "legs");
  assert.deepEqual(sessions.map((s) => s.tags), [["legs", "strength"], ["legs"], []]);
  assert.equal(sessions[0], log.sessions[0]);
  assert.notEqual(sessions[1], log.sessions[1]);
  assert.ok(sessions[1].updatedAt);
});

test("retagRecords: goals have it renamed in rules and checklist items, a doubled item keeping the higher target", () => {
  const goals = retagRecords("goals", log.goals, "leg", "legs");
  assert.deepEqual(goals[0].rules[0].tags, ["legs"]);
  assert.deepEqual(goals[1].items, [{ tag: "legs", target: 3 }, { exerciseId: "e1", target: 1 }]);
  assert.equal(goals[2], log.goals[2]);
  // Plain renames keep the item's place.
  assert.deepEqual(retagRecords("goals", log.goals, "legs", "lower")[1].items.map((it) => it.tag || it.exerciseId), ["leg", "lower", "e1"]);
});

test("retagRecords: deleting removes it everywhere", () => {
  assert.deepEqual(retagRecords("sessions", log.sessions, "legs", null).map((s) => s.tags), [["strength"], ["leg"], []]);
  const goals = retagRecords("goals", log.goals, "leg", null);
  assert.deepEqual(goals[0].rules[0].tags, ["legs"]);
  assert.deepEqual(goals[1].items, [{ tag: "legs", target: 1 }, { exerciseId: "e1", target: 1 }]);
  assert.deepEqual(retagRecords("goals", log.goals, "sleep", null)[2].rules[0].tags, []);
});

test("goalsEmptiedBy: goals left with nothing to count", () => {
  assert.deepEqual(goalsEmptiedBy(log.goals, "sleep").map((g) => g.id), ["g3"]);
  assert.deepEqual(goalsEmptiedBy(log.goals, "leg"), []);
});

test("possibleDuplicates: lookalike pairs, the less used merging into the more used", () => {
  const pairs = possibleDuplicates(tagInventory(log));
  assert.deepEqual(pairs.map((p) => [p.from.tag, p.to.tag]), [["leg", "legs"]]);
  assert.equal(pairKey("legs", "leg"), pairKey("leg", "legs"));
});
