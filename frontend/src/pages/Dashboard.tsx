import { useState } from 'react';
import { SystemMetrics } from '../components/SystemMetrics';
import { DockerBackups } from '../components/DockerBackups';
import { DockerContainers } from '../components/DockerContainers';
import { Manutenzione } from '../components/Manutenzione';
import { Settings } from '../components/Settings';
import { SystemUpdates } from '../components/SystemUpdates';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('metrics');
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'metrics', label: 'System Monitor', icon: '📊' },
    { id: 'docker', label: 'Docker Backups', icon: '🐳' },
    { id: 'containers', label: 'Containers Status', icon: '📦' },
    { id: 'files', label: 'Manutenzione', icon: '🔧' },
    { id: 'updates', label: 'System Updates', icon: '🔄' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50'
    }`}>
      <nav className={`backdrop-blur-lg border-b transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-800/50 border-slate-700'
          : 'bg-white/50 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                BoltUbuntu Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Welcome, {user?.name}
              </span>
              <button
                onClick={logout}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : theme === 'dark'
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className={`backdrop-blur-lg rounded-2xl shadow-2xl border p-6 transition-colors duration-300 ${
          theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white/50 border-slate-200'
        }`}>
          {activeTab === 'metrics' && <SystemMetrics />}
          {activeTab === 'docker' && <DockerBackups />}
          {activeTab === 'containers' && <DockerContainers />}
          {activeTab === 'files' && <Manutenzione />}
          {activeTab === 'updates' && <SystemUpdates />}
          {activeTab === 'settings' && <Settings />}
        </div>

        <div className={`mt-8 text-center text-xs font-medium ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          Ver.6.2Giu2026
        </div>
      </div>
    </div>
  );
}
