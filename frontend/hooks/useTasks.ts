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
  TimeEntry,
  TaskDependency,
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

export const timeEntryKeys = {
  byTask: (taskId: string) => [...taskKeys.all, "time-entries", taskId] as const,
};

export const dependencyKeys = {
  byTask: (taskId: string) => [...taskKeys.all, "dependencies", taskId] as const,
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
    placeholderData: (prev) => prev,
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
    retryDelay: 800,
    placeholderData: (prev) => prev,
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
    placeholderData: (prev) => prev,
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
    onMutate: async (newLabel) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.all });
      const previous = queryClient.getQueryData<Label[]>(labelKeys.all);
      const optimistic: Label = {
        id: crypto.randomUUID(),
        name: newLabel.name,
        color: newLabel.color,
      };
      queryClient.setQueryData<Label[]>(labelKeys.all, (old) => [...(old ?? []), optimistic]);
      logger.debug("Mutation", "Optimistic create label applied", { name: newLabel.name });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(labelKeys.all, ctx.previous);
      }
      logger.warn("Labels", "Optimistic create label rolling back", { error: String(err) });
      toast.error("Failed to create label. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
      toast.success("Label created");
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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.all });
      const previous = queryClient.getQueryData<Label[]>(labelKeys.all);
      queryClient.setQueryData<Label[]>(labelKeys.all, (old) =>
        old?.map((l) => (l.id === id ? { ...l, ...data } : l))
      );
      logger.debug("Mutation", "Optimistic update label applied", { labelId: id });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(labelKeys.all, ctx.previous);
      }
      logger.warn("Labels", "Optimistic update label rolling back", { error: String(err) });
      toast.error("Failed to update label. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
      toast.success("Label updated");
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: labelKeys.all });
      const previous = queryClient.getQueryData<Label[]>(labelKeys.all);
      queryClient.setQueryData<Label[]>(labelKeys.all, (old) => old?.filter((l) => l.id !== id));
      logger.debug("Mutation", "Optimistic delete label applied", { labelId: id });
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(labelKeys.all, ctx.previous);
      }
      logger.warn("Labels", "Optimistic delete label rolling back", { error: String(err) });
      toast.error("Failed to delete label. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success("Label deleted");
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
    onMutate: async (newSubtask) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Subtask[]>(subtaskKeys.byTask(taskId));
      const existing = previous ?? [];
      const optimistic: Subtask = {
        id: crypto.randomUUID(),
        task_id: taskId,
        title: newSubtask.title,
        completed: false,
        position: existing.length,
      };
      queryClient.setQueryData<Subtask[]>(subtaskKeys.byTask(taskId), [...existing, optimistic]);
      logger.debug("Mutation", "Optimistic create subtask applied", { taskId });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(subtaskKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("Subtasks", "Optimistic create subtask rolling back", { error: String(err) });
      toast.error("Failed to add subtask. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) });
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
    onMutate: async ({ subtaskId, data }) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Subtask[]>(subtaskKeys.byTask(taskId));
      queryClient.setQueryData<Subtask[]>(subtaskKeys.byTask(taskId), (old) =>
        old?.map((s) => (s.id === subtaskId ? { ...s, ...data } : s))
      );
      logger.debug("Mutation", "Optimistic update subtask applied", { subtaskId });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(subtaskKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("Subtasks", "Optimistic update subtask rolling back", { error: String(err) });
      toast.error("Failed to update subtask. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) });
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
    onMutate: async (subtaskId) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Subtask[]>(subtaskKeys.byTask(taskId));
      queryClient.setQueryData<Subtask[]>(subtaskKeys.byTask(taskId), (old) =>
        old?.filter((s) => s.id !== subtaskId)
      );
      logger.debug("Mutation", "Optimistic delete subtask applied", { subtaskId });
      return { previous };
    },
    onError: (err, subtaskId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(subtaskKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("Subtasks", "Optimistic delete subtask rolling back", { error: String(err) });
      toast.error("Failed to delete subtask. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: subtaskKeys.byTask(taskId) });
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
    onMutate: async (newComment) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Comment[]>(commentKeys.byTask(taskId));
      const optimistic: Comment = {
        id: crypto.randomUUID(),
        task_id: taskId,
        user_id: "",
        content: newComment.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: { id: "", clerk_user_id: "", email: "", name: "You", avatar_url: null, role: "user" },
      };
      queryClient.setQueryData<Comment[]>(commentKeys.byTask(taskId), [...(previous ?? []), optimistic]);
      logger.debug("Mutation", "Optimistic create comment applied", { taskId });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(commentKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("Comments", "Optimistic create comment rolling back", { error: String(err) });
      toast.error("Failed to add comment. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Comment added");
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
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: commentKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Comment[]>(commentKeys.byTask(taskId));
      queryClient.setQueryData<Comment[]>(commentKeys.byTask(taskId), (old) =>
        old?.filter((c) => c.id !== commentId)
      );
      logger.debug("Mutation", "Optimistic delete comment applied", { commentId });
      return { previous };
    },
    onError: (err, commentId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(commentKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("Comments", "Optimistic delete comment rolling back", { error: String(err) });
      toast.error("Failed to delete comment. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Comment deleted");
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
    onMutate: async (newAttachment) => {
      await queryClient.cancelQueries({ queryKey: attachmentKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Attachment[]>(attachmentKeys.byTask(taskId));
      const optimistic: Attachment = {
        id: crypto.randomUUID(),
        task_id: taskId,
        file_name: newAttachment.file_name,
        file_url: newAttachment.file_url,
        file_size: newAttachment.file_size,
        file_type: newAttachment.file_type,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Attachment[]>(attachmentKeys.byTask(taskId), [...(previous ?? []), optimistic]);
      logger.debug("Mutation", "Optimistic create attachment applied", { taskId });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(attachmentKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("Attachments", "Optimistic create attachment rolling back", { error: String(err) });
      toast.error("Failed to add attachment. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Attachment added");
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
    onMutate: async (attachmentId) => {
      await queryClient.cancelQueries({ queryKey: attachmentKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Attachment[]>(attachmentKeys.byTask(taskId));
      queryClient.setQueryData<Attachment[]>(attachmentKeys.byTask(taskId), (old) =>
        old?.filter((a) => a.id !== attachmentId)
      );
      logger.debug("Mutation", "Optimistic delete attachment applied", { attachmentId });
      return { previous };
    },
    onError: (err, attachmentId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(attachmentKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("Attachments", "Optimistic delete attachment rolling back", { error: String(err) });
      toast.error("Failed to delete attachment. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Attachment deleted");
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
    placeholderData: (prev) => prev,
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
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: templateKeys.all });
      const previous = queryClient.getQueryData<TaskTemplate[]>(templateKeys.all);
      const optimistic: TaskTemplate = {
        id: crypto.randomUUID(),
        user_id: "",
        name: newTemplate.name,
        title_template: newTemplate.title_template,
        description_template: newTemplate.description_template,
        priority: newTemplate.priority,
        default_labels: newTemplate.default_labels,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, [...(previous ?? []), optimistic]);
      logger.debug("Mutation", "Optimistic create template applied", { name: newTemplate.name });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(templateKeys.all, ctx.previous);
      }
      logger.warn("Templates", "Optimistic create template rolling back", { error: String(err) });
      toast.error("Failed to create template. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success("Template created");
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: templateKeys.all });
      const previous = queryClient.getQueryData<TaskTemplate[]>(templateKeys.all);
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (old) =>
        old?.filter((t) => t.id !== id)
      );
      logger.debug("Mutation", "Optimistic delete template applied", { templateId: id });
      return { previous };
    },
    onError: (err, id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(templateKeys.all, ctx.previous);
      }
      logger.warn("Templates", "Optimistic delete template rolling back", { error: String(err) });
      toast.error("Failed to delete template. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
      toast.success("Template deleted");
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

/* ─── Time Entry Hooks ─── */
export function useTimeEntries(taskId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: timeEntryKeys.byTask(taskId),
    queryFn: async () => {
      const token = await getToken();
      logger.info("TimeEntries", "Fetching time entries", { taskId });
      const res = await apiFetch<{ success: boolean; data: TimeEntry[] }>(`/api/v1/tasks/${taskId}/time-entries`, { token });
      return res.data;
    },
    staleTime: 30_000,
    enabled: !!taskId,
  });
}

export function useStartTimeEntry() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const token = await getToken();
      logger.info("TimeEntries", "Starting time entry", { taskId });
      return apiFetch<{ success: boolean; data: TimeEntry }>(`/api/v1/tasks/${taskId}/time-entries`, {
        method: "POST",
        token,
      });
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: timeEntryKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<TimeEntry[]>(timeEntryKeys.byTask(taskId));
      const optimistic: TimeEntry = {
        id: crypto.randomUUID(),
        task_id: taskId,
        user_id: "",
        started_at: new Date().toISOString(),
        ended_at: null,
        duration: 0,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<TimeEntry[]>(timeEntryKeys.byTask(taskId), (old) => [
        optimistic,
        ...(old ?? []),
      ]);
      logger.debug("Mutation", "Optimistic start time entry", { taskId });
      return { previous, taskId };
    },
    onError: (err, taskId, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(timeEntryKeys.byTask(taskId), ctx.previous);
      }
      logger.warn("TimeEntries", "Optimistic start rolling back", { error: String(err) });
      toast.error("Failed to start timer. Changes reverted.");
    },
    onSettled: (_data, _err, taskId) => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export function useStopTimeEntry() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, entryId }: { taskId: string; entryId: string }) => {
      const token = await getToken();
      logger.info("TimeEntries", "Stopping time entry", { taskId, entryId });
      return apiFetch<{ success: boolean; data: TimeEntry }>(`/api/v1/tasks/${taskId}/time-entries/${entryId}`, {
        method: "PATCH",
        token,
      });
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
    onError: (err) => {
      logger.error("TimeEntries", "Failed to stop timer", { error: String(err) });
      toast.error("Failed to stop timer");
    },
  });
}

export function useDeleteTimeEntry() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, entryId }: { taskId: string; entryId: string }) => {
      const token = await getToken();
      logger.info("TimeEntries", "Deleting time entry", { taskId, entryId });
      await apiFetch(`/api/v1/tasks/${taskId}/time-entries/${entryId}`, { method: "DELETE", token });
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Time entry deleted");
    },
    onError: (err) => {
      logger.error("TimeEntries", "Failed to delete time entry", { error: String(err) });
      toast.error("Failed to delete time entry");
    },
  });
}

/* ─── Dependency Hooks ─── */
export function useTaskDependencies(taskId: string) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: dependencyKeys.byTask(taskId),
    queryFn: async () => {
      const token = await getToken();
      logger.info("Dependencies", "Fetching dependencies", { taskId });
      const res = await apiFetch<{ success: boolean; data: TaskDependency[] }>(`/api/v1/tasks/${taskId}/dependencies`, { token });
      return res.data;
    },
    staleTime: 30_000,
    enabled: !!taskId,
  });
}

export function useAddDependency() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, dependsOnId }: { taskId: string; dependsOnId: string }) => {
      const token = await getToken();
      logger.info("Dependencies", "Adding dependency", { taskId, dependsOnId });
      return apiFetch<{ success: boolean; data: TaskDependency }>(`/api/v1/tasks/${taskId}/dependencies`, {
        method: "POST",
        body: JSON.stringify({ depends_on_id: dependsOnId }),
        token,
      });
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: dependencyKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Dependency added");
    },
    onError: (err) => {
      logger.error("Dependencies", "Failed to add dependency", { error: String(err) });
      toast.error("Failed to add dependency");
    },
  });
}

export function useRemoveDependency() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, depId }: { taskId: string; depId: string }) => {
      const token = await getToken();
      logger.info("Dependencies", "Removing dependency", { taskId, depId });
      await apiFetch(`/api/v1/tasks/${taskId}/dependencies/${depId}`, { method: "DELETE", token });
    },
    onSettled: (_data, _err, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: dependencyKeys.byTask(taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      toast.success("Dependency removed");
    },
    onError: (err) => {
      logger.error("Dependencies", "Failed to remove dependency", { error: String(err) });
      toast.error("Failed to remove dependency");
    },
  });
}

/* ─── Bulk Create ─── */
export function useBulkCreateTasks() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tasks: CreateTaskInput[]) => {
      const token = await getToken();
      logger.info("Tasks", "Bulk creating tasks", { count: tasks.length });
      return apiFetch<{ success: boolean; data: Task[] }>("/api/v1/tasks/bulk-create", {
        method: "POST",
        body: JSON.stringify({ tasks }),
        token,
      });
    },
    onMutate: async (newTasks) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previous = queryClient.getQueriesData<PaginatedResponse<Task>>({ queryKey: taskKeys.lists() });
      logger.debug("Mutation", "Optimistic bulk create applied", { count: newTasks.length });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        ctx.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      logger.warn("Tasks", "Optimistic bulk create rolling back", { error: String(err) });
      toast.error("Failed to create tasks. Changes reverted.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
      logger.info("Tasks", "Bulk create completed, cache invalidated");
      toast.success("Tasks created");
    },
  });
}

/* ─── Search Tasks for Dependency Picker ─── */
export function useSearchTasksForDeps(query: string, enabled: boolean) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: [...taskKeys.all, "search-deps", query],
    queryFn: async () => {
      const token = await getToken();
      logger.info("Tasks", "Searching tasks for dependency picker", { query });
      return apiFetch<PaginatedResponse<Task>>(
        `/api/v1/tasks?search=${encodeURIComponent(query)}&page=1&per_page=10`,
        { token }
      );
    },
    staleTime: 10_000,
    enabled,
  });
}