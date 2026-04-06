# BoltDashPi5 - Manuale Utente
## Dashboard di Gestione per Raspberry Pi 5
### Versione 6.1 - Aprile 2026

---

## 1. Introduzione

**BoltDashPi5** è una dashboard web completa per la gestione e il monitoraggio del tuo Raspberry Pi 5. Permette di:

- Monitorare le risorse di sistema (CPU, RAM, Disco, Temperatura)
- Gestire i container Docker
- Eseguire backup dei container
- Gestire file Office
- Ricevere notifiche tramite Pushover

---

## 2. Requisiti di Sistema

| Componente | Requisito |
|------------|-----------|
| Hardware | Raspberry Pi 5 |
| Sistema Operativo | Raspberry Pi OS (64-bit) |
| Docker | Versione 20+ |
| Docker Compose | Versione 2+ |
| Porta Backend | 8001 |
| Porta Frontend | 3050 |

---

## 3. Installazione

```bash
# Clona il repository
git clone https://github.com/USERNAME/BoltDashPi5.git
cd BoltDashPi5

# Esegui lo script di setup
chmod +x setup.sh
./setup.sh
```

**Accesso alla Dashboard:**
```
http://IP_RASPBERRY:3050
```

**Credenziali di default:**
- Email: `admin@dashboard.local`
- Password: `admin123`

---

## 4. Funzionalità Principali

### 4.1 System Monitor

Monitora in tempo reale le risorse del sistema:

| Metrica | Descrizione |
|---------|-------------|
| **CPU Usage** | Percentuale di utilizzo della CPU |
| **RAM** | Memoria utilizzata / totale (in GB) |
| **Disk Space** | Spazio disco utilizzato / totale (in GB) |
| **Temperature** | Temperatura della CPU in °C |
| **Network** | IP locale e pubblico |

I dati vengono aggiornati automaticamente ogni pochi secondi.

---

### 4.2 Docker Backups

Gestione completa dei backup dei container Docker.

**Funzionalità:**
- ✅ Visualizzazione di tutti i container Docker
- ✅ Backup su storage locale (`~/BoltDashPi5/backups/`)
- ✅ Backup su NAS (`/mnt/nas/backups/`)
- ✅ Eliminazione dei backup non più necessari
- ✅ Visualizzazione stato backup (running, completed, failed)
- ✅ Informazioni su dimensione e data creazione

**Come eseguire un backup:**
1. Vai alla sezione "Docker Backups"
2. Trova il container da backuppare
3. Clicca "Backup (Local)" o "Backup (NAS)"
4. Attendi il completamento

**Come eliminare un backup:**
1. Vai alla sezione "Recent Backups"
2. Trova il backup da eliminare
3. Clicca il pulsante rosso "Delete"
4. Conferma l'eliminazione

---

### 4.3 Docker Containers

Monitora e controlla lo stato dei container Docker.

**Informazioni visualizzate:**
- Nome del container
- Immagine Docker
- Stato (running, exited, paused)
- Porte esposte
- Data di creazione

**Azioni disponibili:**
- Start / Stop container
- Restart container
- Pause / Unpause container

---

### 4.4 File Manager

Gestione dei file Office sul Raspberry Pi.

**Formati supportati:**
- 📄 Word: `.docx`, `.doc`
- 📊 Excel: `.xlsx`, `.xls`
- 📽️ PowerPoint: `.pptx`, `.ppt`
- 📕 PDF: `.pdf`

**Funzionalità:**
- Upload file su storage locale o NAS
- Download file
- Eliminazione file
- Visualizzazione informazioni (dimensione, data upload)

**Percorsi di storage:**
- **Local:** `~/BoltDashPi5/uploads/`
- **NAS:** `/mnt/nas/office/`

---

### 4.5 Settings

Configurazione dell'applicazione.

**Notifiche Pushover:**
- Configura User Key e API Token
- Abilita/disabilita notifiche
- Invia notifica di test

**Alert Thresholds:**
- Imposta soglie di allarme per CPU, RAM, Disco, Temperatura
- Ricevi notifiche quando le soglie vengono superate

**Event Logs:**
- Visualizza cronologia eventi
- Filtra per tipo di evento
- Monitora backup, upload, login, errori

---

## 5. Architettura Tecnica

```
BoltDashPi5/
├── backend/              # API Python FastAPI
│   ├── server.py         # Server principale
│   ├── requirements.txt  # Dipendenze Python
│   └── Dockerfile
├── frontend/             # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/   # Componenti React
│   │   ├── pages/        # Pagine
│   │   ├── lib/          # API client
│   │   └── contexts/     # Context (Auth, Theme)
│   └── Dockerfile
├── data/                 # Database SQLite
├── backups/              # Backup dei container
├── uploads/              # File caricati
├── docker-compose.yml    # Configurazione Docker
└── setup.sh              # Script di installazione
```

**Container Docker:**
| Container | Porta | Descrizione |
|-----------|-------|-------------|
| BoltDashPi5-backend | 8001 | API REST FastAPI |
| BoltDashPi5-frontend | 3050 | Interfaccia Web React |

---

## 6. Comandi Utili

```bash
# Avvia i servizi
docker-compose up -d

# Ferma i servizi
docker-compose down

# Visualizza log
docker-compose logs -f

# Log solo backend
docker logs BoltDashPi5-backend --tail 50

# Log solo frontend
docker logs BoltDashPi5-frontend --tail 50

# Riavvia i servizi
docker-compose restart

# Ricostruisci dopo modifiche
docker-compose up -d --build

# Stato dei container
docker-compose ps
```

---

## 7. Risoluzione Problemi

### Container non si avvia
```bash
# Verifica i log
docker logs BoltDashPi5-backend

# Ricostruisci
docker-compose down
docker-compose up -d --build
```

### Errore database
```bash
# Ricrea il database
rm -f data/dashboard.db
docker-compose restart backend
```

### Docker non disponibile
```bash
# Verifica gruppo docker
cat /etc/group | grep docker

# Aggiorna docker-compose.yml con il GID corretto
# group_add: - "GID"
```

---

## 8. Sicurezza

**Raccomandazioni:**
1. Cambia la password di default dopo il primo accesso
2. Modifica il `JWT_SECRET` nel docker-compose.yml
3. Configura un reverse proxy con HTTPS per accesso esterno
4. Limita l'accesso alla rete locale se non necessario

---

## 9. Note per Sviluppatori

### Modifiche su Raspberry Pi

Quando si lavora direttamente sul Raspberry Pi, è più efficiente utilizzare comandi diretti invece di passare per Git:

```bash
# Modificare testo in un file
sed -i 's/vecchio_testo/nuovo_testo/g' file.txt

# Creare o sovrascrivere un file
cat > file.txt << 'EOF'
contenuto del file
EOF

# Aggiungere una riga a un file
echo "nuova riga" >> file.txt

# Modificare la versione
sed -i 's/Ver.X.X/Ver.Y.Y/g' frontend/src/pages/Login.tsx

# Rinominare container
sed -i 's/old-name/new-name/g' docker-compose.yml
```

**Vantaggi di questa procedura:**
- ⚡ **Più veloce** - modifiche immediate senza attendere sync Git
- ✅ **Più affidabile** - nessun problema di merge o conflitti
- 🎯 **Più pratica** - un solo copia-incolla nel terminale
- 📋 **Tracciabile** - i comandi possono essere salvati come script

---

## 10. Changelog

| Versione | Data | Modifiche |
|----------|------|-----------|
| 6.1 | Aprile 2026 | Rinominati container, aggiunto pulsante Delete backup |
| 2.4 | Marzo 2026 | Versione iniziale con tutte le funzionalità |

---

## 11. Contatti e Supporto

**Repository:** https://github.com/USERNAME/BoltDashPi5

**Autore:** Sviluppato con assistenza di Emergent AI

---

*Documento generato per BoltDashPi5 Ver.6.1Apr2026*
