"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Task } from "@/types";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import Link from "next/link";
import { format } from "date-fns";

interface CalendarTaskPopoverProps {
  tasks: Task[];
  date: Date;
  onClose: () => void;
}

export function CalendarTaskPopover({ tasks, date, onClose }: CalendarTaskPopoverProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 4 }}
        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="absolute z-50 w-72 rounded-xl shadow-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h4 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            {format(date, "EEEE, MMM d")}
          </h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1">
          {tasks.map((task) => {
            const statusOpt = STATUS_OPTIONS.find((s) => s.value === task.status);
            const priorityOpt = PRIORITY_OPTIONS.find((p) => p.value === task.priority);
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                onClick={onClose}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: priorityOpt?.color }}
                />
                <span className="text-xs font-medium flex-1 truncate">{task.title}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${statusOpt?.bgClass}`}>
                  {statusOpt?.label}
                </span>
                {task.due_date && (
                  <span className="text-[9px] shrink-0" style={{ color: "var(--text-muted)" }}>
                    {format(new Date(task.due_date), "h:mm a")}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
