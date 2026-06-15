"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useUserMe, useUpdatePreferences } from "@/hooks/useTasks";
import { PAGE_VARIANTS } from "@/lib/animations";
import { ITEMS_PER_PAGE_OPTIONS } from "@/lib/constants";

function SavedIndicator() {
  return (
    <motion.span
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="text-[10px] font-medium text-emerald-400"
    >
      Saved
    </motion.span>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: user } = useUserMe();
  const updatePrefs = useUpdatePreferences();
  const [savedField, setSavedField] = useState<string | null>(null);

  const defaultView = user?.preferences?.default_view ?? "list";
  const perPage = user?.preferences?.items_per_page ?? 20;

  const saveWithFeedback = (field: string, fn: () => void) => {
    fn();
    setSavedField(field);
    setTimeout(() => setSavedField(null), 1500);
  };

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-8 max-w-2xl">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Settings</h2>

      {/* Appearance */}
      <div className="p-5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Appearance</h3>
        <div className="flex items-center gap-2">
          {[
            { value: "light", icon: Sun, label: "Light" },
            { value: "dark", icon: Moon, label: "Dark" },
            { value: "system", icon: Monitor, label: "System" },
          ].map(({ value, icon: Icon, label }) => (
            <motion.button
              key={value}
              onClick={() => saveWithFeedback("theme", () => setTheme(value))}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: theme === value ? "rgba(124,58,237,0.1)" : "var(--bg-elevated)",
                border: `1px solid ${theme === value ? "var(--accent)" : "var(--border-subtle)"}`,
                color: theme === value ? "var(--accent-bright)" : "var(--text-secondary)",
              }}
            >
              <Icon size={14} />
              {label}
              {theme === value && <Check size={12} />}
            </motion.button>
          ))}
          {savedField === "theme" && <SavedIndicator />}
        </div>
      </div>

      {/* Preferences */}
      <div className="p-5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Default view</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Which view to show when opening Tasks</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={defaultView}
                onChange={(e) => {
                  const v = e.target.value as "list" | "kanban" | "calendar";
                  saveWithFeedback("defaultView", () => updatePrefs.mutate({ default_view: v }));
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <option value="list">List</option>
                <option value="kanban">Kanban</option>
                <option value="calendar">Calendar</option>
              </select>
              {savedField === "defaultView" && <SavedIndicator />}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Items per page</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Number of tasks to show per page</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={perPage}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  saveWithFeedback("perPage", () => updatePrefs.mutate({ items_per_page: v }));
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {ITEMS_PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              {savedField === "perPage" && <SavedIndicator />}
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="p-5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#ef4444" }}>Danger Zone</h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Export all your data or permanently delete your account.</p>
        <button
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          Export all data
        </button>
      </div>
    </motion.div>
  );
}
