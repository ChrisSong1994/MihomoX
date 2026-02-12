'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingPort, setEditingPort] = useState<string | null>(null);
  const [portValue, setPortValue] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [configContent, setConfigContent] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/kernel');
      const data = await res.json();
      setRunning(data.running);
      setConfig(data.config);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConfigFile = async () => {
    try {
      const res = await fetch('/api/config/view');
      const data = await res.json();
      if (data.success) {
        setConfigContent(data.content);
        setShowConfig(true);
      } else {
        setMessage(data.error);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e: any) {
      setMessage(e.message);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleKernelAction = async (action: 'start' | 'stop') => {
    setLoading(true);
    try {
      const res = await fetch('/api/kernel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      fetchStatus();
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      // Ensure port is a number
      const finalValue = (key === 'port' || key === 'mixed-port' || key === 'socks-port') 
        ? parseInt(value) 
        : value;

      // 1. Update running kernel config via RESTful API
      await fetch('/mihomo-api/configs', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: finalValue }),
      });

      // 2. Persist to local config.yaml file
      await fetch('/api/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: finalValue }),
      });

      fetchStatus();
      setMessage(`${t('updated')} ${key}`);
      setTimeout(() => setMessage(''), 2000);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Kernel Control */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{t('kernelManagement')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('kernelDesc')}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchConfigFile}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all border border-slate-200"
            >
              {t('viewConfig')}
            </button>
            {!running ? (
              <button
                onClick={() => handleKernelAction('start')}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
              >
                {t('startKernel')}
              </button>
            ) : (
              <button
                onClick={() => handleKernelAction('stop')}
                disabled={loading}
                className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
              >
                {t('stopKernel')}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">{t('status')}</div>
            <div className={`text-sm font-bold ${running ? 'text-emerald-600' : 'text-slate-400'}`}>
              {running ? t('running') : t('stopped')}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">{t('controllerAddress')}</div>
            <div className="text-sm font-mono text-slate-600">127.0.0.1:9099</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-400 font-bold uppercase mb-1">{t('mixedPort')}</div>
            <div className="flex items-center justify-between">
              {editingPort === 'mixed-port' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={portValue}
                    onChange={(e) => setPortValue(e.target.value.replace(/\D/g, ''))}
                    className="w-20 px-2 py-1 bg-white border border-indigo-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                    onBlur={() => {
                      if (portValue && portValue !== (config?.['mixed-port']).toString()) {
                        updateConfig('mixed-port', portValue);
                      }
                      setEditingPort(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (portValue && portValue !== (config?.['mixed-port']).toString()) {
                          updateConfig('mixed-port', portValue);
                        }
                        setEditingPort(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <div 
                  className="text-sm font-mono text-slate-600 cursor-pointer hover:text-indigo-600 flex items-center gap-2"
                  onClick={() => {
                    setEditingPort('mixed-port');
                    setPortValue((config?.['mixed-port'] || '').toString());
                  }}
                >
                  {config?.['mixed-port'] || '--'}
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Proxy Settings */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">{t('serviceConfig')}</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
            <div>
              <div className="font-bold text-slate-700">{t('proxyMode')}</div>
              <div className="text-slate-400 text-sm">{t('proxyModeDesc')}</div>
            </div>
            <select 
              value={config?.mode || 'rule'}
              onChange={(e) => updateConfig('mode', e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="global">{t('global')}</option>
              <option value="rule">{t('rule')}</option>
              <option value="direct">{t('direct')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
            <div>
              <div className="font-bold text-slate-700">{t('allowLan')}</div>
              <div className="text-slate-400 text-sm">{t('allowLanDesc')}</div>
            </div>
            <button 
              onClick={() => updateConfig('allow-lan', !config?.['allow-lan'])}
              className={`w-12 h-6 rounded-full transition-all relative ${config?.['allow-lan'] ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config?.['allow-lan'] ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors">
            <div>
              <div className="font-bold text-slate-700">{t('logLevel')}</div>
              <div className="text-slate-400 text-sm">{t('logLevelDesc')}</div>
            </div>
            <select 
              value={config?.['log-level'] || 'info'}
              onChange={(e) => updateConfig('log-level', e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
              <option value="silent">Silent</option>
            </select>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="text-center text-slate-400 text-xs">
        MihomoNext Dashboard v1.0.0 • Powered by Next.js & Mihomo
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{t('configContent')}</h3>
              <button 
                onClick={() => setShowConfig(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-slate-900 text-slate-300 p-6 rounded-2xl font-mono text-sm leading-relaxed overflow-x-auto shadow-inner">
                {configContent}
              </pre>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button 
                onClick={() => setShowConfig(false)}
                className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
