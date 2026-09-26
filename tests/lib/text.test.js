import test from "node:test";
import assert from "node:assert/strict";
import { cleanLine, cleanText, cleanFields } from "../../src/lib/text.js";

test("cleanLine trims and collapses inner whitespace, including stray newlines", () => {
  assert.equal(cleanLine("  Back   squat \n"), "Back squat");
  assert.equal(cleanLine("\tMorning\n\nlift "), "Morning lift");
  assert.equal(cleanLine(""), "");
  assert.equal(cleanLine(undefined), "");
});

test("cleanText strips blank lines and space at the start and end", () => {
  assert.equal(cleanText("\n\n  Squat 5x5\n\n\n"), "Squat 5x5");
});

test("cleanText collapses runs of blank lines to a single blank line", () => {
  assert.equal(cleanText("Warm-up\n\n\n\n\nSquat 5x5\n\n\nDone"), "Warm-up\n\nSquat 5x5\n\nDone");
});

test("cleanText treats whitespace-only lines as blank", () => {
  assert.equal(cleanText("A\n   \n \t \n\nB"), "A\n\nB");
});

test("cleanText keeps single line breaks, one blank line, and indentation", () => {
  const text = "A1) Squat\n  - 5x5 @ 225\nA2) RDL\n\nFinisher";
  assert.equal(cleanText(text), text);
});

test("cleanText strips trailing spaces on each line and normalizes Windows line endings", () => {
  assert.equal(cleanText("Squat   \r\nBench\t\r\n\r\n\r\n\r\nRow"), "Squat\nBench\n\nRow");
});

test("cleanFields cleans the known text fields and leaves everything else alone", () => {
  const form = {
    id: "x",
    date: "2026-09-25",
    title: "  Leg   day ",
    name: " Scissor sweep ",
    prescription: " 3x8 ",
    position: " closed  guard ",
    toPosition: "mount ",
    text: "\n\nSquat\n\n\n\nBench  \n",
    tags: ["  legs "],
    exerciseIds: ["e1"],
    starred: true,
  };
  assert.deepEqual(cleanFields(form), {
    id: "x",
    date: "2026-09-25",
    title: "Leg day",
    name: "Scissor sweep",
    prescription: "3x8",
    position: "closed guard",
    toPosition: "mount",
    text: "Squat\n\nBench",
    tags: ["  legs "],
    exerciseIds: ["e1"],
    starred: true,
  });
});

test("cleanFields doesn't add fields the form didn't have, or mutate the input", () => {
  const form = { text: " hi " };
  assert.deepEqual(cleanFields(form), { text: "hi" });
  assert.deepEqual(form, { text: " hi " });
});
