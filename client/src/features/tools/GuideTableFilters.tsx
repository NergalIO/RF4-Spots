import type { GuideField } from "@/features/tools/guideSchema";
import { usesRangeFilter, usesSearchFilter } from "@/features/tools/guideSchema";
import { ValueCombobox } from "@/shared/ui/ValueCombobox";
import { FilterSlots } from "@/shared/ui/FilterSlots";
import { OP_LABELS, dateOpUsesRange } from "@/shared/filterOps";
import { emptyFilter, filterActive, opsForGuide, SELECT_MAX, type FilterValue } from "./guideTableLogic";
import type { FilterOp } from "@/types";
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
  changeField: (from: string, to: string) => void;
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
  changeField,
  patchFilter,
}: Props) {
  const unusedFields = fields.filter((field) => !slots.includes(field.key));
  const activeCount = fields.filter((field) => slots.includes(field.key) && filterActive(field, values[field.key])).length;

  function renderFilterControl(key: string) {
    const field = fields.find((item) => item.key === key);
    if (!field) return null;
    const spec = values[field.key] ?? emptyFilter(field);
    if (usesRangeFilter(field)) {
      if (dateOpUsesRange(spec.op)) {
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
      return (
        <input
          type="number"
          step="any"
          value={spec.from}
          placeholder="Значение"
          onChange={(e) => patchFilter(field.key, { from: e.target.value })}
          aria-label={field.label}
        />
      );
    }
    if (usesSearchFilter(field)) {
      return (
        <input
          value={spec.text}
          placeholder="Значение"
          onChange={(e) => patchFilter(field.key, { text: e.target.value })}
          aria-label={field.label}
        />
      );
    }
    const options = uniqueByField[field.key] ?? [];
    if (spec.op === "contains" || spec.op === "notContains" || options.length > SELECT_MAX) {
      if (options.length > SELECT_MAX && spec.op !== "contains" && spec.op !== "notContains") {
        return (
          <ValueCombobox
            options={options}
            value={spec.text}
            onChange={(text) => patchFilter(field.key, { text })}
            placeholder="Значение"
            emptyLabel="Значение"
          />
        );
      }
      return (
        <input
          value={spec.text}
          placeholder="Значение"
          onChange={(e) => patchFilter(field.key, { text: e.target.value })}
          aria-label={field.label}
        />
      );
    }
    return (
      <select value={spec.text} onChange={(e) => patchFilter(field.key, { text: e.target.value })}>
        <option value="">Выберите значение</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
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
      renderField={(key) => (
        <select
          className="filter-field"
          value={key}
          aria-label="Поле"
          onChange={(e) => changeField(key, e.target.value)}
        >
          {fields
            .filter((field) => field.key === key || !slots.includes(field.key))
            .map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
        </select>
      )}
      renderOperator={(key) => {
        const field = fields.find((item) => item.key === key);
        if (!field) return null;
        const spec = values[field.key] ?? emptyFilter(field);
        return (
          <select
            className="filter-op"
            value={spec.op}
            aria-label="Действие"
            onChange={(e) => patchFilter(field.key, { op: e.target.value as FilterOp, to: e.target.value === "between" ? spec.to : "" })}
          >
            {opsForGuide(field).map((op) => (
              <option key={op} value={op}>
                {OP_LABELS[op]}
              </option>
            ))}
          </select>
        );
      }}
      renderControl={renderFilterControl}
    />
  );
}
