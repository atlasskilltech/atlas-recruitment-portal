-- Migration: 008_create_atlas_rec_hr_notes
-- Description: Create the HR notes table

CREATE TABLE IF NOT EXISTS `atlas_rec_hr_notes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT NOT NULL,
    `job_id` INT DEFAULT NULL,
    `note_type` ENUM('general', 'screening', 'interview', 'decision') DEFAULT NULL,
    `note_text` LONGTEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
