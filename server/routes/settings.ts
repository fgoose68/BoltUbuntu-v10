import express from 'express';
import { query, run, get } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { logEvent } from '../services/logger';
import { randomUUID } from 'crypto';

export const settingsRouter = express.Router();

settingsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const settings = query('SELECT * FROM settings WHERE user_id = ? ORDER BY key ASC', [req.userId]);

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

settingsRouter.put('/:key', async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const existing = get('SELECT * FROM settings WHERE user_id = ? AND key = ?', [req.userId, key]);

    if (existing) {
      run(
        'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND key = ?',
        [String(value), req.userId, key]
      );
    } else {
      const settingId = randomUUID();
      run(
        'INSERT INTO settings (id, user_id, key, value) VALUES (?, ?, ?, ?)',
        [settingId, req.userId, key, String(value)]
      );
    }

    logEvent('system', 'info', `Setting updated: ${key}`, {
      key,
      value: String(value)
    }, req.userId!);

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});
