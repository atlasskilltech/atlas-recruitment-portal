-- Migration: 002_create_atlas_rec_candidate_ai_screening
-- Description: Create the candidate AI screening table

CREATE TABLE IF NOT EXISTS `atlas_rec_candidate_ai_screening` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT NOT NULL,
    `job_id` INT DEFAULT NULL,
    `cv_file_name` VARCHAR(255) DEFAULT NULL,
    `cv_file_url` TEXT DEFAULT NULL,
    `cover_letter_file_name` VARCHAR(255) DEFAULT NULL,
    `cover_letter_file_url` TEXT DEFAULT NULL,
    `jd_snapshot` LONGTEXT DEFAULT NULL,
    `extracted_skills` JSON DEFAULT NULL,
    `extracted_keywords` JSON DEFAULT NULL,
    `extracted_education_summary` TEXT DEFAULT NULL,
    `extracted_experience_summary` TEXT DEFAULT NULL,
    `ai_match_score` DECIMAL(5,2) DEFAULT NULL,
    `skill_gap_analysis` LONGTEXT DEFAULT NULL,
    `role_fit_summary` LONGTEXT DEFAULT NULL,
    `ai_recommendation_tag` ENUM('strong_fit', 'moderate_fit', 'weak_fit') DEFAULT NULL,
    `ai_status` ENUM('eligible', 'hold', 'rejected') DEFAULT NULL,
    `ai_provider` VARCHAR(100) DEFAULT NULL,
    `ai_model` VARCHAR(100) DEFAULT NULL,
    `raw_ai_response` LONGTEXT DEFAULT NULL,
    `processed_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`),
    INDEX `idx_job_id` (`job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
