"use client";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { LIST_ITEM } from "@/lib/animations";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  trend?: number;
  delay?: number;
}

export function StatsCard({ title, value, icon, description, trend, delay = 0 }: StatsCardProps) {
  const count = useMotionValue(0);
  const rounded = useSpring(count, { stiffness: 300, damping: 30 });
  const display = useTransform(rounded, (v) => Math.round(v).toLocaleString());
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      count.set(value);
    }
  }, [value, count]);

  return (
    <motion.div
      variants={LIST_ITEM}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      className="p-5 rounded-xl border"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            {title}
          </p>
          <motion.p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {display}
          </motion.p>
          <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          <span className={`text-xs font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>vs last week</span>
        </div>
      )}
    </motion.div>
  );
}
