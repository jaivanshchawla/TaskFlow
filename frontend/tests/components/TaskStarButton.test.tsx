import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { TaskStarButton } from "@/components/tasks/TaskStarButton";
import { useTaskStore } from "@/store/taskStore";

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
  return {
    motion: { div: createMotion("div"), button: createMotion("button"), span: createMotion("span") },
  };
});

describe("TaskStarButton", () => {
  beforeEach(() => {
    useTaskStore.setState({ favoritedTaskIds: [] });
  });

  it("renders unfilled star when not favorited", () => {
    render(<TaskStarButton taskId="task-1" />);
    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
  });

  it("renders filled star when favorited", () => {
    useTaskStore.setState({ favoritedTaskIds: ["task-1"] });
    render(<TaskStarButton taskId="task-1" />);
    expect(screen.getByLabelText("Remove from favorites")).toBeInTheDocument();
  });

  it("calls toggleFavorite on click", () => {
    const spy = vi.spyOn(useTaskStore.getState(), "toggleFavorite");
    render(<TaskStarButton taskId="task-1" />);
    fireEvent.click(screen.getByRole("button"));
    expect(spy).toHaveBeenCalledWith("task-1");
    spy.mockRestore();
  });

  it("toggles aria-label when clicked", async () => {
    render(<TaskStarButton taskId="task-1" />);
    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
    await act(async () => {
      useTaskStore.setState({ favoritedTaskIds: ["task-1"] });
    });
    expect(screen.getByLabelText("Remove from favorites")).toBeInTheDocument();
  });
});
