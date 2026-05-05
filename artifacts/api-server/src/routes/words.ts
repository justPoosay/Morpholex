import { Router, type IRouter } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TransformWordBody, TransformWordResponse } from "@workspace/api-zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
    maxOutputTokens: 2048,
  },
});

async function generateWithRetry(prompt: string, retries = 4): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error && err.message.includes("429");
      if (isRateLimit && attempt < retries) {
        const delay = 2000 * Math.pow(2, attempt);
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

  const prompt = `You are a linguistics assistant specializing in English morphology.
List all morphological transformations of the word: "${trimmedWord}"

Include: adjectives, adverbs, nouns (plural, agent nouns, abstract nouns), verb forms (infinitive, gerund, past tense, past participle, 3rd person singular), prefixed/negative forms (un-, in-, dis-, re-, etc.), and any other derived forms sharing the same root.
Do NOT include synonyms or words with different meanings.

Respond ONLY with valid JSON in this exact structure:
{"groups":[{"category":"Category Name","words":["word1","word2"]}]}
Only include categories that have at least one word.`;

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
