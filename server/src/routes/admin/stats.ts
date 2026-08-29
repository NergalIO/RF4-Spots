import { Router } from "express";
import { collectAdminStats } from "../../lib/adminStats.js";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res) => {
  const stats = await collectAdminStats();
  res.json({ stats });
});
