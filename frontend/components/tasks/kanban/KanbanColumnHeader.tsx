"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useUIStore } from "@/store/uiStore";
import { SPRING_SNAPPY } from "@/lib/animations";
import type { ColumnConfig } from "@/types";
import { ChevronDown, Pencil, Palette, Minus, EyeOff, Columns3 } from "lucide-react";

interface KanbanColumnHeaderProps {
  status: string;
  label: string;
  count: number;
  color: string;
  config?: ColumnConfig;
}

export function KanbanColumnHeader({ status, label, count, color, config }: KanbanColumnHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingWip, setEditingWip] = useState(false);
  const [wipValue, setWipValue] = useState(config?.wipLimit?.toString() ?? "");
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(config?.customName ?? label);
  const menuRef = useRef<HTMLDivElement>(null);
  const wipInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { updateColumnConfig } = useUIStore();

  const wipLimit = config?.wipLimit ?? 0;
  const atWipLimit = wipLimit > 0 && count >= wipLimit;
  const nearWipLimit = wipLimit > 0 && count >= wipLimit * 0.8 && !atWipLimit;

  const displayLabel = config?.customName ?? label;

  useEffect(() => {
    if (editingWip) wipInputRef.current?.focus();
  }, [editingWip]);

  useEffect(() => {
    if (renaming) nameInputRef.current?.focus();
  }, [renaming]);

  const handleSaveWip = () => {
    const num = parseInt(wipValue, 10);
    if (!isNaN(num) && num >= 0) {
      updateColumnConfig(status, { wipLimit: num });
    }
    setEditingWip(false);
  };

  const handleSaveRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== label) {
      updateColumnConfig(status, { customName: trimmed });
    } else {
      updateColumnConfig(status, { customName: undefined });
    }
    setRenaming(false);
  };

  const handleColorChange = (newColor: string) => {
    updateColumnConfig(status, { color: newColor });
  };

  const handleCollapse = () => {
    updateColumnConfig(status, { collapsed: !config?.collapsed });
    setMenuOpen(false);
  };

  const handleHide = () => {
    updateColumnConfig(status, { hidden: true });
    setMenuOpen(false);
  };

  const countBadgeColor = atWipLimit
    ? "rgba(239,68,68,0.15)"
    : nearWipLimit
      ? "rgba(245,158,11,0.15)"
      : "var(--bg-overlay)";

  const countTextColor = atWipLimit
    ? "#ef4444"
    : nearWipLimit
      ? "#f59e0b"
      : "var(--text-muted)";

  return (
    <div
      className="flex items-center gap-2 px-4 py-3 border-b relative"
      style={{
        borderColor: "var(--border-subtle)",
        boxShadow: atWipLimit ? "0 0 8px rgba(239,68,68,0.2)" : "none",
      }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />

      {renaming ? (
        <input
          ref={nameInputRef}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleSaveRename}
          onKeyDown={(e) => { if (e.key === "Enter") handleSaveRename(); if (e.key === "Escape") { setNameValue(label); setRenaming(false); } }}
          className="text-xs font-semibold uppercase tracking-wider bg-transparent outline-none"
          style={{ color: "var(--text-secondary)", minWidth: 60 }}
        />
      ) : (
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {displayLabel}
        </span>
      )}

      {editingWip ? (
        <input
          ref={wipInputRef}
          type="number"
          min={0}
          value={wipValue}
          onChange={(e) => setWipValue(e.target.value)}
          onBlur={handleSaveWip}
          onKeyDown={(e) => { if (e.key === "Enter") handleSaveWip(); if (e.key === "Escape") setEditingWip(false); }}
          className="ml-auto w-12 text-[10px] px-1 py-0.5 rounded font-medium bg-transparent outline-none text-center"
          style={{ border: "1px solid var(--border-default)", color: countTextColor }}
        />
      ) : (
        <button
          onClick={() => { setWipValue(wipLimit.toString()); setEditingWip(true); }}
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium cursor-pointer transition-colors"
          style={{ background: countBadgeColor, color: countTextColor }}
          title={wipLimit > 0 ? `${count}/${wipLimit} WIP limit` : "Click to set WIP limit"}
        >
          {wipLimit > 0 ? `${count}/${wipLimit}` : count}
        </button>
      )}

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-md transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ChevronDown size={12} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={SPRING_SNAPPY}
                className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl p-1 shadow-xl"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
              >
                {[
                  { icon: Pencil, label: "Rename", action: () => { setNameValue(label); setRenaming(true); setMenuOpen(false); } },
                  { icon: Palette, label: "Change color", action: () => {
                    const colors = ["#64748b", "#3b82f6", "#a855f7", "#10b981", "#f97316", "#ef4444", "#ec4899"];
                    const currentIdx = colors.indexOf(color);
                    const nextColor = colors[(currentIdx + 1) % colors.length]!;
                    handleColorChange(nextColor);
                    setMenuOpen(false);
                  }},
                  { icon: Columns3, label: "Set WIP limit", action: () => { setWipValue(wipLimit.toString()); setEditingWip(true); setMenuOpen(false); } },
                  { icon: config?.collapsed ? EyeOff : Minus, label: config?.collapsed ? "Expand" : "Collapse", action: handleCollapse },
                  { icon: EyeOff, label: "Hide column", action: handleHide },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <item.icon size={12} />
                    {item.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
