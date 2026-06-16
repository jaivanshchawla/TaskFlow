"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Search, Link as LinkIcon } from "lucide-react";
import { useTaskDependencies, useAddDependency, useRemoveDependency, useSearchTasksForDeps } from "@/hooks/useTasks";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { SPRING_SNAPPY } from "@/lib/animations";
import type { Task } from "@/types";

interface TaskDependenciesProps {
  taskId: string;
}

export function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const { data: dependencies = [] } = useTaskDependencies(taskId);
  const addDependency = useAddDependency();
  const removeDependency = useRemoveDependency();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: searchResults } = useSearchTasksForDeps(searchQuery, showSearch && searchQuery.length > 1);

  const blockingTasks = dependencies
    .filter((d) => d.depends_on_id !== taskId && d.depends_on)
    .map((d) => d.depends_on!);

  const blockedBy = dependencies
    .filter((d) => d.task_id === taskId && d.depends_on)
    .map((d) => d.depends_on!);

  const isBlocked = blockedBy.length > 0;

  const handleAdd = (task: Task) => {
    addDependency.mutate({ taskId, dependsOnId: task.id });
    setSearchQuery("");
    setShowSearch(false);
  };

  const handleRemove = (depId: string) => {
    removeDependency.mutate({ taskId, depId });
  };

  const priorityDot = (priority: string) => {
    const opt = PRIORITY_OPTIONS.find((p) => p.value === priority);
    return opt?.dotClass ?? "bg-slate-400";
  };

  return (
    <div className="space-y-3">
      {isBlocked && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: "rgba(234, 179, 8, 0.1)", color: "#eab308" }}
        >
          <AlertTriangle size={14} />
          <span>This task is blocked by {blockedBy.length} other task{blockedBy.length > 1 ? "s" : ""}</span>
        </motion.div>
      )}

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
          Blocked by ({blockedBy.length})
        </label>
        <AnimatePresence>
          {blockedBy.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={SPRING_SNAPPY}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs mb-1"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{t.title}</span>
              <button onClick={() => handleRemove(t.id)} className="p-0.5 hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                <X size={10} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {blockedBy.length === 0 && (
          <p className="text-[11px] py-1" style={{ color: "var(--text-muted)" }}>Not blocked by any tasks</p>
        )}
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
          Blocks ({blockingTasks.length})
        </label>
        <AnimatePresence>
          {blockingTasks.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={SPRING_SNAPPY}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs mb-1"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{t.title}</span>
              <button onClick={() => handleRemove(t.id)} className="p-0.5 hover:opacity-80" style={{ color: "var(--text-muted)" }}>
                <X size={10} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {blockingTasks.length === 0 && (
          <p className="text-[11px] py-1" style={{ color: "var(--text-muted)" }}>Doesn&apos;t block any tasks</p>
        )}
      </div>

      {showSearch ? (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                autoFocus
                className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          </div>
          {searchResults?.data.filter((t) => t.id !== taskId).map((t) => (
            <button
              key={t.id}
              onClick={() => handleAdd(t)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors hover:bg-[var(--bg-overlay)]"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
              <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{t.title}</span>
            </button>
          ))}
          {searchQuery.length > 1 && searchResults?.data.filter((t) => t.id !== taskId).length === 0 && (
            <p className="text-[11px] text-center py-2" style={{ color: "var(--text-muted)" }}>No tasks found</p>
          )}
        </motion.div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: "var(--bg-elevated)", border: "1px dashed var(--border-default)", color: "var(--text-muted)" }}
        >
          <LinkIcon size={10} />
          Add dependency
        </button>
      )}
    </div>
  );
}
