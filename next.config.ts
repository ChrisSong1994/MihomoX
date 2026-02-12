import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const config: NextConfig = {
  async rewrites() {
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
