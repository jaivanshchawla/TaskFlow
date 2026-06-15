export const STATUS_OPTIONS = [
  { value: "todo",        label: "To Do",       color: "#64748b", bgClass: "bg-slate-500/10 text-slate-400" },
  { value: "in_progress", label: "In Progress",  color: "#3b82f6", bgClass: "bg-blue-500/10 text-blue-400" },
  { value: "in_review",   label: "In Review",    color: "#a855f7", bgClass: "bg-purple-500/10 text-purple-400" },
  { value: "done",        label: "Done",         color: "#10b981", bgClass: "bg-emerald-500/10 text-emerald-400" },
  { value: "cancelled",   label: "Cancelled",    color: "#9ca3af", bgClass: "bg-gray-500/10 text-gray-400" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#ef4444", dotClass: "bg-red-500"    },
  { value: "high",   label: "High",   color: "#f97316", dotClass: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "#eab308", dotClass: "bg-yellow-500" },
  { value: "low",    label: "Low",    color: "#94a3b8", dotClass: "bg-slate-400"  },
] as const;

export const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "updated_at", label: "Last Updated" },
  { value: "due_date",   label: "Due Date" },
  { value: "priority",   label: "Priority" },
] as const;

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

export function getStatusOption(value: string) {
  return STATUS_OPTIONS.find(s => s.value === value) ?? STATUS_OPTIONS[0];
}

export function getPriorityOption(value: string) {
  return PRIORITY_OPTIONS.find(p => p.value === value) ?? PRIORITY_OPTIONS[2];
}