import { journalConcepts } from "@/lib/journal-concepts";

export function JournalConcepts({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "journal-grid journal-grid-compact" : "journal-grid"}>
    {journalConcepts.map((item, index) => (
      <article className="journal-card" key={item.id}>
        <div className={`journal-cover ${item.imageClass}`} role="img" aria-label={item.alt}>
          <span className="journal-cover-marker">{String(index + 1).padStart(2, "0")} / EDITORIAL</span>
        </div>
        <div className="journal-meta"><span>{item.category}</span><span>CHỦ ĐỀ DỰ KIẾN</span></div>
        <h3>{item.title}</h3>
        {!compact && <p>{item.summary}</p>}
      </article>
    ))}
  </div>;
}
