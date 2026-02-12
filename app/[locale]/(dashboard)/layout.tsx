import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

/**
 * 仪表盘布局组件，包含侧边栏和顶部栏
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* 侧边栏导航 */}
      <Sidebar />

      {/* 主内容区域 */}
      <main className="flex-1 ml-64 min-h-screen">
        <Header />
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
