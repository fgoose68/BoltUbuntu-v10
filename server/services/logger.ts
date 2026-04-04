import { supabase } from '../config/supabase';

type EventType = 'backup' | 'upload' | 'download' | 'alert' | 'error' | 'login' | 'system';
type Severity = 'info' | 'warning' | 'error' | 'critical';

export async function logEvent(
  eventType: EventType,
  severity: Severity,
  message: string,
  details?: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    await supabase.from('event_logs').insert({
      event_type: eventType,
      severity,
      message,
      details: details || null,
      user_id: userId || null
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}
