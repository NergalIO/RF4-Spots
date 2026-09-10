import { type ReactNode, type RefObject } from "react";

type Option = { id: string; label: string };

type Props<T extends string> = {
  open: boolean;
  onToggle: () => void;
  activeCount: number;
  slots: T[];
  unused: Option[];
  addOpen: boolean;
  addRef: RefObject<HTMLDivElement>;
  onAddOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  onAdd: (id: T) => void;
  onRemove: (id: T) => void;
  renderField: (id: T) => ReactNode;
  renderOperator: (id: T) => ReactNode;
  renderControl: (id: T) => ReactNode;
};

export function FilterSlots<T extends string>({
  open,
  onToggle,
  activeCount,
  slots,
  unused,
  addOpen,
  addRef,
  onAddOpen,
  onAdd,
  onRemove,
  renderField,
  renderOperator,
  renderControl,
}: Props<T>) {
  return (
    <div className="filters-block">
      <button type="button" className={`filters-toggle ${open ? "open" : ""}`} onClick={onToggle}>
        <span>Фильтры</span>
        {activeCount > 0 && <span className="count">{activeCount}</span>}
        <span className="filters-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="filters">
          {slots.map((id) => (
            <div key={id} className="filter-row filter-rule">
              {renderField(id)}
              {renderOperator(id)}
              <div className="filter-value">{renderControl(id)}</div>
              <button type="button" className="filter-remove" onClick={() => onRemove(id)} aria-label="Убрать">
                ×
              </button>
            </div>
          ))}
          {unused.length > 0 && (
            <div className="filter-add-wrap" ref={addRef}>
              <button
                type="button"
                className="filter-add"
                onClick={() => onAddOpen((v) => !v)}
                aria-label="Добавить фильтр"
              >
                +
              </button>
              {addOpen && (
                <div className="filter-add-menu">
                  {unused.map((o) => (
                    <button key={o.id} type="button" onClick={() => onAdd(o.id as T)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {slots.length === 0 && unused.length > 0 && (
            <p className="filter-empty">Нажмите +, чтобы добавить фильтр</p>
          )}
        </div>
      )}
    </div>
  );
}
