import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { mockLabel } from "../fixtures";

// Mock the stores
vi.mock("@/store/taskStore", () => ({
  useTaskStore: vi.fn(() => ({
    activeFilters: {
      status: [],
      priority: [],
      label_ids: [],
      search: "",
      sort_by: "created_at",
      sort_dir: "desc",
      due_today: false,
      overdue: false,
      assigned_to_me: false,
    },
    setFilter: vi.fn(),
    resetFilters: vi.fn(),
  })),
}));

// Mock the hooks
vi.mock("@/hooks/useTasks", () => ({
  useLabels: () => ({
    data: [mockLabel],
    isLoading: false,
  }),
}));

// Mock motion/react
vi.mock("motion/react", () => {
  const SKIP_PROPS = new Set(["initial", "animate", "exit", "variants", "transition", "whileHover", "whileTap", "layout"]);
  function filterProps(props: Record<string, unknown>) {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!SKIP_PROPS.has(key)) filtered[key] = value;
    }
    return filtered;
  }
  function createMotion(tag: string) {
    const Component = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag, filterProps(props), children);
    Component.displayName = `motion.${tag}`;
    return Component;
  }
  const AnimatePresence = ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children);
  AnimatePresence.displayName = "AnimatePresence";
  return {
    motion: { div: createMotion("div"), span: createMotion("span"), button: createMotion("button") },
    AnimatePresence,
  };
});

describe("TaskFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input", () => {
    render(<TaskFilters />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders status filter button", () => {
    render(<TaskFilters />);
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders priority filter button", () => {
    render(<TaskFilters />);
    expect(screen.getAllByText("Priority").length).toBeGreaterThan(0);
  });

  it("renders labels filter button", () => {
    render(<TaskFilters />);
    expect(screen.getByText("Labels")).toBeInTheDocument();
  });

  it("renders due today toggle", () => {
    render(<TaskFilters />);
    expect(screen.getByText("Due today")).toBeInTheDocument();
  });

  it("renders overdue toggle", () => {
    render(<TaskFilters />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("renders assigned to me toggle", () => {
    render(<TaskFilters />);
    expect(screen.getByText("Assigned to me")).toBeInTheDocument();
  });
});
