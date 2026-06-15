"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useTaskList, useUpdateTask } from "@/hooks/useTasks";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { TaskCardSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { PAGE_VARIANTS, LIST_CONTAINER, LIST_ITEM, SPRING_SOFT } from "@/lib/animations";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Task } from "@/types";

function KanbanColumn({ status, tasks }: { status: typeof STATUS_OPTIONS[number]; tasks: Task[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: status.value });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col min-w-[280px] max-w-[320px] w-full rounded-xl"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOver ? "var(--accent)" : "var(--border-subtle)"}`,
        boxShadow: isOver ? "0 0 0 2px var(--accent-glow)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <span className="w-2 h-2 rounded-full" style={{ background: status.color }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {status.label}
        </span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-240px)]">
        {tasks.length === 0 ? (
          <div
            className="flex items-center justify-center h-24 rounded-lg border border-dashed text-xs"
            style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
          >
            Drop here
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <KanbanCard key={task.id} task={task} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ task }: { task: Task }) {
  const router = useRouter();
  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="p-3 rounded-xl cursor-pointer group"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      {/* Priority bar */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityOpt?.color }} />
        <span className="text-xs font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
          {task.title}
        </span>
      </div>

      {task.description && (
        <p className="text-[11px] mb-2 line-clamp-2" style={{ color: "var(--text-muted)" }}>
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-1.5">
        {task.labels?.slice(0, 2).map(l => (
          <span key={l.id} className="text-[9px] px-1 py-0.5 rounded-full" style={{ background: `${l.color}15`, color: l.color }}>
            {l.name}
          </span>
        ))}
        {task.labels && task.labels.length > 2 && (
          <span className="text-[9px] px-1 py-0.5 rounded-full" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
            +{task.labels.length - 2}
          </span>
        )}
        <span className="ml-auto text-[9px]" style={{ color: "var(--text-muted)" }}>
          {task.subtasks_completed}/{task.subtasks_count}
        </span>
      </div>
    </motion.div>
  );
}

function DragOverlayCard({ task }: { task: Task }) {
  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);
  return (
    <div
      className="p-3 rounded-xl shadow-2xl rotate-2 scale-105"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--accent)" }}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityOpt?.color }} />
        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
          {task.title}
        </span>
      </div>
    </div>
  );
}

export function TaskKanban() {
  const { data, isLoading } = useTaskList(
    { status: [], priority: [], label_ids: [], search: "", sort_by: "position", sort_dir: "asc", due_today: false, overdue: false, assigned_to_me: false },
    1,
    200
  );
  const updateTask = useUpdateTask();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    STATUS_OPTIONS.forEach(s => { grouped[s.value] = []; });
    (data?.data ?? []).forEach(task => {
      if (grouped[task.status]) grouped[task.status]!.push(task);
    });
    return grouped;
  }, [data]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = (data?.data ?? []).find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = (data?.data ?? []).find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    logger.info("Kanban", "Card moved", { taskId, from: task.status, to: newStatus });
    updateTask.mutate(
      { id: taskId, data: { status: newStatus as Task["status"] } },
      { onError: () => toast.error("Failed to move task") }
    );
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_OPTIONS.map(s => (
          <div key={s.value} className="min-w-[280px] space-y-2">
            <div className="shimmer h-10 rounded-xl" />
            {Array.from({ length: 3 }).map((_, i) => <TaskCardSkeleton key={i} />)}
          </div>
        ))}
      </div>
    );
  }

  const totalTasks = (data?.data ?? []).length;
  if (totalTasks === 0) {
    return <EmptyState title="No tasks yet" description="Create your first task to see the board" icon="tasks" actionLabel="Create task" onAction={() => window.location.href = "/tasks/new"} />;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_OPTIONS.map(status => (
          <KanbanColumn key={status.value} status={status} tasks={tasksByStatus[status.value] ?? []} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <DragOverlayCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
