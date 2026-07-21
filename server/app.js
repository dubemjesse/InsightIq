const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const dataSourceRoutes = require('./routes/dataSource.routes');
const queryRoutes = require('./routes/query.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const insightsRoutes = require('./routes/insights.routes');
const adminRoutes = require('./routes/admin.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    // In dev, Vite auto-increments its port if CLIENT_URL's port is taken,
    // so pin to the configured origin in production but accept any
    // localhost port while developing.
    origin:
      env.nodeEnv === 'production'
        ? env.clientUrl
        : /^http:\/\/localhost:\d+$/,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Routes.
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/data-sources', dataSourceRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
