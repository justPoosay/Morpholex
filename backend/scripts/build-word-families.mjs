import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const defaultSourceDir = path.join(repoRoot, ".tmp-oewn");
const defaultOutputPath = path.join(
  repoRoot,
  "backend/src/data/word-families.json",
);

const sourceDir = path.resolve(process.argv[2] ?? defaultSourceDir);
const outputPath = path.resolve(process.argv[3] ?? defaultOutputPath);

const CATEGORY_BY_POS = new Map([
  ["n", "Nouns"],
  ["v", "Verbs"],
  ["a", "Adjectives"],
  ["s", "Adjectives"],
  ["r", "Adverbs"],
]);
const CATEGORY_ORDER = ["Nouns", "Verbs", "Adjectives", "Adverbs"];
const IRREGULAR_DERIVATION_FAMILIES = [
  ["long", "length"],
  ["high", "height"],
  ["wide", "width"],
  ["deep", "depth"],
  ["broad", "breadth"],
  ["strong", "strength"],
  ["warm", "warmth"],
  ["true", "truth"],
  ["young", "youth"],
  ["dead", "death"],
  ["hale", "health"],
  ["dear", "dearth"],
  ["slow", "sloth"],
  ["merry", "mirth"],
  ["weal", "wealth"],
];

const wordsByCategory = new Map();
const categoriesByWord = new Map();
const graph = new Map();
const explicitFormsByWord = new Map();
const generatedRank = new Map();
const sourceWords = new Set();
const sourceCategoryWords = new Set();

function normalizeWord(value) {
  return value
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isWordLike(value) {
  return /^[a-z][a-z' -]*[a-z]$|^[a-z]$/.test(value);
}

function normalizeCandidate(value) {
  const normalized = normalizeWord(value);
  return isWordLike(normalized) ? normalized : null;
}

function getSenseWord(senseId) {
  const markerIndex = senseId.indexOf("%");
  if (markerIndex < 0) return null;
  return normalizeCandidate(senseId.slice(0, markerIndex));
}

function addToSetMap(map, key, value) {
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  set.add(value);
}

function addGraphNode(word) {
  if (!graph.has(word)) {
    graph.set(word, new Set());
  }
}

function addGraphEdge(left, right) {
  if (!left || !right || left === right) return;
  addGraphNode(left);
  addGraphNode(right);
  graph.get(left).add(right);
  graph.get(right).add(left);
}

function addGeneratedRank(word, category, rank) {
  const key = `${category}:${word}`;
  const current = generatedRank.get(key);
  if (current === undefined || rank < current) {
    generatedRank.set(key, rank);
  }
}

function endsWithConsonantY(word) {
  return /[^aeiou]y$/.test(word);
}

function pluralizeNoun(noun) {
  if (noun.includes(" ") || noun.includes("-")) return [];
  if (looksLikeKnownPlural(noun)) return [];
  if (endsWithConsonantY(noun)) return [`${noun.slice(0, -1)}ies`];
  if (/(s|x|z|ch|sh)$/.test(noun)) return [`${noun}es`];
  return [`${noun}s`];
}

function getPossibleSingulars(noun) {
  const singulars = [];

  if (noun.endsWith("ies") && noun.length > 4) {
    singulars.push(`${noun.slice(0, -3)}y`);
  }

  if (noun.endsWith("es") && noun.length > 3) {
    singulars.push(noun.slice(0, -2));
  }

  if (noun.endsWith("s") && noun.length > 2) {
    singulars.push(noun.slice(0, -1));
  }

  return singulars;
}

function looksLikeKnownPlural(noun) {
  return getPossibleSingulars(noun).some((singular) =>
    sourceCategoryWords.has(`Nouns:${singular}`),
  );
}

function thirdPersonVerb(verb) {
  if (verb.includes(" ") || verb.includes("-")) return [];
  if (endsWithConsonantY(verb)) return [`${verb.slice(0, -1)}ies`];
  if (/(s|x|z|ch|sh|o)$/.test(verb)) return [`${verb}es`];
  return [`${verb}s`];
}

function regularPastVerb(verb) {
  if (verb.includes(" ") || verb.includes("-")) return [];
  if (verb.endsWith("e")) return [`${verb}d`];
  if (endsWithConsonantY(verb)) return [`${verb.slice(0, -1)}ied`];
  return [`${verb}ed`];
}

function gerundVerb(verb) {
  if (verb.includes(" ") || verb.includes("-")) return [];
  if (verb.endsWith("ie")) return [`${verb.slice(0, -2)}ying`];
  if (verb.endsWith("e") && !/(ee|ye|oe)$/.test(verb)) {
    return [`${verb.slice(0, -1)}ing`];
  }
  return [`${verb}ing`];
}

function unique(values) {
  return [...new Set(values)];
}

async function loadEntries() {
  const files = (await readdir(sourceDir)).filter(
    (file) => /^entries-.+\.json$/.test(file),
  );

  for (const file of files) {
    const entries = JSON.parse(await readFile(path.join(sourceDir, file), "utf8"));

    for (const [rawWord, entry] of Object.entries(entries)) {
      const word = normalizeCandidate(rawWord);
      if (!word || !entry || typeof entry !== "object") continue;

      sourceWords.add(word);
      addGraphNode(word);

      for (const [pos, posEntry] of Object.entries(entry)) {
        const category = CATEGORY_BY_POS.get(pos);
        if (!category || !posEntry || typeof posEntry !== "object") continue;

        addToSetMap(wordsByCategory, category, word);
        addToSetMap(categoriesByWord, word, category);
        sourceCategoryWords.add(`${category}:${word}`);

        const forms = Array.isArray(posEntry.form)
          ? posEntry.form.map(normalizeCandidate).filter(Boolean)
          : [];
        if (forms.length > 0) {
          explicitFormsByWord.set(`${category}:${word}`, forms);
        }

        const senses = Array.isArray(posEntry.sense) ? posEntry.sense : [];
        for (const sense of senses) {
          if (!sense || typeof sense !== "object" || typeof sense.id !== "string") {
            continue;
          }

          for (const field of [
            "derivation",
            "agent",
            "event",
            "instrument",
            "result",
          ]) {
            const relatedSenses = Array.isArray(sense[field]) ? sense[field] : [];
            for (const relatedSense of relatedSenses) {
              if (typeof relatedSense !== "string") continue;
              const relatedWord = getSenseWord(relatedSense);
              addGraphEdge(word, relatedWord);
            }
          }
        }
      }
    }
  }
}

function addIrregularDerivations() {
  for (const family of IRREGULAR_DERIVATION_FAMILIES) {
    const knownWords = family.filter((word) => categoriesByWord.has(word));

    for (let index = 1; index < knownWords.length; index++) {
      addGraphEdge(knownWords[0], knownWords[index]);
    }
  }
}

function addInflections() {
  for (const [category, words] of wordsByCategory.entries()) {
    for (const word of [...words]) {
      const explicitForms = explicitFormsByWord.get(`${category}:${word}`) ?? [];
      const inflections =
        category === "Nouns"
          ? explicitForms.length > 0
            ? explicitForms
            : pluralizeNoun(word)
          : category === "Verbs"
            ? unique([
                ...thirdPersonVerb(word),
                ...(explicitForms.length > 0 ? [] : regularPastVerb(word)),
                ...(explicitForms.some((form) => form.endsWith("ing"))
                  ? []
                  : gerundVerb(word)),
                ...explicitForms,
              ])
            : explicitForms;

      inflections.forEach((inflection, index) => {
        if (!isWordLike(inflection)) return;
        addToSetMap(wordsByCategory, category, inflection);
        addToSetMap(categoriesByWord, inflection, category);
        addGraphEdge(word, inflection);
        addGeneratedRank(inflection, category, index + 1);
      });
    }
  }
}

function chooseFamilyId(words, categoriesByWord) {
  const categoryScore = new Map([
    ["Verbs", 0],
    ["Nouns", 1],
    ["Adjectives", 2],
    ["Adverbs", 3],
  ]);

  return [...words].sort((left, right) => {
    const leftIsSource = sourceWords.has(left) ? 0 : 1;
    const rightIsSource = sourceWords.has(right) ? 0 : 1;
    const leftCategories = categoriesByWord.get(left) ?? new Set();
    const rightCategories = categoriesByWord.get(right) ?? new Set();
    const leftScore = Math.min(
      ...[...leftCategories].map((category) => categoryScore.get(category) ?? 9),
    );
    const rightScore = Math.min(
      ...[...rightCategories].map((category) => categoryScore.get(category) ?? 9),
    );

    return (
      leftIsSource - rightIsSource ||
      leftScore - rightScore ||
      left.length - right.length ||
      left.localeCompare(right)
    );
  })[0];
}

function buildIndex() {
  const visited = new Set();
  const entries = {};
  const families = {};

  for (const word of [...graph.keys()].sort()) {
    if (visited.has(word)) continue;

    const stack = [word];
    const component = new Set();
    visited.add(word);

    while (stack.length > 0) {
      const current = stack.pop();
      component.add(current);

      for (const next of graph.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        stack.push(next);
      }
    }

    const familyId = chooseFamilyId(component, categoriesByWord);
    const groups = [];

    for (const category of CATEGORY_ORDER) {
      const words = [...component].filter((candidate) =>
        categoriesByWord.get(candidate)?.has(category),
      );

      if (words.length === 0) continue;

      words.sort((left, right) => {
        const leftRank =
          left === familyId
            ? -1
            : sourceCategoryWords.has(`${category}:${left}`)
              ? 10
              : 20 + (generatedRank.get(`${category}:${left}`) ?? 99);
        const rightRank =
          right === familyId
            ? -1
            : sourceCategoryWords.has(`${category}:${right}`)
              ? 10
              : 20 + (generatedRank.get(`${category}:${right}`) ?? 99);

        return (
          leftRank - rightRank ||
          left.length - right.length ||
          left.localeCompare(right)
        );
      });

      groups.push({ category, words });
    }

    if (groups.length === 0) continue;

    families[familyId] = { groups };
    for (const familyWord of component) {
      if (categoriesByWord.has(familyWord)) {
        entries[familyWord] = familyId;
      }
    }
  }

  return {
    metadata: {
      source: "Open English WordNet 2025 JSON",
      sourceUrl: "https://en-word.net/downloads",
      familyCount: Object.keys(families).length,
      entryCount: Object.keys(entries).length,
    },
    entries: Object.fromEntries(Object.entries(entries).sort()),
    families: Object.fromEntries(Object.entries(families).sort()),
  };
}

await loadEntries();
addIrregularDerivations();
addInflections();

const index = buildIndex();
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(index)}\n`);

console.log(
  `Wrote ${index.metadata.familyCount} families and ${index.metadata.entryCount} entries to ${outputPath}`,
);
