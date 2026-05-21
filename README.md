# Code & Locks — Phone Repair Shop Management System

Full-stack repair shop prototype for **Code & Locks** in Tambo, Pamplona, Camarines Sur. Supports walk-in repairs, home service bookings, inventory, billing, and public repair tracking.

**Stack:** React 18 · Vite · Express · MySQL

---

## Setup

### 1 — Database

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

`schema.sql` contains the complete structure (including Home Service statuses: Pending, Approved, On The Way, Completed).  
`seed.sql` contains demo data only.

### 2 — Backend

```bash
cd backend
npm install
npm start
# http://localhost:3001/api/health
```

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

API calls proxy `/api` → `http://localhost:3001`.

---

## Demo logins

| Username     | Password   | Role        |
|--------------|------------|-------------|
| `admin`      | `admin123` | Admin       |
| `technician` | `1234`     | Technician  |

Passwords are stored as **bcrypt** hashes in the database.

---

## Workflows

### Walk-in repair

```
Pending → Diagnosing → Repairing → Ready for Pickup → Completed
```

### Home service

```
Pending → Approved → On The Way → Completed
```

1. Customer books online or staff submits intake (`/book` or `/book-online`).
2. Admin approves home service in **Home Service Bookings**.
3. Technician updates status and assignment in **Edit Ticket**.

---

## Public pages

| Path           | Description                          |
|----------------|--------------------------------------|
| `/home`        | Landing page                         |
| `/book-online` | Online booking + GCash downpayment   |
| `/track`       | Track by **ticket number** or **contact number** |
| `/login`       | Staff login                          |

---

## Staff routes

| Path                 | Access             | Page                    |
|----------------------|--------------------|-------------------------|
| `/`                  | Admin              | Dashboard               |
| `/tickets`           | Admin, Technician  | Ticket list             |
| `/tickets/edit/:id`  | Admin, Technician  | Edit ticket             |
| `/bookings`          | Admin              | Home service approvals  |
| `/book`              | Admin, Technician  | Counter intake          |
| `/inventory`         | Admin              | Parts stock             |

---

## Project structure

```
code-and-locks-finals/
├── database/
│   ├── schema.sql    # Full structure (import first)
│   └── seed.sql      # Demo data (import second)
├── backend/          # Express API
└── frontend/src/     # React app
```

---

