import { get } from '../config/database';

type Priority = 'lowest' | 'low' | 'normal' | 'high' | 'emergency';
type Sound = 'positive' | 'negative' | 'neutral';

interface PushoverResult {
  success: boolean;
  error?: string;
}

const soundMap: Record<Sound, string> = {
  positive: 'cashregister',
  negative: 'siren',
  neutral: 'pushover'
};

export async function sendPushoverNotification(
  title: string,
  message: string,
  sound: Sound = 'neutral',
  priority: Priority = 'normal'
): Promise<PushoverResult> {
  try {
    // For now, just log - Pushover config would come from settings table
    console.log(`[PUSHOVER] ${title}: ${message}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send Pushover notification:', error);
    return { success: false, error: String(error) };
  }
}
