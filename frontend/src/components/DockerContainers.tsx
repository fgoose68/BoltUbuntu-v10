import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created: string;
  ports: string[];
}

export function DockerContainers() {
  const { theme } = useTheme();
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchContainers = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }

    try {
      const data = await api.getDockerContainers();
      setContainers(data.containers || []);
      setError('');
    } catch (err: any) {
      console.error('Error fetching containers:', err);
      setContainers([]);
      setError('Unable to fetch containers');
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    fetchContainers(true);
  };

  const handleContainerAction = async (containerId: string, action: string) => {
    setActionLoading(`${containerId}-${action}`);
    try {
      switch (action) {
        case 'restart':
          await api.restartContainer(containerId);
          break;
        case 'pause':
          await api.pauseContainer(containerId);
          break;
        case 'unpause':
          await api.unpauseContainer(containerId);
          break;
        case 'start':
          await api.startContainer(containerId);
          break;
        case 'stop':
          await api.stopContainer(containerId);
          break;
      }
      await fetchContainers();
    } catch (err: any) {
      console.error('Container action error:', err);
      alert('Error performing action: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'bg-green-500';
      case 'exited':
        return 'bg-red-500';
      case 'created':
        return 'bg-blue-500';
      case 'restarting':
        return 'bg-yellow-500';
      case 'paused':
        return 'bg-orange-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStateBadgeColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'exited':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'created':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'restarting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'paused':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const groupedContainers = containers.reduce((acc, container) => {
    const state = container.state.toLowerCase();
    if (!acc[state]) {
      acc[state] = [];
    }
    acc[state].push(container);
    return acc;
  }, {} as Record<string, Container[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`transition-colors duration-300 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Loading containers...</div>
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

  const stateOrder = ['running', 'restarting', 'paused', 'created', 'exited'];
  const sortedStates = Object.keys(groupedContainers).sort((a, b) => {
    const indexA = stateOrder.indexOf(a);
    const indexB = stateOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold transition-colors duration-300 ${
          theme === 'dark' ? 'text-white' : 'text-slate-900'
        }`}>Docker Containers</h2>
        <div className="flex items-center gap-4">
          <div className={`text-sm transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Total: {containers.length} containers
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors duration-300"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stateOrder.map(state => {
          const count = groupedContainers[state]?.length || 0;
          return (
            <div key={state} className={`rounded-lg p-4 border transition-colors duration-300 ${
              theme === 'dark'
                ? 'bg-slate-700/50 border-slate-600'
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${getStateColor(state)}`}></div>
                <span className={`text-sm font-medium capitalize transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>{state}</span>
              </div>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>{count}</div>
            </div>
          );
        })}
      </div>

      {sortedStates.map(state => (
        <div key={state} className="space-y-3">
          <h3 className={`text-lg font-semibold capitalize flex items-center gap-2 transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            <div className={`w-3 h-3 rounded-full ${getStateColor(state)}`}></div>
            {state} ({groupedContainers[state].length})
          </h3>
          <div className="space-y-3">
            {groupedContainers[state].map(container => (
              <div
                key={container.id}
                className={`rounded-lg p-5 border transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className={`text-lg font-semibold transition-colors duration-300 ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>{container.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStateBadgeColor(container.state)} capitalize`}>
                        {container.state}
                      </span>
                    </div>
                    <div className={`text-sm font-mono transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>{container.image}</div>
                  </div>
                  <div className="flex gap-2">
                    {container.state === 'running' && (
                      <>
                        <button
                          onClick={() => handleContainerAction(container.id, 'restart')}
                          disabled={actionLoading === `${container.id}-restart`}
                          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          title="Restart"
                        >
                          <svg className={`w-4 h-4 ${actionLoading === `${container.id}-restart` ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleContainerAction(container.id, 'pause')}
                          disabled={actionLoading === `${container.id}-pause`}
                          className="p-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          title="Pause"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleContainerAction(container.id, 'stop')}
                          disabled={actionLoading === `${container.id}-stop`}
                          className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                          title="Stop"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                        </button>
                      </>
                    )}
                    {container.state === 'paused' && (
                      <button
                        onClick={() => handleContainerAction(container.id, 'unpause')}
                        disabled={actionLoading === `${container.id}-unpause`}
                        className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        title="Unpause"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    {(container.state === 'exited' || container.state === 'created') && (
                      <button
                        onClick={() => handleContainerAction(container.id, 'start')}
                        disabled={actionLoading === `${container.id}-start`}
                        className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        title="Start"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className={`mb-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-600'
                    }`}>Status</div>
                    <div className={`transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>{container.status}</div>
                  </div>
                  <div>
                    <div className={`mb-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-600'
                    }`}>Container ID</div>
                    <div className={`font-mono transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>{container.id.substring(0, 12)}</div>
                  </div>
                  <div>
                    <div className={`mb-1 transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-600'
                    }`}>Ports</div>
                    <div className={`transition-colors duration-300 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {container.ports.length > 0 ? container.ports.join(', ') : 'None'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className={`text-sm text-center transition-colors duration-300 ${
        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
      }`}>
        Auto-refreshes every minute
      </div>
    </div>
  );
}
