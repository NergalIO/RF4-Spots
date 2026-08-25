import { useEffect, useState } from "react";
import { useStore } from "../store";
import type { GuideKey } from "../guideSchema";
import { GUIDE_FIELDS } from "../guideSchema";
import type { GuideRow } from "../types";
import { GearCompare } from "./GearCompare";
import { GuideTable } from "./GuideTable";
import { SpeedCalc } from "./SpeedCalc";
import { WearCalc } from "./WearCalc";

const TOOL_KEY = "rf4spots-tools-tab";
type ToolId = "reels" | "rods" | "hooks" | "wear" | "speed" | "fishWeights" | "alcohol" | "shopPrices" | "levels";

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "reels", label: "Сравнение катушек" },
  { id: "rods", label: "Сравнение удочек" },
  { id: "hooks", label: "Крючки" },
  { id: "wear", label: "Калькулятор износа" },
  { id: "speed", label: "Калькулятор скорости" },
  { id: "fishWeights", label: "Веса рыбы" },
  { id: "alcohol", label: "Алкоголь" },
  { id: "shopPrices", label: "Цены магазинов" },
  { id: "levels", label: "Уровни" },
];

function loadTool(): ToolId {
  try {
    const v = localStorage.getItem(TOOL_KEY);
    if (TOOLS.some((t) => t.id === v)) return v as ToolId;
  } catch {
    /* ignore */
  }
  return "reels";
}

export function ToolsView({ active }: { active: boolean }) {
  const api = useStore((s) => s.api);
  const user = useStore((s) => s.user);
  const [tool, setTool] = useState<ToolId>(loadTool);
  const [data, setData] = useState<Partial<Record<GuideKey, GuideRow[]>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickedReels, setPickedReels] = useState<number[]>([]);
  const [pickedRods, setPickedRods] = useState<number[]>([]);
  const canEdit = user?.role === "admin";

  useEffect(() => {
    try {
      localStorage.setItem(TOOL_KEY, tool);
    } catch {
      /* ignore */
    }
  }, [tool]);

  useEffect(() => {
    if (!active) return;
    let dead = false;
    void api
      .guides()
      .then(({ datasets }) => {
        if (dead) return;
        const next: Partial<Record<GuideKey, GuideRow[]>> = {};
        for (const ds of datasets) next[ds.key as GuideKey] = ds.rows;
        setData(next);
        setError("");
      })
      .catch((err: Error) => {
        if (!dead) setError(err.message);
      });
    return () => {
      dead = true;
    };
  }, [active, api]);

  const reels = data.reels ?? [];
  const rods = data.rods ?? [];
  const hooks = data.hooks ?? [];

  const save = async (key: GuideKey, rows: GuideRow[]) => {
    setSaving(true);
    setError("");
    try {
      const saved = await api.saveGuide(key, rows);
      setData((prev) => ({ ...prev, [key]: saved.rows }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  function togglePick(list: number[], index: number, set: (v: number[]) => void) {
    if (list.includes(index)) set(list.filter((i) => i !== index));
    else set([...list, index].slice(-2));
  }

  let body;
  if (tool === "wear") body = <WearCalc reels={reels} rods={rods} hooks={hooks} />;
  else if (tool === "speed") body = <SpeedCalc reels={reels} />;
  else if (tool === "reels") {
    body = (
      <GearCompare
        key="reels"
        datasetKey="reels"
        rows={reels}
        canEdit={canEdit}
        saving={saving}
        error={error}
        selected={pickedReels}
        onSelect={(i) => togglePick(pickedReels, i, setPickedReels)}
        onSave={(rows) => save("reels", rows)}
      />
    );
  } else if (tool === "rods") {
    body = (
      <GearCompare
        key="rods"
        datasetKey="rods"
        rows={rods}
        canEdit={canEdit}
        saving={saving}
        error={error}
        selected={pickedRods}
        onSelect={(i) => togglePick(pickedRods, i, setPickedRods)}
        onSave={(rows) => save("rods", rows)}
      />
    );
  } else {
    const key = tool as GuideKey;
    body = (
      <GuideTable
        key={key}
        datasetKey={key}
        rows={data[key] ?? []}
        fields={GUIDE_FIELDS[key]}
        canEdit={canEdit}
        saving={saving}
        error={error}
        onSave={(rows) => save(key, rows)}
      />
    );
  }

  return (
    <div className="tools-host">
      <nav className="tools-nav" aria-label="Полезные функции">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tool === item.id ? "on" : ""}
            onClick={() => setTool(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="tools-body">
        {(tool === "wear" || tool === "speed") && error && <p className="form-error">{error}</p>}
        {body}
      </div>
    </div>
  );
}
