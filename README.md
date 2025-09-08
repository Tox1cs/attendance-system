# Attendance Pro - Professional Time & Attendance System

**Attendance Pro** is a comprehensive, full-stack time and attendance management system designed with a modern Headless API architecture. This project focuses on maximum flexibility in defining business logic, providing a complete administrative panel and employee self-service (ESS) portal.

---

## 🚀 Core Features

This system is more than a simple logbook; it is a complete processing engine for attendance rules.

### Logic & Processing (Backend Engine)
- **Dynamic Rules Engine:** Ability to define complex rules for calculating lateness, penalties, work shortfalls, and overtime.
- **Floating Penalty Rule:** Calculates a lateness penalty (with a configurable multiplier, e.g., 1.4x) only if the employee checks in after the defined grace period has expired.
- **Weekly Shift Planner:** A robust shift management architecture allowing admins to define 7 unique rules (one for each day of the week) for any given shift. This easily supports complex schedules like **half-day Thursdays** (with a different required minute count).
- **Holiday Management:** The system correctly identifies official public holidays (read from a database table) and sets the required work time to zero.
- **Weekend Management:** The engine dynamically checks the employee's assigned shift rules to identify scheduled days off (e.g., Fridays) and treats them as non-work days.
- **Leave Management:** Full support for submitting and approving **Full-Day Leave** and **Hourly Leave**. The processing engine automatically deducts approved hourly leave minutes from the day's final required time.
- **Prioritization Logic:** The engine correctly calculates the `Final Required Time` by first adding penalties and then subtracting approved hourly leave.

### User Experience & API (Frontend & API)
- **Full JWT Authentication:** Secure system based on JWT (Login / Logout).
- **Employee Self-Service Dashboard:**
    - **Submit Requests:** Dedicated forms for submitting "Overtime Requests" and "Leave Requests" (both hourly and daily).
    - **Request History:** View the status (Pending, Approved, Rejected) of all submitted requests.
    - **Activity Log:** A professional and conceptual "calendar-style" grid view showing all monthly activities, complete with icons and statuses (e.g., Present, Absent, Holiday, Weekend, On Leave) and raw punch-in/out logs.
- **Manager Panel:**
    - **Request Management:** View all pending requests (both OT and Leave) from the team and the ability to **Approve** or **Reject** them.
    - **Final Report Dashboard:** View the final *processed* daily reports for all personnel (after the logic engine runs).

---

## 🛠 Tech Stack

This project is built using a modern, best-in-class stack for both server and client.

| Area | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Python 3 | Primary backend language |
| **Backend** | Django 5 | Core server framework |
| **Backend** | Django Rest Framework (DRF) | For building robust and secure APIs |
| **Backend** | DRF Simple-JWT | For token-based authentication |
| **Database** | PostgreSQL | Production-ready relational database |
| **Database (Dev)** | SQLite3 | For rapid local development |
| **Frontend** | React 18 | Core UI library |
| **Frontend** | Next.js 14 | React Framework (using App Router) |
| **Frontend** | TypeScript | For robust, type-safe application code |
| **Frontend** | Tailwind CSS | Modern utility-first CSS framework |
| **Frontend** | Heroicons | Professional icon library |

---

## 🏗 System Architecture

This project is organized as a **Monorepo** (single workspace) containing two distinct projects:

1.  **`backend/` (Django Project):**
    * A completely Headless API server.
    * Responsibilities: Authentication, database management, executing complex processing logic, and serving all APIs.

2.  **`frontend/` (Next.js Project):**
    * A fully separate client-side application (SPA).
    * Responsibilities: Rendering the UI, client-side state management, calling backend APIs, and providing the complete user experience.

---

## 🏁 Roadmap (Future Features)

This is a complete MVP, but the following features are on the roadmap to make it an enterprise-grade system:

- **[Infrastructure] Full Backend Automation:**
  - Implement **Celery**, **Redis**, and **Celery Beat** to completely remove the need for manual execution of the `process_attendance` command. The engine must run automatically every night to process daily reports.

- **[Reporting] Graphical Manager Dashboard:**
  - A complete redesign of the manager's `/dashboard` page (currently a table) into a live monitoring center with graphical charts (using Recharts or Chart.js) to show monthly stats, total lateness rates, etc.

- **[Logic] Advanced Rules Engine:**
  - Implement **Mandatory Breaks** (e.g., auto-deducting 45 minutes for lunch from the calculated "Total Presence").
  - Advanced shift management, including **Night Shifts** (where clock-in and clock-out occur on different calendar days).

- **[Hardware] Real Device Integration:**
  - Connect the data ingestion API (`/api/log/`) to real-world face-scanning or fingerprint hardware.

---

## ⚙️ Setup & Running

This project consists of two separate servers that must be run simultaneously.

### 1. Backend Setup

(From the `attendance-workspace/` root)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt 
# (Note: A requirements.txt must be created listing all installed packages)
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py runserver
```
### 2. Frontend Setup

(In a new terminal, from the `attendance-workspace/` root)
```cd frontend
# (Node.js/NVM must be installed)
npm install
npm run dev```
