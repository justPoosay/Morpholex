import { useState } from "react";

export interface Definition {
  definition: string;
  example?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: Meaning[];
}

interface ApiEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

async function fetchDefinition(word: string): Promise<WordDefinition> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
  );
  if (!res.ok) throw new Error("No definition found");
  const data: ApiEntry[] = await res.json();
  const entry = data[0];
  const phonetic =
    entry.phonetic ??
    entry.phonetics?.find((p) => p.text)?.text;
  return {
    word: entry.word,
    phonetic,
    meanings: entry.meanings.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.slice(0, 3).map((d) => ({
        definition: d.definition,
        example: d.example,
      })),
    })),
  };
}

export function useWordDefinition() {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const lookup = async (word: string) => {
    setDefinition(null);
    setError(false);
    setLoading(true);
    setOpen(true);
    try {
      const result = await fetchDefinition(word);
      setDefinition(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const close = () => setOpen(false);

  return { definition, loading, error, open, lookup, close };
}
