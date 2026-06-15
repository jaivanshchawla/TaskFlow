import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  activeTaskId: string | null;
  viewMode: "list" | "kanban" | "calendar";
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveTaskId: (id: string | null) => void;
  setViewMode: (mode: "list" | "kanban" | "calendar") => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      commandPaletteOpen: false,
      activeTaskId: null,
      viewMode: "list",
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setActiveTaskId: (id) => set({ activeTaskId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    { name: "taskflow-ui" }
  )
);