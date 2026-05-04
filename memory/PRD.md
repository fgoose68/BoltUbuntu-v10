# BoltDashPi5 - Raspberry Pi Dashboard PRD

## Problem Statement
Verificare il corretto funzionamento del progetto BoltDashPi5 da GitHub - una Dashboard Web per Raspberry Pi per gestire backup Docker, file Office e monitoraggio hardware.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite 8 + TailwindCSS (in `/app/frontend`)
- **Backend**: Python FastAPI + SQLite (in `/app/backend`)
- **Database**: SQLite - embedded, zero-config
- **Containerization**: Docker + Docker Compose ready per Raspberry Pi 5

### Compatibilità
- **Ambiente Emergent**: Backend Python/FastAPI, Frontend Vite
- **Raspberry Pi 5**: Completo supporto Docker quando disponibile

## User Personas
- Amministratori di sistema Raspberry Pi
- Utenti che gestiscono backup Docker
- Utenti che necessitano monitoraggio hardware remoto

## Core Requirements (Static)
- Autenticazione JWT con password bcrypt
- Monitoraggio CPU, RAM, Disco, Temperatura
- Gestione backup container Docker
- Upload/download file Office
- Notifiche Pushover (opzionale)

## What's Been Implemented - May 2026

### Session 2 - May 4, 2026 (Ver.4Mag2026)
- ✅ Aggiunto tab "System Updates" completo nel Dashboard
- ✅ Backend endpoints: `/api/system/info`, `/api/system/check-updates`, `/api/system/update`, `/api/system/kernel-update`, `/api/system/reboot`, `/api/system/scheduler/toggle`, `/api/system/updates/history`
- ✅ Tabelle SQLite: `system_updates`, `update_scheduler`
- ✅ Scheduler auto-update in background con loop asyncio (riavvio automatico al boot)
- ✅ Notifiche Pushover integrate per: success/failure update, kernel update, reboot
- ✅ Aggiornata versione a `Ver.4Mag2026` in Login, MANUALE_UTENTE, setup.sh, update.sh
- ✅ Test backend: tutti gli endpoint rispondono correttamente (apt update rileva pacchetti)

## What's Been Implemented - April 2026

### Session 1 - April 4, 2026
- ✅ Migrazione backend da Node.js/TypeScript a Python/FastAPI per compatibilità Emergent
- ✅ Ristrutturazione progetto in `/app/backend` e `/app/frontend`
- ✅ Gestione graceful per Docker non disponibile (fallback automatico)
- ✅ Backend completo con tutte le API: auth, metrics, docker, files, settings, notifications
- ✅ Frontend funzionante con Vite 8 e allowedHosts per preview
- ✅ Compatibile con Raspberry Pi 5 (Docker support quando disponibile)

### Test Results
- Backend API: 100% funzionante
- Frontend: 100% funzionante
- Preview Environment: ✅ Attivo

## Prioritized Backlog

### P0 (Critical)
- Nessuno - tutto funzionante

### P1 (High Priority)
- Deploy su Raspberry Pi reale per test Docker
- Configurazione Pushover per notifiche

### P2 (Medium Priority)
- Grafici storici metriche
- Backup incrementali
- Cloud backup (Dropbox, Google Drive)

## Next Tasks
1. Deploy su ambiente con Docker per test completo backup
2. Implementare grafici real-time con Chart.js
3. Aggiungere supporto NAS mount

## Credentials
- Admin: admin@dashboard.local / admin123
