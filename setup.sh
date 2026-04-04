#!/bin/bash

echo "=========================================="
echo "  Raspberry Pi Dashboard - Setup Script"
echo "  Ver.2.4Mar2026"
echo "=========================================="

# Crea cartelle necessarie
echo "📁 Creazione cartelle..."
mkdir -p data backups uploads

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

# Avvia i container
echo "🚀 Avvio container..."
docker-compose up -d --build

# Attendi avvio
echo "⏳ Attesa avvio servizi (30 secondi)..."
sleep 30

# Verifica stato
echo "📊 Stato servizi:"
docker-compose ps

# Mostra info accesso
echo ""
echo "=========================================="
echo "  ✅ INSTALLAZIONE COMPLETATA!"
echo "=========================================="
echo ""
echo "  🌐 Accedi alla dashboard:"
echo "     http://$(hostname -I | awk '{print $1}'):3050"
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
