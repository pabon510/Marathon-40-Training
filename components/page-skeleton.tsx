export function PageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="h-7 w-40 rounded bg-slate-200" />
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-16 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
