# TaskFlow

A modern, real-time task management application with Kanban boards, calendar views, time tracking, and team collaboration features.

## Live Demo

- **Frontend:** https://taskflow-frontend.vercel.app
- **Backend API:** https://taskflow-backend.onrender.com

## Tech Stack

| Layer          | Technology                                                     |
| -------------- | -------------------------------------------------------------- |
| Frontend       | Next.js 16, React 19, TypeScript, Tailwind CSS 4              |
| State          | Zustand, TanStack React Query                                  |
| UI Components  | Radix UI, Framer Motion, Lucide Icons                          |
| Auth           | Clerk                                                          |
| File Uploads   | UploadThing                                                    |
| Backend        | Go 1.22+, Gin, GORM                                            |
| Database       | PostgreSQL 16                                                   |
| Real-time      | WebSocket (Gorilla)                                            |
| Infrastructure | Docker, Docker Compose, Make                                   |

## Prerequisites

- **Go** 1.22+
- **Node.js** 20+
- **Docker** & Docker Compose
- **PostgreSQL** 16 (or use Docker)
- **Clerk** account (for authentication)

## Local Setup

```bash
# Clone the repository
git clone https://github.com/jaivanshchawla/taskflow.git
cd taskflow

# Install dependencies and set up .env files
make setup

# Fill in your API keys in .env, backend/.env, and frontend/.env.local

# Start all services (PostgreSQL, backend, frontend)
make dev
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:8080`.

## Seed Data

Populate the database with sample data for development:

```bash
make seed
```

## Test Commands

```bash
# Run backend tests
make test-backend

# Run frontend unit tests
make test-frontend

# Run E2E tests (requires Playwright)
make test-e2e
```

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   Frontend   │ ───▶ │   Backend   │ ───▶ │  PostgreSQL   │
│  Next.js 16  │  WS  │   Go/Gin    │  DB  │     16        │
│  :3000       │ ◀─── │   :8080     │ ◀─── │  :5432        │
└──────┬──────┘      └──────┬──────┘      └──────────────┘
       │                    │
       │  Clerk Auth        │  Clerk JWT
       ▼                    ▼
  ┌──────────┐        ┌──────────┐
  │  Clerk   │        │  Clerk   │
  │ Dashboard│        │ Webhooks │
  └──────────┘        └──────────┘
```

## API Documentation

All protected endpoints require a valid Clerk JWT in the `Authorization: Bearer <token>` header.

### Health Endpoints (Public)

| Method | Path                      | Description           |
| ------ | ------------------------- | --------------------- |
| GET    | `/health`                 | Server health check   |
| GET    | `/api/v1/health/db`       | Database health check |

### Webhooks (Public)

| Method | Path                       | Description                   |
| ------ | -------------------------- | ----------------------------- |
| POST   | `/api/webhooks/clerk`      | Clerk webhook receiver        |

### User Endpoints (Auth Required)

| Method | Path                         | Description               |
| ------ | ---------------------------- | ------------------------- |
| GET    | `/api/v1/users/me`           | Get current user profile  |
| PATCH  | `/api/v1/users/me/preferences` | Update user preferences |

### Stats (Auth Required)

| Method | Path              | Description              |
| ------ | ----------------- | ------------------------ |
| GET    | `/api/v1/stats`   | Get dashboard statistics |

### Tasks (Auth Required)

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/v1/tasks`                   | List tasks (filtered, paginated)     |
| POST   | `/api/v1/tasks`                   | Create a new task                    |
| GET    | `/api/v1/tasks/export`            | Export tasks as CSV                  |
| POST   | `/api/v1/tasks/bulk`              | Bulk update/delete tasks             |
| POST   | `/api/v1/tasks/bulk-create`       | Bulk create multiple tasks           |
| GET    | `/api/v1/tasks/:id`               | Get a single task with relations     |
| PATCH  | `/api/v1/tasks/:id`               | Update a task                        |
| DELETE | `/api/v1/tasks/:id`               | Soft-delete a task                   |

### Subtasks (Auth Required)

| Method | Path                                         | Description           |
| ------ | -------------------------------------------- | --------------------- |
| POST   | `/api/v1/tasks/:id/subtasks`                 | Create subtask        |
| PATCH  | `/api/v1/tasks/:id/subtasks/:subtask_id`     | Update subtask        |
| DELETE | `/api/v1/tasks/:id/subtasks/:subtask_id`     | Delete subtask        |
| PATCH  | `/api/v1/tasks/:id/subtasks/reorder`         | Reorder subtasks      |

### Comments (Auth Required)

| Method | Path                                         | Description           |
| ------ | -------------------------------------------- | --------------------- |
| GET    | `/api/v1/tasks/:id/comments`                 | List comments         |
| POST   | `/api/v1/tasks/:id/comments`                 | Create comment        |
| PATCH  | `/api/v1/tasks/:id/comments/:comment_id`     | Update comment        |
| DELETE | `/api/v1/tasks/:id/comments/:comment_id`     | Delete comment        |

### Attachments (Auth Required)

| Method | Path                                            | Description           |
| ------ | ----------------------------------------------- | --------------------- |
| POST   | `/api/v1/tasks/:id/attachments`                 | Upload attachment     |
| DELETE | `/api/v1/tasks/:id/attachments/:attachment_id`  | Delete attachment     |

### Activity (Auth Required)

| Method | Path                           | Description           |
| ------ | ------------------------------ | --------------------- |
| GET    | `/api/v1/tasks/:id/activity`   | Get task activity log |

### Dependencies (Auth Required)

| Method | Path                                              | Description           |
| ------ | ------------------------------------------------- | --------------------- |
| GET    | `/api/v1/tasks/:id/dependencies`                  | List dependencies     |
| POST   | `/api/v1/tasks/:id/dependencies`                  | Add dependency        |
| DELETE | `/api/v1/tasks/:id/dependencies/:dep_id`          | Remove dependency     |

### Time Entries (Auth Required)

| Method | Path                                              | Description           |
| ------ | ------------------------------------------------- | --------------------- |
| GET    | `/api/v1/tasks/:id/time-entries`                  | List time entries     |
| POST   | `/api/v1/tasks/:id/time-entries`                  | Start timer           |
| PATCH  | `/api/v1/tasks/:id/time-entries/:entry_id`        | Stop timer            |
| DELETE | `/api/v1/tasks/:id/time-entries/:entry_id`        | Delete time entry     |

### Labels (Auth Required)

| Method | Path                      | Description           |
| ------ | ------------------------- | --------------------- |
| GET    | `/api/v1/labels`          | List all labels       |
| POST   | `/api/v1/labels`          | Create label          |
| PATCH  | `/api/v1/labels/:id`      | Update label          |
| DELETE | `/api/v1/labels/:id`      | Delete label          |

### Templates (Auth Required)

| Method | Path                         | Description           |
| ------ | ---------------------------- | --------------------- |
| GET    | `/api/v1/templates`          | List templates        |
| POST   | `/api/v1/templates`          | Create template       |
| DELETE | `/api/v1/templates/:id`      | Delete template       |
| POST   | `/api/v1/templates/:id/apply`| Apply template        |

### WebSocket (Auth Required)

| Method | Path              | Description              |
| ------ | ----------------- | ------------------------ |
| GET    | `/api/v1/ws`      | WebSocket connection     |

### Admin (Admin Role Required)

| Method | Path                        | Description           |
| ------ | --------------------------- | --------------------- |
| GET    | `/api/v1/admin/users`       | List all users        |
| PATCH  | `/api/v1/admin/users/:id`   | Update user           |
| GET    | `/api/v1/admin/tasks`       | List all tasks        |
| GET    | `/api/v1/admin/activity`    | Get all activity      |
| GET    | `/api/v1/admin/stats`       | Get admin statistics  |

## Deployment

### Backend (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add environment variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `CLERK_SECRET_KEY` - Clerk secret key
   - `CLERK_WEBHOOK_SECRET` - Clerk webhook secret
   - `CLERK_JWKS_URL` - Clerk JWKS URL
   - `FRONTEND_URL` - Your Vercel frontend URL
   - `ENV` - `production`
5. Deploy

### Frontend (Vercel)

1. Create a new project on [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Set the root directory to `frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
   - `CLERK_SECRET_KEY` - Clerk secret key
   - `NEXT_PUBLIC_API_URL` - Your Render backend URL
   - `UPLOADTHING_SECRET` - UploadThing secret
   - `UPLOADTHING_APP_ID` - UploadThing app ID
5. Deploy

## Known Limitations and Trade-offs

- **No offline support:** The app requires an internet connection; there is no service worker or local caching layer.
- **No file previews:** Uploaded attachments are stored as URLs without thumbnail generation or preview rendering.
- **Soft deletes only:** Deleted tasks remain in the database with a `deleted_at` timestamp; there is no hard-delete or undo mechanism.
- **WebSocket is user-scoped:** Real-time events are broadcast per-user, not globally; there is no cross-user collaboration channel.
- **No role-based filtering on list:** The admin can view all tasks, but regular users cannot see tasks assigned to them by others.
- **CSV export is synchronous:** Large exports may block the HTTP response; no background job queue is used.
- **No rate limiting per endpoint:** The global rate limiter applies uniformly; there is no per-route customization.

## Assumptions Made During Development

- Every task belongs to exactly one user (the creator); there is no multi-user task assignment beyond `assigned_to`.
- Clerk is the sole identity provider; there is no fallback auth or local user management.
- PostgreSQL is used as the primary data store; no Redis or caching layer is assumed.
- The `assigned_to` field references a user in the same database but does not enforce foreign key constraints.
- Labels are user-scoped; one user cannot see or use labels created by another user.
- Task positions are integer-based for manual ordering; drag-and-drop reordering updates positions via PATCH.
- The backend runs on port 8080 and the frontend on port 3000 by default.
- All timestamps are stored in UTC.
