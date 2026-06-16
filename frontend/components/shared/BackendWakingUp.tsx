"use client";

import { motion } from "motion/react";

export function BackendWakingUp() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 py-20"
    >
      <div className="relative w-12 h-12">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: "2px solid var(--accent)", borderTopColor: "transparent" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{ border: "2px solid var(--accent)", borderBottomColor: "transparent" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Waking up the backend…
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          This may take 20–35 seconds on first load
        </p>
      </div>
    </motion.div>
  );
}
