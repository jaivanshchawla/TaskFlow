"use client";
import { useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useTaskList } from "@/hooks/useTasks";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarMiniCalendarProps {
  currentDate?: Date;
}

export function CalendarMiniCalendar({ currentDate }: CalendarMiniCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDateStr = searchParams.get("date");

  const monthStart = startOfMonth(currentDate ?? new Date());
  const monthEnd = endOfMonth(currentDate ?? new Date());
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const { data } = useTaskList(
    { status: [], priority: [], label_ids: [], search: "", sort_by: "due_date", sort_dir: "asc", due_today: false, overdue: false, assigned_to_me: false },
    1,
    300
  );

  const tasksByDate = useMemo(() => {
    const map: Record<string, number> = {};
    (data?.data ?? []).forEach((task) => {
      if (!task.due_date) return;
      const key = format(new Date(task.due_date), "yyyy-MM-dd");
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [data]);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="rounded-xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => router.push(`/tasks/calendar?date=${format(subMonths(monthStart, 1), "yyyy-MM-dd")}`)}
          className="p-1 rounded-md transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <ChevronLeft size={12} />
        </button>
        <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {format(monthStart, "MMM yyyy")}
        </span>
        <button
          onClick={() => router.push(`/tasks/calendar?date=${format(addMonths(monthStart, 1), "yyyy-MM-dd")}`)}
          className="p-1 rounded-md transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <ChevronRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium py-0.5" style={{ color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const isSelected = selectedDateStr === dateKey;
          const today = isToday(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const count = tasksByDate[dateKey] ?? 0;

          return (
            <button
              key={dateKey}
              onClick={() => router.push(`/tasks/calendar?date=${dateKey}`)}
              className="relative flex flex-col items-center justify-center py-1 rounded-md text-[10px] transition-colors"
              style={{
                color: !isCurrentMonth ? "var(--text-muted)" : "var(--text-primary)",
                opacity: !isCurrentMonth ? 0.4 : 1,
                background: isSelected
                  ? "var(--accent)"
                  : today
                    ? "rgba(124,58,237,0.08)"
                    : "transparent",
                fontWeight: today || isSelected ? 600 : 400,
              }}
            >
              {format(day, "d")}
              {count > 0 && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: isSelected ? "white" : "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
