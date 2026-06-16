"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Trash2, Clock } from "lucide-react";
import { useTimeEntries, useStartTimeEntry, useStopTimeEntry, useDeleteTimeEntry } from "@/hooks/useTasks";
import { SPRING_SNAPPY } from "@/lib/animations";
import { formatDistanceToNow } from "date-fns";

interface TaskTimeTrackingProps {
  taskId: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TaskTimeTracking({ taskId }: TaskTimeTrackingProps) {
  const { data: entries = [] } = useTimeEntries(taskId);
  const startEntry = useStartTimeEntry();
  const stopEntry = useStopTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const activeEntry = entries.find((e) => !e.ended_at);
  const [elapsed, setElapsed] = useState(() => activeEntry ? Math.floor((Date.now() - new Date(activeEntry.started_at).getTime()) / 1000) : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeEntry) {
      const start = new Date(activeEntry.started_at).getTime();
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0); // eslint-disable-line react-hooks/set-state-in-effect -- resetting timer when active entry changes
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeEntry]);

  const totalTime = entries.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
        Time Tracking
      </label>

      <div className="flex items-center gap-3">
        {activeEntry ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={SPRING_SNAPPY}
            onClick={() => stopEntry.mutate({ taskId, entryId: activeEntry.id })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}
          >
            <Pause size={12} />
            Pause
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={SPRING_SNAPPY}
            onClick={() => startEntry.mutate(taskId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)" }}
          >
            <Play size={12} />
            Start timer
          </motion.button>
        )}

        {activeEntry && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-mono font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {formatDuration(elapsed)}
          </motion.span>
        )}
      </div>

      {totalTime > 0 && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <Clock size={10} />
          Total tracked: {formatDuration(totalTime)}
        </div>
      )}

      {entries.filter((e) => e.ended_at).length > 0 && (
        <div className="space-y-1">
          {entries.filter((e) => e.ended_at).map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SNAPPY}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs group"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <span className="flex-1" style={{ color: "var(--text-secondary)" }}>
                {formatDuration(entry.duration)}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {formatDistanceToNow(new Date(entry.started_at), { addSuffix: true })}
              </span>
              <button
                onClick={() => deleteEntry.mutate({ taskId, entryId: entry.id })}
                className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 size={10} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>No time entries yet</p>
      )}
    </div>
  );
}
