CREATE TABLE IF NOT EXISTS `atlas_rec_candidate_documents` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `candidate_id` INT NOT NULL,
    `application_id` INT DEFAULT NULL,
    `document_type` VARCHAR(100) NOT NULL,
    `original_file_name` VARCHAR(255) DEFAULT NULL,
    `stored_file_name` VARCHAR(255) DEFAULT NULL,
    `file_url` TEXT DEFAULT NULL,
    `upload_source` ENUM('candidate','hr','system') DEFAULT 'candidate',
    `is_active` TINYINT DEFAULT 1,
    `reviewed_status` ENUM('pending','approved','rejected') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_candidate_id` (`candidate_id`),
    INDEX `idx_application_id` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
