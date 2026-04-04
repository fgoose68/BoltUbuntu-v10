import express from 'express';
import { query, run, get } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendPushoverNotification } from '../services/pushover';
import { randomUUID } from 'crypto';

export const notificationsRouter = express.Router();

notificationsRouter.post('/test', async (req: AuthRequest, res) => {
  try {
    const result = await sendPushoverNotification(
      'Test Notification',
      'This is a test notification from your Raspberry Pi Dashboard',
      'positive'
    );

    if (result.success) {
      res.json({ message: 'Test notification sent successfully' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

notificationsRouter.get('/list', async (req: AuthRequest, res) => {
  try {
    const notifications = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

notificationsRouter.put('/:notificationId/read', async (req: AuthRequest, res) => {
  try {
    const { notificationId } = req.params;
    await run(
      'UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?',
      [true, notificationId, req.userId]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});
