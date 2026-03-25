-- Migration: 009_create_atlas_rec_notifications
-- Description: Create the notifications table

CREATE TABLE IF NOT EXISTS `atlas_rec_notifications` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT DEFAULT NULL,
    `job_id` INT DEFAULT NULL,
    `channel` ENUM('email', 'sms', 'whatsapp', 'system') NOT NULL,
    `template_key` VARCHAR(100) DEFAULT NULL,
    `recipient` VARCHAR(255) DEFAULT NULL,
    `subject` VARCHAR(255) DEFAULT NULL,
    `message` LONGTEXT DEFAULT NULL,
    `status` ENUM('queued', 'sent', 'failed') DEFAULT 'queued',
    `provider_response` LONGTEXT DEFAULT NULL,
    `sent_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
