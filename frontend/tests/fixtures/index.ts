import type { Task, Label, Subtask, Comment, Attachment, ActivityLog, User, StatsResponse } from "@/types";

export const mockUser: User = {
  id: "user-1",
  clerk_user_id: "clerk_user_1",
  email: "test@taskflow.dev",
  name: "Test User",
  avatar_url: null,
  role: "user",
};

export const mockLabel: Label = {
  id: "label-1",
  name: "Backend",
  color: "#6366f1",
};

export const mockSubtask: Subtask = {
  id: "subtask-1",
  task_id: "task-1",
  title: "Implement API endpoints",
  completed: false,
  position: 0,
};

export const mockTask: Task = {
  id: "task-1",
  user_id: "user-1",
  title: "Build the API",
  description: "Implement all endpoints",
  status: "in_progress",
  priority: "high",
  due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
  position: 0,
  labels: [mockLabel],
  subtasks_count: 3,
  subtasks_completed: 1,
  comments_count: 2,
  attachments_count: 0,
  assigned_to: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockComment: Comment = {
  id: "comment-1",
  task_id: "task-1",
  user_id: "user-1",
  content: "This looks great!",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user: mockUser,
};

export const mockAttachment: Attachment = {
  id: "att-1",
  task_id: "task-1",
  file_name: "design-spec.pdf",
  file_url: "https://example.com/design-spec.pdf",
  file_size: 1024000,
  file_type: "application/pdf",
  created_at: new Date().toISOString(),
};

export const mockActivityLog: ActivityLog = {
  id: "activity-1",
  action: "task_created",
  field_changed: null,
  old_value: null,
  new_value: null,
  created_at: new Date().toISOString(),
  user: mockUser,
};

export const mockStats: StatsResponse = {
  total_tasks: 42,
  completed_today: 5,
  due_today: 8,
  overdue: 3,
  completion_rate_7d: 12,
  by_status: {
    todo: 10,
    in_progress: 15,
    in_review: 5,
    done: 10,
    cancelled: 2,
  },
  by_priority: {
    urgent: 3,
    high: 10,
    medium: 20,
    low: 9,
  },
};
