#!/bin/bash

echo "=========================================="
echo "  BoltUbuntu - Setup Script"
echo "  Ver.6.1Giu2026 (Ubuntu / Debian / ARM / x86_64)"
echo "=========================================="

TZ="Europe/Rome"
export TZ

echo "📍 Località: Roma, Italia | Fuso orario: $(date '+%Z') | Ora: $(date '+%H:%M')"

# Crea cartelle necessarie
echo "📁 Creazione cartelle..."
mkdir -p data backups uploads

# Crea file .env se non esiste
if [ ! -f ".env" ]; then
    echo "📝 Generazione file .env..."
    echo "DOCKER_GID=${DOCKER_GID}" > .env
    echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
    echo "TZ=Europe/Rome" >> .env
    echo "CORS_ORIGINS=http://localhost:3061,http://127.0.0.1:3061" >> .env
fi
if [ ! -f "backend/.env" ]; then
    echo "JWT_SECRET=$(openssl rand -hex 32)" > backend/.env
fi

# Verifica Docker
echo "🐳 Verifica Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non trovato! Installalo con: sudo apt install docker.io docker-compose"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose non trovato! Installalo con: sudo apt install docker-compose"
    exit 1
fi

echo "✅ Docker trovato"

# Rileva GID docker (varia tra Raspberry Pi OS, Ubuntu, Debian)
DOCKER_GID=$(getent group docker | cut -d: -f3)
if [ -z "$DOCKER_GID" ]; then
    DOCKER_GID=999
fi
echo "🔑 GID gruppo docker rilevato: ${DOCKER_GID}"
export DOCKER_GID

# Salva GID in file .env per docker-compose
echo "DOCKER_GID=${DOCKER_GID}" > .env

# Rileva architettura
ARCH=$(uname -m)
OS=$(. /etc/os-release && echo "$PRETTY_NAME")
echo "💻 Sistema: ${OS} (${ARCH})"

# Ferma eventuali container precedenti
echo "🛑 Pulizia container precedenti..."
docker-compose down 2>/dev/null

# Avvia i container
echo "🚀 Avvio container (build)..."
docker-compose up -d --build

# Attendi avvio
echo "⏳ Attesa avvio servizi (30 secondi)..."
sleep 30

# Verifica stato
echo "📊 Stato servizi:"
docker-compose ps

# Mostra info accesso
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=========================================="
echo "  ✅ INSTALLAZIONE COMPLETATA!"
echo "=========================================="
echo ""
echo "  🌐 Accedi alla dashboard:"
echo "     http://${LOCAL_IP}:3061"
echo ""
echo "  👤 Credenziali di default (CAMBIA SUBITO):"
echo "     Email:    admin@dashboard.local"
echo "     Password: admin123"
echo ""
echo "  📍 Località: Roma | TZ: $(date '+%Z') | Ora: $(date '+%H:%M')"
echo ""
echo "  📋 Comandi utili:"
echo "     docker-compose logs -f    # Visualizza log"
echo "     docker-compose restart    # Riavvia"
echo "     docker-compose down       # Ferma"
echo ""
echo "=========================================="
