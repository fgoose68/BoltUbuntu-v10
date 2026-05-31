from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sqlite3
import bcrypt
import jwt
import os
import psutil
import socket
import subprocess
import shutil
from datetime import datetime, timedelta
from uuid import uuid4
from pathlib import Path
import asyncio
import json

app = FastAPI(title="Raspberry Pi Dashboard API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
JWT_SECRET = os.environ.get("JWT_SECRET", "raspberry_dashboard_secret_key_2024")
DB_PATH = Path("/app/data/dashboard.db")
BACKUP_PATH = Path("/app/backups")
UPLOAD_PATH = Path("/app/uploads/office")
NAS_PATH = Path("/mnt/nas")

# Create directories
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
BACKUP_PATH.mkdir(parents=True, exist_ok=True)
UPLOAD_PATH.mkdir(parents=True, exist_ok=True)

security = HTTPBearer(auto_error=False)

# Check if Docker is available
def is_docker_available():
    try:
        result = subprocess.run(["docker", "version"], capture_output=True, timeout=5)
        return result.returncode == 0
    except Exception as e:
        print(f"Docker check error: {e}")
        return False

# Check Docker at startup
DOCKER_AVAILABLE = is_docker_available()
print(f"Docker available at startup: {DOCKER_AVAILABLE}")

# Database
def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS metrics (
            id TEXT PRIMARY KEY,
            cpu_usage REAL,
            memory_usage REAL,
            disk_usage REAL,
            temperature REAL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS docker_backups (
            id TEXT PRIMARY KEY,
            container_id TEXT,
            container_name TEXT NOT NULL,
            backup_path TEXT NOT NULL,
            backup_type TEXT DEFAULT 'export',
            destination TEXT DEFAULT 'local',
            size INTEGER,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT
        );
        
        CREATE TABLE IF NOT EXISTS backup_schedules (
            id TEXT PRIMARY KEY,
            container_id TEXT NOT NULL,
            container_name TEXT NOT NULL,
            cron_expression TEXT NOT NULL,
            backup_type TEXT DEFAULT 'export',
            destination TEXT DEFAULT 'local',
            enabled INTEGER DEFAULT 1,
            last_run TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            storage_path TEXT NOT NULL,
            storage_location TEXT DEFAULT 'local',
            mime_type TEXT,
            uploaded_by TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, key)
        );
        
        CREATE TABLE IF NOT EXISTS pushover_config (
            id TEXT PRIMARY KEY,
            user_key TEXT,
            api_token TEXT,
            enabled INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS event_logs (
            id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            severity TEXT DEFAULT 'info',
            message TEXT NOT NULL,
            details TEXT,
            user_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_updates (
            id TEXT PRIMARY KEY,
            update_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            packages_updated INTEGER DEFAULT 0,
            log_output TEXT,
            error_message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS update_scheduler (
            id TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 0,
            interval_hours INTEGER DEFAULT 24,
            last_run TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # Migration: Add missing columns to docker_backups if they don't exist
    try:
        cursor.execute("SELECT container_id FROM docker_backups LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding container_id column to docker_backups...")
        cursor.execute("ALTER TABLE docker_backups ADD COLUMN container_id TEXT")
    
    try:
        cursor.execute("SELECT backup_type FROM docker_backups LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding backup_type column to docker_backups...")
        cursor.execute("ALTER TABLE docker_backups ADD COLUMN backup_type TEXT DEFAULT 'export'")
    
    try:
        cursor.execute("SELECT destination FROM docker_backups LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding destination column to docker_backups...")
        cursor.execute("ALTER TABLE docker_backups ADD COLUMN destination TEXT DEFAULT 'local'")
    
    try:
        cursor.execute("SELECT size FROM docker_backups LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding size column to docker_backups...")
        cursor.execute("ALTER TABLE docker_backups ADD COLUMN size INTEGER")
    
    try:
        cursor.execute("SELECT error_message FROM docker_backups LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding error_message column to docker_backups...")
        cursor.execute("ALTER TABLE docker_backups ADD COLUMN error_message TEXT")
    
    try:
        cursor.execute("SELECT completed_at FROM docker_backups LIMIT 1")
    except sqlite3.OperationalError:
        print("Adding completed_at column to docker_backups...")
        cursor.execute("ALTER TABLE docker_backups ADD COLUMN completed_at TEXT")
    
    conn.commit()
    
    # Create admin user if not exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        admin_id = str(uuid4())
        hashed_pw = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)",
            (admin_id, "admin@dashboard.local", hashed_pw, "Admin User")
        )
        print("Default admin user created: admin@dashboard.local / admin123")
    
    conn.commit()
    conn.close()

init_db()

# Logging helper
def log_event(event_type: str, severity: str, message: str, details: dict = None, user_id: str = None):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO event_logs (id, event_type, severity, message, details, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid4()), event_type, severity, message, json.dumps(details) if details else None, user_id)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Log error: {e}")

# Auth helpers
def create_token(user_id: str, email: str) -> str:
    payload = {
        "userId": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Access token required")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Pushover notification
async def send_pushover(title: str, message: str, priority: int = 0):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pushover_config WHERE enabled = 1")
        config = cursor.fetchone()
        conn.close()
        
        if not config:
            return False
        
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post("https://api.pushover.net/1/messages.json", data={
                "token": config["api_token"],
                "user": config["user_key"],
                "title": title,
                "message": message,
                "priority": priority
            })
        return True
    except:
        return False

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class BackupRequest(BaseModel):
    destination: str = "local"
    backupType: str = "export"
    containerName: str = "unknown"

class ScheduleRequest(BaseModel):
    containerUuid: str
    containerName: str
    cronExpression: str
    backupType: str = "export"
    destination: str = "local"

class PushoverConfigRequest(BaseModel):
    userKey: str
    apiToken: str
    enabled: bool

class SettingRequest(BaseModel):
    value: str

# Routes - Health
@app.get("/api/health")
def health():
    docker_ok = is_docker_available()
    return {
        "status": "ok", 
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "dockerAvailable": docker_ok
    }

@app.get("/api/debug/docker")
def debug_docker():
    """Debug endpoint to check Docker status"""
    docker_ok = is_docker_available()
    result = {
        "dockerAvailable": docker_ok,
        "dockerSocket": os.path.exists("/var/run/docker.sock"),
        "containers": []
    }
    
    if docker_ok:
        try:
            ps_result = subprocess.run(
                ["docker", "ps", "-a", "--format", "{{.ID}}:{{.Names}}:{{.State}}"],
                capture_output=True, text=True, timeout=10
            )
            result["dockerOutput"] = ps_result.stdout
            result["dockerError"] = ps_result.stderr
            result["returnCode"] = ps_result.returncode
            
            for line in ps_result.stdout.strip().split('\n'):
                if line:
                    parts = line.split(':')
                    if len(parts) >= 3:
                        result["containers"].append({
                            "id": parts[0],
                            "name": parts[1],
                            "state": parts[2]
                        })
        except Exception as e:
            result["error"] = str(e)
    
    return result

# Routes - Auth
@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not bcrypt.checkpw(req.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    log_event("login", "info", f"User logged in: {req.email}", user_id=user["id"])
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"]}
    }

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid4())
    hashed_pw = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    cursor.execute(
        "INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)",
        (user_id, req.email, hashed_pw, req.name)
    )
    conn.commit()
    conn.close()
    
    log_event("login", "info", f"User registered: {req.email}", user_id=user_id)
    token = create_token(user_id, req.email)
    return {
        "token": token,
        "user": {"id": user_id, "email": req.email, "name": req.name}
    }

@app.get("/api/auth/me")
def get_me(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name FROM users WHERE id = ?", (payload["userId"],))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

# Routes - Metrics
@app.get("/api/metrics/current")
def get_current_metrics(payload: dict = Depends(verify_token)):
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Get temperature (works on Raspberry Pi)
    cpu_temp = 0
    try:
        # Try Raspberry Pi thermal zone
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            cpu_temp = int(f.read().strip()) / 1000
    except:
        try:
            temps = psutil.sensors_temperatures()
            if temps.get('cpu_thermal'):
                cpu_temp = temps['cpu_thermal'][0].current
            elif temps.get('coretemp'):
                cpu_temp = temps['coretemp'][0].current
        except:
            pass
    
    # Get network info
    local_ip = "N/A"
    public_ip = "N/A"
    iface = "eth0"
    
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        pass
    
    try:
        import urllib.request
        public_ip = urllib.request.urlopen('https://api.ipify.org', timeout=3).read().decode()
    except:
        pass
    
    try:
        for name, addrs in psutil.net_if_addrs().items():
            if name not in ['lo', 'localhost']:
                for addr in addrs:
                    if addr.family == socket.AF_INET and addr.address == local_ip:
                        iface = name
                        break
    except:
        pass
    
    metrics = {
        "cpu": {"usage": round(cpu_percent, 2), "cores": psutil.cpu_count()},
        "ram": {
            "total": round(memory.total / 1024 / 1024),
            "used": round(memory.used / 1024 / 1024),
            "free": round(memory.available / 1024 / 1024),
            "usage": round(memory.percent, 2)
        },
        "disk": {
            "total": round(disk.total / 1024 / 1024 / 1024),
            "used": round(disk.used / 1024 / 1024 / 1024),
            "free": round(disk.free / 1024 / 1024 / 1024),
            "usage": round(disk.percent, 2)
        },
        "temperature": {"cpu": round(cpu_temp, 1)},
        "network": {"ipLocal": local_ip, "ipPublic": public_ip, "interface": iface}
    }
    
    # Store metric
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO metrics (id, cpu_usage, memory_usage, disk_usage, temperature) VALUES (?, ?, ?, ?, ?)",
        (str(uuid4()), metrics["cpu"]["usage"], metrics["ram"]["usage"], metrics["disk"]["usage"], cpu_temp)
    )
    conn.commit()
    conn.close()
    
    return {"metrics": metrics}

@app.get("/api/metrics/history")
def get_metrics_history(hours: int = 24, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM metrics WHERE timestamp >= datetime('now', ?) ORDER BY timestamp ASC",
        (f"-{hours} hours",)
    )
    metrics = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"metrics": metrics}

# Routes - Docker
@app.get("/api/docker/containers")
def get_containers(payload: dict = Depends(verify_token)):
    if not is_docker_available():
        return {"containers": [], "dockerAvailable": False, "error": "Docker not available"}
    
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{.ID}}|||{{.Names}}|||{{.Image}}|||{{.Status}}|||{{.State}}"],
            capture_output=True, text=True, timeout=10
        )
        
        if result.returncode != 0:
            return {"containers": [], "dockerAvailable": False, "error": result.stderr}
        
        containers = []
        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('|||')
                if len(parts) >= 5:
                    containers.append({
                        "id": parts[0],
                        "name": parts[1],
                        "image": parts[2],
                        "status": parts[3],
                        "state": parts[4]
                    })
        
        return {"containers": containers, "dockerAvailable": True}
    except Exception as e:
        return {"containers": [], "dockerAvailable": False, "error": str(e)}

@app.get("/api/docker/containers/status")
def get_containers_status(payload: dict = Depends(verify_token)):
    if not is_docker_available():
        return {"containers": [], "dockerAvailable": False, "error": "Docker not available"}
    
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{.ID}}|||{{.Names}}|||{{.Image}}|||{{.State}}|||{{.Status}}|||{{.CreatedAt}}|||{{.Ports}}"],
            capture_output=True, text=True, timeout=10
        )
        
        containers = []
        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('|||')
                if len(parts) >= 5:
                    containers.append({
                        "id": parts[0],
                        "name": parts[1],
                        "image": parts[2],
                        "state": parts[3],
                        "status": parts[4],
                        "created": parts[5] if len(parts) > 5 else "",
                        "ports": parts[6].split(',') if len(parts) > 6 and parts[6] else []
                    })
        
        return {"containers": containers, "dockerAvailable": True}
    except Exception as e:
        return {"containers": [], "dockerAvailable": False, "error": str(e)}

@app.post("/api/docker/backup/{container_id}")
async def backup_container(container_id: str, req: BackupRequest, payload: dict = Depends(verify_token)):
    print(f"Backup request received: container_id={container_id}, req={req}")
    
    # Check Docker dynamically
    if not is_docker_available():
        raise HTTPException(status_code=503, detail="Docker not available - check if docker socket is mounted")
    
    # Verify container exists
    try:
        print(f"Checking container {container_id}...")
        check_result = subprocess.run(
            ["docker", "inspect", container_id],
            capture_output=True, text=True, timeout=10
        )
        print(f"Docker inspect result: returncode={check_result.returncode}, stderr={check_result.stderr}")
        if check_result.returncode != 0:
            raise HTTPException(status_code=404, detail=f"Container {container_id} not found")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Docker command timed out")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking container: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking container: {str(e)}")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Determine backup path
    if req.destination == "nas" and NAS_PATH.exists():
        backup_dir = NAS_PATH / "backups"
    else:
        backup_dir = BACKUP_PATH
    
    print(f"Backup dir: {backup_dir}")
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_file = backup_dir / f"{req.containerName}_{timestamp}.tar"
    print(f"Backup file: {backup_file}")
    
    # Create backup record
    backup_id = str(uuid4())
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO docker_backups (id, container_id, container_name, backup_path, backup_type, destination, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (backup_id, container_id, req.containerName, str(backup_file), req.backupType, req.destination, "running")
        )
        conn.commit()
        conn.close()
        print(f"Backup record created: {backup_id}")
    except Exception as e:
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # Run backup async
    asyncio.create_task(perform_backup(backup_id, container_id, str(backup_file), req.backupType, req.containerName, payload["userId"]))
    
    return {"message": "Backup started", "backupId": backup_id}

async def perform_backup(backup_id: str, container_id: str, backup_path: str, backup_type: str, container_name: str, user_id: str):
    try:
        if backup_type == "export":
            cmd = ["docker", "export", "-o", backup_path, container_id]
        else:
            # commit + save
            subprocess.run(["docker", "commit", container_id, f"backup_{container_id}"], check=True, timeout=300)
            cmd = ["docker", "save", "-o", backup_path, f"backup_{container_id}"]
        
        result = subprocess.run(cmd, capture_output=True, timeout=600)
        
        if result.returncode == 0:
            file_size = os.path.getsize(backup_path)
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE docker_backups SET status = ?, size = ?, completed_at = ? WHERE id = ?",
                ("completed", file_size, datetime.utcnow().isoformat(), backup_id)
            )
            conn.commit()
            conn.close()
            
            log_event("backup", "info", f"Backup completed: {container_name}", {"size": file_size}, user_id)
            await send_pushover("Backup Completed", f"{container_name} backup done ({file_size // 1024 // 1024} MB)")
        else:
            raise Exception(result.stderr.decode())
            
    except Exception as e:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE docker_backups SET status = ?, error_message = ?, completed_at = ? WHERE id = ?",
            ("failed", str(e), datetime.utcnow().isoformat(), backup_id)
        )
        conn.commit()
        conn.close()
        
        log_event("backup", "error", f"Backup failed: {container_name}", {"error": str(e)}, user_id)
        await send_pushover("Backup Failed", f"{container_name}: {str(e)}", priority=1)

@app.get("/api/docker/backups")
def get_backups(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM docker_backups ORDER BY created_at DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    
    # Format backups for frontend
    backups = []
    for row in rows:
        backup = dict(row)
        # Map fields to frontend expected format
        backups.append({
            "id": backup.get("id"),
            "backup_type": backup.get("backup_type", "export"),
            "file_path": backup.get("backup_path", ""),
            "file_size": backup.get("size", 0) or 0,
            "destination": backup.get("destination", "local"),
            "status": backup.get("status", "pending"),
            "created_at": backup.get("created_at", ""),
            "completed_at": backup.get("completed_at", ""),
            "container": {
                "name": backup.get("container_name", "unknown"),
                "image": ""
            }
        })
    
    return {"backups": backups}

@app.delete("/api/docker/backups/{backup_id}")
def delete_backup(backup_id: str, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get backup info
    cursor.execute("SELECT * FROM docker_backups WHERE id = ?", (backup_id,))
    backup = cursor.fetchone()
    
    if not backup:
        conn.close()
        raise HTTPException(status_code=404, detail="Backup not found")
    
    backup_dict = dict(backup)
    backup_path = backup_dict.get("backup_path", "")
    
    # Delete file from disk
    if backup_path:
        try:
            file_path = Path(backup_path)
            if file_path.exists():
                file_path.unlink()
                print(f"Deleted backup file: {backup_path}")
        except Exception as e:
            print(f"Error deleting file {backup_path}: {e}")
    
    # Delete from database
    cursor.execute("DELETE FROM docker_backups WHERE id = ?", (backup_id,))
    conn.commit()
    conn.close()
    
    log_event("backup", "info", f"Backup deleted: {backup_dict.get('container_name', 'unknown')}", user_id=payload["userId"])
    
    return {"message": "Backup deleted"}

# Docker container control
@app.post("/api/docker/containers/{container_id}/start")
def start_container(container_id: str, payload: dict = Depends(verify_token)):
    if not DOCKER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Docker not available")
    result = subprocess.run(["docker", "start", container_id], capture_output=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.decode())
    log_event("docker", "info", f"Container started: {container_id}", user_id=payload["userId"])
    return {"message": "Container started"}

@app.post("/api/docker/containers/{container_id}/stop")
def stop_container(container_id: str, payload: dict = Depends(verify_token)):
    if not DOCKER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Docker not available")
    result = subprocess.run(["docker", "stop", container_id], capture_output=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.decode())
    log_event("docker", "info", f"Container stopped: {container_id}", user_id=payload["userId"])
    return {"message": "Container stopped"}

@app.post("/api/docker/containers/{container_id}/restart")
def restart_container(container_id: str, payload: dict = Depends(verify_token)):
    if not DOCKER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Docker not available")
    result = subprocess.run(["docker", "restart", container_id], capture_output=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.decode())
    log_event("docker", "info", f"Container restarted: {container_id}", user_id=payload["userId"])
    return {"message": "Container restarted"}

@app.post("/api/docker/containers/{container_id}/pause")
def pause_container(container_id: str, payload: dict = Depends(verify_token)):
    if not DOCKER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Docker not available")
    result = subprocess.run(["docker", "pause", container_id], capture_output=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.decode())
    return {"message": "Container paused"}

@app.post("/api/docker/containers/{container_id}/unpause")
def unpause_container(container_id: str, payload: dict = Depends(verify_token)):
    if not DOCKER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Docker not available")
    result = subprocess.run(["docker", "unpause", container_id], capture_output=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr.decode())
    return {"message": "Container unpaused"}

# Backup schedules
@app.get("/api/docker/schedules")
def get_schedules(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM backup_schedules ORDER BY created_at DESC")
    schedules = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"schedules": schedules}

@app.post("/api/docker/schedules")
def create_schedule(req: ScheduleRequest, payload: dict = Depends(verify_token)):
    schedule_id = str(uuid4())
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO backup_schedules (id, container_id, container_name, cron_expression, backup_type, destination) VALUES (?, ?, ?, ?, ?, ?)",
        (schedule_id, req.containerUuid, req.containerName, req.cronExpression, req.backupType, req.destination)
    )
    conn.commit()
    conn.close()
    return {"message": "Schedule created", "scheduleId": schedule_id}

@app.delete("/api/docker/schedules/{schedule_id}")
def delete_schedule(schedule_id: str, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM backup_schedules WHERE id = ?", (schedule_id,))
    conn.commit()
    conn.close()
    return {"message": "Schedule deleted"}

# Routes - Files
ALLOWED_EXTENSIONS = {'.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.pdf'}

@app.get("/api/files/list")
def get_files(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM files ORDER BY created_at DESC")
    files = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"files": files}

@app.post("/api/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    destination: str = Form("local"),
    payload: dict = Depends(verify_token)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Determine storage path
    if destination == "nas" and NAS_PATH.exists():
        storage_dir = NAS_PATH / "office"
    else:
        storage_dir = UPLOAD_PATH
    
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    unique_name = f"{uuid4()}{ext}"
    file_path = storage_dir / unique_name
    
    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    file_id = str(uuid4())
    file_size = len(content)
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO files (id, filename, file_type, file_size, storage_path, storage_location, mime_type, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (file_id, file.filename, ext, file_size, str(file_path), destination, file.content_type, payload["userId"])
    )
    conn.commit()
    conn.close()
    
    log_event("upload", "info", f"File uploaded: {file.filename}", {"size": file_size}, payload["userId"])
    await send_pushover("File Uploaded", f"{file.filename} ({file_size // 1024} KB)")
    
    return {"message": "File uploaded", "file": {"id": file_id, "filename": file.filename}}

@app.get("/api/files/download/{file_id}")
def download_file(file_id: str, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
    file = cursor.fetchone()
    conn.close()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not Path(file["storage_path"]).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    log_event("download", "info", f"File downloaded: {file['filename']}", user_id=payload["userId"])
    return FileResponse(file["storage_path"], filename=file["filename"])

@app.delete("/api/files/{file_id}")
def delete_file(file_id: str, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
    file = cursor.fetchone()
    
    if not file:
        conn.close()
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    try:
        Path(file["storage_path"]).unlink(missing_ok=True)
    except:
        pass
    
    cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))
    conn.commit()
    conn.close()
    
    log_event("upload", "info", f"File deleted: {file['filename']}", user_id=payload["userId"])
    return {"message": "File deleted"}

# Routes - Settings
@app.get("/api/settings")
def get_settings(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings WHERE user_id = ?", (payload["userId"],))
    settings = {row["key"]: row["value"] for row in cursor.fetchall()}
    conn.close()
    return {"settings": settings}

@app.put("/api/settings/{key}")
def update_setting(key: str, req: SettingRequest, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM settings WHERE user_id = ? AND key = ?", (payload["userId"], key))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute(
            "UPDATE settings SET value = ?, updated_at = ? WHERE user_id = ? AND key = ?",
            (req.value, datetime.utcnow().isoformat(), payload["userId"], key)
        )
    else:
        cursor.execute(
            "INSERT INTO settings (id, user_id, key, value) VALUES (?, ?, ?, ?)",
            (str(uuid4()), payload["userId"], key, req.value)
        )
    
    conn.commit()
    conn.close()
    return {"message": "Setting updated"}

@app.get("/api/settings/logs")
def get_logs(limit: int = 100, type: str = None, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    if type:
        cursor.execute("SELECT * FROM event_logs WHERE event_type = ? ORDER BY created_at DESC LIMIT ?", (type, limit))
    else:
        cursor.execute("SELECT * FROM event_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"logs": logs}

# Routes - Notifications/Pushover
@app.get("/api/notifications/config")
def get_pushover_config(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM pushover_config LIMIT 1")
    config = cursor.fetchone()
    conn.close()
    
    if config:
        return {"userKey": config["user_key"] or "", "apiToken": config["api_token"] or "", "enabled": bool(config["enabled"])}
    return {"userKey": "", "apiToken": "", "enabled": False}

@app.post("/api/notifications/config")
def save_pushover_config(req: PushoverConfigRequest, payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM pushover_config LIMIT 1")
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute(
            "UPDATE pushover_config SET user_key = ?, api_token = ?, enabled = ? WHERE id = ?",
            (req.userKey, req.apiToken, 1 if req.enabled else 0, existing["id"])
        )
    else:
        cursor.execute(
            "INSERT INTO pushover_config (id, user_key, api_token, enabled) VALUES (?, ?, ?, ?)",
            (str(uuid4()), req.userKey, req.apiToken, 1 if req.enabled else 0)
        )
    
    conn.commit()
    conn.close()
    return {"message": "Pushover config saved"}

@app.post("/api/notifications/test")
async def test_notification(payload: dict = Depends(verify_token)):
    success = await send_pushover("Test Notification", "This is a test from your Raspberry Pi Dashboard")
    if success:
        return {"message": "Test notification sent successfully"}
    return {"message": "Pushover not configured or failed"}

@app.get("/api/notifications/list")
def get_notifications(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM event_logs WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50",
        (payload["userId"],)
    )
    notifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"notifications": notifications}

# ============================================================
# Routes - System Updates (OS / Kernel / Reboot)
# ============================================================

# In-memory scheduler task ref (initialised lazily)
_scheduler_task: Optional[asyncio.Task] = None


def _get_scheduler_row():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM update_scheduler LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row


def _ensure_scheduler_row():
    row = _get_scheduler_row()
    if not row:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO update_scheduler (id, enabled, interval_hours) VALUES (?, ?, ?)",
            (str(uuid4()), 0, 24)
        )
        conn.commit()
        conn.close()
        row = _get_scheduler_row()
    return row


def _format_uptime() -> str:
    try:
        with open("/proc/uptime", "r") as f:
            seconds = float(f.read().split()[0])
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{days}d {hours}h {minutes}m"
    except Exception:
        return "N/A"


def _kernel_version() -> str:
    try:
        if _in_container():
            cmd = ["nsenter", "-t", "1", "-m", "-u", "-n", "-i", "--", "uname", "-r"]
        else:
            cmd = ["uname", "-r"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return result.stdout.strip() or "N/A"
    except Exception:
        return "N/A"


def _last_update_at() -> Optional[str]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT created_at FROM system_updates WHERE update_type IN ('system','kernel') AND status = 'completed' ORDER BY created_at DESC LIMIT 1"
    )
    row = cursor.fetchone()
    conn.close()
    return row["created_at"] if row else None


def _os_info() -> Dict[str, str]:
    """Read OS info from /etc/os-release (host's via nsenter when containerized)."""
    try:
        if _in_container():
            result = subprocess.run(
                ["nsenter", "-t", "1", "-m", "-u", "-n", "-i", "--", "cat", "/etc/os-release"],
                capture_output=True, text=True, timeout=5
            )
            content = result.stdout
        else:
            with open("/etc/os-release", "r") as f:
                content = f.read()
        data = {}
        for line in content.splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                data[k.strip()] = v.strip().strip('"')
        return {
            "name": data.get("PRETTY_NAME") or data.get("NAME") or "Unknown",
            "version": data.get("VERSION") or data.get("VERSION_ID") or "",
            "id": data.get("ID") or "linux",
        }
    except Exception:
        return {"name": "Unknown", "version": "", "id": "linux"}


def _arch() -> str:
    try:
        if _in_container():
            result = subprocess.run(
                ["nsenter", "-t", "1", "-m", "-u", "-n", "-i", "--", "uname", "-m"],
                capture_output=True, text=True, timeout=5
            )
            return result.stdout.strip()
        result = subprocess.run(["uname", "-m"], capture_output=True, text=True, timeout=5)
        return result.stdout.strip()
    except Exception:
        return "unknown"


@app.get("/api/system/info")
def system_info(payload: dict = Depends(verify_token)):
    sched = _ensure_scheduler_row()
    os_data = _os_info()
    return {
        "kernel_version": _kernel_version(),
        "uptime": _format_uptime(),
        "last_update": _last_update_at(),
        "os_name": os_data["name"],
        "os_version": os_data["version"],
        "os_id": os_data["id"],
        "architecture": _arch(),
        "scheduler": {
            "enabled": bool(sched["enabled"]),
            "interval_hours": sched["interval_hours"],
            "last_run": sched["last_run"],
            "running": _scheduler_task is not None and not _scheduler_task.done(),
        }
    }


def _in_container() -> bool:
    """Detect if we're running inside a Docker container."""
    return Path("/.dockerenv").exists()


def _run_apt(args: List[str], timeout: int = 600) -> Dict[str, Any]:
    """Run apt-get command with non-interactive env. Returns stdout/stderr/returncode.

    Strategy:
    - When running natively on the host (e.g. Raspberry Pi without Docker, or dev env):
      execute apt-get directly.
    - When running inside a Docker container (production deploy on Pi):
      use `nsenter -t 1 -m -u -n -i` to enter the host's namespaces and run
      the host's apt-get. This requires `privileged: true` and `pid: host` in
      docker-compose.yml. This avoids library mismatch issues caused by
      bind-mounting /usr/bin/apt-get.
    """
    env = os.environ.copy()
    env["DEBIAN_FRONTEND"] = "noninteractive"
    if _in_container():
        cmd = ["nsenter", "-t", "1", "-m", "-u", "-n", "-i", "--", "apt-get"] + args
    else:
        cmd = ["apt-get"] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
        return {
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
    except FileNotFoundError as e:
        return {"returncode": 127, "stdout": "", "stderr": f"Command not found: {e}. If running in Docker, ensure 'pid: host' and 'privileged: true' are set in docker-compose.yml"}
    except subprocess.TimeoutExpired:
        return {"returncode": 124, "stdout": "", "stderr": f"Timeout after {timeout}s"}
    except Exception as e:
        return {"returncode": 1, "stdout": "", "stderr": str(e)}


@app.post("/api/system/check-updates")
def check_updates(payload: dict = Depends(verify_token)):
    upd = _run_apt(["update", "-q"], timeout=120)
    if upd["returncode"] != 0:
        raise HTTPException(status_code=500, detail=f"apt update failed: {upd['stderr']}")

    lst = _run_apt(["-s", "upgrade"], timeout=60)
    packages: List[str] = []
    kernel_update = False
    for line in (lst["stdout"] or "").splitlines():
        # apt -s upgrade prints "Inst <pkg> [oldver] (newver ...)"
        if line.startswith("Inst "):
            parts = line.split()
            if len(parts) >= 2:
                pkg = parts[1]
                packages.append(pkg)
                if pkg.startswith("linux-image") or pkg.startswith("raspberrypi-kernel") or pkg.startswith("linux-headers"):
                    kernel_update = True

    return {
        "packages_count": len(packages),
        "packages": packages,
        "kernel_update_available": kernel_update,
        "checked_at": datetime.utcnow().isoformat() + "Z",
    }


def _record_update(update_type: str, status: str, packages_updated: int, log_output: str, error_message: Optional[str] = None) -> str:
    record_id = str(uuid4())
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO system_updates (id, update_type, status, packages_updated, log_output, error_message, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (record_id, update_type, status, packages_updated, log_output[-8000:] if log_output else "", error_message, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()
    return record_id


@app.post("/api/system/update")
async def run_system_update(payload: dict = Depends(verify_token)):
    log_event("system_update", "info", "System update started", user_id=payload["userId"])
    upd = _run_apt(["update", "-q"], timeout=180)
    if upd["returncode"] != 0:
        _record_update("system", "error", 0, upd["stderr"], upd["stderr"])
        await send_pushover("Aggiornamento Sistema FALLITO", upd["stderr"][:500], priority=1)
        return {"status": "error", "error": upd["stderr"]}

    pkgs_before = check_updates_count()
    upgrade = _run_apt(["upgrade", "-y"], timeout=1800)
    log = (upd["stdout"] or "") + "\n" + (upgrade["stdout"] or "") + "\n" + (upgrade["stderr"] or "")

    if upgrade["returncode"] != 0:
        _record_update("system", "error", 0, log, upgrade["stderr"])
        log_event("system_update", "error", "System update failed", {"error": upgrade["stderr"][:500]}, payload["userId"])
        await send_pushover("Aggiornamento Sistema FALLITO", upgrade["stderr"][:500], priority=1)
        return {"status": "error", "error": upgrade["stderr"]}

    _record_update("system", "completed", pkgs_before, log)
    log_event("system_update", "info", f"System update completed: {pkgs_before} packages", user_id=payload["userId"])
    await send_pushover("Aggiornamento Sistema Completato", f"{pkgs_before} pacchetti aggiornati con successo")
    return {"status": "completed", "packages_updated": pkgs_before, "log": log[-2000:]}


def check_updates_count() -> int:
    """Helper to count pending packages from a simulated upgrade."""
    lst = _run_apt(["-s", "upgrade"], timeout=60)
    return sum(1 for ln in (lst["stdout"] or "").splitlines() if ln.startswith("Inst "))


@app.post("/api/system/kernel-update")
async def kernel_update(payload: dict = Depends(verify_token)):
    log_event("system_update", "info", "Kernel update started", user_id=payload["userId"])
    upd = _run_apt(["update", "-q"], timeout=180)
    if upd["returncode"] != 0:
        _record_update("kernel", "error", 0, upd["stderr"], upd["stderr"])
        await send_pushover("Aggiornamento Kernel FALLITO", upd["stderr"][:500], priority=1)
        return {"status": "error", "error": upd["stderr"]}

    upgrade = _run_apt(["full-upgrade", "-y"], timeout=2400)
    log = (upd["stdout"] or "") + "\n" + (upgrade["stdout"] or "") + "\n" + (upgrade["stderr"] or "")

    if upgrade["returncode"] != 0:
        _record_update("kernel", "error", 0, log, upgrade["stderr"])
        log_event("system_update", "error", "Kernel update failed", {"error": upgrade["stderr"][:500]}, payload["userId"])
        await send_pushover("Aggiornamento Kernel FALLITO", upgrade["stderr"][:500], priority=1)
        return {"status": "error", "error": upgrade["stderr"]}

    _record_update("kernel", "completed", 1, log)
    log_event("system_update", "info", "Kernel updated successfully", user_id=payload["userId"])
    await send_pushover("Kernel Aggiornato", "Riavvio richiesto per applicare il nuovo kernel", priority=1)
    return {"status": "completed", "log": log[-2000:]}


@app.post("/api/system/reboot")
async def system_reboot(payload: dict = Depends(verify_token)):
    log_event("system_update", "warning", "System reboot requested", user_id=payload["userId"])
    _record_update("reboot", "completed", 0, "Reboot triggered via dashboard")
    await send_pushover("Riavvio Sistema", "Il Raspberry Pi si sta riavviando", priority=1)

    async def do_reboot():
        await asyncio.sleep(5)
        try:
            if _in_container():
                # Use nsenter to reboot the host from inside container
                subprocess.Popen(["nsenter", "-t", "1", "-m", "-u", "-n", "-i", "--", "/sbin/reboot"])
            else:
                subprocess.Popen(["/sbin/reboot"])
        except Exception as e:
            print(f"Reboot failed: {e}")

    asyncio.create_task(do_reboot())
    return {"status": "ok", "message": "Reboot scheduled in 5s"}


@app.post("/api/system/scheduler/toggle")
async def toggle_scheduler(payload: dict = Depends(verify_token)):
    sched = _ensure_scheduler_row()
    new_enabled = 0 if sched["enabled"] else 1
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE update_scheduler SET enabled = ?, updated_at = ? WHERE id = ?",
        (new_enabled, datetime.utcnow().isoformat(), sched["id"])
    )
    conn.commit()
    conn.close()

    global _scheduler_task
    if new_enabled:
        if _scheduler_task is None or _scheduler_task.done():
            _scheduler_task = asyncio.create_task(_scheduler_loop())
    else:
        if _scheduler_task and not _scheduler_task.done():
            _scheduler_task.cancel()

    return {"enabled": bool(new_enabled)}


async def _scheduler_loop():
    """Background loop that performs auto-updates at the configured interval."""
    while True:
        try:
            sched = _get_scheduler_row()
            if not sched or not sched["enabled"]:
                return
            interval = max(1, int(sched["interval_hours"] or 24))
            await asyncio.sleep(interval * 3600)

            # Re-check the flag right before running
            sched = _get_scheduler_row()
            if not sched or not sched["enabled"]:
                return

            log_event("system_update", "info", "Auto-update started by scheduler")
            upd = _run_apt(["update", "-q"], timeout=180)
            if upd["returncode"] == 0:
                upgrade = _run_apt(["upgrade", "-y"], timeout=1800)
                log = (upd["stdout"] or "") + "\n" + (upgrade["stdout"] or "")
                if upgrade["returncode"] == 0:
                    _record_update("auto", "completed", 0, log)
                    await send_pushover("Auto-Update Completato", "Aggiornamento automatico completato")
                else:
                    _record_update("auto", "error", 0, log, upgrade["stderr"])
                    await send_pushover("Auto-Update FALLITO", upgrade["stderr"][:500], priority=1)
            else:
                _record_update("auto", "error", 0, upd["stderr"], upd["stderr"])

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE update_scheduler SET last_run = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), sched["id"])
            )
            conn.commit()
            conn.close()
        except asyncio.CancelledError:
            return
        except Exception as e:
            print(f"Scheduler loop error: {e}")
            await asyncio.sleep(3600)


@app.get("/api/system/updates/history")
def get_update_history(payload: dict = Depends(verify_token)):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM system_updates ORDER BY created_at DESC LIMIT 50")
    updates = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"updates": updates}


@app.on_event("startup")
async def _start_scheduler_on_boot():
    """Resume scheduler if it was enabled on previous boot."""
    global _scheduler_task
    sched = _ensure_scheduler_row()
    if sched and sched["enabled"]:
        _scheduler_task = asyncio.create_task(_scheduler_loop())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
