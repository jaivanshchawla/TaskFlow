"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PAGE_VARIANTS } from "@/lib/animations";

const TaskKanban = dynamic(() => import("@/components/tasks/TaskKanban").then(m => ({ default: m.TaskKanban })), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="shimmer h-96 rounded-xl" style={{ border: "1px solid var(--border-subtle)" }} />
      ))}
    </div>
  ),
});

export default function KanbanPage() {
  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Kanban Board</h2>
        <Link
          href="/tasks/new"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={14} />
          New task
        </Link>
      </div>
      <TaskKanban />
    </motion.div>
  );
}
