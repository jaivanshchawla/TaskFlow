"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useUserMe, useUpdatePreferences } from "@/hooks/useTasks";
import { PAGE_VARIANTS } from "@/lib/animations";
import { ITEMS_PER_PAGE_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";

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

const ACCENT_COLORS = [
  { name: "Violet", value: "#8b5cf6", hsl: "263 70% 50%" },
  { name: "Indigo", value: "#6366f1", hsl: "239 84% 67%" },
  { name: "Blue", value: "#3b82f6", hsl: "217 91% 60%" },
  { name: "Emerald", value: "#10b981", hsl: "160 84% 39%" },
  { name: "Rose", value: "#f43f5e", hsl: "347 89% 60%" },
  { name: "Amber", value: "#f59e0b", hsl: "38 92% 50%" },
] as const;

const BORDER_RADIUS_OPTIONS = [
  { label: "Sharp", value: "4px" },
  { label: "Default", value: "12px" },
  { label: "Rounded", value: "20px" },
] as const;

const FONT_SIZE_OPTIONS = [
  { label: "Small", value: "13px" },
  { label: "Medium", value: "14px" },
  { label: "Large", value: "16px" },
] as const;

const DUE_REMINDER_OPTIONS = [
  { label: "Off", value: "off" },
  { label: "Same day", value: "same_day" },
  { label: "1 day before", value: "1_day" },
  { label: "2 days before", value: "2_days" },
] as const;

function loadSetting<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(`taskflow-settings-${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key: string, value: unknown) {
  localStorage.setItem(`taskflow-settings-${key}`, JSON.stringify(value));
}

function applyAccentColor(hsl: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--accent", hsl);
  root.style.setProperty("--ring", hsl);
}

function applyBorderRadius(value: string) {
  document.documentElement.style.setProperty("--radius", value);
}

function applyFontSize(value: string) {
  document.documentElement.style.fontSize = value;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: user } = useUserMe();
  const updatePrefs = useUpdatePreferences();
  const [savedField, setSavedField] = useState<string | null>(null);

  const defaultView = user?.preferences?.default_view ?? "list";
  const perPage = user?.preferences?.items_per_page ?? 20;

  const [accentColor, setAccentColor] = useState<string>(() => loadSetting("accent-color", "Violet"));
  const [borderRadius, setBorderRadius] = useState<string>(() => loadSetting("border-radius", "Default"));
  const [fontSize, setFontSize] = useState<string>(() => loadSetting("font-size", "Medium"));
  const [defaultStatus, setDefaultStatus] = useState<string>(() => loadSetting("default-status", "todo"));
  const [defaultPriority, setDefaultPriority] = useState<string>(() => loadSetting("default-priority", "medium"));
  const [defaultDueOffset, setDefaultDueOffset] = useState<string>(() => loadSetting("default-due-offset", "0"));
  const [kanbanCardSize, setKanbanCardSize] = useState<string>(() => loadSetting("kanban-card-size", "default"));
  const [showWipLimits, setShowWipLimits] = useState<boolean>(() => loadSetting("show-wip-limits", false));
  const [kanbanGroupBy, setKanbanGroupBy] = useState<string>(() => loadSetting("kanban-group-by", "none"));
  const [dueReminder, setDueReminder] = useState<string>(() => loadSetting("due-reminder", "same_day"));

  useEffect(() => {
    const accentOpt = ACCENT_COLORS.find(c => c.name === accentColor);
    if (accentOpt) applyAccentColor(accentOpt.hsl);
    applyBorderRadius(BORDER_RADIUS_OPTIONS.find(r => r.label === borderRadius)?.value ?? "12px");
    applyFontSize(FONT_SIZE_OPTIONS.find(s => s.label === fontSize)?.value ?? "14px");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- apply visual settings on mount only

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

        <div className="space-y-4">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Theme</p>
            </div>
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: theme === value ? "rgba(124,58,237,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${theme === value ? "var(--accent)" : "var(--border-subtle)"}`,
                    color: theme === value ? "var(--accent-bright)" : "var(--text-secondary)",
                  }}
                >
                  <Icon size={12} />
                  {label}
                  {theme === value && <Check size={10} />}
                </motion.button>
              ))}
              {savedField === "theme" && <SavedIndicator />}
            </div>
          </div>

          {/* Accent Color */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Accent color</p>
            </div>
            <div className="flex items-center gap-2">
              {ACCENT_COLORS.map((color) => (
                <motion.button
                  key={color.name}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    saveWithFeedback("accent", () => {
                      setAccentColor(color.name);
                      saveSetting("accent-color", color.name);
                      applyAccentColor(color.hsl);
                    });
                  }}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: color.value,
                    border: `2px solid ${accentColor === color.name ? "white" : "transparent"}`,
                    boxShadow: accentColor === color.name ? `0 0 0 2px ${color.value}` : "none",
                  }}
                  title={color.name}
                />
              ))}
              {savedField === "accent" && <SavedIndicator />}
            </div>
          </div>

          {/* Border Radius */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Border radius</p>
            </div>
            <div className="flex items-center gap-2">
              {BORDER_RADIUS_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.label}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    saveWithFeedback("radius", () => {
                      setBorderRadius(opt.label);
                      saveSetting("border-radius", opt.label);
                      applyBorderRadius(opt.value);
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: borderRadius === opt.label ? "rgba(124,58,237,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${borderRadius === opt.label ? "var(--accent)" : "var(--border-subtle)"}`,
                    color: borderRadius === opt.label ? "var(--accent-bright)" : "var(--text-secondary)",
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
              {savedField === "radius" && <SavedIndicator />}
            </div>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Font size</p>
            </div>
            <div className="flex items-center gap-2">
              {FONT_SIZE_OPTIONS.map((opt) => (
                <motion.button
                  key={opt.label}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    saveWithFeedback("fontsize", () => {
                      setFontSize(opt.label);
                      saveSetting("font-size", opt.label);
                      applyFontSize(opt.value);
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: fontSize === opt.label ? "rgba(124,58,237,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${fontSize === opt.label ? "var(--accent)" : "var(--border-subtle)"}`,
                    color: fontSize === opt.label ? "var(--accent-bright)" : "var(--text-secondary)",
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
              {savedField === "fontsize" && <SavedIndicator />}
            </div>
          </div>
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

      {/* Task Defaults */}
      <div className="p-5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Task Defaults</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Default status</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Status applied to new tasks</p>
            </div>
            <select
              value={defaultStatus}
              onChange={(e) => {
                setDefaultStatus(e.target.value);
                saveSetting("default-status", e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Default priority</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Priority applied to new tasks</p>
            </div>
            <select
              value={defaultPriority}
              onChange={(e) => {
                setDefaultPriority(e.target.value);
                saveSetting("default-priority", e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Default due date offset</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Days from now for new task due date</p>
            </div>
            <select
              value={defaultDueOffset}
              onChange={(e) => {
                setDefaultDueOffset(e.target.value);
                saveSetting("default-due-offset", e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <option value="0">None</option>
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">1 week</option>
              <option value="14">2 weeks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Defaults */}
      <div className="p-5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Kanban Defaults</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Default card size</p>
            </div>
            <select
              value={kanbanCardSize}
              onChange={(e) => {
                setKanbanCardSize(e.target.value);
                saveSetting("kanban-card-size", e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <option value="compact">Compact</option>
              <option value="default">Default</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Show WIP limits</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Display work-in-progress limits on columns</p>
            </div>
            <button
              onClick={() => {
                const next = !showWipLimits;
                setShowWipLimits(next);
                saveSetting("show-wip-limits", next);
              }}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{ background: showWipLimits ? "var(--accent)" : "var(--bg-overlay)" }}
            >
              <motion.div
                animate={{ x: showWipLimits ? 18 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Default group by</p>
            </div>
            <select
              value={kanbanGroupBy}
              onChange={(e) => {
                setKanbanGroupBy(e.target.value);
                saveSetting("kanban-group-by", e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <option value="none">None</option>
              <option value="priority">Priority</option>
              <option value="assignee">Assignee</option>
              <option value="label">Label</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="p-5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Due date reminders</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>When to notify about upcoming due dates</p>
            </div>
            <select
              value={dueReminder}
              onChange={(e) => {
                setDueReminder(e.target.value);
                saveSetting("due-reminder", e.target.value);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {DUE_REMINDER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
