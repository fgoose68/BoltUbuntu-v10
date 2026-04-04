# Architettura del Sistema

## Overview

La Raspberry Pi Dashboard è un'applicazione full-stack containerizzata che permette di gestire backup Docker, file Office e monitorare l'hardware del Raspberry Pi attraverso un'interfaccia web moderna.

## Diagramma Architetturale

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│                    (Browser Web)                            │
└───────────────┬─────────────────────────────────────────────┘
                │ HTTPS/HTTP
                ▼
┌───────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                    │
│                         Port 80/443                           │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│                  DASHBOARD CONTAINER                          │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │   Frontend (Vite)   │    │  Backend (Express)  │         │
│  │  React + TypeScript │◄───┤   Node.js + API     │         │
│  └─────────────────────┘    └──────────┬──────────┘         │
│                                         │                     │
│                                         ▼                     │
│                            ┌────────────────────┐            │
│                            │   Services Layer   │            │
│                            ├────────────────────┤            │
│                            │ • Metrics Collector│            │
│                            │ • Backup Scheduler │            │
│                            │ • Pushover Client  │            │
│                            │ • Logger           │            │
│                            └────────────────────┘            │
└────────┬────────────────────────────┬───────────────────┬────┘
         │                            │                   │
         │                            │                   │
         ▼                            ▼                   ▼
┌─────────────────┐      ┌─────────────────┐   ┌─────────────────┐
│ Docker Socket   │      │  DuckDB         │   │  File System    │
│  (Container     │      │  (Embedded SQL) │   │  • /backups     │
│   Management)   │      │  • dashboard.db │   │  • /uploads     │
└─────────────────┘      └─────────────────┘   │  • /mnt/nas     │
                                                └─────────────────┘
```

## Componenti Principali

### 1. Frontend (React + TypeScript)

**Tecnologie:**
- React 19 con TypeScript
- Vite (bundler)
- TailwindCSS (styling)
- React Router (routing)
- Context API (state management)

**Struttura:**
```
src/
├── components/          # Componenti UI riutilizzabili
│   ├── SystemMetrics.tsx
│   ├── DockerBackups.tsx
│   ├── FileManager.tsx
│   └── Settings.tsx
├── contexts/           # React Contexts
│   └── AuthContext.tsx
├── lib/                # Utilità
│   └── api.ts         # API client
├── pages/             # Pagine dell'app
│   ├── Login.tsx
│   └── Dashboard.tsx
└── App.tsx            # Entry point
```

**Responsabilità:**
- Interfaccia utente responsive
- Gestione stato autenticazione
- Comunicazione con backend via API REST
- Visualizzazione dati in tempo reale
- Upload/download file

### 2. Backend (Express + TypeScript)

**Tecnologie:**
- Express.js
- TypeScript
- JWT per autenticazione
- Multer per upload file
- systeminformation per metriche
- node-cron per scheduling

**Struttura:**
```
server/
├── config/
│   └── database.ts          # Client DuckDB
├── middleware/
│   └── auth.ts              # JWT middleware
├── routes/
│   ├── auth.ts              # Autenticazione
│   ├── docker.ts            # Container e backup
│   ├── files.ts             # File Office
│   ├── metrics.ts           # Metriche sistema
│   ├── notifications.ts     # Pushover
│   └── settings.ts          # Configurazioni
├── services/
│   ├── backup-scheduler.ts  # Scheduler backup
│   ├── metrics-collector.ts # Raccolta metriche
│   ├── pushover.ts          # Client Pushover
│   └── logger.ts            # Event logging
└── index.ts                 # Entry point
```

**Responsabilità:**
- API REST endpoints
- Autenticazione e autorizzazione
- Gestione Docker containers
- Backup automatici e manuali
- Raccolta metriche sistema
- Notifiche push
- File management

### 3. Database (DuckDB)

**Caratteristiche:**
- Database embedded SQL single-file
- Ottimizzato per analytics e query veloci
- Zero configurazione esterna
- Footprint minimo di memoria
- Perfetto per Raspberry Pi

**Schema Principali:**

```sql
users                    # Utenti autenticati
├── id (VARCHAR)
├── email (VARCHAR)
├── password (VARCHAR)  # bcrypt hash
├── name (VARCHAR)
└── created_at (TIMESTAMP)

docker_backups          # Backup container
├── id (VARCHAR)
├── container_name (VARCHAR)
├── backup_path (VARCHAR)
├── size (BIGINT)
├── status (VARCHAR)
└── created_at (TIMESTAMP)

backups                  # Backup eseguiti
├── id (uuid)
├── container_id (uuid)
├── backup_type (text)
├── file_path (text)
├── file_size (bigint)
├── destination (text)
└── status (text)

backup_schedules         # Pianificazioni
├── id (uuid)
├── container_id (uuid)
├── cron_expression (text)
└── enabled (boolean)

office_files            # File caricati
├── id (uuid)
├── filename (text)
├── file_size (bigint)
├── storage_path (text)
└── storage_location (text)

system_metrics          # Metriche hardware
├── id (uuid)
├── cpu_usage (numeric)
├── ram_usage (numeric)
├── disk_usage (numeric)
└── cpu_temp (numeric)

event_logs             # Log eventi
├── id (uuid)
├── event_type (text)
├── severity (text)
├── message (text)
└── details (jsonb)
```

**Sicurezza:**
- Row Level Security (RLS) attivo su tutte le tabelle
- Policy restrittive basate su autenticazione
- Password hashate con bcrypt
- Token JWT con scadenza

### 4. Servizi di Background

#### Metrics Collector
- Esecuzione: ogni minuto (cron)
- Raccolta: CPU, RAM, Disco, Temperatura, Rete
- Storage: database Supabase
- Retention: 7 giorni
- Alert: verifica soglie configurate

#### Backup Scheduler
- Esecuzione: ogni 5 minuti (carica pianificazioni)
- Verifica: modalità maintenance
- Esecuzione: backup pianificati
- Notifica: Pushover al completamento

#### Pushover Notifier
- Backup completati/falliti
- File caricati/eliminati
- Alert hardware superati
- Priorità configurabili

### 5. File System

**Struttura Directory:**
```
/
├── backups/              # Backup locali
│   └── container_*.tar
├── uploads/              # File caricati
│   └── office/
│       └── *.docx, *.xlsx, etc.
└── mnt/
    └── nas/              # Mount point NAS
        ├── backups/
        └── office/
```

### 6. Docker Architecture

**Container:**
- `dashboard`: applicazione principale
- `nginx`: reverse proxy

**Volumes:**
- `./backups:/backups` - backup locali persistenti
- `./uploads:/uploads` - file caricati persistenti
- `/var/run/docker.sock:/var/run/docker.sock:ro` - accesso Docker (read-only)
- `nas-mount:/mnt/nas` - mount NAS

**Network:**
- `dashboard-network`: bridge isolato

## Flussi Principali

### 1. Autenticazione

```
User → Login Form → POST /api/auth/login → Verify credentials
                                         → Generate JWT token
                                         → Return user + token
                                         → Store in localStorage
                                         → Redirect to Dashboard
```

### 2. Backup Docker Container

```
User → Click "Backup" → POST /api/docker/backup/:id → Create backup record
                                                     → Start async backup
                                                     → docker export
                                                     → Save to /backups or /mnt/nas
                                                     → Update record (size, status)
                                                     → Send Pushover notification
                                                     → Log event
```

### 3. Pianificazione Backup

```
User → Settings → Create Schedule → POST /api/docker/schedules → Store in DB
                                                                → Scheduler picks up
                                                                → Cron executes
                                                                → Backup runs
                                                                → Notification sent
```

### 4. Monitoraggio Hardware

```
Cron (every 1 min) → Collect metrics (systeminformation)
                   → Check alert thresholds
                   → Store in database
                   → Send notifications if threshold exceeded
                   → Clean old metrics (>7 days)

Frontend → Auto-refresh (every 5 sec) → GET /api/metrics/current
                                       → Display in UI
```

### 5. Upload File Office

```
User → Select file → Choose destination → POST /api/files/upload
                                        → multer processes upload
                                        → Save to /uploads or /mnt/nas
                                        → Create file record in DB
                                        → Send Pushover notification
                                        → Return file metadata
```

## Sicurezza

### Livelli di Protezione

1. **Autenticazione**
   - JWT tokens con scadenza 7 giorni
   - Password hashate con bcrypt (10 rounds)
   - Refresh token non implementato (security by design)

2. **Autorizzazione**
   - Middleware JWT su tutte le route protette
   - Row Level Security (RLS) su database
   - Policy basate su `auth.uid()`

3. **Input Validation**
   - Type checking con TypeScript
   - Validazione file upload (tipo, dimensione)
   - Sanitizzazione input SQL (Supabase)

4. **Network**
   - Docker network isolato
   - Docker socket read-only
   - CORS configurato
   - Reverse proxy Nginx

5. **File System**
   - Permessi limitati su directories
   - Path validation per evitare traversal
   - Dimensione massima upload: 50MB

## Performance

### Ottimizzazioni

1. **Database**
   - Indici su colonne frequenti (created_at, status, etc.)
   - Pulizia automatica metriche vecchie
   - Query ottimizzate con select specifici

2. **Frontend**
   - Code splitting con Vite
   - Lazy loading componenti
   - Memoization con React
   - Debouncing su input

3. **Backend**
   - Operazioni async per backup
   - Stream per file upload
   - Caching in-memory per configurazioni
   - Connection pooling Supabase

4. **Docker**
   - Multi-stage build per ridurre dimensione
   - Alpine Linux (immagine leggera)
   - Volume bind per file system

## Scalabilità

### Limitazioni Attuali
- Single instance (no clustering)
- In-memory scheduling (no Redis)
- File system locale/NAS (no S3)

### Future Improvements
- Redis per queue e cache
- S3/Object storage per file
- Load balancer per multiple instances
- Database read replicas
- Container orchestration (Docker Swarm/K8s)

## Monitoring & Logging

### Event Logs
- Tutti gli eventi sono loggati in DB
- Categorie: backup, upload, alert, error, login, system
- Severity: info, warning, error, critical

### System Metrics
- Raccolti ogni minuto
- Storico 7 giorni
- Visualizzati in tempo reale
- Alert configurabili

### Docker Logs
```bash
docker-compose logs -f dashboard
```

## Deploy

### Processo
1. Clone repository
2. Configure `.env`
3. Run setup script
4. Build with Docker Compose
5. Access via browser

### Update
```bash
git pull
docker-compose up -d --build
```

### Rollback
```bash
docker-compose down
git checkout <previous-version>
docker-compose up -d --build
```

## Compatibilità

### Raspberry Pi
- Pi 3, 4, 5 supportati
- Raspberry Pi OS (Debian-based)
- Minimo 2GB RAM raccomandati
- SSD esterno raccomandato

### Browser
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile responsive

### NAS
- Samba/CIFS (Windows shares)
- NFS (Linux/Unix shares)
- Synology, QNAP, TrueNAS compatibili
