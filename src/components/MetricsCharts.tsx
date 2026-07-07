import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface MetricPoint {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  temperature: number;
}

export function MetricsCharts() {
  const { theme } = useTheme();
  const [data, setData] = useState<MetricPoint[]>([]);
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.getMetricsHistory(hours);
        if (!mounted) return;
        const parsed = (res.metrics || []).map((m: any) => ({
          timestamp: new Date(m.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          cpu_usage: Number(m.cpu_usage) || 0,
          memory_usage: Number(m.memory_usage) || 0,
          disk_usage: Number(m.disk_usage) || 0,
          temperature: Number(m.temperature) || 0,
        }));
        setData(parsed);
      } catch (e) {
        console.error('Error loading history:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [hours]);

  const cardBg = theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-white border-slate-200';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: theme === 'dark' ? '#f1f5f9' : '#0f172a',
  };

  const ChartCard = ({ title, color, dataKey, unit }: any) => (
    <div data-testid={`chart-${dataKey}`} className={`rounded-xl p-4 border transition-colors duration-300 ${cardBg}`}>
      <h4 className={`text-sm font-medium mb-3 ${textSecondary}`}>{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="timestamp" stroke={axisColor} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis stroke={axisColor} tick={{ fontSize: 10 }} unit={unit} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toFixed(1)}${unit}`, title]} />
          <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={2} animationDuration={300} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div data-testid="metrics-charts" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${textPrimary}`}>Andamento Storico</h3>
        <div className="flex gap-2">
          {[1, 6, 24].map((h) => (
            <button
              key={h}
              data-testid={`chart-range-${h}h`}
              onClick={() => setHours(h)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                hours === h
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className={textSecondary}>Caricamento grafici...</p>
      ) : data.length < 2 ? (
        <p className={textSecondary}>Dati insufficienti — i grafici si popoleranno con il passare del tempo (campionamento ogni 5 secondi).</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="CPU %" color="#3b82f6" dataKey="cpu_usage" unit="%" />
          <ChartCard title="RAM %" color="#22c55e" dataKey="memory_usage" unit="%" />
          <ChartCard title="Disco %" color="#a855f7" dataKey="disk_usage" unit="%" />
          <ChartCard title="Temperatura" color="#f97316" dataKey="temperature" unit="°C" />
        </div>
      )}
    </div>
  );
}
