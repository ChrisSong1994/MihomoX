"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Lock, User, Loader2 } from "lucide-react";

/**
 * 登录页面组件
 */
export default function LoginPage() {
  const t = useTranslations("Login");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * 处理语言切换
   */
  const handleLanguageChange = async (newLocale: string) => {
    // 1. 设置 next-intl 的 Cookie
    const cookieOptions = 'path=/; max-age=31536000; SameSite=Lax';
    document.cookie = `NEXT_LOCALE=${newLocale}; ${cookieOptions}`;
    
    // 2. 更新 URL 路径以确保语言切换正确
    const currentPath = pathname.replace(/^\/(zh|en)/, '') || '/';
    const newPath = `/${newLocale}${currentPath === '/' ? '' : currentPath}`;
    router.push(newPath);
  };

  /**
   * 处理登录提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        // 登录成功，跳转到主页（带语言前缀）
        router.push(`/${locale}`);
        router.refresh();
      } else {
        setError(t("error"));
      }
    } catch (err) {
      setError("网络错误，请稍后再试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      {/* 语言切换按钮 */}
      <div className="fixed top-4 right-4">
        <select
          value={locale}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
        >
          <option value="zh">简体中文</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src="/logo.png" alt="Logo" width={52} height={52} className="rounded-lg" />
          <span className="text-4xl font-bold bg-linear-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            MihomoX
          </span>
        </div>

        <div className="text-center mb-4">
          <p className="text-slate-500 mt-2">Welcome back to MihomoX</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("username")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t("placeholderUsername")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("password")}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={t("placeholderPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("submit")
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
