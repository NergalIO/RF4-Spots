import type { GuideField } from "@/features/tools/guideSchema";
import { usesRangeFilter, usesSearchFilter } from "@/features/tools/guideSchema";
import { ValueCombobox } from "@/shared/ui/ValueCombobox";
import { FilterSlots } from "@/shared/ui/FilterSlots";
import { emptyFilter, filterActive, SELECT_MAX, type FilterValue } from "./guideTableLogic";
import type { RefObject } from "react";

type Props = {
  fields: GuideField[];
  slots: string[];
  values: Record<string, FilterValue>;
  uniqueByField: Record<string, string[]>;
  filterOpen: boolean;
  setFilterOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  addOpen: boolean;
  setAddOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  addRef: RefObject<HTMLDivElement>;
  addSlot: (key: string) => void;
  removeSlot: (key: string) => void;
  patchFilter: (key: string, patch: Partial<FilterValue>) => void;
};

export function GuideTableFilters({
  fields,
  slots,
  values,
  uniqueByField,
  filterOpen,
  setFilterOpen,
  addOpen,
  setAddOpen,
  addRef,
  addSlot,
  removeSlot,
  patchFilter,
}: Props) {
  const unusedFields = fields.filter((field) => !slots.includes(field.key));
  const activeCount = fields.filter((field) => slots.includes(field.key) && filterActive(field, values[field.key])).length;

  function renderFilterControl(key: string) {
    const field = fields.find((item) => item.key === key);
    if (!field) return null;
    const spec = values[field.key] ?? emptyFilter();
    if (usesRangeFilter(field)) {
      return (
        <div className="num-range">
          <input
            type="number"
            step="any"
            value={spec.from}
            placeholder="От"
            onChange={(e) => patchFilter(field.key, { from: e.target.value })}
            aria-label={`${field.label}, от`}
          />
          <input
            type="number"
            step="any"
            value={spec.to}
            placeholder="До"
            onChange={(e) => patchFilter(field.key, { to: e.target.value })}
            aria-label={`${field.label}, до`}
          />
        </div>
      );
    }
    if (usesSearchFilter(field)) {
      return (
        <input
          value={spec.text}
          placeholder="Поиск"
          onChange={(e) => patchFilter(field.key, { text: e.target.value })}
          aria-label={`${field.label}, поиск`}
        />
      );
    }
    const options = uniqueByField[field.key] ?? [];
    if (options.length <= SELECT_MAX) {
      return (
        <select value={spec.text} onChange={(e) => patchFilter(field.key, { text: e.target.value })}>
          <option value="">Все значения</option>
          {options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      );
    }
    return (
      <ValueCombobox
        options={options}
        value={spec.text}
        onChange={(text) => patchFilter(field.key, { text })}
        placeholder="Все значения"
        emptyLabel="Все значения"
      />
    );
  }

  return (
    <FilterSlots
      open={filterOpen}
      onToggle={() => {
        setFilterOpen((v) => !v);
        setAddOpen(false);
      }}
      activeCount={activeCount}
      slots={slots}
      unused={unusedFields.map((field) => ({ id: field.key, label: field.label }))}
      addOpen={addOpen}
      addRef={addRef}
      onAddOpen={setAddOpen}
      onAdd={addSlot}
      onRemove={removeSlot}
      labelOf={(key) => fields.find((field) => field.key === key)?.label ?? key}
      renderControl={renderFilterControl}
    />
  );
}
