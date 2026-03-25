-- Migration: 003_create_atlas_rec_ai_interviews
-- Description: Create the AI interviews table

CREATE TABLE IF NOT EXISTS `atlas_rec_ai_interviews` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT NOT NULL,
    `job_id` INT DEFAULT NULL,
    `screening_id` INT DEFAULT NULL,
    `interview_type` ENUM('hr', 'technical') NOT NULL,
    `difficulty_level` ENUM('low', 'medium', 'high') DEFAULT 'high',
    `invitation_token` VARCHAR(255) DEFAULT NULL,
    `status` ENUM('pending', 'invited', 'in_progress', 'submitted', 'evaluated', 'passed', 'failed', 'expired') DEFAULT 'pending',
    `total_score` DECIMAL(5,2) DEFAULT NULL,
    `communication_score` DECIMAL(5,2) DEFAULT NULL,
    `domain_knowledge_score` DECIMAL(5,2) DEFAULT NULL,
    `problem_solving_score` DECIMAL(5,2) DEFAULT NULL,
    `confidence_score` DECIMAL(5,2) DEFAULT NULL,
    `ai_feedback` LONGTEXT DEFAULT NULL,
    `ai_summary` LONGTEXT DEFAULT NULL,
    `recording_url` TEXT DEFAULT NULL,
    `started_at` DATETIME DEFAULT NULL,
    `submitted_at` DATETIME DEFAULT NULL,
    `evaluated_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_invitation_token` (`invitation_token`),
    INDEX `idx_candidate_id` (`candidate_id`),
    INDEX `idx_invitation_token` (`invitation_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
