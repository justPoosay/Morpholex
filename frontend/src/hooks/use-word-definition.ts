import { useQuery } from "@tanstack/react-query";
import { fetchDefinition } from "@/lib/wiktionary";

export type { Definition, Meaning, Run, WordDefinition } from "@/lib/wiktionary";

/**
 * The definition of a word from Wiktionary. `data` is null when Wiktionary has no entry for the
 * word, and `isError` is set when it couldn't be reached. Looked-up words are kept for the whole
 * visit, so opening the same word again is instant.
 */
export function useWordDefinition(word: string) {
  return useQuery({
    queryKey: ["definition", word],
    queryFn: ({ signal }) => fetchDefinition(word, signal),
    enabled: word !== "",
    staleTime: Infinity,
    retry: 1,
  });
}
