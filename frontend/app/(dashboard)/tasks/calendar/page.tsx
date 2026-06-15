"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { PAGE_VARIANTS } from "@/lib/animations";

const TaskCalendar = dynamic(() => import("@/components/tasks/TaskCalendar").then(m => ({ default: m.TaskCalendar })), {
  ssr: false,
  loading: () => (
    <div className="shimmer h-96 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
  ),
});

export default function CalendarPage() {
  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit">
      <TaskCalendar />
    </motion.div>
  );
}
