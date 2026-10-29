// Checks that typical word-formation answers are in the same family as their base word.
//
//   node scripts/check-word-families.mjs [word-families.json]
//
// Each pair is [base word, derived word]. A pair passes when both words are in the dictionary and
// in the same family. The list covers the patterns of Cambridge-style "word formation" exercises:
// adverbs, negative prefixes, nouns from verbs and adjectives, adjectives from nouns, people and
// verbs. It prints the pairs that fail and exits with an error if any do, so it can guard against
// regressions after the dictionary is rebuilt.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(process.argv[2] ?? path.join(scriptDir, "../src/data/word-families.json"));

const PAIRS = {
  "adverbs": [
    ["frequent", "frequently"], ["happy", "happily"], ["careful", "carefully"], ["possible", "possibly"],
    ["dramatic", "dramatically"], ["true", "truly"], ["whole", "wholly"], ["extreme", "extremely"],
    ["economic", "economically"], ["successful", "successfully"], ["fortunate", "fortunately"],
    ["obvious", "obviously"], ["easy", "easily"], ["comfortable", "comfortably"], ["historic", "historically"],
    ["full", "fully"], ["accidental", "accidentally"], ["angry", "angrily"],
  ],
  "negatives and prefixes": [
    ["regular", "irregular"], ["possible", "impossible"], ["legal", "illegal"], ["patient", "impatient"],
    ["responsible", "irresponsible"], ["polite", "impolite"], ["fortunate", "unfortunate"], ["usual", "unusual"],
    ["honest", "dishonest"], ["appear", "disappear"], ["agree", "disagree"], ["comfortable", "uncomfortable"],
    ["likely", "unlikely"], ["fair", "unfair"], ["lock", "unlock"], ["understand", "misunderstand"],
    ["mature", "immature"], ["logical", "illogical"], ["relevant", "irrelevant"], ["able", "unable"],
    ["convenient", "inconvenient"], ["adequate", "inadequate"], ["accurate", "inaccurate"],
    ["complete", "incomplete"], ["consider", "reconsider"], ["build", "rebuild"], ["write", "rewrite"],
    ["estimate", "overestimate"], ["courage", "encourage"], ["danger", "endanger"], ["large", "enlarge"],
    ["rich", "enrich"],
  ],
  "nouns from verbs": [
    ["decide", "decision"], ["achieve", "achievement"], ["arrive", "arrival"], ["fail", "failure"],
    ["assist", "assistance"], ["differ", "difference"], ["perform", "performance"], ["develop", "development"],
    ["create", "creation"], ["discover", "discovery"], ["inform", "information"], ["organise", "organisation"],
    ["classify", "classification"], ["explore", "exploration"], ["protect", "protection"],
    ["connect", "connection"], ["discuss", "discussion"], ["employ", "employment"], ["explain", "explanation"],
    ["prefer", "preference"], ["depend", "dependence"], ["except", "exception"], ["attract", "attraction"],
    ["compare", "comparison"], ["please", "pleasure"], ["solve", "solution"],
  ],
  "nouns from adjectives": [
    ["difficult", "difficulty"], ["safe", "safety"], ["kind", "kindness"], ["able", "ability"],
    ["free", "freedom"], ["happy", "happiness"], ["honest", "honesty"], ["possible", "possibility"],
    ["responsible", "responsibility"], ["creative", "creativity"], ["curious", "curiosity"],
    ["important", "importance"], ["frequent", "frequency"], ["violent", "violence"], ["absent", "absence"],
    ["aware", "awareness"], ["popular", "popularity"], ["real", "reality"], ["simple", "simplicity"],
    ["strong", "strength"], ["long", "length"], ["true", "truth"], ["proud", "pride"],
  ],
  "adjectives from nouns and verbs": [
    ["memory", "memorable"], ["drama", "dramatic"], ["critic", "critical"], ["artifice", "artificial"],
    ["danger", "dangerous"], ["fame", "famous"], ["nation", "national"], ["history", "historical"],
    ["economy", "economic"], ["athlete", "athletic"], ["science", "scientific"], ["nature", "natural"],
    ["hope", "hopeful"], ["care", "careless"], ["harm", "harmful"], ["profit", "profitable"],
    ["comfort", "comfortable"], ["fashion", "fashionable"], ["industry", "industrial"], ["poison", "poisonous"],
    ["courage", "courageous"], ["beauty", "beautiful"], ["success", "successful"], ["ambition", "ambitious"],
    ["victory", "victorious"], ["passion", "passionate"], ["fortune", "fortunate"], ["commerce", "commercial"],
    ["music", "musical"], ["politics", "political"], ["value", "valuable"], ["attract", "attractive"],
    ["accept", "acceptable"], ["depend", "dependent"],
  ],
  "people": [
    ["astronomy", "astronomer"], ["music", "musician"], ["politics", "politician"], ["history", "historian"],
    ["science", "scientist"], ["art", "artist"], ["philosophy", "philosopher"], ["geography", "geographer"],
    ["biology", "biologist"], ["psychology", "psychologist"], ["economy", "economist"], ["tour", "tourist"],
    ["novel", "novelist"], ["journal", "journalist"], ["electric", "electrician"], ["employ", "employer"],
    ["employ", "employee"], ["inspect", "inspector"], ["compete", "competitor"], ["visit", "visitor"],
    ["teach", "teacher"], ["create", "creator"],
  ],
  "verbs": [
    ["strong", "strengthen"], ["wide", "widen"], ["short", "shorten"], ["modern", "modernise"],
    ["simple", "simplify"], ["class", "classify"], ["real", "realise"], ["critic", "criticise"],
    ["special", "specialise"], ["beauty", "beautify"], ["length", "lengthen"], ["deep", "deepen"],
  ],
};

const { entries } = JSON.parse(await readFile(dataPath, "utf8"));

let total = 0;
let failed = 0;
for (const [group, pairs] of Object.entries(PAIRS)) {
  const failures = [];
  for (const [base, derived] of pairs) {
    total++;
    if (!entries[base] || !entries[derived]) {
      failures.push(`${base} > ${derived} (${!entries[base] ? base : derived} is not in the dictionary)`);
    } else if (entries[base] !== entries[derived]) {
      failures.push(`${base} > ${derived}`);
    }
  }
  failed += failures.length;
  console.log(`${group}: ${pairs.length - failures.length}/${pairs.length}`);
  for (const failure of failures) console.log(`    missing: ${failure}`);
}

console.log(`\n${total - failed} of ${total} pairs are in the same family.`);
process.exit(failed === 0 ? 0 : 1);
