"use client";
import { memo, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MoreHorizontal, Pencil, Copy, CheckCircle, Trash2 } from "lucide-react";
import { isAfter, isToday, format } from "date-fns";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useDeleteTask, useUpdateTask, taskKeys } from "@/hooks/useTasks";
import { apiFetch } from "@/lib/api";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import { logger } from "@/lib/logger";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
}

export const TaskCard = memo(function TaskCard({ task }: TaskCardProps) {
  const router = useRouter();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const handlePrefetch = () => {
    queryClient.prefetchQuery({
      queryKey: taskKeys.detail(task.id),
      queryFn: async () => {
        const token = await getToken();
        const res = await apiFetch<{ success: boolean; data: Task }>(`/api/v1/tasks/${task.id}`, { token });
        return res.data;
      },
      staleTime: 30_000,
    });
  };

  const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status);
  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);

  const dueDateColor = task.due_date
    ? isAfter(new Date(), new Date(task.due_date))
      ? "text-red-400"
      : isToday(new Date(task.due_date))
        ? "text-amber-400"
        : "var(--text-muted)"
    : "var(--text-muted)";

  const handleDelete = () => {
    logger.info("TaskCard", "Deleting task", { taskId: task.id });
    deleteTask.mutate(task.id);
    setConfirmDelete(false);
  };

  const handleMarkDone = () => {
    updateTask.mutate({ id: task.id, data: { status: "done" } });
    setMenuOpen(false);
  };

  const handleDuplicate = () => {
    logger.info("TaskCard", "Duplicating task", { taskId: task.id });
    setMenuOpen(false);
    router.push(`/tasks/new?duplicate=${task.id}`);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={{ y: -1 }}
        className="group"
        onMouseEnter={handlePrefetch}
        onClick={() => router.push(`/tasks/${task.id}`)}
      >
        <div
          className="relative flex items-center gap-3 p-4 rounded-xl cursor-pointer border border-transparent group-hover:border-[var(--border-default)] transition-colors duration-200"
          style={{ background: "var(--bg-surface)" }}
        >
        {/* Priority bar */}
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ background: priorityOpt?.color }}
        />

        {/* Priority dot */}
        {task.priority === "urgent" ? (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: priorityOpt?.color }} />
        )}

        {/* Title */}
        <span className="text-sm font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
          {task.title}
        </span>

        {/* Status badge */}
        <motion.span layout className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${statusOpt?.bgClass}`}>
          {statusOpt?.label}
        </motion.span>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {task.labels.slice(0, 2).map(l => (
              <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${l.color}15`, color: l.color }}>
                {l.name}
              </span>
            ))}
            {task.labels.length > 2 && (
              <span className="text-[10px] px-1 py-0.5 rounded-full" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
                +{task.labels.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Due date */}
        {task.due_date && (
          <span className={`text-[10px] shrink-0 ${dueDateColor}`}>
            {format(new Date(task.due_date), "MMM d")}
          </span>
        )}

        {/* Menu button */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <MoreHorizontal size={14} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl p-1 shadow-xl"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {[
                    { icon: Pencil, label: "Edit", action: () => { router.push(`/tasks/${task.id}`); setMenuOpen(false); } },
                    { icon: Copy, label: "Duplicate", action: handleDuplicate },
                    { icon: CheckCircle, label: "Mark done", action: handleMarkDone },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <item.icon size={12} />
                      {item.label}
                    </button>
                  ))}
                  <div className="my-1 border-t" style={{ borderColor: "var(--border-subtle)" }} />
                  <button
                    onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-red-400"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        description={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
});
