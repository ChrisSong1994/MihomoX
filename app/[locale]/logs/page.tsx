'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

export default function LogsPage() {
  const t = useTranslations('Logs');
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/kernel/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error('Fetch logs error:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(fetchLogs, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-4">
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t('title')}</h2>
      
      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'info', 'warning', 'error'].map(level => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              filter === level 
                ? 'bg-slate-800 text-white shadow-lg' 
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Log Terminal */}
      <div className="flex-1 bg-slate-900 rounded-2xl p-6 font-mono text-sm overflow-y-auto border border-slate-800 shadow-2xl">
        <div className="space-y-1">
          {filteredLogs.map((log, i) => {
            const isError = log.toLowerCase().includes('error');
            const isWarning = log.toLowerCase().includes('warning');
            return (
              <div key={i} className={`break-all ${
                isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-300'
              }`}>
                <span className="text-slate-600 mr-3 select-none">[{i + 1}]</span>
                {log}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
