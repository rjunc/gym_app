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
  { id: "r1", partner: "Sam", parts: [{ id: "p1", techniques: [{ techniqueId: "t2", result: "hit" }, { techniqueId: "t3", result: "caught" }] }] },
  { id: "r2", note: "flow roll", parts: [{ id: "p2", techniques: [{ techniqueId: "t1", result: "attempted" }, { techniqueId: "t2", result: "hit" }] }] },
];
// Sam tapped with a triangle, restarted, then caught Sam with a kimura.
const restarted = {
  id: "r3",
  partner: "Sam",
  parts: [
    { id: "p3", techniques: [{ techniqueId: "t2", result: "caught" }] },
    { id: "p4", techniques: [{ techniqueId: "t3", result: "hit" }] },
  ],
};

test("matTechniqueIds lists drilled first, then round techniques across parts, each once", () => {
  assert.deepEqual(matTechniqueIds({ drilledIds: ["t1", "t4"], rounds }), ["t1", "t4", "t2", "t3"]);
  assert.deepEqual(matTechniqueIds({ rounds: [restarted] }), ["t2", "t3"]);
  assert.deepEqual(matTechniqueIds({}), []);
});

test("draft rounds round-trip, trimming partner and note and dropping blanks", () => {
  const drafts = toDraftRounds(rounds);
  assert.equal(drafts[0].key, "r1");
  assert.equal(drafts[1].partner, "");
  drafts[0].partner = "  Sam   B ";
  drafts[1].note = "   ";
  assert.deepEqual(fromDraftRounds(drafts), [
    { id: "r1", partner: "Sam B", parts: rounds[0].parts },
    { id: "r2", parts: rounds[1].parts },
  ]);
});

test("toDraftRounds with fresh gives new keys", () => {
  assert.notEqual(toDraftRounds(rounds, { fresh: true })[0].key, "r1");
});

test("an empty round is still saved with one part: it says a round was rolled", () => {
  assert.deepEqual(fromDraftRounds([{ key: "k", partner: "", note: "", parts: [{ key: "pk", techniques: [] }] }]), [{ id: "k", parts: [{ id: "pk", techniques: [] }] }]);
  assert.equal(fromDraftRounds([{ key: "k", parts: [] }])[0].parts.length, 1);
});

test("a round restarted after a tap keeps its parts in order, empty ones too", () => {
  const drafts = toDraftRounds([{ ...restarted, parts: [...restarted.parts, { id: "p5", techniques: [] }] }]);
  assert.deepEqual(drafts[0].parts.map((p) => p.key), ["p3", "p4", "p5"]);
  assert.deepEqual(fromDraftRounds(drafts)[0].parts, [...restarted.parts, { id: "p5", techniques: [] }]);
});

test("a round with no parts reads as one empty part", () => {
  assert.equal(toDraftRounds([{ id: "r" }])[0].parts.length, 1);
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
    rounds: [null, { partner: " Jo ", parts: [{ techniques: [{ techniqueId: "t2", result: "won" }, { result: "hit" }] }] }, { id: "rx" }],
  });
  assert.equal("gi" in out, false);
  assert.deepEqual(out.drilledIds, ["t1"]);
  assert.equal(out.rounds.length, 2);
  assert.equal(out.rounds[0].partner, "Jo");
  assert.deepEqual(out.rounds[0].parts[0].techniques, [{ techniqueId: "t2", result: "hit" }]);
  assert.equal(out.rounds[1].parts.length, 1);
  assert.deepEqual(out.techniqueIds, ["t1", "t2"]);
  assert.deepEqual(normalizeMat({ title: "x" }), {});
});

test("techniqueStats counts drilled sessions and each result", () => {
  const entries = [
    { drilledIds: ["t2"], rounds },
    { drilledIds: [], rounds: [restarted] },
  ];
  assert.deepEqual(techniqueStats(entries, "t2"), { drilled: 1, hit: 2, attempted: 0, caught: 1 });
  assert.deepEqual(techniqueStats(entries, "t3"), { drilled: 0, hit: 1, attempted: 0, caught: 1 });
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
  assert.equal(matSummaryText({ rounds: [{ parts: [{ techniques: [] }] }] }, names), "Round 1");
  assert.equal(
    matSummaryText({ rounds: [{ ...restarted, parts: [...restarted.parts, { techniques: [] }] }] }, names),
    "Round 1 (Sam): Part 1: Caught by: Triangle | Part 2: Hit: Kimura | Part 3"
  );
});
