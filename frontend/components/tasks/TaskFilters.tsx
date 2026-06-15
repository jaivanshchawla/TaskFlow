"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal, ChevronDown, ArrowUpDown, Save, Trash2 } from "lucide-react";
import { useTaskStore } from "@/store/taskStore";
import { useLabels } from "@/hooks/useTasks";
import { STATUS_OPTIONS, PRIORITY_OPTIONS, SORT_OPTIONS } from "@/lib/constants";
import { SPRING_SOFT } from "@/lib/animations";
import type { FilterState } from "@/types";

interface SavedFilter {
  name: string;
  filters: FilterState;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={SPRING_SOFT}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: "var(--bg-overlay)", color: "var(--text-secondary)" }}
    >
      {label}
      <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-violet-500/20 transition-colors">
        <X size={10} style={{ color: "var(--text-muted)" }} />
      </button>
    </motion.span>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  renderOption,
}: {
  label: string;
  options: readonly { value: string; label: string; color?: string; bgClass?: string; dotClass?: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  renderOption?: (opt: { value: string; label: string; color?: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: selected.length > 0 ? "var(--accent-glow)" : "var(--bg-elevated)",
          border: `1px solid ${selected.length > 0 ? "var(--accent)" : "var(--border-subtle)"}`,
          color: selected.length > 0 ? "var(--accent-bright)" : "var(--text-secondary)",
        }}
      >
        {label}
        {selected.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] flex items-center justify-center font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-40 top-full mt-1 left-0 min-w-[160px] rounded-xl p-1.5 shadow-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              {options.map((opt) => {
                const isActive = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => onToggle(opt.value)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left"
                    style={{
                      background: isActive ? "rgba(124,58,237,0.08)" : "transparent",
                      color: isActive ? "var(--accent-bright)" : "var(--text-secondary)",
                    }}
                  >
                    {renderOption ? renderOption(opt) : (
                      <>
                        {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />}
                        <span className="flex-1">{opt.label}</span>
                        {isActive && <span className="text-violet-400">✓</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TaskFilters() {
  const { activeFilters, setFilter, resetFilters } = useTaskStore();
  const { data: labels } = useLabels();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("taskflow-saved-filters") ?? "[]"); }
      catch { return []; }
    }
    return [];
  });
  const [filterName, setFilterName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const activeCount = [
    ...activeFilters.status,
    ...activeFilters.priority,
    ...activeFilters.label_ids,
    activeFilters.due_today ? "due_today" : "",
    activeFilters.overdue ? "overdue" : "",
    activeFilters.assigned_to_me ? "assigned_to_me" : "",
  ].filter(Boolean).length;

  const toggleInArray = useCallback((key: "status" | "priority" | "label_ids", value: string) => {
    const current = activeFilters[key];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    setFilter(key, next as FilterState[typeof key]);
  }, [activeFilters, setFilter]);

  const getChips = (): { label: string; onRemove: () => void }[] => {
    const chips: { label: string; onRemove: () => void }[] = [];
    activeFilters.status.forEach(s => {
      const opt = STATUS_OPTIONS.find(o => o.value === s);
      chips.push({ label: opt?.label ?? s, onRemove: () => toggleInArray("status", s) });
    });
    activeFilters.priority.forEach(p => {
      const opt = PRIORITY_OPTIONS.find(o => o.value === p);
      chips.push({ label: opt?.label ?? p, onRemove: () => toggleInArray("priority", p) });
    });
    activeFilters.label_ids.forEach(l => {
      const lbl = labels?.find(lb => lb.id === l);
      chips.push({ label: lbl?.name ?? "Label", onRemove: () => toggleInArray("label_ids", l) });
    });
    if (activeFilters.due_today) chips.push({ label: "Due today", onRemove: () => setFilter("due_today", false) });
    if (activeFilters.overdue) chips.push({ label: "Overdue", onRemove: () => setFilter("overdue", false) });
    if (activeFilters.assigned_to_me) chips.push({ label: "Assigned to me", onRemove: () => setFilter("assigned_to_me", false) });
    return chips;
  };

  const chips = getChips();

  const saveFilter = () => {
    if (!filterName.trim()) return;
    const updated = [...savedFilters.filter(f => f.name !== filterName), { name: filterName, filters: activeFilters }];
    setSavedFilters(updated);
    localStorage.setItem("taskflow-saved-filters", JSON.stringify(updated));
    setFilterName("");
    setShowSaveInput(false);
  };

  const loadFilter = (f: SavedFilter) => {
    Object.entries(f.filters).forEach(([key, value]) => {
      setFilter(key as keyof FilterState, value as never);
    });
  };

  const deleteSavedFilter = (name: string) => {
    const updated = savedFilters.filter(f => f.name !== name);
    setSavedFilters(updated);
    localStorage.setItem("taskflow-saved-filters", JSON.stringify(updated));
  };

  const FilterBar = () => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          value={activeFilters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-2 py-1.5 rounded-lg text-xs outline-none"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Status */}
      <MultiSelectDropdown
        label="Status"
        options={STATUS_OPTIONS}
        selected={activeFilters.status}
        onToggle={(v) => toggleInArray("status", v)}
      />

      {/* Priority */}
      <MultiSelectDropdown
        label="Priority"
        options={PRIORITY_OPTIONS}
        selected={activeFilters.priority}
        onToggle={(v) => toggleInArray("priority", v)}
      />

      {/* Labels */}
      <MultiSelectDropdown
        label="Labels"
        options={(labels ?? []).map(l => ({ value: l.id, label: l.name, color: l.color }))}
        selected={activeFilters.label_ids}
        onToggle={(v) => toggleInArray("label_ids", v)}
        renderOption={(opt) => (
          <>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
            <span className="flex-1">{opt.label}</span>
            {activeFilters.label_ids.includes(opt.value) && <span className="text-violet-400">✓</span>}
          </>
        )}
      />

      {/* Toggles */}
      <button
        onClick={() => setFilter("due_today", !activeFilters.due_today)}
        className="px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: activeFilters.due_today ? "rgba(249,115,22,0.1)" : "var(--bg-elevated)",
          border: `1px solid ${activeFilters.due_today ? "rgba(249,115,22,0.3)" : "var(--border-subtle)"}`,
          color: activeFilters.due_today ? "#f97316" : "var(--text-secondary)",
        }}
      >
        Due today
      </button>

      <button
        onClick={() => setFilter("overdue", !activeFilters.overdue)}
        className="px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: activeFilters.overdue ? "rgba(239,68,68,0.1)" : "var(--bg-elevated)",
          border: `1px solid ${activeFilters.overdue ? "rgba(239,68,68,0.3)" : "var(--border-subtle)"}`,
          color: activeFilters.overdue ? "#ef4444" : "var(--text-secondary)",
        }}
      >
        Overdue
      </button>

      <button
        onClick={() => setFilter("assigned_to_me", !activeFilters.assigned_to_me)}
        className="px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: activeFilters.assigned_to_me ? "rgba(124,58,237,0.1)" : "var(--bg-elevated)",
          border: `1px solid ${activeFilters.assigned_to_me ? "var(--accent)" : "var(--border-subtle)"}`,
          color: activeFilters.assigned_to_me ? "var(--accent-bright)" : "var(--text-secondary)",
        }}
      >
        Assigned to me
      </button>

      {/* Sort */}
      <div className="relative">
        <select
          value={activeFilters.sort_by}
          onChange={(e) => setFilter("sort_by", e.target.value)}
          className="appearance-none pl-2 pr-6 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
      </div>

      <button
        onClick={() => setFilter("sort_dir", activeFilters.sort_dir === "asc" ? "desc" : "asc")}
        className="p-1.5 rounded-lg transition-colors"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        <ArrowUpDown size={12} />
      </button>

      {/* Save */}
      {activeCount > 0 && (
        <button
          onClick={() => setShowSaveInput(!showSaveInput)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
          title="Save this filter"
        >
          <Save size={12} />
        </button>
      )}

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={resetFilters}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ color: "#ef4444" }}
        >
          Clear all
        </button>
      )}

      {/* Saved filters */}
      {savedFilters.length > 0 && (
        <div className="relative">
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
          >
            Saved
            <ChevronDown size={10} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Save input modal */}
      <AnimatePresence>
        {showSaveInput && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2 mb-3 p-2 rounded-lg"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveFilter()}
              placeholder="Filter name..."
              autoFocus
              className="flex-1 px-2 py-1 rounded text-xs outline-none"
              style={{ background: "var(--bg-overlay)", color: "var(--text-primary)" }}
            />
            <button onClick={saveFilter} className="px-2 py-1 rounded text-xs text-white" style={{ background: "var(--accent)" }}>
              Save
            </button>
            <button onClick={() => setShowSaveInput(false)} className="p-1" style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved filters list */}
      {savedFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {savedFilters.map((f) => (
            <div key={f.name} className="flex items-center gap-1">
              <button
                onClick={() => loadFilter(f)}
                className="px-2 py-1 rounded-lg text-[11px] transition-colors"
                style={{ background: "var(--bg-overlay)", color: "var(--text-secondary)" }}
              >
                {f.name}
              </button>
              <button onClick={() => deleteSavedFilter(f.name)} className="p-0.5 rounded hover:bg-red-500/10 transition-colors">
                <Trash2 size={10} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Desktop */}
      <div className="hidden md:block">
        <FilterBar />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          <SlidersHorizontal size={12} />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="p-3 rounded-xl space-y-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                <FilterBar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active chips */}
      <AnimatePresence>
        {chips.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-wrap gap-1.5 overflow-hidden"
          >
            {chips.map((chip) => (
              <FilterChip key={chip.label} label={chip.label} onRemove={chip.onRemove} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
