/**
 * Manutenzione Component
 * Pagina di manutenzione integrata direttamente in React (no iframe)
 * Si connette al backend Flask-SocketIO sulla porta 3055
 * Include gestione dinamica dei pulsanti (aggiungi/modifica/elimina/riordina)
 */

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface OutputLine {
  line: string;
  is_error: boolean;
}

interface ButtonConfig {
  id: string;
  label: string;
  icon: string;
  action: string;
  command?: string;
  category: string;
  enabled: boolean;
}

// Usa l'hostname corrente del browser così funziona sia in locale (localhost)
// sia da rete (http://<IP-host>:3061). Override possibile via VITE_MANUTENZIONE_URL.
const SOCKET_URL =
  (import.meta as any).env?.VITE_MANUTENZIONE_URL ||
  `${window.location.protocol}//${window.location.hostname}:3055`;

// Icone SVG
const icons: Record<string, JSX.Element> = {
  refresh: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  network: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  server: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  custom: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  delete: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  up: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ),
  down: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export function Manutenzione() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [executing, setExecuting] = useState<string | null>(null);
  const [isExecutingGlobal, setIsExecutingGlobal] = useState(false);
  const [buttonsConfig, setButtonsConfig] = useState<ButtonConfig[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingButton, setEditingButton] = useState<ButtonConfig | null>(null);
  const [actionType, setActionType] = useState<'preset' | 'custom'>('preset');
  const terminalRef = useRef<HTMLDivElement>(null);
  const buttonMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/maintenance`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      addLine('[INFO] Connesso al modulo manutenzione');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      addLine('[INFO] Disconnesso dal modulo manutenzione');
    });

    newSocket.on('output', (data: OutputLine) => {
      addLine(data.line, data.is_error);
    });

    newSocket.on('status', (data: { message: string }) => {
      addLine(`[INFO] ${data.message}`);
    });

    newSocket.on('error', (data: { message: string }) => {
      addLine(`[ERRORE] ${data.message}`, true);
    });

    newSocket.on('execution_started', (data: { action: string }) => {
      setExecuting(data.action);
      setIsExecutingGlobal(true);
      addLine('');
      addLine(`=== AVVIO OPERAZIONE: ${data.action} ===`);
      addLine('');
    });

    newSocket.on('execution_completed', (data: { action: string }) => {
      setExecuting(null);
      setIsExecutingGlobal(false);
      addLine('');
      addLine('=== OPERAZIONE COMPLETATA ===');
      addLine('');
    });

    newSocket.on('buttons_config', (data: { buttons: ButtonConfig[] }) => {
      setButtonsConfig(data.buttons);
      // Build button map
      const map: Record<string, string> = {};
      data.buttons.forEach((btn) => {
        const action = btn.action || `custom_${btn.id}`;
        map[action] = btn.id;
      });
      buttonMapRef.current = map;
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const addLine = (line: string, isError = false) => {
    setOutput((prev) => [...prev, { line, is_error: isError }]);
  };

  const executeAction = (action: string) => {
    if (socket && connected && !isExecutingGlobal) {
      socket.emit('execute_action', { action });
    }
  };

  const clearTerminal = () => {
    setOutput([{ line: '// Terminale pulito', is_error: false }]);
  };

  const isButtonDisabled = (btnAction: string) => {
    return isExecutingGlobal || !connected || (executing !== null && executing !== btnAction);
  };

  const isButtonActive = (btnAction: string) => {
    return executing === btnAction;
  };

  const getIcon = (iconName: string) => icons[iconName] || icons.custom;

  // Button management functions
  const getIconForAction = (action: string): string => {
    if (action.startsWith('update_webapp')) return 'refresh';
    if (action === 'check_ports') return 'network';
    if (action === 'check_services') return 'server';
    if (action === 'cleanup') return 'trash';
    return 'custom';
  };

  const getCategoryForAction = (action: string): string => {
    if (action.startsWith('update_webapp')) return 'webapp';
    return 'utility';
  };

  const saveButtonConfig = async (buttons: ButtonConfig[]) => {
    try {
      const response = await fetch(`${SOCKET_URL}/api/buttons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buttons),
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setButtonsConfig(buttons);
      }
    } catch (err) {
      console.error('Errore salvataggio:', err);
    }
  };

  const handleSaveButton = () => {
    const label = (document.getElementById('btn-label') as HTMLInputElement)?.value.trim();
    if (!label) {
      alert('Inserisci un\'etichetta');
      return;
    }

    let action: string;
    let command: string | undefined;
    let icon: string;
    let category: string;

    if (actionType === 'preset') {
      action = (document.getElementById('btn-action-preset') as HTMLSelectElement)?.value || '';
      command = undefined;
      icon = getIconForAction(action);
      category = getCategoryForAction(action);
    } else {
      command = (document.getElementById('btn-command') as HTMLInputElement)?.value.trim();
      if (!command) {
        alert('Inserisci un comando');
        return;
      }
      action = editingButton ? `custom_${editingButton.id}` : `custom_btn-${Date.now()}`;
      icon = 'custom';
      category = 'custom';
    }

    let newButtons: ButtonConfig[];

    if (editingButton) {
      newButtons = buttonsConfig.map((b) =>
        b.id === editingButton.id
          ? { ...b, label, action, command, icon, category }
          : b
      );
    } else {
      const newId = `btn-${Date.now()}`;
      newButtons = [
        ...buttonsConfig,
        {
          id: newId,
          label,
          action,
          command,
          icon,
          category,
          enabled: true,
        },
      ];
    }

    saveButtonConfig(newButtons);
    resetForm();
    setShowEditor(false);
  };

  const handleEditButton = (btn: ButtonConfig) => {
    setEditingButton(btn);
    if (btn.command) {
      setActionType('custom');
      (document.getElementById('btn-command') as HTMLInputElement).value = btn.command;
    } else {
      setActionType('preset');
      (document.getElementById('btn-action-preset') as HTMLSelectElement).value = btn.action;
    }
    (document.getElementById('btn-label') as HTMLInputElement).value = btn.label;
    setShowEditor(true);
  };

  const handleDeleteButton = async (id: string) => {
    if (!confirm('Eliminare questo pulsante?')) return;
    const newButtons = buttonsConfig.filter((b) => b.id !== id);
    await saveButtonConfig(newButtons);
  };

  const resetForm = () => {
    setEditingButton(null);
    setActionType('preset');
    (document.getElementById('btn-label') as HTMLInputElement).value = '';
    (document.getElementById('btn-command') as HTMLInputElement).value = '';
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (dragIndex === dropIndex) return;

    const newButtons = [...buttonsConfig];
    const [moved] = newButtons.splice(dragIndex, 1);
    newButtons.splice(dropIndex, 0, moved);

    await saveButtonConfig(newButtons);
  };

  const webappBtns = buttonsConfig.filter((b) => b.category === 'webapp');
  const utilityBtns = buttonsConfig.filter((b) => b.category === 'utility');
  const customBtns = buttonsConfig.filter((b) => b.category === 'custom');
  const orderedButtons = [...webappBtns, ...utilityBtns, ...customBtns];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-white">Manutenzione</h2>
          <p className="text-sm text-gray-400">Ver.6.2Giu2026 - Sistema di gestione e manutenzione SaaS</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">{connected ? 'Connesso' : 'Disconnesso'}</span>
          </div>
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded border border-gray-600"
          >
            {icons.settings}
            <span>Gestisci</span>
          </button>
        </div>
      </div>

      {/* Pulsanti di Controllo */}
      <div className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {orderedButtons.map((btn) => {
            const action = btn.action || `custom_${btn.id}`;
            return (
              <button
                key={btn.id}
                onClick={() => executeAction(action)}
                disabled={isButtonDisabled(action)}
                className={`
                  flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium
                  transition-all duration-200
                  ${isButtonActive(action)
                    ? 'bg-orange-500 animate-pulse shadow-lg shadow-orange-500/50'
                    : 'bg-gray-800 hover:bg-gray-700 border border-gray-600'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span className="flex-shrink-0">{getIcon(btn.icon)}</span>
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Terminale Output */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">Output Terminale</h3>
          <button
            onClick={clearTerminal}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 border border-gray-600"
          >
            Pulisci
          </button>
        </div>

        <div
          ref={terminalRef}
          className="flex-1 bg-gradient-to-b from-black to-gray-900 rounded-lg border border-gray-700 p-3 overflow-y-auto font-mono text-sm"
          style={{
            backgroundImage: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
            boxShadow: 'inset 0 0 50px rgba(34, 197, 94, 0.1)',
          }}
        >
          {output.map((item, index) => (
            <div
              key={index}
              className="leading-relaxed"
              style={{
                color: item.is_error ? '#ef4444' : item.line.includes('===') ? '#22c55e' : item.line.match(/\[.*\]/) ? '#eab308' : '#22c55e',
                textShadow: item.is_error ? '0 0 10px rgba(239, 68, 68, 0.5)' : '0 0 10px rgba(34, 197, 94, 0.5)',
                fontWeight: item.line.includes('===') ? 'bold' : 'normal',
                marginTop: item.line.includes('===') ? '0.5rem' : '0',
              }}
            >
              {item.line}
            </div>
          ))}
        </div>

        {/* Indicatore stato */}
        {isExecutingGlobal && (
          <div className="mt-2 flex items-center gap-2 text-orange-400 text-sm">
            <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full" />
            <span>Esecuzione in corso...</span>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-gray-800 rounded-lg p-3 border border-gray-700">
        <h4 className="text-white font-medium mb-1 text-sm">Note di utilizzo</h4>
        <ul className="text-xs text-gray-400 space-y-0.5">
          <li>• Gli aggiornamenti WebApp eseguono git reset --hard nella cartella configurata</li>
          <li>• I servizi vengono riavviati tramite systemctl</li>
          <li>• Durante l'esecuzione, tutti i pulsanti sono disabilitati</li>
          <li>• Clicca "Gestisci" per modificare, aggiungere o eliminare pulsanti</li>
        </ul>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 text-center text-gray-500 text-xs border-t border-gray-800">
        BoltUbuntu Manutenzione Module &bull; Ver.6.2Giu2026 &bull; Powered by Flask-SocketIO
      </div>

      {/* Modal Gestione Pulsanti */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Gestione Pulsanti</h3>
              <button
                onClick={() => { setShowEditor(false); resetForm(); }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Lista Pulsanti */}
              <div className="space-y-3 mb-6">
                {orderedButtons.map((btn, index) => (
                  <div
                    key={btn.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="flex items-center gap-3 bg-gray-900 rounded-lg p-3 border border-gray-700 cursor-move"
                  >
                    <div className="flex flex-col text-gray-500">
                      {icons.up}
                      {icons.down}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{btn.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          btn.category === 'webapp' ? 'bg-purple-900 text-purple-300' :
                          btn.category === 'utility' ? 'bg-green-900 text-green-300' :
                          'bg-blue-900 text-blue-300'
                        }`}>
                          {btn.category}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{btn.action || btn.command}</div>
                    </div>
                    <button
                      onClick={() => handleEditButton(btn)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                      title="Modifica"
                    >
                      {icons.edit}
                    </button>
                    <button
                      onClick={() => handleDeleteButton(btn.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Elimina"
                    >
                      {icons.delete}
                    </button>
                  </div>
                ))}
              </div>

              {/* Form aggiunta/modifica */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-4">
                  {editingButton ? 'Modifica Pulsante' : 'Aggiungi Nuovo Pulsante'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Etichetta</label>
                    <input
                      type="text"
                      id="btn-label"
                      placeholder="Es: Riavvia Database"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Tipo Azione</label>
                    <select
                      id="btn-action-type"
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value as 'preset' | 'custom')}
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="preset">Azione Predefinita</option>
                      <option value="custom">Comando Personalizzato</option>
                    </select>
                  </div>
                </div>

                {actionType === 'preset' ? (
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Seleziona Azione</label>
                    <select
                      id="btn-action-preset"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="update_webapp1">Aggiorna WebApp 1</option>
                      <option value="update_webapp2">Aggiorna WebApp 2</option>
                      <option value="update_webapp3">Aggiorna WebApp 3</option>
                      <option value="check_ports">Verifica Porte</option>
                      <option value="check_services">Stato Servizi SaaS</option>
                      <option value="cleanup">Pulizia Spazio e Log</option>
                    </select>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Comando Shell</label>
                    <input
                      type="text"
                      id="btn-command"
                      placeholder="Es: docker restart mycontainer"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveButton}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    Salva Pulsante
                  </button>
                  <button
                    onClick={() => { resetForm(); }}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}