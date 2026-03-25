-- Migration: 006_create_atlas_rec_hr_shortlists
-- Description: Create the HR shortlists table

CREATE TABLE IF NOT EXISTS `atlas_rec_hr_shortlists` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT NOT NULL,
    `job_id` INT DEFAULT NULL,
    `screening_id` INT DEFAULT NULL,
    `interview_id` INT DEFAULT NULL,
    `ai_match_score` DECIMAL(5,2) DEFAULT NULL,
    `interview_score` DECIMAL(5,2) DEFAULT NULL,
    `recommendation_tag` ENUM('strong_fit', 'moderate_fit', 'weak_fit') DEFAULT NULL,
    `hr_status` ENUM('new', 'shortlisted', 'rejected', 'hold', 'scheduled', 'selected', 'offer_released', 'hired') DEFAULT 'new',
    `hr_notes` LONGTEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`),
    INDEX `idx_job_id` (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
