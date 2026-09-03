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

async function fetchDefinition(word: string): Promise<WordDefinition> {
  // Definition lookup is disabled for now. Previous DictionaryAPI.dev wiring
  // lived here and can be restored when we revisit definitions.
  void word;
  throw new Error("Definition lookup disabled");
}

export function useWordDefinition() {
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const lookup = async (word: string) => {
    const cleanWord = word.trim().toLowerCase();
    setWord(cleanWord);
    setDefinition(null);
    setError(false);
    setLoading(true);
    setOpen(true);
    try {
      const result = await fetchDefinition(cleanWord);
      setDefinition(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const close = () => setOpen(false);

  return { word, definition, loading, error, open, lookup, close };
}
