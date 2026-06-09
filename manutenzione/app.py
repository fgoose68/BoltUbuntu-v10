#!/usr/bin/env python3
"""
BoltUbuntu - Modulo Manutenzione
Backend Flask + Flask-SocketIO per la pagina di manutenzione SaaS
Porta: 3055

NOTA: Sostituisce il vecchio File Manager nella WebApp principale
"""

import os
import json
import subprocess
import threading
import logging
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import eventlet
eventlet.monkey_patch()

# =============================================================================
# CONFIGURAZIONE - DA PERSONALIZZARE CON I TUOI PERCORSI REALI
# =============================================================================

# Cartelle di produzione delle WebApp (modifica con i tuoi percorsi reali)
WEBAPP_PATHS = {
    "webapp1": "/percorso/reale/webapp1",   # Es: "/home/fabrizio/projects/webapp1"
    "webapp2": "/percorso/reale/webapp2",   # Es: "/home/fabrizio/projects/webapp2"
    "webapp3": "/percorso/reale/webapp3",   # Es: "/home/fabrizio/projects/webapp3"
}

# Nomi dei servizi systemctl (modifica con i tuoi servizi reali)
SYSTEMCTL_SERVICES = {
    "webapp1": "webapp1.service",           # Es: "nginx", "docker", "postgresql"
    "webapp2": "webapp2.service",
    "webapp3": "webapp3.service",
}

# Configurazione aggiuntiva
SSD_MOUNT_POINT = "/"  # Punto di mount del tuo SSD
LOG_DIR = "/var/log"  # Directory dei log di sistema

# =============================================================================
# CONFIGURAZIONE PULSANTI (dinamica - salvata su file JSON)
# =============================================================================

BUTTONS_CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'buttons_config.json')

# Pulsanti predefiniti
DEFAULT_BUTTONS = [
    {
        "id": "btn-webapp1",
        "action": "update_webapp1",
        "label": "Aggiorna WebApp 1",
        "icon": "refresh",
        "enabled": True,
        "category": "webapp"
    },
    {
        "id": "btn-webapp2",
        "action": "update_webapp2",
        "label": "Aggiorna WebApp 2",
        "icon": "refresh",
        "enabled": True,
        "category": "webapp"
    },
    {
        "id": "btn-webapp3",
        "action": "update_webapp3",
        "label": "Aggiorna WebApp 3",
        "icon": "refresh",
        "enabled": True,
        "category": "webapp"
    },
    {
        "id": "btn-ports",
        "action": "check_ports",
        "label": "Verifica Porte",
        "icon": "network",
        "enabled": True,
        "category": "utility"
    },
    {
        "id": "btn-services",
        "action": "check_services",
        "label": "Stato Servizi SaaS",
        "icon": "server",
        "enabled": True,
        "category": "utility"
    },
    {
        "id": "btn-cleanup",
        "action": "cleanup",
        "label": "Pulizia Spazio e Log",
        "icon": "trash",
        "enabled": True,
        "category": "utility"
    }
]


def load_buttons_config():
    """Carica la configurazione dei pulsanti da file JSON"""
    if os.path.exists(BUTTONS_CONFIG_FILE):
        try:
            with open(BUTTONS_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return DEFAULT_BUTTONS.copy()


def save_buttons_config(buttons):
    """Salva la configurazione dei pulsanti su file JSON"""
    with open(BUTTONS_CONFIG_FILE, 'w') as f:
        json.dump(buttons, f, indent=4)


# Carica configurazione iniziale
BUTTONS = load_buttons_config()

# =============================================================================
# FINE CONFIGURAZIONE
# =============================================================================

# Configurazione Flask
app = Flask(__name__,
            template_folder='templates',
            static_folder='static')
app.config['SECRET_KEY'] = 'boltubuntu-maintenance-secret-2026'

# Inizializzazione SocketIO con eventlet (WebSocket nativo, no Werkzeug dev server)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=25
)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lock per prevenire esecuzioni simultanee
execution_lock = threading.Lock()
is_running = False


def stream_output(line: str, is_error: bool = False, sid: str = None):
    """Invia una linea di output al client via WebSocket"""
    kwargs = {'namespace': '/maintenance'}
    if sid:
        kwargs['to'] = sid
    socketio.emit('output', {
        'line': line,
        'is_error': is_error
    }, **kwargs)


def run_command_safe(command: str, cwd: str = None, sid: str = None) -> int:
    """
    Esegue un comando shell in modo sicuro con streaming output
    Ritorna 0 per successo, 1 per errore
    """
    global is_running

    try:
        process = subprocess.Popen(
            command,
            shell=True,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in process.stdout:
            line = line.rstrip()
            if line:
                stream_output(line, sid=sid)

        process.wait()
        return process.returncode

    except Exception as e:
        stream_output(f"ERRORE: {str(e)}", is_error=True, sid=sid)
        return 1


def get_service_status(service_name: str) -> tuple[bool, str]:
    """Verifica lo stato di un servizio systemctl"""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', service_name],
            capture_output=True,
            text=True,
            timeout=10
        )
        is_active = result.stdout.strip() == 'active'
        status = result.stdout.strip()
        return is_active, status
    except Exception as e:
        return False, f"error: {str(e)}"


# =============================================================================
# ROUTES
# =============================================================================

@app.route('/')
def index():
    """Pagina principale del modulo manutenzione"""
    return render_template('index.html')


@app.route('/api/buttons', methods=['GET'])
def get_buttons():
    """Restituisce la configurazione corrente dei pulsanti"""
    return jsonify(BUTTONS)


@app.route('/api/buttons', methods=['POST'])
def save_buttons():
    """Salva la nuova configurazione dei pulsanti"""
    global BUTTONS
    data = request.get_json()
    BUTTONS = data
    save_buttons_config(BUTTONS)
    return jsonify({"status": "ok", "message": "Configurazione salvata"})


@app.route('/api/buttons/<button_id>', methods=['DELETE'])
def delete_button(button_id):
    """Elimina un pulsante"""
    global BUTTONS
    BUTTONS = [b for b in BUTTONS if b['id'] != button_id]
    save_buttons_config(BUTTONS)
    return jsonify({"status": "ok", "message": f"Pulsante {button_id} eliminato"})


@app.route('/api/buttons/reorder', methods=['POST'])
def reorder_buttons():
    """Riordina i pulsanti"""
    global BUTTONS
    data = request.get_json()
    order = data.get('order', [])
    
    # Crea mappa dei pulsanti esistenti
    buttons_map = {b['id']: b for b in BUTTONS}
    
    # Riordina secondo l'ordine ricevuto
    new_order = []
    for bid in order:
        if bid in buttons_map:
            new_order.append(buttons_map[bid])
    
    # Aggiungi eventuali pulsanti non presenti nell'ordine
    for b in BUTTONS:
        if b['id'] not in order:
            new_order.append(b)
    
    BUTTONS = new_order
    save_buttons_config(BUTTONS)
    return jsonify({"status": "ok"})


# =============================================================================
# SOCKET.IO EVENT HANDLERS
# =============================================================================

@socketio.on('connect', namespace='/maintenance')
def handle_connect():
    """Client connesso"""
    logger.info("Client connesso al modulo manutenzione")
    emit('status', {'message': 'Connesso al modulo manutenzione'})
    # Invia anche la configurazione pulsanti aggiornata
    emit('buttons_config', {'buttons': BUTTONS})


@socketio.on('disconnect', namespace='/maintenance')
def handle_disconnect():
    """Client disconnesso"""
    logger.info("Client disconnesso")


@socketio.on('execute_action', namespace='/maintenance')
def handle_execute_action(data):
    """Avvia l'azione in un background task per non bloccare il loop eventlet"""
    global is_running

    action = data.get('action')
    sid = request.sid

    if is_running:
        emit('error', {'message': 'Operazione già in corso'})
        return

    socketio.start_background_task(_run_action_bg, sid, action)


def _run_action_bg(sid: str, action: str):
    """Esegue l'azione in background; emette gli eventi direttamente al client sid"""
    global is_running

    with execution_lock:
        is_running = True
        socketio.emit('execution_started', {'action': action}, to=sid, namespace='/maintenance')
        logger.info(f"Azione avviata: {action} (client {sid})")

        try:
            if action == 'update_webapp1':
                execute_webapp_update("webapp1", sid)
            elif action == 'update_webapp2':
                execute_webapp_update("webapp2", sid)
            elif action == 'update_webapp3':
                execute_webapp_update("webapp3", sid)
            elif action == 'check_ports':
                execute_check_ports(sid)
            elif action == 'check_services':
                execute_check_services(sid)
            elif action == 'cleanup':
                execute_cleanup(sid)
            elif action.startswith('custom_'):
                custom_id = action[len('custom_'):]
                execute_custom_command(custom_id, sid)
            else:
                socketio.emit('error', {'message': f'Azione sconosciuta: {action}'}, to=sid, namespace='/maintenance')

        except Exception as e:
            logger.error(f"Errore esecuzione azione: {e}")
            socketio.emit('error', {'message': str(e)}, to=sid, namespace='/maintenance')

        finally:
            is_running = False
            socketio.emit('execution_completed', {'action': action}, to=sid, namespace='/maintenance')


def execute_webapp_update(webapp_key: str, sid: str = None):
    """Esegue l'aggiornamento di una WebApp"""
    path = WEBAPP_PATHS.get(webapp_key)
    service = SYSTEMCTL_SERVICES.get(webapp_key)

    if not path:
        stream_output(f"ERRORE: Percorso per {webapp_key} non configurato", is_error=True, sid=sid)
        return

    stream_output(f"=== Aggiornamento {webapp_key.upper()} ===", sid=sid)
    stream_output(f"Cartella: {path}", sid=sid)

    stream_output("[1/5] Fetch origin...", sid=sid)
    ret = run_command_safe('git fetch origin', cwd=path, sid=sid)
    if ret != 0:
        stream_output("ATTENZIONE: Git fetch fallito o nessun remote", is_error=True, sid=sid)

    stream_output("[2/5] Reset hard origin/main...", sid=sid)
    ret = run_command_safe('git reset --hard origin/main', cwd=path, sid=sid)
    if ret != 0:
        stream_output("ERRORE: Git reset fallito", is_error=True, sid=sid)
        return

    req_file = os.path.join(path, 'requirements.txt')
    pkg_file = os.path.join(path, 'package.json')

    if os.path.exists(req_file):
        stream_output("[3/5] Aggiornamento dipendenze Python (pip)...", sid=sid)
        run_command_safe('pip3 install -r requirements.txt -q', cwd=path, sid=sid)
    elif os.path.exists(pkg_file):
        stream_output("[3/5] Aggiornamento dipendenze Node.js (npm)...", sid=sid)
        run_command_safe('npm install', cwd=path, sid=sid)
    else:
        stream_output("[3/5] Nessun requirements.txt o package.json trovato, skip", sid=sid)

    if service:
        stream_output(f"[4/5] Riavvio servizio {service}...", sid=sid)
        ret = run_command_safe(f'systemctl restart {service} 2>&1', sid=sid)
        if ret != 0:
            stream_output(f"  ⚠️  Impossibile riavviare {service} (verifica che esista)", sid=sid)
    else:
        stream_output("[4/5] Servizio non configurato, skip riavvio", sid=sid)

    stream_output("[5/5] Verifica stato...", sid=sid)
    if service:
        is_active, status = get_service_status(service)
        if is_active:
            stream_output(f"✓ Servizio {service} attivo", sid=sid)
        else:
            stream_output(f"⚠ Servizio {service} non attivo (status: {status})", sid=sid)
            stream_output("  Per riavviarlo manualmente: sudo systemctl restart " + service, sid=sid)

    stream_output(f"=== Aggiornamento {webapp_key.upper()} completato ===", sid=sid)


def execute_check_ports(sid: str = None):
    """Verifica le porte occupate"""
    stream_output("=== Verifica Porte Occupate ===", sid=sid)
    stream_output("", sid=sid)
    stream_output("Porte in ascolto sul sistema:", sid=sid)
    run_command_safe('ss -tulnp 2>/dev/null || lsof -i -P -n 2>/dev/null | grep LISTEN | head -30', sid=sid)
    stream_output("", sid=sid)
    stream_output("=== Verifica completata ===", sid=sid)


def execute_check_services(sid: str = None):
    """Verifica lo stato dei servizi critici"""
    stream_output("=== Stato Servizi SaaS ===", sid=sid)
    stream_output("", sid=sid)

    critical_services = ['nginx', 'docker', 'postgresql', 'mysql', 'ssh']
    all_services = set(critical_services + list(SYSTEMCTL_SERVICES.values()))

    for svc in sorted(all_services):
        is_active, status = get_service_status(svc)
        icon = "🟢" if is_active else "🔴"
        stream_output(f"{icon} {svc:<20} {status}", sid=sid)

    stream_output("", sid=sid)
    stream_output("=== Verifica completata ===", sid=sid)


def execute_cleanup(sid: str = None):
    """Esegue la pulizia del sistema"""
    stream_output("=== Pulizia Spazio e Log ===", sid=sid)
    stream_output("", sid=sid)

    stream_output("[1/4] Spazio su disco:", sid=sid)
    run_command_safe('df -h / | tail -1 | awk \'{print "  Disco: " $1 "\\n  Totale: " $2 "\\n  Usato: " $3 "\\n  Libero: " $4 " (" $5 ")"}\'', sid=sid)

    stream_output("", sid=sid)
    stream_output("[2/4] Pulizia cache apt...", sid=sid)
    run_command_safe('apt-get clean 2>&1', sid=sid)
    run_command_safe('apt-get autoremove -y 2>&1', sid=sid)
    stream_output("  Cache apt pulita ✓", sid=sid)

    stream_output("", sid=sid)
    stream_output("[3/4] Rotazione log di sistema...", sid=sid)
    run_command_safe('logrotate -f /etc/logrotate.conf 2>/dev/null || true', sid=sid)
    run_command_safe('find /var/log -name "*.gz" -mtime +7 -delete 2>/dev/null || true', sid=sid)
    stream_output("  Log di sistema ruotati ✓", sid=sid)

    stream_output("", sid=sid)
    stream_output("[4/4] Pulizia log applicazioni:", sid=sid)
    run_command_safe('find /tmp -name "*.log" -mtime +3 -delete 2>/dev/null || true', sid=sid)
    run_command_safe('find ~/.cache -type f -mtime +7 -delete 2>/dev/null || true', sid=sid)
    stream_output("  Cache utente pulita ✓", sid=sid)

    stream_output("", sid=sid)
    stream_output("Spazio dopo pulizia:", sid=sid)
    run_command_safe('df -h / | tail -1 | awk \'{print "  Libero: " $4 " (" $5 " usato)"}\'', sid=sid)
    stream_output("", sid=sid)
    stream_output("=== Pulizia completata ===", sid=sid)


def execute_custom_command(custom_id: str, sid: str = None):
    """Esegue un comando personalizzato dalla configurazione"""
    button = next((b for b in BUTTONS if b['id'] == custom_id), None)
    if not button:
        stream_output(f"ERRORE: Configurazione per id='{custom_id}' non trovata", is_error=True, sid=sid)
        return

    command = button.get('command', '')
    if not command:
        stream_output("ERRORE: Nessun comando configurato per questo pulsante", is_error=True, sid=sid)
        return

    stream_output(f"=== Esecuzione: {button['label']} ===", sid=sid)
    stream_output(f"Comando: {command}", sid=sid)
    stream_output("", sid=sid)
    run_command_safe(command, sid=sid)
    stream_output("", sid=sid)
    stream_output(f"=== Esecuzione completata ===", sid=sid)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("  BoltUbuntu - Modulo Manutenzione")
    print("  Porta: 3055")
    print("=" * 60)
    print()
    print("  URL: http://localhost:3055")
    print(" oppure iframe: <iframe src='http://localhost:3055'>")
    print()
    print("  Premi Ctrl+C per fermare")
    print("=" * 60)

    # Avvia il server
    socketio.run(
        app,
        host='0.0.0.0',
        port=3055,
        debug=False
    )