import { create } from "zustand";
import { FilterState } from "@/types";

interface TaskStore {
  selectedTaskIds: string[];
  activeFilters: FilterState;
  toggleTaskSelection: (id: string) => void;
  selectAllTasks: (ids: string[]) => void;
  clearSelection: () => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
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

export const useTaskStore = create<TaskStore>((set) => ({
  selectedTaskIds: [],
  activeFilters: defaultFilters,
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
}));