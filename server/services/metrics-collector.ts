import cron from 'node-cron';
import si from 'systeminformation';
import { run, query, get } from '../config/database';
import { sendPushoverNotification } from './pushover';
import { logEvent } from './logger';
import { randomUUID } from 'crypto';

let collectorRunning = false;

export function startMetricsCollector(): void {
  if (collectorRunning) {
    console.log('Metrics collector already running');
    return;
  }

  cron.schedule('*/1 * * * *', async () => {
    try {
      await collectAndStoreMetrics();
    } catch (error) {
      console.error('Error in metrics collector:', error);
    }
  });

  collectorRunning = true;
  console.log('Metrics collector scheduled (every minute)');
}

async function collectAndStoreMetrics(): Promise<void> {
  try {
    const [cpu, mem, disk, temp, network] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.cpuTemperature(),
      si.networkInterfaces()
    ]);

    const primaryDisk = disk[0] || { size: 1, used: 0 };
    const diskUsagePercent = (primaryDisk.used / primaryDisk.size) * 100;

    const id = randomUUID();
    const cpuUsage = parseFloat(cpu.currentLoad.toFixed(2));
    const memoryUsage = parseFloat(((mem.used / mem.total) * 100).toFixed(2));
    const diskUsage = parseFloat(diskUsagePercent.toFixed(2));
    const temperature = temp.main || 0;
    const uptime = si.time().uptime || 0;

    run(
      'INSERT INTO metrics (id, cpu_usage, memory_usage, disk_usage, temperature, uptime) VALUES (?, ?, ?, ?, ?, ?)',
      [id, cpuUsage, memoryUsage, diskUsage, temperature, uptime]
    );

    await cleanOldMetrics();
  } catch (error) {
    console.error('Error collecting metrics:', error);
  }
}

async function cleanOldMetrics(): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    run('DELETE FROM metrics WHERE timestamp < ?', [sevenDaysAgo]);
  } catch (error) {
    console.error('Error cleaning old metrics:', error);
  }
}
