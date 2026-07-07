import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { estimateSeconds } from './UpdatesWidget';

interface SystemInfo {
  kernel_version: string;
  uptime: string;
  last_update: string | null;
  os_name?: string;
  os_version?: string;
  os_id?: string;
  architecture?: string;
  scheduler: {
    enabled: boolean;
    interval_hours: number;
    last_run: string | null;
    running: boolean;
  };
}

interface UpdateCheck {
  packages_count: number;
  packages: string[];
  kernel_update_available: boolean;
  checked_at: string;
}

interface UpdateHistory {
  id: string;
  update_type: string;
  status: string;
  packages_updated: number;
  log_output: string;
  created_at: string;
}

export function SystemUpdates() {
  const { theme } = useTheme();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheck | null>(null);
  const [history, setHistory] = useState<UpdateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingKernel, setUpdatingKernel] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [rebootCountdown, setRebootCountdown] = useState<number | null>(null);
  const [updateProgress, setUpdateProgress] = useState<{ kind: string; total: number; elapsed: number } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (rebootCountdown !== null && rebootCountdown > 0) {
      const timer = setTimeout(() => setRebootCountdown(rebootCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [rebootCountdown]);

  useEffect(() => {
    if (updateProgress && (updating || updatingKernel)) {
      const t = setInterval(() => {
        setUpdateProgress((p) => p ? { ...p, elapsed: p.elapsed + 1 } : null);
      }, 1000);
      return () => clearInterval(t);
    }
  }, [updateProgress, updating, updatingKernel]);

  const loadData = async () => {
    try {
      const [infoRes, historyRes] = await Promise.all([
        api.getSystemInfo(),
        api.getUpdateHistory()
      ]);
      setSystemInfo(infoRes);
      setHistory(historyRes.updates || []);
    } catch (err) {
      console.error('Error loading system data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      const result = await api.checkUpdates();
      setUpdateCheck(result);
    } catch (err) {
      console.error('Error checking updates:', err);
      alert('Errore nel controllo aggiornamenti');
    } finally {
      setChecking(false);
    }
  };

  const handleRunUpdate = async () => {
    if (!window.confirm('Vuoi avviare l\'aggiornamento del sistema?')) return;
    const totalSec = estimateSeconds(updateCheck?.packages_count || 10);
    setUpdateProgress({ kind: 'system', total: totalSec, elapsed: 0 });
    setUpdating(true);
    try {
      const result = await api.runSystemUpdate();
      if (result.status === 'completed') {
        alert(`Aggiornamento completato! Pacchetti aggiornati: ${result.packages_updated}`);
        await loadData();
        setUpdateCheck(null);
      } else {
        alert('Errore: ' + (result.error || 'Unknown'));
      }
    } catch (err: any) {
      alert('Errore: ' + (err.message || 'Unknown'));
    } finally {
      setUpdating(false);
      setUpdateProgress(null);
    }
  };

  const handleKernelUpdate = async () => {
    if (!window.confirm('Vuoi aggiornare il kernel? Sarà necessario un riavvio.')) return;
    setUpdateProgress({ kind: 'kernel', total: estimateSeconds(40), elapsed: 0 });
    setUpdatingKernel(true);
    try {
      const result = await api.updateKernel();
      if (result.status === 'completed') {
        alert('Kernel aggiornato! Riavvio necessario per applicare le modifiche.');
        await loadData();
      } else {
        alert('Errore: ' + (result.error || 'Unknown'));
      }
    } catch (err: any) {
      alert('Errore: ' + (err.message || 'Unknown'));
    } finally {
      setUpdatingKernel(false);
      setUpdateProgress(null);
    }
  };

  const handleReboot = async () => {
    if (!window.confirm('Sei sicuro di voler riavviare il sistema?')) return;
    if (!window.confirm('CONFERMA FINALE: Il sistema si riavvierà tra 5 secondi.')) return;

    setRebooting(true);
    setRebootCountdown(5);
    try {
      await api.systemReboot();
    } catch (err) {
      console.error('Reboot error:', err);
    }
  };

  const handleToggleScheduler = async () => {
    try {
      await api.toggleScheduler();
      await loadData();
    } catch (err) {
      console.error('Error toggling scheduler:', err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('it-IT');
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const cardBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';

  if (loading) {
    return <div className={textSecondary}>Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Informazioni Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <p className={`text-sm ${textSecondary}`}>Sistema Operativo</p>
            <p className={`font-medium ${textPrimary}`}>
              {systemInfo?.os_name || 'N/A'}
              {systemInfo?.architecture && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                  {systemInfo.architecture}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Package Manager</p>
            <p className={`font-medium ${textPrimary}`}>
              {systemInfo?.os_id === 'ubuntu' || systemInfo?.os_id === 'debian' || systemInfo?.os_id === 'raspbian'
                ? 'APT (.deb)'
                : 'Sconosciuto'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className={`text-sm ${textSecondary}`}>Kernel</p>
            <p className={`font-medium ${textPrimary}`}>{systemInfo?.kernel_version || 'N/A'}</p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Uptime</p>
            <p className={`font-medium ${textPrimary}`}>{systemInfo?.uptime || 'N/A'}</p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Ultimo Aggiornamento</p>
            <p className={`font-medium ${textPrimary}`}>{systemInfo?.last_update || 'Mai'}</p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Scheduler</p>
            <p className={`font-medium ${systemInfo?.scheduler?.enabled ? 'text-green-500' : 'text-red-500'}`}>
              {systemInfo?.scheduler?.enabled ? 'Attivo' : 'Disattivo'}
            </p>
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold ${textPrimary}`}>Aggiornamenti Automatici</h3>
          <button
            onClick={handleToggleScheduler}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              systemInfo?.scheduler?.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {systemInfo?.scheduler?.enabled ? 'Disattiva' : 'Attiva'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-sm ${textSecondary}`}>Intervallo</p>
            <p className={`font-medium ${textPrimary}`}>{systemInfo?.scheduler?.interval_hours || 24} ore</p>
          </div>
          <div>
            <p className={`text-sm ${textSecondary}`}>Ultima Esecuzione</p>
            <p className={`font-medium ${textPrimary}`}>{systemInfo?.scheduler?.last_run ? formatDate(systemInfo.scheduler.last_run) : 'Mai'}</p>
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Aggiornamento Sistema</h3>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={handleCheckUpdates}
            disabled={checking}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {checking ? 'Controllo...' : 'Controlla Aggiornamenti'}
          </button>

          <button
            onClick={handleRunUpdate}
            disabled={updating || !updateCheck || updateCheck.packages_count === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {updating ? 'Aggiornamento...' : 'Aggiorna Sistema'}
          </button>
        </div>

        {updateCheck && (
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <p className={textPrimary}>
              <strong>Pacchetti disponibili:</strong> {updateCheck.packages_count}
            </p>
            {updateCheck.packages_count > 0 && (
              <p className={`text-sm ${textSecondary} mt-1`}>
                <strong>Tempo stimato:</strong> ~{Math.ceil(estimateSeconds(updateCheck.packages_count) / 60)} minuti
              </p>
            )}
            {updateCheck.kernel_update_available && (
              <p className="text-yellow-500 font-medium mt-2">Aggiornamento kernel disponibile</p>
            )}
            {updateCheck.packages_count > 0 && (
              <div className="mt-2">
                <p className={`text-sm ${textSecondary}`}>Pacchetti:</p>
                <p className={`text-sm ${textPrimary}`}>{updateCheck.packages.slice(0, 10).join(', ')}{updateCheck.packages.length > 10 ? '...' : ''}</p>
              </div>
            )}
          </div>
        )}

        {updateProgress && (
          <div data-testid="update-progress" className={`mt-4 p-4 rounded-lg border-2 ${theme === 'dark' ? 'bg-slate-900 border-blue-500' : 'bg-blue-50 border-blue-500'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${textPrimary}`}>
                {updateProgress.kind === 'kernel' ? 'Aggiornamento Kernel in corso...' : 'Aggiornamento Sistema in corso...'}
              </span>
              <span className={`font-mono text-sm ${textPrimary}`}>
                {formatTime(updateProgress.elapsed)} / ~{formatTime(updateProgress.total)}
              </span>
            </div>
            <div className={`w-full h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div
                className="h-3 bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000"
                style={{ width: `${Math.min(100, (updateProgress.elapsed / updateProgress.total) * 100)}%` }}
              />
            </div>
            <p className={`text-xs mt-2 ${textSecondary}`}>
              {updateProgress.elapsed >= updateProgress.total
                ? 'Tempo stimato superato — il processo è ancora in esecuzione, attendi il completamento'
                : `Rimanenti: ~${formatTime(Math.max(0, updateProgress.total - updateProgress.elapsed))}`}
            </p>
          </div>
        )}
      </div>

      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Aggiornamento Kernel</h3>
        <p className={`${textSecondary} mb-4`}>
          Versione attuale: <strong className={textPrimary}>{systemInfo?.kernel_version}</strong>
          {systemInfo?.os_id === 'ubuntu' && (
            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
              Ubuntu — apt full-upgrade
            </span>
          )}
          {(systemInfo?.os_id === 'debian' || systemInfo?.os_id === 'raspbian') && (
            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'}`}>
              {systemInfo?.os_id === 'raspbian' ? 'Raspberry Pi OS' : 'Debian'} — apt full-upgrade
            </span>
          )}
        </p>
        <button
          onClick={handleKernelUpdate}
          disabled={updatingKernel}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
        >
          {updatingKernel ? 'Aggiornamento Kernel...' : 'Aggiorna Kernel'}
        </button>
        <p className={`text-sm ${textSecondary} mt-2`}>Richiede riavvio dopo l'aggiornamento</p>
      </div>

      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Riavvio Sistema</h3>
        {rebooting ? (
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">Riavvio in {rebootCountdown} secondi...</p>
            <p className={textSecondary}>Il sistema si sta riavviando</p>
          </div>
        ) : (
          <button
            onClick={handleReboot}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Riavvia Sistema
          </button>
        )}
        <p className={`text-sm ${textSecondary} mt-2`}>Tempo stimato di downtime: 2-3 minuti</p>
      </div>

      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Cronologia Aggiornamenti</h3>
        {history.length === 0 ? (
          <p className={textSecondary}>Nessun aggiornamento registrato</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {history.map((item) => (
              <div key={item.id} className={`p-3 rounded-lg border ${cardBorder} ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${textPrimary}`}>
                    {item.update_type === 'system' && 'Sistema'}
                    {item.update_type === 'kernel' && 'Kernel'}
                    {item.update_type === 'reboot' && 'Riavvio'}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    item.status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <p className={`text-sm ${textSecondary} mt-1`}>{formatDate(item.created_at)}</p>
                {item.packages_updated > 0 && (
                  <p className={`text-sm ${textSecondary}`}>Pacchetti: {item.packages_updated}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
