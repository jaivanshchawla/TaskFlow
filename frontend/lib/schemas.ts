import { z } from "zod";

export const TaskStatus = z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]);
export const TaskPriority = z.enum(["low", "medium", "high", "urgent"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title is too long"),
  description: z.string().max(10000).optional(),
  status: TaskStatus.default("todo"),
  priority: TaskPriority.default("medium"),
  due_date: z.string().datetime().optional().nullable(),
  label_ids: z.array(z.string().uuid()).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();
export const createCommentSchema = z.object({ content: z.string().min(1).max(5000) });
export const createLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
});
export const createSubtaskSchema = z.object({ title: z.string().min(1).max(500) });
export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  default_view: z.enum(["list", "kanban", "calendar"]),
  items_per_page: z.number().int().min(10).max(100),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;