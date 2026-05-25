-- ============================================================
-- Code & Locks — Demo / presentation seed data
-- database/seed.sql
--
-- Run after schema.sql:
--   mysql -u root -p < database/seed.sql
--
-- Demo logins (bcrypt):
--   admin      / admin123
--   technician / 1234
--
-- Demo tickets for public tracking:
--   CL-2026-00001  Walk-In · Repairing · partial payment
--   CL-2026-00002  Walk-In · Diagnosing
--   CL-2026-00003  Home Service · Approved
-- ============================================================

USE code_and_locks;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM payments;
DELETE FROM repair_logs;
DELETE FROM ticket_photos;
DELETE FROM ticket_checklist;
DELETE FROM ticket_parts;
DELETE FROM repair_tickets;
DELETE FROM bookings;
DELETE FROM devices;
DELETE FROM customers;
DELETE FROM inventory;
DELETE FROM staff_users;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE staff_users AUTO_INCREMENT = 1;
ALTER TABLE customers AUTO_INCREMENT = 1;
ALTER TABLE devices AUTO_INCREMENT = 1;
ALTER TABLE bookings AUTO_INCREMENT = 1;
ALTER TABLE repair_tickets AUTO_INCREMENT = 1;
ALTER TABLE inventory AUTO_INCREMENT = 1;
ALTER TABLE ticket_photos AUTO_INCREMENT = 1;
ALTER TABLE ticket_checklist AUTO_INCREMENT = 1;
ALTER TABLE repair_logs AUTO_INCREMENT = 1;
ALTER TABLE payments AUTO_INCREMENT = 1;

-- ── Staff ─────────────────────────────────────────────────────
INSERT INTO staff_users (user_id, username, password, full_name, role, created_by, is_active) VALUES
(1, 'admin',      '$2b$10$Fb95bbNO012eM8sg1hosruofkqzYTiW5x48jfLa7XQ0AM/kdtlfOi', 'Admin User',    'admin',      NULL, 1),
(2, 'technician', '$2b$10$0mkDmZv1YXs/a8ui.MpteO.MXooN5LDNonDi9DLJZomLwmqrviHuC', 'Keinth Santos', 'technician', 'admin', 1);

-- ── Inventory (PRT-XXX codes, phone-repair categories) ────────
INSERT INTO inventory (part_id, part_code, part_name, category, quantity, cost_price, retail_price) VALUES
(1,  'PRT-001', 'iPhone 11 OLED Screen Assembly',           'LCD/Screen',    12, 3800.00, 5000.00),
(2,  'PRT-002', 'iPhone 12 Pro OLED Screen (Premium)',      'LCD/Screen',     6, 4500.00, 6000.00),
(3,  'PRT-003', 'iPhone 11 High Capacity Battery',          'Battery',       20,  400.00,  950.00),
(4,  'PRT-004', 'Vivo Y20 LCD Replacement Panel',           'LCD/Screen',    15, 2000.00, 3000.00),
(5,  'PRT-005', 'Vivo Y20 Li-Polymer Battery Pack',         'Battery',       12,  300.00,  700.00),
(6,  'PRT-006', 'USB-C Charging Port Flex (Universal)',     'Charging Port',  8,  150.00,  450.00),
(7,  'PRT-007', 'Rear Camera Module — Samsung A14',         'Camera',         3,  800.00, 1200.00),
(8,  'PRT-008', 'Speaker Assembly — iPhone 11',             'Speaker/Mic',    2,  250.00,  550.00);

-- ── Customers ─────────────────────────────────────────────────
INSERT INTO customers (customer_id, full_name, phone, email, address) VALUES
(1, 'Bom Boncodin',       '09171234567', 'bom.boncodin@email.com',   'Brgy. San Gabriel, Tambo, Pamplona, Camarines Sur'),
(2, 'Chamber Operator',   '09187654321', 'chamber.op@email.com',     'Centro, Tambo, Pamplona, Camarines Sur'),
(3, 'Geo Badi',           '09191112233', 'geo.badi@email.com',       'Sitio Mabini, Tambo, Pamplona, Camarines Sur');

-- ── Devices ───────────────────────────────────────────────────
INSERT INTO devices (device_id, customer_id, device_type, brand, imei, passcode) VALUES
(1, 1, 'Smartphone', 'Apple iPhone 11',      '351982104928172', NULL),
(2, 2, 'Smartphone', 'Vivo Y20',             '862910492811029', '2580'),
(3, 3, 'Smartphone', 'Samsung Galaxy A14',   '359012345678901', NULL);

-- ── Walk-in tickets ───────────────────────────────────────────
INSERT INTO repair_tickets (
  ticket_id, ticket_number, customer_id, device_id, booking_id,
  problem_desc, service_type, assigned_tech, diagnostic_notes, repair_notes,
  estimated_cost, status, payment_status, received_date
) VALUES
(1, 'CL-2026-00001', 1, 1, NULL,
 'Cracked screen with touch issues; display flickers on boot.',
 'Walk-In', 'Keinth Santos',
 'LCD flex damaged at corner. Touch IC responding intermittently.',
 'Screen assembly ordered; installation scheduled today.',
 5000.00, 'Repairing', 'Partial', CURDATE()),
(2, 'CL-2026-00002', 2, 2, NULL,
 'Battery drains quickly; device gets warm during charging.',
 'Walk-In', 'Keinth Santos',
 'Battery health at 62%. Charging port shows minor corrosion.',
 NULL,
 700.00, 'Diagnosing', 'Unpaid', CURDATE());

-- ── Home service booking + ticket ────────────────────────────
INSERT INTO bookings (
  booking_id, customer_name, contact_number, customer_email,
  device_type, device_brand, problem_desc, service_type, address,
  service_date, preferred_time,
  downpayment_method, downpayment_reference, downpayment_note,
  payment_status, service_fee, status
) VALUES
(1, 'Ana Reyes', '09195556677', 'ana.reyes@email.com',
 'Smartphone', 'Samsung Galaxy A14',
 'Phone does not charge; charging port feels loose.',
 'Home Service', 'Sitio Mabini, Tambo, Pamplona, Camarines Sur',
 DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00',
 'GCash', 'GCASH123456789', 'GCash ref submitted with booking form.',
 'Partial', 500.00, 'Approved');

INSERT INTO repair_tickets (
  ticket_id, ticket_number, customer_id, device_id, booking_id,
  problem_desc, service_type, address, service_date, preferred_time,
  assigned_tech, tech_contact, tech_assigned_date,
  estimated_cost, status, payment_status, received_date
) VALUES
(3, 'CL-2026-00003', 3, 3, 1,
 'Phone does not charge; charging port feels loose.',
 'Home Service', 'Sitio Mabini, Tambo, Pamplona, Camarines Sur',
 DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00',
 'Keinth Santos', '09171234567', CURDATE(),
 500.00, 'Approved', 'Partial', CURDATE());

-- ── Parts on tickets ─────────────────────────────────────────
INSERT INTO ticket_parts (ticket_id, part_id, quantity, unit_price) VALUES
(1, 1, 1, 5000.00),
(2, 5, 1, 700.00);

-- ── Problem description checklist items (staff confirm each) ─
-- checklist_type is always 'Problem' — Repair type is removed.
INSERT INTO ticket_checklist (ticket_id, label, checklist_type, is_checked, checked_by, checked_at, sort_order) VALUES
(1, 'Cracked screen with touch issues', 'Problem', 1, 'Keinth Santos', NOW(), 1),
(1, 'Display flickers on boot',         'Problem', 1, 'Keinth Santos', NOW(), 2),
(2, 'Battery drains quickly',           'Problem', 0, NULL, NULL, 1),
(2, 'Device gets warm while charging',  'Problem', 0, NULL, NULL, 2);

-- ── Activity logs ────────────────────────────────────────────
INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES
(1, 'Status Change',    'Ticket CL-2026-00001 created. Status: Pending.', 'admin'),
(1, 'Status Change',    'Device received during customer walk-in.', 'admin'),
(1, 'Status Change',    'Status updated from "Pending" to "Diagnosing".', 'Keinth Santos'),
(1, 'Status Change',    'Status updated from "Diagnosing" to "Repairing".', 'Keinth Santos'),
(1, 'Tech Note',        'Screen assembly ordered; awaiting installation.', 'Keinth Santos'),
(1, 'Checklist Update', 'Problem "Cracked screen with touch issues" confirmed by Keinth Santos.', 'Keinth Santos'),
(1, 'Checklist Update', 'Problem "Display flickers on boot" confirmed by Keinth Santos.', 'Keinth Santos'),
(2, 'Status Change',    'Ticket CL-2026-00002 created. Status: Pending.', 'admin'),
(2, 'Status Change',    'Device received during customer walk-in.', 'admin'),
(2, 'Status Change',    'Status updated from "Pending" to "Diagnosing".', 'Keinth Santos'),
(2, 'Tech Note',        'Battery test scheduled; customer notified of ETA.', 'Keinth Santos'),
(3, 'Status Change',    'Home service request submitted.', 'system'),
(3, 'Status Change',    'Booking approved.', 'admin'),
(3, 'Customer Update',  'Downpayment reference GCASH123456789 received.', 'admin');

-- ── Payments ─────────────────────────────────────────────────
INSERT INTO payments (ticket_id, amount_paid, payment_method, notes, recorded_by) VALUES
(1, 2500.00, 'GCash', 'Partial payment at intake.', 'admin'),
(3, 200.00,  'GCash', 'Home service downpayment.', 'admin');