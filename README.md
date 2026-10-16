# HelpDesk 360 🎫

> An enterprise-grade, full-stack IT service management platform engineered with persistent relational storage, role-based access control (RBAC), dynamic queue prioritization, and an immutable audit trail.

---

## 🛠️ Built With

<p align="left">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="React" width="40" height="40"/>&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vitejs/vitejs-original.svg" alt="Vite" width="40" height="40"/>&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" alt="Tailwind CSS" width="40" height="40"/>&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" alt="Node.js" width="40" height="40"/>&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original.svg" alt="Express" width="40" height="40"/>&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/sqlite/sqlite-original.svg" alt="SQLite3" width="40" height="40"/>&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg" alt="Docker" width="40" height="40"/>&nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg" alt="Git" width="40" height="40"/>
</p>

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js_20-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js_4-404D59?style=for-the-badge)](https://expressjs.com/)
[![SQLite3](https://img.shields.io/badge/SQLite_3-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

---

## 👥 Engineering Team

| Team Member | Engineering Role & Core Contributions |
| :--- | :--- |
| **Mahesh Rana** | **Principal Lead & Full-Stack Architect**<br>• Core system architecture & persistent SQLite data pipeline<br>• API route orchestration, JWT authentication & backend RBAC security layer<br>• Dynamic SQL aggregate calculations for live operational metrics |
| **Aadarsh Chaudhary** | **Backend Systems & Security Engineer**<br>• Relational database schema design (`users`, `tickets`, `status_history`)<br>• Status transition state machine validation & audit trail engine<br>• Hostile input validation, payload bounds, and IDOR mitigation |
| **Saugat Yadav** | **Frontend UI/UX & Client Integration Engineer**<br>• Enterprise design token implementation with Tailwind CSS<br>• Role-partitioned interfaces (Employee Portal vs. Technician Console)<br>• Live SLA countdown timers, audit drawer, and multi-filter queue integration |

---

## 📌 Executive Summary & Architecture Overview

**HelpDesk 360** transforms informal, fragmented IT support requests (emails, hallway conversations, chat messages) into structured, traceable operational records. Built on a client-server architecture, it provides relational persistence, SQL-backed operational metrics, and server-enforced role boundaries.

### Architectural Boundary & Data Flow

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND PRESENTATION LAYER (React SPA / Vite)                               │
│ • Role-tailored views: Employee Portal and Technician Console                 │
│ • Reactive state acts as a cache and re-fetches fresh data on events          │
└──────────────────────────────────────────────────────────────────────────────┘
                     │ HTTP Fetch (JSON) + Bearer Token
                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ BACKEND APPLICATION LAYER (Node.js / Express)                                │
│ • JWT authentication and user decoding                                       │
│ • Role guards for employee and technician endpoints                          │
│ • Status-transition state machine                                            │
│ • Input sanitization and payload bounds                                      │
└──────────────────────────────────────────────────────────────────────────────┘
                     │ Parameterized SQL + ACID Transactions
                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ PERSISTENT DATABASE TIER (SQLite3)                                           │
│ • Relational tables: users, tickets, status_history                          │
│ • Foreign-key constraints and timestamps                                     │
│ • Data persists across server restarts                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

## ✨ Key Features & Capabilities

### 1. Employee Self-Service Portal
- **Structured request submission:** Create tickets with a required title (up to 80 characters), category, priority, and description (up to 5,000 characters).
- **Duplicate-submission protection:** The submit control disables on the initial click to help prevent duplicate records.
- **Ticket ownership:** Employees can view and track only the tickets they submitted. Direct ID-based access to another employee's tickets is blocked by the backend.
- **Status tracking:** View assigned technicians, lifecycle status, and submission timestamps.

### 2. Support Technician Operations Console
- **Dynamic priority sorting:** Urgent issues appear first, followed by newest tickets, using server-side sorting.
- **Multi-dimensional triage:** Filter by status, priority, category, and assigned technician.
- **Inline assignment and status updates:** Assign tickets to technicians and update their progress from the queue.
- **Audit-trail drawer:** Inspect chronological status history, including technician handover notes.

### 3. Dynamic Operational Metrics
The dashboard KPI cards are calculated from database aggregates rather than hardcoded values:
- **Open Issues:** Count of tickets whose status is `open`.
- **Urgent Requests:** Count of urgent tickets that are not closed.
- **Active Technicians:** Count of distinct assigned technicians associated with open or in-progress tickets.
- **Completed Work:** Count of tickets whose status is resolved or closed.

---

## 🔒 Role-Based Access Control (RBAC) Matrix

| Endpoint | HTTP Method | Allowed Role | Rule Enforced |
| :--- | :---: | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Validates credentials against a bcrypt hash and issues a 24-hour JWT. |
| `/api/tickets` | `POST` | Employee, Technician | Associates the reporter with the authenticated user and starts the ticket as open. |
| `/api/tickets` | `GET` | Employee | Returns only tickets reported by the authenticated employee. |
| `/api/tickets` | `GET` | Technician | Returns the support queue with urgent-first sorting and filters. |
| `/api/tickets/:id` | `GET` | Employee, Technician | Rejects employee access when the employee is not the ticket reporter. |
| `/api/tickets/:id/status` | `PATCH` | Technician only | Validates status transitions and records history. |
| `/api/tickets/:id/assign` | `PATCH` | Technician only | Verifies that the target assignee has the technician role. |
| `/api/dashboard/stats` | `GET` | Technician only | Returns live SQL aggregates and denies employee access. |

---

## 🗄️ Database Schema & Data Integrity

The SQLite database uses foreign keys and constraints to protect relationships and accepted values.

```sql
-- 1. USERS TABLE
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('employee', 'technician')) NOT NULL,
  department TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TICKETS TABLE
CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK(category IN ('hardware', 'network', 'software', 'account-access')) NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) NOT NULL,
  status TEXT CHECK(status IN ('open', 'in-progress', 'resolved', 'closed')) DEFAULT 'open',
  reported_by INTEGER NOT NULL,
  assigned_to INTEGER NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(reported_by) REFERENCES users(id),
  FOREIGN KEY(assigned_to) REFERENCES users(id)
);

-- 3. STATUS_HISTORY TABLE (Audit Trail)
CREATE TABLE status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by INTEGER NOT NULL,
  notes TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY(changed_by) REFERENCES users(id)
);
```

---

## 🚀 Getting Started

### Option A: Docker Compose (Recommended)

Start the application stack using Docker Compose:

```bash
# 1. Clone the repository
git clone https://github.com/maheshofficial0011/helpdesk-360.git
cd helpdesk-360

# 2. Build and launch the stack
docker compose up --build
```

Frontend: [http://localhost:3000](http://localhost:3000) (the Vite development server may use [http://localhost:5173](http://localhost:5173), depending on configuration).  
Backend API: [http://localhost:5000](http://localhost:5000).

### Option B: Local Manual Setup

**Prerequisites:** Node.js 20+ and npm.

1. **Set up and start the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   node server.js
   ```

2. **Set up and start the frontend** in a separate terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The backend is expected to initialize the SQLite database and seed demo accounts on startup. Check the project configuration if your local setup uses different scripts or paths.

---

## 👥 Demo Accounts

The provided project notes list these seeded demo accounts:

| Username | Password | Role | Department | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `priya.nair` | `password123` | Employee | Product Design | Submit tickets and track own requests |
| `arjun.mehta` | `password123` | Technician | IT Operations | Queue, triage, status, assignment, metrics |
| `elena.rostova` | `password123` | Technician | DevOps Infra | Available for assignment |
| `david.chen` | `password123` | Technician | SecOps | Available for assignment |

> **Security note:** These are development/demo credentials. Do not use them in a production deployment.

---

## 🧪 Verification & Persistence Audit

Use this flow to check the persistence behavior in a local demo environment:

1. Log in as `priya.nair` and submit an urgent ticket titled **Core Switch Loop in MDF Room**.
2. Switch to `arjun.mehta`, assign the ticket to that technician, and set the status to `in-progress`.
3. Check that the dashboard's urgent-request and open-issue metrics update.
4. Stop the backend with `Ctrl + C`, then restart it:
   ```bash
   node server.js
   ```
5. Hard-refresh the browser with `Ctrl + Shift + R` (or `Cmd + Shift + R` on macOS).

**Expected result:** The ticket, assignment, and audit entries remain available after the restart if the application is configured to persist data to the SQLite file.

---

## 📁 Project Structure

```text
helpdesk-360/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── helpdesk.db          # Generated runtime database; should be git-ignored
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       └── main.jsx
├── docker-compose.yml
├── .gitignore
├── REPORT.md
└── README.md
```

> The repository may evolve; use the current file tree and package scripts as the source of truth if paths differ from this overview.

