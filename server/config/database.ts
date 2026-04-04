import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'dashboard.db');

let db: Database.Database | null = null;

export const getDatabase = (): Database.Database => {
  if (db) return db;
  
  db = new Database(dbPath);
  console.log(`SQLite initialized at: ${dbPath}`);
  return db;
};

export const initializeDatabase = async () => {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS docker_backups (
      id TEXT PRIMARY KEY,
      container_name TEXT NOT NULL,
      backup_path TEXT NOT NULL,
      size INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed'
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, key)
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      cpu_usage REAL,
      memory_usage REAL,
      disk_usage REAL,
      temperature REAL,
      uptime INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      storage_location TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database schema initialized successfully');

  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (userCount.count === 0) {
    const adminId = randomUUID();
    const adminPassword = await bcrypt.hash('admin123', 10);

    database.prepare(
      'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)'
    ).run(adminId, 'admin@dashboard.local', adminPassword, 'Admin User');

    console.log('Default admin user created: admin@dashboard.local / admin123');
  }
};

export const query = (sql: string, params: any[] = []): any[] => {
  const database = getDatabase();
  return database.prepare(sql).all(...params);
};

export const run = (sql: string, params: any[] = []): void => {
  const database = getDatabase();
  database.prepare(sql).run(...params);
};

export const get = (sql: string, params: any[] = []): any => {
  const database = getDatabase();
  return database.prepare(sql).get(...params);
};
