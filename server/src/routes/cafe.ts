import { Router } from "express";
import { cafeOrdersForWaterbody } from "../lib/cafeOrders.js";
import { requireAuth } from "../middleware/auth.js";

export const cafeRouter = Router();

cafeRouter.get("/orders", requireAuth, async (req, res) => {
  const waterbodyId = typeof req.query.waterbodyId === "string" ? req.query.waterbodyId : "";
  if (!waterbodyId) {
    res.status(400).json({ error: "Нужен водоём" });
    return;
  }
  const orders = await cafeOrdersForWaterbody(waterbodyId);
  res.setHeader("Cache-Control", "no-store");
  res.json(orders);
});
