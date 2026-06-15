"use client";
import { motion } from "framer-motion";
import { useStats, useTaskList } from "@/hooks/useTasks";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StatCardSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { PAGE_VARIANTS, LIST_ITEM } from "@/lib/animations";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ActivityLog } from "@/types";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="shimmer h-64 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
        <div className="shimmer h-64 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
        <div className="shimmer h-64 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
      </div>
    </div>
  );
}

const CHART_COLORS: Record<string, string> = {
  todo: "#64748b",
  in_progress: "#3b82f6",
  in_review: "#a855f7",
  done: "#10b981",
  cancelled: "#9ca3af",
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: tasksData, isLoading: tasksLoading } = useTaskList(
    { status: [], priority: [], label_ids: [], search: "", sort_by: "updated_at", sort_dir: "desc", due_today: false, overdue: false, assigned_to_me: false },
    1,
    10
  );

  if (statsLoading || tasksLoading) return <DashboardSkeleton />;
  if (!stats) return <EmptyState title="No data yet" description="Create your first task to see dashboard stats" icon="tasks" />;

  const statusData = Object.entries(stats.by_status ?? {}).map(([name, value]) => ({
    label: STATUS_OPTIONS.find(s => s.value === name)?.label ?? name,
    value,
    color: CHART_COLORS[name] ?? "#64748b",
  }));

  const priorityData = Object.entries(stats.by_priority ?? {}).map(([name, value]) => ({
    name: PRIORITY_OPTIONS.find(p => p.value === name)?.label ?? name,
    value,
  }));

  const recentTasks = tasksData?.data ?? [];
  const recentActivity: ActivityLog[] = recentTasks
    .filter((t) => t.activity_logs)
    .flatMap((t) => t.activity_logs ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status donut - Bklit PieChart */}
        <motion.div
          variants={LIST_ITEM}
          initial="initial"
          animate="animate"
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Tasks by Status
          </h3>
          {statusData.length > 0 ? (
            <div className="flex justify-center">
              <PieChart data={statusData} size={200} innerRadius={55} padAngle={0.03} cornerRadius={4}>
                {statusData.map((_, i) => (
                  <PieSlice key={i} index={i} />
                ))}
                <PieCenter defaultLabel="Total" />
              </PieChart>
            </div>
          ) : (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No data</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {statusData.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{d.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Priority bar chart - Bklit BarChart */}
        <motion.div
          variants={LIST_ITEM}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.05 }}
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Tasks by Priority
          </h3>
          {priorityData.length > 0 ? (
            <BarChart data={priorityData} xDataKey="name" aspectRatio="2 / 1">
              <Bar dataKey="value" fill="var(--chart-1)" />
            </BarChart>
          ) : (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No data</p>
          )}
        </motion.div>

        {/* Activity feed */}
        <motion.div
          variants={LIST_ITEM}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
          className="rounded-xl border p-5"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            Recent Activity
          </h3>
          {recentActivity.length > 0 ? (
            <ActivityFeed items={recentActivity} />
          ) : (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No recent activity</p>
          )}
        </motion.div>
      </div>

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
    </motion.div>
  );
}
