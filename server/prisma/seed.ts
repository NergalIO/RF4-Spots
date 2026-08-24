import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

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

  console.log(`Seeded ${waterbodies.length} waterbodies and ${fish.length} fish.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
