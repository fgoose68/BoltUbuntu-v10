import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
}

interface Backup {
  id: string;
  backup_type: string;
  file_path: string;
  file_size: number;
  destination: string;
  status: string;
  created_at: string;
  completed_at: string;
  container: { name: string; image: string };
}

export function DockerBackups() {
  const { theme } = useTheme();
  const [containers, setContainers] = useState<Container[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [containersData, backupsData] = await Promise.all([
        api.getContainers(),
        api.getBackups(),
      ]);
      setContainers(containersData.containers || []);
      setBackups(backupsData.backups || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setContainers([]);
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async (containerId: string, destination: string = 'local') => {
    setBackingUp(containerId);
    try {
      const container = containers.find(c => c.id === containerId);
      await api.backupContainer(containerId, destination, 'export', container?.name || 'unknown');
      alert('Backup started successfully');
      setTimeout(loadData, 2000);
    } catch (err: any) {
      console.error('Backup error:', err);
      alert('Error starting backup: ' + (err.message || 'Unknown error'));
    } finally {
      setBackingUp(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'running':
        return 'text-blue-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  if (loading) {
    return <div className={`transition-colors duration-300 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Loading containers...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>Docker Containers</h2>
        <div className="grid grid-cols-1 gap-4">
          {containers.map((container) => (
            <div
              key={container.id}
              className={`rounded-lg p-4 border flex items-center justify-between transition-colors duration-300 ${
                theme === 'dark'
                  ? 'bg-slate-700/50 border-slate-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      container.state === 'running' ? 'bg-green-500' : 'bg-slate-500'
                    }`}
                  />
                  <div>
                    <h3 className={`font-medium transition-colors duration-300 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>{container.name}</h3>
                    <p className={`text-sm transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>{container.image}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBackup(container.id, 'local')}
                  disabled={backingUp === container.id}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg text-sm transition-colors duration-300"
                >
                  {backingUp === container.id ? 'Starting...' : 'Backup (Local)'}
                </button>
                <button
                  onClick={() => handleBackup(container.id, 'nas')}
                  disabled={backingUp === container.id}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg text-sm transition-colors duration-300"
                >
                  Backup (NAS)
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>Recent Backups</h2>
          <button
            onClick={loadData}
            className={`px-4 py-2 rounded-lg text-sm transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
            }`}
          >
            Refresh
          </button>
        </div>
        <div className="space-y-3">
          {backups.length === 0 ? (
            <div className={`text-center py-8 transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>No backups yet</div>
          ) : (
            backups.map((backup) => (
              <div
                key={backup.id}
                className={`rounded-lg p-4 border transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-700/50 border-slate-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`font-medium transition-colors duration-300 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>{backup.container.name}</h3>
                      <span className={`text-sm font-medium ${getStatusColor(backup.status)}`}>
                        {backup.status}
                      </span>
                    </div>
                    <div className={`text-sm space-y-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <div>Image: {backup.container.image}</div>
                      <div>Type: {backup.backup_type}</div>
                      <div>Destination: {backup.destination}</div>
                      <div>Size: {formatBytes(backup.file_size)}</div>
                      <div>Created: {formatDate(backup.created_at)}</div>
                      {backup.completed_at && (
                        <div>Completed: {formatDate(backup.completed_at)}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
