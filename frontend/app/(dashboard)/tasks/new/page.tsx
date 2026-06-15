"use client";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { TaskForm } from "@/components/tasks/TaskForm";
import { PAGE_VARIANTS } from "@/lib/animations";

export default function NewTaskPage() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template") ?? undefined;

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit">
      <div className="mb-6">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Create Task</h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Add a new task to your workflow</p>
      </div>
      <TaskForm initialTemplateId={templateId} />
    </motion.div>
  );
}
