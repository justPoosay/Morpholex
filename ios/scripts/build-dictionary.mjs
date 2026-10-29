// Builds the two files the iOS app searches on the phone, from the website's dictionary
// index (backend/src/data/word-families.json):
//
//   ios/Resources/words.tsv       one "word<TAB>score<TAB>offset" per searchable word
//   ios/Resources/families.jsonl  one word family per line
//
//   node ios/scripts/build-dictionary.mjs <count_1w.txt> [words.tsv] [families.jsonl]
//
// words.tsv, sorted by byte order so the app can binary-search it:
//   - Only words the search box accepts: letters a-z and inner apostrophes, up to 20 characters.
//   - score (0-255) is the popularity used to order autocomplete suggestions:
//       * words in the frequency list get about 10 * ln(count), which is 95 to 239;
//       * the rest get the number of related forms in their word family (at most 40),
//         so they always rank below words that appear in the frequency list.
//     The frequency list is Peter Norvig's count_1w.txt (https://norvig.com/ngrams/count_1w.txt),
//     one "word<TAB>count" per line. It is only read here; the app gets the coarse scores,
//     not the list or the counts.
//   - offset is the byte position of the word's family line in families.jsonl.
//
// families.jsonl: each line is [words, groups] where words are the family's distinct forms and
// groups is [[category, [word numbers...]], ...]. Forms are normalized and de-duplicated
// exactly like backend/src/services/transform-word.ts does, so the app's answers match the server's.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const familiesPath = path.resolve(scriptDir, "../../backend/src/data/word-families.json");

const frequencyPath = process.argv[2];
if (!frequencyPath) {
  console.error("Usage: node ios/scripts/build-dictionary.mjs <count_1w.txt> [words.tsv] [families.jsonl]");
  process.exit(1);
}
const wordsPath = path.resolve(process.argv[3] ?? path.join(scriptDir, "../Resources/words.tsv"));
const familiesOutPath = path.resolve(process.argv[4] ?? path.join(scriptDir, "../Resources/families.jsonl"));

const VALID_WORD = /^[a-z]+(?:'[a-z]+)*$/;
const MAX_LENGTH = 20;

const { entries, families } = JSON.parse(readFileSync(familiesPath, "utf8"));

// Same as normalizeWord in transform-word.ts.
function normalizeWord(value) {
  return value.replace(/_/g, " ").trim().toLowerCase().replace(/\s+/g, " ");
}

const counts = new Map();
for (const line of readFileSync(frequencyPath, "utf8").split("\n")) {
  const [word, count] = line.split("\t");
  if (word && count) counts.set(word, Number(count));
}

const searchable = Object.keys(entries).filter((word) => word.length <= MAX_LENGTH && VALID_WORD.test(word));

// The families a searchable word can lead to, in a fixed order.
const usedFamilyIds = [...new Set(searchable.map((word) => entries[word]))].sort();

// Write each family as one line, remembering where it starts.
const offsets = new Map();
const chunks = [];
let position = 0;
const familySize = new Map();

for (const id of usedFamilyIds) {
  // Same as dedupeGroupWords in transform-word.ts.
  const groups = families[id].groups
    .map((group) => ({
      category: group.category,
      words: [...new Set(group.words.map(normalizeWord))].filter(Boolean),
    }))
    .filter((group) => group.words.length > 0);

  const forms = [];
  const formNumber = new Map();
  for (const group of groups) {
    for (const word of group.words) {
      if (!formNumber.has(word)) {
        formNumber.set(word, forms.length);
        forms.push(word);
      }
    }
  }
  familySize.set(id, forms.length);

  const line = JSON.stringify([
    forms,
    groups.map((group) => [group.category, group.words.map((word) => formNumber.get(word))]),
  ]) + "\n";

  const bytes = Buffer.from(line, "utf8");
  offsets.set(id, position);
  chunks.push(bytes);
  position += bytes.length;
}

const rows = [];
let ranked = 0;
for (const word of searchable) {
  const id = entries[word];
  const count = counts.get(word);
  let score;
  if (count) {
    score = Math.min(255, Math.round(Math.log(count) * 10));
    ranked++;
  } else {
    score = Math.min(40, familySize.get(id) || 1);
  }
  rows.push([word, score, offsets.get(id)]);
}

rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
writeFileSync(wordsPath, rows.map(([word, score, offset]) => `${word}\t${score}\t${offset}`).join("\n") + "\n");
writeFileSync(familiesOutPath, Buffer.concat(chunks));

console.log(`${rows.length} words -> ${wordsPath} (${ranked} ranked by frequency, ${rows.length - ranked} by family size)`);
console.log(`${usedFamilyIds.length} families -> ${familiesOutPath} (${(position / 1e6).toFixed(2)} MB)`);
