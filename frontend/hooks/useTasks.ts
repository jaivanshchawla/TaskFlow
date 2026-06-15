"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, buildQueryString } from "@/lib/api";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import {
  Task,
  PaginatedResponse,
  StatsResponse,
  Label,
  Subtask,
  Comment,
  Attachment,
  ActivityLog,
  FilterState,
  User,
  UserPreferences,
} from "@/types";
import { CreateTaskInput, UpdateTaskInput, CreateLabelInput, CreateSubtaskInput, CreateCommentInput } from "@/lib/schemas";

/* ─── Query Key Factory ─── */
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  export: (filters: Record<string, unknown>) => [...taskKeys.all, "export", filters] as const,
  bulk: () => [...taskKeys.all, "bulk"] as const,
};

export const labelKeys = {
  all: ["labels"] as const,
};

export const subtaskKeys = {
  all: ["subtasks"] as const,
  byTask: (taskId: string) => [...subtaskKeys.all, taskId] as const,
};

export const commentKeys = {
  all: ["comments"] as const,
  byTask: (taskId: string) => [...commentKeys.all, taskId] as const,
};

export const attachmentKeys = {
  all: ["attachments"] as const,
  byTask: (taskId: string) => [...attachmentKeys.all, taskId] as const,
};

export const activityKeys = {
  all: ["activity"] as const,
  byTask: (taskId: string) => [...activityKeys.all, taskId] as const,
};

export const templateKeys = {
  all: ["templates"] as const,
};

export const statsKeys = {
  all: ["stats"] as const,
};

export const userKeys = {
  me: ["user", "me"] as const,
  preferences: ["user", "preferences"] as const,
};

export const adminKeys = {
  users: ["admin", "users"] as const,
  tasks: ["admin", "tasks"] as const,
  stats: ["admin", "stats"] as const,
  activity: ["admin", "activity"] as const,
};

/* ─── User Hooks ─── */
export function useUserMe() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => {
      const token = await getToken();
      logger.info("User", "Fetching current user");
      const res = await apiFetch<{ success: boolean; data: User }>(`/api/v1/users/me`, { token });
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdatePreferences() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const token = await getToken();
      logger.info("User", "Updating preferences", data as object);
      return apiFetch<{ success: boolean; data: UserPreferences }>(`/api/v1/users/me/preferences`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me });
      toast.success("Preferences saved");
    },
    onError: (err) => {
      logger.error("User", "Failed to update preferences", { error: err });
      toast.error("Failed to save preferences");
    },
  });
}

export function useSearchTasks(query: string, enabled: boolean) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: [...taskKeys.all, "search", query],
    queryFn: async () => {
      const token = await getToken();
      logger.info("Tasks", "Searching tasks", { query });
      return apiFetch<PaginatedResponse<Task>>(
        `/api/v1/tasks?search=${encodeURIComponent(query)}&page=1&per_page=10`,
        { token }
      );
    },
    staleTime: 10_000,
    enabled,
  });
}

/* ─── Task Hooks ─── */
export function useTaskList(filters: FilterState, page: number, perPage: number) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taskKeys.list({ ...filters, page, perPage }),
    queryFn: async () => {
      const token = await getToken();
      logger.info("Tasks", "Fetching task list", { filters, page } as object);
      return apiFetch<PaginatedResponse<Task>>(
        `/api/v1/tasks?${buildQueryString(filters as unknown as Record<string, unknown>, page, perPage)}`,
        { token }
      );
    },
    staleTime: 30_000,
    retry: 1,
    retryDelay: 1000,
    placeholderData: (prev) => prev,
  });
}

export function useTask(id: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const token = await getToken();
      logger.info("Tasks", "Fetching task detail", { taskId: id });
      const res = await apiFetch<{ success: boolean; data: Task }>(`/api/v1/tasks/${id}`, { token });
      return res.data;
    },
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCreateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const token = await getToken();
      logger.info("Tasks", "Creating task", { title: data.title });
      return apiFetch<{ success: boolean; data: Task }>("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Task>>({ queryKey: taskKeys.lists() });
      logger.debug("Mutation", "Optimistic create applied", { title: newTask.title });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      logger.warn("Tasks", "Optimistic create rolling back", { error: String(err) });
      toast.error("Failed to create task. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
      logger.info("Tasks", "Task created, cache invalidated");
      toast.success("Task created");
    },
  });
}

export function useUpdateTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskInput }) => {
      const token = await getToken();
      logger.info("Tasks", "Updating task", { taskId: id, fields: Object.keys(data) });
      return apiFetch<{ success: boolean; data: Task }>(`/api/v1/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      const previous = queryClient.getQueryData<Task>(taskKeys.detail(id));
      if (previous) {
        queryClient.setQueryData<Task>(taskKeys.detail(id), { ...previous, ...data } as Task);
      }
      logger.debug("Mutation", "Optimistic update applied", { taskId: id });
      return { previous };
    },
    onError: (err, { id }, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(taskKeys.detail(id), ctx.previous);
      }
      logger.warn("Tasks", "Optimistic update rolling back", { error: String(err) });
      toast.error("Failed to update task. Changes reverted.");
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
}

export function useDeleteTask() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      logger.info("Tasks", "Deleting task", { taskId: id });
      await apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE", token });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Task>>({ queryKey: taskKeys.lists() });
      queryClient.setQueriesData<PaginatedResponse<Task>>({ queryKey: taskKeys.lists() }, (old) => {
        if (!old) return old;
        return { ...old, data: old.data.filter((t) => t.id !== id) };
      });
      logger.debug("Mutation", "Optimistic delete applied", { taskId: id });
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      logger.warn("Tasks", "Optimistic delete rolling back", { error: String(err) });
      toast.error("Failed to delete task. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
      toast.success("Task deleted");
    },
  });
}

export function useBulkAction() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskIds, action, payload }: { taskIds: string[]; action: string; payload?: Record<string, unknown> }) => {
      const token = await getToken();
      logger.info("Tasks", "Bulk action", { count: taskIds.length, action });
      return apiFetch<{ success: boolean }>("/api/v1/tasks/bulk", {
        method: "POST",
        body: JSON.stringify({ task_ids: taskIds, action, payload }),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
      toast.success("Bulk action completed");
    },
    onError: (err) => {
      logger.error("Tasks", "Bulk action failed", { error: String(err) });
      toast.error("Bulk action failed");
    },
  });
}

export function useExportTasks(filters: FilterState) {
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      logger.info("Tasks", "Exporting tasks", { filters } as object);
      const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"}/api/v1/tasks/export?${buildQueryString(filters as unknown as Record<string, unknown>, 1, 10000)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `taskflow-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Export downloaded");
    },
    onError: (err) => {
      logger.error("Tasks", "Export failed", { error: String(err) });
      toast.error("Failed to export tasks");
    },
  });
}

/* ─── Stats Hooks ─── */
export function useStats() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: statsKeys.all,
    queryFn: async () => {
      const token = await getToken();
      logger.info("Stats", "Fetching dashboard stats");
      const res = await apiFetch<{ success: boolean; data: StatsResponse }>("/api/v1/stats", { token });
      return res.data;
    },
    staleTime: 60_000,
    retry: 1,
    retryDelay: 1000,
  });
}

/* ─── Label Hooks ─── */
export function useLabels() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: labelKeys.all,
    queryFn: async () => {
      const token = await getToken();
      logger.info("Labels", "Fetching labels");
      const res = await apiFetch<{ success: boolean; data: Label[] }>("/api/v1/labels", { token });
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateLabel() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateLabelInput) => {
      const token = await getToken();
      logger.info("Labels", "Creating label", { name: data.name });
      return apiFetch<{ success: boolean; data: Label }>("/api/v1/labels", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
      toast.success("Label created");
    },
    onError: (err) => {
      logger.error("Labels", "Failed to create label", { error: String(err) });
      toast.error("Failed to create label");
    },
  });
}

export function useUpdateLabel() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateLabelInput> }) => {
      const token = await getToken();
      logger.info("Labels", "Updating label", { labelId: id });
      return apiFetch<{ success: boolean; data: Label }>(`/api/v1/labels/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
      toast.success("Label updated");
    },
    onError: (err) => {
      logger.error("Labels", "Failed to update label", { error: String(err) });
      toast.error("Failed to update label");
    },
  });
}

export function useDeleteLabel() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      logger.info("Labels", "Deleting label", { labelId: id });
      await apiFetch(`/api/v1/labels/${id}`, { method: "DELETE", token });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Label deleted");
    },
    onError: (err) => {
      logger.error("Labels", "Failed to delete label", { error: String(err) });
      toast.error("Failed to delete label");
    },
  });
}

/* ─── Subtask Hooks ─── */
export function useSubtasks(taskId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: subtaskKeys.byTask(taskId),
    queryFn: async () => {
      const token = await getToken();
      logger.info("Subtasks", "Fetching subtasks", { taskId });
      const res = await apiFetch<{ success: boolean; data: Task }>(`/api/v1/tasks/${taskId}`, { token });
      return res.data?.subtasks ?? [];
    },
    staleTime: 30_000,
    enabled: !!taskId,
  });
}

export function useCreateSubtask(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSubtaskInput) => {
      const token = await getToken();
      logger.info("Subtasks", "Creating subtask", { taskId, title: data.title });
      return apiFetch<{ success: boolean; data: Subtask }>(`/api/v1/tasks/${taskId}/subtasks`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) });
    },
    onError: (err) => {
      logger.error("Subtasks", "Failed to create subtask", { error: String(err) });
      toast.error("Failed to add subtask");
    },
  });
}

export function useUpdateSubtask(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subtaskId, data }: { subtaskId: string; data: Partial<Subtask> }) => {
      const token = await getToken();
      logger.info("Subtasks", "Updating subtask", { subtaskId });
      return apiFetch<{ success: boolean; data: Subtask }>(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) });
    },
    onError: (err) => {
      logger.error("Subtasks", "Failed to update subtask", { error: String(err) });
      toast.error("Failed to update subtask");
    },
  });
}

export function useDeleteSubtask(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subtaskId: string) => {
      const token = await getToken();
      logger.info("Subtasks", "Deleting subtask", { subtaskId });
      await apiFetch(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE", token });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) });
    },
    onError: (err) => {
      logger.error("Subtasks", "Failed to delete subtask", { error: String(err) });
      toast.error("Failed to delete subtask");
    },
  });
}

export function useReorderSubtasks(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const token = await getToken();
      logger.info("Subtasks", "Reordering subtasks", { taskId, count: orderedIds.length });
      return apiFetch(`/api/v1/tasks/${taskId}/subtasks/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ ordered_ids: orderedIds }),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

/* ─── Comment Hooks ─── */
export function useComments(taskId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: commentKeys.byTask(taskId),
    queryFn: async () => {
      const token = await getToken();
      logger.info("Comments", "Fetching comments", { taskId });
      const res = await apiFetch<{ success: boolean; data: Comment[] }>(`/api/v1/tasks/${taskId}/comments`, { token });
      return res.data;
    },
    staleTime: 30_000,
    enabled: !!taskId,
  });
}

export function useCreateComment(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCommentInput) => {
      const token = await getToken();
      logger.info("Comments", "Creating comment", { taskId });
      return apiFetch<{ success: boolean; data: Comment }>(`/api/v1/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Comment added");
    },
    onError: (err) => {
      logger.error("Comments", "Failed to create comment", { error: String(err) });
      toast.error("Failed to add comment");
    },
  });
}

export function useUpdateComment(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const token = await getToken();
      logger.info("Comments", "Updating comment", { commentId });
      return apiFetch<{ success: boolean; data: Comment }>(`/api/v1/tasks/${taskId}/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byTask(taskId) });
      toast.success("Comment updated");
    },
    onError: (err) => {
      logger.error("Comments", "Failed to update comment", { error: String(err) });
      toast.error("Failed to update comment");
    },
  });
}

export function useDeleteComment(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const token = await getToken();
      logger.info("Comments", "Deleting comment", { commentId });
      await apiFetch(`/api/v1/tasks/${taskId}/comments/${commentId}`, { method: "DELETE", token });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Comment deleted");
    },
    onError: (err) => {
      logger.error("Comments", "Failed to delete comment", { error: String(err) });
      toast.error("Failed to delete comment");
    },
  });
}

/* ─── Attachment Hooks ─── */
export function useAttachments(taskId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: attachmentKeys.byTask(taskId),
    queryFn: async () => {
      const token = await getToken();
      logger.info("Attachments", "Fetching attachments", { taskId });
      const res = await apiFetch<{ success: boolean; data: Attachment[] }>(`/api/v1/tasks/${taskId}/attachments`, { token });
      return res.data;
    },
    staleTime: 30_000,
    enabled: !!taskId,
  });
}

export function useCreateAttachment(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file_name: string; file_url: string; file_size: number; file_type: string }) => {
      const token = await getToken();
      logger.info("Attachments", "Creating attachment", { taskId, fileName: data.file_name });
      return apiFetch<{ success: boolean; data: Attachment }>(`/api/v1/tasks/${taskId}/attachments`, {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Attachment added");
    },
    onError: (err) => {
      logger.error("Attachments", "Failed to create attachment", { error: String(err) });
      toast.error("Failed to add attachment");
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const token = await getToken();
      logger.info("Attachments", "Deleting attachment", { attachmentId });
      await apiFetch(`/api/v1/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE", token });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Attachment deleted");
    },
    onError: (err) => {
      logger.error("Attachments", "Failed to delete attachment", { error: String(err) });
      toast.error("Failed to delete attachment");
    },
  });
}

/* ─── Activity Hooks ─── */
export function useActivity(taskId: string, page = 1, perPage = 20) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: [...activityKeys.byTask(taskId), page],
    queryFn: async () => {
      const token = await getToken();
      logger.info("Activity", "Fetching activity log", { taskId, page });
      return apiFetch<PaginatedResponse<ActivityLog>>(
        `/api/v1/tasks/${taskId}/activity?page=${page}&per_page=${perPage}`,
        { token }
      );
    },
    staleTime: 30_000,
    enabled: !!taskId,
  });
}

/* ─── Template Hooks ─── */
export interface TaskTemplate {
  id: string;
  user_id: string;
  name: string;
  title_template: string | null;
  description_template: string | null;
  priority: string;
  default_labels: string[];
  created_at: string;
}

export function useTemplates() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: async () => {
      const token = await getToken();
      logger.info("Templates", "Fetching templates");
      const res = await apiFetch<{ success: boolean; data: TaskTemplate[] }>("/api/v1/templates", { token });
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateTemplate() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<TaskTemplate, "id" | "user_id" | "created_at">) => {
      const token = await getToken();
      logger.info("Templates", "Creating template", { name: data.name });
      return apiFetch<{ success: boolean; data: TaskTemplate }>("/api/v1/templates", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success("Template created");
    },
    onError: (err) => {
      logger.error("Templates", "Failed to create template", { error: String(err) });
      toast.error("Failed to create template");
    },
  });
}

export function useDeleteTemplate() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      logger.info("Templates", "Deleting template", { templateId: id });
      await apiFetch(`/api/v1/templates/${id}`, { method: "DELETE", token });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success("Template deleted");
    },
    onError: (err) => {
      logger.error("Templates", "Failed to delete template", { error: String(err) });
      toast.error("Failed to delete template");
    },
  });
}

export function useApplyTemplate() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const token = await getToken();
      logger.info("Templates", "Applying template", { templateId });
      return apiFetch<{ success: boolean; data: Task }>(`/api/v1/templates/${templateId}/apply`, {
        method: "POST",
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
      toast.success("Template applied, task created");
    },
    onError: (err) => {
      logger.error("Templates", "Failed to apply template", { error: String(err) });
      toast.error("Failed to apply template");
    },
  });
}

/* ─── Admin Hooks ─── */
export function useAdminUsers() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: adminKeys.users,
    queryFn: async () => {
      const token = await getToken();
      logger.info("Admin", "Fetching all users");
      const res = await apiFetch<{ success: boolean; data: User[] }>("/api/v1/admin/users", { token });
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useAdminUpdateUser() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const token = await getToken();
      logger.info("Admin", "Updating user role", { userId: id, role });
      return apiFetch<{ success: boolean; data: User }>(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
        token,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users });
      toast.success("User role updated");
    },
    onError: (err) => {
      logger.error("Admin", "Failed to update user", { error: String(err) });
      toast.error("Failed to update user");
    },
  });
}

export function useAdminTasks(filters: FilterState, page: number, perPage: number) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: [...adminKeys.tasks, filters, page, perPage],
    queryFn: async () => {
      const token = await getToken();
      logger.info("Admin", "Fetching all tasks", { page });
      return apiFetch<PaginatedResponse<Task>>(
        `/api/v1/admin/tasks?${buildQueryString(filters as unknown as Record<string, unknown>, page, perPage)}`,
        { token }
      );
    },
    staleTime: 30_000,
  });
}

export function useAdminStats() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: async () => {
      const token = await getToken();
      logger.info("Admin", "Fetching platform stats");
      const res = await apiFetch<{ success: boolean; data: StatsResponse }>("/api/v1/admin/stats", { token });
      return res.data;
    },
    staleTime: 60_000,
  });
}