const API_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async register(email: string, password: string, name: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async getContainers() {
    return this.request('/docker/containers');
  }

  async backupContainer(containerId: string, destination: string, backupType: string) {
    return this.request(`/docker/backup/${containerId}`, {
      method: 'POST',
      body: JSON.stringify({ destination, backupType }),
    });
  }

  async getBackups() {
    return this.request('/docker/backups');
  }

  async getSchedules() {
    return this.request('/docker/schedules');
  }

  async createSchedule(containerUuid: string, cronExpression: string, backupType: string, destination: string) {
    return this.request('/docker/schedules', {
      method: 'POST',
      body: JSON.stringify({ containerUuid, cronExpression, backupType, destination }),
    });
  }

  async deleteSchedule(scheduleId: string) {
    return this.request(`/docker/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  async getCurrentMetrics() {
    return this.request('/metrics/current');
  }

  async getMetricsHistory(hours: number = 24) {
    return this.request(`/metrics/history?hours=${hours}`);
  }

  async getAlertThresholds() {
    return this.request('/metrics/alerts');
  }

  async updateAlertThreshold(alertId: string, data: any) {
    return this.request(`/metrics/alerts/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getFiles() {
    return this.request('/files/list');
  }

  async uploadFile(file: File, destination: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('destination', destination);

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async downloadFile(fileId: string) {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/files/download/${fileId}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  async deleteFile(fileId: string) {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async getSettings() {
    return this.request('/settings');
  }

  async updateSetting(key: string, value: string) {
    return this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  async getLogs(limit: number = 100, type?: string) {
    const query = type ? `?limit=${limit}&type=${type}` : `?limit=${limit}`;
    return this.request(`/settings/logs${query}`);
  }

  async getPushoverConfig() {
    return this.request('/notifications/config');
  }

  async savePushoverConfig(userKey: string, apiToken: string, enabled: boolean) {
    return this.request('/notifications/config', {
      method: 'POST',
      body: JSON.stringify({ userKey, apiToken, enabled }),
    });
  }

  async sendTestNotification() {
    return this.request('/notifications/test', {
      method: 'POST',
    });
  }

  async getDockerContainers() {
    return this.request('/docker/containers/status');
  }

  async restartContainer(containerId: string) {
    return this.request(`/docker/containers/${containerId}/restart`, {
      method: 'POST',
    });
  }

  async pauseContainer(containerId: string) {
    return this.request(`/docker/containers/${containerId}/pause`, {
      method: 'POST',
    });
  }

  async unpauseContainer(containerId: string) {
    return this.request(`/docker/containers/${containerId}/unpause`, {
      method: 'POST',
    });
  }

  async startContainer(containerId: string) {
    return this.request(`/docker/containers/${containerId}/start`, {
      method: 'POST',
    });
  }

  async stopContainer(containerId: string) {
    return this.request(`/docker/containers/${containerId}/stop`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
