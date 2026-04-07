#!/bin/bash

echo "=========================================="
echo "  BoltDashPi5 - Script di Aggiornamento"
echo "  Ver.6.1Apr2026"
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
