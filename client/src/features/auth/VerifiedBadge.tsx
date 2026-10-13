export function VerifiedBadge({ verified, className = "" }: { verified: boolean; className?: string }) {
  return (
    <span
      className={`verified-badge ${verified ? "is-on" : "is-off"} ${className}`.trim()}
      title={verified ? "Подтверждён" : "Неподтверждён"}
      aria-label={verified ? "Подтверждён" : "Неподтверждён"}
    >
      {verified ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4.6 8.2l2.1 2.1 4.6-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.12" />
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.2 5.2l5.6 5.6M10.8 5.2L5.2 10.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
