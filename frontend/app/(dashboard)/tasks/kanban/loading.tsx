export default function KanbanLoading() {
  return (
    <div className="flex gap-4 p-6 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 space-y-3">
          <div className="h-8 bg-muted animate-pulse rounded" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
