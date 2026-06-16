"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useCreateTask } from "@/hooks/useTasks";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { SPRING_SNAPPY } from "@/lib/animations";

interface InlineTaskCreateProps {
  status: string;
  onCancel: () => void;
  onCreated: () => void;
}

export function InlineTaskCreate({ status, onCancel, onCreated }: InlineTaskCreateProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    createTask.mutate(
      { title: trimmed, status: status as "todo" | "in_progress" | "in_review" | "done" | "cancelled", priority: priority as "low" | "medium" | "high" | "urgent" },
      { onSuccess: () => { setTitle(""); onCreated(); } }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") onCancel();
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={SPRING_SNAPPY}
      className="overflow-hidden"
    >
      <div
        className="p-2 rounded-xl"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
      >
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task title..."
          className="w-full bg-transparent text-sm px-2 py-1.5 outline-none placeholder:opacity-40"
          style={{ color: "var(--text-primary)" }}
        />

        <div className="flex items-center gap-1 mt-2 px-1">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className="w-3 h-3 rounded-full transition-transform"
              style={{
                background: p.color,
                transform: priority === p.value ? "scale(1.3)" : "scale(1)",
                boxShadow: priority === p.value ? `0 0 0 2px var(--bg-surface), 0 0 0 3px ${p.color}` : "none",
              }}
              title={p.label}
            />
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>Esc to cancel</span>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="text-[10px] font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-30"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
