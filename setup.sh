#!/bin/bash

echo "=========================================="
echo "  Raspberry Pi Dashboard - Setup Script"
echo "  Ver.2.4Mar2026"
echo "=========================================="

# Crea cartelle necessarie
echo "📁 Creazione cartelle..."
mkdir -p data backups uploads

# Crea file .env se non esiste
if [ ! -f "backend/.env" ]; then
    echo "📝 Creazione file .env backend..."
    echo "JWT_SECRET=raspberry_dashboard_secret_key_2024" > backend/.env
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
echo "     http://${LOCAL_IP}:3050"
echo ""
echo "  👤 Credenziali:"
echo "     Email:    admin@dashboard.local"
echo "     Password: admin123"
echo ""
echo "  📋 Comandi utili:"
echo "     docker-compose logs -f    # Visualizza log"
echo "     docker-compose restart    # Riavvia"
echo "     docker-compose down       # Ferma"
echo ""
echo "=========================================="
