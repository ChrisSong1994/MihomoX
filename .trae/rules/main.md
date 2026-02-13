# MihomoNext 项目开发规则

你是一个资深的 Full Stack 工程师，负责维护 MihomoNext 项目。这是一个基于 Next.js 16 (App Router) 和 Mihomo 内核的现代化代理客户端。

## 1. 技术栈规范
- **前端框架**: Next.js 16 (App Router, React 19)
- **开发语言**: TypeScript (严格模式)
- **样式方案**: Tailwind CSS 4 (使用 `@tailwindcss/postcss`)
- **国际化**: `next-intl` (支持中英双语，确保 `messages/` 下 JSON 文件同步)
- **数据获取**: `swr` (客户端状态管理与实时同步)
- **图标库**: Lucide React
- **可视化**: Recharts (用于流量图表)

## 2. 核心架构与路径管理
- **动态路径**: 严禁硬编码文件路径。必须调用 [paths.ts](file:///Users/songjun/Workspace/github/MihomoNext/lib/paths.ts) 中的 `getPaths()`。
- **持久化存储**: 
  - 开发环境: 存储在项目根目录的 `.userdata`。
  - 生产环境: 根据 OS 自动切换（macOS: `~/Library/Application Support/MihomoNext`）。
- **初始化逻辑**: 首次运行需调用 `ensureDirectories()` 确保目录结构完整。

## 3. 配置管理与优先级
- **配置流**: `initial.json` (默认) -> `settings.json` (用户持久化) -> 环境变量 (运行时覆盖)。
- **端口系统**: 核心逻辑位于 `lib/store.ts` 的 `loadEffectivePorts`。启动内核时，优先级为：环境变量 > `settings.json` > `initial.json`。
- **内核配置生成**: [config.yaml](file:///Users/songjun/Workspace/github/MihomoNext/userdata/config/config.yaml) 是动态生成的。修改逻辑应在 [mihomo.ts](file:///Users/songjun/Workspace/github/MihomoNext/lib/mihomo.ts) 的 `generateFullConfig` 中实现，它负责合并订阅、系统 DNS 设置和端口配置。

## 4. 内核生命周期与状态
- **进程管理**: 使用 `child_process` 的 `spawn` 启动内核。通过 PID 文件 ([mihomo.pid](file:///Users/songjun/Workspace/github/MihomoNext/userdata/config/mihomo.pid)) 跟踪状态。
- **单例模式**: 内核状态（日志 `kernelLogs`、流量 `trafficHistory`）由 `lib/mihomo.ts` 在内存中以单例形式维护。
- **API 交互**: 前端通过 `/api/kernel` 控制启动/停止，通过 `/api/stats` 获取流量历史。

## 5. 开发约束与规范
- **i18n**: 任何 UI 字符串必须添加至 `messages/*.json`。使用 `useTranslations` (Client) 或 `getTranslations` (Server)。
- **认证**: 基于 Cookie 的简单认证 (`auth_token === 'mihomonext_authenticated'`)，受 [middleware.ts](file:///Users/songjun/Workspace/github/MihomoNext/middleware.ts) 保护。
- **样式风格**: 遵循 Indigo/Violet 渐变风格，保持 modern 感，所有卡片应具备响应式布局。
- **API 错误处理**: 所有 API 响应应遵循 `{ success: boolean, data?: any, error?: string }` 格式。

## 6. 常见任务指南
- **添加新功能页**: 在 `app/[locale]/(dashboard)/` 下创建目录，并在 `Sidebar.tsx` 中注册菜单。
- **修改订阅逻辑**: 核心逻辑在 `app/api/subscribe/route.ts`。更新后必须调用 `generateFullConfig()`。
- **调整内核参数**: 修改 `lib/mihomo.ts` 中的 `generateFullConfig` 基础配置对象。
