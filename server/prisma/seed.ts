import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { GUIDE_KEYS, type GuideRow } from "../src/lib/guides.js";

function loadEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

type FishSeed = { name: string; waterbodies: string[] };
type WbSeed = {
  id: string;
  name: string;
  metersPerCell: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  yFlipped: boolean;
  imageFile: string;
  imageWidth: number;
  imageHeight: number;
  padLeft: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  cellPx: number;
  rf4mapLocationId: number | null;
  sortOrder: number;
  source: string;
};

const PREFIX_RE =
  /^(маховое|болонское|матчевое|фидерное|пикерное|карповое|спиннинговое|кастинговое|джерковое|морское|пилкерное|нахлыстовое|сподовое|маркерное)\s*[-–:]\s*/i;

function normGuideName(value: unknown) {
  const text = String(value ?? "")
    .replace(/ё/gi, "е")
    .replace(PREFIX_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9а-я]+/gi, " ")
    .trim();
  return text.replace(/\s+/g, " ");
}

function guideRowKey(dataset: string, row: GuideRow) {
  const name = normGuideName(row.name);
  if (dataset === "hooks") {
    const size = String(row.size ?? "")
      .toLowerCase()
      .replace(/\s+/g, "");
    return name ? `${name}|${size}` : "";
  }
  return name;
}

function asGuideRows(value: unknown): GuideRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row === "object") as GuideRow[];
}

function emptyValue(value: unknown) {
  return value == null || value === "";
}

const FILL_FIELDS: Record<string, string[]> = {
  reels: ["retrieve", "ratio", "dragKg", "price"],
  rods: ["length", "test", "price"],
  fishWeights: ["qualifyingKg", "trophyKg", "rareTrophyKg"],
  alcohol: ["price", "expPct"],
  shopPrices: ["tackleShop"],
  levels: ["xp"],
  hooks: ["strengthKg"],
};

function sparseGuide(rows: GuideRow[], fields: string[]) {
  if (!rows.length) return true;
  const hits = rows.filter((row) => fields.some((field) => !emptyValue(row[field]))).length;
  return hits / rows.length < 0.25;
}

function mergeGuideRows(dataset: string, existing: GuideRow[], seeded: GuideRow[]): GuideRow[] {
  const out = existing.map((row) => ({ ...row }));
  const index = new Map<string, number>();
  out.forEach((row, i) => {
    const key = guideRowKey(dataset, row);
    if (key) index.set(key, i);
  });
  for (const src of seeded) {
    const key = guideRowKey(dataset, src);
    if (!key) continue;
    const i = index.get(key);
    if (i == null) {
      index.set(key, out.length);
      out.push({ ...src });
      continue;
    }
    const dst = out[i];
    for (const [field, value] of Object.entries(src)) {
      if (emptyValue(value)) continue;
      if (emptyValue(dst[field])) dst[field] = value;
    }
    const currentName = String(dst.name ?? "");
    const seedName = String(src.name ?? "");
    if (seedName && currentName.includes(" - ") && !seedName.includes(" - ")) {
      dst.name = seedName;
    }
  }
  return out;
}

async function main() {
  const fish: FishSeed[] = JSON.parse(
    await readFile(join(here, "seeds", "fish.json"), "utf8"),
  );
  const waterbodies: WbSeed[] = JSON.parse(
    await readFile(join(here, "seeds", "waterbodies.json"), "utf8"),
  );

  for (const wb of waterbodies) {
    await prisma.waterbody.upsert({
      where: { id: wb.id },
      create: {
        id: wb.id,
        name: wb.name,
        metersPerCell: wb.metersPerCell,
        xMin: wb.xMin,
        xMax: wb.xMax,
        yMin: wb.yMin,
        yMax: wb.yMax,
        yFlipped: wb.yFlipped,
        imageFile: wb.imageFile,
        imageWidth: wb.imageWidth,
        imageHeight: wb.imageHeight,
        padLeft: wb.padLeft,
        padTop: wb.padTop,
        padRight: wb.padRight,
        padBottom: wb.padBottom,
        cellPx: wb.cellPx,
        rf4mapLocationId: wb.rf4mapLocationId,
        sortOrder: wb.sortOrder,
        sourceUrl: wb.source,
      },
      update: {
        name: wb.name,
        metersPerCell: wb.metersPerCell,
        xMin: wb.xMin,
        xMax: wb.xMax,
        yMin: wb.yMin,
        yMax: wb.yMax,
        yFlipped: wb.yFlipped,
        imageFile: wb.imageFile,
        imageWidth: wb.imageWidth,
        imageHeight: wb.imageHeight,
        padLeft: wb.padLeft,
        padTop: wb.padTop,
        padRight: wb.padRight,
        padBottom: wb.padBottom,
        cellPx: wb.cellPx,
        rf4mapLocationId: wb.rf4mapLocationId,
        sortOrder: wb.sortOrder,
        sourceUrl: wb.source,
      },
    });
  }

  for (const f of fish) {
    await prisma.fishSpecies.upsert({
      where: { name: f.name },
      create: { name: f.name, waterbodies: f.waterbodies },
      update: { waterbodies: f.waterbodies },
    });
  }

  let guides = 0;
  for (const key of GUIDE_KEYS) {
    const file = join(here, "seeds", "guides", `${key}.json`);
    const seeded: GuideRow[] = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : [];
    const existing = await prisma.guideDataset.findUnique({ where: { key } });
    if (!existing || sparseGuide(asGuideRows(existing.rows), FILL_FIELDS[key] ?? [])) {
      if (!existing) await prisma.guideDataset.create({ data: { key, rows: seeded } });
      else await prisma.guideDataset.update({ where: { key }, data: { rows: seeded } });
      guides += 1;
      continue;
    }
    const merged = mergeGuideRows(key, asGuideRows(existing.rows), seeded);
    await prisma.guideDataset.update({
      where: { key },
      data: { rows: merged },
    });
    guides += 1;
  }

  console.log(`Seeded ${waterbodies.length} waterbodies, ${fish.length} fish and ${guides} guide datasets.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
