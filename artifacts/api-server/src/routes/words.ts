import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { TransformWordBody, TransformWordResponse } from "@workspace/api-zod";

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

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `You are a linguistics assistant specializing in English morphology. 
When given an English word, return all its morphological transformations grouped by grammatical category.
Include: adjectives, adverbs, nouns (including plural forms, agent nouns, abstract nouns), verb forms (infinitive, gerund, past tense, past participle, 3rd person singular), prefixed forms (e.g. with un-, in-, dis-, re-, etc.), and any other relevant derived forms.
Do NOT include synonyms or words with different meanings — only morphological derivatives of the same root.
Respond ONLY with valid JSON in this exact format (no extra text):
{
  "groups": [
    { "category": "Category Name", "words": ["word1", "word2"] },
    ...
  ]
}
Only include groups that have at least one word. Skip categories with no valid forms.`,
      },
      {
        role: "user",
        content: `Give me all morphological transformations of the word: "${trimmedWord}"`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";

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

  const result = TransformWordResponse.parse({
    originalWord: trimmedWord,
    groups,
  });

  res.json(result);
});

export default router;
