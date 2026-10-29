// Widens the word families built by build-word-families.mjs.
//
// The families come from Open English WordNet's derivation links, which are sparse: "frequently",
// "irregular", "memorable", "astronomer" or "difficulty" each sit in a family of their own, apart from
// the words they are made from. This script links them in two ways and merges the families:
//
//   1. Hand-written sets of related words (word-family-additions.mjs). Reliable, and the only way to
//      get irregular ones ("proud" - "pride") or words where a spelling rule would also link strangers
//      ("nation" - "national", but not "pet" - "petal").
//   2. Spelling rules for the patterns that are reliable on their own:
//        adjective + ly -> adverb      (frequent -> frequently)
//        un- / in- / im- / il- / ir- + adjective   (regular -> irregular)
//        adjective + ness, -ity, -en, -ise, -ify; noun + less, ful, ist ...
//      Patterns that are too noisy (-ion, -al, -or, re-, dis- on verbs...) are left to the sets.
//
//   node scripts/widen-word-families.mjs [word-families.json] [--dry-run] [--examples] [--list=file]
//
// With no file it reads and rewrites src/data/word-families.json. Running it twice changes nothing
// the second time. --dry-run only reports what would change; --examples also prints a sample of the
// links each rule made, to spot wrong ones; --list=file writes every rule-made link to a file.
//
// To keep wrong links out:
//   - Both words must be listed in the dictionary with a matching word class.
//   - The derived word's family must be small. Words with a rich family of their own ("number",
//     "report") are almost never made from the shorter word ("numb", "port").
//   - A merge may not make a family bigger than MAX_FAMILY_SIZE forms.
//   - DENY lists words that look derived but aren't ("capable" is not "cap" + "able").

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADDITIONS } from "./word-family-additions.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const dataPath = path.resolve(
  args.find((arg) => !arg.startsWith("--")) ?? path.join(scriptDir, "../src/data/word-families.json"),
);
const dryRun = args.includes("--dry-run");
const showExamples = args.includes("--examples");
const linkListPath = args.find((arg) => arg.startsWith("--list="))?.slice("--list=".length);

const CATEGORY_ORDER = ["Nouns", "Verbs", "Adjectives", "Adverbs"];
const [N, V, A, R] = CATEGORY_ORDER;

/** A merge may not make a family bigger than this many forms. */
const MAX_FAMILY_SIZE = 80;
/** By default the derived word's own family may have at most this many forms. */
const DEFAULT_MAX_DERIVED = 6;
/** By default the base word needs at least this many letters ("pet" + "al" is not "petal"). */
const DEFAULT_MIN_BASE = 4;
/** No base word is shorter than this. */
const ABSOLUTE_MIN_BASE = 3;

/** Words that look made from a shorter word by a rule, but aren't. Add to this when a wrong link shows up. */
const DENY = new Set([
  "capable", "business", "grateful", "spanish", "cornish", "methodist", "river", "former", "inside",
  "intense", "informative", "incorporate", "immediate", "missing", "understand", "undertake", "undermine",
  "impending", "improved", "imposed", "impaired", "implanted", "mercer",
  // "unionise" is not "un" + "ionise" (it would link "ion" to "union").
  "unionise", "unionize", "unionised", "unionized", "unionising", "unionizing", "unionises", "unionizes",
  // Irregular past forms ("stood") would link "stand" to "understand".
  "understood", "undertaken", "undertook", "undergone", "underwent", "outgrown", "overridden", "overrode",
  "overtaken", "overtook", "overdone", "overthrown", "overthrew", "overgrown",
]);

// --- The rules ---------------------------------------------------------------------------------
//
// Suffix rule: a word that ends in `suffix` may be made from a word spelled like one of
// `bases(stem, word)`, where `stem` is the word without the suffix. The first candidate that is in the
// dictionary with a matching class wins, so "suitable" is linked to "suit" and not also to "suite".
// `from` are the word classes of the base and `to` those of the derived word. `minBase` is how many
// letters the base needs (DEFAULT_MIN_BASE if left out).

const doubledLetterRemoved = (stem) => (stem.length > 2 && stem.at(-1) === stem.at(-2) ? [stem.slice(0, -1)] : []);

const SUFFIX_RULES = [
  // Adverbs (and adjectives like "friendly")
  { suffix: "ily", from: [A], to: [R], minBase: 3, bases: (s) => [`${s}y`] },
  { suffix: "ically", from: [A], to: [R], minBase: 3, bases: (s) => [`${s}ic`, `${s}ical`] },
  { suffix: "ably", from: [A], to: [R], bases: (s) => [`${s}able`] },
  { suffix: "ibly", from: [A], to: [R], bases: (s) => [`${s}ible`] },
  {
    suffix: "ly",
    from: [A],
    to: [R],
    minBase: 3,
    bases: (s) => [s, `${s}e`, ...(s.endsWith("l") ? [`${s}l`] : [])], // frequent, true, full
  },
  { suffix: "ly", from: [N], to: [A], bases: (s) => [s] }, // friend -> friendly

  // Nouns from adjectives
  { suffix: "ness", from: [A], to: [N], minBase: 3, bases: (s) => [s] },
  { suffix: "iness", from: [A], to: [N], minBase: 3, bases: (s) => [`${s}y`] },
  { suffix: "ity", from: [A], to: [N], bases: (s) => [s, `${s}e`] }, // regularity, purity, creativity
  { suffix: "ility", from: [A], to: [N], minBase: 3, bases: (s) => [`${s}le`] }, // ability, possibility
  { suffix: "osity", from: [A], to: [N], bases: (s) => [`${s}ous`] },
  { suffix: "dom", from: [A], to: [N], bases: (s) => [s] }, // freedom

  // People
  // "ranger" is "range" + r, not "rang" + er, so the spelling with the final e is tried first.
  { suffix: "er", from: [V], to: [N], maxDerived: 2, bases: (s) => [`${s}e`, s, ...doubledLetterRemoved(s)] },
  { suffix: "er", from: [N], to: [N], maxDerived: 2, bases: (s) => [`${s}y`] }, // astronomy -> astronomer
  { suffix: "ist", from: [N, A], to: [N], minBase: 5, bases: (s) => [s, `${s}y`, `${s}e`, `${s}ce`] },

  // Other nouns and adjectives
  { suffix: "ification", from: [V], to: [N], bases: (s) => [`${s}ify`] },
  { suffix: "able", from: [V], to: [A], bases: (s) => [s, `${s}e`] }, // acceptable, renewable
  { suffix: "ical", from: [N], to: [A], bases: (s) => [`${s}ic`, `${s}y`, `${s}ics`] },
  { suffix: "ful", from: [N, V], to: [A], bases: (s) => [s, `${s}e`] },
  { suffix: "iful", from: [N], to: [A], bases: (s) => [`${s}y`] }, // beautiful
  { suffix: "less", from: [N], to: [A], bases: (s) => [s, `${s}e`] },
  { suffix: "ish", from: [N, A], to: [A], bases: (s) => [s] },

  // Verbs from adjectives
  { suffix: "en", from: [A], to: [V], maxDerived: 8, bases: (s) => [s, `${s}e`] }, // widen, shorten
  { suffix: "ise", from: [A], to: [V], maxDerived: 10, bases: (s) => [s, `${s}e`, `${s}y`] }, // modernise
  { suffix: "ize", from: [A], to: [V], maxDerived: 10, bases: (s) => [s, `${s}e`, `${s}y`] },
  { suffix: "ify", from: [A], to: [V], bases: (s) => [s, `${s}e`, `${s}y`] }, // simplify
];

// Prefix rule: a word that starts with `prefix` may be made from the rest of the word. `classes` are
// the word classes both words must share; `when` can restrict the next letter. Verb prefixes skip
// bases ending in -ed or -ing (`pastForms: false`): "reached" is not "re" + "ached". A negative prefix on
// an adjective is very reliable, so those words may have rich families of their own ("irresponsible",
// "irresponsibility", "irresponsibly"...).
const PREFIX_RULES = [
  { prefix: "un", classes: [A, V], minBase: 3, maxDerived: 14, pastForms: true },
  { prefix: "in", classes: [A], minBase: 3, maxDerived: 14, when: (rest) => !/^[bmplr]/.test(rest) },
  { prefix: "im", classes: [A], minBase: 3, maxDerived: 14, when: (rest) => /^[bmp]/.test(rest) },
  { prefix: "il", classes: [A], minBase: 3, maxDerived: 14, when: (rest) => rest.startsWith("l") },
  { prefix: "ir", classes: [A], minBase: 3, maxDerived: 14, when: (rest) => rest.startsWith("r") },
  { prefix: "dis", classes: [A], maxDerived: 8 },
  { prefix: "non", classes: [A, N], pastForms: true },
  { prefix: "mis", classes: [V], maxDerived: 8 },
  { prefix: "over", classes: [V, A], maxDerived: 8 },
  { prefix: "under", classes: [V, A], maxDerived: 8 },
  { prefix: "out", classes: [V], minBase: 5, maxDerived: 8 },
];

// --- Reading the families ------------------------------------------------------------------------

const index = JSON.parse(await readFile(dataPath, "utf8"));
const { entries, families } = index;

/** word -> { id, classes } for every word in a family. */
const wordInfo = new Map();
const familySize = new Map();

for (const [id, family] of Object.entries(families)) {
  const forms = new Set();
  for (const group of family.groups) {
    for (const word of group.words) {
      forms.add(word);
      let info = wordInfo.get(word);
      if (!info) {
        info = { id, classes: new Set() };
        wordInfo.set(word, info);
      }
      info.classes.add(group.category);
    }
  }
  familySize.set(id, forms.size);
}

const PLAIN_WORD = /^[a-z]+$/;

/** Plurals and "-s" verb forms aren't base words ("mans", "lights"), though "politics" and "glass" are. */
function isBaseWord(word) {
  return PLAIN_WORD.test(word) && word.length >= ABSOLUTE_MIN_BASE && !(/s$/.test(word) && !/(ss|ics|us|is)$/.test(word));
}

const overlaps = (set, classes) => classes.some((cls) => set.has(cls));

// --- Finding links -------------------------------------------------------------------------------

/** Every (base, derived) pair a rule links, as { base, derived, rule }. */
function findLinks() {
  const links = [];
  const seen = new Set();

  function consider(base, derived, rule, label, maxDerived) {
    if (base === derived || !isBaseWord(base) || base.length < (rule.minBase ?? DEFAULT_MIN_BASE)) return;
    const baseInfo = wordInfo.get(base);
    const derivedInfo = wordInfo.get(derived);
    if (!baseInfo || !derivedInfo || baseInfo.id === derivedInfo.id) return;
    if (familySize.get(derivedInfo.id) > (rule.maxDerived ?? maxDerived)) return;

    const key = `${base}>${derived}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ base, derived, rule: label });
  }

  for (const derived of [...wordInfo.keys()].sort()) {
    if (!PLAIN_WORD.test(derived) || derived.length < 5 || DENY.has(derived)) continue;
    const derivedInfo = wordInfo.get(derived);

    for (const rule of SUFFIX_RULES) {
      if (!derived.endsWith(rule.suffix) || derived.length <= rule.suffix.length + 1) continue;
      if (!overlaps(derivedInfo.classes, rule.to)) continue;

      const stem = derived.slice(0, -rule.suffix.length);
      // The first candidate that is a word of the right class is the base.
      const base = rule.bases(stem, derived).find((candidate) => {
        const info = wordInfo.get(candidate);
        return info && overlaps(info.classes, rule.from);
      });
      if (base) consider(base, derived, rule, `-${rule.suffix}`, DEFAULT_MAX_DERIVED);
    }

    for (const rule of PREFIX_RULES) {
      if (!derived.startsWith(rule.prefix)) continue;
      const rest = derived.slice(rule.prefix.length);
      if (rest.length < (rule.minBase ?? DEFAULT_MIN_BASE) || (rule.when && !rule.when(rest))) continue;
      if (!rule.pastForms && /(ed|ing)$/.test(rest) && rule.classes.includes(V)) continue;
      if (!rule.pastForms && /ed$/.test(rest)) continue;

      const baseInfo = wordInfo.get(rest);
      if (!baseInfo) continue;
      // The two words must share a class, so "dispatch" isn't linked to "patch".
      const shared = rule.classes.some((cls) => derivedInfo.classes.has(cls) && baseInfo.classes.has(cls));
      if (shared) consider(rest, derived, rule, `${rule.prefix}-`, DEFAULT_MAX_DERIVED);
    }
  }

  return links;
}

// --- Merging families ----------------------------------------------------------------------------

const parent = new Map(Object.keys(families).map((id) => [id, id]));
const mergedSize = new Map(familySize);

function find(id) {
  while (parent.get(id) !== id) {
    parent.set(id, parent.get(parent.get(id)));
    id = parent.get(id);
  }
  return id;
}

/** Merges the families of two words, unless the result would be too big. Returns true, false (already together) or "too big". */
function mergeFamilies(wordA, wordB) {
  const a = find(wordInfo.get(wordA).id);
  const b = find(wordInfo.get(wordB).id);
  if (a === b) return false;
  if (mergedSize.get(a) + mergedSize.get(b) > MAX_FAMILY_SIZE) return "too big";
  // The bigger family keeps its id.
  const [keep, drop] = mergedSize.get(a) >= mergedSize.get(b) ? [a, b] : [b, a];
  parent.set(drop, keep);
  mergedSize.set(keep, mergedSize.get(a) + mergedSize.get(b));
  return true;
}

// The hand-written sets first: they are the most reliable.
let addedBySets = 0;
let rejectedForSize = 0;
for (const set of ADDITIONS) {
  const known = set.filter((word) => wordInfo.has(word));
  for (const word of known.slice(1)) {
    const result = mergeFamilies(known[0], word);
    if (result === true) addedBySets++;
    else if (result === "too big") rejectedForSize++;
  }
}

const links = findLinks();
const applied = [];
for (const link of links) {
  const result = mergeFamilies(link.base, link.derived);
  if (result === true) applied.push(link);
  else if (result === "too big") rejectedForSize++;
}

if (linkListPath) {
  await writeFile(linkListPath, applied.map((link) => `${link.base}\t${link.derived}\t${link.rule}`).join("\n") + "\n");
}

// Build the new families.
const members = new Map();
for (const id of Object.keys(families)) {
  const root = find(id);
  if (!members.has(root)) members.set(root, []);
  members.get(root).push(id);
}

const newFamilies = {};
const newEntries = {};

for (const [root, ids] of members) {
  // The kept family first, then the others by size.
  ids.sort((x, y) => (x === root ? -1 : y === root ? 1 : familySize.get(y) - familySize.get(x) || (x < y ? -1 : 1)));

  const groups = [];
  for (const category of CATEGORY_ORDER) {
    const words = [];
    const added = new Set();
    for (const id of ids) {
      for (const group of families[id].groups) {
        if (group.category !== category) continue;
        for (const word of group.words) {
          if (!added.has(word)) {
            added.add(word);
            words.push(word);
          }
        }
      }
    }
    if (words.length > 0) groups.push({ category, words });
  }

  newFamilies[root] = { groups };
  for (const id of ids) {
    for (const group of families[id].groups) {
      for (const word of group.words) newEntries[word] = root;
    }
  }
}

// Keep every original entry, in the original order.
const orderedEntries = {};
for (const word of Object.keys(entries)) {
  orderedEntries[word] = newEntries[word] ?? entries[word];
}

// --- Report and write ----------------------------------------------------------------------------

const before = Object.keys(families).length;
const after = Object.keys(newFamilies).length;
console.log(`${addedBySets} merges from the hand-written sets, ${applied.length} from the spelling rules (${links.length} possible), ${rejectedForSize} skipped because the family would be too big.`);
console.log(`Families: ${before} -> ${after}.`);

const perRule = new Map();
for (const link of applied) perRule.set(link.rule, [...(perRule.get(link.rule) ?? []), link]);
for (const [rule, ruleLinks] of [...perRule].sort((x, y) => y[1].length - x[1].length)) {
  console.log(`  ${rule.padEnd(12)} ${ruleLinks.length}`);
  if (showExamples) {
    // A deterministic spread through the list, so a rerun shows the same examples.
    const step = Math.max(1, Math.floor(ruleLinks.length / 12));
    const sample = ruleLinks.filter((_, i) => i % step === 0).slice(0, 12);
    console.log(`      ${sample.map((link) => `${link.base} > ${link.derived}`).join(", ")}`);
  }
}

const biggest = Object.entries(newFamilies)
  .map(([id, family]) => [id, new Set(family.groups.flatMap((group) => group.words)).size])
  .sort((x, y) => y[1] - x[1])
  .slice(0, 5);
console.log(`Biggest families: ${biggest.map(([id, size]) => `${id} (${size})`).join(", ")}`);

if (dryRun) {
  console.log("Dry run: nothing written.");
} else {
  index.entries = orderedEntries;
  index.families = newFamilies;
  index.metadata = {
    ...index.metadata,
    familyCount: after,
    widening: "Hand-written sets and spelling rules, see backend/scripts/widen-word-families.mjs",
  };
  await writeFile(dataPath, JSON.stringify(index));
  console.log(`Written to ${dataPath}`);
}
