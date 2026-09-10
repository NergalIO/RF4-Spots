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
        {loading && <p className="changelog-status">Загрузка истории обновлений…</p>}
        {!loading && error && !entries.length && (
          <p className="changelog-status">Не удалось загрузить историю изменений с сервера.</p>
        )}
        {!loading && !!entries.length && (
          <div className="changelog-list">
            {entries.map((entry) => (
              <section key={entry.version}>
                <h3>Версия {entry.version}</h3>
                {entry.sections.map((block) => (
                  <div key={`${entry.version}-${block.title}`} className="changelog-section">
                    {block.title ? <h4>{block.title}</h4> : null}
                    <ul>
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
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
