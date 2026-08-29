import type { GuideKey } from "@/guideSchema";
import type { GuideRow } from "@/types";
import { GUIDE_FIELDS } from "@/guideSchema";
import { EarningsCalc } from "./EarningsCalc";
import { GearCompare } from "./GearCompare";
import { GuideTable } from "./GuideTable";
import { SpeedCalc } from "./SpeedCalc";
import { WearCalc } from "./WearCalc";
import type { ReactNode } from "react";

export type ToolId =
  | "reels"
  | "rods"
  | "hooks"
  | "wear"
  | "speed"
  | "earnings"
  | "fishWeights"
  | "alcohol"
  | "shopPrices"
  | "levels";

export const TOOLS: { id: ToolId; label: string }[] = [
  { id: "reels", label: "Сравнение катушек" },
  { id: "rods", label: "Сравнение удочек" },
  { id: "hooks", label: "Крючки" },
  { id: "wear", label: "Калькулятор износа" },
  { id: "speed", label: "Калькулятор скорости" },
  { id: "earnings", label: "Подсчёт заработка" },
  { id: "fishWeights", label: "Веса рыбы" },
  { id: "alcohol", label: "Алкоголь" },
  { id: "shopPrices", label: "Цены магазинов" },
  { id: "levels", label: "Уровни" },
];

type ToolCtx = {
  data: Partial<Record<GuideKey, GuideRow[]>>;
  canEdit: boolean;
  saving: boolean;
  error: string;
  pickedReels: number[];
  pickedRods: number[];
  togglePick: (list: number[], index: number, set: (v: number[]) => void) => void;
  setPickedReels: (v: number[]) => void;
  setPickedRods: (v: number[]) => void;
  save: (key: GuideKey, rows: GuideRow[]) => Promise<void>;
};

export function renderTool(tool: ToolId, ctx: ToolCtx): ReactNode {
  const reels = ctx.data.reels ?? [];
  const rods = ctx.data.rods ?? [];
  const hooks = ctx.data.hooks ?? [];
  if (tool === "wear") return <WearCalc reels={reels} rods={rods} hooks={hooks} />;
  if (tool === "speed") return <SpeedCalc reels={reels} />;
  if (tool === "earnings") return <EarningsCalc />;
  if (tool === "reels") {
    return (
      <GearCompare
        key="reels"
        datasetKey="reels"
        rows={reels}
        canEdit={ctx.canEdit}
        saving={ctx.saving}
        error={ctx.error}
        selected={ctx.pickedReels}
        onSelect={(i) => ctx.togglePick(ctx.pickedReels, i, ctx.setPickedReels)}
        onSave={(rows) => ctx.save("reels", rows)}
      />
    );
  }
  if (tool === "rods") {
    return (
      <GearCompare
        key="rods"
        datasetKey="rods"
        rows={rods}
        canEdit={ctx.canEdit}
        saving={ctx.saving}
        error={ctx.error}
        selected={ctx.pickedRods}
        onSelect={(i) => ctx.togglePick(ctx.pickedRods, i, ctx.setPickedRods)}
        onSave={(rows) => ctx.save("rods", rows)}
      />
    );
  }
  const key = tool as GuideKey;
  return (
    <GuideTable
      key={key}
      datasetKey={key}
      rows={ctx.data[key] ?? []}
      fields={GUIDE_FIELDS[key]}
      canEdit={ctx.canEdit}
      saving={ctx.saving}
      error={ctx.error}
      onSave={(rows) => ctx.save(key, rows)}
    />
  );
}
