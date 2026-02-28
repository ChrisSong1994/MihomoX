"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Terminal, Trash2, RefreshCcw, ArrowDown } from "lucide-react";

export default function LogsPage() {
  const t = useTranslations("Logs");
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [refreshing, setRefreshing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/kernel/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('[Logs] Fetch logs error:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    let interval: NodeJS.Timeout | null = null;
    if (refreshing) {
      interval = setInterval(fetchLogs, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshing]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-indigo-600" />
            {t("title")}
          </h1>
          <p className="text-slate-500 mt-1">
            {t("subtitle") ||
              (t.raw("title") === "系统日志"
                ? "查看内核实时输出日志"
                : "View real-time kernel output logs")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setRefreshing(!refreshing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
              refreshing
                ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                : "bg-slate-50 text-slate-600 border border-slate-200"
            }`}
          >
            <RefreshCcw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </button>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm ${
              autoScroll
                ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                : "bg-slate-50 text-slate-600 border border-slate-200"
            }`}
          >
            <ArrowDown
              className={`h-4 w-4 ${autoScroll ? "translate-y-0.5" : ""}`}
            />
            {t("autoScroll")}
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all duration-200 font-medium text-sm border border-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            {t("clear")}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800">
        <div
          ref={scrollRef}
          className="p-6 h-[calc(100vh-220px)] overflow-y-auto font-mono text-sm space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent selection:bg-indigo-500/30"
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
              <Terminal className="h-12 w-12 opacity-20" />
              <p>{t("noLogs")}</p>
            </div>
          ) : (
            logs.map((log, i) => {
              let textColor = "text-slate-300";
              if (log.includes("[ERROR]")) textColor = "text-rose-400";
              if (log.includes("[WARNING]")) textColor = "text-amber-400";
              if (log.includes("[SYSTEM]")) textColor = "text-indigo-400";
              if (log.includes("[STDOUT]")) textColor = "text-emerald-400";
              if (log.includes("[STDERR]")) textColor = "text-rose-400";

              return (
                <div
                  key={i}
                  className={`${textColor} break-all hover:bg-slate-800/50 rounded px-1 transition-colors leading-relaxed`}
                >
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
