-- ============================================================
-- config/seed.sql — Real-World Shop Pricing & Demo Seed Script
--
-- Code & Locks — 2nd Year BSIT Final Project
--
-- Ticket number format: CL-{YEAR}-{5-digit sequence} e.g., CL-2026-00001
--
-- This version uses ordered hierarchical DELETE queries to bypass 
-- stubborn phpMyAdmin session locks flawlessly.
-- ============================================================

-- Safety backup override (kept for standard clients)
SET FOREIGN_KEY_CHECKS = 0;

-- ── STEP 1: CLEAN OUT TABLES IN PERFECT REVERSE DEPENDENCY ORDER ──
-- Wiping out the children tables first ensures parent tables can clear without error #1701
DELETE FROM payments;
DELETE FROM repair_logs;
DELETE FROM ticket_parts;
DELETE FROM repair_tickets;
DELETE FROM bookings;
DELETE FROM devices;
DELETE FROM customers;
DELETE FROM inventory;
DELETE FROM staff_users;

-- ── STEP 2: RESET THE AUTO-INCREMENT COUNTERS TO START FROM 1 ──
ALTER TABLE staff_users AUTO_INCREMENT = 1;
ALTER TABLE inventory AUTO_INCREMENT = 1;
ALTER TABLE customers AUTO_INCREMENT = 1;
ALTER TABLE devices AUTO_INCREMENT = 1;
ALTER TABLE bookings AUTO_INCREMENT = 1;
ALTER TABLE repair_tickets AUTO_INCREMENT = 1;
ALTER TABLE repair_logs AUTO_INCREMENT = 1;
ALTER TABLE payments AUTO_INCREMENT = 1;

-- Re-enable constraints standard rule
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- 1. STAFF USERS SEEDING (Restricted to 2 Master Accounts Only)
-- ============================================================
INSERT INTO staff_users (user_id, username, password, full_name, role, is_active) VALUES
(1, 'admin',      'admin123', 'Shop Manager Admin', 'admin', 1),
(2, 'technician', '1234',     'Keinth',             'technician', 1);

-- ============================================================
-- 2. INVENTORY SEEDING (Your exact local hardware replacement prices)
-- ============================================================
INSERT INTO inventory (part_id, part_code, part_name, category, quantity, cost_price, retail_price) VALUES
(1,  'LCD-IP11-ORG', 'iPhone 11 Original LCD Screen Assembly',           'Display Panel', 12, 3800.00,  5000.00),
(2,  'LCD-IP12-PRM', 'iPhone 12 Original LCD Screen (Premium Quality)',  'Display Panel',  6, 4500.00,  6000.00),
(3,  'LCD-IP12-STD', 'iPhone 12 Original LCD Screen (Standard Quality)', 'Display Panel',  8, 3800.00,  5000.00),
(4,  'LCD-IP13-ORG', 'iPhone 13 Original LCD Screen Assembly',           'Display Panel',  5, 4100.00,  5500.00),
(5,  'LCD-IP14-ORG', 'iPhone 14 Original LCD Screen Assembly',           'Display Panel',  4, 5200.00,  7000.00),
(6,  'LCD-IP15-ORG', 'iPhone 15 Original LCD Screen Assembly',           'Display Panel',  3, 7500.00, 10000.00),
(7,  'LCD-VIV-GEN',  'Vivo Smartphone LCD Replacement Panel',            'Display Panel', 15, 2000.00,  3000.00),
(8,  'LCD-OPP-GEN',  'Oppo Smartphone LCD Replacement Panel',            'Display Panel', 10, 1400.00,  2009.00),
(9,  'BAT-IP11-GEN', 'iPhone 11 High Capacity Replacement Battery',      'Batteries',     20,  400.00,   950.00),
(10, 'BAT-VIV-Y20',  'Vivo Y20 Series Li-Polymer Battery Pack',         'Batteries',     12,  300.00,   700.00);

-- ============================================================
-- 3. DEMO CUSTOMER FILES SEEDING (Decoupled entity matrix mapping)
-- ============================================================
INSERT INTO customers (customer_id, full_name, phone, email, address) VALUES
(1, 'Bom Boncodin',       '09171234567', 'bombomsahur@email.com',       'Blk 1 Lot 2, Naga, Subdivision, Camsur'),
(2, 'Chamber Operator',   '09187654321', 'chamberoperator@email.com',   'Phase 3, Camella Homes, Ascent, Fracture');

-- ============================================================
-- 4. HARDWARE DEVICES MANAGEMENT SEEDING
-- ============================================================
INSERT INTO devices (device_id, customer_id, device_type, brand, imei, passcode) VALUES
(1, 1, 'Smartphone', 'Apple iPhone 11', '351982104928172', '000000'),
(2, 2, 'Smartphone', 'Vivo Y20',        '862910492811029', '2580');

-- ============================================================
-- 5. REPAIR WORKFLOW TRACKING TICKETS SEEDING
--    Format: CL-{YEAR}-{5-digit zero-padded sequence}
-- ============================================================
INSERT INTO repair_tickets (ticket_id, ticket_number, customer_id, device_id, problem_desc, service_type, assigned_tech, estimated_cost, status, payment_status, received_date) VALUES
(1, 'CL-2026-00001', 1, 1, 'Shattered glass overlay. Black ink leaking onto matrix panel.',               'Walk-In', 'Keinth', 300.00, 'In Progress', 'Partial', CURDATE()),
(2, 'CL-2026-00002', 2, 2, 'Device expanding / bloating. Battery drains completely within 30 minutes.',  'Walk-In', 'Keinth', 500.00, 'Pending',     'Unpaid',  CURDATE());

-- ============================================================
-- 6. TICKET PARTS CONSUMPTION LINKAGE MATRIX 
-- ============================================================
INSERT INTO ticket_parts (ticket_id, part_id, quantity, unit_price) VALUES
(1, 1, 1, 5000.00);

-- ============================================================
-- 7. REPAIR MILESTONE LOGGING SUB-SYSTEM
-- ============================================================
INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES
(1, 'Status Change', 'Ticket initiated automatically during physical customer shop walk-in.',                                                          'admin'),
(1, 'Tech Note',     'Inspected internal frame alignment. Screws cataloged safely. Awaiting display replacement module installation.',                 'technician'),
(2, 'Status Change', 'Ticket registered and queued for full service workbench queue diagnostic assignment.',                                           'admin');

-- ============================================================
-- 8. CASH TRANSACTION BILLING LEDGER SEEDING
-- ============================================================
INSERT INTO payments (ticket_id, amount_paid, payment_method, paid_at) VALUES
(1, 1500.00, 'GCash', NOW());