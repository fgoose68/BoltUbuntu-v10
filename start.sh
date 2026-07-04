#!/bin/bash
# BoltUbuntu - Script di avvio pulito
# Pulisce le porte e avvia i servizi senza conflitti

set -e

PORTS=(8001 3050 3055 3061)
PROJECT_DIR="/Users/fabrizio/Desktop/AppWeb/BoltUbuntu bozza lavoro"

echo "=========================================="
echo "  BoltUbuntu - Avvio Pulito (Ver.10.1Giu2026)"
echo "=========================================="
echo ""

# 1. Ferma tutti i processi sulle porte del progetto
echo "🧹 Pulizia porte in uso..."
for PORT in "${PORTS[@]}"; do
    PID=$(lsof -nP -i :$PORT | grep LISTEN | awk '{print $2}' | head -1)
    if [ -n "$PID" ]; then
        echo "   Fermatura processo PID $PID sulla porta $PORT..."
        kill -9 $PID 2>/dev/null || true
        sleep 1
    else
        echo "   Porta $PORT libera ✓"
    fi
done

# 2. Verifica che le porte siano libere
echo ""
echo "✅ Verifica porte..."
for PORT in "${PORTS[@]}"; do
    if lsof -nP -i :$PORT | grep -q LISTEN; then
        echo "❌ Porta $PORT ancora occupata!"
        lsof -nP -i :$PORT
        exit 1
    else
        echo "   Porta $PORT: libera ✓"
    fi
done

# 3. Avvia backend Python
echo ""
echo "🚀 Avvio Backend (porta 8001)..."
cd "$PROJECT_DIR/backend"
nohup python3 -m uvicorn server:app --host 0.0.0.0 --port 8001 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend avviato (PID: $BACKEND_PID)"

# 4. Attende che il backend sia pronto
echo "   Attesa backend..."
for i in {1..10}; do
    if curl -s --max-time 2 http://localhost:8001/api/health > /dev/null 2>&1; then
        echo "   Backend pronto ✓"
        break
    fi
    sleep 1
done

# 5. Avvia frontend Vite
echo ""
echo "🚀 Avvio Frontend (porta 3061)..."
cd "$PROJECT_DIR/frontend"
nohup npx vite --host 0.0.0.0 --port 3061 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend avviato (PID: $FRONTEND_PID)"

# 6. Attende che il frontend sia pronto
echo "   Attesa frontend..."
for i in {1..10}; do
    if curl -s --max-time 2 http://localhost:3061/ > /dev/null 2>&1; then
        echo "   Frontend pronto ✓"
        break
    fi
    sleep 1
done

# 7. Avvia modulo Manutenzione (Flask + SocketIO)
echo ""
echo "🚀 Avvio Modulo Manutenzione (porta 3055)..."
cd "$PROJECT_DIR/manutenzione"
nohup python3 app.py > /tmp/manutenzione.log 2>&1 &
MAINT_PID=$!
echo "   Manutenzione avviato (PID: $MAINT_PID)"

# 8. Attende che il modulo sia pronto
echo "   Attesa manutenzione..."
for i in {1..10}; do
    if curl -s --max-time 2 http://localhost:3055/ > /dev/null 2>&1; then
        echo "   Manutenzione pronto ✓"
        break
    fi
    sleep 1
done

echo ""
echo "=========================================="
echo "  ✅ BoltUbuntu avviato!"
echo "=========================================="
echo ""
echo "   Frontend: http://localhost:3061/"
echo "   Backend:  http://localhost:8001/"
echo "   Manutenzione: http://localhost:3055/"
echo ""
echo "   Log: tail -f /tmp/backend.log"
echo "        tail -f /tmp/frontend.log"
echo "        tail -f /tmp/manutenzione.log"
echo ""
echo "=========================================="