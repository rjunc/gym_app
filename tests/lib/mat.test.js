import test from "node:test";
import assert from "node:assert/strict";
import {
  matTechniqueIds,
  toDraftRounds,
  fromDraftRounds,
  matFields,
  hasMatContent,
  normalizeMat,
  techniqueStats,
  recentPartners,
  matSummaryText,
} from "../../src/lib/mat.js";

const rounds = [
  { id: "r1", partner: "Sam", techniques: [{ techniqueId: "t2", result: "hit" }, { techniqueId: "t3", result: "caught" }] },
  { id: "r2", note: "flow roll", techniques: [{ techniqueId: "t1", result: "attempted" }, { techniqueId: "t2", result: "hit" }] },
];

test("matTechniqueIds lists drilled first, then round techniques, each once", () => {
  assert.deepEqual(matTechniqueIds({ drilledIds: ["t1", "t4"], rounds }), ["t1", "t4", "t2", "t3"]);
  assert.deepEqual(matTechniqueIds({}), []);
});

test("draft rounds round-trip, trimming partner and note and dropping blanks", () => {
  const drafts = toDraftRounds(rounds);
  assert.equal(drafts[0].key, "r1");
  assert.equal(drafts[1].partner, "");
  drafts[0].partner = "  Sam   B ";
  drafts[1].note = "   ";
  assert.deepEqual(fromDraftRounds(drafts), [
    { id: "r1", partner: "Sam B", techniques: rounds[0].techniques },
    { id: "r2", techniques: rounds[1].techniques },
  ]);
});

test("toDraftRounds with fresh gives new keys", () => {
  assert.notEqual(toDraftRounds(rounds, { fresh: true })[0].key, "r1");
});

test("an empty round is still saved: it says a round was rolled", () => {
  assert.deepEqual(fromDraftRounds([{ key: "k", partner: "", note: "", techniques: [] }]), [{ id: "k", techniques: [] }]);
});

test("matFields derives techniqueIds, keeps gi only if known, and dedupes drilled", () => {
  const form = { gi: "no-gi", drilledIds: ["t1", "t1"], rounds: toDraftRounds(rounds) };
  const out = matFields(form);
  assert.equal(out.gi, "no-gi");
  assert.deepEqual(out.drilledIds, ["t1"]);
  assert.deepEqual(out.techniqueIds, ["t1", "t2", "t3"]);
  assert.equal("gi" in matFields({ ...form, gi: "" }), false);
});

test("hasMatContent: a drilled technique or a round counts, gi alone doesn't", () => {
  assert.equal(hasMatContent({ gi: "gi" }), false);
  assert.equal(hasMatContent({ drilledIds: ["t1"] }), true);
  assert.equal(hasMatContent({ rounds: [{}] }), true);
});

test("normalizeMat checks imported fields and derives techniqueIds", () => {
  const out = normalizeMat({
    gi: "kimono",
    drilledIds: ["t1", 5, "t1"],
    rounds: [null, { partner: " Jo ", techniques: [{ techniqueId: "t2", result: "won" }, { result: "hit" }] }],
  });
  assert.equal("gi" in out, false);
  assert.deepEqual(out.drilledIds, ["t1"]);
  assert.equal(out.rounds.length, 1);
  assert.equal(out.rounds[0].partner, "Jo");
  assert.deepEqual(out.rounds[0].techniques, [{ techniqueId: "t2", result: "hit" }]);
  assert.deepEqual(out.techniqueIds, ["t1", "t2"]);
  assert.deepEqual(normalizeMat({ title: "x" }), {});
});

test("techniqueStats counts drilled sessions and each result", () => {
  const entries = [
    { drilledIds: ["t2"], rounds },
    { drilledIds: [], rounds: [{ techniques: [{ techniqueId: "t2", result: "caught" }] }] },
  ];
  assert.deepEqual(techniqueStats(entries, "t2"), { drilled: 1, hit: 2, attempted: 0, caught: 1 });
  assert.deepEqual(techniqueStats(entries, "t9"), { drilled: 0, hit: 0, attempted: 0, caught: 0 });
});

test("recentPartners: most recent first, each once ignoring case", () => {
  const entries = [
    { date: "2026-09-01", rounds: [{ partner: "Sam" }, { partner: "Alex" }] },
    { date: "2026-09-20", rounds: [{ partner: "sam" }, { partner: "Jo" }, {}] },
  ];
  assert.deepEqual(recentPartners(entries), ["sam", "Jo", "Alex"]);
});

test("matSummaryText reads gi, drilled and each round", () => {
  const names = new Map([
    ["t1", "Scissor sweep"],
    ["t2", "Triangle"],
    ["t3", "Kimura"],
  ]);
  assert.equal(
    matSummaryText({ gi: "no-gi", drilledIds: ["t1"], rounds }, names),
    "No-Gi · Drilled: Scissor sweep · Round 1 (Sam): Hit: Triangle; Caught by: Kimura · Round 2: Hit: Triangle; Attempted: Scissor sweep — flow roll"
  );
  assert.equal(matSummaryText({}, names), "");
  assert.equal(matSummaryText({ rounds: [{ techniques: [] }] }, names), "Round 1");
});
