"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ExternalLink, Pencil, Star, Copy, Trash2, ChevronRight,
  Circle, CircleDot,
} from "lucide-react";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useTaskStore } from "@/store/taskStore";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";

interface TaskContextMenuProps {
  taskId: string;
  taskTitle: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function TaskContextMenu({ taskId, taskTitle, x, y, onClose }: TaskContextMenuProps) {
  const router = useRouter();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const favoritedTaskIds = useTaskStore((s) => s.favoritedTaskIds);
  const toggleFavorite = useTaskStore((s) => s.toggleFavorite);
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<"status" | "priority" | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  const isFavorited = favoritedTaskIds.includes(taskId);

  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  const menuItems = [
    { icon: ExternalLink, label: "Open", onClick: () => { router.push(`/tasks/${taskId}`); onClose(); } },
    { icon: Pencil, label: "Edit", onClick: () => { router.push(`/tasks/${taskId}?edit=true`); onClose(); } },
    { type: "divider" as const },
    {
      icon: submenu === "status" ? ChevronRight : CircleDot,
      label: "Quick status",
      onClick: () => setSubmenu(submenu === "status" ? null : "status"),
      hasSubmenu: true,
    },
    {
      icon: submenu === "priority" ? ChevronRight : Circle,
      label: "Quick priority",
      onClick: () => setSubmenu(submenu === "priority" ? null : "priority"),
      hasSubmenu: true,
    },
    { type: "divider" as const },
    {
      icon: Star,
      label: isFavorited ? "Unstar" : "Star",
      onClick: () => { toggleFavorite(taskId); onClose(); },
    },
    {
      icon: Copy,
      label: "Copy link",
      onClick: () => {
        navigator.clipboard.writeText(`${window.location.origin}/tasks/${taskId}`);
        onClose();
      },
    },
    { type: "divider" as const },
    {
      icon: Trash2,
      label: "Delete",
      danger: true,
      onClick: () => {
        if (confirm(`Delete "${taskTitle}"?`)) {
          deleteTask.mutate(taskId);
        }
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <motion.div
        ref={menuRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.1 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute rounded-xl overflow-hidden shadow-xl min-w-[180px]"
        style={{
          left: adjustedX,
          top: adjustedY,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
        }}
      >
        {menuItems.map((item, i) => {
          if ("type" in item && item.type === "divider") {
            return <div key={i} className="my-1" style={{ borderTop: "1px solid var(--border-subtle)" }} />;
          }
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={item.onClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
              style={{
                color: "danger" in item && item.danger ? "#ef4444" : "var(--text-primary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-elevated)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={12} />
              <span className="flex-1 text-left">{item.label}</span>
              {"hasSubmenu" in item && item.hasSubmenu && <ChevronRight size={10} style={{ color: "var(--text-muted)" }} />}
            </button>
          );
        })}

        <AnimatePresence>
          {submenu === "status" && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="absolute left-full top-0 rounded-xl overflow-hidden shadow-xl min-w-[140px]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    updateTask.mutate({ id: taskId, data: { status: s.value as "todo" | "in_progress" | "in_review" | "done" | "cancelled" } });
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </button>
              ))}
            </motion.div>
          )}
          {submenu === "priority" && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="absolute left-full top-0 rounded-xl overflow-hidden shadow-xl min-w-[140px]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    updateTask.mutate({ id: taskId, data: { priority: p.value as "low" | "medium" | "high" | "urgent" } });
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
