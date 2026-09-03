export const WORD_QUERY_MAX_LENGTH = 20;
export const WORD_QUERY_RULE_MESSAGE =
  "Use up to 20 English letters and apostrophes only.";

const VALID_WORD_QUERY_PATTERN = /^[a-z]+(?:'[a-z]+)*$/;

export type WordQueryValidationResult =
  | { ok: true; word: string }
  | { ok: false; message: string };

export function validateWordQuery(value: unknown): WordQueryValidationResult {
  if (typeof value !== "string") {
    return { ok: false, message: WORD_QUERY_RULE_MESSAGE };
  }

  const word = value.trim().toLowerCase();

  if (!word || word.length > WORD_QUERY_MAX_LENGTH) {
    return { ok: false, message: WORD_QUERY_RULE_MESSAGE };
  }

  if (!VALID_WORD_QUERY_PATTERN.test(word)) {
    return { ok: false, message: WORD_QUERY_RULE_MESSAGE };
  }

  return { ok: true, word };
}
