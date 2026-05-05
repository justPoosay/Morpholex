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
    model: "gpt-4o",
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a linguistics assistant specializing in English morphology.
When given an English word, return all its morphological transformations grouped by grammatical category.
Include: adjectives, adverbs, nouns (plural forms, agent nouns, abstract nouns), verb forms (infinitive, gerund, past tense, past participle, 3rd person singular present), prefixed/negative forms (e.g. un-, in-, dis-, re-), and any other relevant derived forms.
Do NOT include synonyms or words with different meanings — only morphological derivatives sharing the same root.
You MUST respond with valid JSON only, no markdown, no extra text. Use this exact structure:
{"groups":[{"category":"Category Name","words":["word1","word2"]}]}
Only include groups that have at least one word.`,
      },
      {
        role: "user",
        content: `List all morphological transformations of: "${trimmedWord}"`,
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "";

  req.log.info({ rawContent, finishReason: completion.choices[0]?.finish_reason }, "AI response received");

  if (!rawContent) {
    req.log.error({ completion }, "AI returned empty content");
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

  const result = TransformWordResponse.parse({
    originalWord: trimmedWord,
    groups,
  });

  res.json(result);
});

export default router;
