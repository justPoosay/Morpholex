import type { z } from "zod";

import { TransformWordResponse } from "../api-zod";
import wordFamilies from "../data/word-families.json";
import { validateWordQuery } from "./word-query";

type WordTransformLogger = {
  info: (data: object, message?: string) => void;
  error: (data: object | string, message?: string) => void;
};

export class WordTransformError extends Error {
  readonly statusCode: number;
  readonly publicMessage: string;

  constructor(statusCode: number, publicMessage: string) {
    super(publicMessage);
    this.name = "WordTransformError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

type TransformWordResult = z.infer<typeof TransformWordResponse>;
type WordGroup = TransformWordResult["groups"][number];

type WordFamilyIndex = {
  metadata: {
    source: string;
    sourceUrl: string;
    familyCount: number;
    entryCount: number;
  };
  entries: Record<string, string>;
  families: Record<string, { groups: WordGroup[] }>;
};

const dictionary = wordFamilies as WordFamilyIndex;

function normalizeWord(value: string): string {
  return value
    .replace(/_/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function dedupeGroupWords(groups: WordGroup[]): WordGroup[] {
  return groups
    .map((group) => ({
      category: group.category,
      words: [...new Set(group.words.map(normalizeWord))].filter(Boolean),
    }))
    .filter((group) => group.words.length > 0);
}

export async function transformWord(
  word: string,
  logger?: WordTransformLogger,
): Promise<TransformWordResult> {
  const validated = validateWordQuery(word);
  if (!validated.ok) {
    throw new WordTransformError(400, validated.message);
  }

  const normalizedWord = validated.word;

  const familyId = dictionary.entries[normalizedWord];
  if (!familyId) {
    logger?.info(
      {
        word: normalizedWord,
        entryCount: dictionary.metadata.entryCount,
        familyCount: dictionary.metadata.familyCount,
      },
      "No dictionary entry found for word",
    );

    return TransformWordResponse.parse({
      originalWord: normalizedWord,
      groups: [],
    });
  }

  const family = dictionary.families[familyId];
  if (!family) {
    logger?.error(
      { word: normalizedWord, familyId },
      "Dictionary entry points to a missing family",
    );
    throw new WordTransformError(500, "Dictionary index is inconsistent.");
  }

  const result = TransformWordResponse.parse({
    originalWord: normalizedWord,
    groups: dedupeGroupWords(family.groups),
  });

  logger?.info(
    {
      word: normalizedWord,
      familyId,
      groupCount: result.groups.length,
      formCount: result.groups.reduce((count, group) => count + group.words.length, 0),
    },
    "Served word transformation from dictionary index",
  );

  return result;
}
