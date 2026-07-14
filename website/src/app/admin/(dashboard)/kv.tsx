/**
 * Shared drawer-panel building blocks — a labeled section and a key/value
 * grid. Originally private to `lead-drawer.tsx`; extracted here so the
 * People directory's person drawer can reuse the exact same visual language
 * instead of redefining it.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-2)]">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function KVGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-[var(--gray-2)]">{key}</dt>
          <dd className="font-medium text-[var(--ink-soft)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
