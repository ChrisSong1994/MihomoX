import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const config: NextConfig = {
  async rewrites() {
    // 在 Next.js 配置加载时（启动时）打印账号密码信息
    const username = process.env.MIHOMONEXT_USERNAME || 'mihomonext';
    const password = process.env.MIHOMONEXT_PASSWORD || 'admin-123456';
    
    console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------');
    console.log('\x1b[36m%s\x1b[0m', '  MihomoNext 启动成功！');
    console.log('\x1b[36m%s\x1b[0m', `  登录账号: ${username}`);
    console.log('\x1b[36m%s\x1b[0m', `  登录密码: ${password}`);
    console.log('\x1b[36m%s\x1b[0m', '--------------------------------------------------');

    return [
      // 将所有 /mihomo-api/* 请求转发到本地 9099 端口
      {
        source: '/mihomo-api/:path*',
        destination: 'http://127.0.0.1:9099/:path*',
      },
    ];
  },
};

export default withNextIntl(config);
