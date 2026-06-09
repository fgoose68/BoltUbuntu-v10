# BoltUbuntu Dashboard

**Versione:** Ver.6.2Giu2026

Una Dashboard Web moderna e completa per gestire backup Docker, file Office e monitoraggio hardware del tuo Raspberry Pi 5.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Raspberry+Pi+Dashboard)

## Caratteristiche

### Gestione Backup Docker
- Lista di tutti i container Docker attivi e non attivi
- Backup manuale dei container con un click
- Salvataggio su SSD locale o NAS di rete
- Pianificazione backup automatici con cron
- Notifiche Pushover per ogni operazione

### Gestione File Office
- Upload documenti Office (docx, xlsx, pptx, pdf)
- Download e gestione file
- Storage su locale o NAS
- Metadati completi per ogni file

### Monitoraggio Hardware in Tempo Reale
- CPU, RAM, Disco, Temperatura
- Rete (IP locale e pubblico)
- Alert configurabili
- Aggiornamento automatico ogni 5 secondi

### Sicurezza
- Autenticazione JWT locale
- Password hashate con bcrypt
- Database locale DuckDB
- Supporto reverse proxy

### Notifiche Push
- Integrazione Pushover completa
- Notifiche per backup, file, alert
- Supporto iOS, iPadOS, macOS

## Stack Tecnologico

- React 19 + TypeScript + Vite + TailwindCSS
- Node.js + Express
- DuckDB (database embedded)
- Docker + Docker Compose
- Nginx

## Requisiti

- Raspberry Pi 3/4/5 con Docker installato
- Almeno 1GB RAM libera
- Account Pushover (opzionale, per notifiche)
- NAS con SMB/NFS (opzionale, per storage remoto)

## Installazione Rapida

```bash
git clone https://github.com/yourusername/raspberry-pi-dashboard.git
cd raspberry-pi-dashboard
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Lo script guida attraverso la configurazione completa.

## Configurazione

Il file `.env` viene configurato automaticamente. Configurazione predefinita:

```env
DUCKDB_PATH=./data/dashboard.db
JWT_SECRET=generated_automatically
VITE_API_URL=http://localhost:3061/api
BACKEND_PORT=3050
```

Tutto funziona out-of-the-box, nessuna configurazione esterna richiesta!

## Avvio Rapido

```bash
cd ~/BoltUbuntu
./start.sh
```

Lo script `start.sh` pulisce automaticamente le porte (8001, 3050, 3061) da eventuali processi zombie e avvia backend e frontend.

## Accesso

Apri il browser:
- Locale: `http://localhost:3061`
- Rete: `http://<raspberry-pi-ip>:3061`

## Comandi Docker

```bash
docker-compose logs -f dashboard    # Visualizza log
docker-compose restart              # Riavvia
docker-compose down                 # Ferma tutto
```

## Struttura Progetto

```
raspberry-pi-dashboard/
├── server/          # Backend Express + API
├── src/             # Frontend React
├── scripts/         # Script di setup
├── docker-compose.yml
├── Dockerfile
└── nginx.conf
```

## API Principali

- `POST /api/auth/login` - Login
- `GET /api/docker/containers` - Lista container
- `POST /api/docker/backup/:id` - Backup container
- `GET /api/metrics/current` - Metriche sistema
- `POST /api/files/upload` - Upload file

## Configurazione NAS

### SMB (Samba)

```bash
sudo apt-get install cifs-utils
sudo mount -t cifs //192.168.1.100/backups /mnt/nas \
  -o username=admin,password=password
```

### NFS

```bash
sudo apt-get install nfs-common
sudo mount -t nfs 192.168.1.100:/volume1/backups /mnt/nas
```

## Pushover

1. Registrati su pushover.net
2. Crea un'app e copia API Token
3. Configura in Settings nella dashboard
4. Testa con "Send Test Notification"

## Backup Automatici

Utilizza espressioni cron standard:

```
0 2 * * *    # Ogni giorno alle 2:00
0 2 * * 0    # Ogni domenica alle 2:00
*/30 * * * * # Ogni 30 minuti
```

## Risoluzione Problemi

### Processi Zombie (porte occupate)
Se l'avvio fallisce, potrebbero esserci vecchi processi sulle porte:

```bash
cd ~/BoltUbuntu
./start.sh   # Pulisce automaticamente le porte e riavvia
```

### Docker permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### NAS non accessibile
```bash
ping 192.168.1.100
mount | grep nas
```

### Log
```bash
docker-compose logs -f dashboard
```

## Sicurezza Best Practices

1. Cambia password admin predefinita al primo accesso
2. Usa password forti per tutti gli account
3. Limita accesso alla LAN con firewall
4. Abilita HTTPS con Let's Encrypt per accesso esterno
5. Backup regolare del database DuckDB (`data/dashboard.db`)

## Performance Raspberry Pi

```bash
# Aumenta swap
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## Contribuire

I contributi sono benvenuti! Apri una Pull Request.

## Licenza

MIT License

## Supporto

- GitHub Issues
- Documentazione completa nel wiki

## Roadmap

- Backup incrementali
- Grafici tempo reale
- Cloud backup (Dropbox, Google Drive)
- App mobile
- Docker Swarm support
- Temi personalizzabili
