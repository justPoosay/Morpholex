import OpenAI, { APIError } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

import { TransformWordResponse } from "../api-zod";

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
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-nano";
const OPENAI_TIMEOUT_MS = 20_000;
const TRANSFORM_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSFORM_CACHE_MAX_ENTRIES = 500;

type TransformWordResult = z.infer<typeof TransformWordResponse>;

let client: OpenAI | null = null;
const transformCache = new Map<
  string,
  { expiresAt: number; result: TransformWordResult }
>();
const inFlightTransforms = new Map<string, Promise<TransformWordResult>>();
const responseFormat = zodTextFormat(
  TransformWordResponse,
  "word_transform_response",
);

function getClient(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new WordTransformError(500, "OPENAI_API_KEY is not configured.");
  }

  client = new OpenAI({
    apiKey,
    maxRetries: 1,
    timeout: OPENAI_TIMEOUT_MS,
  });

  return client;
}

function getCachedTransform(word: string): TransformWordResult | null {
  const cached = transformCache.get(word);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    transformCache.delete(word);
    return null;
  }

  transformCache.delete(word);
  transformCache.set(word, cached);
  return cached.result;
}

function cacheTransform(word: string, result: TransformWordResult) {
  transformCache.set(word, {
    expiresAt: Date.now() + TRANSFORM_CACHE_TTL_MS,
    result,
  });

  while (transformCache.size > TRANSFORM_CACHE_MAX_ENTRIES) {
    const oldestKey = transformCache.keys().next().value;
    if (!oldestKey) break;
    transformCache.delete(oldestKey);
  }
}

function buildInstructions(): string {
  return `You are an expert English morphologist at C2 level. Your task is to find ALL words that belong to the same word family as the input word.

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
6. Set originalWord to the exact lowercase input word.

Example: for "height" you would include: height, heights, high, higher, highest, highly, highs, heighten, heightens, heightened, heightening, unhigh (if valid), on high, etc.

Only include a category if it has valid words. You may add extra categories for other derivative types.`;
}

async function generateTransform(trimmedWord: string) {
  const response = await getClient().responses.parse({
    model: OPENAI_MODEL,
    instructions: buildInstructions(),
    input: `Input word: "${trimmedWord}"`,
    max_output_tokens: 4096,
    reasoning: {
      effort: "low",
    },
    text: {
      format: responseFormat,
    },
  });

  return response.output_parsed;
}

function shouldRetryTransform(err: unknown): boolean {
  if (err instanceof WordTransformError) {
    return err.retryable;
  }

  if (err instanceof APIError) {
    return (
      err.status === undefined ||
      err.status === 408 ||
      err.status === 409 ||
      err.status === 429 ||
      err.status >= 500
    );
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

  const parsedResponse = await generateTransform(trimmedWord);

  logger?.info(
    { parsedResponse, attempt, model: OPENAI_MODEL },
    "AI response received",
  );

  if (!parsedResponse) {
    logger?.error({ attempt }, "AI returned empty content");
    throw new WordTransformError(500, "AI returned an empty response.", {
      retryable: true,
    });
  }

  const groups = parsedResponse.groups.filter(
    (group) => Array.isArray(group.words) && group.words.length > 0,
  );

  if (groups.length === 0) {
    logger?.error(
      { parsedResponse, attempt },
      "AI returned no word transformations",
    );
    throw new WordTransformError(
      500,
      "AI did not return any word transformations.",
      {
        retryable: true,
      },
    );
  }

  return TransformWordResponse.parse({ originalWord: trimmedWord, groups });
}

async function transformWordUncached(
  word: string,
  logger?: WordTransformLogger,
): Promise<TransformWordResult> {
  const trimmedWord = word.trim().toLowerCase();

  if (!trimmedWord) {
    throw new WordTransformError(400, "Word must not be empty.");
  }

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

export async function transformWord(
  word: string,
  logger?: WordTransformLogger,
): Promise<TransformWordResult> {
  const trimmedWord = word.trim().toLowerCase();
  const cached = getCachedTransform(trimmedWord);
  if (cached) {
    logger?.info({ word: trimmedWord }, "Serving cached word transformation");
    return cached;
  }

  const existingTransform = inFlightTransforms.get(trimmedWord);
  if (existingTransform) {
    logger?.info({ word: trimmedWord }, "Reusing in-flight word transformation");
    return existingTransform;
  }

  const transformPromise = transformWordUncached(trimmedWord, logger);
  inFlightTransforms.set(trimmedWord, transformPromise);

  try {
    const result = await transformPromise;
    cacheTransform(trimmedWord, result);
    return result;
  } finally {
    inFlightTransforms.delete(trimmedWord);
  }
}
