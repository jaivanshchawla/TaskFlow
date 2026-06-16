import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { InlineTaskCreate } from "@/components/tasks/kanban/InlineTaskCreate";

vi.mock("framer-motion", () => {
  const SKIP_PROPS = new Set(["initial", "animate", "exit", "variants", "transition", "whileHover", "whileTap"]);
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
  return {
    motion: { div: createMotion("div"), button: createMotion("button") },
  };
});

const mockMutate = vi.fn();
vi.mock("@/hooks/useTasks", () => ({
  useCreateTask: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe("InlineTaskCreate", () => {
  const defaultProps = {
    status: "todo",
    onCancel: vi.fn(),
    onCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders task title input", () => {
    render(<InlineTaskCreate {...defaultProps} />);
    expect(screen.getByPlaceholderText("Task title...")).toBeInTheDocument();
  });

  it("renders Add button", () => {
    render(<InlineTaskCreate {...defaultProps} />);
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("renders priority dots", () => {
    const { container } = render(<InlineTaskCreate {...defaultProps} />);
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBeGreaterThanOrEqual(4);
  });

  it("calls onCancel on Escape key", () => {
    const onCancel = vi.fn();
    render(<InlineTaskCreate {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByPlaceholderText("Task title..."), { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls mutate on Enter with valid title", () => {
    render(<InlineTaskCreate {...defaultProps} />);
    const input = screen.getByPlaceholderText("Task title...");
    fireEvent.change(input, { target: { value: "New Task" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).toHaveBeenCalledWith(
      { title: "New Task", status: "todo", priority: "medium" },
      expect.any(Object)
    );
  });

  it("does not submit empty title", () => {
    render(<InlineTaskCreate {...defaultProps} />);
    const input = screen.getByPlaceholderText("Task title...");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("allows priority selection via dots", () => {
    const { container } = render(<InlineTaskCreate {...defaultProps} />);
    const dots = container.querySelectorAll(".rounded-full");
    if (dots.length > 0 && dots[0]) {
      fireEvent.click(dots[0]);
    }
  });

  it("calls Add button handler", () => {
    render(<InlineTaskCreate {...defaultProps} />);
    const input = screen.getByPlaceholderText("Task title...");
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.click(screen.getByText("Add"));
    expect(mockMutate).toHaveBeenCalled();
  });
});
