// Checks Resources/quiz.json, the word formation exercises in the app.
//
//   node ios/scripts/check-quiz.mjs
//
// It exits with an error if an exercise is malformed:
//   - unique ids; a title, a level, an example and exactly 8 gaps;
//   - the text holds {0} (the example) and {1} to {8}, each once and in order;
//   - base words are in capitals; answers are lower-case words and never the base word itself.
// It also reports how many answers the word families link to their base word. That is only
// information: the quiz checks typed answers against the answers stored here, because the
// families don't know every derived word.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const quizPath = path.resolve(scriptDir, "../Resources/quiz.json");
const familiesPath = path.resolve(scriptDir, "../../backend/src/data/word-families.json");

const exercises = JSON.parse(readFileSync(quizPath, "utf8"));
const { entries } = JSON.parse(readFileSync(familiesPath, "utf8"));

const problems = [];
const ids = new Set();
let gapCount = 0;
let linked = 0;
let baseMissing = 0;
const unlinked = [];

for (const exercise of exercises) {
  const label = exercise.id ?? "(no id)";
  const problem = (message) => problems.push(`${label}: ${message}`);

  if (!exercise.id || ids.has(exercise.id)) problem("the id is missing or used twice");
  ids.add(exercise.id);
  if (!exercise.title) problem("no title");
  if (!exercise.level) problem("no level");
  if (!exercise.example?.base || !exercise.example?.answer) problem("no example");
  if (!Array.isArray(exercise.gaps) || exercise.gaps.length !== 8) problem(`needs exactly 8 gaps, has ${exercise.gaps?.length}`);

  // The markers {0} to {8}, each once and in order.
  const markers = [...(exercise.text ?? "").matchAll(/\{(\d+)\}/g)].map((match) => Number(match[1]));
  if (markers.join(",") !== "0,1,2,3,4,5,6,7,8") problem(`the markers in the text are {${markers.join("}, {")}}, expected {0} to {8} in order`);

  for (const [index, gap] of (exercise.gaps ?? []).entries()) {
    gapCount++;
    const where = `gap ${index + 1}`;
    if (!/^[A-Z]+$/.test(gap.base ?? "")) problem(`${where}: the base word must be in capitals`);
    if (!Array.isArray(gap.answers) || gap.answers.length === 0) problem(`${where}: no answers`);
    for (const answer of gap.answers ?? []) {
      if (!/^[a-z][a-z'-]*$/.test(answer)) problem(`${where}: "${answer}" must be a lower-case word`);
      if (answer === gap.base?.toLowerCase()) problem(`${where}: the answer is the base word`);
    }
    if (!gap.change) problem(`${where}: no description of what changes`);

    // Information only: does the dictionary link the answer to the base word?
    const baseFamily = entries[gap.base?.toLowerCase()];
    if (!baseFamily) baseMissing++;
    else if ((gap.answers ?? []).some((answer) => entries[answer] === baseFamily)) linked++;
    else unlinked.push(`${gap.base.toLowerCase()} > ${gap.answers[0]}`);
  }

  const words = (exercise.text ?? "").replace(/\{\d+\}/g, "").split(/\s+/).filter(Boolean).length;
  console.log(`${label.padEnd(12)} ${String(words).padStart(3)} words  ${exercise.title}`);
}

console.log(`\n${exercises.length} exercises, ${gapCount} gaps.`);
console.log(`Word families link the answer to its base word for ${linked} of ${gapCount} gaps (${baseMissing} base words are not in the dictionary).`);
if (unlinked.length > 0) {
  console.log(`Not linked (add them to backend/scripts/word-family-additions.mjs if they belong together): ${unlinked.join(", ")}`);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("No problems found.");
