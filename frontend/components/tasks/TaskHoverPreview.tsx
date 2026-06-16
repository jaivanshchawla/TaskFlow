"use client";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTask } from "@/hooks/useTasks";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";

interface TaskHoverPreviewProps {
  taskId: string;
  children: React.ReactNode;
}

export function TaskHoverPreview({ taskId, children }: TaskHoverPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { data: task } = useTask(taskId);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 600);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowPreview(false);
  }, []);

  const priorityOpt = PRIORITY_OPTIONS.find((p) => p.value === task?.priority);
  const statusOpt = STATUS_OPTIONS.find((s) => s.value === task?.status);
  const subtasksDone = task?.subtasks_completed ?? 0;
  const subtasksTotal = task?.subtasks_count ?? 0;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}
      <AnimatePresence>
        {showPreview && task && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-72 rounded-xl p-4 shadow-xl pointer-events-none"
            style={{
              left: "100%",
              top: 0,
              marginLeft: 8,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
          >
            <h4 className="text-xs font-semibold mb-1.5 line-clamp-2" style={{ color: "var(--text-primary)" }}>
              {task.title}
            </h4>

            {task.description && (
              <p className="text-[11px] leading-relaxed mb-2 line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mb-2">
              {statusOpt && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${statusOpt.color}15`, color: statusOpt.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusOpt.color }} />
                  {statusOpt.label}
                </span>
              )}
              {priorityOpt && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${priorityOpt.color}15`, color: priorityOpt.color }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityOpt.dotClass}`} />
                  {priorityOpt.label}
                </span>
              )}
            </div>

            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {task.labels.map((l) => (
                  <span key={l.id} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: `${l.color}15`, color: l.color }}>
                    {l.name}
                  </span>
                ))}
              </div>
            )}

            {subtasksTotal > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1 rounded-full" style={{ background: "var(--bg-overlay)" }}>
                  <div className="h-full rounded-full" style={{ background: "var(--accent)", width: `${(subtasksDone / subtasksTotal) * 100}%` }} />
                </div>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{subtasksDone}/{subtasksTotal}</span>
              </div>
            )}

            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              Updated {new Date(task.updated_at).toLocaleDateString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
