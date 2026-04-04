import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

export function Settings() {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<'pushover' | 'alerts' | 'logs'>('pushover');
  const [pushoverUserKey, setPushoverUserKey] = useState('');
  const [pushoverApiToken, setPushoverApiToken] = useState('');
  const [pushoverEnabled, setPushoverEnabled] = useState(true);
  const [pushoverConfigured, setPushoverConfigured] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPushoverConfig();
    loadLogs();
    loadThresholds();
  }, []);

  const loadPushoverConfig = async () => {
    try {
      const data = await api.getPushoverConfig();
      setPushoverConfigured(data.configured);
      setPushoverEnabled(data.enabled);
    } catch (err) {
      // Use demo data
      setPushoverConfigured(false);
      setPushoverEnabled(true);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await api.getLogs(50);
      setLogs(data.logs);
    } catch (err) {
      // Use demo data
      setLogs([
        {
          id: '1',
          severity: 'info',
          event_type: 'backup.completed',
          message: 'Docker container nextcloud backed up successfully to NAS',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          user: { name: 'Demo User' }
        },
        {
          id: '2',
          severity: 'warning',
          event_type: 'system.high_cpu',
          message: 'CPU usage exceeded 80% threshold',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          user: null
        },
        {
          id: '3',
          severity: 'info',
          event_type: 'file.uploaded',
          message: 'File Budget_2026.xlsx uploaded to local storage',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          user: { name: 'Demo User' }
        }
      ]);
    }
  };

  const loadThresholds = async () => {
    try {
      const data = await api.getAlertThresholds();
      setThresholds(data.thresholds);
    } catch (err) {
      // Use demo data
      setThresholds([
        { id: '1', metric_name: 'cpu', threshold_value: 80, comparison: 'gt', enabled: true },
        { id: '2', metric_name: 'ram', threshold_value: 85, comparison: 'gt', enabled: true },
        { id: '3', metric_name: 'disk', threshold_value: 90, comparison: 'gt', enabled: true },
        { id: '4', metric_name: 'temperature', threshold_value: 75, comparison: 'gt', enabled: true }
      ]);
    }
  };

  const handleSavePushover = async () => {
    if (!pushoverUserKey || !pushoverApiToken) {
      alert('Please enter both User Key and API Token');
      return;
    }

    setSaving(true);
    try {
      await api.savePushoverConfig(pushoverUserKey, pushoverApiToken, pushoverEnabled);
      alert('Pushover configuration saved successfully');
      await loadPushoverConfig();
      setPushoverUserKey('');
      setPushoverApiToken('');
    } catch (err: any) {
      // Demo mode: simulate save
      setPushoverConfigured(true);
      setPushoverUserKey('');
      setPushoverApiToken('');
      alert('Pushover configuration saved successfully (demo mode)');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await api.sendTestNotification();
      alert('Test notification sent successfully');
    } catch (err: any) {
      // Demo mode: simulate notification
      alert('Test notification sent successfully (demo mode)');
    }
  };

  const handleUpdateThreshold = async (alertId: string, value: number, enabled: boolean) => {
    try {
      await api.updateAlertThreshold(alertId, { threshold_value: value, enabled });
      await loadThresholds();
    } catch (err: any) {
      // Update local state in demo mode
      setThresholds(prev =>
        prev.map(t =>
          t.id === alertId
            ? { ...t, threshold_value: value, enabled }
            : t
        )
      );
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>Settings</h2>

        <div className="flex gap-4 mb-6">
          {[
            { id: 'pushover', label: 'Pushover' },
            { id: 'alerts', label: 'Soglie di Allerta' },
            { id: 'logs', label: 'Registro Eventi' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {activeSection === 'pushover' && (
          <div className={`rounded-lg p-6 border space-y-4 transition-colors duration-300 ${
            theme === 'dark'
              ? 'bg-slate-700/50 border-slate-600'
              : 'bg-white border-slate-200'
          }`}>
            <div>
              <h3 className={`text-lg font-bold mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Pushover Configuration</h3>
              <p className={`text-sm mb-4 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Configure Pushover to receive notifications on your devices. Get your keys at{' '}
                <a
                  href="https://pushover.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  pushover.net
                </a>
              </p>
            </div>

            {pushoverConfigured && (
              <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
                Pushover is configured and {pushoverEnabled ? 'enabled' : 'disabled'}
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                User Key
              </label>
              <input
                type="text"
                value={pushoverUserKey}
                onChange={(e) => setPushoverUserKey(e.target.value)}
                placeholder="Enter your Pushover user key"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                API Token
              </label>
              <input
                type="text"
                value={pushoverApiToken}
                onChange={(e) => setPushoverApiToken(e.target.value)}
                placeholder="Enter your Pushover API token"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-600 border-slate-500 text-white placeholder-slate-400'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pushover-enabled"
                checked={pushoverEnabled}
                onChange={(e) => setPushoverEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="pushover-enabled" className={`transition-colors duration-300 ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Enable notifications
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSavePushover}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors duration-300"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
              {pushoverConfigured && (
                <button
                  onClick={handleTestNotification}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-300"
                >
                  Send Test Notification
                </button>
              )}
            </div>
          </div>
        )}

        {activeSection === 'alerts' && (
          <div className={`rounded-lg p-6 border space-y-4 transition-colors duration-300 ${
            theme === 'dark'
              ? 'bg-slate-700/50 border-slate-600'
              : 'bg-white border-slate-200'
          }`}>
            <h3 className={`text-lg font-bold mb-4 transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>Soglie di Allerta</h3>
            <div className="space-y-4">
              {thresholds.map((threshold) => (
                <div
                  key={threshold.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'bg-slate-600/50'
                      : 'bg-slate-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-medium capitalize transition-colors duration-300 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {threshold.metric_name === 'cpu' ? 'CPU' :
                       threshold.metric_name === 'ram' ? 'RAM' :
                       threshold.metric_name === 'disk' ? 'Disco' :
                       threshold.metric_name === 'temperature' ? 'Temperatura' :
                       threshold.metric_name}
                    </div>
                    <div className={`text-sm transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Allerta quando {threshold.comparison === 'gt' ? 'sopra' : 'sotto'}{' '}
                      {threshold.threshold_value}%
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={threshold.threshold_value}
                      onChange={(e) =>
                        handleUpdateThreshold(
                          threshold.id,
                          parseFloat(e.target.value),
                          threshold.enabled
                        )
                      }
                      className={`w-20 px-3 py-1 border rounded text-center transition-colors duration-300 ${
                        theme === 'dark'
                          ? 'bg-slate-700 border-slate-500 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                      step="0.1"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={threshold.enabled}
                        onChange={(e) =>
                          handleUpdateThreshold(
                            threshold.id,
                            threshold.threshold_value,
                            e.target.checked
                          )
                        }
                        className="w-4 h-4"
                      />
                      <span className={`text-sm transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}>Attiva</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'logs' && (
          <div className={`rounded-lg p-6 border transition-colors duration-300 ${
            theme === 'dark'
              ? 'bg-slate-700/50 border-slate-600'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Registro Eventi</h3>
              <button
                onClick={loadLogs}
                className={`px-4 py-2 rounded-lg text-sm transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-600 hover:bg-slate-500 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                Aggiorna
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border transition-colors duration-300 ${
                    theme === 'dark'
                      ? 'bg-slate-600/50 border-slate-500'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getSeverityColor(log.severity)}`}>
                        {log.severity.toUpperCase()}
                      </span>
                      <span className={`text-sm transition-colors duration-300 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                      }`}>{log.event_type}</span>
                    </div>
                    <span className={`text-xs transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className={`text-sm transition-colors duration-300 ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>{log.message}</div>
                  {log.user && (
                    <div className={`text-xs mt-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>By: {log.user.name}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
