import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logEvent } from './logger';

const execAsync = promisify(exec);
let schedulerRunning = false;

export function startBackupScheduler(): void {
  if (schedulerRunning) {
    console.log('Backup scheduler already running');
    return;
  }

  // Simple scheduler - just logs for now since we use DuckDB locally
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('Backup scheduler check running...');
    } catch (error) {
      console.error('Error in backup scheduler:', error);
    }
  });

  schedulerRunning = true;
  console.log('Backup scheduler initialized');
}
