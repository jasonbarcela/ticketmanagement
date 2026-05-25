-- ============================================================
-- Code & Locks — Phone Repair Shop Management System
-- database/schema.sql — Full database structure (no demo data)
--
-- Fresh install:
--   mysql -u root -p < database/schema.sql
--   mysql -u root -p < database/seed.sql
-- ============================================================

DROP DATABASE IF EXISTS code_and_locks;
CREATE DATABASE code_and_locks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE code_and_locks;

-- ─────────────────────────────────────────────────────────────
-- 1. Staff users (admin + technician)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE staff_users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'technician') NOT NULL,
    created_by VARCHAR(100) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 2. Customers
-- ─────────────────────────────────────────────────────────────
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    address TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 3. Devices
-- ─────────────────────────────────────────────────────────────
CREATE TABLE devices (
    device_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    brand VARCHAR(50) NOT NULL,
    imei VARCHAR(50) NULL,
    passcode VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 4. Bookings (online / home-service intake)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NULL,
    customer_email VARCHAR(100) NULL,
    device_type VARCHAR(50) NULL,
    device_brand VARCHAR(50) NULL,
    problem_desc TEXT NOT NULL,
    service_type ENUM('Walk-In', 'Home Service') DEFAULT 'Walk-In',
    address TEXT NULL,
    preferred_schedule VARCHAR(100) NULL,
    service_date DATE NULL,
    preferred_time VARCHAR(10) NULL,
    downpayment_method VARCHAR(50) NULL,
    downpayment_reference VARCHAR(100) NULL,
    downpayment_note TEXT NULL,
    payment_status ENUM('Unpaid', 'Partial', 'Paid') DEFAULT 'Unpaid',
    customer_provided_parts TINYINT(1) NOT NULL DEFAULT 0,
    service_fee DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('Pending', 'Approved', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 5. Repair tickets
--    Ticket number format: CL-{YEAR}-{5-digit}  e.g. CL-2026-00001
-- ─────────────────────────────────────────────────────────────
CREATE TABLE repair_tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    device_id INT NOT NULL,
    booking_id INT NULL,
    problem_desc TEXT NOT NULL,
    service_type ENUM('Walk-In', 'Home Service') DEFAULT 'Walk-In',
    address TEXT NULL,
    preferred_schedule VARCHAR(100) NULL,
    service_date DATE NULL,
    preferred_time VARCHAR(10) NULL,
    diagnostic_notes TEXT NULL,
    repair_notes TEXT NULL,
    additional_findings TEXT NULL,
    customer_approval ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    assigned_tech VARCHAR(100) NULL,
    tech_contact VARCHAR(20) NULL,
    tech_assigned_date DATE NULL,
    estimated_cost DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM(
        'Pending',
        'Approved',
        'On The Way',
        'Diagnosing',
        'Repairing',
        'Ready for Pickup',
        'Completed',
        'Cancelled'
    ) NOT NULL DEFAULT 'Pending',
    payment_status ENUM('Unpaid', 'Partial', 'Paid') DEFAULT 'Unpaid',
    received_date DATE NOT NULL,
    completed_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (device_id) REFERENCES devices(device_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 6. Parts inventory
-- ─────────────────────────────────────────────────────────────
CREATE TABLE inventory (
    part_id INT AUTO_INCREMENT PRIMARY KEY,
    part_code VARCHAR(20) NOT NULL UNIQUE,
    part_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'Uncategorized',
    quantity INT NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    retail_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 7. Parts used on tickets (unit_price = 0 when customer-provided)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE ticket_parts (
    ticket_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (ticket_id, part_id),
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES inventory(part_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 8. Repair documentation photos (base64 stored in file_url)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE ticket_photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    photo_stage ENUM('Before', 'During', 'After') NOT NULL,
    file_url LONGTEXT NOT NULL,
    caption TEXT NULL,
    uploaded_by VARCHAR(100) NOT NULL DEFAULT 'system',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 9. Problem description checklist per ticket
--    checklist_type is always 'Problem'.
--    Staff confirm each customer-reported issue with a checkbox.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE ticket_checklist (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    label VARCHAR(200) NOT NULL,
    checklist_type ENUM('Problem') NOT NULL DEFAULT 'Problem',
    is_checked TINYINT NOT NULL DEFAULT 0,
    checked_by VARCHAR(100) NULL,
    checked_at TIMESTAMP NULL,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 10. Repair activity logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE repair_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    change_type ENUM(
        'Status Change',
        'Tech Note',
        'Customer Update',
        'Photo Added',
        'Checklist Update'
    ) NOT NULL,
    notes TEXT NOT NULL,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'system',
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- 11. Payments
-- ─────────────────────────────────────────────────────────────
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