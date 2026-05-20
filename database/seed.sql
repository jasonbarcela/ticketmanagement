-- ============================================================
-- Code & Locks — Demo / presentation seed data
-- database/seed.sql
--
-- Run after schema.sql:
--   mysql -u root -p < database/seed.sql
--
-- Demo logins (bcrypt): admin / admin123 · technician / 1234
-- ============================================================

USE code_and_locks;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM payments;
DELETE FROM repair_logs;
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
ALTER TABLE repair_logs AUTO_INCREMENT = 1;
ALTER TABLE payments AUTO_INCREMENT = 1;

-- Staff
INSERT INTO staff_users (user_id, username, password, full_name, role, is_active) VALUES
(1, 'admin',      '$2b$10$Fb95bbNO012eM8sg1hosruofkqzYTiW5x48jfLa7XQ0AM/kdtlfOi', 'Admin', 'admin', 1),
(2, 'technician', '$2b$10$0mkDmZv1YXs/a8ui.MpteO.MXooN5LDNonDi9DLJZomLwmqrviHuC', 'Keinth',       'technician', 1);

-- Inventory (local shop pricing)
INSERT INTO inventory (part_id, part_code, part_name, category, quantity, cost_price, retail_price) VALUES
(1,  'LCD-IP11-ORG', 'iPhone 11 Original LCD Screen Assembly',          'Display Panel', 12, 3800.00,  5000.00),
(2,  'LCD-IP12-PRM', 'iPhone 12 Original LCD Screen (Premium)',         'Display Panel',  6, 4500.00,  6000.00),
(3,  'BAT-IP11-GEN', 'iPhone 11 High Capacity Replacement Battery',     'Batteries',     20,  400.00,   950.00),
(4,  'LCD-VIV-GEN',  'Vivo Smartphone LCD Replacement Panel',             'Display Panel', 15, 2000.00,  3000.00),
(5,  'BAT-VIV-Y20',  'Vivo Y20 Series Li-Polymer Battery Pack',            'Batteries',     12,  300.00,   700.00);

-- Customers (Tambo, Tambo, Pamplona, Camarines Sur area)
INSERT INTO customers (customer_id, full_name, phone, email, address) VALUES
(1, 'Bom Boncodin',    '09171234567', 'bom.boncodin@email.com',  'Brgy. San Gabriel, Tambo, Pamplona, Camarines Sur'),
(2, 'Chamber Operator',  '09187654321', 'chamber.op@email.com',  'Centro, Tambo, Pamplona, Camarines Sur'),
(3, 'Geo Badi',       '09191112233', 'geo.badi@email.com','Sitio Mabini, Tambo, Pamplona, Camarines Sur');

-- Devices
INSERT INTO devices (device_id, customer_id, device_type, brand, imei, passcode) VALUES
(1, 1, 'Smartphone', 'Apple iPhone 11', '351982104928172', NULL),
(2, 2, 'Smartphone', 'Vivo Y20',        '862910492811029', '2580'),
(3, 3, 'Smartphone', 'Samsung Galaxy A14', '359012345678901', NULL);

-- Walk-in tickets
INSERT INTO repair_tickets (
  ticket_id, ticket_number, customer_id, device_id, booking_id,
  problem_desc, service_type, assigned_tech, estimated_cost,
  status, payment_status, received_date
) VALUES
(1, 'CL-2026-00001', 1, 1, NULL,
 'Cracked screen with touch issues.', 'Walk-In', 'Keinth', 5000.00,
 'Repairing', 'Partial', CURDATE()),
(2, 'CL-2026-00002', 2, 2, NULL,
 'Battery drains quickly; device gets warm.', 'Walk-In', 'Keinth', 700.00,
 'Diagnosing', 'Unpaid', CURDATE());

-- Home service booking + ticket
INSERT INTO bookings (
  booking_id, customer_name, contact_number, customer_email,
  device_type, device_brand, problem_desc, service_type, address,
  service_date, preferred_time,
  downpayment_method, downpayment_reference, downpayment_note,
  payment_status, service_fee, status
) VALUES
(1, 'Ana Reyes', '09191112233', 'ana.reyes@email.com',
 'Smartphone', 'Samsung Galaxy A14',
 'Phone does not charge; charging port feels loose.',
 'Home Service', 'Sitio Mabini, Tambo, Pamplona, Camarines Sur',
 DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00',
 'GCash', 'GCASH123456789', 'GCash ref: GCASH123456789',
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
 'Keinth', '09171234567', CURDATE(),
 500.00, 'Approved', 'Partial', CURDATE());

-- Parts on walk-in ticket 1
INSERT INTO ticket_parts (ticket_id, part_id, quantity, unit_price) VALUES
(1, 1, 1, 5000.00);

-- Activity logs
INSERT INTO repair_logs (ticket_id, change_type, notes, changed_by) VALUES
(1, 'Status Change', 'Device received during customer walk-in.', 'admin'),
(1, 'Status Change', 'Status updated from "Pending" to "Repairing".', 'technician'),
(1, 'Tech Note',     'Screen assembly ordered; awaiting installation.', 'technician'),
(2, 'Status Change', 'Device received during customer walk-in.', 'admin'),
(3, 'Status Change', 'Home service request submitted.', 'system'),
(3, 'Status Change', 'Booking approved.', 'admin');

-- Payment on ticket 1
INSERT INTO payments (ticket_id, amount_paid, payment_method, recorded_by) VALUES
(1, 2500.00, 'GCash', 'admin');
