import { Router, type IRouter } from "express";

import { getAdminStats, isAdminStatsAuthorized } from "../services/admin-stats";

const router: IRouter = Router();

function getBearerToken(value: string | undefined): string | null {
  if (!value) return null;

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

router.get("/admin/stats", async (req, res): Promise<void> => {
  const token = getBearerToken(req.header("authorization"));

  if (!isAdminStatsAuthorized(token)) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  try {
    res.json(await getAdminStats());
  } catch (err) {
    req.log.error({ err }, "Failed to load admin stats");
    res.status(500).json({ error: "Stats unavailable." });
  }
});

export default router;
