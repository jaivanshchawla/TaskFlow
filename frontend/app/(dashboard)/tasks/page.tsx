"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useTaskList } from "@/hooks/useTasks";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskListSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { VirtualList } from "@/components/shared/VirtualList";
import { PAGE_VARIANTS, LIST_CONTAINER } from "@/lib/animations";

export default function TasksPage() {
  const { activeFilters } = useTaskStore();
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading } = useTaskList(activeFilters, page, perPage);
  const tasks = data?.data ?? [];
  const meta = data?.meta;

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Tasks</h2>
        <Link
          href="/tasks/new"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
          style={{ background: "var(--accent)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-bright)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
        >
          <Plus size={14} />
          New task
        </Link>
      </div>

      {/* Filters */}
      <TaskFilters />

      {/* Task list */}
      {isLoading ? (
        <TaskListSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Create your first task or adjust your filters."
          actionLabel="Create task"
          onAction={() => window.location.href = "/tasks/new"}
          icon="tasks"
        />
      ) : tasks.length > 50 ? (
        <VirtualList
          items={tasks}
          itemHeight={72}
          className="space-y-2"
          renderItem={(task) => <TaskCard task={task} />}
        />
      ) : (
        <motion.ul variants={LIST_CONTAINER} initial="initial" animate="animate" className="space-y-2">
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Previous
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Page {meta.page} of {meta.total_pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))}
            disabled={page === meta.total_pages}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
          >
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
