import { useCallback, useState } from "react";
import { DropdownMenu } from "@/shared/DropdownMenu";
import { useBackGuard } from "@/shared/useBackGuard";
import type { Filters } from "@/types";
import { SORT_FIELDS, nextPostSort } from "./filterQuery";

export function PostSortMenu({
  filters,
  setFilters,
}: {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useBackGuard(open, close);
  const current = SORT_FIELDS.find((field) => field.id === filters.sort) ?? SORT_FIELDS[0];
  const arrow = filters.sortDir === "asc" ? "↑" : "↓";

  return (
    <DropdownMenu
      open={open}
      onClose={close}
      className="sort-menu"
      listClassName="sort-menu-list"
      trigger={
        <button
          type="button"
          className={`sort-toggle ${open ? "open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Сортировка: ${current.label}, ${filters.sortDir === "asc" ? "по возрастанию" : "по убыванию"}`}
        >
          <span className="sort-toggle-label">{current.label}</span>
          <span className="sort-toggle-dir" aria-hidden>
            {arrow}
          </span>
        </button>
      }
    >
      {SORT_FIELDS.map((field) => {
        const active = filters.sort === field.id;
        return (
          <button
            key={field.id}
            type="button"
            className={active ? "active" : ""}
            onClick={() => {
              setFilters(nextPostSort(filters.sort, filters.sortDir, field.id));
              close();
            }}
          >
            {field.label}
            {active ? ` ${arrow}` : ""}
          </button>
        );
      })}
    </DropdownMenu>
  );
}
