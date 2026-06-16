"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import { SPRING_SNAPPY } from "@/lib/animations";
import { ChevronDown, Layers } from "lucide-react";

const GROUP_OPTIONS = [
  { value: "none" as const, label: "None" },
  { value: "priority" as const, label: "Priority" },
  { value: "assignee" as const, label: "Assignee" },
  { value: "label" as const, label: "Label" },
];

export function KanbanGroupBy() {
  const [open, setOpen] = useState(false);
  const { kanbanGroupBy, setKanbanGroupBy } = useUIStore();
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel = GROUP_OPTIONS.find(o => o.value === kanbanGroupBy)?.label ?? "None";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: kanbanGroupBy !== "none" ? "var(--accent-muted)" : "var(--bg-overlay)",
          color: kanbanGroupBy !== "none" ? "var(--accent)" : "var(--text-muted)",
        }}
      >
        <Layers size={12} />
        <span>Group: {currentLabel}</span>
        <ChevronDown size={10} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={SPRING_SNAPPY}
            className="absolute left-0 top-full mt-1 z-50 w-36 rounded-xl p-1 shadow-xl"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            {GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setKanbanGroupBy(opt.value); setOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  color: kanbanGroupBy === opt.value ? "var(--accent)" : "var(--text-secondary)",
                  background: kanbanGroupBy === opt.value ? "var(--accent-muted)" : "transparent",
                }}
                onMouseEnter={(e) => { if (kanbanGroupBy !== opt.value) e.currentTarget.style.background = "var(--bg-overlay)"; }}
                onMouseLeave={(e) => { if (kanbanGroupBy !== opt.value) e.currentTarget.style.background = "transparent"; }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
