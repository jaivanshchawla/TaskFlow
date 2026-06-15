"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { FileText, Play, Trash2 } from "lucide-react";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTasks";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PAGE_VARIANTS, LIST_CONTAINER, LIST_ITEM } from "@/lib/animations";
import { StatCardSkeleton } from "@/components/shared/SkeletonLoader";
import { PRIORITY_OPTIONS } from "@/lib/constants";
import { logger } from "@/lib/logger";

export default function TemplatesPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    logger.info("Templates", "Deleting template", { id: deleteTarget.id });
    deleteTemplate.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <motion.div variants={PAGE_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-6">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Templates</h2>

      {(!templates || templates.length === 0) ? (
        <EmptyState
          title="No templates yet"
          description="Create templates from the task form to reuse common task configurations"
          icon="tasks"
        />
      ) : (
        <motion.div variants={LIST_CONTAINER} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {templates?.map(tpl => {
              const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === tpl.priority);
              return (
                <motion.div
                  key={tpl.id}
                  variants={LIST_ITEM}
                  layout
                  className="p-4 rounded-xl group"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-violet-500/10 shrink-0">
                      <FileText size={16} style={{ color: "var(--accent-bright)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{tpl.name}</h3>
                      {tpl.title_template && (
                        <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{tpl.title_template}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: `${priorityOpt?.color}20`, color: priorityOpt?.color }}
                    >
                      {priorityOpt?.label}
                    </span>
                    {tpl.default_labels.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-overlay)", color: "var(--text-muted)" }}>
                        {tpl.default_labels.length} labels
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => router.push(`/tasks/new?template=${tpl.id}`)}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white flex-1 justify-center"
                      style={{ background: "var(--accent)" }}
                    >
                      <Play size={10} />
                      Apply
                    </motion.button>
                    <button
                      onClick={() => setDeleteTarget({ id: tpl.id, name: tpl.name })}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete template"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  );
}
