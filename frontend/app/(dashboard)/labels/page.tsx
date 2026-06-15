"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel } from "@/hooks/useTasks";
import { createLabelSchema } from "@/lib/schemas";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PAGE_VARIANTS, LIST_CONTAINER, LIST_ITEM } from "@/lib/animations";
import { StatCardSkeleton } from "@/components/shared/SkeletonLoader";
import { logger } from "@/lib/logger";

export default function LabelsPage() {
  const { data: labels, isLoading } = useLabels();
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#7c3aed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = () => {
    const result = createLabelSchema.safeParse({ name: newName, color: newColor });
    if (!result.success) return;
    createLabel.mutate(result.data, { onSuccess: () => { setNewName(""); setNewColor("#7c3aed"); } });
  };

  const handleUpdate = (id: string) => {
    const result = createLabelSchema.safeParse({ name: editName, color: editColor });
    if (!result.success) return;
    updateLabel.mutate({ id, data: result.data }, { onSuccess: () => { setEditingId(null); } });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    logger.info("Labels", "Deleting label", { id: deleteTarget.id });
    deleteLabel.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Labels</h2>

      {/* Create form */}
      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <div className="relative">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
            style={{ background: "transparent" }}
          />
        </div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Label name..."
          className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <div className="w-6 h-6 rounded-full shrink-0" style={{ background: newColor }} />
        <motion.button
          onClick={handleCreate}
          disabled={!newName.trim() || createLabel.isPending}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          <Plus size={12} />
          Add
        </motion.button>
      </div>

      {/* Labels grid */}
      {(!labels || labels.length === 0) ? (
        <EmptyState title="No labels yet" description="Create your first label to organize tasks" icon="labels" />
      ) : (
        <motion.div variants={LIST_CONTAINER} initial="initial" animate="animate" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {labels?.map(label => (
              <motion.div
                key={label.id}
                variants={LIST_ITEM}
                layout
                className="p-3 rounded-xl group cursor-pointer"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
              >
                {editingId === label.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(label.id)}
                        autoFocus
                        className="flex-1 px-2 py-1 rounded text-xs outline-none"
                        style={{ background: "var(--bg-overlay)", color: "var(--text-primary)" }}
                      />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleUpdate(label.id)} className="px-2 py-0.5 rounded text-[10px] text-white" style={{ background: "var(--accent)" }}>Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-0.5 rounded text-[10px]" style={{ color: "var(--text-muted)" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full shrink-0" style={{ background: label.color }} />
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: "var(--text-primary)" }}>{label.name}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(label.id); setEditName(label.name); setEditColor(label.color); }}
                        className="p-1 rounded hover:bg-violet-500/10"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: label.id, name: label.name })}
                        className="p-1 rounded hover:bg-red-500/10"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete label"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? It will be removed from all tasks.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  );
}
