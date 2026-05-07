import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

import { TransformWordResponse } from "../api-zod";

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

let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (model) return model;

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new WordTransformError(500, "GOOGLE_AI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  });

  return model;
}

async function generateWithRetry(prompt: string, retries = 5): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await getModel().generateContent(prompt);
      return result.response.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes("429") || msg.includes("503") || msg.includes("overloaded");

      if (isRetryable && attempt < retries) {
        const delay = 1500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Max retries exceeded");
}

function buildPrompt(trimmedWord: string): string {
  return `You are an expert English morphologist at C2 level. Your task is to find ALL words that belong to the same word family as the input word.

Input word: "${trimmedWord}"

Instructions:
1. First identify the ROOT of the word (e.g. "height" -> root is "high/height"; "consideration" -> root is "consider").
2. From that root, generate EVERY possible morphological derivative including:
   - All noun forms (base noun, plural, abstract nouns, agent nouns, gerund-nouns)
   - All verb forms (base infinitive, 3rd person singular, past simple, past participle, gerund/present participle)
   - All adjective forms (base, comparative, superlative, participial adjectives)
   - All adverb forms
   - All prefixed/negative forms with common prefixes: un-, in-, im-, ir-, dis-, re-, over-, under-, mis-, non-, pre-, post-, co-, de-
   - All suffixed derivatives (e.g. -ness, -ity, -tion, -ment, -er, -or, -ist, -ism, -ful, -less, -able, -ible, -ive, -al, -ic, -ous, -ify, -ize, -en, -ly)
3. Include the input word itself in the appropriate category.
4. Be exhaustive -- think of ALL derivatives even less common ones.
5. Do NOT include true synonyms (different roots). Only include words sharing the same morphological root.

Example: for "height" you would include: height, heights, high, higher, highest, highly, highs, heighten, heightens, heightened, heightening, unhigh (if valid), on high, etc.

Respond ONLY with this exact JSON structure, no markdown:
{"groups":[{"category":"Nouns","words":["..."]},{"category":"Verbs","words":["..."]},{"category":"Adjectives","words":["..."]},{"category":"Adverbs","words":["..."]},{"category":"Prefixed / Negative Forms","words":["..."]}]}

Only include a category if it has valid words. You may add extra categories for other derivative types.`;
}

export async function transformWord(word: string, logger?: WordTransformLogger) {
  const trimmedWord = word.trim().toLowerCase();

  if (!trimmedWord) {
    throw new WordTransformError(400, "Word must not be empty.");
  }

  logger?.info({ word: trimmedWord }, "Generating word transformations");

  const rawContent = await generateWithRetry(buildPrompt(trimmedWord));

  logger?.info({ rawContent }, "AI response received");

  if (!rawContent) {
    logger?.error("AI returned empty content");
    throw new WordTransformError(500, "AI returned an empty response.");
  }

  let parsedJson: { groups?: { category: string; words: string[] }[] };
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    logger?.error({ rawContent }, "Failed to parse AI response as JSON");
    throw new WordTransformError(500, "Failed to parse AI response.");
  }

  const groups = (parsedJson.groups ?? []).filter(
    (group) => Array.isArray(group.words) && group.words.length > 0,
  );

  return TransformWordResponse.parse({ originalWord: trimmedWord, groups });
}
