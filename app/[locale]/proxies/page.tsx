'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function ProxiesPage() {
  const t = useTranslations('Proxies');
  const [proxies, setProxies] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [latencies, setLatencies] = useState<Record<string, number>>({});

  const fetchProxies = async () => {
    try {
      const res = await fetch('/mihomo-api/proxies'); // API path with prefix
      const data = await res.json();
      
      const allProxies = data.proxies || {};
      const proxyGroups = Object.keys(allProxies)
        .filter(name => allProxies[name].type === 'Selector' || allProxies[name].type === 'URLTest')
        .map(name => ({ name, ...allProxies[name] }));
      
      setGroups(proxyGroups);
      if (!activeGroup && proxyGroups.length > 0) {
        setActiveGroup(proxyGroups[0].name);
      }
      setLoading(false);
    } catch (e) {
      console.error('Fetch proxies error:', e);
    }
  };

  useEffect(() => {
    fetchProxies();
    const timer = setInterval(fetchProxies, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSelect = async (groupName: string, proxyName: string) => {
    try {
      await fetch(`/mihomo-api/proxies/${encodeURIComponent(groupName)}`, { // API path with prefix
        method: 'PUT',
        body: JSON.stringify({ name: proxyName }),
      });
      fetchProxies();
    } catch (e) {
      console.error('Select proxy error:', e);
    }
  };

  const testLatency = async (proxyName: string) => {
    setTesting(prev => ({ ...prev, [proxyName]: true }));
    try {
      const url = `http://www.gstatic.com/generate_204`;
      const res = await fetch(`/mihomo-api/proxies/${encodeURIComponent(proxyName)}/delay?timeout=5000&url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.delay) {
        setLatencies(prev => ({ ...prev, [proxyName]: data.delay }));
      }
    } catch (e) {
      console.error('Latency test error:', e);
    } finally {
      setTesting(prev => ({ ...prev, [proxyName]: false }));
    }
  };

  const testAllInGroup = async () => {
    if (!currentGroup) return;
    const nodes = currentGroup.all || [];
    nodes.forEach((node: string) => testLatency(node));
  };

  const currentGroup = groups.find(g => g.name === activeGroup);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">{t('title')}</h2>
        <button
          onClick={testAllInGroup}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
        >
          {t('testAll')}
        </button>
      </div>
      
      {/* Policy Group Selection */}
      <div className="flex flex-wrap gap-2">
        {groups.map(group => (
          <button
            key={group.name}
            onClick={() => setActiveGroup(group.name)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeGroup === group.name 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* Node List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
          ))
        ) : (
          currentGroup?.all?.map((proxyName: string) => {
            const isActive = currentGroup.now === proxyName;
            const isNodeTesting = testing[proxyName];
            const latency = latencies[proxyName];

            return (
              <div
                key={proxyName}
                className={`p-4 rounded-2xl border transition-all text-left group relative overflow-hidden flex flex-col justify-between ${
                  isActive 
                    ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10' 
                    : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
                }`}
              >
                <div 
                  className="absolute inset-0 cursor-pointer" 
                  onClick={() => handleSelect(currentGroup.name, proxyName)}
                />
                
                <div className="flex justify-between items-start mb-2 relative z-10 pointer-events-none">
                  <span className={`font-bold truncate pr-4 ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {proxyName}
                  </span>
                  {isActive && (
                    <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      {isNodeTesting ? t('testing') : (latency ? `${latency}ms` : 'Node')}
                    </span>
                    {isActive && <span className="text-xs font-mono text-emerald-500 font-bold">{t('selectNode')}</span>}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      testLatency(proxyName);
                    }}
                    disabled={isNodeTesting}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isNodeTesting 
                        ? 'bg-slate-100 text-slate-400' 
                        : 'bg-slate-50 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                    title={t('latencyTest')}
                  >
                    <svg className={`w-3.5 h-3.5 ${isNodeTesting ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
