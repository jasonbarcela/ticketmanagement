# Code & Locks — Repair Shop Management System

> **Code & Locks**, a phone repair shop in Tambo, Pamplona, Camarines Sur. Built to handle walk-in and home service repairs, inventory management, customer billing, technician accounts, and public repair tracking — all in one system.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18 · React Router v6 · Vite 5 |
| Backend   | Node.js · Express 4                 |
| Database  | MySQL                               |
| Auth      | JWT · bcryptjs                      |
| HTTP      | Axios                               |

---

## Features

- **Repair Tickets** — Create, assign, track, and close tickets for walk-in and home service jobs
- **Public Tracking** — Customers can track repair status by ticket number or contact info (no login required)
- **Online Booking** — Public booking form with GCash downpayment support
- **Inventory Management** — Parts and stock tracking with low-stock indicators
- **Billing & Payments** — Record payments directly from a ticket; receipt modal included
- **Repair Checklists** — Technicians complete structured checklists per ticket
- **Photo Documentation** — Upload before/after photos; images compressed client-side before upload
- **Technician Accounts** — Role-based access for Admin and Technician roles
- **Dashboard** — Stats overview for tickets, revenue, and pending jobs
- **Customer Profiles** — Full customer history with linked tickets

---

## Prerequisites

- Node.js v18+
- MySQL 8+
- npm

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd code-and-locks-finals
```

### 2. Set Up the Database

Run the schema and seed files against your MySQL server:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

**Already have an existing database?** Apply incremental migrations only:

```bash
cd backend
node scripts/runMigration.js
```

### 3. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=code_and_locks
PORT=3001
JWT_SECRET=your_secret_key_here
```

> **Note:** For large photo uploads, add `max_allowed_packet=16M` to your MySQL config (`my.ini` / `my.cnf`). The app also sets this per-session automatically.

### 4. Start the Backend

```bash
cd backend
npm install
npm start          # production
npm run dev        # development (nodemon)
```

Health check: [http://localhost:3001/api/health](http://localhost:3001/api/health)

### 5. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

---

## Demo Credentials

| Username      | Password    | Role        |
|---------------|-------------|-------------|
| `admin`       | `admin123`  | Admin       |
| `technician`  | `1234`      | Technician  |

**Demo ticket for public tracking:** `CL-2026-00001`

---

## Application Routes

### Staff (Login Required)

| Path                    | Access                | Description                        |
|-------------------------|-----------------------|------------------------------------|
| `/`                     | Admin                 | Dashboard & stats overview         |
| `/tickets`              | Admin, Technician     | Ticket list                        |
| `/tickets/view/:id`     | Admin, Technician     | View ticket + billing              |
| `/tickets/edit/:id`     | Admin, Technician     | Edit ticket + checklist + photos   |
| `/bookings`             | Admin                 | Home service booking approvals     |
| `/book`                 | Admin, Technician     | Counter intake (walk-in)           |
| `/inventory`            | Admin, Technician*    | Parts & stock (*Technician: read-only) |
| `/staff`                | Admin                 | Manage technician accounts         |
| `/profile`              | Technician            | My profile & assigned tickets      |
| `/customers`            | Admin, Technician     | Customer list & profiles           |

### Public (No Login Required)

| Path           | Description                                    |
|----------------|------------------------------------------------|
| `/home`        | Landing page                                   |
| `/book-online` | Online booking form with GCash downpayment     |
| `/track`       | Track repair by ticket number or contact       |
| `/login`       | Staff login                                    |

---

## API Endpoints

The backend exposes a RESTful API under `/api/`:

| Prefix              | Resource                  |
|---------------------|---------------------------|
| `/api/auth`         | Login / token management  |
| `/api/tickets`      | Ticket CRUD + actions     |
| `/api/bookings`     | Home service bookings     |
| `/api/customers`    | Customer management       |
| `/api/inventory`    | Parts & stock             |
| `/api/payments`     | Payment recording         |
| `/api/staff`        | Technician accounts       |
| `/api/stats`        | Dashboard statistics      |
| `/api/health`       | Health check              |

---

## Project Structure

```
code-and-locks-finals/
├── database/
│   ├── schema.sql              # Full database schema
│   ├── seed.sql                # Demo data
│   └── migrations/             # Incremental SQL migrations
│       ├── 001_ticket_photos_checklist.sql
│       └── 002_staff_checklist_photos.sql
│
├── backend/
│   ├── server.js               # Express entry point
│   ├── .env.example            # Environment variable template
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── controllers/            # Route handler logic
│   ├── models/                 # Database query functions
│   ├── routes/                 # Express route definitions
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── validators/             # Input validation
│   ├── utils/                  # Helpers (AppError, password, etc.)
│   └── scripts/
│       └── runMigration.js     # Migration runner
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Root component & routing
        ├── main.jsx            # React entry point
        ├── components/         # Reusable UI components
        │   ├── forms/          # Form field components
        │   ├── layout/         # Header, Sidebar, Drawer
        │   ├── modals/         # Confirm dialogs, Receipt modal
        │   ├── status/         # Status/payment/stock badges
        │   ├── tables/         # Data table components
        │   └── ui/             # Alert, Spinner, EmptyState
        ├── pages/              # Page-level components
        │   ├── bookings/       # Home service booking pages
        │   ├── customers/      # Customer list & profile
        │   ├── dashboard/      # Stats dashboard
        │   ├── inventory/      # Parts & stock management
        │   ├── public/         # Landing, tracking, booking
        │   ├── staff/          # Technician management
        │   └── tickets/        # Ticket list, view, edit, new
        ├── context/            # AuthContext (JWT state)
        ├── hooks/              # useFetch custom hook
        ├── lib/                # axios instance, image compression, formatters
        ├── services/           # API call functions per resource
        ├── routes/             # ProtectedRoute component
        └── constants/          # Ticket status & home service config
```

---

## Photo Upload Notes

- Express body limit is set to **20 MB**
- The `ticket_photos.file_url` column stores base64-encoded images as `LONGTEXT`
- The frontend compresses images before upload: max **1200px** wide, **JPEG 70%** quality
- For MySQL servers with strict packet limits, add `max_allowed_packet=16M` to `my.ini` / `my.cnf`

---