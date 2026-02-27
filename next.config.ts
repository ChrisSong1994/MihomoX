import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { loadEffectivePorts } from './src/lib/store';

const withNextIntl = createNextIntlPlugin();

const config: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // 初始化端口配置（优先级：环境变量 > settings.json > initial.json）
    const ports = loadEffectivePorts();
    const controllerPort = ports.controller_port;

    // 安全启动信息（不打印敏感信息）
    const username = process.env.MihomoX_USERNAME || 'MihomoX';
    
    console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------');
    console.log('\x1b[36m%s\x1b[0m', '  MihomoX launched successfully!');
    console.log('\x1b[36m%s\x1b[0m', `  username: ${username}`);
    console.log('\x1b[36m%s\x1b[0m', `  WEB PORT: ${3790}`);
    console.log('\x1b[36m%s\x1b[0m', `  MIXED PORT: ${ports.mixed_port}`);
    console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------');
    console.log('\x1b[33m%s\x1b[0m', '  Security: Please set MIHOMO_SECRET and MihomoX_PASSWORD environment variables in production!');

    return [
      // 将所有 /mihomo-api/* 请求转发到本地控制器端口
      {
        source: '/mihomo-api/:path*',
        destination: `http://127.0.0.1:${controllerPort}/:path*`,
      },
    ];
  },
};

export default withNextIntl(config);
