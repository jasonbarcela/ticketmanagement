# 🔧 Code & Locks — Repair Ticketing Management System

A full-stack cell phone repair shop management system built as a 2nd-year IT college capstone prototype.

**Stack:** React 18 · React Router v6 · Axios · Node.js · Express.js · MySQL (mysql2)

---

## 📁 Project Structure

```
code-and-locks/
├── database/
│   ├── schema.sql          # Normalized DDL — run first
│   └── seed.sql            # Demo data — run second
├── backend/
│   ├── config/db.js        # MySQL connection pool
│   ├── middleware/auth.js  # requireAuth + requireRole guards
│   ├── validators/         # Input validation (no SQL in routes)
│   ├── models/             # Raw SQL query layer
│   ├── controllers/        # Business logic & state orchestration
│   ├── routes/             # RESTful route definitions
│   ├── utils/              # AppError class + ticket helpers
│   └── server.js           # Express entry point
└── frontend/
    └── src/
        ├── context/        # AuthContext (global session state)
        ├── lib/axios.js    # Configured Axios w/ X-User interceptor
        ├── routes/         # ProtectedRoute guard
        ├── hooks/          # useFetch (loading/error/data lifecycle)
        ├── services/       # API wrapper calls per module
        ├── components/     # Layout, UI, Forms, Tables, Modals, Status
        └── pages/          # Dashboard, Tickets, Customers, Inventory, Bookings
```

---

## 🚀 Setup Instructions

### 1 — Database

```sql
-- In MySQL (phpMyAdmin, MySQL Workbench, or CLI):
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

Or via CLI:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2 — Backend

```bash
cd backend
npm install
node server.js
# API running at http://localhost:3001
# Health check: http://localhost:3001/api/health
```

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

---

## 🔑 Demo Login Credentials

| Username     | Password   | Role        | Access Level                  |
|--------------|------------|-------------|-------------------------------|
| `admin`      | `admin123` | Admin       | Full access incl. inventory   |
| `technician` | `1234`     | Technician  | Read-only inventory           |

> **Tip:** Click any credential row on the login page to auto-fill.

---

## 🗂️ Database Schema

### Tables

| Table           | Purpose                                    |
|-----------------|--------------------------------------------|
| `staff_users`   | System accounts (username, password, role) |
| `customers`     | Client records (name, phone, email)        |
| `inventory`     | Spare parts catalogue (PRT-XXX codes)      |
| `repair_tickets`| Core transactional entity (FK to both)    |

### Relational Integrity

- `repair_tickets.customer_id` → FK → `customers.customer_id` (ON DELETE SET NULL)
- `repair_tickets.part_id`     → FK → `inventory.part_id`     (ON DELETE SET NULL)

Both use `ON DELETE SET NULL` to preserve historical ticket records when customers or parts are removed.

---

## ⚙️ Status State Machine

```
Walk-In:       Confirmed → In Progress → Completed
Home Service:  Pending Downpayment → Confirmed → In Progress → Completed
```

- Status is enforced as a MySQL `ENUM` column at the database level.
- Forward-only transitions are validated in `validators/ticketValidator.js`.
- When a ticket transitions to **Completed** and has a linked `part_id`, a MySQL `TRANSACTION` atomically:
  1. Sets `status = 'Completed'` and `date_completed = CURDATE()`
  2. Decrements `inventory.quantity` by 1 (`GREATEST(qty - 1, 0)` prevents negative stock)

---

## 🌐 REST API Reference

| Method | Endpoint                   | Auth         | Description                          |
|--------|----------------------------|--------------|--------------------------------------|
| POST   | `/api/auth`                | None         | Login → returns `{ username, role }` |
| GET    | `/api/tickets`             | requireAuth  | List tickets (search + status filter)|
| GET    | `/api/tickets/:id`         | requireAuth  | Single ticket with part_name join    |
| POST   | `/api/tickets`             | requireAuth  | Create ticket (staff full form)      |
| PUT    | `/api/tickets/:id`         | requireAuth  | Full edit (triggers inv. transaction)|
| PUT    | `/api/tickets/:id/status`  | requireAuth  | Forward-only status advance          |
| DELETE | `/api/tickets/:id`         | requireAuth  | Hard delete                          |
| POST   | `/api/bookings`            | requireAuth  | Simplified intake (no tech/part)     |
| GET    | `/api/customers`           | requireAuth  | List customers (search)              |
| POST   | `/api/customers`           | requireAuth  | Add customer                         |
| PUT    | `/api/customers/:id`       | requireAuth  | Edit customer                        |
| DELETE | `/api/customers/:id`       | requireAuth  | Delete customer                      |
| GET    | `/api/inventory`           | requireAuth  | List all parts                       |
| POST   | `/api/inventory/update`    | Admin only   | Adjust stock quantity                |
| POST   | `/api/inventory/add`       | Admin only   | Add new PRT-XXX part                 |
| GET    | `/api/stats`               | requireAuth  | Dashboard KPI aggregates             |
| GET    | `/api/health`              | None         | Health check                         |

---

## 🛡️ Defense Key Points

### 1. Database Normalization (1NF → 3NF)
- All tables have atomic columns (1NF).
- No partial dependencies: `part_name` lives in `inventory`, not `repair_tickets` (2NF).
- No transitive dependencies: ticket fields depend only on `ticket_id` (3NF).

### 2. Transactional Integrity
- `completeWithInventoryDeduct()` uses `BEGIN / COMMIT / ROLLBACK` via `pool.getConnection()`.
- If either the ticket update or the inventory decrement fails, the entire operation rolls back.

### 3. ENUM State Machine (DB-Level Enforcement)
- `status ENUM('Pending Downpayment', 'Confirmed', 'In Progress', 'Completed')` — invalid values are rejected at the DB level, not just the application layer.

### 4. Separation of Concerns
- **Models** — only SQL. No business logic.
- **Controllers** — only business logic. No raw SQL.
- **Routes** — only middleware wiring. No business logic.
- **Services** (frontend) — only Axios calls. No UI logic.

### 5. Role-Based Access Control
- `requireAuth` validates every protected request via the `X-User` session header.
- `requireRole(['admin'])` gates inventory write operations — non-admins receive HTTP 403.

### 6. Inventory Auto-Deduction
- Completing a ticket with a linked part triggers a DB TRANSACTION that decrements stock.
- `GREATEST(quantity - 1, 0)` prevents the quantity from going below zero even under concurrent requests.
- The backend returns HTTP 409 with a clear error if the part is already at 0 stock.
