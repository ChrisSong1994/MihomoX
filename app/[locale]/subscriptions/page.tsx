'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function SubscriptionsPage() {
  const t = useTranslations('Subscriptions');
  const [subs, setSubs] = useState<any[]>([]);
  const [newSub, setNewSub] = useState({ name: '', url: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchSubs = async () => {
    try {
      const res = await fetch('/api/subscribe');
      const data = await res.json();
      if (data.success) {
        setSubs(data.subscriptions || []);
      }
    } catch (e) {
      console.error('Fetch subscriptions error:', e);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name || !newSub.url) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub),
      });
      const data = await res.json();
      if (data.success) {
        setNewSub({ name: '', url: '' });
        fetchSubs();
      }
    } catch (e) {
      console.error('Add subscription error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSub = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      await fetch(`/api/subscribe?id=${id}`, { method: 'DELETE' });
      fetchSubs();
    } catch (e) {
      console.error('Delete subscription error:', e);
    }
  };

  const toggleSub = async (id: string) => {
    try {
      await fetch('/api/subscribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchSubs();
    } catch (e) {
      console.error('Toggle subscription error:', e);
    }
  };

  const applySub = async (url: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action: 'apply' }),
      });
      const data = await res.json();
      if (data.success) {
        alert(t('update') + ' ' + (data.message || 'Success'));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      console.error('Apply subscription error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Add Subscription Form */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">{t('addNew')}</h2>
        <form onSubmit={handleAddSub} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder={t('placeholderName')}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={newSub.name}
              onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
            />
            <input
              type="text"
              placeholder={t('placeholderUrl')}
              className="flex-[2] px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={newSub.url}
              onChange={(e) => setNewSub({ ...newSub, url: e.target.value })}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? t('adding') : t('add')}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="font-bold text-slate-800">{t('saved')} ({subs.length})</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {subs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 border-dashed text-center text-slate-400">
              {t('noSubs')}
            </div>
          ) : (
            subs.map((sub: any) => (
              <div key={sub.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 truncate">{sub.name}</span>
                    {sub.enabled ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold uppercase">{t('enabled')}</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px] font-bold uppercase">{t('disabled')}</span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs truncate font-mono">{sub.url}</div>
                </div>
                <div className="flex gap-2 ml-6">
                  <button 
                    onClick={() => applySub(sub.url)}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {t('update')}
                  </button>
                  <button 
                    onClick={() => toggleSub(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      sub.enabled 
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {sub.enabled ? t('disable') : t('enable')}
                  </button>
                  <button 
                    onClick={() => deleteSub(sub.id)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
