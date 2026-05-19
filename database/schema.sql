-- ============================================================
-- config/schema.sql — Normalized 9-Table Database Schema
--
-- Code & Locks — 2nd Year BSIT Final Project
-- Execute this script in your MySQL client to build the complete,
-- normalized relational architecture required for the defense panel.
-- ============================================================

DROP DATABASE IF EXISTS code_and_locks;
CREATE DATABASE code_and_locks;
USE code_and_locks;

-- 1. STAFF USERS TABLE (Strict 2-Role Flow Alignment)
CREATE TABLE staff_users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Supports plain text for prototype / bcrypt for production
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'technician') NOT NULL, -- Removed 'staff' to enforce your strict dual user flow
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CUSTOMERS TABLE (Decoupled from flat tickets)
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    address TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. DEVICES TABLE (Asset management normalization)
CREATE TABLE devices (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- e.g., Smartphone, Laptop, Tablet
    brand VARCHAR(50) NOT NULL,       -- e.g., Apple, Samsung, Asus
    imei VARCHAR(50) NULL,
    passcode VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. BOOKINGS TABLE (Pre-ticket intake requests)
CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NULL,
    device_type VARCHAR(50) NULL,
    device_brand VARCHAR(50) NULL,
    problem_desc TEXT NOT NULL,
    service_type ENUM('Walk-In', 'On-Site', 'Pick-Up') DEFAULT 'Walk-In',
    address TEXT NULL,
    preferred_schedule VARCHAR(100) NULL,
    downpayment_note TEXT NULL,
    status ENUM('Pending', 'Approved', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. REPAIR TICKETS TABLE (Core engine utilizing 5-step status system)
--    Ticket number format: CL-{YEAR}-{5-digit sequence} e.g., CL-2026-00001
CREATE TABLE repair_tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(20) NOT NULL UNIQUE, -- Format: CL-2026-00001
    customer_id INT NOT NULL,
    device_id INT NOT NULL,
    booking_id INT NULL,                      -- Nullable if direct Walk-in
    problem_desc TEXT NOT NULL,
    service_type ENUM('Walk-In', 'On-Site', 'Pick-Up') DEFAULT 'Walk-In',
    address TEXT NULL,
    preferred_schedule VARCHAR(100) NULL,
    diagnostic_notes TEXT NULL,
    repair_notes TEXT NULL,
    additional_findings TEXT NULL,
    customer_approval ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    assigned_tech VARCHAR(100) NULL,          -- Maps cleanly to 'admin' or 'technician' signatures
    estimated_cost DECIMAL(10, 2) DEFAULT 0.00, -- Serves as Labor / Service Fee
    status ENUM('Pending', 'Diagnostic', 'In Progress', 'Ready for Pickup', 'Completed') DEFAULT 'Pending',
    payment_status ENUM('Unpaid', 'Partial', 'Paid') DEFAULT 'Unpaid',
    received_date DATE NOT NULL,
    completed_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (device_id) REFERENCES devices(device_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. INVENTORY CATALOG TABLE
CREATE TABLE inventory (
    part_id INT AUTO_INCREMENT PRIMARY KEY,
    part_code VARCHAR(20) NOT NULL UNIQUE,    -- e.g., PRT-001
    part_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'Uncategorized',
    quantity INT NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    retail_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. TICKET PARTS MATRIX TABLE (Normalized consumption cross-reference)
CREATE TABLE ticket_parts (
    ticket_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,      -- Snapshots retail_price at time of repair
    PRIMARY KEY (ticket_id, part_id),
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES inventory(part_id)
) ENGINE=InnoDB;

-- 8. REPAIR LOGS TABLE (Automated history timeline tracking)
CREATE TABLE repair_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    change_type ENUM('Status Change', 'Tech Note', 'Customer Update') NOT NULL,
    notes TEXT NOT NULL,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'system', -- Tracks 'admin' or 'technician'
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. PAYMENTS / LEDGER TABLE (Financial sub-ledger matching billing specs)
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('Cash', 'GCash', 'PayMaya', 'Bank Transfer') DEFAULT 'Cash',
    notes TEXT NULL,
    recorded_by VARCHAR(100) NOT NULL DEFAULT 'system',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- DEMO INITIAL DATA SEEDING (Restricted to 2 Userflow Master Accounts)
-- ============================================================

INSERT INTO staff_users (username, password, full_name, role) VALUES
('admin', 'admin123', 'System Administrator', 'admin'),
('technician', '1234', 'Keinth', 'technician');

INSERT INTO inventory (part_code, part_name, category, quantity, cost_price, retail_price) VALUES
('PRT-001', 'iPhone 11 Replacement Screen', 'Screens', 12, 1500.00, 2500.00),
('PRT-002', 'Samsung S20 Charging Port', 'Ports', 5, 300.00, 750.00),
('PRT-003', 'Universal 4000mAh Battery Li-Po', 'Batteries', 20, 450.00, 1100.00);