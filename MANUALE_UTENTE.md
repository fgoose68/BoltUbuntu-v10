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

### 7.1 Container non si avvia
```bash
# Verifica i log
docker logs BoltDashPi5-backend

# Ricostruisci
docker-compose down
docker-compose up -d --build
```

### 7.2 Errore database
```bash
# Ricrea il database
rm -f data/dashboard.db
docker-compose restart backend
```

### 7.3 Docker non disponibile
```bash
# Verifica gruppo docker
cat /etc/group | grep docker

# Aggiorna docker-compose.yml con il GID corretto
# group_add: - "GID"
```

### 7.4 Errore "table has no column named..."

Questo errore indica che il database ha uno schema vecchio incompatibile con il codice aggiornato.

**Soluzione:**
```bash
cd ~/BoltDashPi5

# Ferma i container
docker-compose down

# Elimina il database (ATTENZIONE: perderai i dati!)
rm -f data/dashboard.db

# Riavvia - il database verrà ricreato
docker-compose up -d
```

### 7.5 Errore "Blocked request. This host is not allowed"

Questo errore appare quando Vite blocca richieste da host non autorizzati.

**Causa:** La configurazione `allowedHosts` in `vite.config.ts` non è corretta.

**Soluzione:**
```bash
# Modifica vite.config.ts
sed -i "s/allowedHosts: 'all'/allowedHosts: true/g" frontend/vite.config.ts

# Riavvia il frontend
docker-compose restart frontend
```

**Nota:** In Vite 5.x usare `allowedHosts: true` (boolean), NON `allowedHosts: 'all'` (stringa).

### 7.6 Conflitto di Porte

Se la porta 3050 o 8001 è già occupata da un'altra applicazione:

**Verifica porte in uso:**
```bash
sudo netstat -tlnp | grep -E "3050|8001"
# oppure
sudo lsof -i :3050
sudo lsof -i :8001
```

**Cambia porta nel docker-compose.yml:**
```bash
# Esempio: cambiare frontend da 3050 a 3060
sed -i 's/3050:3050/3060:3050/g' docker-compose.yml

# Riavvia
docker-compose down
docker-compose up -d
```

### 7.7 Configurazione Diversa per Ambienti

⚠️ **IMPORTANTE:** Questo progetto può girare su ambienti diversi con configurazioni diverse.

| Impostazione | Emergent Preview | Raspberry Pi |
|--------------|------------------|--------------|
| Porta Frontend | 3000 | 3050 |
| Porta Backend | 8001 | 8001 |
| allowedHosts | true | true |
| proxy target | localhost:8001 | backend:8001 |
| container_name frontend | - | BoltDashPi5-frontend |
| container_name backend | - | BoltDashPi5-backend |

**Per passare da un ambiente all'altro:**

```bash
# Per Raspberry Pi (porta 3050)
sed -i 's/port: 3000/port: 3050/g' frontend/vite.config.ts
sed -i 's/port 3000/port 3050/g' frontend/package.json

# Per Emergent Preview (porta 3000)
sed -i 's/port: 3050/port: 3000/g' frontend/vite.config.ts
sed -i 's/port 3050/port 3000/g' frontend/package.json
```

### 7.8 Backup non funziona - "Request failed"

**Possibili cause:**
1. Docker non accessibile dal container
2. Colonne mancanti nel database

**Verifica Docker:**
```bash
# Testa se Docker funziona nel container
docker exec BoltDashPi5-backend docker ps
```

**Se Docker non funziona, verifica il GID:**
```bash
# Trova il GID del gruppo docker
cat /etc/group | grep docker
# Output: docker:x:991:pi  (il numero 991 è il GID)

# Aggiorna docker-compose.yml
sed -i 's/group_add:/group_add:\n      - "991"/g' docker-compose.yml
# Oppure modifica manualmente la sezione group_add
```

**Se errore database, ricrea:**
```bash
rm -f data/dashboard.db
docker-compose restart backend
```

### 7.9 Frontend mostra pagina bianca

**Verifica log:**
```bash
docker logs BoltDashPi5-frontend --tail 30
```

**Cause comuni:**
1. Errore JavaScript nei componenti
2. File corrotti
3. Dipendenze mancanti

**Soluzione:**
```bash
# Ricostruisci da zero
docker-compose down
docker rmi boltdashpi5-frontend
docker-compose build --no-cache frontend
docker-compose up -d
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
