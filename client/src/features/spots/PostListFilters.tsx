import { useMemo, type RefObject } from "react";
import { FishCombobox } from "@/shared/ui/FishCombobox";
import { DateRangePicker } from "@/shared/ui/DateRangePicker";
import { FilterSlots } from "@/shared/ui/FilterSlots";
import { OP_LABELS, dateOpUsesRange } from "@/shared/filterOps";
import type { CatchType, FilterOp, Filters, Fish } from "@/types";
import type { FilterKey } from "@/shared/persist";
import { FILTER_OPTIONS, countActiveFilters, opOf, opsFor, setOp } from "./filterQuery";
import { PostSortMenu } from "./PostSortMenu";

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
  changeField,
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
  changeField: (from: FilterKey, to: FilterKey) => void;
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  fish: Fish[];
  waterbodyId: string;
  allMaps: boolean;
}) {
  const unused = useMemo(() => FILTER_OPTIONS.filter((o) => !slots.includes(o.id)), [slots]);
  const activeCount = countActiveFilters(filters, slots);

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
      renderField={(id) => (
        <select
          className="filter-field"
          value={id}
          aria-label="Поле"
          onChange={(e) => changeField(id, e.target.value as FilterKey)}
        >
          {FILTER_OPTIONS.filter((o) => o.id === id || !slots.includes(o.id)).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      renderOperator={(id) => (
        <select
          className="filter-op"
          value={opOf(filters, id)}
          aria-label="Действие"
          onChange={(e) => setFilters(setOp(id, e.target.value as FilterOp))}
        >
          {opsFor(id).map((op) => (
            <option key={op} value={op}>
              {OP_LABELS[op]}
            </option>
          ))}
        </select>
      )}
      toolbarExtra={<PostSortMenu filters={filters} setFilters={setFilters} />}
      renderControl={(id) => {
        if (id === "fish") {
          return (
            <FishCombobox
              fish={fish}
              value={filters.fishId}
              onChange={(fishId) => setFilters({ fishId })}
              placeholder="Выберите вид"
              allowEmpty
              waterbodyId={allMaps ? undefined : waterbodyId}
            />
          );
        }
        if (id === "catchType") {
          return (
            <select value={filters.catchType} onChange={(e) => setFilters({ catchType: e.target.value as CatchType | "" })}>
              <option value="">Выберите тип</option>
              <option value="farm">Фарм</option>
              <option value="trophy">Трофей</option>
              <option value="farm_trophy">Фарм с трофеями</option>
            </select>
          );
        }
        if (id === "catchDate") {
          return (
            <DateRangePicker
              mode={dateOpUsesRange(opOf(filters, "catchDate")) ? "range" : "single"}
              from={filters.catchFrom}
              to={filters.catchTo}
              onChange={(catchFrom, catchTo) => setFilters({ catchFrom, catchTo })}
            />
          );
        }
        if (id === "uploadedDate") {
          return (
            <DateRangePicker
              mode={dateOpUsesRange(opOf(filters, "uploadedDate")) ? "range" : "single"}
              from={filters.uploadedFrom}
              to={filters.uploadedTo}
              onChange={(uploadedFrom, uploadedTo) => setFilters({ uploadedFrom, uploadedTo })}
            />
          );
        }
        if (id === "mine") {
          return (
            <select
              value={filters.mine === false ? "0" : "1"}
              onChange={(e) => setFilters({ mine: e.target.value === "1" })}
            >
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          );
        }
        if (id === "favorite") {
          return (
            <select
              value={filters.favorite === false ? "0" : "1"}
              onChange={(e) => setFilters({ favorite: e.target.value === "1" })}
            >
              <option value="1">Да</option>
              <option value="0">Нет</option>
            </select>
          );
        }
        return (
          <select
            value={filters.bot === false ? "0" : "1"}
            onChange={(e) => setFilters({ bot: e.target.value === "1" })}
          >
            <option value="1">Да</option>
            <option value="0">Нет</option>
          </select>
        );
      }}
    />
  );
}
