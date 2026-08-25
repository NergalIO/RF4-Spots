import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  emptyGuideRow,
  GUIDE_KEYS,
  isGuideKey,
  normalizeGuideRows,
  type GuideKey,
  type GuideRow,
} from "../lib/guides.js";
import { paramId } from "../lib/params.js";

export const guidesRouter = Router();

function asRows(value: unknown): GuideRow[] {
  return Array.isArray(value) ? (value as GuideRow[]) : [];
}

async function load(key: GuideKey) {
  const row = await prisma.guideDataset.findUnique({ where: { key } });
  return {
    key,
    updatedAt: row?.updatedAt.toISOString() ?? "",
    rows: asRows(row?.rows),
  };
}

guidesRouter.get("/", requireAuth, async (_req, res) => {
  const rows = await prisma.guideDataset.findMany();
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  res.setHeader("Cache-Control", "no-store");
  res.json({
    datasets: GUIDE_KEYS.map((key) => {
      const row = byKey[key];
      return {
        key,
        updatedAt: row?.updatedAt.toISOString() ?? "",
        rows: asRows(row?.rows),
      };
    }),
  });
});

guidesRouter.get("/:key", requireAuth, async (req, res) => {
  const key = paramId(req.params.key);
  if (!isGuideKey(key)) {
    res.status(404).json({ error: "Неизвестный справочник" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(await load(key));
});

guidesRouter.put("/:key", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const key = paramId(req.params.key);
  if (!isGuideKey(key)) {
    res.status(404).json({ error: "Неизвестный справочник" });
    return;
  }
  try {
    const rows = normalizeGuideRows(key, req.body?.rows ?? req.body);
    const saved = await prisma.guideDataset.upsert({
      where: { key },
      create: { key, rows },
      update: { rows },
    });
    res.json({ key, updatedAt: saved.updatedAt.toISOString(), rows });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Некорректные данные" });
  }
});

guidesRouter.post("/:key/row", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const key = paramId(req.params.key);
  if (!isGuideKey(key)) {
    res.status(404).json({ error: "Неизвестный справочник" });
    return;
  }
  const current = asRows((await prisma.guideDataset.findUnique({ where: { key } }))?.rows);
  const next = [...current, { ...emptyGuideRow(key), ...normalizeGuideRows(key, [req.body ?? {}])[0] }];
  const saved = await prisma.guideDataset.upsert({
    where: { key },
    create: { key, rows: next },
    update: { rows: next },
  });
  res.json({ key, updatedAt: saved.updatedAt.toISOString(), rows: next });
});

guidesRouter.put("/:key/row/:index", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const key = paramId(req.params.key);
  const index = Number(paramId(req.params.index));
  if (!isGuideKey(key)) {
    res.status(404).json({ error: "Неизвестный справочник" });
    return;
  }
  const current = asRows((await prisma.guideDataset.findUnique({ where: { key } }))?.rows);
  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    res.status(404).json({ error: "Строка не найдена" });
    return;
  }
  try {
    current[index] = normalizeGuideRows(key, [req.body ?? {}])[0];
    const saved = await prisma.guideDataset.upsert({
      where: { key },
      create: { key, rows: current },
      update: { rows: current },
    });
    res.json({ key, updatedAt: saved.updatedAt.toISOString(), rows: current });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Некорректные данные" });
  }
});

guidesRouter.delete("/:key/row/:index", requireAuth, requireAdmin, async (req: AuthedRequest, res) => {
  const key = paramId(req.params.key);
  const index = Number(paramId(req.params.index));
  if (!isGuideKey(key)) {
    res.status(404).json({ error: "Неизвестный справочник" });
    return;
  }
  const current = asRows((await prisma.guideDataset.findUnique({ where: { key } }))?.rows);
  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    res.status(404).json({ error: "Строка не найдена" });
    return;
  }
  current.splice(index, 1);
  const saved = await prisma.guideDataset.upsert({
    where: { key },
    create: { key, rows: current },
    update: { rows: current },
  });
  res.json({ key, updatedAt: saved.updatedAt.toISOString(), rows: current });
});
