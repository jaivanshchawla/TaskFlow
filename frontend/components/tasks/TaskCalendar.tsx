"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  addMonths, subMonths, isSameMonth, isToday, format, isSameDay,
} from "date-fns";
import { useTaskList } from "@/hooks/useTasks";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { PAGE_VARIANTS, SPRING_SOFT } from "@/lib/animations";
import type { Task } from "@/types";

function CalendarDay({ date, currentMonth, tasks, onClick }: {
  date: Date;
  currentMonth: Date;
  tasks: Task[];
  onClick: () => void;
}) {
  const isCurrent = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const router = useRouter();

  return (
    <div
      className={`min-h-[100px] p-1.5 rounded-lg border cursor-pointer transition-colors ${
        isCurrent ? "" : "opacity-40"
      }`}
      style={{
        background: today ? "rgba(124,58,237,0.06)" : "transparent",
        borderColor: today ? "var(--accent)" : "var(--border-subtle)",
      }}
      onClick={onClick}
    >
      <p
        className={`text-xs font-medium mb-1 ${today ? "text-violet-400" : ""}`}
        style={{ color: today ? undefined : isCurrent ? "var(--text-primary)" : "var(--text-muted)" }}
      >
        {format(date, "d")}
      </p>
      <div className="space-y-0.5">
        {tasks.slice(0, 2).map((task) => {
          const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status);
          return (
            <div
              key={task.id}
              className="px-1.5 py-0.5 rounded text-[9px] font-medium truncate"
              style={{ background: `${statusOpt?.color ?? "#64748b"}15`, color: statusOpt?.color ?? "#64748b" }}
              onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${task.id}`); }}
            >
              {task.title}
            </div>
          );
        })}
        {tasks.length > 2 && (
          <p className="text-[9px] px-1" style={{ color: "var(--text-muted)" }}>
            +{tasks.length - 2} more
          </p>
        )}
      </div>
    </div>
  );
}

export function TaskCalendar() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const { data } = useTaskList(
    { status: [], priority: [], label_ids: [], search: "", sort_by: "due_date", sort_dir: "asc", due_today: false, overdue: false, assigned_to_me: false },
    1,
    200
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    (data?.data ?? []).forEach(task => {
      if (!task.due_date) return;
      const key = format(new Date(task.due_date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [data]);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const selectedDayTasks = selectedDay
    ? tasksByDate[format(selectedDay, "yyyy-MM-dd")] ?? []
    : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          <ChevronLeft size={14} />
        </button>
        <h3 className="text-sm font-semibold min-w-[140px] text-center" style={{ color: "var(--text-primary)" }}>
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider py-1" style={{ color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <CalendarDay
            key={i}
            date={d}
            currentMonth={currentMonth}
            tasks={tasksByDate[format(d, "yyyy-MM-dd")] ?? []}
            onClick={() => setSelectedDay(d)}
          />
        ))}
      </div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-xl p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {format(selectedDay, "EEEE, MMMM d, yyyy")}
              </h4>
              <button onClick={() => setSelectedDay(null)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                Close
              </button>
            </div>
            {selectedDayTasks.length === 0 ? (
              <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>No tasks due on this day</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDayTasks.map(task => {
                  const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status);
                  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priorityOpt?.color }} />
                      <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>{task.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusOpt?.bgClass}`}>{statusOpt?.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
