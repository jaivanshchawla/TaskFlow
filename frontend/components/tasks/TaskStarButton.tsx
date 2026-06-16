"use client";
import { motion } from "motion/react";
import { useTaskStore } from "@/store/taskStore";
import { Star } from "lucide-react";
import { SPRING_SNAPPY } from "@/lib/animations";

interface TaskStarButtonProps {
  taskId: string;
  size?: number;
}

export function TaskStarButton({ taskId, size = 14 }: TaskStarButtonProps) {
  const favoritedTaskIds = useTaskStore((s) => s.favoritedTaskIds);
  const toggleFavorite = useTaskStore((s) => s.toggleFavorite);
  const isFavorited = favoritedTaskIds.includes(taskId);

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      transition={SPRING_SNAPPY}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(taskId);
      }}
      className="p-1 rounded-md transition-colors"
      style={{ color: isFavorited ? "#eab308" : "var(--text-muted)" }}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <motion.div
        key={isFavorited ? "filled" : "outline"}
        initial={{ scale: 0.6, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRING_SNAPPY}
      >
        <Star size={size} fill={isFavorited ? "currentColor" : "none"} />
      </motion.div>
    </motion.button>
  );
}
