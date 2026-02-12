# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# 使用国内镜像加速 apk 安装
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建依赖和 pnpm
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

# 复制依赖定义
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 使用国内镜像加速 apk 安装
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装运行所需的依赖
RUN apk add --no-cache libc6-compat curl

# 复制构建产物和必要的运行文件
# 注意：Standalone 模式不需要 pnpm 运行时
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/config ./config

# 创建用户数据目录
RUN mkdir -p /app/.userdata

# 暴露端口
EXPOSE 3000
EXPOSE 7890

# 启动命令
CMD ["node", "server.js"]
