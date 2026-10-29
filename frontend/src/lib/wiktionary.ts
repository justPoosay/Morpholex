/** A piece of text from a definition; the looked-up word in an example sentence is bold. */
export interface Run {
  text: string;
  bold?: boolean;
}

export interface Definition {
  definition: string;
  example?: Run[];
  /** For entries like "plural of lighter", the word they point to. */
  baseWord?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

export interface WordDefinition {
  word: string;
  meanings: Meaning[];
}

interface RawSection {
  partOfSpeech: string;
  definitions: { definition: string; parsedExamples?: { example: string }[] }[];
}

/** The Wiktionary page of a word, for the attribution link. */
export function wiktionaryUrl(word: string): string {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word.replace(/ /g, "_"))}`;
}

/**
 * Looks a word up in English Wiktionary's free REST API, which browsers may call directly.
 * Returns null when Wiktionary has no English entry for the word.
 */
export async function fetchDefinition(word: string, signal?: AbortSignal): Promise<WordDefinition | null> {
  const title = encodeURIComponent(word.replace(/ /g, "_"));
  const response = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${title}`, { signal });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Wiktionary answered with status ${response.status}`);

  const data = (await response.json()) as { en?: RawSection[] };
  return parse(word, data.en ?? []);
}

/** Merges sections with the same part of speech (Wiktionary splits them by etymology) and drops empty entries. */
function parse(word: string, sections: RawSection[]): WordDefinition | null {
  const order: string[] = [];
  const byPart = new Map<string, Definition[]>();

  for (const section of sections) {
    for (const raw of section.definitions) {
      const runs = htmlToRuns(raw.definition);
      const text = runs.map((run) => run.text).join("");
      if (text === "") continue;

      const example = raw.parsedExamples?.map((entry) => htmlToRuns(entry.example)).find((entryRuns) => entryRuns.length > 0);
      const definition: Definition = { definition: text, example, baseWord: formOfTarget(raw.definition) };

      if (!byPart.has(section.partOfSpeech)) {
        byPart.set(section.partOfSpeech, []);
        order.push(section.partOfSpeech);
      }
      byPart.get(section.partOfSpeech)!.push(definition);
    }
  }

  if (order.length === 0) return null;
  return { word, meanings: order.map((partOfSpeech) => ({ partOfSpeech, definitions: byPart.get(partOfSpeech)! })) };
}

/** Wiktionary's definitions are small HTML snippets; this keeps the text and the bold parts. */
function htmlToRuns(html: string): Run[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const runs: Run[] = [];

  const walk = (node: Node, bold: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      runs.push({ text: node.textContent ?? "", bold });
      return;
    }
    if (!(node instanceof Element)) return;

    const tag = node.tagName.toLowerCase();
    // Some entries carry inline <style> blocks whose CSS would otherwise show up as text.
    if (tag === "style" || tag === "script") return;

    const childBold = bold || tag === "b" || tag === "strong";
    node.childNodes.forEach((child) => walk(child, childBold));
  };
  doc.body.childNodes.forEach((child) => walk(child, false));

  return tidy(runs);
}

/** Collapses runs of whitespace (also across runs), trims the ends and merges neighbours of the same weight. */
function tidy(runs: Run[]): Run[] {
  const result: Run[] = [];
  let lastWasSpace: boolean = true;

  for (const run of runs) {
    const text = run.text.replace(/\s+/g, " ");
    // A space right after another space (even in the previous run) is dropped.
    const trimmed: string = lastWasSpace ? text.replace(/^ /, "") : text;
    if (trimmed === "") continue;
    lastWasSpace = trimmed.endsWith(" ");

    const previous = result[result.length - 1];
    if (previous && Boolean(previous.bold) === Boolean(run.bold)) {
      previous.text += trimmed;
    } else {
      result.push({ text: trimmed, bold: run.bold });
    }
  }

  const last = result[result.length - 1];
  if (last) {
    last.text = last.text.replace(/ $/, "");
    if (last.text === "") result.pop();
  }
  return result;
}

/** "plural of lighter" style entries link their base word inside a form-of-definition-link span. */
function formOfTarget(html: string): string | undefined {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector(".form-of-definition-link a")?.getAttribute("title");
  return title ? title : undefined;
}
