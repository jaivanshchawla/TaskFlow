import { create } from "zustand";
import { persist } from "zustand/middleware";
import { KanbanCardSize, ColumnConfig, Notification } from "@/types";

function loadNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("taskflow-notifications");
    if (!stored) return [];
    const items: Notification[] = JSON.parse(stored);
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return items.filter((n) => new Date(n.created_at).getTime() > cutoff);
  } catch {
    return [];
  }
}

interface UIStore {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  activeTaskId: string | null;
  viewMode: "list" | "kanban" | "calendar";
  kanbanCardSize: KanbanCardSize;
  kanbanGroupBy: "none" | "priority" | "assignee" | "label";
  columnConfigs: ColumnConfig[];
  notifications: Notification[];
  keyboardShortcutsModalOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveTaskId: (id: string | null) => void;
  setViewMode: (mode: "list" | "kanban" | "calendar") => void;
  setKanbanCardSize: (size: KanbanCardSize) => void;
  setKanbanGroupBy: (group: "none" | "priority" | "assignee" | "label") => void;
  setColumnConfigs: (configs: ColumnConfig[]) => void;
  updateColumnConfig: (id: string, updates: Partial<ColumnConfig>) => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "created_at">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearOldNotifications: () => void;
  setKeyboardShortcutsModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      commandPaletteOpen: false,
      activeTaskId: null,
      viewMode: "list",
      kanbanCardSize: "default",
      kanbanGroupBy: "none",
      columnConfigs: [],
      notifications: loadNotifications(),
      keyboardShortcutsModalOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setActiveTaskId: (id) => set({ activeTaskId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setKanbanCardSize: (size) => set({ kanbanCardSize: size }),
      setKanbanGroupBy: (group) => set({ kanbanGroupBy: group }),
      setColumnConfigs: (configs) => set({ columnConfigs: configs }),
      updateColumnConfig: (id, updates) => set((state) => ({
        columnConfigs: state.columnConfigs.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          read: false,
          created_at: new Date().toISOString(),
        };
        const updated = [newNotification, ...get().notifications];
        localStorage.setItem("taskflow-notifications", JSON.stringify(updated));
        set({ notifications: updated });
      },
      markNotificationRead: (id) => {
        const updated = get().notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        localStorage.setItem("taskflow-notifications", JSON.stringify(updated));
        set({ notifications: updated });
      },
      markAllNotificationsRead: () => {
        const updated = get().notifications.map((n) => ({ ...n, read: true }));
        localStorage.setItem("taskflow-notifications", JSON.stringify(updated));
        set({ notifications: updated });
      },
      clearOldNotifications: () => {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const updated = get().notifications.filter(
          (n) => new Date(n.created_at).getTime() > cutoff
        );
        localStorage.setItem("taskflow-notifications", JSON.stringify(updated));
        set({ notifications: updated });
      },
      setKeyboardShortcutsModalOpen: (open) => set({ keyboardShortcutsModalOpen: open }),
    }),
    {
      name: "taskflow-ui",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        viewMode: state.viewMode,
        kanbanCardSize: state.kanbanCardSize,
        kanbanGroupBy: state.kanbanGroupBy,
        columnConfigs: state.columnConfigs,
      }),
    }
  )
);