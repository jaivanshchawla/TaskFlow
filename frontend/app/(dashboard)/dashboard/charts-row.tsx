"use client";
import { motion } from "motion/react";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { LIST_ITEM } from "@/lib/animations";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import type { Task, ActivityLog } from "@/types";

const CHART_COLORS: Record<string, string> = {
  todo: "#64748b",
  in_progress: "#3b82f6",
  in_review: "#a855f7",
  done: "#10b981",
  cancelled: "#9ca3af",
};

interface ChartsRowProps {
  stats: {
    by_status?: Record<string, number>;
    by_priority?: Record<string, number>;
  };
  recentTasks: Task[];
}

export function ChartsRow({ stats, recentTasks }: ChartsRowProps) {
  const statusData = Object.entries(stats.by_status ?? {}).map(([name, value]) => ({
    label: STATUS_OPTIONS.find(s => s.value === name)?.label ?? name,
    value,
    color: CHART_COLORS[name] ?? "#64748b",
  }));

  const priorityData = Object.entries(stats.by_priority ?? {}).map(([name, value]) => ({
    name: PRIORITY_OPTIONS.find(p => p.value === name)?.label ?? name,
    value,
  }));

  const recentActivity: ActivityLog[] = recentTasks
    .filter((t) => t.activity_logs)
    .flatMap((t) => t.activity_logs ?? [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Status donut */}
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

      {/* Priority bar chart */}
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
  );
}
