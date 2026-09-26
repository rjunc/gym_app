import test from "node:test";
import assert from "node:assert/strict";
import { ENTRY_TYPES } from "../../src/lib/entryTypes.js";

test("every entry type has the settings the form, cards and pages read", () => {
  for (const [key, t] of Object.entries(ENTRY_TYPES)) {
    for (const field of ["label", "singular", "accent", "textLabel", "textPlaceholder"]) assert.equal(typeof t[field], "string", `${key}.${field}`);
    for (const flag of ["showRoutines", "showExercises", "showSets", "canRedo"]) assert.equal(typeof t[flag], "boolean", `${key}.${flag}`);
    for (const field of ["eyebrow", "heading", "searchPlaceholder", "emptyLabel"]) assert.equal(typeof t.page[field], "string", `${key}.page.${field}`);
  }
});

test("sets are only offered where exercises are linked", () => {
  for (const [key, t] of Object.entries(ENTRY_TYPES)) if (t.showSets) assert.equal(t.showExercises, true, key);
});

test("sessions log sets; journals and rolls don't; rolls link nothing", () => {
  assert.equal(ENTRY_TYPES.sessions.showSets, true);
  assert.equal(ENTRY_TYPES.journals.showSets, false);
  assert.equal(ENTRY_TYPES.rolls.showExercises || ENTRY_TYPES.rolls.showRoutines, false);
});
