"use client";
import { motion } from "framer-motion";
import { MODAL_VARIANTS } from "@/lib/animations";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: "tasks" | "labels" | "search" | "calendar";
}

const ILLUSTRATIONS = {
  tasks: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.2" />
      <rect x="20" y="22" width="24" height="4" rx="2" fill="currentColor" opacity="0.15" />
      <rect x="20" y="30" width="18" height="4" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="20" y="38" width="20" height="4" rx="2" fill="currentColor" opacity="0.12" />
      <circle cx="44" cy="44" r="10" fill="currentColor" opacity="0.06" />
      <path d="M40 44l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  ),
  search: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="28" cy="28" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="38" y1="38" x2="50" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <circle cx="28" cy="28" r="7" fill="currentColor" opacity="0.08" />
    </svg>
  ),
  labels: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="22" cy="22" r="10" fill="currentColor" opacity="0.12" />
      <circle cx="42" cy="22" r="10" fill="currentColor" opacity="0.08" />
      <circle cx="32" cy="40" r="10" fill="currentColor" opacity="0.1" />
    </svg>
  ),
  calendar: (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="16" width="40" height="36" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <line x1="12" y1="26" x2="52" y2="26" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <circle cx="22" cy="36" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="32" cy="36" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="42" cy="36" r="3" fill="currentColor" opacity="0.2" />
      <line x1="22" y1="16" x2="22" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      <line x1="42" y1="16" x2="42" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),
};

export function EmptyState({ title, description, actionLabel, onAction, icon = "tasks" }: EmptyStateProps) {
  return (
    <motion.div
      variants={MODAL_VARIANTS}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div className="mb-6" style={{ color: "var(--text-muted)" }}>
        {ILLUSTRATIONS[icon]}
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "var(--accent)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-bright)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}