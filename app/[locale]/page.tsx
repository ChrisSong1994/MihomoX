'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function Dashboard() {
  const t = useTranslations('Dashboard');
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [ipInfo, setIpInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch system stats
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch kernel status
        const statusRes = await fetch('/api/kernel');
        const statusData = await statusRes.json();
        setStatus(statusData);

        // Mock IP info (can be replaced with real API or kernel interface)
        setIpInfo({
          ip: '127.0.0.1',
          location: 'Local Network',
          isp: 'Intranet',
        });
      } catch (e) {
        console.error('Fetch error:', e);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-medium mb-2">{t('upload')}</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats?.network?.up || '0 KB/s'}
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-1/3" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-medium mb-2">{t('download')}</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats?.network?.down || '0 KB/s'}
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 w-1/2" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-medium mb-2">{t('memory')}</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats?.memory?.used || '0 MB'}
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-500" 
              style={{ width: `${stats?.memory?.percent || 0}%` }} 
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-medium mb-2">{t('mode')}</div>
          <div className="text-2xl font-bold text-slate-800 capitalize">
            {status?.config?.mode || 'Rule'}
          </div>
          <div className="mt-4 flex gap-2">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
              {status?.config?.['enhanced-mode'] || 'Fake-IP'}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Subscription Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800">{t('activeSub')}</h3>
            <Link href="/subscriptions" className="text-indigo-600 text-sm font-medium hover:underline">
              {t('manageSub')}
            </Link>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v4M7 7h10" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-slate-800 mb-1">{t('defaultSub')}</div>
                <div className="text-slate-500 text-sm flex items-center gap-4">
                  <span>{t('nodeCount')}: 42</span>
                  <span>•</span>
                  <span>{t('lastUpdate')}: {t('minutesAgo', { minutes: 10 })}</span>
                </div>
              </div>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                {t('updateNow')}
              </button>
            </div>
          </div>
        </div>

        {/* IP Info Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">{t('ipInfo')}</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">{t('currentIp')}</div>
              <div className="text-slate-700 font-mono font-medium">{ipInfo?.ip}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">{t('location')}</div>
              <div className="text-slate-700 font-medium">{ipInfo?.location}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">{t('isp')}</div>
              <div className="text-slate-700 font-medium">{ipInfo?.isp}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
