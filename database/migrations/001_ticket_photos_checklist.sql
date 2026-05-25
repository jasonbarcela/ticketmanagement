-- Migration: ticket_photos, ticket_checklist, repair_logs enum extension
USE code_and_locks;

CREATE TABLE IF NOT EXISTS ticket_photos (
    photo_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    photo_stage ENUM('Before', 'During', 'After') NOT NULL,
    file_url TEXT NOT NULL,
    caption TEXT NULL,
    uploaded_by VARCHAR(100) NOT NULL DEFAULT 'system',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticket_checklist (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    label VARCHAR(200) NOT NULL,
    is_checked TINYINT NOT NULL DEFAULT 0,
    checked_by VARCHAR(100) NULL,
    checked_at TIMESTAMP NULL,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (ticket_id) REFERENCES repair_tickets(ticket_id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE repair_logs
    MODIFY COLUMN change_type ENUM(
        'Status Change',
        'Tech Note',
        'Customer Update',
        'Photo Added',
        'Checklist Update'
    ) NOT NULL;
