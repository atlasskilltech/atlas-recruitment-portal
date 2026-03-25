const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  APP_NAME: process.env.APP_NAME || 'Atlas HR Recruitment Portal',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  // Database
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 3306,
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'atlas_recruitment',

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'atlas-hr-secret-change-in-production',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE, 10) || 1000 * 60 * 60 * 24, // 24 hours
  SESSION_STORE: process.env.SESSION_STORE || 'memory', // 'memory' or 'database'

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'atlas-jwt-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // File uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB

  // AI Service
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:5000',
  AI_SERVICE_API_KEY: process.env.AI_SERVICE_API_KEY || '',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

module.exports = env;
