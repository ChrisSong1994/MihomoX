"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

export default function Header() {
  const pathname = usePathname();
  const t = useTranslations('Header');
  const ts = useTranslations('Sidebar');
  
  const [isRunning, setIsRunning] = useState(false);

  // 从当前路径中提取语言环境
  const localeMatch = pathname.match(/^\/(zh|en)(\/|$)/);
  const currentLocale = localeMatch ? localeMatch[1] : 'zh';
  const purePathname = localeMatch ? pathname.replace(/^\/(zh|en)/, '') : pathname;

  const routeTitles: Record<string, string> = {
    "/": ts("status"),
    "/subscriptions": ts("subscriptions"),
    "/proxies": ts("proxies"),
    "/logs": ts("logs"),
    "/settings": ts("settings"),
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/kernel");
        const data = await res.json();
        setIsRunning(data.running);
      } catch (e) {
        setIsRunning(false);
      }
    };
    checkStatus();
    const timer = setInterval(checkStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-8">
      <h1 className="text-slate-800 font-semibold text-lg">
        {routeTitles[purePathname] || "MihomoNext"}
      </h1>
      <div className="flex items-center gap-4">
        {isRunning ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium border border-emerald-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            {t('running')}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-medium border border-rose-100">
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
            {t('stopped')}
          </div>
        )}
      </div>
    </header>
  );
}
