"use client";
import { motion } from "framer-motion";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { PAGE_VARIANTS } from "@/lib/animations";

export default function CalendarPage() {
  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit">
      <TaskCalendar />
    </motion.div>
  );
}
