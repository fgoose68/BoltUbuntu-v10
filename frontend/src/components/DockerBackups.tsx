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
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    
    setDeleting(backupId);
    try {
      await api.deleteBackup(backupId);
      alert('Backup deleted successfully');
      await loadData();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Error deleting backup: ' + (err.message || 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
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
      {/* Docker Containers Section */}
      <div>
        <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>Docker Containers</h2>
        
        {containers.length === 0 ? (
          <div className={`text-center py-8 transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>No containers found</div>
        ) : (
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
        )}
      </div>

      {/* Recent Backups Section */}
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
        
        {/* Backup Path Info Box */}
        <div className={`mb-4 p-4 rounded-lg border transition-colors duration-300 ${
          theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📁</span>
            <div className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
              <p className="font-semibold mb-2">Backup Storage Locations:</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Local: </span>
                  <code className={`px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-slate-700 text-green-400' : 'bg-white text-green-600'
                  }`}>~/BoltUbuntu/backups/</code>
                </p>
                <p>
                  <span className="font-medium">NAS: </span>
                  <code className={`px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-slate-700 text-blue-400' : 'bg-white text-blue-600'
                  }`}>/mnt/nas/backups/</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Backups List */}
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-medium transition-colors duration-300 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>{backup.container?.name || 'Unknown'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        backup.destination === 'nas' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {backup.destination?.toUpperCase() || 'LOCAL'}
                      </span>
                      <span className={`text-sm ${getStatusColor(backup.status)}`}>
                        ● {backup.status}
                      </span>
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <p>Size: {formatBytes(backup.file_size)}</p>
                      <p>Created: {formatDate(backup.created_at)}</p>
                      <p className="text-xs opacity-75 truncate">Path: {backup.file_path}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBackup(backup.id)}
                    disabled={deleting === backup.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg text-sm transition-colors duration-300"
                  >
                    {deleting === backup.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
