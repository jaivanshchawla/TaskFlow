"use client";
import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useStats, useTaskList, useCreateTask } from "@/hooks/useTasks";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { StatCardSkeleton } from "@/components/shared/SkeletonLoader";
import { PAGE_VARIANTS, LIST_ITEM } from "@/lib/animations";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Plus, XIcon } from "lucide-react";

const ChartsRow = dynamic(() => import("./charts-row").then(m => ({ default: m.ChartsRow })), { ssr: false, loading: () => <div className="shimmer h-64 rounded-xl" /> });

interface RecentlyViewedItem {
  id: string;
  title: string;
  path: string;
}

function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("taskflow-recently-viewed");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: tasksData } = useTaskList(
    { status: [], priority: [], label_ids: [], search: "", sort_by: "updated_at", sort_dir: "desc", due_today: false, overdue: false, assigned_to_me: false },
    1,
    10
  );
  const createTask = useCreateTask();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<string>("medium");
  const [quickDueDate, setQuickDueDate] = useState("");
  const [recentlyViewed] = useState<RecentlyViewedItem[]>(() => getRecentlyViewed());

  const recentTasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  const handleQuickAdd = useCallback(() => {
    if (!quickTitle.trim()) return;
    const data: { title: string; priority: string; due_date?: string } = {
      title: quickTitle.trim(),
      priority: quickPriority,
    };
    if (quickDueDate) {
      data.due_date = new Date(quickDueDate).toISOString();
    }
    createTask.mutate(data as Parameters<typeof createTask.mutate>[0]);
    setQuickTitle("");
    setQuickPriority("medium");
    setQuickDueDate("");
    setQuickAddOpen(false);
  }, [quickTitle, quickPriority, quickDueDate, createTask]);

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Stats cards — render immediately, fill with data as it arrives */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
          </>
        ) : stats ? (
          <>
            <StatsCard
              title="Total Tasks"
              value={stats.total_tasks}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>}
              description="All time"
              delay={0}
            />
            <StatsCard
              title="Completed Today"
              value={stats.completed_today}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
              description="Finished today"
              delay={0.05}
            />
            <StatsCard
              title="Due Today"
              value={stats.due_today}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
              description="Need attention"
              delay={0.1}
            />
            <StatsCard
              title="Overdue"
              value={stats.overdue}
              icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
              description="Past due date"
              trend={stats.completion_rate_7d}
              delay={0.15}
            />
          </>
        ) : (
          <>
            {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
          </>
        )}
      </div>

      {/* Charts row — lazy loaded, independent of stats loading */}
      {!statsLoading && stats && <ChartsRow stats={stats} recentTasks={recentTasks} />}
      {statsLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="shimmer h-64 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
          <div className="shimmer h-64 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
          <div className="shimmer h-64 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
        </div>
      )}

      {/* Recently viewed from localStorage */}
      {recentlyViewed.length > 0 && (
        <motion.div
          variants={LIST_ITEM}
          initial="initial"
          animate="animate"
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Recently Viewed
            </h3>
          </div>
          <div className="space-y-1">
            {recentlyViewed.slice(0, 10).map((item) => (
              <Link
                key={item.id}
                href={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--accent-bright)" }} />
                <span className="text-sm truncate flex-1" style={{ color: "var(--text-primary)" }}>{item.title}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent tasks */}
      <motion.div
        variants={LIST_ITEM}
        initial="initial"
        animate="animate"
        className="rounded-xl border p-5"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Recent Tasks
          </h3>
          <Link href="/tasks" className="text-xs font-medium" style={{ color: "var(--accent-bright)" }}>
            View all
          </Link>
        </div>
        {recentTasks.length > 0 ? (
          <div className="space-y-1">
            {recentTasks.slice(0, 5).map((task) => {
              const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status);
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_OPTIONS.find(p => p.value === task.priority)?.color }} />
                  <span className="text-sm truncate flex-1" style={{ color: "var(--text-primary)" }}>{task.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${statusOpt?.bgClass}`}>
                    {statusOpt?.label}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                    {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
            No tasks yet.{" "}
            <Link href="/tasks/new" style={{ color: "var(--accent-bright)" }}>Create one</Link>
          </p>
        )}
      </motion.div>

      {/* Quick add FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        <AnimatePresence>
          {quickAddOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-14 right-0 w-72 p-4 rounded-xl shadow-2xl space-y-3"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Quick Add Task</p>
                <button onClick={() => setQuickAddOpen(false)} style={{ color: "var(--text-muted)" }}>
                  <XIcon size={12} />
                </button>
              </div>
              <input
                autoFocus
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                placeholder="Task title..."
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  background: "var(--bg-overlay)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
              <div className="flex gap-2">
                <select
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[10px] outline-none cursor-pointer"
                  style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={quickDueDate}
                  onChange={(e) => setQuickDueDate(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[10px] outline-none cursor-pointer"
                  style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>
              <button
                onClick={handleQuickAdd}
                disabled={!quickTitle.trim() || createTask.isPending}
                className="w-full py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                style={{
                  background: "var(--accent)",
                  color: "white",
                }}
              >
                {createTask.isPending ? "Creating..." : "Add Task"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setQuickAddOpen(!quickAddOpen)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors"
          style={{
            background: quickAddOpen ? "var(--text-muted)" : "var(--accent)",
            color: "white",
          }}
        >
          <motion.div
            animate={{ rotate: quickAddOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus size={20} />
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}
