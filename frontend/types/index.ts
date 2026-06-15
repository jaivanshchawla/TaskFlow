export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: "user" | "admin";
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  default_view: "list" | "kanban" | "calendar";
  items_per_page: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface Attachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
  user: User;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "in_review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  position: number;
  labels: Label[];
  subtasks?: Subtask[];
  subtasks_count?: number;
  subtasks_completed?: number;
  comments?: Comment[];
  comments_count?: number;
  attachments?: Attachment[];
  attachments_count?: number;
  activity_logs?: ActivityLog[];
  assigned_to?: User | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

export interface StatsResponse {
  total_tasks: number;
  completed_today: number;
  due_today: number;
  overdue: number;
  completion_rate_7d: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface WSEvent {
  type: "task:created" | "task:updated" | "task:deleted" | "comment:added" | "subtask:updated";
  payload: unknown;
  user_id: string;
  timestamp: string;
}

export interface FilterState {
  status: string[];
  priority: string[];
  label_ids: string[];
  search: string;
  sort_by: string;
  sort_dir: "asc" | "desc";
  due_today: boolean;
  overdue: boolean;
  assigned_to_me: boolean;
}