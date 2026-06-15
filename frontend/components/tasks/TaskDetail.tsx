"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X, Pencil, Trash2, Plus, CheckCircle, Flag, Calendar,
  MessageSquare, Paperclip, CheckSquare, Tag, UserPlus,
  RefreshCw, Clock, Send, PaperclipIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  useTask, useUpdateTask, useDeleteTask, useSubtasks, useCreateSubtask,
  useUpdateSubtask, useDeleteSubtask, useComments, useCreateComment,
  useDeleteComment, useAttachments, useLabels,
} from "@/hooks/useTasks";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DRAWER_VARIANTS, SPRING_SNAPPY } from "@/lib/animations";
import { logger } from "@/lib/logger";
import type { Task, Subtask, Comment, ActivityLog } from "@/types";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  task_created: Plus,
  task_updated: Pencil,
  task_deleted: Trash2,
  status_changed: RefreshCw,
  priority_changed: Flag,
  due_date_changed: Calendar,
  comment_added: MessageSquare,
  attachment_added: Paperclip,
  subtask_added: CheckSquare,
  subtask_completed: CheckCircle,
  label_added: Tag,
  assigned: UserPlus,
};

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const router = useRouter();
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: subtasks = [] } = useSubtasks(taskId);
  const createSubtask = useCreateSubtask(taskId);
  const updateSubtask = useUpdateSubtask(taskId);
  const deleteSubtask = useDeleteSubtask(taskId);
  const { data: comments = [] } = useComments(taskId);
  const createComment = useCreateComment(taskId);
  const deleteComment = useDeleteComment(taskId);
  const { data: attachments = [] } = useAttachments(taskId);
  const { data: labels } = useLabels();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== task?.title) {
      updateTask.mutate({ id: taskId, data: { title: titleValue.trim() } });
    }
    setEditingTitle(false);
  };

  const handleStatusChange = (status: string) => {
    updateTask.mutate({ id: taskId, data: { status: status as Task["status"] } });
  };

  const handlePriorityChange = (priority: string) => {
    updateTask.mutate({ id: taskId, data: { priority: priority as Task["priority"] } });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    createSubtask.mutate({ title: newSubtaskTitle.trim() });
    setNewSubtaskTitle("");
  };

  const handleToggleSubtask = (subtask: Subtask) => {
    updateSubtask.mutate({ subtaskId: subtask.id, data: { completed: !subtask.completed } });
  };

  const handleComment = () => {
    if (!newComment.trim()) return;
    createComment.mutate({ content: newComment.trim() });
    setNewComment("");
  };

  const handleDelete = () => {
    deleteTask.mutate(taskId, {
      onSuccess: () => { onClose(); router.push("/tasks"); },
    });
    setConfirmDelete(false);
  };

  const sortedSubtasks = useMemo(() => {
    return [...subtasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.position - b.position;
    });
  }, [subtasks]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ background: "var(--bg-surface)" }}>
        <div className="shimmer w-32 h-4 rounded" />
      </div>
    );
  }

  if (!task) return null;

  const statusOpt = STATUS_OPTIONS.find(s => s.value === task.status);
  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === task.priority);

  return (
    <>
      <motion.div
        variants={DRAWER_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full flex flex-col"
        style={{ background: "var(--bg-surface)", borderLeft: "1px solid var(--border-subtle)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 rounded-md" style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Task detail</span>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
            style={{ color: "var(--text-muted)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {/* Section 1: Title */}
            {editingTitle ? (
              <input
                ref={titleRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="w-full text-lg font-semibold bg-transparent outline-none border-b-2"
                style={{ color: "var(--text-primary)", borderColor: "var(--accent)" }}
              />
            ) : (
              <h2
                className="text-lg font-semibold cursor-pointer group flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
                onClick={() => { setTitleValue(task.title); setEditingTitle(true); }}
              >
                {task.title}
                <Pencil size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-muted)" }} />
              </h2>
            )}

            {/* Section 2: Status & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Status</label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none appearance-none cursor-pointer"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Priority</label>
                <div className="flex gap-1">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => handlePriorityChange(p.value)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                      style={{
                        background: task.priority === p.value ? `${p.color}20` : "var(--bg-elevated)",
                        border: `1px solid ${task.priority === p.value ? p.color : "var(--border-subtle)"}`,
                        color: task.priority === p.value ? p.color : "var(--text-muted)",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Due Date */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Due Date</label>
              <input
                type="date"
                value={task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : ""}
                onChange={(e) => updateTask.mutate({ id: taskId, data: { due_date: e.target.value ? new Date(e.target.value).toISOString() : null } })}
                className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            {/* Section 4: Description */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Description</label>
              <textarea
                value={task.description ?? ""}
                onChange={(e) => updateTask.mutate({ id: taskId, data: { description: e.target.value || undefined } })}
                placeholder="Add a description..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>

            {/* Section 5: Labels */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Labels</label>
              <div className="flex flex-wrap gap-1.5">
                {task.labels?.map(l => (
                  <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${l.color}15`, color: l.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                    {l.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Section 6: Subtasks */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
                Subtasks {subtasks.filter(s => s.completed).length}/{subtasks.length}
              </label>
              {subtasks.length > 0 && (
                <div className="w-full h-1 rounded-full mb-2" style={{ background: "var(--bg-overlay)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      background: "var(--accent)",
                      width: `${subtasks.length > 0 ? (subtasks.filter(s => s.completed).length / subtasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              )}
              <AnimatePresence>
                {sortedSubtasks.map(sub => (
                  <motion.div
                    key={sub.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 py-1.5 group"
                  >
                    <button
                      onClick={() => handleToggleSubtask(sub)}
                      className="shrink-0"
                    >
                      <div
                        className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                        style={{
                          borderColor: sub.completed ? "var(--accent)" : "var(--border-default)",
                          background: sub.completed ? "var(--accent)" : "transparent",
                        }}
                      >
                        {sub.completed && <CheckCircle size={10} className="text-white" />}
                      </div>
                    </button>
                    <span
                      className={`text-xs flex-1 ${sub.completed ? "line-through" : ""}`}
                      style={{ color: sub.completed ? "var(--text-muted)" : "var(--text-primary)" }}
                    >
                      {sub.title}
                    </span>
                    <button
                      onClick={() => deleteSubtask.mutate(sub.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  placeholder="Add subtask..."
                  className="flex-1 px-2 py-1 rounded text-xs outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
                <button
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="p-1 rounded disabled:opacity-30"
                  style={{ color: "var(--accent-bright)" }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Section 7: Activity / Comments tabs */}
            <div>
              <div className="flex gap-4 border-b mb-3" style={{ borderColor: "var(--border-subtle)" }}>
                {(["details", "activity"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="pb-2 text-xs font-medium capitalize transition-colors border-b-2"
                    style={{
                      color: activeTab === tab ? "var(--accent-bright)" : "var(--text-muted)",
                      borderColor: activeTab === tab ? "var(--accent)" : "transparent",
                    }}
                  >
                    {tab === "details" ? "Comments" : "Activity"}
                  </button>
                ))}
              </div>

              {activeTab === "details" ? (
                <div className="space-y-3">
                  {/* Comment input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleComment()}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    />
                    <button
                      onClick={handleComment}
                      disabled={!newComment.trim()}
                      className="p-2 rounded-lg disabled:opacity-30"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <Send size={12} />
                    </button>
                  </div>
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3 group">
                      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--accent)" }}>
                        {comment.user?.name?.[0] ?? "U"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{comment.user?.name ?? "User"}</span>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                          <button
                            onClick={() => deleteComment.mutate(comment.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 transition-opacity"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No comments yet</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {task.activity_logs?.map(log => {
                    const Icon = ACTIVITY_ICONS[log.action] ?? Clock;
                    return (
                      <div key={log.id} className="flex items-start gap-2 py-1.5">
                        <div className="p-1 rounded bg-violet-500/10 shrink-0 mt-0.5">
                          <Icon size={10} style={{ color: "var(--accent-bright)" }} />
                        </div>
                        <div>
                          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{log.user?.name ?? "User"}</span>
                            {" "}{log.action.replace(/_/g, " ")}
                            {log.field_changed && <span style={{ color: "var(--text-muted)" }}> ({log.field_changed})</span>}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {!task.activity_logs?.length && (
                    <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No activity yet</p>
                  )}
                </div>
              )}
            </div>

            {/* Attachments section */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                Attachments ({attachments.length})
              </label>
              {attachments.length > 0 ? (
                <div className="space-y-1">
                  {attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                    >
                      <PaperclipIcon size={10} />
                      <span className="truncate flex-1">{att.file_name}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{(att.file_size / 1024).toFixed(1)}KB</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>No attachments</p>
              )}
            </div>

            {/* Meta */}
            <div className="pt-2 border-t space-y-1" style={{ borderColor: "var(--border-subtle)" }}>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        description={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
