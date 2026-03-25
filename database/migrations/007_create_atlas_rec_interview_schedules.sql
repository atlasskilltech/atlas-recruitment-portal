-- Migration: 007_create_atlas_rec_interview_schedules
-- Description: Create the interview schedules table

CREATE TABLE IF NOT EXISTS `atlas_rec_interview_schedules` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `shortlist_id` INT DEFAULT NULL,
    `candidate_id` INT NOT NULL,
    `job_id` INT DEFAULT NULL,
    `scheduled_date` DATE DEFAULT NULL,
    `scheduled_time` TIME DEFAULT NULL,
    `mode` ENUM('offline', 'online') DEFAULT NULL,
    `location` TEXT DEFAULT NULL,
    `meeting_link` TEXT DEFAULT NULL,
    `panel_members` JSON DEFAULT NULL,
    `notes` LONGTEXT DEFAULT NULL,
    `notification_sent` TINYINT DEFAULT 0,
    `status` ENUM('scheduled', 'rescheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`),
    INDEX `idx_shortlist_id` (`shortlist_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
