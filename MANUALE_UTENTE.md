# BoltUbuntu - Manuale Utente
## BoltUbuntu Dashboard
> 🌍 **Località**: Roma, Italia — **Fuso orario**: Europe/Rome (CEST UTC+2) — Ora: 17:47.

### Versione 10.1Giu2026

---

## 1. Introduzione

**BoltUbuntu** è una dashboard web completa per la gestione e il monitoraggio del tuo Raspberry Pi 5. Permette di:

- Monitorare le risorse di sistema (CPU, RAM, Disco, Temperatura)
- Gestire i container Docker
- Eseguire backup dei container
- Gestire file Office
- Ricevere notifiche tramite Pushover

---

## 2. Requisiti di Sistema

BoltUbuntu supporta diverse piattaforme **Debian-based** (Raspberry Pi OS, Ubuntu, Debian) sia su architettura **ARM** che **x86/x86_64**.

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
| Porta Frontend | 3061

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
git clone https://github.com/USERNAME/BoltUbuntu.git
cd BoltUbuntu

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
- ✅ Backup su storage locale (`~/BoltUbuntu/backups/`)
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
- **Local:** `~/BoltUbuntu/uploads/`
- **NAS:** `/mnt/nas/office/` NON attivo!

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

### 4.6 System Updates (Ver.10.1Giu2026)

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
BoltUbuntu/
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
| BoltUbuntu-backend | 8001 | API REST FastAPI |
| BoltUbuntu-frontend | 3051 | Interfaccia Web React |

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
docker logs BoltUbuntu-backend --tail 50

# Log solo frontend
docker logs BoltUbuntu-frontend --tail 50

# Riavvia i servizi
docker-compose restart

# Ricostruisci dopo modifiche
docker-compose up -d --build

# Stato dei container
docker-compose ps
```

---

## 6.1 Script di Aggiornamento

Per aggiornare facilmente BoltUbuntu con le ultime modifiche da GitHub, usa lo script `update.sh`.

**Creazione dello script (da eseguire una sola volta):**

```bash
cat > ~/BoltUbuntu/update.sh << 'EOF'
#!/bin/bash

echo "=========================================="
echo "  BoltUbuntu - Script di Aggiornamento"
echo "  Ver.10.1Giu2026"
echo "=========================================="
echo ""

# Vai nella cartella del progetto
cd ~/BoltUbuntu || { echo "❌ Cartella ~/BoltUbuntu non trovata!"; exit 1; }

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
echo "  🌐 Dashboard: http://$(hostname -I | awk '{print $1}'):3061"
echo ""
echo "=========================================="
EOF

chmod +x ~/BoltUbuntu/update.sh
```

**Uso dello script:**

```bash
cd ~/BoltUbuntu
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
docker logs BoltUbuntu-backend

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
cd ~/BoltUbuntu

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
sudo lsof -i :3061
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
| Porta Frontend | 3061
| Porta Backend | 8001 | 8001 |
| allowedHosts | true | true |
| proxy target | localhost:8001 | backend:8001 |
| container_name frontend | - | BoltUbuntu-frontend |
| container_name backend | - | BoltUbuntu-backend |

**Per passare da un ambiente all'altro:**

```bash
# Per Ubuntu MacMini (porta 3051)
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
docker exec BoltUbuntu-backend docker ps
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
docker logs BoltUbuntu-frontend --tail 30
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

### Modifiche su Ubuntu MacMini

Quando si lavora direttamente sul Ubutnut Macmini, è più efficiente utilizzare comandi diretti invece di passare per Git:

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
| 6.3 | Giugno 2026 | Fix modulo Manutenzione: salvataggio pulsanti dinamici, CORS, atomic write, volume directory |
| 6.1 | Aprile 2026 | Rinominati container, aggiunto pulsante Delete backup |
| 2.4 | Marzo 2026 | Versione iniziale con tutte le funzionalità |

---

## 11. Contatti e Supporto

**Repository:** https://github.com/USERNAME/BoltUbuntu

**Autore:** Sviluppato con assistenza di Emergent AI e Fabrizio.

---

## 8. Configurazione Sudoers per System Updates

> ℹ️ **AGGIORNAMENTO Ver.10.1Giu2026 (post-deploy)**: la configurazione sudoers descritta sotto **NON è più necessaria** se il `docker-compose.yml` include `privileged: true` per il backend (default a partire da Ver.10.1Giu2026). Il container gira come root e accede direttamente ai binari `apt-get` e `reboot` montati dall'host. Questa sezione è mantenuta solo come riferimento storico o per chi preferisce eseguire il backend senza `privileged: true` (richiede modifiche al codice).

### 8.1 Perché serve (solo modalità non-privileged)
Il tab System Updates esegue comandi privilegiati (`apt-get upgrade`, `reboot`) dal container backend. Affinché possa farlo senza richiedere password ogni volta, il sistema operativo del Raspberry Pi deve autorizzarli tramite `sudoers`.

### 8.2 Step 1 — Crea il file sudoers
Apri un terminale sul Ubuntu Macmini (via SSH o direttamente) ed esegui:

```bash
sudo tee /etc/sudoers.d/boltdash-updates > /dev/null <<'EOF'
# BoltUbuntu - autorizzazioni per System Updates tab
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
Il file `docker-compose.yml` è già stato aggiornato (Ver.10.1Giu2026) con `privileged: true` e i mount necessari per `apt`. Quindi:

```bash
cd ~/BoltUbuntu
git pull origin main          # scarica le modifiche da GitHub
docker-compose down
docker-compose up -d --build
```

### 8.6 Step 5 — Test
1. Apri la dashboard → `http://<IP-PI>:3061`
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

**Sintomo:** dopo `docker-compose up -d` i container risultano `Up`, ma aprendo `http://<IP-PI>:3061` il browser dà "Impossibile raggiungere il sito" o timeout.

**Causa:** gli script `npm` nel `frontend/package.json` forzano la porta tramite argomenti CLI (`--port 3000`), che hanno **priorità** sul `vite.config.ts`. Risultato: Vite parte sulla porta 3000 dentro al container, ma Docker espone la 3050 → il frontend non è raggiungibile.

**Soluzione (già applicata in Ver.10.1Giu2026):**
Negli script di `frontend/package.json` rimuovere completamente i flag CLI di porta/host, così Vite legge la configurazione ufficiale da `vite.config.ts`:

```json
"scripts": {
  "start": "vite",
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Poi nel `vite.config.ts` impostare la porta corretta (3050 per il Ubuntu):

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
cd ~/BoltUbuntu
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
cd ~/BoltUbuntu
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
- Porta occupata: `sudo lsof -i :3061` o `:8001` per identificare il processo
- File mancanti: `git status` per verificare lo stato del repository
- Permessi cartelle: `sudo chown -R 1000:1000 data backups uploads`

### 9.5 Login fallisce con "Network Error"

**Causa:** il frontend non riesce a raggiungere il backend. Vedi sezione 9.1.
**Test manuale:** dal tuo PC apri `http://<IP-HOST>:8001/api/health` — deve rispondere con un JSON `{"status":"ok"}`.

### 9.6 Aggiornare l'app dopo `git pull` mantenendo i dati

**Quando**: ogni volta che fai `git pull` da GitHub per ricevere nuove modifiche (es. nuove feature, fix, rinomina container).

**Procedura completa (Ubuntu Mac mini)**:
```bash
cd ~/BoltUbuntu

# 1. Salva il database SQLite (contiene utenti, log, scheduler)
cp data/dashboard.db /tmp/dashboard.db.safe 2>/dev/null

# 2. Sblocca eventuali flag git
git update-index --no-assume-unchanged data/dashboard.db 2>/dev/null
git checkout HEAD -- data/dashboard.db 2>/dev/null

# 3. Ferma i container
docker compose down

# 4. (Solo se i container sono stati rinominati nel docker-compose.yml)
#    Rimuovi i container vecchi con i nomi precedenti
docker ps -a --format "{{.Names}}" | grep -iE "BoltUbuntu|BoltUbuntu" | xargs -r docker rm -f

# 5. Pull aggiornamenti
git fetch origin
git reset --hard origin/main

# 6. Ripristina il database
cp /tmp/dashboard.db.safe data/dashboard.db 2>/dev/null

# 7. Verifica nuovi nomi nel docker-compose.yml
grep "container_name" docker-compose.yml

# 8. Avvia con build (in caso di modifiche al codice)
docker compose up -d --build
sleep 25

# 9. Verifica stato
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Output atteso (Ver.10.1Giu2026+):
```
NAMES                          STATUS              PORTS
BoltUbuntu-backend      Up X seconds        0.0.0.0:8001->8001/tcp
BoltUbuntu-frontend     Up X seconds        0.0.0.0:3061->3050/tcp
```

### 9.7 Conflitto git pull su `data/dashboard.db`

**Sintomo**: `error: Le tue modifiche locali ai seguenti file sarebbero sovrascritte con il merge: data/dashboard.db`

**Causa**: il database SQLite cambia ad ogni login/metrica → git lo vede sempre come modificato.

**Soluzione permanente**:
```bash
cd ~/BoltUbuntu
echo "data/" >> .gitignore
echo "*.db" >> .gitignore
echo "*.db.wal" >> .gitignore
git rm --cached data/dashboard.db 2>/dev/null
git add .gitignore
git -c user.email="local@host" -c user.name="local" commit -m "ignore SQLite database"
```
Dopo questo, `git pull` non darà più conflitti.

### 9.8 Cambiare nome ai container (rebrand)

Se modifichi `container_name` nel `docker-compose.yml`, Docker **NON rinomina** automaticamente i container esistenti. Devi rimuoverli e ricrearli:

```bash
cd ~/BoltUbuntu

# Ferma e rimuovi vecchi container per nome
docker compose down
docker rm -f BoltUbuntu-backend BoltUbuntu-frontend 2>/dev/null

# Ricrea con i nuovi nomi
docker compose up -d --build

# Verifica
docker ps --format "table {{.Names}}\t{{.Status}}"
```

> 💡 I **volumi** (`./data`, `./backups`, `./uploads`) sono mappati a directory locali, quindi i dati persistono anche quando ricrei i container. Nessuna perdita di dati.

### 9.10 Processi Zombie e Conflitti di Porte

Se l'avvio del progetto fallisce o la pagina non si carica, potrebbero esserci **processi zombie** (vecchie istanze di Vite o Python) che occupano le porte necessarie.

**Sintomi:**
- Timeout o "Connessione rifiutata" sul browser
- Messaggio "Port already in use" nei log
- Backend o frontend non rispondono

**Soluzione automatica (consigliata):**

Usa lo script `start.sh` che pulisce automaticamente le porte prima di avviare:

```bash
cd ~/BoltUbuntu
./start.sh
```

Lo script:
1. Identifica e ferma tutti i processi sulle porte 8001, 3050, 3061
2. Verifica che le porte siano libere
3. Avvia backend e frontend in background
4. Attende che i servizi siano pronti

**Soluzione manuale:**

```bash
# Trova i processi sulle porte problematiche
lsof -nP -i :8001
lsof -nP -i :3061

# Ferma i processi (sostituisci PID con il numero trovato)
kill -9 PID

# Oppure uccidi tutti i processi node/vite/python correlati
pkill -f "uvicorn"
pkill -f "vite"
```

**Prevenzione:**

Non chiudere mai i terminali mentre i servizi sono in esecuzione. Usa sempre:
- `Ctrl+C` per fermare gracemente
- O `nohup` / background per avvii persistenti

---

### 9.12 Modulo Manutenzione (Porta 3055)

Il modulo Manutenzione è un servizio separato che gira sulla porta **3055** e viene avviato automaticamente da Docker Compose. È integrato direttamente nella Dashboard React (no iframe).

**Funzionalità:**
- Aggiornamento WebApp 1/2/3 (git fetch + reset + dipendenze + systemctl restart)
- Verifica Porte Occupate (`ss -tulnp`)
- Stato Servizi SaaS (nginx, docker, postgresql, mysql)
- Pulizia Spazio e Log (apt-get clean, logrotate, find)
- Gestione dinamica pulsanti: aggiungi, modifica, elimina, riordina i pulsanti direttamente dalla dashboard

**Gestione Pulsanti Dinamica:**
- Clicca **Gestisci** in alto a destra nella scheda Manutenzione
- Puoi creare pulsanti **preset** (azioni predefinite) o **custom** (comandi shell liberi)
- I pulsanti vengono salvati in `manutenzione/buttons_config.json` e persistono tra i riavvii
- Per modificare un pulsante, clicca l'icona modifica (matita) in ogni voce della lista

**Configurazione Docker:**

Il container `BoltUbuntu-manutenzione` viene avviato con `privileged: true` quindi ha accesso root diretto - **nessuna password richiesta** per i comandi di sistema.

```yaml
manutenzione:
  build: ./manutenzione
  container_name: BoltUbuntu-manutenzione
  privileged: true
  pid: host
  ports:
    - "3055:3055"
```

**Nota**: I 6 pulsanti della scheda Manutenzione non richiedono password quando il container è eseguito con `privileged: true`.

> **Nota importante sul volume**: per far si che le modifiche ai pulsanti (via GUI) vengano salvate e persistano, il container mappa l'intera directory locale `./manutenzione` su `/app` nel container.

**Avvio standalone (senza Docker):**

```bash
cd ~/BoltUbuntu/manutenzione
pip3 install -r requirements.txt
python3 app.py
```

**URL modulo:**
- Standalone: `http://localhost:3055`
- Integrato nella Dashboard: tab "Manutenzione" su porta 3061

---

### 9.13 Comando one-liner per aggiornamento completo

Copia-incolla unico per: salvare DB, pull, rebuild, rimozione container vecchi:

```bash
cd ~/BoltUbuntu && cp data/dashboard.db /tmp/dashboard.db.safe 2>/dev/null && git update-index --no-assume-unchanged data/dashboard.db 2>/dev/null && git checkout HEAD -- data/dashboard.db 2>/dev/null && docker compose down && docker ps -a --format "{{.Names}}" | grep -iE "BoltUbuntu|BoltUbuntu" | xargs -r docker rm -f ; git fetch origin && git reset --hard origin/main && cp /tmp/dashboard.db.safe data/dashboard.db 2>/dev/null && docker compose up -d --build && sleep 25 && docker ps --format "table {{.Names}}\t{{.Status}}"
```

Docker compose.yml al 5 giugno 2026 ---

services:
  backend:
    build: ./backend
    container_name: BoltUbuntu-backend
    ports:
      - "8001:8001"
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
      - ./uploads:/app/uploads
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - JWT_SECRET=raspberry_dashboard_secret_key_2024
      - DOCKER_HOST=unix:///var/run/docker.sock
    group_add:
      - "${DOCKER_GID:-999}"
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: BoltUbuntu-frontend
    ports:
      - "3061:3050"
    environment:
      - VITE_PORT=3050
      - VITE_PROXY_TARGET=http://backend:8001
    depends_on:
      - backend
    restart: unless-stopped





*Documento generato per BoltUbuntu Ver.10.1Giu2026*
