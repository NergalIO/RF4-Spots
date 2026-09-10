import type { ChangelogEntry } from "./changelog";

export function ChangelogModal({
  title,
  entries,
  loading,
  error,
  onClose,
}: {
  title: string;
  entries: ChangelogEntry[];
  loading?: boolean;
  error?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal changelog-modal" role="dialog" aria-labelledby="changelog-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="changelog-title">{title}</h2>
        {loading && <p className="changelog-status">Загрузка истории с GitHub…</p>}
        {!loading && error && !entries.length && (
          <p className="changelog-status">Не удалось загрузить историю изменений с GitHub.</p>
        )}
        {!loading && !!entries.length && (
          <div className="changelog-list">
            {entries.map((entry) => (
              <section key={entry.version}>
                <h3>Версия {entry.version}</h3>
                <ul>
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
        <div className="row-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
