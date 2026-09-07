import { useMemo, type RefObject } from "react";
import { FishCombobox } from "@/shared/ui/FishCombobox";
import { DateRangePicker } from "@/shared/ui/DateRangePicker";
import { FilterSlots } from "@/shared/ui/FilterSlots";
import type { CatchType, Filters, Fish } from "@/types";
import type { FilterKey } from "@/shared/persist";

const FILTER_OPTIONS: { id: FilterKey; label: string }[] = [
  { id: "search", label: "Поиск" },
  { id: "fish", label: "Вид рыбы" },
  { id: "catchType", label: "Тип поимки" },
  { id: "catchDate", label: "Дата поимки" },
  { id: "uploadedDate", label: "Дата загрузки" },
  { id: "mine", label: "Только мои" },
  { id: "favorite", label: "Избранное" },
  { id: "sort", label: "Сортировка" },
];

export { FILTER_OPTIONS };

export function PostListFilters({
  open,
  setOpen,
  slots,
  addOpen,
  setAddOpen,
  addRef,
  addSlot,
  removeSlot,
  filters,
  setFilters,
  fish,
  waterbodyId,
  allMaps,
}: {
  open: boolean;
  setOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  slots: FilterKey[];
  addOpen: boolean;
  setAddOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  addRef: RefObject<HTMLDivElement>;
  addSlot: (id: FilterKey) => void;
  removeSlot: (id: FilterKey) => void;
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  fish: Fish[];
  waterbodyId: string;
  allMaps: boolean;
}) {
  const unused = useMemo(() => FILTER_OPTIONS.filter((o) => !slots.includes(o.id)), [slots]);
  const activeCount = [
    filters.q,
    filters.fishId,
    filters.catchType,
    filters.catchFrom || filters.catchTo,
    filters.uploadedFrom || filters.uploadedTo,
    filters.mine ? "1" : "",
    filters.favorite ? "1" : "",
    filters.sort !== "createdAt" ? filters.sort : "",
  ].filter(Boolean).length;

  return (
    <FilterSlots
      open={open}
      onToggle={() => {
        setOpen((v) => !v);
        setAddOpen(false);
      }}
      activeCount={activeCount}
      slots={slots}
      unused={unused}
      addOpen={addOpen}
      addRef={addRef}
      onAddOpen={setAddOpen}
      onAdd={addSlot}
      onRemove={removeSlot}
      labelOf={(id) => FILTER_OPTIONS.find((o) => o.id === id)?.label ?? id}
      renderControl={(id) => {
        if (id === "search") {
          return (
            <input value={filters.q} onChange={(e) => setFilters({ q: e.target.value })} placeholder="Текст поста или комментария" />
          );
        }
        if (id === "fish") {
          return (
            <FishCombobox
              fish={fish}
              value={filters.fishId}
              onChange={(fishId) => setFilters({ fishId })}
              placeholder="Все виды"
              allowEmpty
              waterbodyId={allMaps ? undefined : waterbodyId}
            />
          );
        }
        if (id === "catchType") {
          return (
            <select value={filters.catchType} onChange={(e) => setFilters({ catchType: e.target.value as CatchType | "" })}>
              <option value="">Все типы</option>
              <option value="farm">Фарм</option>
              <option value="trophy">Трофей</option>
              <option value="farm_trophy">Фарм с трофеями</option>
            </select>
          );
        }
        if (id === "catchDate") {
          return (
            <DateRangePicker from={filters.catchFrom} to={filters.catchTo} onChange={(catchFrom, catchTo) => setFilters({ catchFrom, catchTo })} />
          );
        }
        if (id === "uploadedDate") {
          return (
            <DateRangePicker
              from={filters.uploadedFrom}
              to={filters.uploadedTo}
              onChange={(uploadedFrom, uploadedTo) => setFilters({ uploadedFrom, uploadedTo })}
            />
          );
        }
        if (id === "mine") {
          return (
            <label className="chip">
              <input type="checkbox" checked={filters.mine} onChange={(e) => setFilters({ mine: e.target.checked })} />
              Только мои посты
            </label>
          );
        }
        if (id === "favorite") {
          return (
            <label className="chip">
              <input type="checkbox" checked={filters.favorite} onChange={(e) => setFilters({ favorite: e.target.checked })} />
              Только избранное
            </label>
          );
        }
        return (
          <select value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as "createdAt" | "catchDate" })}>
            <option value="createdAt">Сначала новые загрузки</option>
            <option value="catchDate">Сначала свежие поимки</option>
          </select>
        );
      }}
    />
  );
}
