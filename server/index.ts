import express from 'express';
import { createServer } from 'http';
import { initializeDatabase } from './config/database';
import { authRouter } from './routes/auth';
import { dockerRouter } from './routes/docker';
import { filesRouter } from './routes/files';
import { metricsRouter } from './routes/metrics';
import { notificationsRouter } from './routes/notifications';
import { settingsRouter } from './routes/settings';
import { authenticateToken } from './middleware/auth';
import { startMetricsCollector } from './services/metrics-collector';
import { startBackupScheduler } from './services/backup-scheduler';

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/docker', authenticateToken, dockerRouter);
app.use('/api/files', authenticateToken, filesRouter);
app.use('/api/metrics', authenticateToken, metricsRouter);
app.use('/api/notifications', authenticateToken, notificationsRouter);
app.use('/api/settings', authenticateToken, settingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.BACKEND_PORT || 3050;

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');

    server.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);

      startMetricsCollector();
      startBackupScheduler();

      console.log('Metrics collector started');
      console.log('Backup scheduler started');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
