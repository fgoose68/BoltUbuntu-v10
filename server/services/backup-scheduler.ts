import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { supabase } from '../config/supabase';
import { sendPushoverNotification } from './pushover';
import { logEvent } from './logger';

const execAsync = promisify(exec);
let schedulerRunning = false;
const activeSchedules = new Map<string, cron.ScheduledTask>();

export function startBackupScheduler(): void {
  if (schedulerRunning) {
    console.log('Backup scheduler already running');
    return;
  }

  cron.schedule('*/5 * * * *', async () => {
    try {
      await loadAndScheduleBackups();
    } catch (error) {
      console.error('Error in backup scheduler:', error);
    }
  });

  schedulerRunning = true;
  loadAndScheduleBackups();
  console.log('Backup scheduler initialized');
}

async function loadAndScheduleBackups(): Promise<void> {
  try {
    const { data: maintenanceMode } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (maintenanceMode?.value === 'true') {
      console.log('Maintenance mode enabled, skipping backup scheduling');
      return;
    }

    const { data: schedules } = await supabase
      .from('backup_schedules')
      .select(`
        *,
        container:docker_containers(*)
      `)
      .eq('enabled', true);

    if (!schedules) return;

    for (const schedule of schedules) {
      const scheduleKey = schedule.id;

      if (activeSchedules.has(scheduleKey)) {
        continue;
      }

      if (cron.validate(schedule.cron_expression)) {
        const task = cron.schedule(schedule.cron_expression, async () => {
          await executeScheduledBackup(schedule);
        });

        activeSchedules.set(scheduleKey, task);
        console.log(`Scheduled backup for container ${schedule.container.name}: ${schedule.cron_expression}`);
      } else {
        console.error(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expression}`);
      }
    }
  } catch (error) {
    console.error('Error loading backup schedules:', error);
  }
}

async function executeScheduledBackup(schedule: any): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = schedule.destination === 'nas'
      ? `/mnt/nas/backups/${schedule.container.name}_${timestamp}.tar`
      : `/backups/${schedule.container.name}_${timestamp}.tar`;

    const { data: backup, error } = await supabase
      .from('backups')
      .insert({
        container_id: schedule.container.id,
        backup_type: schedule.backup_type,
        file_path: backupPath,
        destination: schedule.destination,
        status: 'pending',
        is_scheduled: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating backup record:', error);
      return;
    }

    await supabase
      .from('backup_schedules')
      .update({
        last_run: new Date().toISOString()
      })
      .eq('id', schedule.id);

    await performScheduledBackup(backup.id, schedule.container.container_id, backupPath, schedule.backup_type);
  } catch (error) {
    console.error('Error executing scheduled backup:', error);
  }
}

async function performScheduledBackup(
  backupId: string,
  containerId: string,
  backupPath: string,
  backupType: string
): Promise<void> {
  try {
    await supabase
      .from('backups')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', backupId);

    await logEvent('backup', 'info', `Scheduled backup started for container ${containerId}`, { backupId });

    let command = '';
    if (backupType === 'export') {
      command = `docker export ${containerId} -o ${backupPath}`;
    } else {
      command = `docker commit ${containerId} backup_${containerId} && docker save backup_${containerId} -o ${backupPath}`;
    }

    await execAsync(command);

    const { stdout: sizeOut } = await execAsync(`stat -f%z "${backupPath}" 2>/dev/null || stat -c%s "${backupPath}" 2>/dev/null || echo 0`);
    const fileSize = parseInt(sizeOut.trim()) || 0;

    await supabase
      .from('backups')
      .update({
        status: 'completed',
        file_size: fileSize,
        completed_at: new Date().toISOString()
      })
      .eq('id', backupId);

    await logEvent('backup', 'info', `Scheduled backup completed for container ${containerId}`, {
      backupId,
      fileSize,
      path: backupPath
    });

    await sendPushoverNotification(
      'Scheduled Backup Completed',
      `Container ${containerId} backup completed successfully. Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
      'positive'
    );
  } catch (error: any) {
    console.error('Scheduled backup execution error:', error);

    await supabase
      .from('backups')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', backupId);

    await logEvent('backup', 'error', `Scheduled backup failed for container ${containerId}`, {
      backupId,
      error: error.message
    });

    await sendPushoverNotification(
      'Scheduled Backup Failed',
      `Container ${containerId} backup failed: ${error.message}`,
      'negative',
      'high'
    );
  }
}
