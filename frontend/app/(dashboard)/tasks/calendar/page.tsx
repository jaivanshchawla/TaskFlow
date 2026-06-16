"use client";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { PAGE_VARIANTS } from "@/lib/animations";

const TaskCalendar = dynamic(
  () =>
    import("@/components/tasks/TaskCalendar").then((m) => ({
      default: m.TaskCalendar,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="shimmer h-96 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
    ),
  }
);

const CalendarMiniCalendar = dynamic(
  () =>
    import("@/components/tasks/CalendarMiniCalendar").then((m) => ({
      default: m.CalendarMiniCalendar,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="shimmer h-48 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
    ),
  }
);

export default function CalendarPage() {
  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit">
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <TaskCalendar />
        </div>
        <div className="hidden lg:block w-64 shrink-0">
          <CalendarMiniCalendar />
        </div>
      </div>
    </motion.div>
  );
}
