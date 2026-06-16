"use client";
import { motion, AnimatePresence } from "motion/react";
import { useUIStore } from "@/store/uiStore";
import { MODAL_VARIANTS } from "@/lib/animations";
import { XIcon } from "@/components/ui/x";

const SHORTCUT_SECTIONS = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], label: "Command palette" },
      { keys: ["?"], label: "Keyboard shortcuts" },
      { keys: ["Esc"], label: "Close panel / modal" },
      { keys: ["1", "–", "3"], label: "Switch views" },
    ],
  },
  {
    title: "Tasks",
    shortcuts: [
      { keys: ["N"], label: "New task" },
      { keys: ["E"], label: "Edit task" },
      { keys: ["D"], label: "Delete task" },
      { keys: ["Space"], label: "Mark complete" },
    ],
  },
  {
    title: "Filters",
    shortcuts: [
      { keys: ["F"], label: "Open filters" },
      { keys: ["/"], label: "Search" },
      { keys: ["C"], label: "Clear filters" },
    ],
  },
  {
    title: "Bulk",
    shortcuts: [
      { keys: ["⌘", "A"], label: "Select all" },
      { keys: ["⌘", "D"], label: "Delete selected" },
      { keys: ["⌘", "↵"], label: "Mark selected done" },
    ],
  },
];

export function KeyboardShortcutsModal() {
  const { keyboardShortcutsModalOpen, setKeyboardShortcutsModalOpen } = useUIStore();

  return (
    <AnimatePresence>
      {keyboardShortcutsModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setKeyboardShortcutsModalOpen(false)}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          />

          <motion.div
            variants={MODAL_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Keyboard Shortcuts</h3>
              <button
                onClick={() => setKeyboardShortcutsModalOpen(false)}
                style={{ color: "var(--text-muted)" }}
              >
                <XIcon size={14} />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-96 overflow-y-auto">
              {SHORTCUT_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>
                    {section.title}
                  </h4>
                  <div className="space-y-1.5">
                    {section.shortcuts.map((shortcut) => (
                      <div key={shortcut.label} className="flex items-center justify-between py-1">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{shortcut.label}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-0.5">
                              {i > 0 && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+</span>}
                              <kbd
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  background: "var(--bg-overlay)",
                                  color: "var(--text-muted)",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
