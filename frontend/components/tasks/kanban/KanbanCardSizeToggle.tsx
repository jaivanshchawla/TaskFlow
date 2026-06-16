"use client";
import { motion } from "motion/react";
import { useUIStore } from "@/store/uiStore";
import { SPRING_SNAPPY } from "@/lib/animations";
import { LayoutList, LayoutGrid, AlignJustify } from "lucide-react";
import type { KanbanCardSize } from "@/types";

const SIZES: { value: KanbanCardSize; label: string; icon: typeof LayoutList }[] = [
  { value: "compact", label: "Compact", icon: LayoutList },
  { value: "default", label: "Default", icon: LayoutGrid },
  { value: "detailed", label: "Detailed", icon: AlignJustify },
];

export function KanbanCardSizeToggle() {
  const { kanbanCardSize, setKanbanCardSize } = useUIStore();

  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg"
      style={{ background: "var(--bg-overlay)" }}
    >
      {SIZES.map(({ value, label, icon: Icon }) => {
        const active = kanbanCardSize === value;
        return (
          <button
            key={value}
            onClick={() => setKanbanCardSize(value)}
            className="relative flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors z-10"
            style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            {active && (
              <motion.div
                layoutId="kanban-size-indicator"
                className="absolute inset-0 rounded-md"
                style={{ background: "var(--bg-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                transition={SPRING_SNAPPY}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              <Icon size={12} />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
