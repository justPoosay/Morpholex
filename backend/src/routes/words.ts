import { Router, type IRouter } from "express";

import { TransformWordBody } from "../api-zod";
import { transformWord, WordTransformError } from "../services/transform-word";

const router: IRouter = Router();

router.post("/words/transform", async (req, res): Promise<void> => {
  const parsed = TransformWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const response = await transformWord(parsed.data.word, req.log);
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
