import test from "node:test";
import assert from "node:assert/strict";
import { formatDateTime, wasEdited } from "../../src/lib/id.js";

test("formatDateTime shows a local date and time, adding the year only when it isn't the current one", () => {
  const now = new Date(2026, 8, 25, 12, 0);
  const sameYear = formatDateTime(new Date(2026, 8, 24, 18, 5).toISOString(), now);
  assert.match(sameYear, / at /);
  assert.equal(sameYear.includes("2026"), false);
  assert.equal(formatDateTime(new Date(2025, 0, 2, 9, 0).toISOString(), now).includes("2025"), true);
});

test("formatDateTime returns an empty string for missing or unreadable timestamps", () => {
  assert.equal(formatDateTime(undefined), "");
  assert.equal(formatDateTime(""), "");
  assert.equal(formatDateTime("not a date"), "");
});

test("wasEdited is true only when updatedAt is more than a minute after createdAt", () => {
  assert.equal(wasEdited({ createdAt: "2026-09-24T18:00:00.000Z", updatedAt: "2026-09-24T18:00:30.000Z" }), false);
  assert.equal(wasEdited({ createdAt: "2026-09-24T18:00:00.000Z", updatedAt: "2026-09-24T18:02:00.000Z" }), true);
  assert.equal(wasEdited({ updatedAt: "2026-09-24T18:02:00.000Z" }), false);
  assert.equal(wasEdited({}), false);
});
