/**
 * Migration Runner for Atlas HR Recruitment Portal
 * Reads all .sql files from the migrations directory and executes them in order using mysql2.
 *
 * Usage: node run.js
 *
 * Environment variables (or uses defaults):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'atlas_recruitment',
    multipleStatements: true,
};

async function runMigrations() {
    const migrationsDir = __dirname;
    let connection;

    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Connected successfully.\n');

        // Create migrations tracking table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`atlas_rec_migrations\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`filename\` VARCHAR(255) NOT NULL,
                \`executed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uk_filename\` (\`filename\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Get already executed migrations
        const [executedRows] = await connection.execute(
            'SELECT filename FROM `atlas_rec_migrations` ORDER BY id ASC'
        );
        const executedSet = new Set(executedRows.map((row) => row.filename));

        // Read all .sql files and sort them by name
        const files = fs
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            console.log('No migration files found.');
            return;
        }

        console.log(`Found ${files.length} migration file(s).\n`);

        let executed = 0;
        let skipped = 0;

        for (const file of files) {
            if (executedSet.has(file)) {
                console.log(`  SKIP    ${file} (already executed)`);
                skipped++;
                continue;
            }

            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8').trim();

            if (!sql) {
                console.log(`  SKIP    ${file} (empty file)`);
                skipped++;
                continue;
            }

            try {
                console.log(`  RUN     ${file}`);
                await connection.query(sql);
                await connection.execute(
                    'INSERT INTO `atlas_rec_migrations` (`filename`) VALUES (?)',
                    [file]
                );
                executed++;
            } catch (err) {
                console.error(`  FAIL    ${file}`);
                console.error(`          Error: ${err.message}`);
                process.exit(1);
            }
        }

        console.log(`\nMigration complete. Executed: ${executed}, Skipped: ${skipped}.`);
    } catch (err) {
        console.error('Migration runner failed:', err.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

runMigrations();
