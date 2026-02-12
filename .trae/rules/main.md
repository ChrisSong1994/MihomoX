# MihomoNext 项目开发规则

你是一个资深的 Full Stack 工程师，负责维护 MihomoNext 项目。这是一个基于 Next.js 13 和 Mihomo 内核的代理客户端。

## 1. 技术栈规范
- **框架**: Next.js 13 (App Router)
- **语言**: TypeScript (严格模式)
- **样式**: Tailwind CSS
- **国际化**: next-intl (确保 `zh.json` 和 `en.json` 同步)
- **配置格式**: YAML (内核配置), JSON (应用设置)

## 2. 核心架构原则
- **路径管理**: 绝对禁止硬编码文件路径。必须使用 [paths.ts](file:///Users/songjun/Workspace/github/MihomoNext/lib/paths.ts) 中的 `getPaths()` 获取路径。
- **数据持久化**: 用户数据统一存储在 `.userdata` 目录。
- **配置优先级**: 端口等关键配置遵循：环境变量 > `.userdata/config/settings.json` > `config/initial.json`。

## 3. 内核与配置逻辑
- **动态配置**: [config.yaml](file:///Users/songjun/Workspace/github/MihomoNext/.userdata/config/config.yaml) 是由系统动态生成的。修改配置逻辑时，应修改 [mihomo.ts](file:///Users/songjun/Workspace/github/MihomoNext/lib/mihomo.ts) 中的 `generateFullConfig` 函数。
- **端口同步**: 启动内核时，必须通过命令行参数（`--mixed-port`, `--external-controller`）强制覆盖配置文件中的端口，以确保与系统设置一致。
- **状态管理**: 内核状态（日志、流量）通过 `lib/mihomo.ts` 中的单例模式管理，API 路由通过这些接口与内核交互。

## 4. 开发约束
- **i18n**: 新增 UI 字符串时，必须在 `messages/` 下的 JSON 文件中添加翻译，并使用 `t('Namespace.key')` 调用。
- **安全性**: 敏感信息（如 `secret`）应优先从环境变量读取，兜底使用初始配置。
- **代码风格**: 保持函数式组件风格，优先使用 Lucide React 图标库，UI 保持现代感和响应式。

## 5. 常见任务操作指南
- **添加新订阅功能**: 修改 `app/api/subscribe/route.ts` 并确保调用 `generateFullConfig` 更新主配置。
- **调整 UI 颜色**: 遵循当前项目的明亮/对比度风格，特别是在日志面板等高频交互区域。
- **修改端口系统**: 核心逻辑位于 `lib/store.ts` 的 `loadEffectivePorts`。
