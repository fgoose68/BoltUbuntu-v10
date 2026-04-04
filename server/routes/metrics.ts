import express from 'express';
import si from 'systeminformation';
import { query, run } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';

export const metricsRouter = express.Router();

metricsRouter.get('/current', async (req: AuthRequest, res) => {
  try {
    const [cpu, mem, disk, temp, network] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.cpuTemperature(),
      si.networkInterfaces()
    ]);

    const primaryDisk = disk[0] || { size: 0, used: 0 };
    const diskUsagePercent = (primaryDisk.used / primaryDisk.size) * 100;

    const activeInterface = network.find(iface => iface.ip4 && !iface.internal) || network[0];

    let publicIp = '';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      publicIp = ipData.ip;
    } catch {
      publicIp = 'N/A';
    }

    const metrics = {
      cpu: {
        usage: parseFloat(cpu.currentLoad.toFixed(2)),
        cores: cpu.cpus.length
      },
      ram: {
        total: Math.round(mem.total / 1024 / 1024),
        used: Math.round(mem.used / 1024 / 1024),
        free: Math.round(mem.free / 1024 / 1024),
        usage: parseFloat(((mem.used / mem.total) * 100).toFixed(2))
      },
      disk: {
        total: Math.round(primaryDisk.size / 1024 / 1024 / 1024),
        used: Math.round(primaryDisk.used / 1024 / 1024 / 1024),
        free: Math.round((primaryDisk.size - primaryDisk.used) / 1024 / 1024 / 1024),
        usage: parseFloat(diskUsagePercent.toFixed(2))
      },
      temperature: {
        cpu: temp.main || 0
      },
      network: {
        ipLocal: activeInterface?.ip4 || 'N/A',
        ipPublic: publicIp,
        interface: activeInterface?.iface || 'N/A'
      }
    };

    const metricId = randomUUID();
    run(
      'INSERT INTO metrics (id, cpu_usage, memory_usage, disk_usage, temperature, uptime) VALUES (?, ?, ?, ?, ?, ?)',
      [metricId, metrics.cpu.usage, metrics.ram.usage, metrics.disk.usage, metrics.temperature.cpu, 0]
    );

    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

metricsRouter.get('/history', async (req: AuthRequest, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = query(
      'SELECT * FROM metrics WHERE timestamp >= datetime("now", ?) ORDER BY timestamp ASC',
      [`-${hours} hours`]
    );

    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    res.status(500).json({ error: 'Failed to fetch metrics history' });
  }
});

metricsRouter.get('/alerts', async (req: AuthRequest, res) => {
  try {
    const thresholds = query('SELECT * FROM alert_thresholds ORDER BY metric_name ASC');
    res.json({ thresholds });
  } catch (error) {
    console.error('Error fetching alert thresholds:', error);
    res.status(500).json({ error: 'Failed to fetch alert thresholds' });
  }
});

metricsRouter.put('/alerts/:alertId', async (req: AuthRequest, res) => {
  try {
    const { alertId } = req.params;
    const { threshold_value, enabled } = req.body;

    if (threshold_value === undefined && enabled === undefined) {
      return res.status(400).json({ error: 'At least one field (threshold_value or enabled) is required' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (threshold_value !== undefined) {
      updates.push('threshold_value = ?');
      values.push(threshold_value);
    }

    if (enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(enabled ? 1 : 0);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(alertId);

    run(
      `UPDATE alert_thresholds SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Alert threshold updated successfully' });
  } catch (error) {
    console.error('Error updating alert threshold:', error);
    res.status(500).json({ error: 'Failed to update alert threshold' });
  }
});
