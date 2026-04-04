import { Database } from 'duckdb';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DUCKDB_PATH || path.join(__dirname, '../../data/dashboard.db');

let db: Database | null = null;

export const getDatabase = async (): Promise<Database> => {
  if (db) return db;

  return new Promise((resolve, reject) => {
    db = new Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open database:', err);
        reject(err);
        return;
      }
      console.log(`DuckDB initialized at: ${dbPath}`);
      resolve(db!);
    });
  });
};

export const initializeDatabase = async () => {
  const database = await getDatabase();

  return new Promise<void>((resolve, reject) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        password VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS docker_backups (
        id VARCHAR PRIMARY KEY,
        container_name VARCHAR NOT NULL,
        backup_path VARCHAR NOT NULL,
        size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR DEFAULT 'completed'
      );

      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        key VARCHAR NOT NULL,
        value VARCHAR,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key)
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id VARCHAR PRIMARY KEY,
        cpu_usage DOUBLE,
        memory_usage DOUBLE,
        disk_usage DOUBLE,
        temperature DOUBLE,
        uptime BIGINT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        message VARCHAR NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR PRIMARY KEY,
        filename VARCHAR NOT NULL,
        file_type VARCHAR NOT NULL,
        file_size BIGINT NOT NULL,
        storage_path VARCHAR NOT NULL,
        storage_location VARCHAR NOT NULL,
        mime_type VARCHAR NOT NULL,
        uploaded_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `, (err) => {
      if (err) {
        console.error('Failed to initialize database schema:', err);
        reject(err);
        return;
      }
      console.log('Database schema initialized successfully');

      database.get('SELECT COUNT(*) as count FROM users', async (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          const adminId = randomUUID();
          const adminPassword = await bcrypt.hash('admin123', 10);

          database.run(
            'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
            adminId,
            'admin@dashboard.local',
            adminPassword,
            'Admin User',
            (insertErr) => {
              if (insertErr) {
                console.error('Failed to create default admin user:', insertErr);
              } else {
                console.log('Default admin user created: admin@dashboard.local / admin123');
              }
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
};

export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    database.all(sql, ...params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

export const run = async (sql: string, params: any[] = []): Promise<void> => {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    database.run(sql, ...params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

export const get = async (sql: string, params: any[] = []): Promise<any> => {
  const database = await getDatabase();

  return new Promise((resolve, reject) => {
    database.get(sql, ...params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};
