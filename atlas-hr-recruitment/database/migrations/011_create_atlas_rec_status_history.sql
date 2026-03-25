-- Migration: 011_create_atlas_rec_status_history
-- Description: Create the status history table

CREATE TABLE IF NOT EXISTS `atlas_rec_status_history` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT NOT NULL,
    `job_id` INT DEFAULT NULL,
    `old_status` VARCHAR(100) DEFAULT NULL,
    `new_status` VARCHAR(100) DEFAULT NULL,
    `source` ENUM('system', 'ai', 'hr') DEFAULT NULL,
    `remarks` TEXT DEFAULT NULL,
    `changed_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
