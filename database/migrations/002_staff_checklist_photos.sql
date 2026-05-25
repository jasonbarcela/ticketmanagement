-- Migration 002: staff created_by, checklist_type, ticket_photos LONGTEXT
USE code_and_locks;

ALTER TABLE staff_users ADD COLUMN created_by VARCHAR(100) NULL;

ALTER TABLE ticket_checklist
  ADD COLUMN checklist_type ENUM('Problem', 'Repair') NOT NULL DEFAULT 'Repair';

ALTER TABLE ticket_photos
  MODIFY COLUMN file_url LONGTEXT NOT NULL;
