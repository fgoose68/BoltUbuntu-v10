import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { query, run, get } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { logEvent } from '../services/logger';
import { sendPushoverNotification } from '../services/pushover';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
export const dockerRouter = express.Router();

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

const parseDockerPs = (output: string): Container[] => {
  const lines = output.trim().split('\n');
  return lines.map(line => {
    const parts = line.split('|||');
    return {
      id: parts[0],
      name: parts[1],
      image: parts[2],
      status: parts[3],
      state: parts[4]
    };
  });
};

dockerRouter.get('/containers', async (req: AuthRequest, res) => {
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.ID}}|||{{.Names}}|||{{.Image}}|||{{.Status}}|||{{.State}}"'
    );

    const containers = parseDockerPs(stdout);
    res.json({ containers });
  } catch (error) {
    console.error('Error fetching containers:', error);
    res.status(500).json({ error: 'Failed to fetch containers' });
  }
});

dockerRouter.post('/backup/:containerId', async (req: AuthRequest, res) => {
  try {
    const { containerId } = req.params;
    const { destination = 'local', backupType = 'export', containerName = 'unknown' } = req.body;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = destination === 'nas'
      ? `/mnt/nas/backups/${containerName}_${timestamp}.tar`
      : `/backups/${containerName}_${timestamp}.tar`;

    const backupId = randomUUID();

    run(
      'INSERT INTO docker_backups (id, container_name, backup_path, status) VALUES (?, ?, ?, ?)',
      [backupId, containerName, backupPath, 'pending']
    );

    performBackup(backupId, containerId, backupPath, backupType, containerName, req.userId!);

    res.json({ message: 'Backup started', backupId });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Failed to start backup' });
  }
});

async function performBackup(
  backupId: string,
  containerId: string,
  backupPath: string,
  backupType: string,
  containerName: string,
  userId: string
) {
  try {
    run('UPDATE docker_backups SET status = ? WHERE id = ?', ['running', backupId]);

    logEvent('backup', 'info', `Backup started for container ${containerId}`, { backupId }, userId);

    let command = '';
    if (backupType === 'export') {
      command = `docker export ${containerId} -o ${backupPath}`;
    } else {
      command = `docker commit ${containerId} backup_${containerId} && docker save backup_${containerId} -o ${backupPath}`;
    }

    await execAsync(command);

    const { stdout: sizeOut } = await execAsync(`stat -f%z "${backupPath}" 2>/dev/null || stat -c%s "${backupPath}" 2>/dev/null || echo 0`);
    const fileSize = parseInt(sizeOut.trim()) || 0;

    run(
      'UPDATE docker_backups SET status = ?, size = ? WHERE id = ?',
      ['completed', fileSize, backupId]
    );

    logEvent('backup', 'info', `Backup completed for container ${containerId}`, {
      backupId,
      fileSize,
      path: backupPath
    }, userId);

    await sendPushoverNotification(
      'Backup Completed',
      `Container ${containerName} backup completed successfully. Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
      'positive'
    );
  } catch (error: any) {
    console.error('Backup execution error:', error);

    run('UPDATE docker_backups SET status = ? WHERE id = ?', ['failed', backupId]);

    logEvent('backup', 'error', `Backup failed for container ${containerId}`, {
      backupId,
      error: error.message
    }, userId);

    await sendPushoverNotification(
      'Backup Failed',
      `Container ${containerName} backup failed: ${error.message}`,
      'negative'
    );
  }
}

dockerRouter.get('/backups', async (req: AuthRequest, res) => {
  try {
    const backups = query(
      'SELECT * FROM docker_backups ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ backups });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

dockerRouter.get('/containers/status', async (req: AuthRequest, res) => {
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.ID}}|||{{.Names}}|||{{.Image}}|||{{.State}}|||{{.Status}}|||{{.CreatedAt}}|||{{.Ports}}"'
    );

    const lines = stdout.trim().split('\n').filter(line => line);
    const containers = lines.map(line => {
      const parts = line.split('|||');
      return {
        id: parts[0] || '',
        name: parts[1] || '',
        image: parts[2] || '',
        state: parts[3] || '',
        status: parts[4] || '',
        created: parts[5] || '',
        ports: parts[6] ? parts[6].split(',').map(p => p.trim()).filter(p => p) : []
      };
    });

    res.json({ containers });
  } catch (error) {
    console.error('Error fetching container status:', error);
    res.status(500).json({ error: 'Failed to fetch container status' });
  }
});

dockerRouter.post('/containers/:containerId/restart', async (req: AuthRequest, res) => {
  try {
    const { containerId } = req.params;

    await execAsync(`docker restart ${containerId}`);

    logEvent('docker', 'info', `Container ${containerId} restarted`, { containerId }, req.userId!);

    res.json({ message: 'Container restarted successfully' });
  } catch (error: any) {
    console.error('Error restarting container:', error);
    logEvent('docker', 'error', `Failed to restart container ${req.params.containerId}`, {
      error: error.message
    }, req.userId!);
    res.status(500).json({ error: 'Failed to restart container' });
  }
});

dockerRouter.post('/containers/:containerId/pause', async (req: AuthRequest, res) => {
  try {
    const { containerId } = req.params;

    await execAsync(`docker pause ${containerId}`);

    logEvent('docker', 'info', `Container ${containerId} paused`, { containerId }, req.userId!);

    res.json({ message: 'Container paused successfully' });
  } catch (error: any) {
    console.error('Error pausing container:', error);
    logEvent('docker', 'error', `Failed to pause container ${req.params.containerId}`, {
      error: error.message
    }, req.userId!);
    res.status(500).json({ error: 'Failed to pause container' });
  }
});

dockerRouter.post('/containers/:containerId/unpause', async (req: AuthRequest, res) => {
  try {
    const { containerId } = req.params;

    await execAsync(`docker unpause ${containerId}`);

    logEvent('docker', 'info', `Container ${containerId} unpaused`, { containerId }, req.userId!);

    res.json({ message: 'Container unpaused successfully' });
  } catch (error: any) {
    console.error('Error unpausing container:', error);
    logEvent('docker', 'error', `Failed to unpause container ${req.params.containerId}`, {
      error: error.message
    }, req.userId!);
    res.status(500).json({ error: 'Failed to unpause container' });
  }
});

dockerRouter.post('/containers/:containerId/start', async (req: AuthRequest, res) => {
  try {
    const { containerId } = req.params;

    await execAsync(`docker start ${containerId}`);

    logEvent('docker', 'info', `Container ${containerId} started`, { containerId }, req.userId!);

    res.json({ message: 'Container started successfully' });
  } catch (error: any) {
    console.error('Error starting container:', error);
    logEvent('docker', 'error', `Failed to start container ${req.params.containerId}`, {
      error: error.message
    }, req.userId!);
    res.status(500).json({ error: 'Failed to start container' });
  }
});

dockerRouter.post('/containers/:containerId/stop', async (req: AuthRequest, res) => {
  try {
    const { containerId } = req.params;

    await execAsync(`docker stop ${containerId}`);

    logEvent('docker', 'info', `Container ${containerId} stopped`, { containerId }, req.userId!);

    res.json({ message: 'Container stopped successfully' });
  } catch (error: any) {
    console.error('Error stopping container:', error);
    logEvent('docker', 'error', `Failed to stop container ${req.params.containerId}`, {
      error: error.message
    }, req.userId!);
    res.status(500).json({ error: 'Failed to stop container' });
  }
});
