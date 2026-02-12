"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import { LayoutDashboard, Globe, Library, FileText, Settings, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Sidebar');

  const menuItems = [
    { name: t("status"), href: "/", icon: LayoutDashboard },
    { name: t("subscriptions"), href: "/subscriptions", icon: Library },
    { name: t("proxies"), href: "/proxies", icon: Globe },
    { name: t("logs"), href: "/logs", icon: FileText },
    { name: t("settings"), href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-50 flex flex-col">
      <div className="p-6">
        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
          MihomoNext
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.includes(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                isActive
                  ? "bg-indigo-50 text-indigo-600 shadow-sm"
                  : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 font-medium"
        >
          <LogOut className="h-5 w-5" />
          {t("logout")}
        </button>
        <div className="px-4 py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">
          v1.0.0 Stable
        </div>
      </div>
    </aside>
  );
}
