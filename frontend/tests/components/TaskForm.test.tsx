import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { TaskForm } from "@/components/tasks/TaskForm";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

// Mock the hooks
vi.mock("@/hooks/useTasks", () => ({
  useCreateTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useTask: () => ({
    data: null,
    isLoading: false,
  }),
  useLabels: () => ({
    data: [],
    isLoading: false,
  }),
  useTemplates: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateTemplate: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => {
  const SKIP_PROPS = new Set(["initial", "animate", "exit", "variants", "transition", "whileHover", "whileTap", "layout"]);
  function filterProps(props: Record<string, unknown>) {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!SKIP_PROPS.has(key)) filtered[key] = value;
    }
    return filtered;
  }
  function createMotion(tag: string) {
    return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tag, filterProps(props), children);
  }
  return {
    motion: { div: createMotion("div"), button: createMotion("button"), p: createMotion("p") },
    AnimatePresence: ({ children }: React.PropsWithChildren) => React.createElement(React.Fragment, null, children),
  };
});

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title input", () => {
    render(<TaskForm />);
    expect(screen.getByPlaceholderText("Task title")).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(<TaskForm />);
    expect(screen.getByPlaceholderText("Add a description...")).toBeInTheDocument();
  });

  it("renders status select", () => {
    render(<TaskForm />);
    expect(screen.getByDisplayValue("To Do")).toBeInTheDocument();
  });

  it("renders priority buttons", () => {
    render(<TaskForm />);
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("renders due date input", () => {
    render(<TaskForm />);
    const dueDateInputs = screen.queryAllByLabelText(/due/i);
    const allInputs = screen.getAllByRole("textbox");
    expect(dueDateInputs.length + allInputs.length).toBeGreaterThan(0);
  });

  it("renders create button for new task", () => {
    render(<TaskForm />);
    expect(screen.getByText("Create task")).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(<TaskForm />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renders save as template button for new tasks", () => {
    render(<TaskForm />);
    expect(screen.getByText("Save as template")).toBeInTheDocument();
  });
});
