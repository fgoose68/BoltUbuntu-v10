import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface SystemInfo {
  kernel_version: string;
  uptime: string;
  last_update: string | null;
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (rebootCountdown !== null && rebootCountdown > 0) {
      const timer = setTimeout(() => setRebootCountdown(rebootCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [rebootCountdown]);

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
    }
  };

  const handleKernelUpdate = async () => {
    if (!window.confirm('Vuoi aggiornare il kernel? Sarà necessario un riavvio.')) return;
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

  const cardBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
  const cardBorder = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';

  if (loading) {
    return <div className={textSecondary}>Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* System Info Card */}
      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Informazioni Sistema</h3>
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

      {/* Auto Update Scheduler Card */}
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

      {/* Check & Update Card */}
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
      </div>

      {/* Kernel Update Card */}
      <div className={`${cardBg} rounded-xl p-6 border ${cardBorder}`}>
        <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Aggiornamento Kernel</h3>
        <p className={`${textSecondary} mb-4`}>
          Versione attuale: <strong className={textPrimary}>{systemInfo?.kernel_version}</strong>
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

      {/* Reboot Card */}
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

      {/* History Card */}
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
