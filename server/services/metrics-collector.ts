import cron from 'node-cron';
import si from 'systeminformation';
import { supabase } from '../config/supabase';
import { sendPushoverNotification } from './pushover';
import { logEvent } from './logger';

let collectorRunning = false;

export function startMetricsCollector(): void {
  if (collectorRunning) {
    console.log('Metrics collector already running');
    return;
  }

  cron.schedule('*/1 * * * *', async () => {
    try {
      await collectAndStoreMetrics();
      await checkAlertThresholds();
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

    const activeInterface = network.find(iface => iface.ip4 && !iface.internal) || network[0];

    let publicIp = '';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(5000)
      });
      const ipData = await ipResponse.json();
      publicIp = ipData.ip;
    } catch {
      publicIp = 'N/A';
    }

    await supabase.from('system_metrics').insert({
      cpu_usage: parseFloat(cpu.currentLoad.toFixed(2)),
      ram_usage: parseFloat(((mem.used / mem.total) * 100).toFixed(2)),
      ram_total: Math.round(mem.total / 1024 / 1024),
      ram_used: Math.round(mem.used / 1024 / 1024),
      disk_usage: parseFloat(diskUsagePercent.toFixed(2)),
      disk_total: Math.round(primaryDisk.size / 1024 / 1024 / 1024),
      disk_used: Math.round(primaryDisk.used / 1024 / 1024 / 1024),
      cpu_temp: temp.main || 0,
      network_ip_local: activeInterface?.ip4 || 'N/A',
      network_ip_public: publicIp
    });

    await cleanOldMetrics();
  } catch (error) {
    console.error('Error collecting metrics:', error);
  }
}

async function cleanOldMetrics(): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('system_metrics')
      .delete()
      .lt('recorded_at', sevenDaysAgo);
  } catch (error) {
    console.error('Error cleaning old metrics:', error);
  }
}

async function checkAlertThresholds(): Promise<void> {
  try {
    const { data: thresholds } = await supabase
      .from('alert_thresholds')
      .select('*')
      .eq('enabled', true);

    if (!thresholds || thresholds.length === 0) {
      return;
    }

    const [cpu, mem, disk, temp] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.cpuTemperature()
    ]);

    const primaryDisk = disk[0] || { size: 1, used: 0 };

    const currentMetrics: Record<string, number> = {
      cpu: parseFloat(cpu.currentLoad.toFixed(2)),
      ram: parseFloat(((mem.used / mem.total) * 100).toFixed(2)),
      disk: parseFloat(((primaryDisk.used / primaryDisk.size) * 100).toFixed(2)),
      temp: temp.main || 0
    };

    for (const threshold of thresholds) {
      const currentValue = currentMetrics[threshold.metric_name];
      if (currentValue === undefined) continue;

      let exceeded = false;
      switch (threshold.comparison) {
        case 'gt':
          exceeded = currentValue > threshold.threshold_value;
          break;
        case 'lt':
          exceeded = currentValue < threshold.threshold_value;
          break;
        case 'gte':
          exceeded = currentValue >= threshold.threshold_value;
          break;
        case 'lte':
          exceeded = currentValue <= threshold.threshold_value;
          break;
      }

      if (exceeded) {
        const message = `Alert: ${threshold.metric_name.toUpperCase()} is ${currentValue.toFixed(2)}% (threshold: ${threshold.threshold_value}%)`;

        await logEvent('alert', 'warning', message, {
          metric: threshold.metric_name,
          value: currentValue,
          threshold: threshold.threshold_value
        });

        if (threshold.notify_pushover) {
          await sendPushoverNotification(
            'System Alert',
            message,
            'negative',
            'high'
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking alert thresholds:', error);
  }
}
