# Backend Complete

## Base URL
http://localhost:8080

## Health Check
GET /health → 200 OK
GET /api/v1/health/db → 200 OK (DB connected)

## Auth
All protected routes require: Authorization: Bearer <clerk_jwt>

## API Contract

### Response Shapes
- **Success:** `{ "success": true, "data": {...}, "meta": { "page", "per_page", "total", "total_pages" } }`
- **Error:** `{ "success": false, "error": { "code": "...", "message": "...", "details": {} } }`

### Endpoints

#### Users
- `GET /api/v1/users/me` — Current user profile + preferences
- `PATCH /api/v1/users/me/preferences` — Update preferences

#### Tasks
- `GET /api/v1/tasks` — List with filters (status, priority, label_ids, search, sort_by, sort_dir, assigned_to_me, overdue, page, per_page)
- `POST /api/v1/tasks` — Create task
- `GET /api/v1/tasks/:id` — Get single task with all relations
- `PATCH /api/v1/tasks/:id` — Partial update
- `DELETE /api/v1/tasks/:id` — Soft delete
- `POST /api/v1/tasks/bulk` — Bulk actions (delete, update_status, update_priority, add_label)
- `GET /api/v1/tasks/export` — CSV export (same filters as list)

#### Subtasks
- `POST /api/v1/tasks/:id/subtasks` — Create subtask
- `PATCH /api/v1/tasks/:id/subtasks/:subtask_id` — Update subtask
- `DELETE /api/v1/tasks/:id/subtasks/:subtask_id` — Delete subtask
- `PATCH /api/v1/tasks/:id/subtasks/reorder` — Reorder subtasks

#### Comments
- `GET /api/v1/tasks/:id/comments` — List comments
- `POST /api/v1/tasks/:id/comments` — Create comment
- `PATCH /api/v1/tasks/:id/comments/:comment_id` — Update comment
- `DELETE /api/v1/tasks/:id/comments/:comment_id` — Delete comment

#### Attachments
- `POST /api/v1/tasks/:id/attachments` — Register attachment metadata
- `DELETE /api/v1/tasks/:id/attachments/:attachment_id` — Delete attachment

#### Labels
- `GET /api/v1/labels` — List user labels
- `POST /api/v1/labels` — Create label
- `PATCH /api/v1/labels/:id` — Update label
- `DELETE /api/v1/labels/:id` — Delete label

#### Templates
- `GET /api/v1/templates` — List templates
- `POST /api/v1/templates` — Create template
- `DELETE /api/v1/templates/:id` — Delete template
- `POST /api/v1/templates/:id/apply` — Apply template (creates task)

#### Activity
- `GET /api/v1/tasks/:id/activity` — Activity log (paginated)

#### Stats
- `GET /api/v1/stats` — Dashboard stats

#### WebSocket
- `WS ws://localhost:8080/api/v1/ws?token=<clerk_jwt>`
- Client events: subscribe, unsubscribe, ping
- Server events: task:created, task:updated, task:deleted, comment:added, subtask:updated

#### Admin (admin role required)
- `GET /api/v1/admin/users` — All users with task counts
- `PATCH /api/v1/admin/users/:id` — Update user role
- `GET /api/v1/admin/tasks` — All tasks across users
- `GET /api/v1/admin/activity` — Platform-wide activity
- `GET /api/v1/admin/stats` — Platform-wide stats

#### Webhooks
- `POST /api/webhooks/clerk` — Clerk webhook (user.created, user.updated, user.deleted)

## WebSocket
WS ws://localhost:8080/api/v1/ws?token=<clerk_jwt>

## Tests
```bash
cd backend && go test ./... -v
```

## Build
```bash
cd backend && go build -o bin/server ./cmd/server
```

## Seed Data
```bash
cd backend && go run cmd/seed/main.go
```
Creates: 2 users, 5 labels, 15 tasks, ~28 subtasks, 7 comments, 2 attachments

## File Count
41 Go files across the backend.
