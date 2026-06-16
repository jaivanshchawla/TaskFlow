"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createTaskSchema, type CreateTaskInput } from "@/lib/schemas";
import { useCreateTask, useUpdateTask, useTask, useLabels, useTemplates, useCreateTemplate } from "@/hooks/useTasks";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import { RecurringTaskField } from "./RecurringTaskField";
import type { RecurrenceConfig } from "@/types";

interface TaskFormProps {
  taskId?: string;
  initialTemplateId?: string;
  onSuccess?: () => void;
}

export function TaskForm({ taskId, initialTemplateId, onSuccess }: TaskFormProps) {
  const router = useRouter();
  const isEditing = !!taskId;
  const { data: existingTask } = useTask(taskId ?? "");
  const { data: labels } = useLabels();
  const { data: templates } = useTemplates();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const createTemplate = useCreateTemplate();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      due_date: undefined,
      label_ids: [],
    },
  });

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [formShake, setFormShake] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null);

  useEffect(() => {
    if (existingTask) {
      reset({
        title: existingTask.title,
        description: existingTask.description ?? "",
        status: existingTask.status,
        priority: existingTask.priority,
        due_date: existingTask.due_date,
        label_ids: existingTask.labels?.map(l => l.id) ?? [],
      });
      setRecurrence(existingTask.recurrence ?? null);
    }
  }, [existingTask, reset]);

  useEffect(() => {
    if (initialTemplateId && templates) {
      const tpl = templates.find(t => t.id === initialTemplateId);
      if (tpl) {
        reset({
          title: tpl.title_template ?? "",
          description: tpl.description_template ?? "",
          priority: tpl.priority as CreateTaskInput["priority"],
          status: "todo",
          label_ids: tpl.default_labels ?? [],
          due_date: null,
        });
        toast.success(`Template applied: ${tpl.name}`);
      }
    }
  }, [initialTemplateId, templates, reset]);

  const onSubmit = (data: CreateTaskInput) => {
    if (isEditing) {
      updateTask.mutate(
        { id: taskId, data: { ...data, recurrence: recurrence ?? undefined } },
        {
          onSuccess: () => { toast.success("Task updated"); onSuccess?.(); },
          onError: () => { setFormShake(true); setTimeout(() => setFormShake(false), 400); },
        }
      );
    } else {
      createTask.mutate(data, {
        onSuccess: (res) => {
          if (recurrence && res?.data?.id) {
            updateTask.mutate({ id: res.data.id, data: { recurrence } });
          }
          toast.success("Task created"); onSuccess?.(); router.push("/tasks");
        },
        onError: () => { setFormShake(true); setTimeout(() => setFormShake(false), 400); },
      });
    }
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return;
    const values = watch();
    createTemplate.mutate({
      name: templateName,
      title_template: values.title,
      description_template: values.description ?? null,
      priority: values.priority ?? "medium",
      default_labels: values.label_ids ?? [],
    });
    setShowTemplateModal(false);
    setTemplateName("");
  };

  const toggleLabel = (labelId: string) => {
    const current = watch("label_ids") ?? [];
    const next = current.includes(labelId) ? current.filter(id => id !== labelId) : [...current, labelId];
    setValue("label_ids", next, { shouldValidate: true });
  };

  const currentPriority = watch("priority");

  return (
    <motion.div
      animate={formShake ? { x: [0, -4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
        {/* Title */}
        <div>
          <input
            {...register("title")}
            autoFocus
            placeholder="Task title"
            className="w-full text-lg font-semibold bg-transparent outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: "var(--text-primary)" }}
          />
          {errors.title && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-400 mt-1">
              {errors.title.message}
            </motion.p>
          )}
        </div>

        {/* Description */}
        <div>
          <textarea
            {...register("description")}
            placeholder="Add a description..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Status & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Status</label>
            <select
              {...register("status")}
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
                  type="button"
                  onClick={() => setValue("priority", p.value as CreateTaskInput["priority"], { shouldValidate: true })}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{
                    background: currentPriority === p.value ? `${p.color}20` : "var(--bg-elevated)",
                    border: `1px solid ${currentPriority === p.value ? p.color : "var(--border-subtle)"}`,
                    color: currentPriority === p.value ? p.color : "var(--text-muted)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Due Date</label>
          <input
            type="datetime-local"
            {...register("due_date")}
            className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Recurrence */}
        <RecurringTaskField value={recurrence} onChange={setRecurrence} />

        {/* Labels */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Labels</label>
          <div className="flex flex-wrap gap-1.5">
            {(labels ?? []).map(l => {
              const selected = (watch("label_ids") ?? []).includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLabel(l.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                  style={{
                    background: selected ? `${l.color}20` : "var(--bg-elevated)",
                    border: `1px solid ${selected ? l.color : "var(--border-subtle)"}`,
                    color: selected ? l.color : "var(--text-muted)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isEditing ? "Update task" : "Create task"}
          </motion.button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 rounded-lg text-xs transition-colors"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              Save as template
            </button>
          )}
        </div>
      </form>

      {/* Template modal */}
      {showTemplateModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowTemplateModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Save as Template</h3>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-3"
                style={{ background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowTemplateModal(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>Cancel</button>
                <button onClick={handleSaveAsTemplate} className="px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "var(--accent)" }}>Save</button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}
