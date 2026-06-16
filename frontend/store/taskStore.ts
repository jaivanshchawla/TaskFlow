import { create } from "zustand";
import { FilterState, SavedFilter } from "@/types";

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

interface TaskStore {
  selectedTaskIds: string[];
  activeFilters: FilterState;
  filterMode: "and" | "or";
  savedFilters: SavedFilter[];
  recentFilters: FilterState[];
  favoritedTaskIds: string[];
  toggleTaskSelection: (id: string) => void;
  selectAllTasks: (ids: string[]) => void;
  clearSelection: () => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  filterByContext: (key: string, value: string) => void;
  setFilterMode: (mode: "and" | "or") => void;
  saveFilter: (name: string) => void;
  deleteSavedFilter: (index: number) => void;
  applySavedFilter: (index: number) => void;
  addRecentFilter: (filters: FilterState) => void;
  toggleFavorite: (taskId: string) => void;
}

const defaultFilters: FilterState = {
  status: [],
  priority: [],
  label_ids: [],
  search: "",
  sort_by: "created_at",
  sort_dir: "desc",
  due_today: false,
  overdue: false,
  assigned_to_me: false,
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  selectedTaskIds: [],
  activeFilters: defaultFilters,
  filterMode: "and",
  savedFilters: loadFromStorage<SavedFilter[]>("taskflow-saved-filters", []),
  recentFilters: loadFromStorage<FilterState[]>("taskflow-recent-filters", []).slice(0, 3),
  favoritedTaskIds: loadFromStorage<string[]>("taskflow-favorited-ids", []),
  toggleTaskSelection: (id) => set((state) => ({
    selectedTaskIds: state.selectedTaskIds.includes(id)
      ? state.selectedTaskIds.filter((x) => x !== id)
      : [...state.selectedTaskIds, id],
  })),
  selectAllTasks: (ids) => set({ selectedTaskIds: ids }),
  clearSelection: () => set({ selectedTaskIds: [] }),
  setFilter: (key, value) => set((state) => ({
    activeFilters: { ...state.activeFilters, [key]: value },
  })),
  resetFilters: () => set({ activeFilters: defaultFilters }),
  filterByContext: (key, value) => set((state) => ({
    activeFilters: { ...state.activeFilters, [key]: value },
  })),
  setFilterMode: (mode) => set({ filterMode: mode }),
  saveFilter: (name) => {
    const { activeFilters, savedFilters } = get();
    const updated = [...savedFilters, { name, filters: { ...activeFilters } }];
    localStorage.setItem("taskflow-saved-filters", JSON.stringify(updated));
    set({ savedFilters: updated });
  },
  deleteSavedFilter: (index) => {
    const { savedFilters } = get();
    const updated = savedFilters.filter((_, i) => i !== index);
    localStorage.setItem("taskflow-saved-filters", JSON.stringify(updated));
    set({ savedFilters: updated });
  },
  applySavedFilter: (index) => {
    const { savedFilters } = get();
    if (savedFilters[index]) {
      set({ activeFilters: { ...savedFilters[index].filters } });
    }
  },
  addRecentFilter: (filters) => {
    const { recentFilters } = get();
    const updated = [filters, ...recentFilters.filter((f) => JSON.stringify(f) !== JSON.stringify(filters))].slice(0, 3);
    localStorage.setItem("taskflow-recent-filters", JSON.stringify(updated));
    set({ recentFilters: updated });
  },
  toggleFavorite: (taskId) => {
    const { favoritedTaskIds } = get();
    const updated = favoritedTaskIds.includes(taskId)
      ? favoritedTaskIds.filter((id) => id !== taskId)
      : [...favoritedTaskIds, taskId];
    localStorage.setItem("taskflow-favorited-ids", JSON.stringify(updated));
    set({ favoritedTaskIds: updated });
  },
}));