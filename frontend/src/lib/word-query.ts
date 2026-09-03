export const WORD_QUERY_MAX_LENGTH = 20;
export const WORD_QUERY_RULE_MESSAGE =
  "Use up to 20 English letters and apostrophes only.";

const VALID_WORD_QUERY_PATTERN = /^[a-z]+(?:'[a-z]+)*$/;
const ALLOWED_WORD_QUERY_CHARS = /[^a-z']/g;

export type WordQueryValidationResult =
  | { ok: true; word: string }
  | { ok: false; message: string };

export function sanitizeWordQueryInput(value: string): string {
  return value
    .toLowerCase()
    .replace(ALLOWED_WORD_QUERY_CHARS, "")
    .slice(0, WORD_QUERY_MAX_LENGTH);
}

export function validateWordQuery(value: string): WordQueryValidationResult {
  const word = value.trim().toLowerCase();

  if (!word || word.length > WORD_QUERY_MAX_LENGTH) {
    return { ok: false, message: WORD_QUERY_RULE_MESSAGE };
  }

  if (!VALID_WORD_QUERY_PATTERN.test(word)) {
    return { ok: false, message: WORD_QUERY_RULE_MESSAGE };
  }

  return { ok: true, word };
}
