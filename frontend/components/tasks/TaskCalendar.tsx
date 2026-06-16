"use client";
import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isToday,
  format,
  isThisWeek,
  isYesterday,
  differenceInCalendarDays,
} from "date-fns";
import { useTaskList, useUpdateTask } from "@/hooks/useTasks";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { CalendarTaskPopover } from "./CalendarTaskPopover";
import { toast } from "sonner";

import type { Task } from "@/types";

type CalendarView = "month" | "week" | "agenda";

function TaskChip({
  task,
  compact,
  draggable,
  onDragStart,
}: {
  task: Task;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
}) {
  const router = useRouter();
  const statusOpt = STATUS_OPTIONS.find((s) => s.value === task.status);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task)}
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/tasks/${task.id}`);
      }}
      className={`px-1.5 rounded text-[9px] font-medium truncate cursor-pointer transition-opacity ${
        compact ? "py-0.5" : "py-0.5"
      }`}
      style={{
        background: `${statusOpt?.color ?? "#64748b"}15`,
        color: statusOpt?.color ?? "#64748b",
      }}
    >
      {task.title}
    </div>
  );
}

function CalendarDay({
  date,
  currentMonth,
  tasks,
  onClick,
  onTaskDragStart,
  onDrop,
  dropTarget,
  view,
}: {
  date: Date;
  currentMonth: Date;
  tasks: Task[];
  onClick: () => void;
  onTaskDragStart: (e: React.DragEvent, task: Task) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  dropTarget: string | null;
  view: CalendarView;
}) {
  const isCurrent = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const dateKey = format(date, "yyyy-MM-dd");
  const isDropTarget = dropTarget === dateKey;
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop(e, date);
    },
    [onDrop, date]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const maxVisible = view === "week" ? 4 : 2;
  const visibleTasks = tasks.slice(0, maxVisible);
  const overflow = tasks.length - maxVisible;

  return (
    <div
      className={`relative min-h-[100px] p-1.5 rounded-lg border cursor-pointer transition-all ${
        isCurrent ? "" : "opacity-40"
      }`}
      style={{
        background: today ? "rgba(124,58,237,0.06)" : "transparent",
        borderColor: isDropTarget ? "var(--accent)" : today ? "var(--accent)" : "var(--border-subtle)",
        boxShadow: isDropTarget ? "0 0 0 2px rgba(124,58,237,0.2)" : "none",
      }}
      onClick={onClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <p
        className={`text-xs font-medium mb-1 ${today ? "text-violet-400" : ""}`}
        style={{
          color: today ? undefined : isCurrent ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        {format(date, "d")}
      </p>
      <div className="space-y-0.5">
        {visibleTasks.map((task) => (
          <TaskChip
            key={task.id}
            task={task}
            draggable
            onDragStart={onTaskDragStart}
            compact={view === "month"}
          />
        ))}
        {overflow > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMore(true);
            }}
            className="text-[9px] px-1.5 py-0.5 rounded font-medium transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
          >
            +{overflow} more
          </button>
        )}
      </div>

      {/* Hover overlay for empty cells */}
      {tasks.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          style={{ background: "rgba(124,58,237,0.04)" }}
        >
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+</span>
        </div>
      )}

      {/* Popover for "+N more" */}
      <AnimatePresence>
        {showMore && (
          <CalendarTaskPopover
            tasks={tasks}
            date={date}
            onClose={() => setShowMore(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekView({
  currentDate,
  tasksByDate,
  onTaskDragStart,
  onDrop,
  dropTarget,
}: {
  currentDate: Date;
  tasksByDate: Record<string, Task[]>;
  onTaskDragStart: (e: React.DragEvent, task: Task) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  dropTarget: string | null;
}) {
  const router = useRouter();
  const weekStart = startOfWeek(currentDate);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-3">
      {/* Week day headers */}
      <div className="grid grid-cols-8 gap-1">
        <div className="w-12" />
        {weekDays.map((day) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="text-center">
              <p
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {format(day, "EEE")}
              </p>
              <p
                className={`text-sm font-bold ${today ? "text-violet-400" : ""}`}
                style={{ color: today ? undefined : "var(--text-primary)" }}
              >
                {format(day, "d")}
              </p>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-8 gap-1">
        <div className="flex items-center justify-end pr-2">
          <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
            All day
          </span>
        </div>
        {weekDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const tasks = tasksByDate[dateKey] ?? [];
          return (
            <div
              key={dateKey}
              className="min-h-[48px] rounded-lg border p-1 space-y-0.5"
              style={{
                borderColor: dropTarget === dateKey ? "var(--accent)" : "var(--border-subtle)",
                background: dropTarget === dateKey ? "rgba(124,58,237,0.04)" : "transparent",
              }}
              onDrop={(e) => onDrop(e, day)}
              onDragOver={(e) => e.preventDefault()}
            >
              {tasks.slice(0, 3).map((task) => (
                <TaskChip key={task.id} task={task} draggable onDragStart={onTaskDragStart} />
              ))}
              {tasks.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/tasks/calendar?date=${dateKey}`);
                  }}
                  className="text-[9px] px-1 py-0.5 rounded font-medium"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
                >
                  +{tasks.length - 3} more
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Time slots (8am-6pm) */}
      {Array.from({ length: 11 }, (_, i) => i + 8).map((hour) => (
        <div key={hour} className="grid grid-cols-8 gap-1">
          <div className="flex items-start justify-end pr-2 pt-0.5">
            <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
              {hour > 12 ? `${hour - 12}p` : hour === 12 ? "12p" : `${hour}a`}
            </span>
          </div>
          {weekDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const tasks = (tasksByDate[dateKey] ?? []).filter((t) => {
              if (!t.due_date) return false;
              const taskHour = new Date(t.due_date).getHours();
              return taskHour === hour;
            });
            return (
              <div
                key={`${dateKey}-${hour}`}
                className="min-h-[32px] rounded border p-0.5"
                style={{
                  borderColor: dropTarget === dateKey ? "var(--accent)" : "var(--border-subtle)",
                  background: dropTarget === dateKey ? "rgba(124,58,237,0.04)" : "transparent",
                }}
                onDrop={(e) => onDrop(e, day)}
                onDragOver={(e) => e.preventDefault()}
              >
                {tasks.map((task) => (
                  <TaskChip key={task.id} task={task} draggable onDragStart={onTaskDragStart} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AgendaView({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");

    const result: { label: string; tasks: Task[] }[] = [];
    const buckets: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      if (!task.due_date) return;
      const taskDate = new Date(task.due_date);
      const dateKey = format(taskDate, "yyyy-MM-dd");
      if (!buckets[dateKey]) buckets[dateKey] = [];
      buckets[dateKey].push(task);
    });

    const sortedDates = Object.keys(buckets).sort();

    sortedDates.forEach((dateKey) => {
      const taskDate = new Date(dateKey + "T00:00:00");
      let label: string;

      if (dateKey === todayStr) {
        label = "Today";
      } else if (dateKey === tomorrowStr) {
        label = "Tomorrow";
      } else if (isYesterday(taskDate)) {
        label = "Yesterday";
      } else if (isThisWeek(taskDate)) {
        label = "This Week";
      } else {
        const diff = differenceInCalendarDays(taskDate, now);
        if (diff > 0 && diff <= 14) {
          label = "Next Week";
        } else if (diff > 0) {
          label = "Later";
        } else {
          label = format(taskDate, "MMM d, yyyy");
        }
      }

      const existing = result.find((g) => g.label === label);
      if (existing) {
        existing.tasks.push(...(buckets[dateKey] ?? []));
      } else {
        result.push({ label, tasks: buckets[dateKey] ?? [] });
      }
    });

    return result;
  }, [tasks]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.label];
        return (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex items-center gap-2 mb-2 group"
            >
              <ChevronRight
                size={12}
                className="transition-transform"
                style={{
                  color: "var(--text-muted)",
                  transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                }}
              />
              <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {group.label}
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                {group.tasks.length}
              </span>
            </button>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 ml-5">
                    {group.tasks.map((task) => {
                      const statusOpt = STATUS_OPTIONS.find((s) => s.value === task.status);
                      const priorityOpt = PRIORITY_OPTIONS.find((p) => p.value === task.priority);
                      return (
                        <div
                          key={task.id}
                          onClick={() => router.push(`/tasks/${task.id}`)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: priorityOpt?.color }}
                          />
                          <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>
                            {task.title}
                          </span>
                          {task.labels?.map((label) => (
                            <span
                              key={label.id}
                              className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ background: `${label.color}15`, color: label.color }}
                            >
                              {label.name}
                            </span>
                          ))}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusOpt?.bgClass}`}>
                            {statusOpt?.label}
                          </span>
                          {task.due_date && (
                            <span className="text-[9px] shrink-0" style={{ color: "var(--text-muted)" }}>
                              {format(new Date(task.due_date), "h:mm a")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {groups.length === 0 && (
        <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>
          No upcoming tasks with due dates
        </p>
      )}
    </div>
  );
}

export function TaskCalendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const updateTask = useUpdateTask();
  const dragTaskRef = useRef<Task | null>(null);

  const { data } = useTaskList(
    {
      status: [],
      priority: [],
      label_ids: [],
      search: "",
      sort_by: "due_date",
      sort_dir: "asc",
      due_today: false,
      overdue: false,
      assigned_to_me: false,
    },
    1,
    300
  );

  const allTasks = data?.data ?? [];

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    allTasks.forEach((task) => {
      if (!task.due_date) return;
      const key = format(new Date(task.due_date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [allTasks]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const navigate = useCallback(
    (dir: "prev" | "next") => {
      if (view === "month") {
        setCurrentDate((d) => (dir === "next" ? addMonths(d, 1) : subMonths(d, 1)));
      } else if (view === "week") {
        setCurrentDate((d) => (dir === "next" ? addWeeks(d, 1) : subWeeks(d, 1)));
      } else {
        setCurrentDate((d) => addDays(d, dir === "next" ? 30 : -30));
      }
    },
    [view]
  );

  const goToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleTaskDragStart = useCallback((e: React.DragEvent, task: Task) => {
    dragTaskRef.current = task;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    const target = e.target as HTMLElement;
    target.style.opacity = "0.5";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetDate: Date) => {
      e.preventDefault();
      setDropTarget(null);
      const task = dragTaskRef.current;
      if (!task) return;

      const targetDateStr = format(targetDate, "yyyy-MM-dd");
      const originalDueDate = task.due_date;
      const originalDateStr = originalDueDate ? format(new Date(originalDueDate), "yyyy-MM-dd") : null;

      if (originalDateStr === targetDateStr) return;

      const newDueDate = new Date(targetDateStr + "T12:00:00").toISOString();
      updateTask.mutate(
        { id: task.id, data: { due_date: newDueDate } },
        {
          onError: () => {
            toast.error("Failed to reschedule task");
          },
        }
      );

      dragTaskRef.current = null;
    },
    [updateTask]
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = "1";
    setDropTarget(null);
    dragTaskRef.current = null;
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex items-center rounded-lg p-0.5" style={{ background: "var(--bg-elevated)" }}>
            {(["month", "week", "agenda"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${
                  view === v ? "shadow-sm" : ""
                }`}
                style={{
                  background: view === v ? "var(--bg-surface)" : "transparent",
                  color: view === v ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          {view !== "agenda" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("prev")}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                <ChevronLeft size={14} />
              </button>
              <h3
                className="text-sm font-semibold min-w-[140px] text-center"
                style={{ color: "var(--text-primary)" }}
              >
                {view === "month"
                  ? format(currentDate, "MMMM yyyy")
                  : `${format(startOfWeek(currentDate), "MMM d")} – ${format(
                      endOfWeek(currentDate),
                      "MMM d, yyyy"
                    )}`}
              </h3>
              <button
                onClick={() => navigate("next")}
                className="p-1.5 rounded-lg transition-colors"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Today button */}
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          Today
        </button>
      </div>

      {/* View Content */}
      {view === "month" && (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold uppercase tracking-wider py-1"
                style={{ color: "var(--text-muted)" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1" onDragEnd={handleDragEnd}>
            {days.map((d, i) => (
              <CalendarDay
                key={i}
                date={d}
                currentMonth={currentDate}
                tasks={tasksByDate[format(d, "yyyy-MM-dd")] ?? []}
                onClick={() => {
                  const dateKey = format(d, "yyyy-MM-dd");
                  router.push(`/tasks/calendar?date=${dateKey}`);
                }}
                onTaskDragStart={handleTaskDragStart}
                onDrop={handleDrop}
                dropTarget={dropTarget}
                view={view}
              />
            ))}
          </div>
        </>
      )}

      {view === "week" && (
        <WeekView
          currentDate={currentDate}
          tasksByDate={tasksByDate}
          onTaskDragStart={handleTaskDragStart}
          onDrop={handleDrop}
          dropTarget={dropTarget}
        />
      )}

      {view === "agenda" && <AgendaView tasks={allTasks} />}
    </div>
  );
}
