import { Router, type IRouter } from "express";

import { TransformWordBody } from "../api-zod";
import { trackSearchEvent, getClientIpFromHeaders } from "../services/search-tracking";
import { transformWord, WordTransformError } from "../services/transform-word";
import { validateWordQuery } from "../services/word-query";

const router: IRouter = Router();

router.post("/words/transform", async (req, res): Promise<void> => {
  const parsed = TransformWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const validated = validateWordQuery(parsed.data.word);
  if (!validated.ok) {
    res.status(400).json({ error: validated.message });
    return;
  }

  try {
    const startedAt = performance.now();
    const response = await transformWord(validated.word, req.log);
    const resultCount = response.groups.reduce((count, group) => count + group.words.length, 0);

    void trackSearchEvent(
      {
        query: validated.word,
        normalizedQuery: response.originalWord,
        found: resultCount > 0,
        resultCount,
        responseMs: Math.round(performance.now() - startedAt),
        ipAddress: getClientIpFromHeaders(
          (name) => req.header(name),
          req.ip ?? null,
        ),
        userAgent: req.header("user-agent") ?? null,
      },
      req.log,
    );

    res.json(response);
  } catch (err) {
    if (err instanceof WordTransformError) {
      res.status(err.statusCode).json({ error: err.publicMessage });
      return;
    }

    req.log.error({ err }, "Failed to transform word");
    res.status(500).json({ error: "Failed to transform word." });
  }
});

export default router;
