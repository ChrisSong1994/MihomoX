'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const t = useTranslations('Dashboard');
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [ipInfo, setIpInfo] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const chartData = useMemo(() => {
    return history.map(item => ({
      time: new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      up: item.up,
      down: item.down,
      upRaw: item.up,
      downRaw: item.down
    }));
  }, [history]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch system stats
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch history
        const historyRes = await fetch('/api/stats?type=history');
        const historyData = await historyRes.json();
        setHistory(historyData);

        // Fetch kernel status
        const statusRes = await fetch('/api/kernel');
        const statusData = await statusRes.json();
        setStatus(statusData);

        // Mock IP info
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
            {formatBytes(stats?.network?.up || 0)}
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-1/3" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-medium mb-2">{t('download')}</div>
          <div className="text-2xl font-bold text-slate-800">
            {formatBytes(stats?.network?.down || 0)}
          </div>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 w-1/2" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-slate-500 text-sm font-medium mb-2">{t('memory')}</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats?.memory?.used || 0} MB
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
        {/* Traffic Chart Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800">{t('trafficHistory')}</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full" />
                <span className="text-xs text-slate-500 font-medium">Upload</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-violet-500 rounded-full" />
                <span className="text-xs text-slate-500 font-medium">Download</span>
              </div>
            </div>
          </div>
          <div className="p-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  hide={true}
                />
                <YAxis 
                  tickFormatter={(value) => formatBytes(value).split(' ')[0]} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{payload[0].payload.time}</p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-slate-600 flex items-center gap-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full" /> Upload
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-800">{formatBytes(payload[0].value as number)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-slate-600 flex items-center gap-2">
                                <div className="w-2 h-2 bg-violet-500 rounded-full" /> Download
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-800">{formatBytes(payload[1].value as number)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="up" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorUp)" 
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="down" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorDown)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
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
