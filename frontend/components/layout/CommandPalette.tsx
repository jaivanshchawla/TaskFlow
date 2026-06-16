"use client";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard, CheckSquare, Kanban, Calendar,
  Tag, FileDown, ArrowRight,
} from "lucide-react";
import { PlusIcon } from "@/components/ui/plus";
import { SearchIcon } from "@/components/ui/search";
import { XIcon } from "@/components/ui/x";
import { CopyIcon } from "@/components/ui/copy";
import { useUIStore } from "@/store/uiStore";
import { MODAL_VARIANTS } from "@/lib/animations";
import { logger } from "@/lib/logger";
import { useSearchTasks, useLabels } from "@/hooks/useTasks";
import { STATUS_OPTIONS } from "@/lib/constants";

function getRecentlyViewed(): { id: string; title: string; path: string }[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("taskflow-recently-viewed");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [search, setSearch] = useState("");
  const { data: searchResults } = useSearchTasks(search, commandPaletteOpen && search.length > 1);
  const { data: labels } = useLabels();
  const recentlyViewed = getRecentlyViewed();

  const close = useCallback(() => {
    setCommandPaletteOpen(false);
    setSearch("");
    logger.debug("CommandPalette", "Closed");
  }, [setCommandPaletteOpen]);

  const run = useCallback((fn: () => void) => {
    fn();
    close();
  }, [close]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        logger.info("CommandPalette", commandPaletteOpen ? "Closed via shortcut" : "Opened via shortcut");
      }
      if (e.key === "Escape" && commandPaletteOpen) close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, setCommandPaletteOpen, close]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />

          <motion.div
            variants={MODAL_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed left-1/2 top-[20vh] -translate-x-1/2 w-full max-w-lg z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
            }}
            data-testid="command-palette"
          >
            <Command
              label="Command palette"
              className="w-full"
              style={{ background: "transparent" }}
              shouldFilter={search.length === 0}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b"
                   style={{ borderColor: "var(--border-subtle)" }}>
                <SearchIcon size={15} style={{ color: "var(--text-muted)" }} />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search tasks or type a command..."
                  autoFocus
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: "var(--text-primary)" }}
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <XIcon size={13} style={{ color: "var(--text-muted)" }} />
                  </button>
                )}
                <kbd className="text-[10px] px-1.5 py-0.5 rounded"
                     style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm"
                               style={{ color: "var(--text-muted)" }}>
                  No results found
                </Command.Empty>

                {search.length === 0 && recentlyViewed.length > 0 && (
                  <Command.Group heading={
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
                          style={{ color: "var(--text-muted)" }}>Recently Viewed</span>
                  }>
                    {recentlyViewed.slice(0, 10).map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`recent ${item.title}`}
                        onSelect={() => run(() => router.push(item.path))}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                      >
                        <CopyIcon size={14} style={{ color: "var(--text-muted)" }} />
                        <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {search.length > 1 && searchResults?.data && searchResults.data.length > 0 && (
                  <Command.Group heading={
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
                          style={{ color: "var(--text-muted)" }}>Tasks</span>
                  }>
                    {searchResults.data.slice(0, 5).map((task) => {
                      const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status);
                      return (
                        <Command.Item
                          key={task.id}
                          value={task.id}
                          onSelect={() => run(() => router.push(`/tasks/${task.id}`))}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                        >
                          <CopyIcon size={14} style={{ color: "var(--text-muted)" }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm block truncate" style={{ color: "var(--text-primary)" }}>
                              {task.title}
                            </span>
                            {task.description && (
                              <span className="text-[10px] block truncate" style={{ color: "var(--text-muted)" }}>
                                {task.description.slice(0, 60)}
                              </span>
                            )}
                          </div>
                          {task.labels?.map(l => (
                            <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                                  style={{ background: `${l.color}15`, color: l.color }}>
                              {l.name}
                            </span>
                          ))}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusOpt?.bgClass}`}>
                            {statusOpt?.label}
                          </span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                {search.length > 1 && labels && labels.length > 0 && (
                  <Command.Group heading={
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
                          style={{ color: "var(--text-muted)" }}>Labels</span>
                  }>
                    {labels
                      .filter(l => l.name.toLowerCase().includes(search.toLowerCase()))
                      .slice(0, 5)
                      .map((label) => (
                        <Command.Item
                          key={label.id}
                          value={`label ${label.name}`}
                          onSelect={() => run(() => router.push(`/labels`))}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                        >
                          <Tag size={14} style={{ color: label.color }} />
                          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label.name}</span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                )}

                <Command.Group heading={
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
                        style={{ color: "var(--text-muted)" }}>Navigate</span>
                }>
                  {[
                    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
                    { label: "Task List", icon: CheckSquare, href: "/tasks" },
                    { label: "Kanban Board", icon: Kanban, href: "/tasks/kanban" },
                    { label: "Calendar", icon: Calendar, href: "/tasks/calendar" },
                  ].map(({ label, icon: Icon, href }) => (
                    <Command.Item
                      key={href}
                      value={`go to ${label}`}
                      onSelect={() => run(() => router.push(href))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                    >
                      <Icon size={14} style={{ color: "var(--text-muted)" }} />
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
                      <ArrowRight size={12} className="ml-auto" style={{ color: "var(--text-muted)" }} />
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading={
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1"
                        style={{ color: "var(--text-muted)" }}>Actions</span>
                }>
                  <Command.Item
                    value="create new task"
                    onSelect={() => run(() => router.push("/tasks/new"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                  >
                    <PlusIcon size={14} style={{ color: "var(--accent-bright)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>Create New Task</span>
                    <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                         style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>N</kbd>
                  </Command.Item>
                  <Command.Item
                    value="manage labels"
                    onSelect={() => run(() => router.push("/labels"))}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                  >
                    <Tag size={14} style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>Manage Labels</span>
                  </Command.Item>
                  <Command.Item
                    value="export tasks csv"
                    onSelect={() => run(() => {
                      window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/export`, "_blank");
                    })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                  >
                    <FileDown size={14} style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>Export Tasks (CSV)</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}