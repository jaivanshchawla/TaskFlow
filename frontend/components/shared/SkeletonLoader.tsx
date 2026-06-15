export function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border"
         style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
      <div className="shimmer w-4 h-4 rounded" />
      <div className="shimmer w-2 h-2 rounded-full" />
      <div className="shimmer h-4 flex-1 rounded max-w-xs" />
      <div className="shimmer h-5 w-20 rounded-full" />
      <div className="flex gap-1 ml-auto">
        <div className="shimmer h-4 w-12 rounded-full" />
        <div className="shimmer h-4 w-14 rounded-full" />
      </div>
      <div className="shimmer w-6 h-6 rounded-full" />
      <div className="shimmer h-4 w-16 rounded" />
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="p-3 rounded-xl border" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
      <div className="shimmer h-4 w-4/5 rounded mb-2" />
      <div className="shimmer h-3 w-3/5 rounded mb-3" />
      <div className="flex items-center gap-2">
        <div className="shimmer h-4 w-12 rounded-full" />
        <div className="shimmer h-4 w-16 rounded-full" />
        <div className="shimmer w-5 h-5 rounded-full ml-auto" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 rounded-xl border" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex justify-between mb-3">
        <div className="shimmer h-3 w-24 rounded" />
        <div className="shimmer w-8 h-8 rounded-lg" />
      </div>
      <div className="shimmer h-8 w-16 rounded mb-1" />
      <div className="shimmer h-3 w-20 rounded" />
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <div className="shimmer w-7 h-7 rounded-full shrink-0" />
      <div className="flex-1">
        <div className="shimmer h-3 w-24 rounded mb-2" />
        <div className="shimmer h-3 w-full rounded mb-1" />
        <div className="shimmer h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <TaskRowSkeleton key={i} />
      ))}
    </div>
  );
}