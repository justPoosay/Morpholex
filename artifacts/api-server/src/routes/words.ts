import { Router, type IRouter } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TransformWordBody, TransformWordResponse } from "@workspace/api-zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
    maxOutputTokens: 4096,
  },
});

async function generateWithRetry(prompt: string, retries = 5): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes("429") || msg.includes("503") || msg.includes("overloaded");
      if (isRetryable && attempt < retries) {
        const delay = 1500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

const router: IRouter = Router();

router.post("/words/transform", async (req, res): Promise<void> => {
  const parsed = TransformWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { word } = parsed.data;
  const trimmedWord = word.trim().toLowerCase();

  if (!trimmedWord) {
    res.status(400).json({ error: "Word must not be empty." });
    return;
  }

  req.log.info({ word: trimmedWord }, "Generating word transformations");

  const prompt = `You are an expert English morphologist at C2 level. Your task is to find ALL words that belong to the same word family as the input word.

Input word: "${trimmedWord}"

Instructions:
1. First identify the ROOT of the word (e.g. "height" → root is "high/height"; "consideration" → root is "consider").
2. From that root, generate EVERY possible morphological derivative including:
   - All noun forms (base noun, plural, abstract nouns, agent nouns, gerund-nouns)
   - All verb forms (base infinitive, 3rd person singular, past simple, past participle, gerund/present participle)
   - All adjective forms (base, comparative, superlative, participial adjectives)
   - All adverb forms
   - All prefixed/negative forms with common prefixes: un-, in-, im-, ir-, dis-, re-, over-, under-, mis-, non-, pre-, post-, co-, de-
   - All suffixed derivatives (e.g. -ness, -ity, -tion, -ment, -er, -or, -ist, -ism, -ful, -less, -able, -ible, -ive, -al, -ic, -ous, -ify, -ize, -en, -ly)
3. Include the input word itself in the appropriate category.
4. Be exhaustive — think of ALL derivatives even less common ones.
5. Do NOT include true synonyms (different roots). Only include words sharing the same morphological root.

Example: for "height" you would include: height, heights, high, higher, highest, highly, highs, heighten, heightens, heightened, heightening, unhigh (if valid), on high, etc.

Respond ONLY with this exact JSON structure, no markdown:
{"groups":[{"category":"Nouns","words":["..."]},{"category":"Verbs","words":["..."]},{"category":"Adjectives","words":["..."]},{"category":"Adverbs","words":["..."]},{"category":"Prefixed / Negative Forms","words":["..."]}]}

Only include a category if it has valid words. You may add extra categories for other derivative types.`;

  const rawContent = await generateWithRetry(prompt);

  req.log.info({ rawContent }, "AI response received");

  if (!rawContent) {
    req.log.error("AI returned empty content");
    res.status(500).json({ error: "AI returned an empty response." });
    return;
  }

  let parsedJson: { groups?: { category: string; words: string[] }[] };
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    req.log.error({ rawContent }, "Failed to parse AI response as JSON");
    res.status(500).json({ error: "Failed to parse AI response." });
    return;
  }

  const groups = (parsedJson.groups ?? []).filter(
    (g) => Array.isArray(g.words) && g.words.length > 0
  );

  const response = TransformWordResponse.parse({ originalWord: trimmedWord, groups });
  res.json(response);
});

export default router;
