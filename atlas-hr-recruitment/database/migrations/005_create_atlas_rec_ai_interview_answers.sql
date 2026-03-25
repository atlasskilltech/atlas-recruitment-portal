-- Migration: 005_create_atlas_rec_ai_interview_answers
-- Description: Create the AI interview answers table

CREATE TABLE IF NOT EXISTS `atlas_rec_ai_interview_answers` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `interview_id` INT NOT NULL,
    `question_id` INT NOT NULL,
    `answer_text` LONGTEXT DEFAULT NULL,
    `answer_audio_url` TEXT DEFAULT NULL,
    `answer_video_url` TEXT DEFAULT NULL,
    `score` DECIMAL(5,2) DEFAULT NULL,
    `keyword_relevance_score` DECIMAL(5,2) DEFAULT NULL,
    `quality_score` DECIMAL(5,2) DEFAULT NULL,
    `ai_feedback` LONGTEXT DEFAULT NULL,
    `submitted_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_interview_id` (`interview_id`),
    INDEX `idx_question_id` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
