"use client";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { MODAL_VARIANTS } from "@/lib/animations";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open, title, description,
  confirmLabel = "Confirm", onConfirm, onCancel, danger = false
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              variants={MODAL_VARIANTS}
              initial="initial" animate="animate" exit="exit"
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex items-start gap-3 mb-4">
                {danger && (
                  <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                    <AlertTriangle size={16} className="text-red-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <motion.button
                  onClick={onCancel}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: "var(--bg-overlay)", color: "var(--text-secondary)" }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                  style={{ background: danger ? "#ef4444" : "var(--accent)" }}
                >
                  {confirmLabel}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}