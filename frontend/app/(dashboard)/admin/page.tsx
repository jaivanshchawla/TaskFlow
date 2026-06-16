"use client";
import { motion } from "motion/react";
import { useAdminStats } from "@/hooks/useTasks";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PAGE_VARIANTS } from "@/lib/animations";
import { StatCardSkeleton } from "@/components/shared/SkeletonLoader";
import { Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Admin Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Tasks"
          value={stats?.total_tasks ?? 0}
          icon={<CheckCircle size={20} style={{ color: "#8b5cf6" }} />}
          description="Platform-wide"
          delay={0}
        />
        <StatsCard
          title="Completed Today"
          value={stats?.completed_today ?? 0}
          icon={<Clock size={20} style={{ color: "#3b82f6" }} />}
          description="Across all users"
          delay={0.05}
        />
        <StatsCard
          title="Due Today"
          value={stats?.due_today ?? 0}
          icon={<AlertTriangle size={20} style={{ color: "#f97316" }} />}
          description="Need attention"
          delay={0.1}
        />
        <StatsCard
          title="Overdue"
          value={stats?.overdue ?? 0}
          icon={<Users size={20} style={{ color: "#ef4444" }} />}
          description="Platform-wide"
          delay={0.15}
        />
      </div>

      <div className="p-5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
          Status Distribution
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {stats?.by_status && Object.entries(stats.by_status).map(([status, count]) => (
            <div key={status} className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{count}</p>
              <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>{status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
