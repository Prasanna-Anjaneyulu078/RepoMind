const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { FRONTEND_URL } = require('./config/env');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const repositoryRoutes = require('./routes/repositoryRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

app.use(limiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
