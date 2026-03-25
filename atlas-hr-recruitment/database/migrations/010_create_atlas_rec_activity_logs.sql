-- Migration: 010_create_atlas_rec_activity_logs
-- Description: Create the activity logs table

CREATE TABLE IF NOT EXISTS `atlas_rec_activity_logs` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT DEFAULT NULL,
    `job_id` INT DEFAULT NULL,
    `user_id` INT DEFAULT NULL,
    `action_key` VARCHAR(100) DEFAULT NULL,
    `action_label` VARCHAR(255) DEFAULT NULL,
    `metadata` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_action_key` (`action_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
