-- Seed: 001_default_users
-- Description: Insert default admin, HR manager, and recruiter users
-- Password hash is bcrypt hash of "Atlas@2024"

INSERT INTO `atlas_rec_users` (`full_name`, `email`, `mobile`, `password_hash`, `role`, `status`)
VALUES
    (
        'Atlas Admin',
        'admin@atlasuniversity.edu.in',
        '+919999900001',
        '$2a$10$BfZBFmczIKBlfUO1IF8iTO0kbPDrTZfS6RQKnPPJrJTsq1jj6ng9u',
        'super_admin',
        1
    ),
    (
        'Priya Sharma',
        'hr.manager@atlasuniversity.edu.in',
        '+919999900002',
        '$2a$10$BfZBFmczIKBlfUO1IF8iTO0kbPDrTZfS6RQKnPPJrJTsq1jj6ng9u',
        'hr_manager',
        1
    ),
    (
        'Rahul Verma',
        'recruiter@atlasuniversity.edu.in',
        '+919999900003',
        '$2a$10$BfZBFmczIKBlfUO1IF8iTO0kbPDrTZfS6RQKnPPJrJTsq1jj6ng9u',
        'recruiter',
        1
    )
ON DUPLICATE KEY UPDATE `password_hash` = VALUES(`password_hash`), `updated_at` = CURRENT_TIMESTAMP;
