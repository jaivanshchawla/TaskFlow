import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { mockTask } from "../fixtures";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the hooks
vi.mock("@/hooks/useTasks", () => ({
  useDeleteTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => {
  const SKIP_PROPS = new Set(["initial", "animate", "exit", "variants", "transition", "whileHover", "whileTap", "onHoverStart", "onHoverEnd", "layout", "layoutId"]);
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
    motion: { div: createMotion("div"), li: createMotion("li"), span: createMotion("span") },
    AnimatePresence,
  };
});

describe("TaskCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders task title", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("Build the API")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders priority dot", () => {
    const { container } = render(<TaskCard task={mockTask} />);
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("renders label names", () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText("Backend")).toBeInTheDocument();
  });

  it("renders due date when present", () => {
    render(<TaskCard task={mockTask} />);
    const dateText = screen.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    expect(dateText).toBeInTheDocument();
  });

  it("renders urgent priority with pulse animation", () => {
    const urgentTask = { ...mockTask, priority: "urgent" as const };
    const { container } = render(<TaskCard task={urgentTask} />);
    expect(container.querySelector(".animate-ping")).toBeInTheDocument();
  });

  it("shows +N for overflow labels", () => {
    const taskWithManyLabels = {
      ...mockTask,
      labels: [
        { id: "l1", name: "Frontend", color: "#ef4444" },
        { id: "l2", name: "Bug", color: "#f97316" },
        { id: "l3", name: "Critical", color: "#eab308" },
      ],
    };
    render(<TaskCard task={taskWithManyLabels} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
