-- Seed: 001_default_users
-- Description: Insert default admin, HR manager, and recruiter users
-- Password hash is bcrypt hash of "Atlas@2024"

INSERT INTO `atlas_rec_users` (`full_name`, `email`, `mobile`, `password_hash`, `role`, `status`)
VALUES
    (
        'Atlas Admin',
        'admin@atlasuniversity.edu.in',
        '+919999900001',
        '$2b$10$Z9o5IWx5H5HqfGzKZsMZqu4Y4mGBSjWFQEq7Rk3cNLWYDP3WAG/uO',
        'super_admin',
        1
    ),
    (
        'Priya Sharma',
        'hr.manager@atlasuniversity.edu.in',
        '+919999900002',
        '$2b$10$Z9o5IWx5H5HqfGzKZsMZqu4Y4mGBSjWFQEq7Rk3cNLWYDP3WAG/uO',
        'hr_manager',
        1
    ),
    (
        'Rahul Verma',
        'recruiter@atlasuniversity.edu.in',
        '+919999900003',
        '$2b$10$Z9o5IWx5H5HqfGzKZsMZqu4Y4mGBSjWFQEq7Rk3cNLWYDP3WAG/uO',
        'recruiter',
        1
    )
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
