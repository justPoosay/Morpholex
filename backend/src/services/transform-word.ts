import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

import { TransformWordResponse } from "../api-zod";

type TransformWordResult = ReturnType<typeof TransformWordResponse.parse>;

type WordTransformLogger = {
  info: (data: object, message?: string) => void;
  error: (data: object | string, message?: string) => void;
};

type WordTransformErrorOptions = {
  retryable?: boolean;
};

export class WordTransformError extends Error {
  readonly statusCode: number;
  readonly publicMessage: string;
  readonly retryable: boolean;

  constructor(
    statusCode: number,
    publicMessage: string,
    options: WordTransformErrorOptions = {},
  ) {
    super(publicMessage);
    this.name = "WordTransformError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.retryable = options.retryable ?? false;
  }
}

const TRANSFORM_ATTEMPTS = 2;
const GENERATION_RETRIES = 1;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const CACHE_MAX_ENTRIES = 250;

let model: GenerativeModel | null = null;
const transformCache = new Map<
  string,
  { result: TransformWordResult; expiresAt: number; lastAccessedAt: number }
>();
const inFlightTransforms = new Map<string, Promise<TransformWordResult>>();

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

function getCachedTransform(word: string): TransformWordResult | null {
  const entry = transformCache.get(word);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    transformCache.delete(word);
    return null;
  }

  entry.lastAccessedAt = Date.now();
  return entry.result;
}

function pruneTransformCache(): void {
  const now = Date.now();

  for (const [word, entry] of transformCache) {
    if (entry.expiresAt <= now) {
      transformCache.delete(word);
    }
  }

  while (transformCache.size > CACHE_MAX_ENTRIES) {
    let oldestWord: string | null = null;
    let oldestAccess = Number.POSITIVE_INFINITY;

    for (const [word, entry] of transformCache) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestWord = word;
        oldestAccess = entry.lastAccessedAt;
      }
    }

    if (!oldestWord) return;
    transformCache.delete(oldestWord);
  }
}

function cacheTransform(word: string, result: TransformWordResult): void {
  transformCache.set(word, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
    lastAccessedAt: Date.now(),
  });
  pruneTransformCache();
}

async function generateWithRetry(
  prompt: string,
  retries = GENERATION_RETRIES,
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await getModel().generateContent(prompt);
      return result.response.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes("429") || msg.includes("503") || msg.includes("overloaded");

      if (isRetryable && attempt < retries) {
        const delay = 750 * Math.pow(2, attempt);
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

function shouldRetryTransform(err: unknown): boolean {
  if (err instanceof WordTransformError) {
    return err.retryable;
  }

  return true;
}

async function transformWordOnce(
  trimmedWord: string,
  attempt: number,
  logger?: WordTransformLogger,
) {
  logger?.info(
    { word: trimmedWord, attempt, maxAttempts: TRANSFORM_ATTEMPTS },
    "Generating word transformations",
  );

  const rawContent = await generateWithRetry(buildPrompt(trimmedWord));

  logger?.info({ rawContent, attempt }, "AI response received");

  if (!rawContent) {
    logger?.error({ attempt }, "AI returned empty content");
    throw new WordTransformError(500, "AI returned an empty response.", {
      retryable: true,
    });
  }

  let parsedJson: { groups?: { category: string; words: string[] }[] };
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    logger?.error({ rawContent, attempt }, "Failed to parse AI response as JSON");
    throw new WordTransformError(500, "Failed to parse AI response.", {
      retryable: true,
    });
  }

  const groups = (parsedJson.groups ?? []).filter(
    (group) => Array.isArray(group.words) && group.words.length > 0,
  );

  if (groups.length === 0) {
    logger?.error({ rawContent, attempt }, "AI returned no word transformations");
    throw new WordTransformError(500, "AI did not return any word transformations.", {
      retryable: true,
    });
  }

  return TransformWordResponse.parse({ originalWord: trimmedWord, groups });
}

export async function transformWord(word: string, logger?: WordTransformLogger) {
  const trimmedWord = word.trim().toLowerCase();

  if (!trimmedWord) {
    throw new WordTransformError(400, "Word must not be empty.");
  }

  const cachedResult = getCachedTransform(trimmedWord);
  if (cachedResult) {
    logger?.info({ word: trimmedWord }, "Serving word transformations from cache");
    return cachedResult;
  }

  const inFlightTransform = inFlightTransforms.get(trimmedWord);
  if (inFlightTransform) {
    logger?.info({ word: trimmedWord }, "Reusing in-flight word transformation");
    return inFlightTransform;
  }

  const transformPromise = transformWordFresh(trimmedWord, logger);
  inFlightTransforms.set(trimmedWord, transformPromise);

  try {
    const result = await transformPromise;
    cacheTransform(trimmedWord, result);
    return result;
  } finally {
    inFlightTransforms.delete(trimmedWord);
  }
}

async function transformWordFresh(
  trimmedWord: string,
  logger?: WordTransformLogger,
): Promise<TransformWordResult> {
  for (let attempt = 1; attempt <= TRANSFORM_ATTEMPTS; attempt++) {
    try {
      return await transformWordOnce(trimmedWord, attempt, logger);
    } catch (err) {
      if (attempt < TRANSFORM_ATTEMPTS && shouldRetryTransform(err)) {
        logger?.error(
          { err, word: trimmedWord, attempt, nextAttempt: attempt + 1 },
          "Retrying word transformation after AI failure",
        );
        continue;
      }

      throw err;
    }
  }

  throw new Error("Word transformation failed unexpectedly.");
}
