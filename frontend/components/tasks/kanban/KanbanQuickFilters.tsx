"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchIcon } from "@/components/ui/search";
import { useTaskStore } from "@/store/taskStore";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { SPRING_SNAPPY } from "@/lib/animations";
import { X, ChevronDown } from "lucide-react";

interface KanbanQuickFiltersProps {
  labels: { id: string; name: string; color: string }[];
}

export function KanbanQuickFilters({ labels }: KanbanQuickFiltersProps) {
  const { activeFilters, setFilter, resetFilters } = useTaskStore();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const hasFilters =
    activeFilters.search !== "" ||
    activeFilters.priority.length > 0 ||
    activeFilters.label_ids.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setPriorityOpen(false);
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) setLabelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const togglePriority = (value: string) => {
    const current = activeFilters.priority;
    const updated = current.includes(value)
      ? current.filter((p) => p !== value)
      : [...current, value];
    setFilter("priority", updated);
  };

  const toggleLabel = (id: string) => {
    const current = activeFilters.label_ids;
    const updated = current.includes(id)
      ? current.filter((l) => l !== id)
      : [...current, id];
    setFilter("label_ids", updated);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
        style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)" }}
      >
        <SearchIcon size={14} className="shrink-0" style={{ color: "var(--text-muted)" } as React.CSSProperties} />
        <input
          value={activeFilters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Search..."
          className="bg-transparent outline-none w-36 text-xs placeholder:opacity-40"
          style={{ color: "var(--text-primary)" }}
        />
        {activeFilters.search && (
          <button onClick={() => setFilter("search", "")} style={{ color: "var(--text-muted)" }}>
            <X size={10} />
          </button>
        )}
      </div>

      <div ref={priorityRef} className="relative">
        <button
          onClick={() => setPriorityOpen(!priorityOpen)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: activeFilters.priority.length > 0 ? "var(--accent-muted)" : "var(--bg-overlay)",
            color: activeFilters.priority.length > 0 ? "var(--accent)" : "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          Priority
          {activeFilters.priority.length > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
              {activeFilters.priority.length}
            </span>
          )}
          <ChevronDown size={10} />
        </button>

        <AnimatePresence>
          {priorityOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={SPRING_SNAPPY}
              className="absolute left-0 top-full mt-1 z-50 w-36 rounded-xl p-1 shadow-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              {PRIORITY_OPTIONS.map((p) => {
                const active = activeFilters.priority.includes(p.value);
                return (
                  <button
                    key={p.value}
                    onClick={() => togglePriority(p.value)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      background: active ? "var(--accent-muted)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-overlay)"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div ref={labelRef} className="relative">
        <button
          onClick={() => setLabelOpen(!labelOpen)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{
            background: activeFilters.label_ids.length > 0 ? "var(--accent-muted)" : "var(--bg-overlay)",
            color: activeFilters.label_ids.length > 0 ? "var(--accent)" : "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          Label
          {activeFilters.label_ids.length > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full text-[9px] flex items-center justify-center" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
              {activeFilters.label_ids.length}
            </span>
          )}
          <ChevronDown size={10} />
        </button>

        <AnimatePresence>
          {labelOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={SPRING_SNAPPY}
              className="absolute left-0 top-full mt-1 z-50 w-40 rounded-xl p-1 shadow-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              {labels.length === 0 ? (
                <div className="px-2.5 py-2 text-[11px]" style={{ color: "var(--text-muted)" }}>No labels</div>
              ) : (
                labels.map((l) => {
                  const active = activeFilters.label_ids.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel(l.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      style={{
                        color: active ? "var(--accent)" : "var(--text-secondary)",
                        background: active ? "var(--accent-muted)" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-overlay)"; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                      {l.name}
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hasFilters && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={10} />
          Clear
        </button>
      )}
    </div>
  );
}
