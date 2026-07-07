import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  onOpenUpdates?: () => void;
}

export function UpdatesWidget({ onOpenUpdates }: Props) {
  const { theme } = useTheme();
  const [info, setInfo] = useState<any>(null);
  const [check, setCheck] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const i = await api.getSystemInfo();
        if (mounted) setInfo(i);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const r = await api.checkUpdates();
      setCheck(r);
    } catch (e: any) {
      alert('Errore: ' + (e.message || 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const cardBg = theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';

  const pkgCount = check?.packages_count ?? null;
  const kernel = check?.kernel_update_available ?? false;
  const lastUpdate = info?.last_update;
  const schedulerOn = info?.scheduler?.enabled;

  return (
    <div data-testid="updates-widget" className={`rounded-xl p-6 border transition-colors duration-300 ${cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold ${textPrimary}`}>
          <span className="mr-2">🔄</span>System Updates
        </h3>
        <div className="flex gap-2">
          <button
            data-testid="widget-check-btn"
            onClick={handleCheck}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            {loading ? '...' : 'Controlla'}
          </button>
          {onOpenUpdates && (
            <button
              data-testid="widget-open-btn"
              onClick={onOpenUpdates}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              Apri
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className={`text-xs ${textSecondary}`}>Pacchetti disponibili</p>
          <p className={`text-2xl font-bold ${pkgCount === null ? textSecondary : pkgCount > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
            {pkgCount === null ? '—' : pkgCount}
          </p>
        </div>
        <div>
          <p className={`text-xs ${textSecondary}`}>Kernel update</p>
          {kernel ? (
            <span className="inline-block mt-1 px-2 py-1 text-xs font-bold bg-red-500/20 text-red-400 rounded">DISPONIBILE</span>
          ) : (
            <p className={`mt-1 ${textPrimary} text-sm font-medium`}>{check ? 'Aggiornato' : '—'}</p>
          )}
        </div>
        <div>
          <p className={`text-xs ${textSecondary}`}>Ultimo update</p>
          <p className={`text-sm font-medium ${textPrimary}`}>
            {lastUpdate ? new Date(lastUpdate).toLocaleDateString('it-IT') : 'Mai'}
          </p>
        </div>
        <div>
          <p className={`text-xs ${textSecondary}`}>Auto-update</p>
          <p className={`text-sm font-medium ${schedulerOn ? 'text-green-500' : 'text-red-500'}`}>
            {schedulerOn ? `Attivo (${info?.scheduler?.interval_hours}h)` : 'Disattivo'}
          </p>
        </div>
      </div>

      {check && pkgCount > 0 && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} ${textPrimary}`}>
          <strong>Stima tempo:</strong> ~{estimateMinutes(pkgCount)} min · {check.packages.slice(0, 5).join(', ')}{check.packages.length > 5 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

export function estimateMinutes(packages: number): number {
  const seconds = 5 + packages * 3;
  return Math.max(1, Math.ceil(seconds / 60));
}

export function estimateSeconds(packages: number): number {
  return Math.max(10, 5 + packages * 3);
}
