-- Migration: 004_create_atlas_rec_ai_interview_questions
-- Description: Create the AI interview questions table

CREATE TABLE IF NOT EXISTS `atlas_rec_ai_interview_questions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `interview_id` INT NOT NULL,
    `question_order` INT DEFAULT NULL,
    `question_text` LONGTEXT NOT NULL,
    `question_type` ENUM('text', 'audio', 'video', 'mcq') DEFAULT 'text',
    `expected_keywords` JSON DEFAULT NULL,
    `max_duration_seconds` INT DEFAULT 300,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_interview_id` (`interview_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
