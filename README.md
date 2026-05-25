# Code & Locks — Phone Repair Shop Management System

Full-stack repair shop system for **Code & Locks**, Tambo, Pamplona, Camarines Sur. Walk-in repairs, home service, inventory, billing, public tracking, technician accounts, repair checklists, and photo documentation.

**Stack:** React 18 · Vite · Express · MySQL

---

## Quick start (presentation)

### 1 — Database

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

**Already have a database?** Apply upgrades only:

```bash
cd backend
node scripts/runMigration.js
```

### 2 — Backend

```bash
cd backend
npm install
npm start
```

Health check: http://localhost:3001/api/health

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Demo logins

| Username     | Password   | Role        |
|--------------|------------|-------------|
| `admin`      | `admin123` | Admin       |
| `technician` | `1234`     | Technician  |

Demo ticket for public tracking: **CL-2026-00001**

---

## Demo flow (suggested)

1. **Public** — Open `/track`, enter `CL-2026-00001` → progress, problems, technician notes, checklist, parts.
2. **Admin** — Login → Dashboard → **Home Service** (`/bookings`) to approve requests.
3. **Technician** — Login → **My Profile** → assigned tickets → **Edit Ticket** → repair steps, photos, notes.
4. **Admin** — **Technicians** (`/staff`) → create account → **Inventory** → parts & stock.
5. **Billing** — View ticket → Record payment → status updates immediately.

---

## Staff routes

| Path                 | Access              | Page                    |
|----------------------|---------------------|-------------------------|
| `/`                  | Admin               | Dashboard               |
| `/tickets`           | Admin, Technician   | Ticket list             |
| `/tickets/view/:id`  | Admin, Technician   | View + billing          |
| `/tickets/edit/:id`  | Admin, Technician   | Edit + checklist/photos |
| `/bookings`          | Admin               | Home service approvals  |
| `/book`              | Admin, Technician   | Counter intake          |
| `/inventory`         | Admin, Technician*  | Parts (*tech read-only) |
| `/staff`             | Admin               | Manage technicians      |
| `/profile`           | Technician          | My profile + assignments|
| `/customers`         | Admin, Technician   | Customers               |

---

## Public pages

| Path           | Description                          |
|----------------|--------------------------------------|
| `/home`        | Landing page                         |
| `/book-online` | Online booking + GCash downpayment   |
| `/track`       | Track by ticket number or contact    |
| `/login`       | Staff login                          |

---

## Large photo uploads

- Express body limit: **20mb**
- DB column `ticket_photos.file_url`: **LONGTEXT**
- Frontend compresses images before upload (max 1200px, JPEG 70%)
- Optional MySQL server setting: `max_allowed_packet=16M` in `my.ini` / `my.cnf`

---

## Project structure

```
code-and-locks-finals/
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/
├── backend/
└── frontend/src/
```
