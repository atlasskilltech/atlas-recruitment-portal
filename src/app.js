/**
 * Atlas HR Recruitment Portal
 * Main Application Entry Point
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { buildSessionConfig } = require('./config/session');
const { attachUser } = require('./middlewares/auth.middleware');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const webRoutes = require('./routes/web.routes');

const app = express();

// ─── Proxy Trust ────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Security ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.atlasuniversity.edu.in"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── Rate Limiting ──────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(env.AUTH_RATE_LIMIT_MAX) || 20,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// ─── Logging ────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Body Parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(methodOverride('_method'));

// ─── Static Files ───────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Session & Flash ────────────────────────────────────
app.use(session(buildSessionConfig()));
app.use(flash());

// ─── Template Engine ────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ─── Global Middleware ──────────────────────────────────
app.use(attachUser);

// Make flash messages and helpers available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.warning = req.flash('warning');
  res.locals.info = req.flash('info');
  res.locals.oldInput = req.flash('oldInput')[0] || {};
  res.locals.currentPath = req.path;
  res.locals.appName = env.APP_NAME;
  res.locals.appUrl = env.APP_URL;

  // Helpers available in all EJS templates
  const helpers = require('./utils/helpers');
  const dateUtils = require('./utils/date');
  const constants = require('./config/constants');
  res.locals.helpers = helpers;
  res.locals.dateUtils = dateUtils;
  res.locals.constants = constants;
  res.locals.fileUrlService = require('./services/fileUrl.service');

  next();
});

// ─── Rate limit on auth routes ──────────────────────────
app.post('/login', authLimiter);

// ─── Candidate Portal Routes ────────────────────────────
const { attachCandidate } = require('./middlewares/candidateAuth.middleware');
const candidateAuthRoutes = require('./routes/candidateAuth.routes');
const candidatePortalRoutes = require('./routes/candidatePortal.routes');
app.use('/candidate', attachCandidate, candidateAuthRoutes);
app.use('/candidate', attachCandidate, candidatePortalRoutes);

// ─── Routes ─────────────────────────────────────────────
app.use('/', webRoutes);

// ─── Error Handling ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
const PORT = parseInt(env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   Atlas HR Recruitment Portal                     ║
  ║   Running on: http://localhost:${PORT}              ║
  ║   Environment: ${env.NODE_ENV.padEnd(33)}║
  ╚═══════════════════════════════════════════════════╝
  `);

  // Start background cron jobs
  const { startAIScreeningCron } = require('./jobs/aiScreeningCron');
  startAIScreeningCron();

  const { startAIInterviewCron } = require('./jobs/aiInterviewCron');
  startAIInterviewCron();
});

module.exports = app;
