import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { UpdatesWidget } from './UpdatesWidget';
import { MetricsCharts } from './MetricsCharts';

interface Metrics {
  cpu: { usage: number; cores: number };
  ram: { total: number; used: number; free: number; usage: number };
  disk: { total: number; used: number; free: number; usage: number };
  temperature: { cpu: number };
  network: { ipLocal: string; ipPublic: string; interface: string };
}

export function SystemMetrics() {
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const data = await api.getCurrentMetrics();
      setMetrics(data.metrics);
      setError('');
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError('Unable to fetch system metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`transition-colors duration-300 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
        Error: {error}
      </div>
    );
  }

  if (!metrics) return null;

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const MetricCard = ({ title, value, unit, usage, icon }: any) => (
    <div className={`rounded-xl p-6 border transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-slate-700/50 border-slate-600'
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-medium transition-colors duration-300 ${
          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
        }`}>{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mb-3">
        <div className={`text-3xl font-bold mb-1 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>
          {value}
          <span className={`text-lg ml-1 transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>{unit}</span>
        </div>
        {usage !== undefined && (
          <div className={`text-sm transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>{usage.toFixed(2)}% used</div>
        )}
      </div>
      {usage !== undefined && (
        <div className={`w-full rounded-full h-2 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200'
        }`}>
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getUsageColor(usage)}`}
            style={{ width: `${Math.min(usage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>System Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="CPU Usage"
            value={metrics.cpu.usage.toFixed(2)}
            unit="%"
            usage={metrics.cpu.usage}
            icon="💻"
          />
          <MetricCard
            title="RAM"
            value={(metrics.ram.used / 1024).toFixed(2)}
            unit={`GB / ${(metrics.ram.total / 1024).toFixed(2)} GB`}
            usage={metrics.ram.usage}
            icon="🧠"
          />
          <MetricCard
            title="Disk Space"
            value={metrics.disk.used.toFixed(2)}
            unit={`GB / ${metrics.disk.total} GB`}
            usage={metrics.disk.usage}
            icon="💾"
          />
          <MetricCard
            title="Temperature"
            value={metrics.temperature.cpu.toFixed(2)}
            unit="°C"
            usage={metrics.temperature.cpu > 0 ? (metrics.temperature.cpu / 80) * 100 : 0}
            icon="🌡️"
          />
        </div>
      </div>

      <UpdatesWidget />

      <MetricsCharts />

      <div className={`rounded-xl p-6 border transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-700/50 border-slate-600'
          : 'bg-white border-slate-200'
      }`}>
        <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>Network Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className={`text-sm mb-1 transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>Local IP</div>
            <div className={`text-lg font-mono transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>{metrics.network.ipLocal}</div>
          </div>
          <div>
            <div className={`text-sm mb-1 transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>Public IP</div>
            <div className={`text-lg font-mono transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>{metrics.network.ipPublic}</div>
          </div>
          <div>
            <div className={`text-sm mb-1 transition-colors duration-300 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>Interface</div>
            <div className={`text-lg font-mono transition-colors duration-300 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>{metrics.network.interface}</div>
          </div>
        </div>
      </div>

      <div className={`text-sm text-center transition-colors duration-300 ${
        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
      }`}>
        Auto-refreshes every 5 seconds
      </div>
    </div>
  );
}
