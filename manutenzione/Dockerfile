FROM python:3.11-slim

LABEL maintainer="BoltUbuntu"
LABEL description="Modulo Manutenzione - BoltUbuntu Dashboard"
LABEL version="10.1Giu2026"

# Dipendenze di sistema necessarie
RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    lsof \
    iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Directory di lavoro
WORKDIR /app

# Copia requirements
COPY requirements.txt .

# Installa dipendenze Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia codice applicazione
COPY . .

# Esposizione porta
EXPOSE 3055

# Avvio tramite socketio.run() per supporto WebSocket corretto
CMD ["python", "app.py"]