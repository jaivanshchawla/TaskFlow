"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { TaskDetail } from "@/components/tasks/TaskDetail";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <AnimatePresence mode="wait">
      <TaskDetail taskId={id} onClose={() => router.push("/tasks")} />
    </AnimatePresence>
  );
}
