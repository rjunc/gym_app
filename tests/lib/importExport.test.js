import test from "node:test";
import assert from "node:assert/strict";
import { combinedToCSV, combinedFromCSV, parseImportFile } from "../../src/lib/importExport.js";
import { todayISO } from "../../src/lib/id.js";

/* ============================== fixtures ============================== */

const folders = [{ id: "f1", name: "Push day", parentId: null }];
const jitsFolders = [{ id: "jf1", name: "Closed guard", parentId: null }];

const sessions = [{ id: "s1", date: "2026-09-01", title: "Leg day", tags: ["legs"], text: "Squats, 5x5" }];
const journals = [{ id: "j1", date: "2026-09-02", title: "", tags: [], text: "Feeling good" }];
const rolls = [{ id: "ro1", date: "2026-09-03", title: "Gi class", tags: ["gi"], text: "Rolled 5 rounds" }];
const routines = [{ id: "r1", name: "Push A", folderId: "f1", tags: ["push"], text: "Bench, OHP" }];
const exercises = [
  { id: "e1", name: "Goblet squat", tags: ["strength", "legs"], text: "Hold at chest, sit between heels", prescription: "3x10", active: true },
  { id: "e2", name: "Retired stretch", tags: ["mobility"], text: "", prescription: "", active: false },
];
const techniques = [
  {
    id: "t1",
    name: "Scissor sweep",
    folderId: "jf1",
    tags: ["sweep"],
    text: "Break posture, sweep off the elbow",
    position: "bottom closed guard",
    toPosition: "top side control",
    giOnly: false,
    starred: true,
  },
  {
    id: "t2",
    name: "Collar choke",
    folderId: null,
    tags: [],
    text: "Needs the lapel",
    position: "top mount",
    toPosition: "",
    giOnly: true,
    starred: false,
  },
];

/* ============================== CSV round trip ============================== */

test("combinedToCSV -> combinedFromCSV round trip preserves every field, every type", () => {
  const csv = combinedToCSV(sessions, routines, journals, folders, rolls, techniques, jitsFolders, exercises);
  const result = combinedFromCSV(csv, folders, jitsFolders);

  assert.deepEqual(result.sessions, sessions);
  assert.deepEqual(result.journals, journals);
  assert.deepEqual(result.rolls, rolls);
  assert.deepEqual(result.routines, routines);
  assert.deepEqual(result.techniques, techniques);
  assert.deepEqual(result.folders, folders);
  assert.deepEqual(result.jitsFolders, jitsFolders);
  assert.deepEqual(result.exercises, exercises);
});

test("CSV export includes exercise names as a readable column, but import doesn't reconstruct exerciseIds", () => {
  const linkedSessions = [{ id: "s1", date: "2026-09-01", title: "", tags: [], text: "Squats", exerciseIds: ["e1"] }];
  const linkedRoutines = [{ id: "r1", name: "Push A", folderId: null, tags: [], text: "Bench", exerciseIds: ["e1", "e2"] }];
  const csv = combinedToCSV(linkedSessions, linkedRoutines, [], [], [], [], [], exercises);

  assert.ok(csv.includes("Goblet squat"), "exercise name appears somewhere in the export for a human to read");

  const result = combinedFromCSV(csv, [], []);
  assert.equal("exerciseIds" in result.sessions[0], false);
  assert.equal("exerciseIds" in result.routines[0], false);
});

test("CSV round trip survives commas, quotes, and embedded newlines", () => {
  const nasty = [
    {
      id: "s1",
      date: "2026-09-01",
      title: 'Title, with "quotes"',
      tags: ["a,b", 'c"d'],
      text: "Line one\nLine two, with a comma and a \"quote\"",
    },
  ];
  const csv = combinedToCSV(nasty, [], [], []);
  const result = combinedFromCSV(csv, [], []);
  // Tags containing a literal comma/quote survive the round trip; the ";"
  // tag separator itself is not escaped, so a tag containing ";" would not
  // survive — that's a known limitation of the ";"-joined tags column.
  assert.equal(result.sessions[0].title, nasty[0].title);
  assert.equal(result.sessions[0].text, nasty[0].text);
});

test("routine and technique folders resolve independently, even with same folder name", () => {
  const sharedNameFolders = [{ id: "f1", name: "Guard", parentId: null }];
  const sharedNameJitsFolders = [{ id: "jf1", name: "Guard", parentId: null }];
  const oneRoutine = [{ id: "r1", name: "Leg day", folderId: "f1", tags: [], text: "" }];
  const oneTechnique = [
    { id: "t1", name: "Sweep", folderId: "jf1", tags: [], text: "", position: "", toPosition: "", giOnly: false },
  ];

  const csv = combinedToCSV([], oneRoutine, [], sharedNameFolders, [], oneTechnique, sharedNameJitsFolders);
  const result = combinedFromCSV(csv, sharedNameFolders, sharedNameJitsFolders);

  assert.equal(result.routines[0].folderId, "f1");
  assert.equal(result.techniques[0].folderId, "jf1");
  // Only the folders that actually exist on each side — no crosstalk creating
  // a duplicate "Guard" folder on the other side.
  assert.equal(result.folders.length, 1);
  assert.equal(result.jitsFolders.length, 1);
});

test("importing a CSV into a fresh account recreates a nested folder tree and re-links items", () => {
  const nested = [{ id: "r1", name: "Push A", folderId: "deep", tags: [], text: "" }];
  const nestedFolders = [
    { id: "top", name: "Programs", parentId: null },
    { id: "deep", name: "531", parentId: "top" },
  ];
  const csv = combinedToCSV([], nested, [], nestedFolders);

  const result = combinedFromCSV(csv, [], []);
  const programs = result.folders.find((f) => f.name === "Programs" && f.parentId === null);
  const plan = result.folders.find((f) => f.name === "531");
  assert.ok(programs, "top-level folder recreated");
  assert.ok(plan, "nested folder recreated");
  assert.equal(plan.parentId, programs.id);
  assert.equal(result.routines[0].folderId, plan.id);
});

test("KNOWN LIMITATION: a folder name containing '/' gets split into extra folders on CSV round trip", () => {
  // folder_path joins a folder chain with "/" and CSV import splits on "/"
  // to rebuild it, so a folder literally named e.g. "5/3/1" is
  // indistinguishable from three nested folders "5", "3", "1". This is a
  // pre-existing quirk of the CSV folder_path scheme (not something this
  // suite fixes) — documenting the actual behavior so a future change to
  // folder naming doesn't silently break on it, or can deliberately fix it.
  const slashNamed = [{ id: "r1", name: "Push A", folderId: "deep", tags: [], text: "" }];
  const slashFolders = [{ id: "deep", name: "5/3/1", parentId: null }];
  const csv = combinedToCSV([], slashNamed, [], slashFolders);

  const result = combinedFromCSV(csv, [], []);
  assert.equal(result.folders.length, 3, "split into 3 folders instead of preserving 1");
  assert.deepEqual(result.folders.map((f) => f.name).sort(), ["1", "3", "5"]);
});

test("re-importing the same CSV into an account that already has the folders does not duplicate them", () => {
  const nested = [{ id: "r1", name: "Push A", folderId: "deep", tags: [], text: "" }];
  const nestedFolders = [
    { id: "top", name: "Programs", parentId: null },
    { id: "deep", name: "531", parentId: "top" },
  ];
  const csv = combinedToCSV([], nested, [], nestedFolders);

  const firstImport = combinedFromCSV(csv, [], []);
  const secondImport = combinedFromCSV(csv, firstImport.folders, []);

  assert.equal(secondImport.folders.length, firstImport.folders.length);
});

test("CSV tags are lowercased and trimmed on import even if the source wasn't", () => {
  const messy = [{ id: "r1", name: "Push A", folderId: null, tags: ["  Legs ", "PUSH"], text: "" }];
  const csv = combinedToCSV([], messy, [], []);
  const result = combinedFromCSV(csv, [], []);
  assert.deepEqual(result.routines[0].tags, ["legs", "push"]);
});

test("CSV missing the position/to_position/gi_only columns (pre-Flow export) still parses", () => {
  const oldStyleCsv = ["type,id,date,name,folder_path,tags,text", "technique,t1,,Armbar,,,notes"].join("\r\n");
  const result = combinedFromCSV(oldStyleCsv, [], []);
  assert.equal(result.techniques.length, 1);
  assert.equal(result.techniques[0].position, "");
  assert.equal(result.techniques[0].toPosition, "");
  assert.equal(result.techniques[0].giOnly, false);
  assert.equal(result.techniques[0].starred, false);
});

test("CSV missing the starred column (pre-star export) still parses, defaulting to unstarred", () => {
  const oldStyleCsv = [
    "type,id,date,name,folder_path,tags,text,position,to_position,gi_only",
    "technique,t1,,Armbar escape,,,notes,bottom mount,,",
  ].join("\r\n");
  const result = combinedFromCSV(oldStyleCsv, [], []);
  assert.equal(result.techniques[0].starred, false);
});

test("starred column: '1' becomes true, empty becomes false", () => {
  const csv = combinedToCSV([], [], [], [], [], [
    { id: "t1", name: "A", folderId: null, tags: [], text: "", position: "", toPosition: "", giOnly: false, starred: true },
    { id: "t2", name: "B", folderId: null, tags: [], text: "", position: "", toPosition: "", giOnly: false, starred: false },
  ]);
  const result = combinedFromCSV(csv, [], []);
  assert.equal(result.techniques.find((t) => t.id === "t1").starred, true);
  assert.equal(result.techniques.find((t) => t.id === "t2").starred, false);
});

test("CSV missing the prescription/active columns (pre-Library export) still parses, defaulting active to true", () => {
  const oldStyleCsv = ["type,id,date,name,folder_path,tags,text", "exercise,e1,,Push-up,,,notes"].join("\r\n");
  const result = combinedFromCSV(oldStyleCsv, [], []);
  assert.equal(result.exercises.length, 1);
  assert.equal(result.exercises[0].prescription, "");
  assert.equal(result.exercises[0].active, true);
});

test("active column: '0' becomes false, '1' becomes true", () => {
  const csv = combinedToCSV([], [], [], [], [], [], [], [
    { id: "e1", name: "A", tags: [], text: "", prescription: "", active: true },
    { id: "e2", name: "B", tags: [], text: "", prescription: "", active: false },
  ]);
  const result = combinedFromCSV(csv, [], []);
  assert.equal(result.exercises.find((e) => e.id === "e1").active, true);
  assert.equal(result.exercises.find((e) => e.id === "e2").active, false);
});

test("gi_only column: '1' becomes true, empty becomes false", () => {
  const csv = combinedToCSV([], [], [], [], [], [
    { id: "t1", name: "A", folderId: null, tags: [], text: "", position: "", toPosition: "", giOnly: true },
    { id: "t2", name: "B", folderId: null, tags: [], text: "", position: "", toPosition: "", giOnly: false },
  ]);
  const result = combinedFromCSV(csv, [], []);
  assert.equal(result.techniques.find((t) => t.id === "t1").giOnly, true);
  assert.equal(result.techniques.find((t) => t.id === "t2").giOnly, false);
});

test("a row with a blank/unrecognized type falls back to 'session'", () => {
  const csv = ["type,id,date,name,folder_path,tags,text", ",s1,2026-09-01,,,,mystery entry"].join("\r\n");
  const result = combinedFromCSV(csv, [], []);
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0].text, "mystery entry");
});

test("rows missing an id get a freshly generated, unique one", () => {
  const csv = [
    "type,id,date,name,folder_path,tags,text",
    "session,,2026-09-01,,,,first",
    "session,,2026-09-01,,,,second",
  ].join("\r\n");
  const result = combinedFromCSV(csv, [], []);
  assert.ok(result.sessions[0].id);
  assert.ok(result.sessions[1].id);
  assert.notEqual(result.sessions[0].id, result.sessions[1].id);
});

test("an empty CSV file returns empty collections and leaves existing folders untouched", () => {
  const result = combinedFromCSV("", folders, jitsFolders);
  assert.deepEqual(result, {
    sessions: [],
    routines: [],
    journals: [],
    folders,
    rolls: [],
    techniques: [],
    jitsFolders,
    exercises: [],
  });
});

/* ============================== JSON round trip (parseImportFile) ============================== */

test("parseImportFile: JSON round trip preserves every field, every type", () => {
  const json = JSON.stringify({ sessions, journals, routines, folders, rolls, techniques, jitsFolders, exercises });
  const result = parseImportFile("export.json", json, folders, jitsFolders);

  assert.deepEqual(result.sessions, sessions);
  assert.deepEqual(result.journals, journals);
  assert.deepEqual(result.rolls, rolls);
  assert.deepEqual(result.routines, routines);
  assert.deepEqual(result.techniques, techniques);
  assert.deepEqual(result.exercises, exercises);
});

test("parseImportFile: exercise defaults are applied (untitled name, active true, blank prescription)", () => {
  const json = JSON.stringify({ exercises: [{ id: "e1", tags: [] }] });
  const result = parseImportFile("export.json", json, [], []);
  assert.deepEqual(result.exercises[0], { id: "e1", name: "Untitled exercise", tags: [], text: "", prescription: "", active: true });
});

test("parseImportFile: exercise active:false survives, and an exercise-only JSON is recognized", () => {
  const json = JSON.stringify({ exercises: [{ id: "e1", name: "Rest day walk", tags: [], active: false }] });
  const result = parseImportFile("export.json", json, [], []);
  assert.equal(result.exercises[0].active, false);
});

test("parseImportFile: JSON round trip preserves exerciseIds on sessions and routines", () => {
  const linkedSessions = [{ id: "s1", date: "2026-09-01", title: "", tags: [], text: "Squats", exerciseIds: ["e1"] }];
  const linkedRoutines = [{ id: "r1", name: "Push A", folderId: null, tags: [], text: "Bench", exerciseIds: ["e1", "e2"] }];
  const json = JSON.stringify({ sessions: linkedSessions, routines: linkedRoutines });
  const result = parseImportFile("export.json", json, [], []);

  assert.deepEqual(result.sessions[0].exerciseIds, ["e1"]);
  assert.deepEqual(result.routines[0].exerciseIds, ["e1", "e2"]);
});

test("parseImportFile: a session/routine with no exerciseIds doesn't gain an empty one", () => {
  const json = JSON.stringify({ sessions: [{ id: "s1", tags: [], text: "" }], routines: [{ id: "r1", tags: [], text: "" }] });
  const result = parseImportFile("export.json", json, [], []);

  assert.equal("exerciseIds" in result.sessions[0], false);
  assert.equal("exerciseIds" in result.routines[0], false);
});

test("parseImportFile: routines never pick up position/toPosition/giOnly keys", () => {
  const json = JSON.stringify({ routines, folders });
  const result = parseImportFile("export.json", json, [], []);
  assert.deepEqual(Object.keys(result.routines[0]).sort(), ["folderId", "id", "name", "tags", "text"]);
});

test("parseImportFile: file extension picks the parser (case-insensitive)", () => {
  const json = JSON.stringify({ sessions });
  assert.deepEqual(parseImportFile("EXPORT.JSON", json, [], []).sessions, sessions);

  const csv = combinedToCSV(sessions, [], [], []);
  assert.deepEqual(parseImportFile("export.CSV", csv, [], []).sessions, sessions);
});

test("parseImportFile: JSON tags as a ';'-joined string are split, trimmed, and lowercased", () => {
  const json = JSON.stringify({ sessions: [{ id: "s1", date: "2026-09-01", title: "", tags: " Legs ; PUSH ", text: "" }] });
  const result = parseImportFile("export.json", json, [], []);
  assert.deepEqual(result.sessions[0].tags, ["legs", "push"]);
});

test("parseImportFile: missing name/date defaults are applied", () => {
  const json = JSON.stringify({
    routines: [{ id: "r1", folderId: null, tags: [], text: "" }],
    sessions: [{ id: "s1", tags: [], text: "" }],
  });
  const result = parseImportFile("export.json", json, [], []);
  assert.equal(result.routines[0].name, "Untitled routine");
  assert.equal(result.sessions[0].date, todayISO());
});

test("parseImportFile: mergeFolders overlays incoming folders onto existing ones by id", () => {
  const existing = [
    { id: "f1", name: "Old name", parentId: null },
    { id: "f2", name: "Keep me", parentId: null },
  ];
  const incoming = [{ id: "f1", name: "Renamed", parentId: null }];
  const json = JSON.stringify({ routines: [], folders: incoming });
  const result = parseImportFile("export.json", json, existing, []);

  assert.deepEqual(
    result.folders.sort((a, b) => a.id.localeCompare(b.id)),
    [
      { id: "f1", name: "Renamed", parentId: null },
      { id: "f2", name: "Keep me", parentId: null },
    ]
  );
});

test("parseImportFile: folders and jitsFolders merge independently", () => {
  const json = JSON.stringify({
    routines: [],
    folders: [{ id: "f1", name: "Lifting folder", parentId: null }],
    techniques: [],
    jitsFolders: [{ id: "jf1", name: "Jits folder", parentId: null }],
  });
  const result = parseImportFile("export.json", json, [], []);
  assert.equal(result.folders.length, 1);
  assert.equal(result.jitsFolders.length, 1);
  assert.equal(result.folders[0].name, "Lifting folder");
  assert.equal(result.jitsFolders[0].name, "Jits folder");
});

test("parseImportFile: a pre-jits export (no rolls/techniques/jitsFolders keys) imports cleanly", () => {
  const oldExport = JSON.stringify({ sessions, journals, routines, folders });
  const result = parseImportFile("old-export.json", oldExport, [], []);

  assert.deepEqual(result.sessions, sessions);
  assert.deepEqual(result.rolls, []);
  assert.deepEqual(result.techniques, []);
  assert.deepEqual(result.jitsFolders, []);
  assert.deepEqual(result.exercises, []);
});

test("parseImportFile: JSON with none of the known record types throws", () => {
  assert.throws(() => parseImportFile("garbage.json", JSON.stringify({ foo: 1 }), [], []));
  assert.throws(() => parseImportFile("empty.json", JSON.stringify({}), [], []));
});

test("parseImportFile: invalid JSON syntax throws rather than silently returning empty data", () => {
  assert.throws(() => parseImportFile("broken.json", "{not valid json", [], []));
});
