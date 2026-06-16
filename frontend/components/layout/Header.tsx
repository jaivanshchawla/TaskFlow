"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { List, Kanban, Calendar } from "lucide-react";
import { SunIcon } from "@/components/ui/sun";
import { MoonIcon } from "@/components/ui/moon";
import { SearchIcon } from "@/components/ui/search";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { useTheme } from "next-themes";
import { useUIStore } from "@/store/uiStore";
import { SPRING_SNAPPY } from "@/lib/animations";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Tasks",
  "/tasks/kanban": "Kanban Board",
  "/tasks/calendar": "Calendar",
  "/labels": "Labels",
  "/templates": "Templates",
  "/settings": "Settings",
  "/admin": "Admin",
  "/admin/users": "Users",
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { viewMode, setViewMode, setCommandPaletteOpen, setKeyboardShortcutsModalOpen } = useUIStore();

  const title = PAGE_TITLES[pathname] ?? "TaskFlow";
  const showViewSwitcher = pathname.startsWith("/tasks");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setKeyboardShortcutsModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setKeyboardShortcutsModalOpen]);

  return (
    <header
      className="h-14 flex items-center gap-4 px-4 shrink-0 sticky top-0 z-30 backdrop-blur-sm"
      style={{
        background: "var(--bg-base)/80",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex-1 max-w-xs flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
      >
        <SearchIcon size={12} />
        <span>Search tasks...</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
             style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        {showViewSwitcher && (
          <div className="flex items-center rounded-lg p-0.5"
               style={{ background: "var(--bg-elevated)" }}>
            {[
              { mode: "list" as const,     icon: List,     href: "/tasks" },
              { mode: "kanban" as const,   icon: Kanban,   href: "/tasks/kanban" },
              { mode: "calendar" as const, icon: Calendar, href: "/tasks/calendar" },
            ].map(({ mode, icon: Icon, href }) => (
              <motion.button
                key={mode}
                onClick={() => { setViewMode(mode); router.push(href); }}
                whileTap={{ scale: 0.92 }}
                className="p-1.5 rounded-md transition-colors"
                style={{
                  background: viewMode === mode ? "var(--bg-overlay)" : "transparent",
                  color: viewMode === mode ? "var(--accent-bright)" : "var(--text-muted)",
                }}
              >
                <Icon size={14} />
              </motion.button>
            ))}
          </div>
        )}

        <motion.button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <motion.div
            animate={{ rotate: theme === "dark" ? 0 : 180, scale: 1 }}
            transition={SPRING_SNAPPY}
          >
            {theme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          </motion.div>
        </motion.button>

        <NotificationCenter />
      </div>
    </header>
  );
}