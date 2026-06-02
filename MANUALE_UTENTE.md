# BoltDashPi5 - Manuale Utente
## Ubuntu MacMini / Raspberry Pi 5 Dashboard
### Versione 2.1.Giu2026

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

BoltDashPi5 supporta diverse piattaforme **Debian-based** (Raspberry Pi OS, Ubuntu, Debian) sia su architettura **ARM** che **x86/x86_64**.

### 2.1 Piattaforme testate

| Piattaforma | OS | Architettura | Stato |
|------------|-----|-------------|-------|
| Raspberry Pi 5 | Raspberry Pi OS 64-bit | aarch64 (ARM) | ✅ Production |
| Mac mini Intel (6,2 / i7-3720QM) | Ubuntu 22.04 LTS | x86_64 | ✅ Production |
| PC generico | Ubuntu 22.04+ / Debian 12+ | x86_64 / aarch64 | ✅ Compatibile |

### 2.2 Requisiti software

| Componente | Requisito minimo |
|------------|-----------|
| Sistema Operativo | Debian 11+, Ubuntu 20.04+, Raspberry Pi OS Bookworm |
| Docker | Versione 20+ |
| Docker Compose | Versione 1.29+ (o plugin v2) |
| RAM | 1 GB minimo (consigliati 4+ GB per build) |
| Disco | 2 GB liberi |
| Porta Backend | 8001 (configurabile via docker-compose.yml) |
| Porta Frontend | 3050 (configurabile via docker-compose.yml) |

### 2.3 Note specifiche per Mac mini (Intel) + Ubuntu 22.04

- ✅ Container `python:3.11-slim` è **multi-arch**, gira nativamente su x86_64
- ✅ Sensori temperatura Intel (`coretemp`) supportati via `psutil`
- ✅ La RAM viene rilevata e scalata automaticamente (testato con 16 GB)
- ✅ I grafici storici (Andamento Storico) visualizzano CPU/RAM/Disco/Temperatura in tempo reale
- ⚠️ Il GID del gruppo docker su Ubuntu è solitamente `999` (non `991` come Pi OS): viene rilevato automaticamente da `setup.sh`

---

## 3. Installazione

### 3.1 Installazione automatica (consigliata)

```bash
# Clona il repository
git clone https://github.com/USERNAME/BoltDashPi5.git
cd BoltDashPi5

# Esegui lo script di setup (auto-rileva OS, GID Docker, IP)
chmod +x setup.sh
./setup.sh
```

Lo script esegue automaticamente:
1. Crea le cartelle `data/`, `backups/`, `uploads/`
2. Crea `backend/.env` se mancante
3. Verifica Docker + Docker Compose
4. **Rileva il GID del gruppo docker** (Pi=991, Ubuntu=999, etc.) e lo salva in `.env`
5. Rileva l'OS e l'architettura
6. Builda e avvia i container
7. Mostra l'URL di accesso

### 3.2 Installazione manuale

```bash
# Rileva GID docker
echo "DOCKER_GID=$(getent group docker | cut -d: -f3)" > .env

# Build e avvio
docker-compose up -d --build
```

### 3.3 Accesso alla Dashboard

```
http://IP_HOST:3050
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
| **CPU Usage** | Percentuale di utilizzo della CPU (multicore aggregato) |
| **RAM** | Memoria utilizzata / totale (in GB) — scala automaticamente fino a 64+ GB |
| **Disk Space** | Spazio disco utilizzato / totale (in GB) |
| **Temperature** | Temperatura della CPU in °C (Raspberry Pi: thermal_zone0 / Intel: coretemp) |
| **Network** | IP locale, IP pubblico e interfaccia di rete |

I dati vengono aggiornati automaticamente ogni 5 secondi.

#### Andamento Storico (Grafici real-time)
Sotto le card delle metriche correnti, la dashboard mostra **grafici a area** per:
- 📈 CPU %
- 📈 RAM %
- 📈 Disco %
- 📈 Temperatura °C

Selettore intervallo: **1h / 6h / 24h** (in alto a destra dei grafici).
I grafici si aggiornano ogni 30 secondi dal database storico (tabella `metrics`).

> 💡 Su sistemi con molta RAM (es. Mac mini 16 GB) i grafici % rendono più immediato l'andamento rispetto ai GB assoluti. I valori assoluti restano visibili nella card RAM.

#### Widget compatto System Updates
Sempre nel System Monitor è presente un riquadro **🔄 System Updates** che mostra a colpo d'occhio:
- Numero pacchetti aggiornabili
- Disponibilità update kernel
- Data ultimo aggiornamento
- Stato auto-update scheduler

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

### 4.6 System Updates (Ver.2.1.Giu2026)

Tab dedicata alla gestione aggiornamenti OS/Kernel del Raspberry Pi.

**Funzionalità:**
- **Informazioni Sistema**: kernel attivo, uptime, ultimo aggiornamento, stato scheduler
- **Aggiornamenti Automatici**: scheduler in background con intervallo configurabile (default 24h)
- **Controlla Aggiornamenti**: esegue `apt-get update` e mostra pacchetti disponibili
- **Aggiorna Sistema**: lancia `apt-get upgrade -y` con timer di stima
- **Aggiorna Kernel**: lancia `apt-get full-upgrade -y` mirato kernel
- **Riavvio Sistema**: countdown 5s + reboot + notifica Pushover
- **Cronologia**: storico di tutti gli aggiornamenti effettuati

**Widget compatto su System Monitor:**
La home page mostra un riquadro riepilogativo "🔄 System Updates" con:
- Numero pacchetti aggiornabili (badge colorato)
- Disponibilità update kernel
- Data ultimo aggiornamento
- Stato scheduler auto-update

**Notifiche Pushover automatiche** per:
- Aggiornamento sistema completato/fallito
- Aggiornamento kernel completato/fallito
- Riavvio sistema in corso

**Stima tempo aggiornamento:**
La barra di avanzamento mostra `tempo trascorso / tempo stimato` (formula: 5s base + 3s per pacchetto, ~120s per kernel).

> ⚠️ **PREREQUISITI**: per funzionare, questa tab richiede la configurazione di `sudoers` sul Raspberry Pi. Vedi sezione **8. Configurazione Sudoers per System Updates** più avanti.

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

## 6.1 Script di Aggiornamento

Per aggiornare facilmente BoltDashPi5 con le ultime modifiche da GitHub, usa lo script `update.sh`.

**Creazione dello script (da eseguire una sola volta):**

```bash
cat > ~/BoltDashPi5/update.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "  BoltDashPi5 - Script di Aggiornamento"
echo "  Ver.2.1.Giu2026"
echo "=========================================="
echo ""

# Vai nella cartella del progetto
cd ~/BoltDashPi5 || { echo "❌ Cartella ~/BoltDashPi5 non trovata!"; exit 1; }

echo "📂 Cartella: $(pwd)"
echo ""

# Verifica se ci sono modifiche locali non salvate
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  Ci sono modifiche locali non salvate."
    echo "    Vuoi sovrascriverle? (s/n)"
    read -r risposta
    if [[ "$risposta" == "s" || "$risposta" == "S" ]]; then
        echo "🔄 Reset delle modifiche locali..."
        git reset --hard HEAD
    else
        echo "❌ Aggiornamento annullato."
        exit 1
    fi
fi

# Scarica gli aggiornamenti
echo "📥 Scaricamento aggiornamenti da GitHub..."
git fetch --all

# Applica gli aggiornamenti
echo "🔄 Applicazione aggiornamenti..."
git pull origin main || git pull origin master

echo ""
echo "✅ Codice aggiornato!"
echo ""

# Chiedi se ricostruire i container
echo "🐳 Vuoi ricostruire i container Docker? (s/n)"
read -r ricostruisci

if [[ "$ricostruisci" == "s" || "$ricostruisci" == "S" ]]; then
    echo ""
    echo "🛑 Fermo i container..."
    docker-compose down
    
    echo "🔨 Ricostruzione container..."
    docker-compose build --no-cache
    
    echo "🚀 Avvio container..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Attesa avvio servizi (15 secondi)..."
    sleep 15
    
    echo ""
    echo "📊 Stato container:"
    docker-compose ps
fi

echo ""
echo "=========================================="
echo "  ✅ AGGIORNAMENTO COMPLETATO!"
echo "=========================================="
echo ""
echo "  🌐 Dashboard: http://$(hostname -I | awk '{print $1}'):3050"
echo ""
echo "=========================================="
EOF

chmod +x ~/BoltDashPi5/update.sh
```

**Uso dello script:**

```bash
cd ~/BoltDashPi5
./update.sh
```

**Cosa fa lo script:**
1. ✅ Verifica modifiche locali non salvate
2. ✅ Scarica gli aggiornamenti da GitHub
3. ✅ Chiede se ricostruire i container Docker
4. ✅ Riavvia i servizi automaticamente
5. ✅ Mostra lo stato finale

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

## 8. Configurazione Sudoers per System Updates

> ℹ️ **AGGIORNAMENTO Ver.2.1.Giu2026 (post-deploy)**: la configurazione sudoers descritta sotto **NON è più necessaria** se il `docker-compose.yml` include `privileged: true` per il backend (default a partire da Ver.2.1.Giu2026). Il container gira come root e accede direttamente ai binari `apt-get` e `reboot` montati dall'host. Questa sezione è mantenuta solo come riferimento storico o per chi preferisce eseguire il backend senza `privileged: true` (richiede modifiche al codice).

### 8.1 Perché serve (solo modalità non-privileged)
Il tab System Updates esegue comandi privilegiati (`apt-get upgrade`, `reboot`) dal container backend. Affinché possa farlo senza richiedere password ogni volta, il sistema operativo del Raspberry Pi deve autorizzarli tramite `sudoers`.

### 8.2 Step 1 — Crea il file sudoers
Apri un terminale sul Raspberry Pi (via SSH o direttamente) ed esegui:

```bash
sudo tee /etc/sudoers.d/boltdash-updates > /dev/null <<'EOF'
# BoltDashPi5 - autorizzazioni per System Updates tab
root ALL=(ALL) NOPASSWD: /usr/bin/apt-get
root ALL=(ALL) NOPASSWD: /sbin/reboot
root ALL=(ALL) NOPASSWD: /sbin/shutdown
EOF
```

### 8.3 Step 2 — Imposta i permessi corretti
```bash
sudo chmod 440 /etc/sudoers.d/boltdash-updates
```

### 8.4 Step 3 — Verifica la sintassi
```bash
sudo visudo -cf /etc/sudoers.d/boltdash-updates
```
Output atteso:
```
/etc/sudoers.d/boltdash-updates: parsed OK
```
Se vedi errori, **NON riavviare nulla** e correggi prima la sintassi (un errore in sudoers può bloccare tutto sudo!).

### 8.5 Step 4 — Riavvia i container per applicare il nuovo `docker-compose.yml`
Il file `docker-compose.yml` è già stato aggiornato (Ver.2.1.Giu2026) con `privileged: true` e i mount necessari per `apt`. Quindi:

```bash
cd ~/BoltDashPi5
git pull origin main          # scarica le modifiche da GitHub
docker-compose down
docker-compose up -d --build
```

### 8.6 Step 5 — Test
1. Apri la dashboard → `http://<IP-PI>:3050`
2. Login (`admin@dashboard.local` / `admin123`)
3. Vai sul tab **🔄 System Updates**
4. Clicca **"Controlla Aggiornamenti"**
5. Dovresti vedere il numero di pacchetti aggiornabili (es. "5 pacchetti disponibili")

Se invece appare un errore `apt-get not found` o `permission denied`:
- Verifica che `/etc/sudoers.d/boltdash-updates` esista e abbia permessi `440`
- Verifica che nel `docker-compose.yml` ci siano i mount `/etc/apt`, `/var/lib/apt`, `/usr/bin/apt-get`
- Esegui `docker-compose logs backend` e cerca righe contenenti `apt`

### 8.7 Disinstallazione (rollback)
Per rimuovere le autorizzazioni sudo:
```bash
sudo rm /etc/sudoers.d/boltdash-updates
```

### 8.8 ⚠️ Note di Sicurezza
- Il file sudoers consente **solo** i comandi `apt-get`, `reboot` e `shutdown`. Nessun altro comando privilegiato è autorizzato.
- Il container backend gira come `root` per accedere ad `apt`. Questo è accettabile in una rete domestica fidata, **non** in un sistema esposto pubblicamente su Internet.
- Se esponi la dashboard su Internet (es. via reverse proxy), **cambia subito** la password admin di default e considera l'aggiunta di un firewall/VPN.

---

## 9. Troubleshooting

### 9.1 Frontend non raggiungibile sulla porta 3050

**Sintomo:** dopo `docker-compose up -d` i container risultano `Up`, ma aprendo `http://<IP-PI>:3050` il browser dà "Impossibile raggiungere il sito" o timeout.

**Causa:** gli script `npm` nel `frontend/package.json` forzano la porta tramite argomenti CLI (`--port 3000`), che hanno **priorità** sul `vite.config.ts`. Risultato: Vite parte sulla porta 3000 dentro al container, ma Docker espone la 3050 → il frontend non è raggiungibile.

**Soluzione (già applicata in Ver.2.1.Giu2026):**
Negli script di `frontend/package.json` rimuovere completamente i flag CLI di porta/host, così Vite legge la configurazione ufficiale da `vite.config.ts`:

```json
"scripts": {
  "start": "vite",
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Poi nel `vite.config.ts` impostare la porta corretta (3050 per il Pi):

```ts
server: {
  host: '0.0.0.0',
  port: 3050,
  allowedHosts: true,
  proxy: {
    '/api': {
      target: 'http://backend:8001',
      changeOrigin: true,
    }
  }
}
```

> ⚠️ **Importante:** il proxy deve puntare a `http://backend:8001` (nome del servizio Docker), **NON** a `localhost:8001`. Dentro al container `localhost` è il container stesso, non il backend.

Dopo aver salvato:
```bash
cd ~/BoltDashPi5
docker-compose down
docker-compose up -d --build frontend
```

### 9.2 Tab System Updates dà errore "apt-get not found" o "permission denied"

**Causa:** non è stato configurato `sudoers` o mancano i mount nel `docker-compose.yml`.
**Soluzione:** vedi sezione **8. Configurazione Sudoers per System Updates**.

### 9.3 Dopo `git pull` la dashboard mostra ancora la versione vecchia

**Causa:** Docker usa la cache delle build precedenti.
**Soluzione:** rebuild completo senza cache:
```bash
cd ~/BoltDashPi5
docker-compose down
docker images | grep -i boltdash | awk '{print $3}' | xargs -r docker rmi -f
docker builder prune -af
docker-compose build --no-cache --pull
docker-compose up -d
```
Poi nel browser: **hard refresh** (`Ctrl+Shift+R`) o finestra in incognito.

### 9.4 Container in stato "Restarting" o "Exit"

**Diagnosi:**
```bash
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 frontend
```
Cerca righe con `Error`, `Exception`, `EADDRINUSE`. Le cause più comuni:
- Porta occupata: `sudo lsof -i :3050` o `:8001` per identificare il processo
- File mancanti: `git status` per verificare lo stato del repository
- Permessi cartelle: `sudo chown -R 1000:1000 data backups uploads`

### 9.5 Login fallisce con "Network Error"

**Causa:** il frontend non riesce a raggiungere il backend. Vedi sezione 9.1.
**Test manuale:** dal tuo PC apri `http://<IP-PI>:8001/api/health` — deve rispondere con un JSON `{"status":"ok"}`.

---

*Documento generato per BoltDashPi5 Ver.2.1.Giu2026*
