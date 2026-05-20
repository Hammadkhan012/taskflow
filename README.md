# TaskFlow — Team Task Manager

A full-stack web app for managing team projects and tasks with role-based access control.

## Live Demo
- **Frontend:** `https://taskflow-frontend.railway.app`
- **Backend API:** `https://taskflow-backend.railway.app`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken) |
| Deployment | Railway |

## Features

### Authentication
- Signup / Login with JWT
- Protected routes — unauthorized users redirected to login
- Auto token expiry handling

### Project Management
- Create projects (creator becomes Admin automatically)
- View all projects you're a member of
- Delete projects (Admin only)

### Role-Based Access Control
| Action | Admin | Member |
|--------|-------|--------|
| Create/delete tasks | ✅ | ❌ |
| Update all task fields | ✅ | ❌ |
| Update task status (own tasks) | ✅ | ✅ |
| Add/remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |

### Task Management
- Create tasks with title, description, status, priority, due date, assignee
- Kanban board view (To Do / In Progress / Done)
- List view with filters (status, priority)
- Overdue task highlighting
- Delete tasks (Admin only)

### Dashboard
- Summary stats: total tasks, todo, in progress, done, overdue
- Recent task activity across all your projects

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:5000/api
npm start
```

---

## Deployment on Railway

### Step 1: Create a Railway project
Go to [railway.app](https://railway.app) → New Project.

### Step 2: Add PostgreSQL
Click **Add Service → Database → PostgreSQL**.
Copy the `DATABASE_URL` from the Variables tab.

### Step 3: Deploy Backend
- Add a new service from your GitHub repo, set root directory to `/backend`
- Set environment variables:
  ```
  DATABASE_URL=<from Railway PostgreSQL>
  JWT_SECRET=<random long string>
  NODE_ENV=production
  FRONTEND_URL=<your frontend Railway URL>
  ```

### Step 4: Deploy Frontend
- Add another service, root directory `/frontend`
- Set environment variable:
  ```
  REACT_APP_API_URL=<your backend Railway URL>/api
  ```

### Step 5: Done
Railway auto-detects `nixpacks.toml` and builds both services.

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Register |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user (auth required) |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | List my projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project + members |
| PUT | /api/projects/:id | Update (admin) |
| DELETE | /api/projects/:id | Delete (admin) |
| POST | /api/projects/:id/members | Add member (admin) |
| DELETE | /api/projects/:id/members/:uid | Remove member (admin) |
| PUT | /api/projects/:id/members/:uid/role | Change role (admin) |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks/dashboard | Dashboard stats |
| GET | /api/tasks/project/:id | Project tasks (filterable) |
| POST | /api/tasks | Create task (admin) |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task (admin) |

---

## Database Schema

```sql
users (id, name, email, password, created_at)
projects (id, name, description, owner_id, created_at)
project_members (id, project_id, user_id, role, joined_at)
tasks (id, title, description, status, priority, due_date, project_id, assigned_to, created_by, created_at, updated_at)
```
