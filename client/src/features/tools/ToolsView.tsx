import { useEffect, useState } from "react";
import { useStore } from "@/store";
import type { GuideKey } from "@/guideSchema";
import type { GuideRow } from "@/types";
import { usePersistedTab } from "@/shared/usePersistedTab";
import { renderTool, TOOLS, type ToolId } from "./registry";

const TOOL_KEY = "rf4spots-tools-tab";
const TOOL_IDS = TOOLS.map((t) => t.id);

export function ToolsView({ active }: { active: boolean }) {
  const api = useStore((s) => s.api);
  const user = useStore((s) => s.user);
  const [tool, setTool] = usePersistedTab(TOOL_KEY, TOOL_IDS, "reels" as ToolId);
  const [data, setData] = useState<Partial<Record<GuideKey, GuideRow[]>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickedReels, setPickedReels] = useState<number[]>([]);
  const [pickedRods, setPickedRods] = useState<number[]>([]);
  const canEdit = user?.role === "admin";

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

  const body = renderTool(tool, {
    data,
    canEdit,
    saving,
    error,
    pickedReels,
    pickedRods,
    togglePick,
    setPickedReels,
    setPickedRods,
    save,
  });

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
