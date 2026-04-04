import { supabase } from '../config/supabase';

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
    const { data: config } = await supabase
      .from('pushover_config')
      .select('*')
      .eq('enabled', true)
      .maybeSingle();

    if (!config) {
      console.log('Pushover not configured or disabled');
      return { success: false, error: 'Pushover not configured' };
    }

    const priorityMap: Record<Priority, number> = {
      lowest: -2,
      low: -1,
      normal: 0,
      high: 1,
      emergency: 2
    };

    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: config.api_token,
        user: config.user_key,
        message,
        title,
        priority: priorityMap[priority],
        sound: soundMap[sound]
      })
    });

    const result = await response.json();

    if (response.ok && result.status === 1) {
      return { success: true };
    } else {
      console.error('Pushover error:', result);
      return { success: false, error: result.errors?.join(', ') || 'Unknown error' };
    }
  } catch (error) {
    console.error('Failed to send Pushover notification:', error);
    return { success: false, error: String(error) };
  }
}
