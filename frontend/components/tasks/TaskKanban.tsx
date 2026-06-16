"use client";
import { memo, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useTaskList, useUpdateTask, useLabels } from "@/hooks/useTasks";
import { useUIStore } from "@/store/uiStore";
import { useTaskStore } from "@/store/taskStore";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TaskCardSkeleton } from "@/components/shared/SkeletonLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { KanbanColumnHeader } from "@/components/tasks/kanban/KanbanColumnHeader";
import { InlineTaskCreate } from "@/components/tasks/kanban/InlineTaskCreate";
import { KanbanCardSizeToggle } from "@/components/tasks/kanban/KanbanCardSizeToggle";
import { KanbanGroupBy } from "@/components/tasks/kanban/KanbanGroupBy";
import { KanbanQuickFilters } from "@/components/tasks/kanban/KanbanQuickFilters";
import { Plus } from "lucide-react";

import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Task, KanbanCardSize } from "@/types";

const CARD_SIZE_CLASSES: Record<KanbanCardSize, string> = {
  compact: "p-2",
  default: "p-3",
  detailed: "p-4",
};

function filterTask(task: Task, filters: { search: string; priority: string[]; label_ids: string[] }): boolean {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!task.title.toLowerCase().includes(q) && !(task.description?.toLowerCase().includes(q) ?? false)) return false;
  }
  if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;
  if (filters.label_ids.length > 0 && !task.labels?.some(l => filters.label_ids.includes(l.id))) return false;
  return true;
}

function getGroupKey(task: Task, groupBy: "none" | "priority" | "assignee" | "label"): string {
  switch (groupBy) {
    case "priority": return task.priority;
    case "assignee": return task.assigned_to?.id ?? "unassigned";
    case "label": return task.labels?.[0]?.id ?? "no-label";
    default: return "__all__";
  }
}

function getGroupLabel(key: string, groupBy: "none" | "priority" | "assignee" | "label", task: Task): string {
  if (key === "__all__") return "";
  switch (groupBy) {
    case "priority": return PRIORITY_OPTIONS.find(p => p.value === key)?.label ?? key;
    case "assignee": return task.assigned_to?.name ?? "Unassigned";
    case "label": return task.labels?.find(l => l.id === key)?.name ?? "No label";
    default: return "";
  }
}

interface KanbanColumnProps {
  status: typeof STATUS_OPTIONS[number];
  tasks: Task[];
  cardSize: KanbanCardSize;
  groupBy: "none" | "priority" | "assignee" | "label";
  filters: { search: string; priority: string[]; label_ids: string[] };
}

function KanbanColumn({ status, tasks, cardSize, groupBy, filters }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status.value });
  const { columnConfigs } = useUIStore();
  const config = columnConfigs.find(c => c.id === status.value);
  const [adding, setAdding] = useState(false);

  const filteredTasks = useMemo(() => tasks.filter(t => filterTask(t, filters)), [tasks, filters]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "__all__", label: "", tasks: filteredTasks }];
    const map = new Map<string, { label: string; tasks: Task[] }>();
    for (const task of filteredTasks) {
      const key = getGroupKey(task, groupBy);
      if (!map.has(key)) map.set(key, { label: getGroupLabel(key, groupBy, task), tasks: [] });
      map.get(key)!.tasks.push(task);
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [filteredTasks, groupBy]);

  if (config?.hidden) return null;

  const isCollapsed = config?.collapsed;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] w-full rounded-xl transition-all",
        isCollapsed && "max-w-[48px] min-w-[48px]"
      )}
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOver ? "var(--accent)" : "var(--border-subtle)"}`,
        boxShadow: isOver ? "0 0 0 2px var(--accent-glow)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {isCollapsed ? (
        <div className="flex flex-col items-center py-3 gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: config?.color ?? status.color }} />
          <span className="text-[10px] font-semibold" style={{ writingMode: "vertical-lr", color: "var(--text-muted)" }}>
            {config?.customName ?? status.label}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{filteredTasks.length}</span>
        </div>
      ) : (
        <>
          <KanbanColumnHeader
            status={status.value}
            label={status.label}
            count={filteredTasks.length}
            color={config?.color ?? status.color}
            config={config}
          />

          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            {filteredTasks.length === 0 ? (
              <div
                className="flex items-center justify-center h-24 rounded-lg border border-dashed text-xs"
                style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
              >
                {tasks.length === 0 ? "Drop here" : "No matches"}
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.key}>
                  {group.label && (
                    <div className="text-[10px] font-medium px-1 py-1 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {group.label}
                    </div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {group.tasks.map((task) => (
                      <KanbanCard key={task.id} task={task} cardSize={cardSize} isFiltred={filters.search !== "" || filters.priority.length > 0 || filters.label_ids.length > 0} />
                    ))}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <AnimatePresence mode="wait">
              {adding ? (
                <InlineTaskCreate
                  key="inline-create"
                  status={status.value}
                  onCancel={() => setAdding(false)}
                  onCreated={() => setAdding(false)}
                />
              ) : (
                <motion.button
                  key="add-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setAdding(true)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Plus size={12} />
                  Add task
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

const KanbanCard = memo(function KanbanCard({ task, cardSize, isFiltred }: { task: Task; cardSize: KanbanCardSize; isFiltred: boolean }) {
  const router = useRouter();
  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isFiltred ? 0.2 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn("rounded-xl cursor-pointer group", CARD_SIZE_CLASSES[cardSize])}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
      onClick={() => router.push(`/tasks/${task.id}`)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: priorityOpt?.color }} />
        <span className="text-xs font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
          {task.title}
        </span>
      </div>

      {cardSize !== "compact" && task.description && (
        <p className={cn("text-[11px] mb-2", cardSize === "detailed" ? "line-clamp-3" : "line-clamp-2")} style={{ color: "var(--text-muted)" }}>
          {task.description}
        </p>
      )}

      {(cardSize === "detailed" || cardSize === "default") && (
        <div className="flex items-center gap-1.5">
          {task.labels?.slice(0, cardSize === "detailed" ? 4 : 2).map(l => (
            <span key={l.id} className="text-[9px] px-1 py-0.5 rounded-full" style={{ background: `${l.color}15`, color: l.color }}>
              {l.name}
            </span>
          ))}
          {task.labels && task.labels.length > (cardSize === "detailed" ? 4 : 2) && (
            <span className="text-[9px] px-1 py-0.5 rounded-full" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
              +{task.labels.length - (cardSize === "detailed" ? 4 : 2)}
            </span>
          )}
          <span className="ml-auto text-[9px]" style={{ color: "var(--text-muted)" }}>
            {task.subtasks_completed}/{task.subtasks_count}
          </span>
        </div>
      )}

      {cardSize === "compact" && (
        <div className="flex items-center gap-1.5">
          <span className="ml-auto text-[9px]" style={{ color: "var(--text-muted)" }}>
            {task.subtasks_completed}/{task.subtasks_count}
          </span>
        </div>
      )}
    </motion.div>
  );
});

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
  const router = useRouter();
  const { data, isLoading } = useTaskList(
    { status: [], priority: [], label_ids: [], search: "", sort_by: "position", sort_dir: "asc", due_today: false, overdue: false, assigned_to_me: false },
    1,
    200
  );
  const { data: labelsData } = useLabels();
  const updateTask = useUpdateTask();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { kanbanCardSize, kanbanGroupBy } = useUIStore();
  const { activeFilters } = useTaskStore();

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = (data?.data ?? []).find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  }, [data]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
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
  }, [data, updateTask]);

  const kanbanFilters = useMemo(() => ({
    search: activeFilters.search,
    priority: activeFilters.priority,
    label_ids: activeFilters.label_ids,
  }), [activeFilters]);

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
    return <EmptyState title="No tasks yet" description="Create your first task to see the board" icon="tasks" actionLabel="Create task" onAction={() => router.push("/tasks/new")} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <KanbanQuickFilters labels={labelsData ?? []} />
        <div className="flex items-center gap-2">
          <KanbanGroupBy />
          <KanbanCardSizeToggle />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_OPTIONS.map(status => (
            <KanbanColumn
              key={status.value}
              status={status}
              tasks={tasksByStatus[status.value] ?? []}
              cardSize={kanbanCardSize}
              groupBy={kanbanGroupBy}
              filters={kanbanFilters}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <DragOverlayCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
