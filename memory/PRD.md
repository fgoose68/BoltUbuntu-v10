# BoltDashPi5 - Raspberry Pi Dashboard PRD

## Problem Statement
Verificare il corretto funzionamento del progetto BoltDashPi5 da GitHub - una Dashboard Web per Raspberry Pi per gestire backup Docker, file Office e monitoraggio hardware.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (better-sqlite3) - originalmente DuckDB ma migrato per compatibilità
- **Containerization**: Docker + Docker Compose ready

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

## What's Been Implemented - April 2026

### Session 1 - April 4, 2026
- ✅ Migrazione database da DuckDB a better-sqlite3 per compatibilità
- ✅ Risolti import ESM per tutti i servizi backend
- ✅ Aggiunta tabella alert_thresholds al database schema
- ✅ Gestione graceful per Docker non disponibile
- ✅ Test login/autenticazione funzionante
- ✅ Test metriche sistema funzionante
- ✅ Frontend dashboard completa con tabs

### Test Results
- Backend: 84.6% → 100% dopo fix
- Frontend: 95%

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
