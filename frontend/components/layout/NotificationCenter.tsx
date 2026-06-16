"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import { BellIcon } from "@/components/ui/bell";
import { XIcon } from "@/components/ui/x";
import { formatDistanceToNow } from "date-fns";
import { DRAWER_VARIANTS } from "@/lib/animations";
import { CheckSquare, MessageSquare, AlertTriangle, Clock } from "lucide-react";

const NOTIFICATION_ICONS = {
  task_assigned: <CheckSquare size={14} style={{ color: "var(--accent-bright)" }} />,
  task_commented: <MessageSquare size={14} style={{ color: "#3b82f6" }} />,
  task_due_today: <Clock size={14} style={{ color: "#f97316" }} />,
  task_overdue: <AlertTriangle size={14} style={{ color: "#ef4444" }} />,
} as const;

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearOldNotifications,
  } = useUIStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    clearOldNotifications();
  }, [clearOldNotifications]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg transition-colors relative"
        style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <BellIcon size={15} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "#ef4444" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.4)" }}
            />

            <motion.div
              variants={DRAWER_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 w-80 z-50 flex flex-col shadow-2xl"
              style={{
                background: "var(--bg-elevated)",
                borderLeft: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
                      style={{ color: "var(--accent-bright)", background: "rgba(124,58,237,0.08)" }}
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} style={{ color: "var(--text-muted)" }}>
                    <XIcon size={14} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                    <BellIcon size={32} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                    <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>No notifications yet</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-0.5">
                    {notifications.map((n) => (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg group transition-colors"
                        style={{
                          background: n.read ? "transparent" : "rgba(124,58,237,0.04)",
                          opacity: n.read ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-overlay)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? "transparent" : "rgba(124,58,237,0.04)"; }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {NOTIFICATION_ICONS[n.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {n.task_title}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                            {n.message}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <XIcon size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
