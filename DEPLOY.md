# Guida al Deploy su Raspberry Pi

Questa guida ti accompagna passo dopo passo nel deploy della Dashboard sul tuo Raspberry Pi.

## Prerequisiti

### Hardware
- Raspberry Pi 3, 4 o 5
- Micro SD card (minimo 16GB, raccomandato 32GB+)
- Alimentatore ufficiale
- SSD esterno USB (raccomandato per performance)
- Connessione Ethernet o WiFi

### Software
- Raspberry Pi OS (Debian-based)
- Docker
- Docker Compose
- Git

## Step 1: Preparazione Raspberry Pi

### 1.1 Installazione Sistema Operativo

1. Scarica [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Installa Raspberry Pi OS (64-bit raccomandato)
3. Configura SSH e WiFi se necessario
4. Avvia il Raspberry Pi

### 1.2 Configurazione Iniziale

```bash
# Aggiorna il sistema
sudo apt update && sudo apt upgrade -y

# Installa utilità essenziali
sudo apt install -y git curl vim

# Configura hostname (opzionale)
sudo hostnamectl set-hostname raspberry-dashboard

# Riavvia
sudo reboot
```

### 1.3 Installazione Docker

```bash
# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Aggiungi utente al gruppo docker
sudo usermod -aG docker $USER
newgrp docker

# Verifica installazione
docker --version

# Installa Docker Compose
sudo apt install -y docker-compose

# Verifica installazione
docker-compose --version
```

## Step 2: Configurazione Database

La Dashboard utilizza **DuckDB**, un database SQL embedded leggero e performante, perfetto per Raspberry Pi.

### 2.1 Caratteristiche DuckDB

- Database locale (nessun servizio esterno richiesto)
- Ottimizzato per analytics e query veloci
- Footprint minimo di memoria
- File singolo per tutto il database
- Zero configurazione necessaria

### 2.2 Inizializzazione Automatica

Il database viene creato automaticamente al primo avvio in:
```
~/raspberry-pi-dashboard/data/dashboard.db
```

Include tabelle per:
- Utenti e autenticazione
- Backup Docker
- Metriche di sistema
- File caricati
- Impostazioni
- Notifiche

## Step 3: Installazione Dashboard

### 3.1 Clone Repository

```bash
# Entra nella home directory
cd ~

# Clona il repository
git clone https://github.com/yourusername/raspberry-pi-dashboard.git
cd raspberry-pi-dashboard
```

### 3.2 Configurazione Ambiente

```bash
# Copia il template .env
cp .env.example .env

# Modifica se necessario (opzionale)
nano .env
```

Configurazione predefinita (già ottimizzata):
```env
DUCKDB_PATH=./data/dashboard.db
JWT_SECRET=                    # Lascia vuoto, verrà generato automaticamente
VITE_API_URL=http://localhost:3061/api
BACKEND_PORT=3050
```

Salva con `Ctrl+X`, poi `Y`, poi `Enter`

La configurazione predefinita funziona senza modifiche!

### 3.3 Esecuzione Setup

```bash
# Rendi eseguibile lo script
chmod +x scripts/setup.sh

# Esegui il setup
./scripts/setup.sh
```

Lo script:
1. Controlla Docker
2. Crea directory necessarie
3. Genera JWT_SECRET automaticamente
4. Chiede se configurare NAS
5. Installa dipendenze npm
6. Compila l'applicazione
7. Avvia i container Docker

## Step 4: Configurazione NAS (Opzionale)

### 4.1 NAS Samba/CIFS

```bash
# Installa utilità CIFS
sudo apt install -y cifs-utils

# Testa connessione
ping 192.168.1.100

# Monta manualmente
sudo mkdir -p /mnt/nas
sudo mount -t cifs //192.168.1.100/backups /mnt/nas \
  -o username=admin,password=yourpassword,uid=1000,gid=1000

# Verifica mount
ls /mnt/nas

# Aggiungi a fstab per mount automatico
echo "//192.168.1.100/backups /mnt/nas cifs credentials=/home/pi/.nascredentials,uid=1000,gid=1000 0 0" | sudo tee -a /etc/fstab

# Crea file credenziali
cat > ~/.nascredentials << EOF
username=admin
password=yourpassword
EOF
chmod 600 ~/.nascredentials
```

### 4.2 NAS NFS

```bash
# Installa utilità NFS
sudo apt install -y nfs-common

# Monta manualmente
sudo mkdir -p /mnt/nas
sudo mount -t nfs 192.168.1.100:/volume1/backups /mnt/nas

# Verifica mount
ls /mnt/nas

# Aggiungi a fstab
echo "192.168.1.100:/volume1/backups /mnt/nas nfs defaults 0 0" | sudo tee -a /etc/fstab
```

## Step 5: Primo Avvio

### 5.1 Verifica Container

```bash
# Verifica che i container siano in esecuzione
docker-compose ps

# Dovresti vedere:
# raspberry-dashboard   running   0.0.0.0:3061->3050/tcp
# dashboard-nginx       running   0.0.0.0:3051->80/tcp
```

### 5.2 Visualizza Log

```bash
# Log in tempo reale
docker-compose logs -f dashboard

# Premi Ctrl+C per uscire
```

### 5.3 Accedi alla Dashboard

Apri il browser e vai a uno di questi indirizzi:
- `http://localhost:3061` (se sul Raspberry Pi)
- `http://raspberry-pi.local:3061` (da altro computer sulla stessa rete)
- `http://192.168.1.xxx:3061` (usa l'IP del tuo Raspberry Pi)

Per trovare l'IP:
```bash
hostname -I
```

## Step 6: Configurazione Dashboard

### 6.1 Primo Accesso

Il sistema crea automaticamente un utente admin predefinito:
- Email: `admin@dashboard.local`
- Password: `admin123`

**IMPORTANTE**: Cambia subito la password dopo il primo login!

Oppure puoi creare un nuovo account:
1. Clicca su "Register"
2. Inserisci:
   - Name: Il tuo nome
   - Email: tua@email.com
   - Password: password sicura (minimo 6 caratteri)
3. Clicca "Create Account"
4. Verrai reindirizzato alla dashboard

### 6.2 Configurazione Pushover

1. Vai su [pushover.net](https://pushover.net)
2. Crea un account (gratuito, 7 giorni trial poi $5 una tantum)
3. Scarica l'app su iOS/macOS
4. Crea una nuova applicazione:
   - Login su pushover.net
   - Vai su "Your Applications"
   - Clicca "Create an Application/API Token"
   - Name: `Raspberry Dashboard`
   - Copia l'API Token

5. Nella Dashboard:
   - Vai su tab "Settings"
   - Seleziona "Pushover"
   - Inserisci:
     - User Key: (copialo dalla home di pushover.net)
     - API Token: (il token appena creato)
   - Abilita "Enable notifications"
   - Clicca "Save Configuration"
   - Clicca "Send Test Notification"

Dovresti ricevere una notifica su iOS/macOS!

### 6.3 Configurazione Alert

1. Nella Dashboard, vai su Settings → Alert Thresholds
2. Configura le soglie:
   - CPU: 90% (alert se supera)
   - RAM: 90%
   - Disk: 90%
   - Temperature: 80°C
3. Abilita gli alert che desideri

## Step 7: Test Funzionalità

### 7.1 Test Backup Docker

1. Vai su tab "Docker Backups"
2. Vedrai la lista dei container
3. Clicca "Backup (Local)" su un container
4. Attendi il completamento
5. Riceverai una notifica Pushover
6. Verifica che il file sia in `/home/pi/raspberry-pi-dashboard/backups/`

### 7.2 Test Upload File

1. Vai su tab "File Manager"
2. Clicca "Select File"
3. Scegli un file Office (.docx, .xlsx, .pptx)
4. Seleziona destinazione (Local o NAS)
5. Clicca "Upload File"
6. Il file apparirà nella lista sottostante

### 7.3 Test Monitoraggio

1. Vai su tab "System Monitor"
2. Vedrai le metriche in tempo reale:
   - CPU Usage
   - RAM
   - Disk Space
   - Temperature
   - Network Info
3. Le metriche si aggiornano automaticamente ogni 5 secondi

## Step 8: Configurazione Avanzata

### 8.1 Backup Automatici

1. Nella Dashboard, vai su "Docker Backups"
2. Scorri in basso (feature da implementare nel futuro)

Per ora, puoi creare backup pianificati manualmente:
```bash
# Esempio: backup ogni giorno alle 2:00
# Aggiungi al crontab del Raspberry Pi
crontab -e

# Aggiungi questa riga:
0 2 * * * curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3061/api/docker/backup/CONTAINER_ID
```

### 8.2 Reverse Proxy con HTTPS

Per accedere da Internet in modo sicuro:

```bash
# Installa certbot
sudo apt install -y certbot

# Ottieni certificato (richiede dominio pubblico)
sudo certbot certonly --standalone -d yourdomain.com

# Modifica nginx.conf
# Aggiungi server block HTTPS

# Riavvia nginx
docker-compose restart nginx
```

### 8.3 Firewall

```bash
# Installa UFW
sudo apt install -y ufw

# Permetti solo porte necessarie
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 3050/tcp   # Dashboard
sudo ufw allow 3051/tcp   # Nginx HTTP
sudo ufw allow 3052/tcp   # Nginx HTTPS (se configurato)

# Limita accesso alla LAN (opzionale)
sudo ufw allow from 192.168.1.0/24 to any port 3050

# Abilita firewall
sudo ufw enable
```

## Step 9: Manutenzione

### 9.1 Aggiornamento

```bash
cd ~/raspberry-pi-dashboard
git pull
docker-compose down
docker-compose up -d --build
```

### 9.2 Backup Database

Il database DuckDB è un singolo file che puoi facilmente backuppare:

```bash
# Backup manuale
cp ~/raspberry-pi-dashboard/data/dashboard.db ~/raspberry-pi-dashboard/data/dashboard.db.backup

# Backup automatico giornaliero (aggiungi a crontab)
crontab -e

# Aggiungi questa riga:
0 3 * * * cp ~/raspberry-pi-dashboard/data/dashboard.db ~/backups/db-$(date +\%Y\%m\%d).db
```

Per ripristinare un backup:
```bash
cp ~/backups/db-20240101.db ~/raspberry-pi-dashboard/data/dashboard.db
docker-compose restart
```

### 9.3 Pulizia

```bash
# Rimuovi backup vecchi (manuale)
find ~/raspberry-pi-dashboard/backups -type f -mtime +30 -delete

# Pulisci immagini Docker inutilizzate
docker system prune -a
```

### 9.4 Monitoraggio

```bash
# Verifica salute container
docker-compose ps

# Verifica log per errori
docker-compose logs --tail=100 dashboard | grep -i error

# Verifica spazio disco
df -h

# Verifica temperatura
vcgencmd measure_temp
```

## Troubleshooting

### Container non si avviano

```bash
# Verifica log
docker-compose logs dashboard

# Riavvia
docker-compose restart

# Rebuild completo
docker-compose down
docker-compose up -d --build
```

### Non riesco ad accedere

```bash
# Verifica IP
hostname -I

# Verifica porta
netstat -tuln | grep 3050

# Verifica firewall
sudo ufw status
```

### Backup falliscono

```bash
# Verifica permessi
ls -la ~/raspberry-pi-dashboard/backups

# Verifica spazio
df -h

# Verifica Docker socket
ls -la /var/run/docker.sock
```

### NAS non raggiungibile

```bash
# Verifica connessione
ping 192.168.1.100

# Verifica mount
mount | grep nas

# Smonta e rimonta
sudo umount /mnt/nas
sudo mount -a
```

## Performance Tips

### Swap per Raspberry Pi

```bash
# Aumenta swap size
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Cambia CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Boot da SSD

Per performance migliori, fai boot da SSD invece che da SD:

1. Installa Raspberry Pi OS su SSD USB
2. Modifica bootloader config
3. Avvia da SSD

Guida: [Raspberry Pi Boot from USB](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-boot)

### Overclock (solo Pi 4/5)

```bash
sudo nano /boot/config.txt

# Aggiungi (usa con cautela):
over_voltage=6
arm_freq=2000
```

## Supporto

Per problemi:
1. Controlla i log: `docker-compose logs -f dashboard`
2. Verifica GitHub Issues
3. Consulta ARCHITECTURE.md per dettagli tecnici

## Next Steps

Ora che la Dashboard è installata e funzionante:

1. Configura backup automatici per i container critici
2. Imposta soglie alert personalizzate
3. Carica i tuoi documenti Office
4. Monitora le performance del Raspberry Pi
5. Ricevi notifiche push su iOS/macOS

Buon divertimento con la tua Dashboard! 🎉
