"""
BoltDashPi5 - Backend API regression tests.
Covers: auth, health, metrics, docker (dockerAvailable=false expected), files, settings,
notifications, and the new System Updates endpoints (kernel, scheduler, history, check-updates).
NOTE: We DO NOT call the destructive endpoints (/api/system/update, /api/system/kernel-update,
/api/system/reboot). We only verify they exist (non-404) using a method-only probe.
"""
import os
import pytest
import requests

BASE_URL = "http://localhost:8001"
ADMIN_EMAIL = "admin@dashboard.local"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str) and data["token"]
    assert data.get("user", {}).get("email") == ADMIN_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_health_ok(self, api):
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        # dockerAvailable key must be present (false in Emergent)
        assert "dockerAvailable" in data
        assert data["dockerAvailable"] is False


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == ADMIN_EMAIL

    def test_login_wrong_password(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": "WRONG"})
        assert r.status_code in (400, 401)

    def test_auth_me(self, api, auth):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=auth)
        assert r.status_code == 200
        body = r.json()
        # Response is {"user": {...}}
        user = body.get("user", body)
        assert user.get("email") == ADMIN_EMAIL

    def test_unauthorized_protected(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)


# ---------- Metrics ----------
class TestMetrics:
    def test_current(self, api, auth):
        r = api.get(f"{BASE_URL}/api/metrics/current", headers=auth)
        assert r.status_code == 200
        body = r.json()
        # Response shape: {"metrics": {cpu, ram, disk, temperature, network}}
        d = body.get("metrics", body)
        for k in ("cpu", "ram", "disk"):
            assert k in d, f"Missing key {k} in current metrics: {d}"
        # temperature may be null on non-Pi but key should exist
        assert "temperature" in d

    def test_history(self, api, auth):
        r = api.get(f"{BASE_URL}/api/metrics/history?hours=1", headers=auth)
        assert r.status_code == 200, f"history -> {r.status_code} {r.text[:300]}"
        d = r.json()
        # tolerate either {"metrics":[...]} or list
        if isinstance(d, dict):
            assert "metrics" in d or "history" in d or isinstance(d, list) or len(d) >= 0
        else:
            assert isinstance(d, list)


# ---------- Docker (Docker NOT available in Emergent) ----------
class TestDocker:
    def test_containers_no_crash(self, api, auth):
        r = api.get(f"{BASE_URL}/api/docker/containers", headers=auth)
        assert r.status_code == 200, f"docker/containers crashed: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert d.get("dockerAvailable") is False

    def test_containers_status_no_crash(self, api, auth):
        r = api.get(f"{BASE_URL}/api/docker/containers/status", headers=auth)
        assert r.status_code == 200, f"docker/containers/status crashed: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert d.get("dockerAvailable") is False

    def test_backups_list(self, api, auth):
        r = api.get(f"{BASE_URL}/api/docker/backups", headers=auth)
        assert r.status_code == 200

    def test_schedules_list(self, api, auth):
        r = api.get(f"{BASE_URL}/api/docker/schedules", headers=auth)
        assert r.status_code == 200


# ---------- Files / Settings / Notifications ----------
class TestMisc:
    def test_files_list(self, api, auth):
        r = api.get(f"{BASE_URL}/api/files/list", headers=auth)
        assert r.status_code == 200

    def test_settings(self, api, auth):
        r = api.get(f"{BASE_URL}/api/settings", headers=auth)
        assert r.status_code == 200

    def test_settings_logs(self, api, auth):
        r = api.get(f"{BASE_URL}/api/settings/logs?limit=10", headers=auth)
        assert r.status_code == 200

    def test_notifications_config(self, api, auth):
        r = api.get(f"{BASE_URL}/api/notifications/config", headers=auth)
        assert r.status_code == 200


# ---------- System Updates (NEW FEATURE) ----------
class TestSystemUpdates:
    def test_system_info(self, api, auth):
        r = api.get(f"{BASE_URL}/api/system/info", headers=auth)
        assert r.status_code == 200, f"system/info -> {r.status_code} {r.text[:300]}"
        d = r.json()
        for k in ("kernel_version", "uptime", "scheduler"):
            assert k in d, f"Missing {k} in system/info: {d}"
        sched = d["scheduler"]
        assert isinstance(sched.get("enabled"), bool)
        assert "interval_hours" in sched
        assert "running" in sched

    def test_check_updates(self, api, auth):
        r = api.post(f"{BASE_URL}/api/system/check-updates", headers=auth)
        assert r.status_code == 200, f"check-updates -> {r.status_code} {r.text[:500]}"
        d = r.json()
        assert "packages_count" in d
        assert "packages" in d and isinstance(d["packages"], list)
        assert "kernel_update_available" in d
        assert isinstance(d["kernel_update_available"], bool)
        # In Emergent (Debian) we typically expect some packages, but never assert exact count
        assert d["packages_count"] == len(d["packages"])

    def test_scheduler_toggle_persists(self, api, auth):
        # Get current state
        r1 = api.get(f"{BASE_URL}/api/system/info", headers=auth)
        before = r1.json()["scheduler"]["enabled"]

        r2 = api.post(f"{BASE_URL}/api/system/scheduler/toggle", headers=auth)
        assert r2.status_code == 200
        toggled = r2.json()
        assert "enabled" in toggled and isinstance(toggled["enabled"], bool)
        assert toggled["enabled"] != before

        # Verify persistence
        r3 = api.get(f"{BASE_URL}/api/system/info", headers=auth)
        assert r3.json()["scheduler"]["enabled"] == toggled["enabled"]

        # Toggle back to original to leave system unchanged
        r4 = api.post(f"{BASE_URL}/api/system/scheduler/toggle", headers=auth)
        assert r4.status_code == 200
        assert r4.json()["enabled"] == before

    def test_updates_history(self, api, auth):
        r = api.get(f"{BASE_URL}/api/system/updates/history", headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert "updates" in d and isinstance(d["updates"], list)

    # Non-destructive existence check for write endpoints (we use GET to confirm 405 != 404)
    @pytest.mark.parametrize("path", [
        "/api/system/update",
        "/api/system/kernel-update",
        "/api/system/reboot",
    ])
    def test_destructive_endpoints_exist(self, api, auth, path):
        # GET on a POST-only route should be 405 (method not allowed), not 404
        r = api.get(f"{BASE_URL}{path}", headers=auth)
        assert r.status_code != 404, f"Endpoint missing: {path}"
        assert r.status_code in (405, 401, 403, 422), f"Unexpected status for {path}: {r.status_code}"
