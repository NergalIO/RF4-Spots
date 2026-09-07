import { z } from "zod";
import { CATCH_TYPES } from "../catchTypes.js";

export const postBody = z.object({
  waterbodyId: z.string().min(1),
  fishId: z.string().min(1),
  coordX: z.coerce.number(),
  coordY: z.coerce.number(),
  catchType: z.enum(CATCH_TYPES),
  catchDate: z.string().min(1),
  comment: z.string().max(4000).optional().default(""),
  bait: z.string().max(120).optional().default(""),
  weightKg: z.preprocess((v) => {
    if (v == null || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }, z.number().positive().max(500).optional()),
});
