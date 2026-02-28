'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/Toast';

export default function SubscriptionsPage() {
  const t = useTranslations('Subscriptions');
  const { showToast } = useToast();
  const [subs, setSubs] = useState<any[]>([]);
  const [newSub, setNewSub] = useState({ name: '', url: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [viewingConfig, setViewingConfig] = useState<any>(null);
  const [configContent, setConfigContent] = useState<string>('');

  const fetchSubs = async () => {
    try {
      const res = await fetch('/api/subscribe');
      const data = await res.json();
      if (data.success) {
        setSubs(data.subscriptions || []);
      }
    } catch (e) {
      console.error('[Subscriptions] Fetch subscriptions error:', e);
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
      console.error('[Subscriptions] Add subscription error:', e);
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
      console.error('[Subscriptions] Delete subscription error:', e);
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
      console.error('[Subscriptions] Toggle subscription error:', e);
    }
  };

  const handleEditSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub?.name || !editingSub?.url) return;

    try {
      const res = await fetch('/api/subscribe', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSub.id,
          name: editingSub.name,
          url: editingSub.url
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(t('updated'), 'success');
        setEditingSub(null);
        fetchSubs();
      }
    } catch (e) {
      console.error('[Subscriptions] Edit subscription error:', e);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('never');
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const applySub = async (url?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action: 'apply' }),
      });
      const data = await res.json();
      if (data.success) {
        if (!url) {
          const enabledCount = subs.filter(s => s.enabled).length;
          showToast(t('mergeSuccess', { count: enabledCount }), 'success');
        } else {
          showToast(t('update') + ' ' + (data.message || 'Success'), 'success');
        }
        // 重新获取订阅列表，因为 hasLocalConfig 可能已更新
        fetchSubs();
      } else {
        showToast('Error: ' + data.error, 'error');
      }
    } catch (e) {
      console.error('[Subscriptions] Apply subscription error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfigContent = async (id: string) => {
    try {
      const res = await fetch(`/api/subscribe?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setConfigContent(data.content);
      } else {
        showToast(t('configNotFound'), 'error');
        setViewingConfig(null);
      }
    } catch (e) {
      console.error('[Subscriptions] Fetch config content error:', e);
      showToast('Error fetching config content', 'error');
      setViewingConfig(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 添加订阅表单 */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">{t('addNew')}</h2>
          <button
            onClick={() => applySub()}
            disabled={isLoading || subs.filter(s => s.enabled).length === 0}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? t('applying') : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {t('applyEnabled')}
              </>
            )}
          </button>
        </div>
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

      {/* 订阅列表 */}
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
                  <div className="text-slate-400 text-xs truncate font-mono mb-2">{sub.url}</div>
                  
                  {/* 流量和日期信息 */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {sub.trafficTotal > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400">{t('traffic')}:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-indigo-600 font-bold">{formatBytes(sub.trafficUsed || 0)}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-600">{formatBytes(sub.trafficTotal)}</span>
                        </div>
                      </div>
                    )}
                    {sub.expireDate && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-400">{t('expire')}:</span>
                        <span className="text-slate-600">{new Date(sub.expireDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">{t('lastUpdate')}:</span>
                      <span className="text-slate-600">{formatDate(sub.lastUpdate)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-6">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => applySub(sub.url)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      {t('update')}
                    </button>
                    <button 
                      onClick={() => {
                        setViewingConfig(sub);
                        fetchConfigContent(sub.id);
                      }}
                      disabled={!sub.hasLocalConfig}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        sub.hasLocalConfig 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                          : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {t('viewLocalConfig')}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => setEditingSub({ ...sub })}
                      className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
                    >
                      {t('edit')}
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
                  </div>
                  <button 
                    onClick={() => deleteSub(sub.id)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors self-start"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 编辑订阅弹窗 */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-800">{t('editSub')}</h3>
              <button 
                onClick={() => setEditingSub(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSub} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">{t('name')}</label>
                <input
                  type="text"
                  value={editingSub.name}
                  onChange={(e) => setEditingSub({ ...editingSub, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder={t('placeholderName')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">{t('url')}</label>
                <textarea
                  value={editingSub.url}
                  onChange={(e) => setEditingSub({ ...editingSub, url: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[120px] font-mono text-sm"
                  placeholder={t('placeholderUrl')}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 本地订阅配置内容弹窗 */}
      {viewingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[70vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{t('localConfigTitle')}</h3>
                <p className="text-xs text-slate-400 mt-1">{viewingConfig.name}</p>
              </div>
              <button 
                onClick={() => {
                  setViewingConfig(null);
                  setConfigContent('');
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-0 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {configContent ? (
                  <pre className="text-emerald-400 whitespace-pre-wrap break-all">
                    {configContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 italic">
                    {t('applying')}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button 
                onClick={() => {
                  setViewingConfig(null);
                  setConfigContent('');
                }}
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
