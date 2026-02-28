# MihomoX

MihomoX 是一个基于 Next.js 的 Mihomo (Clash.Meta) 可视化管理面板，提供订阅管理、内核控制、流量统计等功能。

## ✨ 特性

- 📊 **订阅管理** - 支持多个订阅源，自动合并代理节点
- 🎛️ **内核控制** - 一键启动/停止 Mihomo 内核
- 📈 **流量监控** - 实时流量统计和历史记录
- 🔐 **安全认证** - JWT 认证 + 安全 Cookie
- 🛡️ **多层防护** - Rate Limiting、CSP、XSS 防护
- 🌐 **国际化** - 支持中文/英文
- 🔧 **热更新** - 支持端口热更新，无需重启

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- Mihomo 内核二进制文件

### 安装

```bash
# 安装依赖
pnpm install

# 下载 Mihomo 内核（可选，首次运行会自动提示）
# 放置到 bin/ 目录下，文件名格式：
#   - mihomo-darwin-amd64
#   - mihomo-darwin-arm64
#   - mihomo-linux-amd64
#   - mihomo-linux-arm64
#   - mihomo-windows-amd64.exe
```

### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置
nano .env.local
```

### 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build && pnpm start
```

## ⚙️ 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `WEB_PORT` | Web 服务端口 | `3790` |
| `MIXED_PORT` | 代理混合端口 | `7890` |
| `CONTROLLER_PORT` | 控制 API 端口 | `9099` |
| `MIHOMO_SECRET` | Mihomo API 密钥 | - |
| `JWT_SECRET` | JWT 签名密钥 | `MIHOMO_SECRET` |
| `MihomoX_USERNAME` | 登录用户名 | `MihomoX` |
| `MihomoX_PASSWORD` | 登录密码 | - |
| `LOG_LEVEL` | 日志级别 | `info` |

## 📡 API 接口

### 认证

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "MihomoX",
  "password": "your-password"
}
```

### 健康检查

```http
GET /api/health
```

### 订阅管理

```http
# 获取订阅列表
GET /api/subscribe

# 添加订阅
POST /api/subscribe
{
  "name": "My VPN",
  "url": "https://example.com/sub"
}

# 更新订阅
PATCH /api/subscribe
{
  "id": "abc123",
  "enabled": true
}

# 删除订阅
DELETE /api/subscribe?id=abc123

# 应用订阅
POST /api/subscribe
{
  "action": "apply"
}
```

### 内核管理

```http
# 获取状态
GET /api/kernel

# 启动/停止
POST /api/kernel
{
  "action": "start" | "stop"
}
```

### 设置管理

```http
# 获取设置
GET /api/settings

# 更新设置
PATCH /api/settings
{
  "locale": "zh",
  "mixed_port": 7890
}

# 快速端口更新
PUT /api/settings
{
  "mixed_port": 7890,
  "controller_port": 9099
}
```

## 🔐 安全配置

### 生产环境建议

1. **设置强密码**
   ```bash
   export MihomoX_PASSWORD="your-secure-password-min-16-chars"
   export MIHOMO_SECRET="your-mihomo-api-secret"
   export JWT_SECRET="your-jwt-secret-min-32-chars"
   ```

2. **启用 HTTPS**
   - 使用 Nginx/Caddy 反向代理
   - 或配置 Next.js SSL

3. **配置防火墙**
   ```bash
   # 仅允许本地访问
   ufw allow 127.0.0.1:3790/tcp
   
   # 或限制来源 IP
   ufw allow from 192.168.1.0/24 to any port 3790
   ```

4. **安全头部**
   - CSP (Content Security Policy)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - HSTS (生产环境)

## 🏗️ 项目结构

```
MihomoX/
├── bin/                      # Mihomo 内核二进制
├── config/                  # 配置文件
│   └── initial.json          # 初始配置
├── public/                   # 静态资源
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API 路由
│   │   │   ├── auth/       # 认证
│   │   │   ├── config/     # 配置
│   │   │   ├── health/     # 健康检查
│   │   │   ├── kernel/     # 内核管理
│   │   │   ├── settings/   # 设置
│   │   │   └── subscribe/  # 订阅管理
│   │   ├── [locale]/       # 国际化路由
│   │   └── ...
│   ├── components/         # React 组件
│   ├── lib/                 # 工具库
│   │   ├── api-utils.ts    # API 工具
│   │   ├── auth.ts         # 认证
│   │   ├── cache.ts        # 缓存
│   │   ├── client-api.ts   # API 客户端
│   │   ├── logger.ts       # 日志
│   │   ├── mihomo.ts      # 内核管理
│   │   ├── security.ts    # 安全中间件
│   │   └── store.ts       # 数据存储
│   └── server/
│       └── types/          # 类型定义
│   │── middleware.ts       # 中间件 
├── messages/               # 国际化消息
├── next.config.ts          # Next.js 配置
└── package.json
```

## 🛠️ 开发

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 构建
pnpm build

# 生产运行
pnpm start
```

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t mihomox .

# 运行容器
docker run -d \
  -p 3790:3790 \
  -p 7890:7890 \
  -p 9099:9099 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  -e MihomoX_PASSWORD=your-password \
  -e MIHOMO_SECRET=your-secret \
  --name mihomox \
  mihomox
```

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
