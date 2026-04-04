import { run } from '../config/database';
import { randomUUID } from 'crypto';

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
    const id = randomUUID();
    const detailsJson = details ? JSON.stringify(details) : null;
    
    // Note: We'll store logs in console for now since DuckDB doesn't have a logs table
    console.log(`[${severity.toUpperCase()}] [${eventType}] ${message}`, details || '');
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}
