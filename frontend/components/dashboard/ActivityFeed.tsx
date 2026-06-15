"use client";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { CircleCheckIcon } from "@/components/ui/circle-check";
import { ClockIcon } from "@/components/ui/clock";
import { TrendingUpIcon } from "@/components/ui/trending-up";
import { PlusIcon } from "@/components/ui/plus";
import { RefreshCWIcon } from "@/components/ui/refresh-cw";
import { MessageSquareIcon } from "@/components/ui/message-square";
import { SettingsIcon } from "@/components/ui/settings";
import { CopyIcon } from "@/components/ui/copy";
import { FileTextIcon } from "@/components/ui/file-text";
import { LIST_CONTAINER, LIST_ITEM } from "@/lib/animations";
import type { ActivityLog } from "@/types";

const ACTION_ICONS: Record<string, React.ElementType> = {
  task_created: PlusIcon,
  task_updated: SettingsIcon,
  task_deleted: CopyIcon,
  status_changed: RefreshCWIcon,
  priority_changed: TrendingUpIcon,
  due_date_changed: ClockIcon,
  comment_added: MessageSquareIcon,
  attachment_added: FileTextIcon,
  subtask_added: PlusIcon,
  subtask_completed: CircleCheckIcon,
  label_added: FileTextIcon,
  assigned: PlusIcon,
};

const ACTION_LABELS: Record<string, string> = {
  task_created: "created a task",
  task_updated: "updated a task",
  task_deleted: "deleted a task",
  status_changed: "changed status",
  priority_changed: "changed priority",
  due_date_changed: "changed due date",
  comment_added: "added a comment",
  attachment_added: "added an attachment",
  subtask_added: "added a subtask",
  subtask_completed: "completed a subtask",
  label_added: "added a label",
  assigned: "assigned a task",
};

interface ActivityFeedProps {
  items: ActivityLog[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <p className="text-xs py-8 text-center" style={{ color: "var(--text-muted)" }}>
        No recent activity
      </p>
    );
  }

  return (
    <motion.ul variants={LIST_CONTAINER} initial="initial" animate="animate" className="space-y-1">
      {items.map((log) => {
        const Icon = ACTION_ICONS[log.action] ?? ClockIcon;
        const label = ACTION_LABELS[log.action] ?? log.action;
        return (
          <motion.li
            key={log.id}
            variants={LIST_ITEM}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors"
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div className="p-1.5 rounded-md bg-violet-500/10 shrink-0 mt-0.5">
              <Icon size={12} style={{ color: "var(--accent-bright)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                <span className="font-medium">{log.user?.name ?? "User"}</span>
                {" "}
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                {log.field_changed && (
                  <span style={{ color: "var(--text-muted)" }}> ({log.field_changed})</span>
                )}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </p>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
