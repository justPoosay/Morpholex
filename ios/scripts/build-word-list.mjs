// Builds ios/Resources/words.tsv, the word list the iOS app uses for autocomplete.
//
//   node ios/scripts/build-word-list.mjs <count_1w.txt> [output]
//
// - Words come from the website's dictionary index (backend/src/data/word-families.json),
//   keeping only words the search box accepts: letters a-z and inner apostrophes, up to 20 characters.
// - Each word gets a popularity score from 0 to 255 so suggestions put common words first:
//     * words in the frequency list get about 10 * ln(count), which is 95 to 239;
//     * the rest get the number of related forms in their word family (at most 40),
//       so they always rank below words that appear in the frequency list.
// - The frequency list is Peter Norvig's count_1w.txt (https://norvig.com/ngrams/count_1w.txt),
//   one "word<TAB>count" per line. It is only read here; the app gets the coarse scores,
//   not the list or the counts.
//
// Output: one "word<TAB>score" per line, sorted by byte order so the app can binary-search it.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const familiesPath = path.resolve(scriptDir, "../../backend/src/data/word-families.json");

const frequencyPath = process.argv[2];
if (!frequencyPath) {
  console.error("Usage: node ios/scripts/build-word-list.mjs <count_1w.txt> [output]");
  process.exit(1);
}
const outputPath = path.resolve(process.argv[3] ?? path.join(scriptDir, "../Resources/words.tsv"));

const VALID_WORD = /^[a-z]+(?:'[a-z]+)*$/;
const MAX_LENGTH = 20;

const { entries, families } = JSON.parse(readFileSync(familiesPath, "utf8"));

const counts = new Map();
for (const line of readFileSync(frequencyPath, "utf8").split("\n")) {
  const [word, count] = line.split("\t");
  if (word && count) counts.set(word, Number(count));
}

// A word's family size is how many different forms its family lists.
const familySize = new Map();
for (const [id, family] of Object.entries(families)) {
  const forms = new Set();
  for (const group of family.groups) {
    for (const word of group.words) forms.add(word);
  }
  familySize.set(id, forms.size);
}

const rows = [];
let ranked = 0;
for (const word of Object.keys(entries)) {
  if (word.length > MAX_LENGTH || !VALID_WORD.test(word)) continue;

  const count = counts.get(word);
  let score;
  if (count) {
    score = Math.min(255, Math.round(Math.log(count) * 10));
    ranked++;
  } else {
    score = Math.min(40, familySize.get(entries[word]) ?? 1);
  }
  rows.push([word, score]);
}

rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
writeFileSync(outputPath, rows.map(([word, score]) => `${word}\t${score}`).join("\n") + "\n");

console.log(`${rows.length} words written to ${outputPath}`);
console.log(`${ranked} ranked by frequency, ${rows.length - ranked} by family size`);
