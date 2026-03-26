-- Migration: 016_create_atlas_rec_job_candidate_matches
-- Description: Store AI match scores between every job and all candidates.
-- This enables "Top 20 Candidates per Job" feature.

CREATE TABLE IF NOT EXISTS `atlas_rec_job_candidate_matches` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `job_id` INT NOT NULL COMMENT 'FK to isdi_admsn_applied_for.id',
    `candidate_id` INT NOT NULL COMMENT 'FK to dice_staff_recruitment.id',
    `match_score` DECIMAL(5,2) DEFAULT NULL COMMENT 'AI match score 0-100',
    `match_status` ENUM('strong_fit', 'moderate_fit', 'weak_fit') DEFAULT 'weak_fit',
    `skills_matched` JSON DEFAULT NULL,
    `skills_missing` JSON DEFAULT NULL,
    `match_summary` TEXT DEFAULT NULL,
    `ai_provider` VARCHAR(50) DEFAULT NULL,
    `scanned_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_job_candidate` (`job_id`, `candidate_id`),
    INDEX `idx_job_score` (`job_id`, `match_score` DESC),
    INDEX `idx_candidate_id` (`candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
