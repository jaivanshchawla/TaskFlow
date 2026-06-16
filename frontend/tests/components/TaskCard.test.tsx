import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// Mock Clerk auth
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("mock-token"),
    userId: "user-1",
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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("TaskCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders task title", () => {
    renderWithProviders(<TaskCard task={mockTask} />);
    expect(screen.getByText("Build the API")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    renderWithProviders(<TaskCard task={mockTask} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders priority dot", () => {
    const { container } = renderWithProviders(<TaskCard task={mockTask} />);
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("renders label names", () => {
    renderWithProviders(<TaskCard task={mockTask} />);
    expect(screen.getByText("Backend")).toBeInTheDocument();
  });

  it("renders due date when present", () => {
    renderWithProviders(<TaskCard task={mockTask} />);
    const dateText = screen.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    expect(dateText).toBeInTheDocument();
  });

  it("renders urgent priority with pulse animation", () => {
    const urgentTask = { ...mockTask, priority: "urgent" as const };
    const { container } = renderWithProviders(<TaskCard task={urgentTask} />);
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
    renderWithProviders(<TaskCard task={taskWithManyLabels} />);
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
